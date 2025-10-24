from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from notification_models import *
import logging
import asyncio
import json

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def create_notification(
        self, tenant_id: str, request: CreateNotificationRequest
    ) -> Notification:
        """Create a new notification"""
        try:
            notification = Notification(
                tenant_id=tenant_id,
                type=request.type,
                priority=request.priority,
                title=request.title,
                message=request.message,
                user_ids=request.user_ids or [],
                role_targets=request.role_targets or [],
                location_ids=request.location_ids or [],
                channels=request.channels or [],
                data=request.data or {},
                action_url=request.action_url,
                expires_at=request.expires_at,
                related_entity_type=request.related_entity_type,
                related_entity_id=request.related_entity_id,
            )

            # Store notification
            await self.db.notifications.insert_one(notification.dict())

            # Process delivery
            await self._process_notification_delivery(notification)

            return notification

        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            raise

    async def _process_notification_delivery(self, notification: Notification):
        """Process notification delivery through various channels"""
        try:
            # Get target users based on role_targets and location_ids
            target_users = await self._get_target_users(
                notification.tenant_id,
                notification.user_ids,
                notification.role_targets,
                notification.location_ids,
            )

            # Get notification settings for locations
            location_settings = {}
            if notification.location_ids:
                for location_id in notification.location_ids:
                    settings = await self.get_location_notification_settings(
                        notification.tenant_id, location_id
                    )
                    if settings:
                        location_settings[location_id] = settings

            # Determine channels if not specified
            if not notification.channels and location_settings:
                notification.channels = self._get_default_channels(
                    notification.type, location_settings
                )

            # Send through each channel
            for channel in notification.channels:
                await self._send_notification_channel(
                    notification, target_users, channel
                )

            # Update notification status
            await self.db.notifications.update_one(
                {"id": notification.id},
                {
                    "$set": {
                        "status": NotificationStatus.SENT,
                        "sent_at": datetime.now(timezone.utc),
                    }
                },
            )

        except Exception as e:
            logger.error(f"Error processing notification delivery: {str(e)}")
            await self.db.notifications.update_one(
                {"id": notification.id}, {"$set": {"status": NotificationStatus.FAILED}}
            )

    async def _get_target_users(
        self,
        tenant_id: str,
        user_ids: List[str],
        role_targets: List[str],
        location_ids: List[str],
    ) -> List[Dict]:
        """Get target users based on criteria"""
        try:
            query = {"tenant_id": tenant_id}

            # Build user query
            conditions = []

            if user_ids:
                conditions.append({"id": {"$in": user_ids}})

            if role_targets:
                conditions.append({"role": {"$in": role_targets}})

            if location_ids:
                # Get users assigned to these locations (assuming location assignment in user profile)
                conditions.append({"location_ids": {"$in": location_ids}})

            if conditions:
                query["$or"] = conditions

            users = await self.db.users.find(query).to_list(None)
            return users

        except Exception as e:
            logger.error(f"Error getting target users: {str(e)}")
            return []

    def _get_default_channels(
        self,
        notification_type: NotificationType,
        location_settings: Dict[str, LocationNotificationSettings],
    ) -> List[NotificationChannel]:
        """Get default channels based on notification type and location settings"""
        channels = set()

        for settings in location_settings.values():
            if notification_type in settings.channel_preferences:
                channels.update(settings.channel_preferences[notification_type])

        return list(channels) if channels else [NotificationChannel.WEB_PUSH]

    async def _send_notification_channel(
        self,
        notification: Notification,
        target_users: List[Dict],
        channel: NotificationChannel,
    ):
        """Send notification through specific channel"""
        try:
            if channel == NotificationChannel.WEB_PUSH:
                await self._send_web_push(notification, target_users)
            elif channel == NotificationChannel.EMAIL:
                await self._send_email(notification, target_users)
            elif channel == NotificationChannel.SMS:
                await self._send_sms(notification, target_users)
            elif channel == NotificationChannel.MOBILE_PUSH:
                await self._send_mobile_push(notification, target_users)
            elif channel == NotificationChannel.IN_APP:
                await self._send_in_app(notification, target_users)

        except Exception as e:
            logger.error(f"Error sending notification via {channel}: {str(e)}")

    async def _send_web_push(
        self, notification: Notification, target_users: List[Dict]
    ):
        """Send web push notification"""
        # For now, store in-app notification that can be picked up by frontend
        for user in target_users:
            in_app_notification = {
                "id": f"{notification.id}_{user['id']}",
                "notification_id": notification.id,
                "user_id": user["id"],
                "tenant_id": notification.tenant_id,
                "title": notification.title,
                "message": notification.message,
                "type": notification.type,
                "priority": notification.priority,
                "data": notification.data,
                "action_url": notification.action_url,
                "read": False,
                "created_at": datetime.now(timezone.utc),
            }
            await self.db.user_notifications.insert_one(in_app_notification)

    async def _send_email(self, notification: Notification, target_users: List[Dict]):
        """Send email notification (placeholder for future integration)"""
        logger.info(
            f"EMAIL: Sending '{notification.title}' to {len(target_users)} users"
        )
        # Future: Integrate with email service provider

    async def _send_sms(self, notification: Notification, target_users: List[Dict]):
        """Send SMS notification (placeholder for future integration)"""
        logger.info(f"SMS: Sending '{notification.title}' to {len(target_users)} users")
        # Future: Integrate with SMS service provider

    async def _send_mobile_push(
        self, notification: Notification, target_users: List[Dict]
    ):
        """Send mobile push notification via webhook"""
        webhook_url = "http://localhost:8001/api/webhooks/mobile-notifications"  # Internal webhook

        for user in target_users:
            payload = MobileNotificationPayload(
                notification_id=notification.id,
                title=notification.title,
                body=notification.message,
                data=notification.data,
                action_url=notification.action_url,
                priority=notification.priority,
            )

            # Store webhook delivery record
            delivery_record = WebhookDeliveryRecord(
                notification_id=notification.id,
                webhook_url=webhook_url,
                payload={"user_id": user["id"], **payload.dict()},
            )

            await self.db.webhook_deliveries.insert_one(delivery_record.dict())

            # Attempt delivery (in background)
            asyncio.create_task(self._deliver_webhook(delivery_record))

    async def _send_in_app(self, notification: Notification, target_users: List[Dict]):
        """Send in-app notification"""
        await self._send_web_push(
            notification, target_users
        )  # Same as web push for now

    async def _deliver_webhook(self, delivery_record: WebhookDeliveryRecord):
        """Deliver webhook with retry logic"""
        # This would integrate with actual webhook delivery
        logger.info(f"Webhook delivery to {delivery_record.webhook_url}")

    async def get_user_notifications(
        self, user_id: str, tenant_id: str, limit: int = 50, unread_only: bool = False
    ) -> List[Dict]:
        """Get notifications for a user"""
        try:
            query = {"user_id": user_id, "tenant_id": tenant_id}

            if unread_only:
                query["read"] = False

            notifications = (
                await self.db.user_notifications.find(query)
                .sort("created_at", -1)
                .limit(limit)
                .to_list(limit)
            )

            return notifications

        except Exception as e:
            logger.error(f"Error getting user notifications: {str(e)}")
            return []

    async def mark_notification_read(self, user_id: str, notification_id: str) -> bool:
        """Mark notification as read"""
        try:
            result = await self.db.user_notifications.update_one(
                {"user_id": user_id, "notification_id": notification_id},
                {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}},
            )
            return result.modified_count > 0

        except Exception as e:
            logger.error(f"Error marking notification as read: {str(e)}")
            return False

    async def get_notification_stats(
        self, user_id: str, tenant_id: str
    ) -> NotificationStatsResponse:
        """Get notification statistics for a user"""
        try:
            # Get all user notifications
            notifications = await self.db.user_notifications.find(
                {"user_id": user_id, "tenant_id": tenant_id}
            ).to_list(None)

            total_notifications = len(notifications)
            unread_count = len([n for n in notifications if not n.get("read", False)])

            # Count by priority
            by_priority = {}
            for priority in NotificationPriority:
                by_priority[priority] = len(
                    [n for n in notifications if n.get("priority") == priority.value]
                )

            # Count by type
            by_type = {}
            for notification_type in NotificationType:
                by_type[notification_type] = len(
                    [
                        n
                        for n in notifications
                        if n.get("type") == notification_type.value
                    ]
                )

            # Count by status (simulated)
            by_status = {
                NotificationStatus.READ: len(
                    [n for n in notifications if n.get("read", False)]
                ),
                NotificationStatus.PENDING: unread_count,
            }

            return NotificationStatsResponse(
                total_notifications=total_notifications,
                unread_count=unread_count,
                by_priority=by_priority,
                by_type=by_type,
                by_status=by_status,
            )

        except Exception as e:
            logger.error(f"Error getting notification stats: {str(e)}")
            return NotificationStatsResponse(
                total_notifications=0,
                unread_count=0,
                by_priority={},
                by_type={},
                by_status={},
            )

    # Location Notification Settings Management
    async def get_location_notification_settings(
        self, tenant_id: str, location_id: str
    ) -> Optional[LocationNotificationSettings]:
        """Get notification settings for a location"""
        try:
            settings_data = await self.db.location_notification_settings.find_one(
                {"tenant_id": tenant_id, "location_id": location_id}
            )

            if settings_data:
                return LocationNotificationSettings(**settings_data)
            return None

        except Exception as e:
            logger.error(f"Error getting location notification settings: {str(e)}")
            return None

    async def create_or_update_location_settings(
        self,
        tenant_id: str,
        location_id: str,
        location_name: str,
        settings_request: UpdateNotificationSettingsRequest,
    ) -> LocationNotificationSettings:
        """Create or update location notification settings"""
        try:
            # Get existing settings or create new
            existing_settings = await self.get_location_notification_settings(
                tenant_id, location_id
            )

            if existing_settings:
                # Update existing
                update_data = {}
                if settings_request.renewal_reminder_days is not None:
                    update_data["renewal_reminder_days"] = (
                        settings_request.renewal_reminder_days
                    )
                if settings_request.overdue_service_hours is not None:
                    update_data["overdue_service_hours"] = (
                        settings_request.overdue_service_hours
                    )
                if settings_request.enable_auto_escalation is not None:
                    update_data["enable_auto_escalation"] = (
                        settings_request.enable_auto_escalation
                    )
                if settings_request.low_inventory_threshold is not None:
                    update_data["low_inventory_threshold"] = (
                        settings_request.low_inventory_threshold
                    )
                if settings_request.critical_inventory_threshold is not None:
                    update_data["critical_inventory_threshold"] = (
                        settings_request.critical_inventory_threshold
                    )
                if settings_request.revenue_drop_percentage is not None:
                    update_data["revenue_drop_percentage"] = (
                        settings_request.revenue_drop_percentage
                    )
                if settings_request.cost_variance_percentage is not None:
                    update_data["cost_variance_percentage"] = (
                        settings_request.cost_variance_percentage
                    )
                if settings_request.auto_posting_enabled is not None:
                    update_data["auto_posting_enabled"] = (
                        settings_request.auto_posting_enabled
                    )
                if settings_request.auto_posting_action is not None:
                    update_data["auto_posting_action"] = (
                        settings_request.auto_posting_action
                    )
                if settings_request.auto_posting_max_attempts is not None:
                    update_data["auto_posting_max_attempts"] = (
                        settings_request.auto_posting_max_attempts
                    )
                if settings_request.require_parts_confirmation is not None:
                    update_data["require_parts_confirmation"] = (
                        settings_request.require_parts_confirmation
                    )
                if settings_request.channel_preferences is not None:
                    update_data["channel_preferences"] = (
                        settings_request.channel_preferences
                    )
                if settings_request.role_notification_routing is not None:
                    update_data["role_notification_routing"] = (
                        settings_request.role_notification_routing
                    )

                update_data["updated_at"] = datetime.now(timezone.utc)

                await self.db.location_notification_settings.update_one(
                    {"tenant_id": tenant_id, "location_id": location_id},
                    {"$set": update_data},
                )

                # Return updated settings
                return await self.get_location_notification_settings(
                    tenant_id, location_id
                )

            else:
                # Create new settings
                settings = LocationNotificationSettings(
                    tenant_id=tenant_id,
                    location_id=location_id,
                    location_name=location_name,
                )

                # Apply updates
                if settings_request.renewal_reminder_days is not None:
                    settings.renewal_reminder_days = (
                        settings_request.renewal_reminder_days
                    )
                if settings_request.overdue_service_hours is not None:
                    settings.overdue_service_hours = (
                        settings_request.overdue_service_hours
                    )
                if settings_request.enable_auto_escalation is not None:
                    settings.enable_auto_escalation = (
                        settings_request.enable_auto_escalation
                    )
                if settings_request.low_inventory_threshold is not None:
                    settings.low_inventory_threshold = (
                        settings_request.low_inventory_threshold
                    )
                if settings_request.critical_inventory_threshold is not None:
                    settings.critical_inventory_threshold = (
                        settings_request.critical_inventory_threshold
                    )
                if settings_request.revenue_drop_percentage is not None:
                    settings.revenue_drop_percentage = (
                        settings_request.revenue_drop_percentage
                    )
                if settings_request.cost_variance_percentage is not None:
                    settings.cost_variance_percentage = (
                        settings_request.cost_variance_percentage
                    )
                if settings_request.auto_posting_enabled is not None:
                    settings.auto_posting_enabled = (
                        settings_request.auto_posting_enabled
                    )
                if settings_request.auto_posting_action is not None:
                    settings.auto_posting_action = settings_request.auto_posting_action
                if settings_request.auto_posting_max_attempts is not None:
                    settings.auto_posting_max_attempts = (
                        settings_request.auto_posting_max_attempts
                    )
                if settings_request.require_parts_confirmation is not None:
                    settings.require_parts_confirmation = (
                        settings_request.require_parts_confirmation
                    )
                if settings_request.channel_preferences is not None:
                    settings.channel_preferences = settings_request.channel_preferences
                if settings_request.role_notification_routing is not None:
                    settings.role_notification_routing = (
                        settings_request.role_notification_routing
                    )

                await self.db.location_notification_settings.insert_one(settings.dict())
                return settings

        except Exception as e:
            logger.error(f"Error creating/updating location settings: {str(e)}")
            raise

    async def get_all_location_settings(
        self, tenant_id: str
    ) -> List[LocationNotificationSettings]:
        """Get all location notification settings for a tenant"""
        try:
            settings_list = await self.db.location_notification_settings.find(
                {"tenant_id": tenant_id}
            ).to_list(None)

            return [
                LocationNotificationSettings(**settings) for settings in settings_list
            ]

        except Exception as e:
            logger.error(f"Error getting all location settings: {str(e)}")
            return []
