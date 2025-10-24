"""
Business Intelligence Data Models
Pydantic models for BI API requests, responses, and data validation
"""

from pydantic import BaseModel, Field, validator
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum


class ReportPeriod(str, Enum):
    """Available reporting periods"""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class ReportFormat(str, Enum):
    """Export formats for reports"""

    JSON = "json"
    CSV = "csv"
    PDF = "pdf"


class TrendDirection(str, Enum):
    """Trend direction indicators"""

    UP = "up"
    DOWN = "down"
    STABLE = "stable"
    UNKNOWN = "unknown"


# KPI Models


class KPIMetric(BaseModel):
    """Individual KPI metric"""

    name: str
    value: Union[float, int, str]
    unit: str
    change_percentage: Optional[float] = None
    trend: Optional[TrendDirection] = TrendDirection.UNKNOWN
    benchmark: Optional[float] = None
    last_updated: Optional[datetime] = None


class RevenueKPIs(BaseModel):
    """Revenue-related KPIs"""

    total_revenue: float = Field(..., description="Total revenue for the period")
    mrr: float = Field(..., description="Monthly Recurring Revenue")
    arr: float = Field(..., description="Annual Recurring Revenue")
    revenue_per_tenant: float = Field(..., description="Average revenue per tenant")
    revenue_per_machine: float = Field(..., description="Average revenue per machine")
    churn_rate: float = Field(..., ge=0, le=100, description="Churn rate percentage")
    growth_rate: float = Field(..., description="Revenue growth rate percentage")
    change_percentage: Optional[float] = None
    top_revenue_tenants: List[Dict[str, Any]] = []


class OperationalKPIs(BaseModel):
    """Operational KPIs"""

    total_tenants: int = Field(..., ge=0)
    active_tenants: int = Field(..., ge=0)
    trial_tenants: int = Field(..., ge=0)
    suspended_tenants: int = Field(..., ge=0)
    total_machines: int = Field(..., ge=0)
    active_machines: int = Field(..., ge=0)
    avg_uptime_percentage: float = Field(..., ge=0, le=100)
    system_availability: float = Field(..., ge=0, le=100)
    avg_response_time: float = Field(..., ge=0)


class UserEngagementKPIs(BaseModel):
    """User engagement KPIs"""

    total_users: int = Field(..., ge=0)
    active_users_daily: int = Field(..., ge=0)
    active_users_weekly: int = Field(..., ge=0)
    active_users_monthly: int = Field(..., ge=0)
    avg_session_duration: float = Field(
        ..., ge=0, description="Average session duration in minutes"
    )
    user_retention_rate: float = Field(..., ge=0, le=100)
    login_frequency: float = Field(..., ge=0, description="Average logins per week")


class SupportKPIs(BaseModel):
    """Support-related KPIs"""

    open_tickets: int = Field(..., ge=0)
    resolved_tickets: int = Field(..., ge=0)
    avg_resolution_time: float = Field(
        ..., ge=0, description="Average resolution time in hours"
    )
    customer_satisfaction: float = Field(
        ..., ge=0, le=5, description="Satisfaction score out of 5"
    )
    escalated_tickets: int = Field(..., ge=0)
    tickets_per_tenant: float = Field(..., ge=0)


# Request Models


class KPIRequest(BaseModel):
    """Request for KPI data"""

    period: ReportPeriod = ReportPeriod.MONTHLY
    tenant_id: Optional[str] = None
    include_trends: bool = True
    include_benchmarks: bool = False


class ReportRequest(BaseModel):
    """Request for comprehensive report generation"""

    period: ReportPeriod
    tenant_id: Optional[str] = None
    include_trends: bool = True
    include_insights: bool = True
    format: ReportFormat = ReportFormat.JSON

    @validator("period")
    def validate_period(cls, v):
        if v not in ReportPeriod.__members__.values():
            raise ValueError(
                f"Invalid period. Must be one of: {list(ReportPeriod.__members__.values())}"
            )
        return v


class TenantAnalyticsRequest(BaseModel):
    """Request for tenant-specific analytics"""

    tenant_id: str = Field(..., min_length=1)
    period: ReportPeriod = ReportPeriod.MONTHLY
    include_usage_patterns: bool = True
    include_comparisons: bool = False


