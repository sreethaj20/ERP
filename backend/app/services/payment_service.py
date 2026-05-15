import hmac
import hashlib
import json
import os
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.payment import PaymentTransaction
from datetime import datetime

# Lazy import for razorpay to avoid crash if not installed
try:
    import razorpay
except ImportError:
    razorpay = None

class RazorpayService:
    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        self.webhook_secret = os.getenv("RAZORPAY_WEB_HOOK_SECRET")
        
        if razorpay and self.key_id and self.key_secret:
            self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
        else:
            self.client = None

    def create_order(self, amount: float, currency: str = "INR", receipt: str = None, notes: Dict = None) -> Dict[str, Any]:
        """
        Create a Razorpay Order
        Amount should be in major unit (e.g. 500.00 for INR 500)
        """
        if not self.client:
            return {"error": "Razorpay client not configured or library missing"}
            
        data = {
            "amount": int(amount * 100), # Razorpay expects amount in paise
            "currency": currency,
            "receipt": receipt or f"rcpt_{int(datetime.now().timestamp())}",
            "notes": notes or {}
        }
        
        try:
            order = self.client.order.create(data=data)
            return order
        except Exception as e:
            print(f"Razorpay Order Error: {e}")
            return {"error": str(e)}

    def create_payout(self, employee_id: str, amount: float, currency: str = "INR", notes: Dict = None) -> Dict[str, Any]:
        """
        Create a Payout (RazorpayX).
        Note: This typically requires a different setup, but we'll implement the logic structure.
        """
        if not self.client:
            return {"error": "Razorpay client not configured"}

        # For demonstration/MVP, we'll create a payment link or a mock payout record
        # In a real RazorpayX integration, you'd use client.payout.create(...)
        payload = {
            "account_number": os.getenv("RAZORPAY_X_ACCOUNT_NUMBER", "234567890"),
            "fund_account_id": f"fa_{employee_id}", # Real implementation would fetch this
            "amount": int(amount * 100),
            "currency": currency,
            "mode": "IMPS",
            "purpose": "payout",
            "queue_if_low_balance": True,
            "notes": notes or {}
        }
        
        # Simulating external API call success
        return {
            "id": f"pout_{int(datetime.now().timestamp())}",
            "entity": "payout",
            "amount": payload["amount"],
            "currency": payload["currency"],
            "status": "scheduled",
            "employee_id": employee_id
        }

    def verify_payment_signature(self, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
        """
        Verify the signature of a payment to ensure it came from Razorpay
        """
        if not self.client:
            return False
            
        try:
            params_dict = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            }
            return self.client.utility.verify_payment_signature(params_dict)
        except Exception as e:
            print(f"Signature Verification Failed: {e}")
            return False

    def handle_webhook(self, db: Session, payload_body: bytes, signature: str) -> bool:
        """
        Handle incoming webhooks from Razorpay
        """
        if not self.webhook_secret:
            return False
            
        # Verify webhook signature
        expected_signature = hmac.new(
            self.webhook_secret.encode(),
            payload_body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_signature, signature):
            print("Invalid Webhook Signature")
            return False
            
        payload = json.loads(payload_body.decode())
        event = payload.get("event")
        payment_data = payload.get("payload", {}).get("payment", {}).get("entity", {})
        
        if not payment_data:
            return False
            
        # Log transaction in DB
        self._log_transaction(db, event, payment_data)
        return True

    def _log_transaction(self, db: Session, event: str, data: Dict[str, Any]):
        payment_id = data.get("id")
        order_id = data.get("order_id")
        
        # Check for existing transaction
        transaction = db.query(PaymentTransaction).filter(PaymentTransaction.transaction_id == payment_id).first()
        
        if not transaction:
            transaction = PaymentTransaction(
                transaction_id=payment_id,
                order_id=order_id,
                amount=float(data.get("amount", 0)) / 100,
                status=data.get("status"),
                method=data.get("method"),
                email=data.get("email"),
                contact=data.get("contact"),
                description=data.get("description"),
                raw_response=data
            )
            db.add(transaction)
        else:
            transaction.status = data.get("status")
            transaction.raw_response = data
            
        db.commit()

payment_service = RazorpayService()
