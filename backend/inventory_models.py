from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime, timezone
import uuid


# Enhanced Enums for Inventory Management
class AssetType(str, Enum):
    MACHINE = "machine"
    PART = "part"
    CHAIR = "chair"
    GAME_BOARD = "game_board"
    ACCESSORY = "accessory"


class AssetStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    BROKEN = "broken"
    RETIRED = "retired"
    RMA = "rma"
    IN_TRANSIT = "in_transit"


class InventoryLocation(str, Enum):
    WAREHOUSE = "warehouse"
    TRUCK = "truck"
    FIELD = "field"
    RMA_FACILITY = "rma_facility"
    VENDOR = "vendor"


class RMAStatus(str, Enum):
    INITIATED = "initiated"
    APPROVED = "approved"
    SHIPPED = "shipped"
    RECEIVED = "received"
    UNDER_REPAIR = "under_repair"
    REPAIRED = "repaired"
    REPLACED = "replaced"
    REJECTED = "rejected"
    RETURNED = "returned"


class AlertType(str, Enum):
    LOW_STOCK = "low_stock"
    REORDER_POINT = "reorder_point"
    OVERDUE_MAINTENANCE = "overdue_maintenance"
    ASSET_EXPIRY = "asset_expiry"
    RMA_UPDATE = "rma_update"
    VENDOR_PICKUP = "vendor_pickup"


class VendorPickupStatus(str, Enum):
    SCHEDULED = "scheduled"
    EN_ROUTE = "en_route"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Enhanced Asset Models