class ComparativeAnalyticsRequest(BaseModel):
    """Request for comparative analytics"""

    tenant_ids: Optional[List[str]] = None
    period: ReportPeriod = ReportPeriod.MONTHLY
    limit: int = Field(
        10, ge=1, le=50, description="Maximum number of tenants to compare"
    )
    sort_by: str = Field("revenue", description="Sort metric: revenue, uptime, users")


# Response Models


class KPISummaryResponse(BaseModel):
    """Summary KPIs response"""

    period: ReportPeriod
    start_date: datetime
    end_date: datetime
    revenue: RevenueKPIs
    operational: OperationalKPIs
    engagement: UserEngagementKPIs
    support: SupportKPIs
    generated_at: datetime
    cache_status: str = "fresh"


class TrendDataPoint(BaseModel):
    """Single data point in a trend"""

    date: datetime
    value: Union[float, int]
    label: Optional[str] = None


class TrendData(BaseModel):
    """Trend data for charts"""

    type: str = Field(..., description="Trend type: revenue, users, uptime, etc.")
    name: str = Field(..., description="Display name for the trend")
    data: List[TrendDataPoint]
    unit: str = Field(..., description="Unit of measurement")
    trend_direction: TrendDirection = TrendDirection.UNKNOWN
    period_change: Optional[float] = None


class InsightData(BaseModel):
    """AI-generated insight"""

    type: str = Field(
        ..., description="Insight category: revenue, operational, user, support"
    )
    level: str = Field(
        ..., description="Insight level: info, warning, critical, success"
    )
    message: str = Field(..., description="Human-readable insight message")
    metrics: Dict[str, Any] = Field(
        default_factory=dict, description="Supporting metrics"
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Actionable recommendations"
    )


class ComprehensiveReportResponse(BaseModel):
    """Complete BI report response"""

    period: ReportPeriod
    start_date: datetime
    end_date: datetime
    tenant_scope: Optional[str] = None
    kpis: KPISummaryResponse
    trends: List[TrendData]
    insights: List[InsightData]
    export_formats: List[ReportFormat]
    generated_at: datetime


# Tenant Analytics Models


class TenantInfo(BaseModel):
    """Tenant information"""

    id: str
    name: str
    tier: str
    status: str
    created_at: Optional[datetime] = None
    industry: Optional[str] = None
    location: Optional[str] = None


class TenantRevenueMetrics(BaseModel):
    """Tenant-specific revenue metrics"""

    total_revenue: float
    monthly_revenue: float
    revenue_growth: float
    billing_status: str
    payment_health_score: float = Field(ge=0, le=100)
    last_payment_date: Optional[datetime] = None


class TenantUserMetrics(BaseModel):
    """Tenant-specific user metrics"""

    total_users: int = Field(ge=0)
    active_users: int = Field(ge=0)
    new_users: int = Field(ge=0)
    user_growth: float
    avg_sessions_per_user: float = Field(ge=0)
    user_satisfaction_score: Optional[float] = Field(None, ge=0, le=5)


class TenantMachineMetrics(BaseModel):
    """Tenant-specific machine metrics"""

    total_machines: int = Field(ge=0)
    active_machines: int = Field(ge=0)
    avg_uptime: float = Field(ge=0, le=100)
    maintenance_events: int = Field(ge=0)
    machine_efficiency_score: float = Field(ge=0, le=100)
    next_maintenance_due: Optional[datetime] = None


class TenantSupportMetrics(BaseModel):
    """Tenant-specific support metrics"""

    open_tickets: int = Field(ge=0)
    resolved_tickets: int = Field(ge=0)
    avg_resolution_time: float = Field(ge=0)
    satisfaction_score: float = Field(ge=0, le=5)
    escalation_rate: float = Field(ge=0, le=100)


class UsagePattern(BaseModel):
    """Tenant usage patterns"""

    peak_hours: List[int] = Field(
        default_factory=list, description="Hours of peak usage (0-23)"
    )
    avg_daily_usage: float = Field(ge=0, description="Average daily usage hours")
    weekend_usage: float = Field(ge=0, description="Weekend usage hours")
    feature_adoption: Dict[str, float] = Field(
        default_factory=dict, description="Feature adoption percentages"
    )
    seasonal_trends: Dict[str, float] = Field(default_factory=dict)


