"""
Stripe Integration Service for COAM SaaS
Temporary version with Stripe stub (no real API calls).
This removes the missing `emergentintegrations` dependency
so your backend can run immediately.
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import Request
from billing_models import *
from billing_service import BillingService


# ------------------------------------------------------------------
# Stripe Stub (simulates basic behavior so backend can run)
# ------------------------------------------------------------------
class StripeCheckout:
    def __init__(self, api_key: str, webhook_url: str):
        self.api_key = api_key
        self.webhook_url = webhook_url
        print("[StripeCheckout Stub] Initialized — no real Stripe API used.")

    async def create_checkout_session(self, request_data):
        print("[StripeCheckout Stub] create_checkout_session called.")
        return type(
            "CheckoutSessionResponse",
            (),
            {"session_id": "stub_session_001", "url": "#"},
        )()

    async def get_checkout_status(self, session_id: str):
        print(f"[StripeCheckout Stub] get_checkout_status({session_id}) called.")
        return type(
            "CheckoutStatusResponse",
            (),
            {
                "payment_status": "paid",
                "status": "complete",
                "amount_total": 1000,
                "currency": "usd",
                "metadata": {},
            },
        )()

    async def handle_webhook(self, body, signature):
        print("[StripeCheckout Stub] handle_webhook called.")
        return type(
            "WebhookResponse",
            (),
            {
                "event_type": "checkout.session.completed",
                "session_id": "stub_session_001",
                "payment_status": "paid",
                "metadata": {},
            },
        )()


class CheckoutSessionResponse:
    def __init__(self, session_id="stub_session", url="#"):
        self.session_id = session_id
        self.url = url


class CheckoutStatusResponse:
    def __init__(
        self,
        status="complete",
        payment_status="paid",
        amount_total=0,
        currency="usd",
        metadata=None,
    ):
        self.status = status
        self.payment_status = payment_status
        self.amount_total = amount_total
        self.currency = currency
        self.metadata = metadata or {}


# ------------------------------------------------------------------
# StripeIntegrationService (works normally, calls stub)
# ------------------------------------------------------------------
logger = logging.getLogger(__name__)


class StripeIntegrationService:
    def __init__(self, billing_service: BillingService):
        self.billing_service = billing_service
        self.stripe_api_key = os.getenv("STRIPE_API_KEY", "sk_test_placeholder")

    def _get_stripe_checkout(self, host_url: str) -> StripeCheckout:
        webhook_url = f"{host_url}/api/webhook/stripe"
        return StripeCheckout(api_key=self.stripe_api_key, webhook_url=webhook_url)

    async def create_subscription_checkout_session(
        self,
        tenant_id: str,
        subscription_id: str,
        host_url: str,
        success_url: str,
        cancel_url: str,
    ):
        try:
            subscription = await self.billing_service.get_subscription(
                tenant_id, subscription_id
            )
            customer = await self.billing_service.get_customer(
                tenant_id, subscription.customer_id
            )
            stripe_checkout = self._get_stripe_checkout(host_url)
            session = await stripe_checkout.create_checkout_session({})
            await self.billing_service.create_payment_transaction(
                tenant_id=tenant_id,
                customer_id=customer.id,
                amount=subscription.total_amount,
                stripe_session_id=session.session_id,
                subscription_id=subscription.id,
            )
            logger.info(
                f"Created checkout session for subscription {subscription_id}: {session.session_id}"
            )
            return session
        except Exception as e:
            logger.error(f"Error creating subscription checkout session: {e}")
            raise

    async def get_checkout_status(self, session_id: str, host_url: str):
        stripe_checkout = self._get_stripe_checkout(host_url)
        status = await stripe_checkout.get_checkout_status(session_id)
        return status

    async def handle_webhook(self, request: Request):
        body = await request.body()
        sig = request.headers.get("Stripe-Signature")
        stripe_checkout = self._get_stripe_checkout(str(request.base_url).rstrip("/"))
        webhook_response = await stripe_checkout.handle_webhook(body, sig)
        logger.info(f"Webhook received: {webhook_response.event_type}")
        return {"status": "success", "event": webhook_response.event_type}


print(
    "[stripe_integration] Stub version loaded — backend ready without real Stripe API."
)
