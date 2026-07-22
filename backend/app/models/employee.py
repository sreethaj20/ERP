from sqlalchemy import Column, String, Integer, Date, DateTime, func, ForeignKey, Numeric, Text, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String(30), unique=True, index=True, nullable=False) # e.g. EMP-001
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Core Identity
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    name = Column(String(200)) # Derived full name
    
    email = Column(String(150), unique=True, index=True)
    official_email = Column(String(150))
    work_email = Column(String(150))
    personal_email = Column(String(150))
    phone = Column(String(20))
    personal_mobile = Column(String(20))
    alternate_mobile = Column(String(20))
    
    # Professional Blueprint
    department = Column(String(100))
    designation = Column(String(100))
    work_location = Column(String(100))
    employment_type = Column(String(50), default="Full-time")
    status = Column(String(30), default="Active") # Active, On Leave, Resigned
    probation_period_days = Column(Integer, default=90)
    notice_period = Column(Integer, default=30)
    
    # Standardized Hierarchy
    manager_id = Column(String(30), index=True) 
    reporting_manager_id = Column(String(30)) # For legacy support
    team_leader_id = Column(String(30), index=True)
    role = Column(String(30)) # Business Role e.g. Software Engineer
    
    # Canonical Dates
    joining_date = Column(Date, name="joining_date")
    
    @property
    def joining_date_v2(self):
        return self.joining_date
        
    @joining_date_v2.setter
    def joining_date_v2(self, value):
        self.joining_date = value
        
    @property
    def join_date(self):
        return self.joining_date
        
    @join_date.setter
    def join_date(self, value):
        self.joining_date = value
    offer_date = Column(Date)
    exit_date = Column(Date)
    resignation_date = Column(Date)
    date_of_birth = Column(Date, name="date_of_birth")
    dob = Column(Date, name="dob")
    gender = Column(String(20))
    marital_status = Column(String(30))
    blood_group = Column(String(20))
    nationality = Column(String(50))
    
    # Address Matrix
    address = Column(Text)
    permanent_address = Column(Text)
    current_address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    postal_code = Column(String(20), name="postal_code")
    pincode = Column(String(20), name="pincode") # Unified
    country = Column(String(100))
    
    # Financial & Logistics 
    bank_name = Column(String(100))
    bank_account_number = Column(String(50), name="bank_account_number")
    bank_account_no = Column(String(50), name="bank_account_no")
    bank_ifsc_code = Column(String(20), name="bank_ifsc_code")
    ifsc_code = Column(String(20), name="ifsc_code")
    pan_number = Column(String(20))
    aadhaar_number = Column(String(30))
    passport_number = Column(String(30))
    uan_number = Column(String(30))
    esi_number = Column(String(30))
    pf_number = Column(String(30))
    
    # Emergency Contact
    emergency_contact_name = Column(String(100))
    emergency_contact_phone = Column(String(20))
    emergency_contact_relation = Column(String(50))
    
    # Onboarding & Compliance Flags
    pf_registered = Column(Boolean, default=False)
    esi_registered = Column(Boolean, default=False)
    insurance_enrolled = Column(Boolean, default=False)
    payroll_id_created = Column(Boolean, default=False)
    identity_verified = Column(Boolean, default=False)
    
    # Professional Identifiers
    cost_center = Column(String(100))
    business_unit = Column(String(100))
    grade_level = Column(String(50))
    work_mode = Column(String(50), default="onsite")
    shift_type = Column(String(50), default="general")
    
    # Reporting Hierarchy (Explicit)
    reporting_to = Column(String(150))
    reporting_to_id = Column(String(30))
    reporting_manager = Column(String(150))
    
    performance_score = Column(Numeric(5, 2), default=0.00)
    profile_photo_url = Column(Text, name="profile_photo_url")
    photo = Column(Text, name="photo") # Unified

    # --- PERMANENT DOCUMENT REPOSITORY ---
    aadhaar_file_url = Column(Text)
    pan_file_url = Column(Text)
    education_certificate_url = Column(Text)
    resume_url = Column(Text)
    offer_letter_signed_url = Column(Text)
    bank_proof_url = Column(Text)
    
    # IT Access & Metadata
    access_provisioned = Column(Text) # JSON string of provisioned access
    it_access_provisioned = Column(Boolean, default=False)
    it_notes = Column(Text)

    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="employee", uselist=False)

    # Note: Properties removed to prevent shadowing SQLAlchemy columns and breaking persistence.
    # The repository/service layer handles field mapping (e.g., dob -> date_of_birth) if needed.