class TenantAnalyticsResponse(BaseModel):
    """Comprehensive tenant analytics response"""

    tenant_info: TenantInfo
    revenue_metrics: TenantRevenueMetrics
    user_metrics: TenantUserMetrics
    machine_metrics: TenantMachineMetrics
    support_metrics: TenantSupportMetrics
    usage_patterns: UsagePattern
    trends: List[TrendData]
    health_score: float = Field(ge=0, le=100)
    risk_factors: List[str] = Field(default_factory=list)
    generated_at: datetime


# Comparative Analytics Models


class TenantComparison(BaseModel):
    """Individual tenant comparison data"""

    tenant_id: str
    tenant_name: str
    revenue_rank: int = Field(ge=1)
    revenue: float
    uptime: float = Field(ge=0, le=100)
    user_count: int = Field(ge=0)
    health_score: float = Field(ge=0, le=100)
    tier: str


class BenchmarkData(BaseModel):
    """Benchmark calculations"""

    avg_revenue: float
    median_revenue: float
    avg_uptime: float
    avg_user_count: float
    top_quartile_revenue: List[float]
    industry_benchmarks: Dict[str, float] = Field(default_factory=dict)


class ComparativeAnalyticsResponse(BaseModel):
    """Comparative analytics response"""

    period: ReportPeriod
    comparison_date_range: Dict[str, datetime]
    tenant_comparisons: List[TenantComparison]
    benchmarks: BenchmarkData
    rankings: List[Dict[str, Any]]
    insights: List[InsightData]
    generated_at: datetime


# Export Models


class ExportRequest(BaseModel):
    """Request for report export"""

    report_data: Dict[str, Any]
    format: ReportFormat
    include_charts: bool = True
    filename: Optional[str] = None


class ExportResponse(BaseModel):
    """Export response"""

    filename: str
    format: ReportFormat
    size_bytes: int
    download_url: Optional[str] = None
    expires_at: datetime
    generated_at: datetime


# Dashboard Widget Models


class WidgetConfig(BaseModel):
    """Dashboard widget configuration"""

    widget_id: str
    widget_type: str = Field(..., description="Type: kpi_card, chart, table, gauge")
    title: str
    data_source: str = Field(..., description="Data source endpoint")
    refresh_interval: int = Field(300, ge=30, description="Refresh interval in seconds")
    filters: Dict[str, Any] = Field(default_factory=dict)
    display_options: Dict[str, Any] = Field(default_factory=dict)


class DashboardLayout(BaseModel):
    """Dashboard layout configuration"""

    dashboard_id: str
    user_id: str
    tenant_id: Optional[str] = None
    layout_name: str
    widgets: List[WidgetConfig]
    layout_config: Dict[str, Any] = Field(default_factory=dict)
    is_default: bool = False
    created_at: datetime
    updated_at: datetime


# Health Score Models


class HealthScoreComponent(BaseModel):
    """Individual component of health score"""

    component: str = Field(
        ..., description="Component name: revenue, uptime, support, etc."
    )
    score: float = Field(ge=0, le=100)
    weight: float = Field(ge=0, le=1)
    status: str = Field(..., description="Status: excellent, good, warning, critical")
    factors: List[str] = Field(default_factory=list)


class HealthScoreResponse(BaseModel):
    """Health score calculation response"""

    overall_score: float = Field(ge=0, le=100)
    components: List[HealthScoreComponent]
    trend: TrendDirection
    recommendations: List[str]
    risk_level: str = Field(..., description="Risk level: low, medium, high")
    calculated_at: datetime


# Error Response Models


class BIErrorResponse(BaseModel):
    """BI service error response"""

    error_code: str
    error_message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime
    request_id: Optional[str] = None


# Validation Models


class DataQualityMetrics(BaseModel):
    """Data quality assessment"""

    completeness_score: float = Field(ge=0, le=100)
    accuracy_score: float = Field(ge=0, le=100)
    timeliness_score: float = Field(ge=0, le=100)
    consistency_score: float = Field(ge=0, le=100)
    overall_quality: float = Field(ge=0, le=100)
    issues: List[str] = Field(default_factory=list)
    last_assessed: datetime
