from sqlalchemy import Column, String, Integer, Numeric, DateTime, func, Text
from app.db.base import Base

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_id = Column(String(100), unique=True, index=True) # razorpay_payment_id
    order_id = Column(String(100), index=True) # razorpay_order_id
    employee_id = Column(String(30), index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(30), default="created") # created, authorized, captured, refunded, failed
    method = Column(String(50)) # card, netbanking, upi
    email = Column(String(150))
    contact = Column(String(20))
    description = Column(String(255))
    error_code = Column(String(100))
    error_description = Column(String(255))
    raw_response = Column(Text) # Text field for structured response
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
