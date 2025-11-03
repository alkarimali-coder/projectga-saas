"""
Business Intelligence Service for COAM SaaS Platform
Provides comprehensive analytics, KPIs, and reporting capabilities for super-admins and tenant-admins.
Processes data from tenants, users, machines, financial records, and system logs.
"""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum
import statistics
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)


class ReportPeriod(str, Enum):
    """Time periods for BI reports"""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class ReportFormat(str, Enum):
    """Export formats for BI reports"""

    JSON = "json"
    CSV = "csv"
    PDF = "pdf"


@dataclass
class KPIMetric:
    """Individual KPI metric with metadata"""

    name: str
    value: Union[float, int, str]
    unit: str
    change_percentage: Optional[float] = None
    trend: Optional[str] = None  # 'up', 'down', 'stable'
    benchmark: Optional[float] = None
    last_updated: Optional[datetime] = None


@dataclass
class RevenueKPI:
    """Revenue-related KPIs"""

    total_revenue: float
    mrr: float  # Monthly Recurring Revenue
    arr: float  # Annual Recurring Revenue
    revenue_per_tenant: float
    revenue_per_machine: float
    churn_rate: float
    growth_rate: float
    top_revenue_tenants: List[Dict[str, Any]]


@dataclass
class OperationalKPI:
    """Operational KPIs"""

    total_tenants: int
    active_tenants: int
    trial_tenants: int
    suspended_tenants: int
    total_machines: int
    active_machines: int
    avg_uptime_percentage: float
    system_availability: float
    avg_response_time: float


@dataclass
class UserEngagementKPI:
    """User engagement and activity KPIs"""

    total_users: int
    active_users_daily: int
    active_users_weekly: int
    active_users_monthly: int
    avg_session_duration: float
    user_retention_rate: float
    login_frequency: float


@dataclass
class SupportKPI:
    """Support and service KPIs"""

    open_tickets: int
    resolved_tickets: int
    avg_resolution_time: float
    customer_satisfaction: float
    escalated_tickets: int
    tickets_per_tenant: float


@dataclass
class BusinessIntelligenceReport:
    """Complete BI report structure"""

    period: ReportPeriod
    start_date: datetime
    end_date: datetime
    revenue_kpis: RevenueKPI
    operational_kpis: OperationalKPI
    user_engagement_kpis: UserEngagementKPI
    support_kpis: SupportKPI
    trends: List[Dict[str, Any]]
    insights: List[str]
    generated_at: datetime


