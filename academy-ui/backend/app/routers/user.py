from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.models.user import UserCreate, UserLogin, Token, UserUpdate, PasswordChange, UserProfile
from app.auth.jwt_handler import create_access_token, get_current_user
from app.auth.auth_handler import authenticate_user
from app.services.user_service import create_user, update_user, change_password, get_user_profile, deactivate_account
from app.schemas.user import user_schema, user_profile_schema
from typing import Dict

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.post("/register", response_model=Dict)
async def register_user(user: UserCreate):
    """
    Yeni kullanıcı kaydı oluşturur
    """
    created_user = await create_user(user)
    return {
        "message": "Kullanıcı başarıyla oluşturuldu",
        "user_id": str(created_user["_id"])
    }

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Kullanıcı girişi yapar ve JWT token döndürür
    """
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hatalı email veya şifre",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me/profile", response_model=UserProfile)
async def read_users_me(current_user = Depends(get_current_user)):
    """
    Giriş yapmış kullanıcının profil bilgilerini döndürür
    """
    user = await get_user_profile(current_user.email)
    return user_profile_schema(user)

@router.put("/me/update", response_model=Dict)
async def update_user_profile(user_data: UserUpdate, current_user = Depends(get_current_user)):
    """
    Kullanıcı profilini günceller
    """
    updated_user = await update_user(current_user.email, user_data)
    return {
        "message": "Profil başarıyla güncellendi",
        "user": user_schema(updated_user)
    }

@router.post("/me/change-password", response_model=Dict)
async def update_password(password_data: PasswordChange, current_user = Depends(get_current_user)):
    """
    Kullanıcı şifresini değiştirir
    """
    result = await change_password(current_user.email, password_data)
    return result

@router.post("/me/deactivate", response_model=Dict)
async def deactivate_user_account(current_user = Depends(get_current_user)):
    """
    Kullanıcı hesabını devre dışı bırakır
    """
    result = await deactivate_account(current_user.email)
    return result
