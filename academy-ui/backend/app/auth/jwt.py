from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError

from app.models.user import User, get_user_by_username
from app.schemas.token import TokenPayload

# JWT yapılandırması
SECRET_KEY = "YOUR_SECRET_KEY_HERE"  # Gerçek uygulamada güvenli bir şekilde saklayın
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Verilen subject (genellikle kullanıcı ID'si) için bir JWT token oluşturur
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Token'dan mevcut kullanıcıyı alır
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_data = TokenPayload(**payload)
        
        if datetime.fromtimestamp(token_data.exp) < datetime.now():
            raise credentials_exception
            
    except (JWTError, ValidationError):
        raise credentials_exception
        
    user = get_user_by_username(token_data.sub)
    
    if user is None:
        raise credentials_exception
        
    return user
