from sqlalchemy import Column, String, Integer, DateTime, Date, Time, func, Text, Boolean
from app.db.base import Base

class CompanyProfile(Base):
    __tablename__ = "company_profile"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_name = Column(String(200), nullable=False)
    logo_url = Column(Text)
    company_tagline = Column(String(200))
    company_type = Column(String(100))
    company_industry = Column(String(100))
    website = Column(String(255))
    
    contact_email = Column(String(150))
    contact_phone = Column(String(20))
    alternate_phone = Column(String(20))
    
    address_line1 = Column(Text)
    address_line2 = Column(Text)
    city = Column(String(100))
    district = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    pincode = Column(String(20))
    
    gst_number = Column(String(50))
    pan_number = Column(String(50))
    cin_number = Column(String(50))
    tan_number = Column(String(50))
    registration_number = Column(String(100))
    registration_date = Column(Date)
    license_expiry_date = Column(Date)
    tax_id = Column(String(100))
    
    ceo_name = Column(String(150))
    hr_head_name = Column(String(150))
    hr_email = Column(String(150))
    hr_contact_number = Column(String(20))
    finance_head_name = Column(String(150))
    support_email = Column(String(150))
    support_contact_number = Column(String(20))
    
    office_start_time = Column(Time)
    office_end_time = Column(Time)
    working_days = Column(String(100))
    weekly_holidays = Column(String(100))
    leave_policy_url = Column(Text)
    
    bank_name = Column(String(150))
    account_holder_name = Column(String(150))
    account_number = Column(String(50))
    ifsc_code = Column(String(20))
    branch_name = Column(String(150))
    upi_id = Column(String(100))
    
    linkedin_url = Column(String(255))
    instagram_url = Column(String(255))
    twitter_url = Column(String(255))
    youtube_url = Column(String(255))
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # DB columns department_code / department_name (mercure.sql)
    code = Column("department_code", String(20), unique=True, nullable=True)
    name = Column("department_name", String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
