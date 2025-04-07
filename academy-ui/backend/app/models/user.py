from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Şifre en az 8 karakter olmalıdır')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Şifreler eşleşmiyor')
        return v
    
    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Şifre en az 8 karakter olmalıdır')
        return v

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserInDB(UserBase):
    id: str = Field(..., alias="_id")
    hashed_password: str
    is_active: bool = True
    is_verified: bool = False
    account_type: str = "Standart"
    joined_date: datetime
    last_login: Optional[datetime] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class UserProfile(BaseModel):
    full_name: str
    email: EmailStr
    joined_date: str
    last_login: str
    account_type: str
    phone: Optional[str] = None
    address: Optional[str] = None