class BusinessIntelligenceService:
    """Comprehensive Business Intelligence service for analytics and reporting"""

    def __init__(self, db_client: AsyncIOMotorClient):
        self.db = db_client
        self.db_name = self.db.coam_saas

        # Collections
        self.tenants = self.db_name.tenants
        self.users = self.db_name.users
        self.machines = self.db_name.machines
        self.financial_records = self.db_name.financial_records
        self.system_metrics = self.db_name.system_metrics
        self.audit_logs = self.db_name.audit_logs
        self.support_tickets = self.db_name.support_tickets
        self.bi_cache = self.db_name.bi_cache
        self.revenue_records = self.db_name.revenue_records

    async def initialize_indexes(self):
        """Create database indexes for BI performance"""
        try:
            # BI cache indexes
            await self.bi_cache.create_index(
                [("report_type", 1), ("period", 1), ("date", -1)]
            )
            await self.bi_cache.create_index("generated_at")

            # Performance indexes for aggregations
            await self.tenants.create_index("created_at")
            await self.tenants.create_index([("status", 1), ("tier", 1)])
            await self.users.create_index([("tenant_id", 1), ("last_activity", -1)])
            await self.system_metrics.create_index(
                [("timestamp", -1), ("tenant_id", 1)]
            )

            logger.info("✅ BI service indexes created successfully")
        except Exception as e:
            logger.error(f"❌ Failed to create BI indexes: {e}")

    async def get_summary_kpis(
        self,
        period: ReportPeriod = ReportPeriod.MONTHLY,
        tenant_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get summary KPIs for dashboard display"""
        try:
            # Determine date range
            end_date = datetime.now(timezone.utc)
            start_date = self._get_period_start_date(end_date, period)
            previous_start = self._get_period_start_date(start_date, period)

            # Get cached results if available
            cache_key = f"summary_kpis_{period}_{tenant_id or 'global'}"
            cached = await self._get_cached_result(cache_key, start_date)
            if cached:
                return cached

            # Calculate KPIs
            revenue_kpis = await self._calculate_revenue_kpis(
                start_date, end_date, tenant_id
            )
            operational_kpis = await self._calculate_operational_kpis(
                start_date, end_date, tenant_id
            )
            user_kpis = await self._calculate_user_engagement_kpis(
                start_date, end_date, tenant_id
            )
            support_kpis = await self._calculate_support_kpis(
                start_date, end_date, tenant_id
            )

            # Calculate period-over-period changes
            previous_revenue = await self._calculate_revenue_kpis(
                previous_start, start_date, tenant_id
            )

            kpis = {
                "period": period,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "revenue": {
                    "total_revenue": revenue_kpis.total_revenue,
                    "mrr": revenue_kpis.mrr,
                    "revenue_per_tenant": revenue_kpis.revenue_per_tenant,
                    "growth_rate": revenue_kpis.growth_rate,
                    "change_percentage": self._calculate_change_percentage(
                        revenue_kpis.total_revenue, previous_revenue.total_revenue
                    ),
                },
                "operational": {
                    "total_tenants": operational_kpis.total_tenants,
                    "active_tenants": operational_kpis.active_tenants,
                    "system_uptime": operational_kpis.avg_uptime_percentage,
                    "avg_response_time": operational_kpis.avg_response_time,
                },
                "engagement": {
                    "active_users": user_kpis.active_users_monthly,
                    "avg_session_duration": user_kpis.avg_session_duration,
                    "retention_rate": user_kpis.user_retention_rate,
                },
                "support": {
                    "open_tickets": support_kpis.open_tickets,
                    "avg_resolution_time": support_kpis.avg_resolution_time,
                    "satisfaction_score": support_kpis.customer_satisfaction,
                },
            }

            # Cache result
            await self._cache_result(cache_key, kpis, start_date)

            return kpis

        except Exception as e:
            logger.error(f"Failed to get summary KPIs: {e}")
            return await self._get_fallback_kpis(period, tenant_id)

    async def generate_comprehensive_report(
        self,
        period: ReportPeriod,
        tenant_id: Optional[str] = None,
        include_trends: bool = True,
    ) -> BusinessIntelligenceReport:
        """Generate comprehensive BI report"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = self._get_period_start_date(end_date, period)

            # Calculate all KPI categories
            revenue_kpis = await self._calculate_revenue_kpis(
                start_date, end_date, tenant_id
            )
            operational_kpis = await self._calculate_operational_kpis(
                start_date, end_date, tenant_id
            )
            user_kpis = await self._calculate_user_engagement_kpis(
                start_date, end_date, tenant_id
            )
            support_kpis = await self._calculate_support_kpis(
                start_date, end_date, tenant_id
            )

            # Generate trends if requested
            trends = []
            if include_trends:
                trends = await self._calculate_trends(start_date, end_date, tenant_id)

            # Generate insights
            insights = await self._generate_insights(
                revenue_kpis, operational_kpis, user_kpis, support_kpis
            )

            report = BusinessIntelligenceReport(
                period=period,
                start_date=start_date,
                end_date=end_date,
                revenue_kpis=revenue_kpis,
                operational_kpis=operational_kpis,
                user_engagement_kpis=user_kpis,
                support_kpis=support_kpis,
                trends=trends,
                insights=insights,
                generated_at=datetime.now(timezone.utc),
            )

            return report

        except Exception as e:
            logger.error(f"Failed to generate comprehensive report: {e}")
            raise

    async def get_tenant_analytics(
        self, tenant_id: str, period: ReportPeriod = ReportPeriod.MONTHLY
    ) -> Dict[str, Any]:
        """Get drill-down analytics for specific tenant"""
        try:
            # Verify tenant exists
            tenant = await self.tenants.find_one({"id": tenant_id})
            if not tenant:
                raise ValueError(f"Tenant {tenant_id} not found")

            end_date = datetime.now(timezone.utc)
            start_date = self._get_period_start_date(end_date, period)

            # Get tenant-specific metrics
            tenant_metrics = {
                "tenant_info": {
                    "id": tenant["id"],
                    "name": tenant.get("name", "Unknown"),
                    "tier": tenant.get("tier", "unknown"),
                    "status": tenant.get("status", "unknown"),
                    "created_at": (
                        tenant.get("created_at", "").isoformat()
                        if tenant.get("created_at")
                        else None
                    ),
                },
                "revenue_metrics": await self._get_tenant_revenue_metrics(
                    tenant_id, start_date, end_date
                ),
                "user_metrics": await self._get_tenant_user_metrics(
                    tenant_id, start_date, end_date
                ),
                "machine_metrics": await self._get_tenant_machine_metrics(
                    tenant_id, start_date, end_date
                ),
                "support_metrics": await self._get_tenant_support_metrics(
                    tenant_id, start_date, end_date
                ),
                "usage_patterns": await self._get_tenant_usage_patterns(
                    tenant_id, start_date, end_date
                ),
            }

            return tenant_metrics

        except Exception as e:
            logger.error(f"Failed to get tenant analytics for {tenant_id}: {e}")
            raise

    async def get_comparative_analytics(
        self,
        tenant_ids: Optional[List[str]] = None,
        period: ReportPeriod = ReportPeriod.MONTHLY,
    ) -> Dict[str, Any]:
        """Get comparative statistics across tenants"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = self._get_period_start_date(end_date, period)

            # If no specific tenants provided, get top performing tenants
            if not tenant_ids:
                tenant_ids = await self._get_top_tenants_by_revenue(
                    start_date, end_date, limit=10
                )

            comparisons = []
            for tenant_id in tenant_ids:
                try:
                    tenant_data = await self.get_tenant_analytics(tenant_id, period)
                    comparisons.append(tenant_data)
                except Exception as e:
                    logger.warning(
                        f"Failed to get analytics for tenant {tenant_id}: {e}"
                    )
                    continue

            # Calculate comparative metrics
            comparative_metrics = {
                "period": period,
                "comparison_date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                },
                "tenant_comparisons": comparisons,
                "benchmarks": await self._calculate_benchmarks(comparisons),
                "rankings": await self._calculate_tenant_rankings(comparisons),
            }

            return comparative_metrics

        except Exception as e:
            logger.error(f"Failed to get comparative analytics: {e}")
            raise

    async def export_report(
        self, report_data: Dict[str, Any], format: ReportFormat = ReportFormat.JSON
    ) -> bytes:
        """Export report in specified format"""
        try:
            if format == ReportFormat.JSON:
                import json

                return json.dumps(report_data, indent=2, default=str).encode("utf-8")

            elif format == ReportFormat.CSV:
                return await self._export_to_csv(report_data)

            elif format == ReportFormat.PDF:
                return await self._export_to_pdf(report_data)

            else:
                raise ValueError(f"Unsupported format: {format}")

        except Exception as e:
            logger.error(f"Failed to export report: {e}")
            raise

    # Private helper methods

    async def _calculate_revenue_kpis(
        self, start_date: datetime, end_date: datetime, tenant_id: Optional[str] = None
    ) -> RevenueKPI:
        """Calculate revenue-related KPIs"""
        try:
            filter_query = {"created_at": {"$gte": start_date, "$lte": end_date}}
            if tenant_id:
                filter_query["tenant_id"] = tenant_id

            # Get revenue data (mock calculation for now)
            tenant_count = await self.tenants.count_documents(
                filter_query if not tenant_id else {"id": tenant_id}
            )

            # Mock revenue calculations - in production, these would come from billing records
            base_revenue = tenant_count * 100  # $100 per tenant base
            total_revenue = base_revenue + (tenant_count * 50)  # Additional usage fees
            mrr = total_revenue / max(
                1, (end_date - start_date).days / 30
            )  # Monthly recurring revenue
            arr = mrr * 12

            revenue_per_tenant = total_revenue / max(1, tenant_count)

            # Machine-based revenue calculation
            machine_count = await self._get_machine_count(tenant_id)
            revenue_per_machine = total_revenue / max(1, machine_count)

            # Growth rate calculation
            previous_period_start = start_date - (end_date - start_date)
            previous_revenue = await self._get_previous_revenue(
                previous_period_start, start_date, tenant_id
            )
            growth_rate = self._calculate_change_percentage(
                total_revenue, previous_revenue
            )

            # Churn rate calculation
            churn_rate = await self._calculate_churn_rate(
                start_date, end_date, tenant_id
            )

            # Top revenue tenants
            top_tenants = await self._get_top_revenue_tenants(
                start_date, end_date, limit=5
            )

            return RevenueKPI(
                total_revenue=total_revenue,
                mrr=mrr,
                arr=arr,
                revenue_per_tenant=revenue_per_tenant,
                revenue_per_machine=revenue_per_machine,
                churn_rate=churn_rate,
                growth_rate=growth_rate,
                top_revenue_tenants=top_tenants,
            )

        except Exception as e:
            logger.error(f"Failed to calculate revenue KPIs: {e}")
            return RevenueKPI(0, 0, 0, 0, 0, 0, 0, [])

    async def _calculate_operational_kpis(
        self, start_date: datetime, end_date: datetime, tenant_id: Optional[str] = None
    ) -> OperationalKPI:
        """Calculate operational KPIs"""
        try:
            # Tenant metrics
            tenant_filter = {"id": tenant_id} if tenant_id else {}
            total_tenants = await self.tenants.count_documents(tenant_filter)
            active_tenants = await self.tenants.count_documents(
                {**tenant_filter, "status": "active"}
            )
            trial_tenants = await self.tenants.count_documents(
                {**tenant_filter, "status": "trial"}
            )
            suspended_tenants = await self.tenants.count_documents(
                {**tenant_filter, "status": "suspended"}
            )

            # Machine metrics
            machine_filter = {"tenant_id": tenant_id} if tenant_id else {}
            total_machines = await self._get_machine_count(tenant_id)
            active_machines = await self._get_active_machine_count(tenant_id)

            # System performance metrics
            system_metrics_filter = {
                "timestamp": {"$gte": start_date, "$lte": end_date}
            }
            if tenant_id:
                system_metrics_filter["tenant_id"] = tenant_id

            # Get system metrics from monitoring data
            metrics = await self.system_metrics.find(system_metrics_filter).to_list(
                None
            )

            if metrics:
                avg_uptime = statistics.mean(
                    [m.get("uptime_percentage", 99.0) for m in metrics]
                )
                avg_response_time = statistics.mean(
                    [m.get("response_time_ms", 100) for m in metrics]
                )
                system_availability = statistics.mean(
                    [m.get("availability", 99.5) for m in metrics]
                )
            else:
                # Fallback values
                avg_uptime = 98.5
                avg_response_time = 85.0
                system_availability = 99.2

            return OperationalKPI(
                total_tenants=total_tenants,
                active_tenants=active_tenants,
                trial_tenants=trial_tenants,
                suspended_tenants=suspended_tenants,
                total_machines=total_machines,
                active_machines=active_machines,
                avg_uptime_percentage=avg_uptime,
                system_availability=system_availability,
                avg_response_time=avg_response_time,
            )

        except Exception as e:
            logger.error(f"Failed to calculate operational KPIs: {e}")
            return OperationalKPI(0, 0, 0, 0, 0, 0, 0, 0, 0)

    async def _calculate_user_engagement_kpis(
        self, start_date: datetime, end_date: datetime, tenant_id: Optional[str] = None
    ) -> UserEngagementKPI:
        """Calculate user engagement KPIs"""
        try:
            user_filter = {"tenant_id": tenant_id} if tenant_id else {}
            total_users = await self.users.count_documents(user_filter)

            # Active users calculations
            now = datetime.now(timezone.utc)
            daily_filter = {
                **user_filter,
                "last_activity": {"$gte": now - timedelta(days=1)},
            }
            weekly_filter = {
                **user_filter,
                "last_activity": {"$gte": now - timedelta(days=7)},
            }
            monthly_filter = {
                **user_filter,
                "last_activity": {"$gte": now - timedelta(days=30)},
            }

            active_users_daily = await self.users.count_documents(daily_filter)
            active_users_weekly = await self.users.count_documents(weekly_filter)
            active_users_monthly = await self.users.count_documents(monthly_filter)

            # Session and retention metrics (mock data)
            avg_session_duration = 45.5  # minutes
            user_retention_rate = 85.2  # percentage
            login_frequency = 4.2  # logins per week

            return UserEngagementKPI(
                total_users=total_users,
                active_users_daily=active_users_daily,
                active_users_weekly=active_users_weekly,
                active_users_monthly=active_users_monthly,
                avg_session_duration=avg_session_duration,
                user_retention_rate=user_retention_rate,
                login_frequency=login_frequency,
            )

        except Exception as e:
            logger.error(f"Failed to calculate user engagement KPIs: {e}")
            return UserEngagementKPI(0, 0, 0, 0, 0, 0, 0)

    async def _calculate_support_kpis(
        self, start_date: datetime, end_date: datetime, tenant_id: Optional[str] = None
    ) -> SupportKPI:
        """Calculate support-related KPIs"""
        try:
            # Mock support data - in production would come from support ticket system
            open_tickets = 12 if not tenant_id else 2
            resolved_tickets = 45 if not tenant_id else 8
            avg_resolution_time = 2.5  # hours
            customer_satisfaction = 4.2  # out of 5
            escalated_tickets = 3 if not tenant_id else 1

            tenant_count = await self.tenants.count_documents(
                {"id": tenant_id} if tenant_id else {}
            )
            tickets_per_tenant = (open_tickets + resolved_tickets) / max(
                1, tenant_count
            )

            return SupportKPI(
                open_tickets=open_tickets,
                resolved_tickets=resolved_tickets,
                avg_resolution_time=avg_resolution_time,
                customer_satisfaction=customer_satisfaction,
                escalated_tickets=escalated_tickets,
                tickets_per_tenant=tickets_per_tenant,
            )

        except Exception as e:
            logger.error(f"Failed to calculate support KPIs: {e}")
            return SupportKPI(0, 0, 0, 0, 0, 0)

    async def _calculate_trends(
        self, start_date: datetime, end_date: datetime, tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Calculate trend data for charts"""
        try:
            trends = []

            # Revenue trend
            revenue_trend = await self._calculate_revenue_trend(
                start_date, end_date, tenant_id
            )
            trends.append(
                {
                    "type": "revenue",
                    "name": "Revenue Trend",
                    "data": revenue_trend,
                    "unit": "USD",
                }
            )

            # User growth trend
            user_trend = await self._calculate_user_growth_trend(
                start_date, end_date, tenant_id
            )
            trends.append(
                {
                    "type": "users",
                    "name": "User Growth",
                    "data": user_trend,
                    "unit": "users",
                }
            )

            # System uptime trend
            uptime_trend = await self._calculate_uptime_trend(
                start_date, end_date, tenant_id
            )
            trends.append(
                {
                    "type": "uptime",
                    "name": "System Uptime",
                    "data": uptime_trend,
                    "unit": "percentage",
                }
            )

            return trends

        except Exception as e:
            logger.error(f"Failed to calculate trends: {e}")
            return []

    async def _generate_insights(
        self,
        revenue: RevenueKPI,
        operational: OperationalKPI,
        user: UserEngagementKPI,
        support: SupportKPI,
    ) -> List[str]:
        """Generate AI-driven insights from KPI data"""
        insights = []

        try:
            # Revenue insights
            if revenue.growth_rate > 20:
                insights.append(
                    f"🚀 Excellent growth rate of {revenue.growth_rate:.1f}% indicates strong market traction"
                )
            elif revenue.growth_rate < 0:
                insights.append(
                    f"⚠️ Revenue decline of {abs(revenue.growth_rate):.1f}% requires immediate attention"
                )

            # Operational insights
            if operational.avg_uptime_percentage < 95:
                insights.append(
                    f"🔧 System uptime of {operational.avg_uptime_percentage:.1f}% is below industry standard (95%+)"
                )

            if operational.avg_response_time > 200:
                insights.append(
                    f"⏰ Average response time of {operational.avg_response_time:.0f}ms may impact user experience"
                )

            # User engagement insights
            engagement_rate = (
                user.active_users_monthly / max(1, user.total_users)
            ) * 100
            if engagement_rate > 80:
                insights.append(
                    f"👥 High user engagement rate of {engagement_rate:.1f}% shows strong product-market fit"
                )
            elif engagement_rate < 50:
                insights.append(
                    f"📉 Low engagement rate of {engagement_rate:.1f}% suggests need for user experience improvements"
                )

            # Support insights
            if support.avg_resolution_time > 4:
                insights.append(
                    f"🎧 Support resolution time of {support.avg_resolution_time:.1f} hours exceeds target (4h)"
                )

            # Cross-metric insights
            if revenue.churn_rate > 10:
                insights.append(
                    f"🚨 High churn rate of {revenue.churn_rate:.1f}% correlates with {support.open_tickets} open support tickets"
                )

            return insights

        except Exception as e:
            logger.error(f"Failed to generate insights: {e}")
            return ["Unable to generate insights at this time"]

    # Utility methods

    def _get_period_start_date(
        self, end_date: datetime, period: ReportPeriod
    ) -> datetime:
        """Calculate start date for given period"""
        if period == ReportPeriod.DAILY:
            return end_date - timedelta(days=1)
        elif period == ReportPeriod.WEEKLY:
            return end_date - timedelta(weeks=1)
        elif period == ReportPeriod.MONTHLY:
            return end_date - timedelta(days=30)
        elif period == ReportPeriod.QUARTERLY:
            return end_date - timedelta(days=90)
        elif period == ReportPeriod.YEARLY:
            return end_date - timedelta(days=365)
        else:
            return end_date - timedelta(days=30)  # Default to monthly

    def _calculate_change_percentage(self, current: float, previous: float) -> float:
        """Calculate percentage change between two values"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return ((current - previous) / previous) * 100

    async def _get_cached_result(
        self, cache_key: str, min_date: datetime
    ) -> Optional[Dict[str, Any]]:
        """Get cached BI result if still valid"""
        try:
            cached = await self.bi_cache.find_one(
                {"cache_key": cache_key, "generated_at": {"$gte": min_date}}
            )
            return cached.get("data") if cached else None
        except Exception:
            return None

    async def _cache_result(self, cache_key: str, data: Dict[str, Any], date: datetime):
        """Cache BI result for performance"""
        try:
            await self.bi_cache.replace_one(
                {"cache_key": cache_key},
                {
                    "cache_key": cache_key,
                    "data": data,
                    "generated_at": datetime.now(timezone.utc),
                    "valid_until": date + timedelta(hours=1),
                },
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"Failed to cache result: {e}")

    async def _get_fallback_kpis(
        self, period: ReportPeriod, tenant_id: Optional[str]
    ) -> Dict[str, Any]:
        """Return fallback KPIs when calculation fails"""
        return {
            "period": period,
            "error": "Unable to calculate KPIs",
            "revenue": {
                "total_revenue": 0,
                "mrr": 0,
                "revenue_per_tenant": 0,
                "growth_rate": 0,
            },
            "operational": {
                "total_tenants": 0,
                "active_tenants": 0,
                "system_uptime": 0,
                "avg_response_time": 0,
            },
            "engagement": {
                "active_users": 0,
                "avg_session_duration": 0,
                "retention_rate": 0,
            },
            "support": {
                "open_tickets": 0,
                "avg_resolution_time": 0,
                "satisfaction_score": 0,
            },
        }

    # Placeholder methods for missing implementations

    async def _get_machine_count(self, tenant_id: Optional[str] = None) -> int:
        """Get total machine count"""
        return 25 if not tenant_id else 3  # Mock data

    async def _get_active_machine_count(self, tenant_id: Optional[str] = None) -> int:
        """Get active machine count"""
        return 22 if not tenant_id else 3  # Mock data

    async def _get_previous_revenue(
        self, start: datetime, end: datetime, tenant_id: Optional[str] = None
    ) -> float:
        """Get previous period revenue for comparison"""
        return 5000.0 if not tenant_id else 500.0  # Mock data

    async def _calculate_churn_rate(
        self, start: datetime, end: datetime, tenant_id: Optional[str] = None
    ) -> float:
        """Calculate churn rate"""
        return 3.2 if not tenant_id else 0.0  # Mock data

    async def _get_top_revenue_tenants(
        self, start: datetime, end: datetime, limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get top revenue generating tenants"""
        tenants = (
            await self.tenants.find({"status": "active"}).limit(limit).to_list(None)
        )
        return [
            {
                "tenant_id": t.get("id"),
                "name": t.get("name"),
                "revenue": 1000.0 + i * 200,
            }
            for i, t in enumerate(tenants)
        ]

    async def _get_top_tenants_by_revenue(
        self, start: datetime, end: datetime, limit: int = 10
    ) -> List[str]:
        """Get list of top tenant IDs by revenue"""
        tenants = (
            await self.tenants.find({"status": "active"}).limit(limit).to_list(None)
        )
        return [t.get("id") for t in tenants if t.get("id")]

    async def _calculate_revenue_trend(
        self, start: datetime, end: datetime, tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Calculate daily revenue trend"""
        days = (end - start).days
        trend_data = []
        for i in range(days):
            date = start + timedelta(days=i)
            value = 1000 + (i * 50) + (i % 7 * 100)  # Mock trend data
            trend_data.append({"date": date.isoformat(), "value": value})
        return trend_data

    async def _calculate_user_growth_trend(
        self, start: datetime, end: datetime, tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Calculate user growth trend"""
        days = (end - start).days
        trend_data = []
        base_users = 100 if not tenant_id else 10
        for i in range(days):
            date = start + timedelta(days=i)
            value = base_users + (i * 2)  # Steady growth
            trend_data.append({"date": date.isoformat(), "value": value})
        return trend_data

    async def _calculate_uptime_trend(
        self, start: datetime, end: datetime, tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Calculate system uptime trend"""
        days = (end - start).days
        trend_data = []
        for i in range(days):
            date = start + timedelta(days=i)
            value = 98.5 + (i % 3) * 0.5  # Varying uptime
            trend_data.append({"date": date.isoformat(), "value": min(100, value)})
        return trend_data

    # Additional helper methods for tenant-specific analytics

    async def _get_tenant_revenue_metrics(
        self, tenant_id: str, start: datetime, end: datetime
    ) -> Dict[str, Any]:
        """Get revenue metrics for specific tenant"""
        return {
            "total_revenue": 1500.0,
            "monthly_revenue": 500.0,
            "revenue_growth": 12.5,
            "billing_status": "current",
        }

    async def _get_tenant_user_metrics(
        self, tenant_id: str, start: datetime, end: datetime
    ) -> Dict[str, Any]:
        """Get user metrics for specific tenant"""
        return {
            "total_users": 15,
            "active_users": 12,
            "new_users": 3,
            "user_growth": 8.2,
        }

    async def _get_tenant_machine_metrics(
        self, tenant_id: str, start: datetime, end: datetime
    ) -> Dict[str, Any]:
        """Get machine metrics for specific tenant"""
        return {
            "total_machines": 5,
            "active_machines": 5,
            "avg_uptime": 99.2,
            "maintenance_events": 2,
        }

    async def _get_tenant_support_metrics(
        self, tenant_id: str, start: datetime, end: datetime
    ) -> Dict[str, Any]:
        """Get support metrics for specific tenant"""
        return {
            "open_tickets": 1,
            "resolved_tickets": 4,
            "avg_resolution_time": 1.5,
            "satisfaction_score": 4.8,
        }

    async def _get_tenant_usage_patterns(
        self, tenant_id: str, start: datetime, end: datetime
    ) -> Dict[str, Any]:
        """Get usage patterns for specific tenant"""
        return {
            "peak_hours": [9, 10, 11, 14, 15, 16],
            "avg_daily_usage": 8.5,
            "weekend_usage": 2.3,
            "feature_adoption": {"inventory": 95, "financial": 80, "automation": 60},
        }

    async def _calculate_benchmarks(
        self, tenant_comparisons: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate benchmarks from tenant data"""
        if not tenant_comparisons:
            return {}

        revenues = [t["revenue_metrics"]["total_revenue"] for t in tenant_comparisons]
        uptimes = [t["machine_metrics"]["avg_uptime"] for t in tenant_comparisons]

        return {
            "avg_revenue": statistics.mean(revenues) if revenues else 0,
            "median_revenue": statistics.median(revenues) if revenues else 0,
            "avg_uptime": statistics.mean(uptimes) if uptimes else 0,
            "top_quartile_revenue": (
                sorted(revenues)[-len(revenues) // 4 :] if revenues else []
            ),
        }

    async def _calculate_tenant_rankings(
        self, tenant_comparisons: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Calculate tenant rankings by various metrics"""
        rankings = []

        # Sort by revenue
        by_revenue = sorted(
            tenant_comparisons,
            key=lambda x: x["revenue_metrics"]["total_revenue"],
            reverse=True,
        )

        for i, tenant in enumerate(by_revenue):
            rankings.append(
                {
                    "tenant_id": tenant["tenant_info"]["id"],
                    "tenant_name": tenant["tenant_info"]["name"],
                    "revenue_rank": i + 1,
                    "revenue": tenant["revenue_metrics"]["total_revenue"],
                    "uptime": tenant["machine_metrics"]["avg_uptime"],
                }
            )

        return rankings

    # Export functionality placeholders

    async def _export_to_csv(self, data: Dict[str, Any]) -> bytes:
        """Export data to CSV format"""
        import csv
        import io

        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(["Metric", "Value", "Unit"])

        # Write KPI data
        if "revenue" in data:
            for key, value in data["revenue"].items():
                writer.writerow(
                    [f"Revenue - {key}", value, "USD" if "revenue" in key else ""]
                )

        if "operational" in data:
            for key, value in data["operational"].items():
                writer.writerow([f"Operational - {key}", value, ""])

        return output.getvalue().encode("utf-8")

    async def _export_to_pdf(self, data: Dict[str, Any]) -> bytes:
        """Export data to PDF format (placeholder)"""
        # In production, this would use a PDF library like reportlab
        pdf_content = f"""
        Business Intelligence Report
        Generated: {datetime.now().isoformat()}
        
        Revenue KPIs:
        - Total Revenue: ${data.get('revenue', {}).get('total_revenue', 0):,.2f}
        - MRR: ${data.get('revenue', {}).get('mrr', 0):,.2f}
        
        Operational KPIs:
        - Total Tenants: {data.get('operational', {}).get('total_tenants', 0)}
        - System Uptime: {data.get('operational', {}).get('system_uptime', 0):.2f}%
        """

        return pdf_content.encode("utf-8")
