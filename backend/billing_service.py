"""
Billing Service for COAM SaaS
Handles subscription management, usage tracking, and Stripe integration
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas import (
    PricingPlan,
    Customer,
    CreateCustomerRequest,
    CreateSubscriptionRequest,
    UpdateSubscriptionRequest,
    Subscription,
    BillingInterval,
    UsageRecord,
    PaymentTransaction,
)
from billing_models import *
import logging
import asyncio
from decimal import Decimal
import calendar

logger = logging.getLogger(__name__)


class BillingService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

        # Default pricing plans
        self.default_plans = [
            {
                "name": "Starter",
                "tier": PricingTier.STARTER,
                "description": "Perfect for small operations with basic features",
                "price_per_machine_monthly": 3.0,
                "price_per_machine_yearly": 30.0,
                "price_per_user_monthly": 25.0,
                "price_per_user_yearly": 250.0,
                "features": {
                    "basic_reporting": True,
                    "advanced_analytics": False,
                    "ai_insights": False,
                    "white_labeling": False,
                    "api_access": False,
                    "priority_support": False,
                    "custom_integrations": False,
                },
            },
            {
                "name": "Growth",
                "tier": PricingTier.GROWTH,
                "description": "For growing businesses with advanced analytics",
                "price_per_machine_monthly": 3.0,
                "price_per_machine_yearly": 30.0,
                "price_per_user_monthly": 25.0,
                "price_per_user_yearly": 250.0,
                "features": {
                    "basic_reporting": True,
                    "advanced_analytics": True,
                    "ai_insights": True,
                    "white_labeling": False,
                    "api_access": True,
                    "priority_support": True,
                    "custom_integrations": False,
                },
            },
            {
                "name": "Enterprise",
                "tier": PricingTier.ENTERPRISE,
                "description": "Full-featured solution for large organizations",
                "price_per_machine_monthly": 3.0,
                "price_per_machine_yearly": 30.0,
                "price_per_user_monthly": 25.0,
                "price_per_user_yearly": 250.0,
                "features": {
                    "basic_reporting": True,
                    "advanced_analytics": True,
                    "ai_insights": True,
                    "white_labeling": True,
                    "api_access": True,
                    "priority_support": True,
                    "custom_integrations": True,
                },
            },
        ]

    async def initialize_default_plans(self):
        """Initialize default pricing plans if they don't exist"""
        try:
            for plan_data in self.default_plans:
                existing_plan = await self.db.pricing_plans.find_one(
                    {"tier": plan_data["tier"]}
                )
                if not existing_plan:
                    plan = PricingPlan(**plan_data)
                    await self.db.pricing_plans.insert_one(plan.dict())
                    logger.info(f"Created default pricing plan: {plan.name}")
        except Exception as e:
            logger.error(f"Error initializing default plans: {str(e)}")

    # --- Remaining methods ---
    # (Everything below here in your original file is correct.)
    # Do not change anything from `async def create_customer` onward.
