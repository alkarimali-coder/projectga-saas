"""
Billing Service for COAM SaaS
Handles subscription management, usage tracking, and Stripe integration
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
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

    # Customer Management
    async def create_customer(
        self, tenant_id: str, request: CreateCustomerRequest
    ) -> Customer:
        """Create a new billing customer"""
        try:
            customer = Customer(
                tenant_id=tenant_id,
                email=request.email,
                name=request.name,
                phone=request.phone,
                billing_address=request.billing_address,
                tax_id=request.tax_id,
            )

            await self.db.customers.insert_one(customer.dict())
            logger.info(f"Created customer: {customer.email}")
            return customer
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            raise

    async def get_customer(
        self, tenant_id: str, customer_id: str
    ) -> Optional[Customer]:
        """Get customer by ID"""
        try:
            customer_data = await self.db.customers.find_one(
                {"id": customer_id, "tenant_id": tenant_id}
            )
            return Customer(**customer_data) if customer_data else None
        except Exception as e:
            logger.error(f"Error getting customer: {str(e)}")
            return None

    async def get_customer_by_email(
        self, tenant_id: str, email: str
    ) -> Optional[Customer]:
        """Get customer by email"""
        try:
            customer_data = await self.db.customers.find_one(
                {"email": email, "tenant_id": tenant_id}
            )
            return Customer(**customer_data) if customer_data else None
        except Exception as e:
            logger.error(f"Error getting customer by email: {str(e)}")
            return None

    async def update_customer_stripe_id(
        self, customer_id: str, stripe_customer_id: str
    ):
        """Update customer with Stripe customer ID"""
        try:
            await self.db.customers.update_one(
                {"id": customer_id},
                {
                    "$set": {
                        "stripe_customer_id": stripe_customer_id,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
        except Exception as e:
            logger.error(f"Error updating customer Stripe ID: {str(e)}")

    # Pricing Plan Management
    async def get_pricing_plans(self) -> List[PricingPlan]:
        """Get all active pricing plans"""
        try:
            plans_data = await self.db.pricing_plans.find({"is_active": True}).to_list(
                10
            )
            return [PricingPlan(**plan) for plan in plans_data]
        except Exception as e:
            logger.error(f"Error getting pricing plans: {str(e)}")
            return []

    async def get_pricing_plan(self, plan_id: str) -> Optional[PricingPlan]:
        """Get pricing plan by ID"""
        try:
            plan_data = await self.db.pricing_plans.find_one({"id": plan_id})
            return PricingPlan(**plan_data) if plan_data else None
        except Exception as e:
            logger.error(f"Error getting pricing plan: {str(e)}")
            return None

    # Subscription Management
    async def create_subscription(
        self, tenant_id: str, request: CreateSubscriptionRequest
    ) -> Subscription:
        """Create a new subscription"""
        try:
            # Get pricing plan
            pricing_plan = await self.get_pricing_plan(request.pricing_plan_id)
            if not pricing_plan:
                raise ValueError("Invalid pricing plan")

            # Calculate billing amounts
            machine_amount, user_amount, total_amount = (
                self._calculate_subscription_cost(
                    pricing_plan,
                    request.machine_count,
                    request.user_count,
                    request.billing_interval,
                )
            )

            # Set subscription period
            now = datetime.now(timezone.utc)
            if request.billing_interval == BillingInterval.MONTHLY:
                period_end = now + timedelta(days=30)
            else:
                period_end = now + timedelta(days=365)

            # Add trial period if specified
            trial_end = None
            if request.trial_days:
                trial_end = now + timedelta(days=request.trial_days)
                period_end = trial_end

            subscription = Subscription(
                tenant_id=tenant_id,
                customer_id=request.customer_id,
                pricing_plan_id=request.pricing_plan_id,
                billing_interval=request.billing_interval,
                machine_count=request.machine_count,
                user_count=request.user_count,
                current_period_start=now,
                current_period_end=period_end,
                trial_end=trial_end,
                machine_amount=machine_amount,
                user_amount=user_amount,
                total_amount=total_amount,
                status=(
                    SubscriptionStatus.TRIALING
                    if trial_end
                    else SubscriptionStatus.ACTIVE
                ),
            )

            await self.db.subscriptions.insert_one(subscription.dict())
            logger.info(f"Created subscription for customer: {request.customer_id}")
            return subscription
        except Exception as e:
            logger.error(f"Error creating subscription: {str(e)}")
            raise

    def _calculate_subscription_cost(
        self,
        plan: PricingPlan,
        machine_count: int,
        user_count: int,
        billing_interval: BillingInterval,
    ) -> tuple[float, float, float]:
        """Calculate subscription costs"""
        if billing_interval == BillingInterval.MONTHLY:
            machine_amount = machine_count * plan.price_per_machine_monthly
            user_amount = user_count * plan.price_per_user_monthly
        else:
            machine_amount = machine_count * plan.price_per_machine_yearly
            user_amount = user_count * plan.price_per_user_yearly

        total_amount = machine_amount + user_amount
        return machine_amount, user_amount, total_amount

    async def get_subscription(
        self, tenant_id: str, subscription_id: str
    ) -> Optional[Subscription]:
        """Get subscription by ID"""
        try:
            subscription_data = await self.db.subscriptions.find_one(
                {"id": subscription_id, "tenant_id": tenant_id}
            )
            return Subscription(**subscription_data) if subscription_data else None
        except Exception as e:
            logger.error(f"Error getting subscription: {str(e)}")
            return None

    async def get_customer_subscription(
        self, tenant_id: str, customer_id: str
    ) -> Optional[Subscription]:
        """Get active subscription for customer"""
        try:
            subscription_data = await self.db.subscriptions.find_one(
                {
                    "customer_id": customer_id,
                    "tenant_id": tenant_id,
                    "status": {
                        "$in": [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
                    },
                }
            )
            return Subscription(**subscription_data) if subscription_data else None
        except Exception as e:
            logger.error(f"Error getting customer subscription: {str(e)}")
            return None

    async def update_subscription(
        self, tenant_id: str, subscription_id: str, request: UpdateSubscriptionRequest
    ) -> Optional[Subscription]:
        """Update subscription details"""
        try:
            subscription = await self.get_subscription(tenant_id, subscription_id)
            if not subscription:
                return None

            update_data = {"updated_at": datetime.now(timezone.utc)}

            # Update machine/user counts and recalculate costs
            if request.machine_count is not None or request.user_count is not None:
                machine_count = (
                    request.machine_count
                    if request.machine_count is not None
                    else subscription.machine_count
                )
                user_count = (
                    request.user_count
                    if request.user_count is not None
                    else subscription.user_count
                )

                pricing_plan = await self.get_pricing_plan(subscription.pricing_plan_id)
                if pricing_plan:
                    machine_amount, user_amount, total_amount = (
                        self._calculate_subscription_cost(
                            pricing_plan,
                            machine_count,
                            user_count,
                            subscription.billing_interval,
                        )
                    )

                    update_data.update(
                        {
                            "machine_count": machine_count,
                            "user_count": user_count,
                            "machine_amount": machine_amount,
                            "user_amount": user_amount,
                            "total_amount": total_amount,
                        }
                    )

            # Update pricing plan if requested
            if request.pricing_plan_id:
                update_data["pricing_plan_id"] = request.pricing_plan_id

            # Update billing interval if requested
            if request.billing_interval:
                update_data["billing_interval"] = request.billing_interval

            await self.db.subscriptions.update_one(
                {"id": subscription_id, "tenant_id": tenant_id}, {"$set": update_data}
            )

            # Return updated subscription
            return await self.get_subscription(tenant_id, subscription_id)
        except Exception as e:
            logger.error(f"Error updating subscription: {str(e)}")
            raise

    async def cancel_subscription(self, tenant_id: str, subscription_id: str):
        """Cancel a subscription"""
        try:
            await self.db.subscriptions.update_one(
                {"id": subscription_id, "tenant_id": tenant_id},
                {
                    "$set": {
                        "status": SubscriptionStatus.CANCELED,
                        "canceled_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            logger.info(f"Canceled subscription: {subscription_id}")
        except Exception as e:
            logger.error(f"Error canceling subscription: {str(e)}")
            raise

    # Usage Tracking
    async def record_usage(
        self,
        tenant_id: str,
        subscription_id: str,
        machine_count: int = None,
        user_count: int = None,
        api_calls: int = 0,
        reports_generated: int = 0,
        notifications_sent: int = 0,
    ) -> UsageRecord:
        """Record usage for billing period"""
        try:
            subscription = await self.get_subscription(tenant_id, subscription_id)
            if not subscription:
                raise ValueError("Subscription not found")

            # Get current period usage or create new
            usage_data = await self.db.usage_records.find_one(
                {
                    "tenant_id": tenant_id,
                    "subscription_id": subscription_id,
                    "period_start": {"$lte": datetime.now(timezone.utc)},
                    "period_end": {"$gte": datetime.now(timezone.utc)},
                }
            )

            if usage_data:
                # Update existing usage record
                usage = UsageRecord(**usage_data)
                usage.machine_count = (
                    machine_count if machine_count is not None else usage.machine_count
                )
                usage.user_count = (
                    user_count if user_count is not None else usage.user_count
                )
                usage.api_calls += api_calls
                usage.reports_generated += reports_generated
                usage.notifications_sent += notifications_sent

                await self.db.usage_records.update_one(
                    {"id": usage.id}, {"$set": usage.dict()}
                )
            else:
                # Create new usage record
                usage = UsageRecord(
                    tenant_id=tenant_id,
                    subscription_id=subscription_id,
                    period_start=subscription.current_period_start,
                    period_end=subscription.current_period_end,
                    machine_count=machine_count or subscription.machine_count,
                    user_count=user_count or subscription.user_count,
                    api_calls=api_calls,
                    reports_generated=reports_generated,
                    notifications_sent=notifications_sent,
                )

                await self.db.usage_records.insert_one(usage.dict())

            return usage
        except Exception as e:
            logger.error(f"Error recording usage: {str(e)}")
            raise

    # Invoice Management
    async def create_invoice(self, tenant_id: str, subscription_id: str) -> Invoice:
        """Generate invoice for subscription"""
        try:
            subscription = await self.get_subscription(tenant_id, subscription_id)
            if not subscription:
                raise ValueError("Subscription not found")

            customer = await self.get_customer(tenant_id, subscription.customer_id)
            if not customer:
                raise ValueError("Customer not found")

            # Generate invoice number
            invoice_count = await self.db.invoices.count_documents(
                {"tenant_id": tenant_id}
            )
            invoice_number = (
                f"INV-{datetime.now().strftime('%Y%m')}-{invoice_count + 1:04d}"
            )

            # Create line items
            line_items = []
            subtotal = 0.0

            if subscription.machine_count > 0:
                line_items.append(
                    {
                        "description": f"Machine Subscription ({subscription.machine_count} machines)",
                        "quantity": subscription.machine_count,
                        "unit_price": subscription.machine_amount
                        / subscription.machine_count,
                        "total": subscription.machine_amount,
                    }
                )
                subtotal += subscription.machine_amount

            if subscription.user_count > 0:
                line_items.append(
                    {
                        "description": f"User Subscription ({subscription.user_count} users)",
                        "quantity": subscription.user_count,
                        "unit_price": subscription.user_amount
                        / subscription.user_count,
                        "total": subscription.user_amount,
                    }
                )
                subtotal += subscription.user_amount

            # Calculate tax (simplified - would integrate with tax service)
            tax = subtotal * 0.08  # 8% tax rate (example)
            total = subtotal + tax

            invoice = Invoice(
                tenant_id=tenant_id,
                customer_id=subscription.customer_id,
                subscription_id=subscription_id,
                invoice_number=invoice_number,
                status=InvoiceStatus.OPEN,
                subtotal=subtotal,
                tax=tax,
                total=total,
                amount_due=total,
                line_items=line_items,
                issue_date=datetime.now(timezone.utc),
                due_date=datetime.now(timezone.utc) + timedelta(days=30),
            )

            await self.db.invoices.insert_one(invoice.dict())
            logger.info(f"Created invoice: {invoice.invoice_number}")
            return invoice
        except Exception as e:
            logger.error(f"Error creating invoice: {str(e)}")
            raise

    async def get_customer_invoices(
        self, tenant_id: str, customer_id: str, limit: int = 10
    ) -> List[Invoice]:
        """Get recent invoices for customer"""
        try:
            invoices_data = (
                await self.db.invoices.find(
                    {"tenant_id": tenant_id, "customer_id": customer_id}
                )
                .sort("created_at", -1)
                .limit(limit)
                .to_list(limit)
            )

            return [Invoice(**invoice) for invoice in invoices_data]
        except Exception as e:
            logger.error(f"Error getting customer invoices: {str(e)}")
            return []

    # Payment Transaction Management
    async def create_payment_transaction(
        self,
        tenant_id: str,
        customer_id: str,
        amount: float,
        stripe_session_id: str = None,
        subscription_id: str = None,
        invoice_id: str = None,
        metadata: Dict[str, Any] = None,
    ) -> PaymentTransaction:
        """Create payment transaction record"""
        try:
            transaction = PaymentTransaction(
                tenant_id=tenant_id,
                customer_id=customer_id,
                subscription_id=subscription_id,
                invoice_id=invoice_id,
                stripe_session_id=stripe_session_id,
                amount=amount,
                status=PaymentStatus.PENDING,
                metadata=metadata or {},
            )

            await self.db.payment_transactions.insert_one(transaction.dict())
            logger.info(f"Created payment transaction: {transaction.id}")
            return transaction
        except Exception as e:
            logger.error(f"Error creating payment transaction: {str(e)}")
            raise

    async def update_payment_transaction(
        self,
        transaction_id: str,
        status: PaymentStatus,
        stripe_payment_intent_id: str = None,
        stripe_charge_id: str = None,
        failure_code: str = None,
        failure_message: str = None,
    ):
        """Update payment transaction status"""
        try:
            update_data = {"status": status, "updated_at": datetime.now(timezone.utc)}

            if stripe_payment_intent_id:
                update_data["stripe_payment_intent_id"] = stripe_payment_intent_id
            if stripe_charge_id:
                update_data["stripe_charge_id"] = stripe_charge_id
            if failure_code:
                update_data["failure_code"] = failure_code
            if failure_message:
                update_data["failure_message"] = failure_message

            await self.db.payment_transactions.update_one(
                {"id": transaction_id}, {"$set": update_data}
            )
            logger.info(f"Updated payment transaction: {transaction_id} to {status}")
        except Exception as e:
            logger.error(f"Error updating payment transaction: {str(e)}")
            raise

    async def get_payment_transaction_by_session(
        self, stripe_session_id: str
    ) -> Optional[PaymentTransaction]:
        """Get payment transaction by Stripe session ID"""
        try:
            transaction_data = await self.db.payment_transactions.find_one(
                {"stripe_session_id": stripe_session_id}
            )
            return PaymentTransaction(**transaction_data) if transaction_data else None
        except Exception as e:
            logger.error(f"Error getting payment transaction by session: {str(e)}")
            return None

    # Admin Dashboard and Analytics
    async def get_billing_stats(self, tenant_id: str = None) -> BillingStatsResponse:
        """Get billing statistics for admin dashboard"""
        try:
            # Build query filter
            query = {}
            if tenant_id:
                query["tenant_id"] = tenant_id

            # Get basic counts
            total_customers = await self.db.customers.count_documents(query)
            active_subscriptions = await self.db.subscriptions.count_documents(
                {
                    **query,
                    "status": {
                        "$in": [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
                    },
                }
            )

            # Calculate MRR and ARR
            pipeline = [
                {"$match": {**query, "status": SubscriptionStatus.ACTIVE}},
                {
                    "$group": {
                        "_id": None,
                        "total_monthly": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$billing_interval", "monthly"]},
                                    "$total_amount",
                                    {"$divide": ["$total_amount", 12]},
                                ]
                            }
                        },
                        "machine_revenue": {"$sum": "$machine_amount"},
                        "user_revenue": {"$sum": "$user_amount"},
                    }
                },
            ]

            revenue_data = await self.db.subscriptions.aggregate(pipeline).to_list(1)
            mrr = revenue_data[0]["total_monthly"] if revenue_data else 0.0
            arr = mrr * 12
            machine_revenue = (
                revenue_data[0]["machine_revenue"] if revenue_data else 0.0
            )
            user_revenue = revenue_data[0]["user_revenue"] if revenue_data else 0.0

            # Get new customers this month
            start_of_month = datetime.now(timezone.utc).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            new_customers_this_month = await self.db.customers.count_documents(
                {**query, "created_at": {"$gte": start_of_month}}
            )

            # Payment metrics
            successful_payments = await self.db.payment_transactions.count_documents(
                {**query, "status": PaymentStatus.SUCCEEDED}
            )

            failed_payments = await self.db.payment_transactions.count_documents(
                {**query, "status": PaymentStatus.FAILED}
            )

            overdue_invoices = await self.db.invoices.count_documents(
                {
                    **query,
                    "status": InvoiceStatus.OPEN,
                    "due_date": {"$lt": datetime.now(timezone.utc)},
                }
            )

            return BillingStatsResponse(
                total_customers=total_customers,
                active_subscriptions=active_subscriptions,
                monthly_recurring_revenue=mrr,
                annual_recurring_revenue=arr,
                machine_revenue=machine_revenue,
                user_revenue=user_revenue,
                new_customers_this_month=new_customers_this_month,
                churn_rate=0.0,  # Would calculate based on cancellations
                successful_payments=successful_payments,
                failed_payments=failed_payments,
                overdue_invoices=overdue_invoices,
            )
        except Exception as e:
            logger.error(f"Error getting billing stats: {str(e)}")
            return BillingStatsResponse()

    async def get_billing_dashboard(
        self, tenant_id: str, customer_id: str
    ) -> Optional[BillingDashboardResponse]:
        """Get billing dashboard data for customer"""
        try:
            customer = await self.get_customer(tenant_id, customer_id)
            if not customer:
                return None

            subscription = await self.get_customer_subscription(tenant_id, customer_id)
            recent_invoices = await self.get_customer_invoices(
                tenant_id, customer_id, limit=5
            )

            # Calculate next billing date and days until billing
            next_billing_date = None
            days_until_billing = None
            monthly_cost = 0.0

            if subscription:
                next_billing_date = subscription.current_period_end
                days_until_billing = (
                    next_billing_date - datetime.now(timezone.utc)
                ).days
                monthly_cost = subscription.total_amount

            return BillingDashboardResponse(
                customer=customer,
                subscription=subscription,
                recent_invoices=recent_invoices,
                monthly_cost=monthly_cost,
                next_billing_date=next_billing_date,
                days_until_billing=days_until_billing,
            )
        except Exception as e:
            logger.error(f"Error getting billing dashboard: {str(e)}")
            return None
