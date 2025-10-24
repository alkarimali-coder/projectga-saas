from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from inventory_models import *
import uuid
import asyncio


class InventoryService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def auto_deduct_parts(
        self, job_id: str, parts_used: List[Dict[str, Any]], tech_id: str
    ) -> Dict[str, Any]:
        """Auto-deduct parts from truck inventory when job is completed"""
        results = []

        for part_usage in parts_used:
            part_id = part_usage.get("part_id")
            quantity = part_usage.get("quantity_used", 0)

            if not part_id or quantity <= 0:
                continue

            # First try to deduct from tech's truck inventory
            truck_inventory = await self.db.truck_inventory.find_one(
                {"tech_id": tech_id, "part_id": part_id, "quantity": {"$gte": quantity}}
            )

            if truck_inventory:
                # Deduct from truck inventory
                await self.db.truck_inventory.update_one(
                    {"id": truck_inventory["id"]},
                    {
                        "$inc": {"quantity": -quantity},
                        "$set": {"last_updated": datetime.now(timezone.utc)},
                    },
                )

                # Create movement record
                movement = InventoryMovement(
                    tenant_id=truck_inventory["tenant_id"],
                    part_id=part_id,
                    movement_type="OUT",
                    from_location=InventoryLocation.TRUCK,
                    quantity=quantity,
                    unit_cost=part_usage.get("unit_cost", 0.0),
                    total_cost=quantity * part_usage.get("unit_cost", 0.0),
                    reference_type="job",
                    reference_id=job_id,
                    performed_by=tech_id,
                    notes=f"Auto-deducted for job completion",
                )

                await self.db.inventory_movements.insert_one(movement.dict())

                results.append(
                    {
                        "part_id": part_id,
                        "quantity_deducted": quantity,
                        "source": "truck",
                        "success": True,
                    }
                )

                # Check if truck inventory is low and create alert
                remaining = truck_inventory["quantity"] - quantity
                if remaining <= 2:  # Low truck stock threshold
                    await self._create_inventory_alert(
                        truck_inventory["tenant_id"],
                        AlertType.LOW_STOCK,
                        f"Truck inventory low for part {part_id}",
                        f"Only {remaining} units remaining in truck. Consider restocking.",
                        part_id=part_id,
                    )
            else:
                # Try warehouse inventory as fallback
                warehouse_inventory = await self.db.inventory.find_one(
                    {
                        "part_id": part_id,
                        "location": InventoryLocation.WAREHOUSE.value,
                        "quantity_available": {"$gte": quantity},
                    }
                )

                if warehouse_inventory:
                    # Deduct from warehouse
                    await self.db.inventory.update_one(
                        {"id": warehouse_inventory["id"]},
                        {
                            "$inc": {"quantity_on_hand": -quantity},
                            "$set": {"updated_at": datetime.now(timezone.utc)},
                        },
                    )

                    movement = InventoryMovement(
                        tenant_id=warehouse_inventory["tenant_id"],
                        part_id=part_id,
                        movement_type="OUT",
                        from_location=InventoryLocation.WAREHOUSE,
                        quantity=quantity,
                        unit_cost=part_usage.get("unit_cost", 0.0),
                        total_cost=quantity * part_usage.get("unit_cost", 0.0),
                        reference_type="job",
                        reference_id=job_id,
                        performed_by=tech_id,
                        notes=f"Emergency deduction from warehouse (truck out of stock)",
                    )

                    await self.db.inventory_movements.insert_one(movement.dict())

                    results.append(
                        {
                            "part_id": part_id,
                            "quantity_deducted": quantity,
                            "source": "warehouse",
                            "success": True,
                            "warning": "Deducted from warehouse - truck was out of stock",
                        }
                    )
                else:
                    results.append(
                        {
                            "part_id": part_id,
                            "quantity_requested": quantity,
                            "success": False,
                            "error": "Insufficient inventory in both truck and warehouse",
                        }
                    )

        return {"deductions": results, "timestamp": datetime.now(timezone.utc)}

    async def check_low_stock_alerts(self, tenant_id: str) -> List[InventoryAlert]:
        """Check for low stock conditions and generate alerts"""
        alerts = []

        # Get all inventory items for tenant
        inventory_items = await self.db.inventory.find(
            {"tenant_id": tenant_id}
        ).to_list(length=None)

        for item in inventory_items:
            available = item["quantity_on_hand"] - item.get("quantity_reserved", 0)
            reorder_point = item.get("reorder_point", 5)

            if available <= reorder_point:
                # Get part details for alert
                part = await self.db.parts.find_one({"id": item["part_id"]})
                if not part:
                    continue

                # Check if alert already exists and is not acknowledged
                existing_alert = await self.db.inventory_alerts.find_one(
                    {
                        "tenant_id": tenant_id,
                        "part_id": item["part_id"],
                        "alert_type": AlertType.LOW_STOCK.value,
                        "is_acknowledged": False,
                    }
                )

                if not existing_alert:
                    # Create new alert
                    lead_time = part.get("lead_time_days", 7)
                    suggested_qty = max(
                        item.get("maximum_stock", 50) - available,
                        part.get("minimum_order_quantity", 1),
                    )

                    alert = InventoryAlert(
                        tenant_id=tenant_id,
                        alert_type=AlertType.LOW_STOCK,
                        part_id=item["part_id"],
                        title=f"Low Stock: {part['name']}",
                        message=f"Stock level ({available}) is at or below reorder point ({reorder_point}). Lead time: {lead_time} days.",
                        severity="high" if available == 0 else "medium",
                        current_quantity=available,
                        reorder_point=reorder_point,
                        lead_time_days=lead_time,
                        suggested_reorder_quantity=suggested_qty,
                    )

                    await self.db.inventory_alerts.insert_one(alert.dict())
                    alerts.append(alert)

        return alerts

    async def generate_asset_tag(
        self, asset_type: AssetType, tenant_id: str
    ) -> AssetTag:
        """Generate unique asset tag with QR and barcode"""
        # Generate unique COAM ID
        year = datetime.now().year
        count = await self.db.assets.count_documents(
            {"tenant_id": tenant_id, "asset_type": asset_type.value}
        )
        coam_id = f"COAM-{asset_type.value.upper()}-{year}-{str(count + 1).zfill(4)}"

        # Generate QR and barcodes
        tag = AssetTag(
            coam_id=coam_id,
            qr_code=f"QR-{coam_id}",
            barcode=f"BC{year}{str(count + 1).zfill(6)}",
            asset_type=asset_type,
        )

        return tag

    async def track_machine_lifecycle(
        self, machine_id: str
    ) -> MachineLifecycleAnalytics:
        """Calculate machine lifecycle analytics"""
        machine = await self.db.assets.find_one({"id": machine_id})
        if not machine or machine.get("asset_type") != AssetType.MACHINE.value:
            raise ValueError("Machine not found")

        # Calculate age
        purchase_date = machine.get("purchase_date")
        if purchase_date:
            if isinstance(purchase_date, str):
                purchase_date = datetime.fromisoformat(
                    purchase_date.replace("Z", "+00:00")
                )
            # Ensure both dates are timezone-aware
            if purchase_date.tzinfo is None:
                purchase_date = purchase_date.replace(tzinfo=timezone.utc)
            age_months = (datetime.now(timezone.utc) - purchase_date).days // 30
        else:
            age_months = 0

        # Get service history
        service_events = await self.db.asset_lifecycle.find(
            {"asset_id": machine_id, "event_type": {"$in": ["maintenance", "repair"]}}
        ).to_list(length=None)

        total_service_cost = sum(event.get("cost", 0) for event in service_events)
        service_frequency = (
            len(service_events) / max(age_months, 1) if age_months > 0 else 0
        )

        # Calculate uptime (simplified - based on maintenance frequency)
        uptime_percentage = max(95.0 - (service_frequency * 10), 60.0)

        # Calculate replacement score (0-100, higher = more urgent)
        age_score = min(age_months * 2, 40)  # Max 40 points for age
        cost_score = min(total_service_cost / 1000 * 10, 30)  # Max 30 points for cost
        frequency_score = min(service_frequency * 20, 30)  # Max 30 points for frequency

        replacement_score = age_score + cost_score + frequency_score

        # Determine recommended action
        if replacement_score >= 80:
            action = "retire"
        elif replacement_score >= 60:
            action = "plan_replacement"
        elif replacement_score >= 40:
            action = "increase_maintenance"
        else:
            action = "continue"

        # Predict failure date (simplified estimation)
        predicted_failure = None
        if service_frequency > 2:  # More than 2 services per month
            predicted_failure = datetime.now(timezone.utc) + timedelta(days=30)
        elif service_frequency > 1:
            predicted_failure = datetime.now(timezone.utc) + timedelta(days=90)

        analytics = MachineLifecycleAnalytics(
            machine_id=machine_id,
            age_months=age_months,
            total_service_cost=total_service_cost,
            service_frequency=service_frequency,
            uptime_percentage=uptime_percentage,
            cost_per_service=total_service_cost / max(len(service_events), 1),
            replacement_score=replacement_score,
            predicted_failure_date=predicted_failure,
            recommended_action=action,
        )

        return analytics

    async def process_rma_workflow(
        self, rma_id: str, new_status: RMAStatus, update_data: Dict[str, Any]
    ) -> RMA:
        """Process RMA status updates and handle workflow"""
        rma_doc = await self.db.rmas.find_one({"id": rma_id})
        if not rma_doc:
            raise ValueError("RMA not found")

        rma = RMA(**rma_doc)
        old_status = rma.status
        rma.status = new_status
        rma.updated_at = datetime.now(timezone.utc)

        # Handle status-specific logic
        if new_status == RMAStatus.APPROVED and rma.repost_job and rma.job_id:
            # Auto-repost the original job
            original_job = await self.db.jobs.find_one({"id": rma.job_id})
            if original_job:
                new_job = original_job.copy()
                new_job["id"] = str(uuid.uuid4())
                new_job["title"] = f"REPOST: {original_job['title']}"
                new_job["status"] = "pending"
                new_job["created_at"] = datetime.now(timezone.utc)
                new_job["notes"] = f"Auto-reposted due to RMA approval: {rma_id}"

                await self.db.jobs.insert_one(new_job)
                rma.reposted_job_id = new_job["id"]

        elif new_status == RMAStatus.RETURNED:
            # Restore parts to inventory
            for item in rma.items:
                if item.condition in ["repaired", "replaced"]:
                    # Add back to warehouse inventory
                    await self._add_inventory_quantity(
                        rma.tenant_id,
                        item.part_id,
                        InventoryLocation.WAREHOUSE,
                        item.quantity,
                        f"RMA return: {rma_id}",
                    )

        # Update additional fields from update_data
        for key, value in update_data.items():
            if hasattr(rma, key):
                setattr(rma, key, value)

        # Save updated RMA
        await self.db.rmas.update_one({"id": rma_id}, {"$set": rma.dict()})

        # Create status change alert
        await self._create_inventory_alert(
            rma.tenant_id,
            AlertType.RMA_UPDATE,
            f"RMA {rma.rma_number} Status Update",
            f"Status changed from {old_status} to {new_status}",
            severity="medium",
        )

        return rma

    async def track_vendor_pickup(
        self, pickup_id: str, status_update: Dict[str, Any]
    ) -> VendorPickup:
        """Track vendor pickup progress and cost verification"""
        pickup_doc = await self.db.vendor_pickups.find_one({"id": pickup_id})
        if not pickup_doc:
            raise ValueError("Vendor pickup not found")

        pickup = VendorPickup(**pickup_doc)
        old_status = pickup.status

        # Update fields from status_update
        for key, value in status_update.items():
            if hasattr(pickup, key):
                setattr(pickup, key, value)

        pickup.updated_at = datetime.now(timezone.utc)

        # Handle status-specific logic
        if pickup.status == VendorPickupStatus.COMPLETED:
            if not pickup.actual_pickup_date:
                pickup.actual_pickup_date = datetime.now(timezone.utc)

            # Create pickup completion movement records
            for item in pickup.items_for_pickup:
                movement = InventoryMovement(
                    tenant_id=pickup.tenant_id,
                    part_id=item.get("part_id"),
                    movement_type="OUT",
                    from_location=InventoryLocation.FIELD,
                    to_location=InventoryLocation.VENDOR,
                    quantity=item.get("quantity", 0),
                    unit_cost=item.get("unit_cost", 0.0),
                    total_cost=item.get("quantity", 0) * item.get("unit_cost", 0.0),
                    reference_type="vendor_pickup",
                    reference_id=pickup_id,
                    performed_by=pickup.driver_name or "vendor_driver",
                    notes=f"Vendor pickup completed: {pickup.pickup_number}",
                )

                await self.db.inventory_movements.insert_one(movement.dict())

        # Save updated pickup
        await self.db.vendor_pickups.update_one(
            {"id": pickup_id}, {"$set": pickup.dict()}
        )

        # Create status update alert
        await self._create_inventory_alert(
            pickup.tenant_id,
            AlertType.VENDOR_PICKUP,
            f"Vendor Pickup {pickup.pickup_number} Updated",
            f"Status changed from {old_status} to {pickup.status}",
            severity="low",
        )

        return pickup

    async def _create_inventory_alert(
        self, tenant_id: str, alert_type: AlertType, title: str, message: str, **kwargs
    ):
        """Helper to create inventory alerts"""
        alert = InventoryAlert(
            tenant_id=tenant_id,
            alert_type=alert_type,
            title=title,
            message=message,
            **kwargs,
        )

        await self.db.inventory_alerts.insert_one(alert.dict())
        return alert

    async def _add_inventory_quantity(
        self,
        tenant_id: str,
        part_id: str,
        location: InventoryLocation,
        quantity: int,
        notes: str,
    ):
        """Helper to add quantity to inventory"""
        inventory = await self.db.inventory.find_one(
            {"tenant_id": tenant_id, "part_id": part_id, "location": location.value}
        )

        if inventory:
            await self.db.inventory.update_one(
                {"id": inventory["id"]},
                {
                    "$inc": {"quantity_on_hand": quantity},
                    "$set": {"updated_at": datetime.now(timezone.utc)},
                },
            )
        else:
            # Create new inventory record
            new_inventory = EnhancedInventory(
                tenant_id=tenant_id,
                part_id=part_id,
                location=location,
                quantity_on_hand=quantity,
                cost_per_unit=0.0,  # Will be updated separately
                total_value=0.0,
            )
            await self.db.inventory.insert_one(new_inventory.dict())

    async def calculate_dashboard_stats(
        self, tenant_id: str
    ) -> InventoryDashboardStats:
        """Calculate real-time inventory dashboard statistics"""
        # Total parts count
        total_parts = await self.db.parts.count_documents({"tenant_id": tenant_id})

        # Total inventory value
        inventory_items = await self.db.inventory.find(
            {"tenant_id": tenant_id}
        ).to_list(length=None)
        total_value = sum(item.get("total_value", 0) for item in inventory_items)

        # Low stock alerts
        low_stock_alerts = await self.db.inventory_alerts.count_documents(
            {
                "tenant_id": tenant_id,
                "alert_type": AlertType.LOW_STOCK.value,
                "is_acknowledged": False,
            }
        )

        # Pending RMAs
        pending_rmas = await self.db.rmas.count_documents(
            {
                "tenant_id": tenant_id,
                "status": {
                    "$nin": [RMAStatus.RETURNED.value, RMAStatus.REJECTED.value]
                },
            }
        )

        # Overdue maintenance
        overdue_maintenance = await self.db.assets.count_documents(
            {
                "tenant_id": tenant_id,
                "next_maintenance": {"$lt": datetime.now(timezone.utc)},
                "status": {"$ne": AssetStatus.RETIRED.value},
            }
        )

        # Trucks needing restock (simplified)
        trucks_needing_restock = await self.db.truck_inventory.count_documents(
            {"tenant_id": tenant_id, "quantity": {"$lte": 5}}
        )

        # Vendor pickups today
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today_end = today_start + timedelta(days=1)
        vendor_pickups_today = await self.db.vendor_pickups.count_documents(
            {
                "tenant_id": tenant_id,
                "scheduled_date": {"$gte": today_start, "$lt": today_end},
            }
        )

        return InventoryDashboardStats(
            total_parts=total_parts,
            total_value=total_value,
            low_stock_alerts=low_stock_alerts,
            pending_rmas=pending_rmas,
            overdue_maintenance=overdue_maintenance,
            trucks_needing_restock=trucks_needing_restock,
            vendor_pickups_today=vendor_pickups_today,
        )