class AssetTag(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coam_id: str  # Unique COAM identifier
    qr_code: str
    barcode: str
    asset_type: AssetType
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True


class AssetLifecycle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_id: str
    event_type: str  # "installed", "maintenance", "repair", "moved", "retired"
    event_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    location_id: Optional[str] = None
    performed_by: str
    notes: Optional[str] = None
    cost: Optional[float] = None
    parts_used: List[Dict[str, Any]] = Field(default_factory=list)
    next_service_date: Optional[datetime] = None


class EnhancedAsset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    asset_tag: AssetTag
    asset_type: AssetType
    name: str
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    serial_number: str
    current_location_id: Optional[str] = None
    status: AssetStatus = AssetStatus.ACTIVE
    purchase_date: Optional[datetime] = None
    purchase_cost: Optional[float] = None
    warranty_expiry: Optional[datetime] = None
    expected_lifespan_years: Optional[int] = None
    lifecycle_events: List[AssetLifecycle] = Field(default_factory=list)
    last_maintenance: Optional[datetime] = None
    next_maintenance: Optional[datetime] = None
    maintenance_interval_days: Optional[int] = None
    replacement_due_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Enhanced Inventory Models
class InventoryAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    alert_type: AlertType
    part_id: Optional[str] = None
    asset_id: Optional[str] = None
    title: str
    message: str
    severity: str = "medium"  # "low", "medium", "high", "critical"
    current_quantity: Optional[int] = None
    reorder_point: Optional[int] = None
    lead_time_days: Optional[int] = None
    suggested_reorder_quantity: Optional[int] = None
    is_acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EnhancedPart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    part_number: str
    name: str
    description: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    unit_cost: float
    currency: str = "USD"
    barcode: Optional[str] = None
    qr_code: Optional[str] = None
    supplier: Optional[str] = None
    supplier_part_number: Optional[str] = None
    lead_time_days: int = 7
    minimum_order_quantity: int = 1
    package_quantity: int = 1
    weight_kg: Optional[float] = None
    dimensions: Optional[Dict[str, float]] = (
        None  # {"length": 10, "width": 5, "height": 2}
    )
    compatibility: List[str] = Field(default_factory=list)  # Compatible asset models
    storage_requirements: Optional[str] = None
    safety_data_sheet: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EnhancedInventory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    part_id: str
    location: InventoryLocation
    location_details: Optional[str] = None  # Specific bay, shelf, truck ID
    quantity_on_hand: int
    quantity_reserved: int = 0
    quantity_available: int = Field(default=0)  # Calculated: on_hand - reserved
    reorder_point: int = 5
    maximum_stock: int = 100
    cost_per_unit: float
    total_value: float = Field(default=0.0)  # Calculated: quantity * cost
    last_counted: Optional[datetime] = None
    last_movement: Optional[datetime] = None
    lot_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InventoryMovement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    part_id: str
    movement_type: str  # "IN", "OUT", "TRANSFER", "ADJUSTMENT", "RMA"
    from_location: Optional[InventoryLocation] = None
    to_location: Optional[InventoryLocation] = None
    quantity: int
    unit_cost: float
    total_cost: float
    reference_type: Optional[str] = None  # "job", "purchase_order", "rma"
    reference_id: Optional[str] = None
    performed_by: str
    notes: Optional[str] = None
    batch_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# RMA Management Models
class RMAItem(BaseModel):
    part_id: str
    quantity: int
    reason: str
    condition: str  # "defective", "damaged", "wrong_part", "excess"
    photos: List[str] = Field(default_factory=list)


class RMA(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    rma_number: str  # Auto-generated RMA-YYYY-NNNN
    status: RMAStatus = RMAStatus.INITIATED
    job_id: Optional[str] = None  # Original job that triggered RMA
    tech_id: Optional[str] = None
    created_by: str
    supplier: str
    items: List[RMAItem] = Field(default_factory=list)
    reason_summary: str
    total_value: float = 0.0
    shipping_cost: Optional[float] = None
    tracking_number: Optional[str] = None
    expected_resolution_date: Optional[datetime] = None
    actual_resolution_date: Optional[datetime] = None
    replacement_parts: List[Dict[str, Any]] = Field(default_factory=list)
    credit_amount: Optional[float] = None
    repost_job: bool = False  # Auto-repost job if RMA approved
    reposted_job_id: Optional[str] = None
    vendor_contact: Optional[Dict[str, str]] = None
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RMAStatusUpdate(BaseModel):
    rma_id: str
    new_status: RMAStatus
    notes: Optional[str] = None
    tracking_number: Optional[str] = None
    expected_date: Optional[datetime] = None
    replacement_parts: Optional[List[Dict[str, Any]]] = None
    credit_amount: Optional[float] = None


# Vendor Management Models
class VendorContact(BaseModel):
    name: str
    email: str
    phone: str
    role: str


class Vendor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    name: str
    code: str  # Short vendor code
    contact_info: VendorContact
    address: str
    payment_terms: str = "Net 30"
    lead_time_days: int = 7
    minimum_order: float = 0.0
    preferred: bool = False
    rating: float = 5.0
    notes: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VendorPickup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    vendor_id: str
    pickup_number: str
    status: VendorPickupStatus = VendorPickupStatus.SCHEDULED
    scheduled_date: datetime
    actual_pickup_date: Optional[datetime] = None
    location_id: str
    contact_person: str
    contact_phone: str
    items_for_pickup: List[Dict[str, Any]] = Field(default_factory=list)
    estimated_value: float = 0.0
    actual_cost: Optional[float] = None
    cost_verified: bool = False
    pickup_receipt: Optional[str] = None
    driver_name: Optional[str] = None
    vehicle_info: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Machine Lifecycle Analytics
class MachineLifecycleAnalytics(BaseModel):
    machine_id: str
    age_months: int
    total_service_cost: float
    service_frequency: float  # Services per month
    uptime_percentage: float
    revenue_generated: Optional[float] = None
    cost_per_service: float
    replacement_score: float  # 0-100, higher = more urgent replacement needed
    predicted_failure_date: Optional[datetime] = None
    recommended_action: (
        str  # "continue", "increase_maintenance", "plan_replacement", "retire"
    )
    last_calculated: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# Request/Response Models
class InventoryTransferRequest(BaseModel):
    part_id: str
    from_location: InventoryLocation
    to_location: InventoryLocation
    quantity: int
    notes: Optional[str] = None


class InventoryAdjustmentRequest(BaseModel):
    part_id: str
    location: InventoryLocation
    new_quantity: int
    reason: str
    notes: Optional[str] = None


class BulkInventoryUpdate(BaseModel):
    updates: List[Dict[str, Any]]
    performed_by: str
    batch_notes: Optional[str] = None


class AssetMaintenanceRequest(BaseModel):
    asset_id: str
    maintenance_type: str
    scheduled_date: datetime
    estimated_duration: int  # minutes
    required_parts: List[str] = Field(default_factory=list)
    assigned_tech: Optional[str] = None
    notes: Optional[str] = None


class LowStockAlert(BaseModel):
    part_id: str
    current_quantity: int
    reorder_point: int
    lead_time_days: int
    suggested_order_quantity: int
    supplier: str
    estimated_cost: float


# Dashboard Models
class InventoryDashboardStats(BaseModel):
    total_parts: int
    total_value: float
    low_stock_alerts: int
    pending_rmas: int
    overdue_maintenance: int
    trucks_needing_restock: int
    vendor_pickups_today: int


class AssetSummary(BaseModel):
    asset_type: AssetType
    total_count: int
    active_count: int
    maintenance_count: int
    retired_count: int
    average_age_months: float
    total_value: float
