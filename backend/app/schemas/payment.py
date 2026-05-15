from pydantic import BaseModel
from typing import Optional, Dict, Any

class OrderCreate(BaseModel):
    amount: float
    currency: str = "INR"
    receipt: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None

class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class PaymentOut(BaseModel):
    id: int
    transaction_id: str
    order_id: str
    amount: float
    status: str
    method: Optional[str] = None
    
    class Config:
        from_attributes = True
