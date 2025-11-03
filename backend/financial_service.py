from datetime import datetime, timezone, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from financial_models import *
import uuid
import asyncio
import re
import json
from decimal import Decimal, ROUND_HALF_UP
import io
import base64
from PIL import Image
import pytesseract


class FinancialService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def process_revenue_collection(
        self,
        tenant_id: str,
        collection_data: RevenueCollectionRequest,
        collected_by: str,
    ) -> Dict[str, Any]:
        """Process revenue collection with automatic commission calculation"""
        try:
            # Get machine and location details
            machine = await self.db.machines.find_one(
                {"id": collection_data.machine_id, "tenant_id": tenant_id}
            )

            if not machine:
                raise ValueError("Machine not found")

            location = await self.db.locations.find_one(
                {"id": machine["location_id"], "tenant_id": tenant_id}
            )

            if not location:
                raise ValueError("Location not found")

            # Get commission rates (from contract or default)
            contract = await self.db.contracts.find_one(
                {
                    "location_id": location["id"],
                    "tenant_id": tenant_id,
                    "is_active": True,
                }
            )

            location_commission_rate = (
                contract.get("revenue_split", 0.30) if contract else 0.30
            )  # Default 30%

            # Calculate commission split
            gross_revenue = collection_data.gross_amount
            location_share = gross_revenue * location_commission_rate
            ml_share = gross_revenue - location_share

            # Create revenue entry
            revenue_entry = RevenueEntry(
                tenant_id=tenant_id,
                machine_id=collection_data.machine_id,
                location_id=location["id"],
                gross_revenue=gross_revenue,
                net_revenue=ml_share,
                ml_share=ml_share,
                location_share=location_share,
                collection_date=collection_data.collection_date,
                collection_method=collection_data.collection_method,
                collected_by=collected_by,
                revenue_breakdown={RevenueSource.MACHINE_PLAY: gross_revenue},
            )

            await self.db.revenue_entries.insert_one(revenue_entry.dict())

            # Create financial transactions
            transactions = []

            # Revenue transaction
            revenue_transaction = FinancialTransaction(
                tenant_id=tenant_id,
                transaction_type=TransactionType.REVENUE,
                reference_id=collection_data.machine_id,
                reference_type="machine",
                amount=gross_revenue,
                description=f"Revenue collection from {machine.get('model', machine.get('serial_number', 'Unknown Machine'))}",
                machine_id=collection_data.machine_id,
                location_id=location["id"],
                user_id=collected_by,
                revenue_source=RevenueSource.MACHINE_PLAY,
                collection_date=datetime.combine(
                    collection_data.collection_date,
                    datetime.min.time().replace(tzinfo=timezone.utc),
                ),
                notes=collection_data.notes,
                created_by=collected_by,
            )
            transactions.append(revenue_transaction)

            # Location commission transaction
            if location_share > 0:
                commission_transaction = FinancialTransaction(
                    tenant_id=tenant_id,
                    transaction_type=TransactionType.COMMISSION,
                    reference_id=location["id"],
                    reference_type="location",
                    amount=location_share,
                    description=f"Location commission for {location['name']}",
                    machine_id=collection_data.machine_id,
                    location_id=location["id"],
                    commission_type=CommissionType.LOCATION_SHARE,
                    commission_rate=location_commission_rate,
                    base_amount=gross_revenue,
                    created_by=collected_by,
                )
                transactions.append(commission_transaction)

            # Insert all transactions
            for transaction in transactions:
                await self.db.financial_transactions.insert_one(transaction.dict())

            return {
                "revenue_entry_id": revenue_entry.id,
                "gross_revenue": gross_revenue,
                "ml_share": ml_share,
                "location_share": location_share,
                "commission_rate": location_commission_rate,
                "transaction_ids": [t.id for t in transactions],
            }

        except Exception as e:
            raise Exception(f"Revenue collection processing failed: {str(e)}")

    async def process_expense_with_ocr(
        self,
        tenant_id: str,
        expense_data: ExpenseSubmissionRequest,
        submitted_by: str,
        invoice_file_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process expense submission with OCR invoice processing"""
        ocr_result = None

        # Process OCR if invoice file provided
        if invoice_file_path:
            try:
                ocr_result = await self.process_invoice_ocr(
                    tenant_id, invoice_file_path, submitted_by
                )

                # Use OCR data to enhance expense entry if confidence is high
                if ocr_result.confidence_score > 0.7:
                    if (
                        ocr_result.total_amount
                        and abs(ocr_result.total_amount - expense_data.amount)
                        > expense_data.amount * 0.1
                    ):
                        # Flag for review if amounts differ by more than 10%
                        pass

                    # Update expense with OCR data
                    expense_data.amount = ocr_result.total_amount or expense_data.amount

            except Exception as e:
                print(f"OCR processing failed: {str(e)}")
                # Continue without OCR data

        # Create expense entry
        expense_entry = ExpenseEntry(
            tenant_id=tenant_id,
            amount=expense_data.amount,
            category=expense_data.category,
            description=expense_data.description,
            machine_id=expense_data.machine_id,
            location_id=expense_data.location_id,
            job_id=expense_data.job_id,
            invoice_number=ocr_result.invoice_number if ocr_result else None,
            invoice_date=ocr_result.invoice_date if ocr_result else None,
            ocr_confidence=ocr_result.confidence_score if ocr_result else None,
            ocr_raw_text=ocr_result.raw_text if ocr_result else None,
            ocr_structured_data=ocr_result.__dict__ if ocr_result else None,
            receipt_files=[invoice_file_path] if invoice_file_path else [],
            requires_approval=expense_data.amount
            > 500.0,  # Require approval for expenses > $500
            created_by=submitted_by,
        )

        await self.db.expense_entries.insert_one(expense_entry.dict())

        # Create financial transaction
        transaction = FinancialTransaction(
            tenant_id=tenant_id,
            transaction_type=TransactionType.EXPENSE,
            reference_id=expense_data.job_id or expense_data.machine_id,
            reference_type="job" if expense_data.job_id else "machine",
            amount=expense_data.amount,
            description=expense_data.description,
            category=expense_data.category.value,
            machine_id=expense_data.machine_id,
            location_id=expense_data.location_id,
            expense_category=expense_data.category,
            invoice_number=ocr_result.invoice_number if ocr_result else None,
            invoice_date=ocr_result.invoice_date if ocr_result else None,
            ocr_data=ocr_result.__dict__ if ocr_result else None,
            file_attachments=[invoice_file_path] if invoice_file_path else [],
            created_by=submitted_by,
        )

        await self.db.financial_transactions.insert_one(transaction.dict())

        return {
            "expense_entry_id": expense_entry.id,
            "transaction_id": transaction.id,
            "ocr_processed": ocr_result is not None,
            "requires_approval": expense_entry.requires_approval,
            "ocr_confidence": ocr_result.confidence_score if ocr_result else None,
        }

    async def process_invoice_ocr(
        self, tenant_id: str, file_path: str, processed_by: str
    ) -> InvoiceOCR:
        """Process invoice image using OCR to extract structured data"""
        try:
            # Load and preprocess image
            with Image.open(file_path) as image:
                # Convert to grayscale for better OCR
                if image.mode != "L":
                    image = image.convert("L")

                # Use pytesseract for OCR
                start_time = datetime.now()
                raw_text = pytesseract.image_to_string(image, config="--psm 6")
                processing_time = (datetime.now() - start_time).total_seconds() * 1000

                # Calculate confidence score (simplified)
                confidence_data = pytesseract.image_to_data(
                    image, output_type=pytesseract.Output.DICT
                )
                confidences = [
                    int(conf) for conf in confidence_data["conf"] if int(conf) > 0
                ]
                avg_confidence = (
                    sum(confidences) / len(confidences) if confidences else 0
                )
                confidence_score = avg_confidence / 100.0

                # Extract structured data using regex patterns
                extracted_data = self._extract_invoice_data(raw_text)

                # Create OCR result
                ocr_result = InvoiceOCR(
                    tenant_id=tenant_id,
                    file_path=file_path,
                    file_name=file_path.split("/")[-1],
                    file_size=image.size[0] * image.size[1],  # Simplified size calc
                    raw_text=raw_text,
                    confidence_score=confidence_score,
                    processing_time_ms=int(processing_time),
                    vendor_name=extracted_data.get("vendor_name"),
                    invoice_number=extracted_data.get("invoice_number"),
                    invoice_date=extracted_data.get("invoice_date"),
                    due_date=extracted_data.get("due_date"),
                    total_amount=extracted_data.get("total_amount"),
                    tax_amount=extracted_data.get("tax_amount"),
                    line_items=extracted_data.get("line_items", []),
                    processed_by=processed_by,
                )

                # Save OCR result
                await self.db.invoice_ocr.insert_one(ocr_result.dict())

                return ocr_result

        except Exception as e:
            raise Exception(f"OCR processing failed: {str(e)}")

    def _extract_invoice_data(self, text: str) -> Dict[str, Any]:
        """Extract structured data from OCR text using regex patterns"""
        data = {}

        # Common patterns for invoice data extraction
        patterns = {
            "total_amount": [
                r"total[:\s]*\$?([0-9,]+\.?[0-9]*)",
                r"amount[:\s]*\$?([0-9,]+\.?[0-9]*)",
                r"balance[:\s]*\$?([0-9,]+\.?[0-9]*)",
            ],
            "invoice_number": [
                r"invoice\s*#?[:\s]*([A-Z0-9-]+)",
                r"inv\s*#?[:\s]*([A-Z0-9-]+)",
                r"#([A-Z0-9-]{4,})",
            ],
            "date": [
                r"date[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})",
                r"([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})",
            ],
            "vendor_name": [
                r"^([A-Z][A-Za-z\s&,\.]{10,50})",  # Company name at start
                r"from[:\s]*([A-Za-z\s&,\.]{5,30})",
            ],
        }

        text_upper = text.upper()

        # Extract total amount
        for pattern in patterns["total_amount"]:
            match = re.search(pattern, text_upper, re.IGNORECASE)
            if match:
                try:
                    amount_str = match.group(1).replace(",", "")
                    data["total_amount"] = float(amount_str)
                    break
                except ValueError:
                    continue

        # Extract invoice number
        for pattern in patterns["invoice_number"]:
            match = re.search(pattern, text_upper, re.IGNORECASE)
            if match:
                data["invoice_number"] = match.group(1)
                break

        # Extract date
        for pattern in patterns["date"]:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    date_str = match.group(1)
                    # Try to parse date (simplified)
                    from dateutil import parser

                    parsed_date = parser.parse(date_str)
                    data["invoice_date"] = parsed_date.date()
                    break
                except:
                    continue

        # Extract vendor name (first line often contains vendor name)
        lines = text.split("\n")
        for line in lines[:5]:  # Check first 5 lines
            line = line.strip()
            if len(line) > 10 and not re.match(r"^[0-9\/\-\s]+$", line):
                data["vendor_name"] = line
                break

        return data

    async def calculate_asset_performance(
        self, tenant_id: str, period_start: date, period_end: date
    ) -> List[AssetPerformance]:
        """Calculate performance metrics for all assets"""
        # Get all machines for tenant
        assets = await self.db.machines.find({"tenant_id": tenant_id}).to_list(
            length=None
        )

        performance_data = []

        for asset in assets:
            # Get revenue for this asset
            revenue_data = await self.db.financial_transactions.find(
                {
                    "tenant_id": tenant_id,
                    "machine_id": asset["id"],
                    "transaction_type": TransactionType.REVENUE.value,
                    "collection_date": {
                        "$gte": datetime.combine(
                            period_start,
                            datetime.min.time().replace(tzinfo=timezone.utc),
                        ),
                        "$lte": datetime.combine(
                            period_end, datetime.max.time().replace(tzinfo=timezone.utc)
                        ),
                    },
                }
            ).to_list(length=None)

            total_revenue = sum(t["amount"] for t in revenue_data)

            # Get expenses for this asset
            expense_data = await self.db.financial_transactions.find(
                {
                    "tenant_id": tenant_id,
                    "machine_id": asset["id"],
                    "transaction_type": TransactionType.EXPENSE.value,
                    "created_at": {
                        "$gte": datetime.combine(
                            period_start,
                            datetime.min.time().replace(tzinfo=timezone.utc),
                        ),
                        "$lte": datetime.combine(
                            period_end, datetime.max.time().replace(tzinfo=timezone.utc)
                        ),
                    },
                }
            ).to_list(length=None)

            total_expenses = sum(t["amount"] for t in expense_data)
            net_profit = total_revenue - total_expenses

            # Calculate ROI
            purchase_cost = asset.get("purchase_cost", 0)
            roi_percentage = (
                (net_profit / purchase_cost * 100) if purchase_cost > 0 else 0
            )

            # Get location info
            location = await self.db.locations.find_one({"id": asset["location_id"]})

            # Calculate revenue per day
            days = (period_end - period_start).days + 1
            revenue_per_day = total_revenue / days if days > 0 else 0

            # Determine performance category
            # This would be enhanced with more sophisticated analytics
            if roi_percentage > 20:
                performance_category = "top"
            elif roi_percentage > 10:
                performance_category = "average"
            else:
                performance_category = "underperforming"

            # Generate optimization suggestions
            suggestions = []
            if revenue_per_day < 50:
                suggestions.append("Consider relocating to higher-traffic area")
            if total_expenses > total_revenue * 0.3:
                suggestions.append(
                    "Review maintenance costs - expenses are high relative to revenue"
                )
            if roi_percentage < 5:
                suggestions.append("Consider replacement or major refurbishment")

            performance = AssetPerformance(
                asset_id=asset["id"],
                asset_name=asset.get("model", "Unknown Machine"),
                coam_id=asset.get("qr_code", asset["serial_number"]),
                location_id=asset["location_id"],
                location_name=location["name"] if location else "Unknown",
                total_revenue=total_revenue,
                total_expenses=total_expenses,
                net_profit=net_profit,
                roi_percentage=roi_percentage,
                uptime_percentage=95.0,  # Would come from operational data
                service_frequency=0.5,  # Would come from service records
                age_months=12,  # Would be calculated from purchase date
                revenue_per_day=revenue_per_day,
                revenue_trend="stable",  # Would be calculated from historical data
                performance_rank=1,  # Would be calculated relative to other assets
                performance_category=performance_category,
                predicted_monthly_revenue=revenue_per_day * 30,
                replacement_recommendation=(
                    "continue" if roi_percentage > 10 else "evaluate"
                ),
                optimization_suggestions=suggestions,
                period_start=period_start,
                period_end=period_end,
            )

            performance_data.append(performance)

        # Sort by ROI and assign ranks
        performance_data.sort(key=lambda x: x.roi_percentage, reverse=True)
        for i, perf in enumerate(performance_data):
            perf.performance_rank = i + 1

        return performance_data

    async def generate_profit_loss_statement(
        self, tenant_id: str, period_start: date, period_end: date, generated_by: str
    ) -> ProfitLossStatement:
        """Generate comprehensive P&L statement"""

        # Get all revenue for period
        revenue_transactions = await self.db.financial_transactions.find(
            {
                "tenant_id": tenant_id,
                "transaction_type": TransactionType.REVENUE.value,
                "collection_date": {
                    "$gte": datetime.combine(
                        period_start, datetime.min.time().replace(tzinfo=timezone.utc)
                    ),
                    "$lte": datetime.combine(
                        period_end, datetime.max.time().replace(tzinfo=timezone.utc)
                    ),
                },
            }
        ).to_list(length=None)

        gross_revenue = sum(t["amount"] for t in revenue_transactions)

        # Revenue breakdown by source
        revenue_by_source = {}
        for transaction in revenue_transactions:
            source = transaction.get("revenue_source", "other")
            revenue_by_source[source] = (
                revenue_by_source.get(source, 0) + transaction["amount"]
            )

        # Revenue by location and machine
        revenue_by_location = {}
        revenue_by_machine = {}
        for transaction in revenue_transactions:
            if transaction.get("location_id"):
                loc_id = transaction["location_id"]
                revenue_by_location[loc_id] = (
                    revenue_by_location.get(loc_id, 0) + transaction["amount"]
                )

            if transaction.get("machine_id"):
                machine_id = transaction["machine_id"]
                revenue_by_machine[machine_id] = (
                    revenue_by_machine.get(machine_id, 0) + transaction["amount"]
                )

        # Get all expenses for period
        expense_transactions = await self.db.financial_transactions.find(
            {
                "tenant_id": tenant_id,
                "transaction_type": TransactionType.EXPENSE.value,
                "created_at": {
                    "$gte": datetime.combine(
                        period_start, datetime.min.time().replace(tzinfo=timezone.utc)
                    ),
                    "$lte": datetime.combine(
                        period_end, datetime.max.time().replace(tzinfo=timezone.utc)
                    ),
                },
            }
        ).to_list(length=None)

        total_expenses = sum(t["amount"] for t in expense_transactions)

        # Expenses by category
        expenses_by_category = {}
        for transaction in expense_transactions:
            category = transaction.get("expense_category", "other")
            expenses_by_category[category] = (
                expenses_by_category.get(category, 0) + transaction["amount"]
            )

        # Get commission payments
        commission_transactions = await self.db.financial_transactions.find(
            {
                "tenant_id": tenant_id,
                "transaction_type": TransactionType.COMMISSION.value,
                "created_at": {
                    "$gte": datetime.combine(
                        period_start, datetime.min.time().replace(tzinfo=timezone.utc)
                    ),
                    "$lte": datetime.combine(
                        period_end, datetime.max.time().replace(tzinfo=timezone.utc)
                    ),
                },
            }
        ).to_list(length=None)

        total_commissions = sum(t["amount"] for t in commission_transactions)

        # Commissions by type
        commissions_by_type = {}
        for transaction in commission_transactions:
            comm_type = transaction.get("commission_type", "other")
            commissions_by_type[comm_type] = (
                commissions_by_type.get(comm_type, 0) + transaction["amount"]
            )

        # Calculate metrics
        gross_profit = gross_revenue - total_commissions
        net_profit = gross_profit - total_expenses
        gross_margin = (gross_profit / gross_revenue * 100) if gross_revenue > 0 else 0
        net_margin = (net_profit / gross_revenue * 100) if gross_revenue > 0 else 0

        # Find top performers
        top_machine = (
            max(revenue_by_machine.items(), key=lambda x: x[1])[0]
            if revenue_by_machine
            else None
        )
        top_location = (
            max(revenue_by_location.items(), key=lambda x: x[1])[0]
            if revenue_by_location
            else None
        )
        highest_expense = (
            max(expenses_by_category.items(), key=lambda x: x[1])[0]
            if expenses_by_category
            else None
        )

        # Determine period type
        days = (period_end - period_start).days + 1
        if days <= 1:
            period_type = "daily"
        elif days <= 7:
            period_type = "weekly"
        elif days <= 31:
            period_type = "monthly"
        elif days <= 92:
            period_type = "quarterly"
        else:
            period_type = "yearly"

        pnl = ProfitLossStatement(
            tenant_id=tenant_id,
            period_start=period_start,
            period_end=period_end,
            period_type=period_type,
            gross_revenue=gross_revenue,
            revenue_by_source=revenue_by_source,
            revenue_by_location=revenue_by_location,
            revenue_by_machine=revenue_by_machine,
            total_expenses=total_expenses,
            expenses_by_category=expenses_by_category,
            total_commissions_paid=total_commissions,
            commissions_by_type=commissions_by_type,
            gross_profit=gross_profit,
            net_profit=net_profit,
            gross_margin_percentage=gross_margin,
            net_margin_percentage=net_margin,
            top_revenue_machine=top_machine,
            top_revenue_location=top_location,
            highest_expense_category=highest_expense,
            generated_by=generated_by,
        )

        # Save P&L statement
        await self.db.profit_loss_statements.insert_one(pnl.dict())

        return pnl

    async def get_financial_summary(
        self, tenant_id: str, period_start: date, period_end: date
    ) -> FinancialSummary:
        """Get high-level financial summary for dashboard"""

        # Current period metrics
        current_revenue = await self._get_revenue_total(
            tenant_id, period_start, period_end
        )
        current_expenses = await self._get_expenses_total(
            tenant_id, period_start, period_end
        )
        current_profit = current_revenue - current_expenses

        # Previous period for growth calculation
        period_length = (period_end - period_start).days + 1
        prev_end = period_start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=period_length - 1)

        prev_revenue = await self._get_revenue_total(tenant_id, prev_start, prev_end)
        prev_expenses = await self._get_expenses_total(tenant_id, prev_start, prev_end)
        prev_profit = prev_revenue - prev_expenses

        # Growth calculations
        revenue_growth = (
            ((current_revenue - prev_revenue) / prev_revenue * 100)
            if prev_revenue > 0
            else 0
        )
        expense_growth = (
            ((current_expenses - prev_expenses) / prev_expenses * 100)
            if prev_expenses > 0
            else 0
        )
        profit_growth = (
            ((current_profit - prev_profit) / prev_profit * 100)
            if prev_profit > 0
            else 0
        )

        # Machine metrics
        total_machines = await self.db.machines.count_documents(
            {"tenant_id": tenant_id, "status": {"$ne": "transferred"}}
        )

        revenue_per_machine = (
            current_revenue / total_machines if total_machines > 0 else 0
        )
        profit_per_machine = (
            current_profit / total_machines if total_machines > 0 else 0
        )
        profit_margin = (
            (current_profit / current_revenue * 100) if current_revenue > 0 else 0
        )

        # Generate alerts and insights
        alerts = []
        insights = []

        if profit_margin < 10:
            alerts.append("Low profit margin - review expenses and pricing")
        if expense_growth > 20:
            alerts.append("Expenses growing rapidly - investigate cost drivers")
        if revenue_growth < 0:
            alerts.append("Revenue declining - review asset performance")

        if revenue_growth > 10:
            insights.append("Strong revenue growth indicates good market performance")
        if profit_per_machine > 500:
            insights.append(
                "High per-machine profitability suggests efficient operations"
            )

        summary = FinancialSummary(
            period_start=period_start,
            period_end=period_end,
            total_revenue=current_revenue,
            total_expenses=current_expenses,
            net_profit=current_profit,
            profit_margin=profit_margin,
            revenue_growth=revenue_growth,
            expense_growth=expense_growth,
            profit_growth=profit_growth,
            total_machines=total_machines,
            revenue_per_machine=revenue_per_machine,
            profit_per_machine=profit_per_machine,
            financial_alerts=alerts,
            key_insights=insights,
        )

        return summary

    async def _get_revenue_total(
        self, tenant_id: str, start_date: date, end_date: date
    ) -> float:
        """Helper to get total revenue for a period"""
        transactions = await self.db.financial_transactions.find(
            {
                "tenant_id": tenant_id,
                "transaction_type": TransactionType.REVENUE.value,
                "collection_date": {
                    "$gte": datetime.combine(
                        start_date, datetime.min.time().replace(tzinfo=timezone.utc)
                    ),
                    "$lte": datetime.combine(
                        end_date, datetime.max.time().replace(tzinfo=timezone.utc)
                    ),
                },
            }
        ).to_list(length=None)

        return sum(t["amount"] for t in transactions)

    async def _get_expenses_total(
        self, tenant_id: str, start_date: date, end_date: date
    ) -> float:
        """Helper to get total expenses for a period"""
        transactions = await self.db.financial_transactions.find(
            {
                "tenant_id": tenant_id,
                "transaction_type": TransactionType.EXPENSE.value,
                "created_at": {
                    "$gte": datetime.combine(
                        start_date, datetime.min.time().replace(tzinfo=timezone.utc)
                    ),
                    "$lte": datetime.combine(
                        end_date, datetime.max.time().replace(tzinfo=timezone.utc)
                    ),
                },
            }
        ).to_list(length=None)

        return sum(t["amount"] for t in transactions)

    async def get_predictive_insights(self, tenant_id: str) -> PredictiveInsights:
        """Generate predictive insights using historical data"""

        # Get last 90 days of data for trend analysis
        end_date = date.today()
        start_date = end_date - timedelta(days=90)

        # Revenue forecast (simplified linear projection)
        daily_revenues = await self._get_daily_revenues(tenant_id, start_date, end_date)

        if len(daily_revenues) >= 30:
            # Simple trend analysis
            recent_avg = sum(daily_revenues[-30:]) / 30
            older_avg = (
                sum(daily_revenues[:30]) / 30
                if len(daily_revenues) >= 60
                else recent_avg
            )

            trend_factor = recent_avg / older_avg if older_avg > 0 else 1.0
            revenue_forecast_30_days = recent_avg * 30 * trend_factor
        else:
            revenue_forecast_30_days = (
                sum(daily_revenues) / len(daily_revenues) * 30 if daily_revenues else 0
            )

        # Expense forecast (similar methodology)
        daily_expenses = await self._get_daily_expenses(tenant_id, start_date, end_date)

        if len(daily_expenses) >= 30:
            recent_exp_avg = sum(daily_expenses[-30:]) / 30
            expense_forecast_30_days = recent_exp_avg * 30
        else:
            expense_forecast_30_days = (
                sum(daily_expenses) / len(daily_expenses) * 30 if daily_expenses else 0
            )

        predicted_profit = revenue_forecast_30_days - expense_forecast_30_days

        # Machine insights
        asset_performance = await self.calculate_asset_performance(
            tenant_id, start_date, end_date
        )

        machines_needing_attention = [
            {
                "machine_id": perf.asset_id,
                "coam_id": perf.coam_id,
                "issue": "Low ROI",
                "roi": perf.roi_percentage,
            }
            for perf in asset_performance
            if perf.roi_percentage < 5
        ]

        replacement_candidates = [
            {
                "machine_id": perf.asset_id,
                "coam_id": perf.coam_id,
                "reason": "Underperforming",
                "roi": perf.roi_percentage,
            }
            for perf in asset_performance
            if perf.performance_category == "underperforming"
        ]

        # Confidence calculation (simplified)
        confidence = 0.8 if len(daily_revenues) >= 60 else 0.6

        insights = PredictiveInsights(
            revenue_forecast_30_days=revenue_forecast_30_days,
            expense_forecast_30_days=expense_forecast_30_days,
            predicted_profit=predicted_profit,
            machines_needing_attention=machines_needing_attention,
            optimization_opportunities=[],
            replacement_candidates=replacement_candidates,
            underperforming_locations=[],
            expansion_opportunities=[],
            confidence_level=confidence,
        )

        return insights

    async def _get_daily_revenues(
        self, tenant_id: str, start_date: date, end_date: date
    ) -> List[float]:
        """Get daily revenue totals for trend analysis"""
        revenues = []
        current_date = start_date

        while current_date <= end_date:
            day_revenue = await self._get_revenue_total(
                tenant_id, current_date, current_date
            )
            revenues.append(day_revenue)
            current_date += timedelta(days=1)

        return revenues

    async def _get_daily_expenses(
        self, tenant_id: str, start_date: date, end_date: date
    ) -> List[float]:
        """Get daily expense totals for trend analysis"""
        expenses = []
        current_date = start_date

        while current_date <= end_date:
            day_expense = await self._get_expenses_total(
                tenant_id, current_date, current_date
            )
            expenses.append(day_expense)
            current_date += timedelta(days=1)

        return expenses
