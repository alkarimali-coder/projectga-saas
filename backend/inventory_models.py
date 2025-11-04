from sqlalchemy import Column, Integer, String
from app.core.db import Base

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, index=True, nullable=False)
    quantity = Column(Integer, nullable=False, default=0)


# === TEMPORARY FALLBACK (Phase 3) ===
# Minimal stub so InventoryService can import InventoryAlert
try:
    from sqlalchemy import Column, Integer, String, DateTime
    from datetime import datetime
    from database import Base
except Exception:
    Base = object  # if Base isn't ready at import time

class InventoryAlert(Base):
    __tablename__ = "inventory_alerts"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(50), nullable=True)
    part_name = Column(String(120), nullable=True)
    quantity = Column(Integer, default=0)
    threshold = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
# === END TEMPORARY FALLBACK ===

# === TEMPORARY STUB (Phase 3) ===
# Placeholder for AssetType enum so imports succeed.
from enum import Enum

class AssetType(str, Enum):
    MACHINE = "machine"
    PART = "part"
    COMPONENT = "component"
    UNKNOWN = "unknown"
# === END TEMPORARY STUB ===

# === TEMPORARY STUB (Phase 3) ===
# Placeholder for AssetTag so InventoryService type hints work
class AssetTag:
    def __init__(self, tag_code: str = "", asset_type: str = "unknown", tenant_id: str = ""):
        self.tag_code = tag_code
        self.asset_type = asset_type
        self.tenant_id = tenant_id

    def __repr__(self):
        return f"<AssetTag {self.tag_code or 'UNASSIGNED'}>"
# === END TEMPORARY STUB ===

# === TEMPORARY STUB (Phase 3) ===
# Placeholder class for MachineLifecycleAnalytics
class MachineLifecycleAnalytics:
    def __init__(self, machine_id: str = "", uptime_hours: int = 0, downtime_hours: int = 0):
        self.machine_id = machine_id
        self.uptime_hours = uptime_hours
        self.downtime_hours = downtime_hours

    def summary(self):
        return {
            "machine_id": self.machine_id,
            "uptime_hours": self.uptime_hours,
            "downtime_hours": self.downtime_hours,
        }

    def __repr__(self):
        return f"<MachineLifecycleAnalytics {self.machine_id or 'UNKNOWN'}>"
# === END TEMPORARY STUB ===

# === TEMPORARY STUB (Phase 3) ===
# Placeholder enum for RMAStatus so type hints resolve
from enum import Enum

class RMAStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_TRANSIT = "in_transit"
    RECEIVED = "received"
    COMPLETED = "completed"
# === END TEMPORARY STUB ===

# === TEMPORARY STUB (Phase 3) ===
# Lightweight placeholder for RMA model
class RMA:
    def __init__(self, rma_id: str = "", vendor_id: str = "", status: str = "pending"):
        self.rma_id = rma_id
        self.vendor_id = vendor_id
        self.status = status

    def __repr__(self):
        return f"<RMA {self.rma_id or 'UNASSIGNED'} - {self.status}>"
# === END TEMPORARY STUB ===

# === TEMPORARY STUB (Phase 3) ===
# Minimal placeholder for VendorPickup model
class VendorPickup:
    def __init__(self, pickup_id: str = "", vendor_id: str = "", items: list = None, status: str = "pending"):
        self.pickup_id = pickup_id
        self.vendor_id = vendor_id
        self.items = items or []
        self.status = status

    def __repr__(self):
        return f"<VendorPickup {self.pickup_id or 'UNASSIGNED'} - {self.status}>"
# === END TEMPORARY STUB ===

# === TEMPORARY STUB (Phase 3) ===
# Enum placeholder for AlertType used by InventoryService
from enum import Enum

class AlertType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    LOW_STOCK = "low_stock"
    MACHINE_OFFLINE = "machine_offline"
    PART_FAILURE = "part_failure"
# === END TEMPORARY STUB ===

# === TEMPORARY STUB (Phase 3) ===
# Minimal placeholder for InventoryLocation so imports resolve
class InventoryLocation:
    def __init__(self, location_id: str = "", name: str = "", type: str = "warehouse"):
        self.location_id = location_id
        self.name = name
        self.type = type

    def __repr__(self):
        return f"<InventoryLocation {self.name or self.location_id}>"
# === END TEMPORARY STUB ===

# === TEMPORARY STUB (Phase 3) ===
# Placeholder for InventoryDashboardStats used in InventoryService
class InventoryDashboardStats:
    def __init__(
        self,
        total_assets: int = 0,
        active_machines: int = 0,
        low_stock_items: int = 0,
        open_rmas: int = 0,
        alerts: int = 0,
    ):
        self.total_assets = total_assets
        self.active_machines = active_machines
        self.low_stock_items = low_stock_items
        self.open_rmas = open_rmas
        self.alerts = alerts

    def __repr__(self):
        return (
            f"<InventoryDashboardStats assets={self.total_assets}, "
            f"machines={self.active_machines}, low_stock={self.low_stock_items}, "
            f"open_rmas={self.open_rmas}, alerts={self.alerts}>"
        )
# === END TEMPORARY STUB ===
