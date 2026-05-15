from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.payment_service import payment_service
from app.schemas.payment import OrderCreate, PaymentVerify, PaymentOut

router = APIRouter()

@router.post("/orders", response_model=Dict[str, Any])
def create_payment_order(obj_in: OrderCreate, current_user: User = Depends(get_current_user)):
    """
    Create a Razorpay Order for a transaction.
    """
    order = payment_service.create_order(
        amount=obj_in.amount,
        currency=obj_in.currency,
        receipt=obj_in.receipt,
        notes=obj_in.notes
    )
    if "error" in order:
        raise HTTPException(status_code=400, detail=order["error"])
    return order

@router.post("/verify")
def verify_payment(obj_in: PaymentVerify, current_user: User = Depends(get_current_user)):
    """
    Verify payment signature after client-side success.
    """
    is_valid = payment_service.verify_payment_signature(
        razorpay_order_id=obj_in.razorpay_order_id,
        razorpay_payment_id=obj_in.razorpay_payment_id,
        razorpay_signature=obj_in.razorpay_signature
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    return {"status": "verified"}

@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Razorpay Webhook endpoint for async updates.
    """
    signature = request.headers.get("X-Razorpay-Signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")
        
    payload = await request.body()
    success = payment_service.handle_webhook(db, payload, signature)
    
    if not success:
        return {"status": "ignored"}
    return {"status": "ok"}
