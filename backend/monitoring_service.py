"""
System Health Monitoring Service
Handles collection, storage, and analysis of system metrics including:
- API uptime and availability
- Response times for endpoints
- Error counts and failure rates
- System performance indicators
"""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import statistics
import json
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)


@dataclass
class MetricPoint:
    """Single metric data point"""

    timestamp: datetime
    endpoint: str
    method: str
    status_code: int
    response_time_ms: float
    user_id: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class SystemHealth:
    """Current system health status"""

    overall_status: str  # healthy, warning, critical
    uptime_percentage: float
    avg_response_time_ms: float
    error_rate_percentage: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    services_status: Dict[str, str]
    last_updated: datetime


@dataclass
class MetricsSnapshot:
    """Historical metrics for specific time period"""

    period_start: datetime
    period_end: datetime
    total_requests: int
    avg_response_time_ms: float
    error_rate_percentage: float
    uptime_percentage: float
    top_endpoints: List[Dict[str, Any]]
    error_breakdown: Dict[str, int]


class MonitoringService:
    """Service for system health monitoring and metrics collection"""

    def __init__(self, db_client: AsyncIOMotorClient):
        self.db = db_client
        self.metrics_collection = self.db.coam_db.system_metrics
        self.health_collection = self.db.coam_db.system_health
        self.service_start_time = datetime.now(timezone.utc)

        # Alert thresholds
        self.ERROR_RATE_WARNING = 5.0  # 5%
        self.ERROR_RATE_CRITICAL = 10.0  # 10%
        self.RESPONSE_TIME_WARNING = 2000.0  # 2 seconds
        self.UPTIME_CRITICAL_MINUTES = 1  # 1 minute downtime

    async def initialize_indexes(self):
        """Create database indexes for performance"""
        try:
            # Metrics collection indexes
            await self.metrics_collection.create_index(
                [("timestamp", -1), ("endpoint", 1)]
            )
            await self.metrics_collection.create_index("timestamp")
            await self.metrics_collection.create_index("endpoint")
            await self.metrics_collection.create_index("status_code")

            # Health collection indexes
            await self.health_collection.create_index("last_updated")

            logger.info("✅ Monitoring service indexes created successfully")
        except Exception as e:
            logger.error(f"❌ Failed to create monitoring indexes: {e}")

    async def record_request_metric(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: float,
        user_id: Optional[str] = None,
        error_message: Optional[str] = None,
    ):
        """Record a single API request metric"""
        try:
            metric = MetricPoint(
                timestamp=datetime.now(timezone.utc),
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                response_time_ms=response_time_ms,
                user_id=user_id,
                error_message=error_message,
            )

            # Store in database
            metric_doc = {
                "timestamp": metric.timestamp,
                "endpoint": metric.endpoint,
                "method": metric.method,
                "status_code": metric.status_code,
                "response_time_ms": metric.response_time_ms,
                "user_id": metric.user_id,
                "error_message": metric.error_message,
                "date": metric.timestamp.date().isoformat(),
            }

            await self.metrics_collection.insert_one(metric_doc)

        except Exception as e:
            logger.error(f"Failed to record request metric: {e}")

    async def get_current_health_status(self) -> SystemHealth:
        """Get real-time system health status"""
        try:
            now = datetime.now(timezone.utc)
            last_hour = now - timedelta(hours=1)

            # Get recent metrics
            recent_metrics = await self.metrics_collection.find(
                {"timestamp": {"$gte": last_hour}}
            ).to_list(None)

            if not recent_metrics:
                # No recent data - system might be starting up
                return SystemHealth(
                    overall_status="healthy",
                    uptime_percentage=100.0,
                    avg_response_time_ms=0.0,
                    error_rate_percentage=0.0,
                    total_requests=0,
                    successful_requests=0,
                    failed_requests=0,
                    services_status={
                        "api": "healthy",
                        "database": "healthy",
                        "monitoring": "healthy",
                    },
                    last_updated=now,
                )

            # Calculate metrics
            total_requests = len(recent_metrics)
            successful_requests = len(
                [m for m in recent_metrics if m["status_code"] < 400]
            )
            failed_requests = total_requests - successful_requests

            error_rate = (
                (failed_requests / total_requests) * 100 if total_requests > 0 else 0
            )
            avg_response_time = statistics.mean(
                [m["response_time_ms"] for m in recent_metrics]
            )

            # Calculate uptime (assuming service has been running)
            uptime_hours = min(
                1.0,
                (now - max(self.service_start_time, last_hour)).total_seconds() / 3600,
            )
            uptime_percentage = uptime_hours * 100

            # Determine overall status
            overall_status = "healthy"
            if (
                error_rate >= self.ERROR_RATE_CRITICAL
                or avg_response_time >= self.RESPONSE_TIME_WARNING
            ):
                overall_status = "critical"
            elif error_rate >= self.ERROR_RATE_WARNING:
                overall_status = "warning"

            # Service status checks
            services_status = await self._check_services_status()

            health = SystemHealth(
                overall_status=overall_status,
                uptime_percentage=uptime_percentage,
                avg_response_time_ms=avg_response_time,
                error_rate_percentage=error_rate,
                total_requests=total_requests,
                successful_requests=successful_requests,
                failed_requests=failed_requests,
                services_status=services_status,
                last_updated=now,
            )

            # Store health snapshot
            await self._store_health_snapshot(health)

            return health

        except Exception as e:
            logger.error(f"Failed to get health status: {e}")
            return SystemHealth(
                overall_status="critical",
                uptime_percentage=0.0,
                avg_response_time_ms=0.0,
                error_rate_percentage=100.0,
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                services_status={"monitoring": "error"},
                last_updated=datetime.now(timezone.utc),
            )

    async def get_historical_metrics(self, period: str) -> MetricsSnapshot:
        """Get historical metrics for specified period (1h, 24h, 7d)"""
        try:
            now = datetime.now(timezone.utc)

            # Determine time range
            if period == "1h":
                start_time = now - timedelta(hours=1)
            elif period == "24h":
                start_time = now - timedelta(hours=24)
            elif period == "7d":
                start_time = now - timedelta(days=7)
            else:
                raise ValueError(f"Invalid period: {period}")

            # Get metrics for period
            metrics = await self.metrics_collection.find(
                {"timestamp": {"$gte": start_time, "$lte": now}}
            ).to_list(None)

            if not metrics:
                return MetricsSnapshot(
                    period_start=start_time,
                    period_end=now,
                    total_requests=0,
                    avg_response_time_ms=0.0,
                    error_rate_percentage=0.0,
                    uptime_percentage=100.0,
                    top_endpoints=[],
                    error_breakdown={},
                )

            # Calculate aggregated metrics
            total_requests = len(metrics)
            failed_requests = len([m for m in metrics if m["status_code"] >= 400])
            error_rate = (failed_requests / total_requests) * 100
            avg_response_time = statistics.mean(
                [m["response_time_ms"] for m in metrics]
            )

            # Top endpoints by request count
            endpoint_counts = {}
            for metric in metrics:
                endpoint = metric["endpoint"]
                if endpoint not in endpoint_counts:
                    endpoint_counts[endpoint] = {
                        "endpoint": endpoint,
                        "count": 0,
                        "avg_response_time": 0,
                        "error_rate": 0,
                    }
                endpoint_counts[endpoint]["count"] += 1

            # Calculate per-endpoint metrics
            for endpoint, data in endpoint_counts.items():
                endpoint_metrics = [m for m in metrics if m["endpoint"] == endpoint]
                data["avg_response_time"] = statistics.mean(
                    [m["response_time_ms"] for m in endpoint_metrics]
                )
                endpoint_errors = len(
                    [m for m in endpoint_metrics if m["status_code"] >= 400]
                )
                data["error_rate"] = (endpoint_errors / len(endpoint_metrics)) * 100

            top_endpoints = sorted(
                endpoint_counts.values(), key=lambda x: x["count"], reverse=True
            )[:10]

            # Error breakdown by status code
            error_breakdown = {}
            for metric in metrics:
                if metric["status_code"] >= 400:
                    code = str(metric["status_code"])
                    error_breakdown[code] = error_breakdown.get(code, 0) + 1

            # Calculate uptime (simplified - based on request frequency)
            expected_requests_per_hour = 60  # Assume 1 request per minute as baseline
            period_hours = (now - start_time).total_seconds() / 3600
            expected_requests = expected_requests_per_hour * period_hours
            uptime_percentage = min(
                100.0, (total_requests / max(expected_requests, 1)) * 100
            )

            return MetricsSnapshot(
                period_start=start_time,
                period_end=now,
                total_requests=total_requests,
                avg_response_time_ms=avg_response_time,
                error_rate_percentage=error_rate,
                uptime_percentage=uptime_percentage,
                top_endpoints=top_endpoints,
                error_breakdown=error_breakdown,
            )

        except Exception as e:
            logger.error(f"Failed to get historical metrics: {e}")
            return MetricsSnapshot(
                period_start=datetime.now(timezone.utc),
                period_end=datetime.now(timezone.utc),
                total_requests=0,
                avg_response_time_ms=0.0,
                error_rate_percentage=100.0,
                uptime_percentage=0.0,
                top_endpoints=[],
                error_breakdown={"error": 1},
            )

    async def get_uptime_stats(self) -> Dict[str, Any]:
        """Get detailed uptime statistics"""
        try:
            now = datetime.now(timezone.utc)

            # Get uptime for different periods
            periods = {
                "current_session": self.service_start_time,
                "last_24h": now - timedelta(hours=24),
                "last_7d": now - timedelta(days=7),
                "last_30d": now - timedelta(days=30),
            }

            uptime_stats = {}

            for period_name, start_time in periods.items():
                if period_name == "current_session":
                    # Current session uptime
                    session_duration = (now - start_time).total_seconds()
                    uptime_stats[period_name] = {
                        "uptime_percentage": 100.0,  # Assume 100% for running session
                        "duration_seconds": session_duration,
                        "duration_human": self._format_duration(session_duration),
                        "start_time": start_time.isoformat(),
                    }
                else:
                    # Historical uptime based on metrics availability
                    metrics_count = await self.metrics_collection.count_documents(
                        {"timestamp": {"$gte": start_time}}
                    )

                    period_duration = (now - start_time).total_seconds()
                    expected_metrics = (
                        period_duration / 60
                    )  # Assume 1 request per minute baseline
                    uptime_percentage = min(
                        100.0, (metrics_count / max(expected_metrics, 1)) * 100
                    )

                    uptime_stats[period_name] = {
                        "uptime_percentage": uptime_percentage,
                        "duration_seconds": period_duration,
                        "duration_human": self._format_duration(period_duration),
                        "metrics_recorded": metrics_count,
                    }

            # Get recent downtime events (periods of no requests > 5 minutes)
            downtime_events = await self._detect_downtime_events()

            return {
                "service_start_time": self.service_start_time.isoformat(),
                "current_time": now.isoformat(),
                "uptime_by_period": uptime_stats,
                "recent_downtime_events": downtime_events,
                "next_health_check": (now + timedelta(minutes=5)).isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to get uptime stats: {e}")
            return {
                "error": "Failed to calculate uptime statistics",
                "service_start_time": self.service_start_time.isoformat(),
                "current_time": datetime.now(timezone.utc).isoformat(),
            }

    async def _check_services_status(self) -> Dict[str, str]:
        """Check status of various system services"""
        services = {}

        try:
            # Database connectivity check
            await self.db.admin.command("ping")
            services["database"] = "healthy"
        except:
            services["database"] = "error"

        # API service (always healthy if this code is running)
        services["api"] = "healthy"

        # Monitoring service
        services["monitoring"] = "healthy"

        return services

    async def _store_health_snapshot(self, health: SystemHealth):
        """Store health snapshot for historical tracking"""
        try:
            health_doc = {
                "timestamp": health.last_updated,
                "overall_status": health.overall_status,
                "uptime_percentage": health.uptime_percentage,
                "avg_response_time_ms": health.avg_response_time_ms,
                "error_rate_percentage": health.error_rate_percentage,
                "total_requests": health.total_requests,
                "successful_requests": health.successful_requests,
                "failed_requests": health.failed_requests,
                "services_status": health.services_status,
            }

            await self.health_collection.insert_one(health_doc)

            # Clean up old health snapshots (keep only last 30 days)
            cutoff = datetime.now(timezone.utc) - timedelta(days=30)
            await self.health_collection.delete_many({"timestamp": {"$lt": cutoff}})

        except Exception as e:
            logger.error(f"Failed to store health snapshot: {e}")

    async def _detect_downtime_events(self) -> List[Dict[str, Any]]:
        """Detect recent downtime events (gaps in metrics > 5 minutes)"""
        try:
            # Get last 24 hours of metrics, sorted by time
            last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
            metrics = (
                await self.metrics_collection.find({"timestamp": {"$gte": last_24h}})
                .sort("timestamp", 1)
                .to_list(None)
            )

            downtime_events = []

            if len(metrics) < 2:
                return downtime_events

            # Look for gaps > 5 minutes between consecutive requests
            for i in range(1, len(metrics)):
                prev_time = metrics[i - 1]["timestamp"]
                curr_time = metrics[i]["timestamp"]
                gap_minutes = (curr_time - prev_time).total_seconds() / 60

                if gap_minutes > 5:  # 5 minute gap indicates potential downtime
                    downtime_events.append(
                        {
                            "start_time": prev_time.isoformat(),
                            "end_time": curr_time.isoformat(),
                            "duration_minutes": gap_minutes,
                            "duration_human": self._format_duration(gap_minutes * 60),
                        }
                    )

            return downtime_events[-10:]  # Return last 10 events

        except Exception as e:
            logger.error(f"Failed to detect downtime events: {e}")
            return []

    def _format_duration(self, seconds: float) -> str:
        """Format duration in seconds to human readable string"""
        if seconds < 60:
            return f"{seconds:.1f} seconds"
        elif seconds < 3600:
            minutes = seconds / 60
            return f"{minutes:.1f} minutes"
        elif seconds < 86400:
            hours = seconds / 3600
            return f"{hours:.1f} hours"
        else:
            days = seconds / 86400
            return f"{days:.1f} days"

    async def cleanup_old_metrics(self):
        """Clean up metrics older than 30 days"""
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(days=30)
            result = await self.metrics_collection.delete_many(
                {"timestamp": {"$lt": cutoff}}
            )
            logger.info(f"Cleaned up {result.deleted_count} old metrics")
        except Exception as e:
            logger.error(f"Failed to cleanup old metrics: {e}")
