from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from notification_models import *
from notification_service import NotificationService
from app.schemas import RenewalItem, JobRepostRecord, CreateRenewalItemRequest
from app.schemas import (
    RenewalItem,
    JobRepostRecord,
    CreateRenewalItemRequest,
    AutomationStatsResponse
)
import logging
import asyncio


logger = logging.getLogger(__name__)


class AutomationService:
    def __init__(
        self, db: AsyncIOMotorDatabase, notification_service: NotificationService
    ):
        self.db = db
        self.notification_service = notification_service

    async def run_automated_checks(self, tenant_id: str):
        """Run all automated checks for a tenant"""
        try:
            logger.info(f"Running automated checks for tenant: {tenant_id}")

            # Run all automation checks concurrently
            await asyncio.gather(
                self.check_renewal_reminders(tenant_id),
                self.check_overdue_services(tenant_id),
                self.check_low_inventory(tenant_id),
                self.check_revenue_drops(tenant_id),
                self.check_cost_discrepancies(tenant_id),
                self.process_failed_job_reposts(tenant_id),
                return_exceptions=True,
            )

            logger.info(f"Completed automated checks for tenant: {tenant_id}")

        except Exception as e:
            logger.error(f"Error running automated checks: {str(e)}")

    async def check_renewal_reminders(self, tenant_id: str):
        """Check for upcoming renewals and send reminders"""
        try:
            # Get all location settings
            location_settings = (
                await self.notification_service.get_all_location_settings(tenant_id)
            )

            for settings in location_settings:
                await self._check_renewals_for_location(tenant_id, settings)

        except Exception as e:
            logger.error(f"Error checking renewal reminders: {str(e)}")

    async def _check_renewals_for_location(
        self, tenant_id: str, settings: LocationNotificationSettings
    ):
        """Check renewals for a specific location"""
        try:
            # Get all renewal items for this location
            renewals = await self.db.renewal_items.find(
                {
                    "tenant_id": tenant_id,
                    "location_id": settings.location_id,
                    "is_active": True,
                    "is_renewed": False,
                }
            ).to_list(None)

            current_time = datetime.now(timezone.utc)

            for renewal_data in renewals:
                renewal = RenewalItem(**renewal_data)

                # Check if renewal is approaching
                days_until_expiry = (renewal.expiry_date - current_time).days
                reminder_days = settings.renewal_reminder_days.get(renewal.type, 30)

                if (
                    days_until_expiry <= reminder_days
                    and not renewal.auto_reminder_sent
                ):
                    # Send renewal reminder
                    await self._send_renewal_reminder(
                        tenant_id, renewal, settings, days_until_expiry
                    )

                    # Mark reminder as sent
                    await self.db.renewal_items.update_one(
                        {"id": renewal.id},
                        {
                            "$set": {
                                "auto_reminder_sent": True,
                                "updated_at": current_time,
                            }
                        },
                    )

        except Exception as e:
            logger.error(
                f"Error checking renewals for location {settings.location_id}: {str(e)}"
            )

    async def _send_renewal_reminder(
        self,
        tenant_id: str,
        renewal: RenewalItem,
        settings: LocationNotificationSettings,
        days_until_expiry: int,
    ):
        """Send a renewal reminder notification"""
        priority = (
            NotificationPriority.HIGH
            if days_until_expiry <= 7
            else NotificationPriority.MEDIUM
        )

        await self.notification_service.create_notification(
            tenant_id=tenant_id,
            request=CreateNotificationRequest(
                type=NotificationType.RENEWAL_REMINDER,
                priority=priority,
                title=f"{renewal.type.value.title()} Renewal Due Soon",
                message=f"{renewal.name} expires in {days_until_expiry} days ({renewal.expiry_date.strftime('%Y-%m-%d')})",
                location_ids=[settings.location_id],
                role_targets=["ML_ADMIN"],
                data={
                    "renewal_id": renewal.id,
                    "renewal_type": renewal.type.value,
                    "expiry_date": renewal.expiry_date.isoformat(),
                    "days_until_expiry": days_until_expiry,
                },
                action_url=f"/renewals/{renewal.id}",
                related_entity_type="renewal",
                related_entity_id=renewal.id,
            ),
        )

    async def check_overdue_services(self, tenant_id: str):
        """Check for overdue service calls"""
        try:
            location_settings = (
                await self.notification_service.get_all_location_settings(tenant_id)
            )

            for settings in location_settings:
                await self._check_overdue_services_for_location(tenant_id, settings)

        except Exception as e:
            logger.error(f"Error checking overdue services: {str(e)}")

    async def _check_overdue_services_for_location(
        self, tenant_id: str, settings: LocationNotificationSettings
    ):
        """Check overdue services for a specific location"""
        try:
            current_time = datetime.now(timezone.utc)
            overdue_threshold = current_time - timedelta(
                hours=settings.overdue_service_hours
            )

            # Find overdue service calls
            overdue_jobs = await self.db.jobs.find(
                {
                    "tenant_id": tenant_id,
                    "location_id": settings.location_id,
                    "status": {"$in": ["assigned", "in_progress"]},
                    "scheduled_date": {"$lt": overdue_threshold},
                }
            ).to_list(None)

            for job in overdue_jobs:
                # Check if we already sent an overdue notification recently
                recent_notification = await self.db.notifications.find_one(
                    {
                        "tenant_id": tenant_id,
                        "type": NotificationType.OVERDUE_SERVICE,
                        "related_entity_id": job["id"],
                        "created_at": {"$gt": current_time - timedelta(hours=6)},
                    }
                )

                if not recent_notification:
                    await self._send_overdue_service_alert(tenant_id, job, settings)

        except Exception as e:
            logger.error(
                f"Error checking overdue services for location {settings.location_id}: {str(e)}"
            )

    async def _send_overdue_service_alert(
        self, tenant_id: str, job: Dict, settings: LocationNotificationSettings
    ):
        """Send overdue service alert"""
        hours_overdue = (
            datetime.now(timezone.utc) - job["scheduled_date"]
        ).total_seconds() / 3600

        await self.notification_service.create_notification(
            tenant_id=tenant_id,
            request=CreateNotificationRequest(
                type=NotificationType.OVERDUE_SERVICE,
                priority=NotificationPriority.HIGH,
                title="Service Call Overdue",
                message=f"Job #{job.get('job_number', job['id'][:8])} is {int(hours_overdue)} hours overdue",
                location_ids=[job["location_id"]],
                role_targets=["TECH", "DISPATCH"],
                user_ids=(
                    [job.get("assigned_tech_id")] if job.get("assigned_tech_id") else []
                ),
                data={
                    "job_id": job["id"],
                    "job_number": job.get("job_number"),
                    "machine_id": job.get("machine_id"),
                    "hours_overdue": int(hours_overdue),
                    "assigned_tech": job.get("assigned_tech_name"),
                },
                action_url=f"/jobs/{job['id']}",
                related_entity_type="job",
                related_entity_id=job["id"],
            ),
        )

    async def check_low_inventory(self, tenant_id: str):
        """Check for low inventory items"""
        try:
            location_settings = (
                await self.notification_service.get_all_location_settings(tenant_id)
            )

            for settings in location_settings:
                await self._check_low_inventory_for_location(tenant_id, settings)

        except Exception as e:
            logger.error(f"Error checking low inventory: {str(e)}")

    async def _check_low_inventory_for_location(
        self, tenant_id: str, settings: LocationNotificationSettings
    ):
        """Check low inventory for a specific location"""
        try:
            # Get inventory items for this location below threshold
            low_inventory_items = await self.db.inventory.find(
                {
                    "tenant_id": tenant_id,
                    "location_id": settings.location_id,
                    "current_stock": {"$lte": settings.low_inventory_threshold},
                }
            ).to_list(None)

            critical_items = [
                item
                for item in low_inventory_items
                if item["current_stock"] <= settings.critical_inventory_threshold
            ]

            if critical_items:
                await self._send_critical_inventory_alert(
                    tenant_id, critical_items, settings
                )
            elif low_inventory_items:
                await self._send_low_inventory_alert(
                    tenant_id, low_inventory_items, settings
                )

        except Exception as e:
            logger.error(
                f"Error checking low inventory for location {settings.location_id}: {str(e)}"
            )

    async def _send_low_inventory_alert(
        self, tenant_id: str, items: List[Dict], settings: LocationNotificationSettings
    ):
        """Send low inventory alert"""
        item_names = [item["name"] for item in items[:5]]  # Show first 5 items

        await self.notification_service.create_notification(
            tenant_id=tenant_id,
            request=CreateNotificationRequest(
                type=NotificationType.LOW_INVENTORY,
                priority=NotificationPriority.MEDIUM,
                title="Low Inventory Alert",
                message=f"{len(items)} items running low: {', '.join(item_names)}{'...' if len(items) > 5 else ''}",
                location_ids=[settings.location_id],
                role_targets=["WAREHOUSE", "ML_ADMIN"],
                data={
                    "item_count": len(items),
                    "items": [
                        {
                            "id": item["id"],
                            "name": item["name"],
                            "stock": item["current_stock"],
                        }
                        for item in items
                    ],
                },
                action_url=f"/inventory?location_id={settings.location_id}",
                related_entity_type="inventory",
                related_entity_id=settings.location_id,
            ),
        )

    async def _send_critical_inventory_alert(
        self, tenant_id: str, items: List[Dict], settings: LocationNotificationSettings
    ):
        """Send critical inventory alert"""
        item_names = [item["name"] for item in items[:3]]

        await self.notification_service.create_notification(
            tenant_id=tenant_id,
            request=CreateNotificationRequest(
                type=NotificationType.LOW_INVENTORY,
                priority=NotificationPriority.URGENT,
                title="Critical Inventory Alert",
                message=f"URGENT: {len(items)} items critically low: {', '.join(item_names)}",
                location_ids=[settings.location_id],
                role_targets=["WAREHOUSE", "ML_ADMIN"],
                channels=[
                    NotificationChannel.SMS,
                    NotificationChannel.EMAIL,
                    NotificationChannel.WEB_PUSH,
                ],
                data={
                    "item_count": len(items),
                    "critical": True,
                    "items": [
                        {
                            "id": item["id"],
                            "name": item["name"],
                            "stock": item["current_stock"],
                        }
                        for item in items
                    ],
                },
                action_url=f"/inventory?location_id={settings.location_id}",
                related_entity_type="inventory",
                related_entity_id=settings.location_id,
            ),
        )

    async def check_revenue_drops(self, tenant_id: str):
        """Check for significant revenue drops"""
        try:
            location_settings = (
                await self.notification_service.get_all_location_settings(tenant_id)
            )

            for settings in location_settings:
                await self._check_revenue_drop_for_location(tenant_id, settings)

        except Exception as e:
            logger.error(f"Error checking revenue drops: {str(e)}")

    async def _check_revenue_drop_for_location(
        self, tenant_id: str, settings: LocationNotificationSettings
    ):
        """Check revenue drops for a specific location"""
        try:
            current_time = datetime.now(timezone.utc)

            # Get revenue for current week
            week_start = current_time - timedelta(days=7)
            current_week_revenue = await self._get_location_revenue(
                tenant_id, settings.location_id, week_start, current_time
            )

            # Get revenue for previous week
            prev_week_start = week_start - timedelta(days=7)
            prev_week_revenue = await self._get_location_revenue(
                tenant_id, settings.location_id, prev_week_start, week_start
            )

            if prev_week_revenue > 0:
                drop_percentage = (
                    (prev_week_revenue - current_week_revenue) / prev_week_revenue
                ) * 100

                if drop_percentage >= settings.revenue_drop_percentage:
                    await self._send_revenue_drop_alert(
                        tenant_id,
                        settings,
                        current_week_revenue,
                        prev_week_revenue,
                        drop_percentage,
                    )

        except Exception as e:
            logger.error(
                f"Error checking revenue drop for location {settings.location_id}: {str(e)}"
            )

    async def _get_location_revenue(
        self, tenant_id: str, location_id: str, start_date: datetime, end_date: datetime
    ) -> float:
        """Get total revenue for a location in a date range"""
        try:
            pipeline = [
                {
                    "$match": {
                        "tenant_id": tenant_id,
                        "location_id": location_id,
                        "transaction_type": "revenue",
                        "created_at": {"$gte": start_date, "$lt": end_date},
                    }
                },
                {"$group": {"_id": None, "total_revenue": {"$sum": "$amount"}}},
            ]

            result = await self.db.financial_transactions.aggregate(pipeline).to_list(1)
            return result[0]["total_revenue"] if result else 0.0

        except Exception as e:
            logger.error(f"Error getting location revenue: {str(e)}")
            return 0.0

    async def _send_revenue_drop_alert(
        self,
        tenant_id: str,
        settings: LocationNotificationSettings,
        current_revenue: float,
        prev_revenue: float,
        drop_percentage: float,
    ):
        """Send revenue drop alert"""
        await self.notification_service.create_notification(
            tenant_id=tenant_id,
            request=CreateNotificationRequest(
                type=NotificationType.REVENUE_DROP,
                priority=NotificationPriority.HIGH,
                title="Significant Revenue Drop Detected",
                message=f"Revenue dropped {drop_percentage:.1f}% from ${prev_revenue:.2f} to ${current_revenue:.2f}",
                location_ids=[settings.location_id],
                role_targets=["ML_ADMIN"],
                data={
                    "current_revenue": current_revenue,
                    "previous_revenue": prev_revenue,
                    "drop_percentage": drop_percentage,
                    "location_id": settings.location_id,
                },
                action_url=f"/financial-dashboard?location_id={settings.location_id}",
                related_entity_type="revenue",
                related_entity_id=settings.location_id,
            ),
        )

    async def check_cost_discrepancies(self, tenant_id: str):
        """Check for cost discrepancies"""
        try:
            location_settings = (
                await self.notification_service.get_all_location_settings(tenant_id)
            )

            for settings in location_settings:
                await self._check_cost_discrepancy_for_location(tenant_id, settings)

        except Exception as e:
            logger.error(f"Error checking cost discrepancies: {str(e)}")

    async def _check_cost_discrepancy_for_location(
        self, tenant_id: str, settings: LocationNotificationSettings
    ):
        """Check cost discrepancies for a specific location"""
        try:
            current_time = datetime.now(timezone.utc)

            # Get expenses for current week
            week_start = current_time - timedelta(days=7)
            current_week_costs = await self._get_location_expenses(
                tenant_id, settings.location_id, week_start, current_time
            )

            # Get expenses for previous week
            prev_week_start = week_start - timedelta(days=7)
            prev_week_costs = await self._get_location_expenses(
                tenant_id, settings.location_id, prev_week_start, week_start
            )

            if prev_week_costs > 0:
                increase_percentage = (
                    (current_week_costs - prev_week_costs) / prev_week_costs
                ) * 100

                if increase_percentage >= settings.cost_variance_percentage:
                    await self._send_cost_discrepancy_alert(
                        tenant_id,
                        settings,
                        current_week_costs,
                        prev_week_costs,
                        increase_percentage,
                    )

        except Exception as e:
            logger.error(
                f"Error checking cost discrepancy for location {settings.location_id}: {str(e)}"
            )

    async def _get_location_expenses(
        self, tenant_id: str, location_id: str, start_date: datetime, end_date: datetime
    ) -> float:
        """Get total expenses for a location in a date range"""
        try:
            pipeline = [
                {
                    "$match": {
                        "tenant_id": tenant_id,
                        "location_id": location_id,
                        "created_at": {"$gte": start_date, "$lt": end_date},
                    }
                },
                {"$group": {"_id": None, "total_expenses": {"$sum": "$amount"}}},
            ]

            result = await self.db.expense_entries.aggregate(pipeline).to_list(1)
            return result[0]["total_expenses"] if result else 0.0

        except Exception as e:
            logger.error(f"Error getting location expenses: {str(e)}")
            return 0.0

    async def _send_cost_discrepancy_alert(
        self,
        tenant_id: str,
        settings: LocationNotificationSettings,
        current_costs: float,
        prev_costs: float,
        increase_percentage: float,
    ):
        """Send cost discrepancy alert"""
        await self.notification_service.create_notification(
            tenant_id=tenant_id,
            request=CreateNotificationRequest(
                type=NotificationType.COST_DISCREPANCY,
                priority=NotificationPriority.HIGH,
                title="Cost Increase Alert",
                message=f"Costs increased {increase_percentage:.1f}% from ${prev_costs:.2f} to ${current_costs:.2f}",
                location_ids=[settings.location_id],
                role_targets=["ML_ADMIN"],
                data={
                    "current_costs": current_costs,
                    "previous_costs": prev_costs,
                    "increase_percentage": increase_percentage,
                    "location_id": settings.location_id,
                },
                action_url=f"/financial-dashboard?location_id={settings.location_id}",
                related_entity_type="expenses",
                related_entity_id=settings.location_id,
            ),
        )

    async def process_failed_job_reposts(self, tenant_id: str):
        """Process failed jobs for auto-reposting"""
        try:
            # Find failed jobs that need reposting
            failed_jobs = await self.db.jobs.find(
                {
                    "tenant_id": tenant_id,
                    "status": "failed",
                    "auto_repost_processed": {"$ne": True},
                }
            ).to_list(None)

            for job in failed_jobs:
                await self._process_job_repost(tenant_id, job)

        except Exception as e:
            logger.error(f"Error processing failed job reposts: {str(e)}")

    async def _process_job_repost(self, tenant_id: str, job: Dict):
        """Process a single job repost"""
        try:
            # Get location settings
            settings = (
                await self.notification_service.get_location_notification_settings(
                    tenant_id, job["location_id"]
                )
            )

            if not settings or not settings.auto_posting_enabled:
                return

            # Check if we have available parts for the job
            parts_available = await self._check_parts_availability(tenant_id, job)

            repost_record = JobRepostRecord(
                tenant_id=tenant_id,
                original_job_id=job["id"],
                location_id=job["location_id"],
                machine_id=job.get("machine_id"),
                failure_reason=job.get("failure_reason", "Unknown failure"),
                failure_date=job.get("failed_at", datetime.now(timezone.utc)),
                action_taken=settings.auto_posting_action,
                max_attempts=settings.auto_posting_max_attempts,
            )

            if (
                settings.auto_posting_action == AutoPostingAction.AUTO_RESCHEDULE
                and parts_available
            ):
                # Automatically reschedule
                new_job = await self._create_rescheduled_job(
                    tenant_id, job, parts_available
                )
                repost_record.new_job_id = new_job["id"]
                repost_record.repost_status = "success"

                # Send notification about successful auto-repost
                await self._send_job_auto_repost_notification(
                    tenant_id, job, new_job, settings
                )

            else:
                # Require manual approval
                repost_record.requires_approval = True
                repost_record.repost_status = "pending_approval"
                repost_record.suggested_parts = parts_available

                # Send notification for manual approval
                await self._send_job_repost_approval_notification(
                    tenant_id, job, repost_record, settings
                )

            # Store repost record
            await self.db.job_repost_records.insert_one(repost_record.dict())

            # Mark original job as processed
            await self.db.jobs.update_one(
                {"id": job["id"]}, {"$set": {"auto_repost_processed": True}}
            )

        except Exception as e:
            logger.error(f"Error processing job repost for job {job['id']}: {str(e)}")

    async def _check_parts_availability(
        self, tenant_id: str, job: Dict
    ) -> List[Dict[str, Any]]:
        """Check parts availability for a job"""
        try:
            required_parts = job.get("required_parts", [])
            available_parts = []

            for part in required_parts:
                # Check inventory for this part at the location
                inventory_item = await self.db.inventory.find_one(
                    {
                        "tenant_id": tenant_id,
                        "location_id": job["location_id"],
                        "part_number": part.get("part_number"),
                        "current_stock": {"$gte": part.get("quantity", 1)},
                    }
                )

                if inventory_item:
                    available_parts.append(
                        {
                            "part_number": part.get("part_number"),
                            "name": inventory_item["name"],
                            "required_quantity": part.get("quantity", 1),
                            "available_stock": inventory_item["current_stock"],
                        }
                    )

            return available_parts

        except Exception as e:
            logger.error(f"Error checking parts availability: {str(e)}")
            return []

    async def _create_rescheduled_job(
        self, tenant_id: str, original_job: Dict, available_parts: List[Dict]
    ) -> Dict:
        """Create a rescheduled job"""
        try:
            # Create new job based on original
            new_job = {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "location_id": original_job["location_id"],
                "machine_id": original_job.get("machine_id"),
                "job_number": f"R-{original_job.get('job_number', original_job['id'][:8])}",
                "description": f"Rescheduled: {original_job.get('description', '')}",
                "priority": "high",
                "status": "scheduled",
                "scheduled_date": datetime.now(timezone.utc) + timedelta(days=1),
                "required_parts": available_parts,
                "original_job_id": original_job["id"],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }

            await self.db.jobs.insert_one(new_job)
            return new_job

        except Exception as e:
            logger.error(f"Error creating rescheduled job: {str(e)}")
            raise

    async def _send_job_auto_repost_notification(
        self,
        tenant_id: str,
        original_job: Dict,
        new_job: Dict,
        settings: LocationNotificationSettings,
    ):
        """Send notification about successful auto-repost"""
        await self.notification_service.create_notification(
            tenant_id=tenant_id,
            request=CreateNotificationRequest(
                type=NotificationType.JOB_AUTO_REPOST,
                priority=NotificationPriority.MEDIUM,
                title="Job Automatically Rescheduled",
                message=f"Job {original_job.get('job_number', original_job['id'][:8])} automatically rescheduled as {new_job['job_number']}",
                location_ids=[settings.location_id],
                role_targets=["TECH", "DISPATCH"],
                data={
                    "original_job_id": original_job["id"],
                    "new_job_id": new_job["id"],
                    "new_job_number": new_job["job_number"],
                    "scheduled_date": new_job["scheduled_date"].isoformat(),
                },
                action_url=f"/jobs/{new_job['id']}",
                related_entity_type="job",
                related_entity_id=new_job["id"],
            ),
        )

    async def _send_job_repost_approval_notification(
        self,
        tenant_id: str,
        original_job: Dict,
        repost_record: JobRepostRecord,
        settings: LocationNotificationSettings,
    ):
        """Send notification requiring manual approval for repost"""
        await self.notification_service.create_notification(
            tenant_id=tenant_id,
            request=CreateNotificationRequest(
                type=NotificationType.JOB_FAILED,
                priority=NotificationPriority.HIGH,
                title="Job Requires Manual Reposting",
                message=f"Job {original_job.get('job_number', original_job['id'][:8])} failed and needs manual approval for reposting",
                location_ids=[settings.location_id],
                role_targets=["DISPATCH", "ML_ADMIN"],
                data={
                    "original_job_id": original_job["id"],
                    "repost_record_id": repost_record.id,
                    "failure_reason": repost_record.failure_reason,
                    "suggested_parts": repost_record.suggested_parts,
                },
                action_url=f"/job-reposts/{repost_record.id}",
                related_entity_type="job_repost",
                related_entity_id=repost_record.id,
            ),
        )

    # Renewal Item Management
    async def create_renewal_item(
        self, tenant_id: str, location_id: str, request: CreateRenewalItemRequest
    ) -> RenewalItem:
        """Create a new renewal item"""
        try:
            renewal_item = RenewalItem(
                tenant_id=tenant_id, location_id=location_id, **request.dict()
            )

            await self.db.renewal_items.insert_one(renewal_item.dict())
            return renewal_item

        except Exception as e:
            logger.error(f"Error creating renewal item: {str(e)}")
            raise

    async def get_renewal_items(
        self, tenant_id: str, location_id: Optional[str] = None
    ) -> List[RenewalItem]:
        """Get renewal items"""
        try:
            query = {"tenant_id": tenant_id, "is_active": True}
            if location_id:
                query["location_id"] = location_id

            items = (
                await self.db.renewal_items.find(query)
                .sort("expiry_date", 1)
                .to_list(None)
            )
            return [RenewalItem(**item) for item in items]

        except Exception as e:
            logger.error(f"Error getting renewal items: {str(e)}")
            return []

    async def mark_renewal_completed(self, tenant_id: str, renewal_id: str) -> bool:
        """Mark a renewal as completed"""
        try:
            result = await self.db.renewal_items.update_one(
                {"id": renewal_id, "tenant_id": tenant_id},
                {
                    "$set": {
                        "is_renewed": True,
                        "renewal_date": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            return result.modified_count > 0

        except Exception as e:
            logger.error(f"Error marking renewal completed: {str(e)}")
            return False

    async def get_automation_stats(self, tenant_id: str) -> AutomationStatsResponse:
        """Get automation statistics"""
        try:
            current_time = datetime.now(timezone.utc)

            # Total renewals
            total_renewals = await self.db.renewal_items.count_documents(
                {"tenant_id": tenant_id, "is_active": True}
            )

            # Renewals expiring in 30 days
            expiring_soon = await self.db.renewal_items.count_documents(
                {
                    "tenant_id": tenant_id,
                    "is_active": True,
                    "is_renewed": False,
                    "expiry_date": {"$lt": current_time + timedelta(days=30)},
                }
            )

            # Overdue services
            overdue_services = await self.db.jobs.count_documents(
                {
                    "tenant_id": tenant_id,
                    "status": {"$in": ["assigned", "in_progress"]},
                    "scheduled_date": {"$lt": current_time - timedelta(hours=24)},
                }
            )

            # Low inventory items (assuming threshold of 5)
            low_inventory_items = await self.db.inventory.count_documents(
                {"tenant_id": tenant_id, "current_stock": {"$lte": 5}}
            )

            # Auto reposts today
            today_start = current_time.replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            auto_reposts_today = await self.db.job_repost_records.count_documents(
                {"tenant_id": tenant_id, "created_at": {"$gte": today_start}}
            )

            # Pending approvals
            pending_approvals = await self.db.job_repost_records.count_documents(
                {"tenant_id": tenant_id, "requires_approval": True, "approved_at": None}
            )

            return AutomationStatsResponse(
                total_renewals=total_renewals,
                expiring_soon=expiring_soon,
                overdue_services=overdue_services,
                low_inventory_items=low_inventory_items,
                auto_reposts_today=auto_reposts_today,
                pending_approvals=pending_approvals,
            )

        except Exception as e:
            logger.error(f"Error getting automation stats: {str(e)}")
            return AutomationStatsResponse(
                total_renewals=0,
                expiring_soon=0,
                overdue_services=0,
                low_inventory_items=0,
                auto_reposts_today=0,
                pending_approvals=0,
            )
