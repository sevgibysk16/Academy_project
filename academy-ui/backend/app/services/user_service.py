from app.database.mongodb import users_collection
from app.auth.auth_handler import get_password_hash, verify_password
from app.models.user import UserCreate, UserUpdate, PasswordChange
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status

async def create_user(user: UserCreate):
    """
    Yeni kullanıcı oluşturur
    """
    # Email kontrolü
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu email adresi zaten kullanılıyor"
        )
    
    # Kullanıcı verilerini hazırla
    user_data = {
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "hashed_password": get_password_hash(user.password),
        "is_active": True,
        "is_verified": False,
        "account_type": "Standart",
        "joined_date": datetime.utcnow(),
        "last_login": None
    }
    
    # Kullanıcıyı veritabanına ekle
    result = await users_collection.insert_one(user_data)
    
    # Oluşturulan kullanıcıyı döndür
    created_user = await users_collection.find_one({"_id": result.inserted_id})
    return created_user

async def update_user(email: str, user_data: UserUpdate):
    """
    Kullanıcı bilgilerini günceller
    """
    # Güncellenecek alanları hazırla
    update_data = {}
    
    if user_data.first_name is not None:
        update_data["first_name"] = user_data.first_name
    
    if user_data.last_name is not None:
        update_data["last_name"] = user_data.last_name
    
    if user_data.phone is not None:
        update_data["phone"] = user_data.phone
    
    if user_data.address is not None:
        update_data["address"] = user_data.address
    
    if not update_data:
        return await users_collection.find_one({"email": email})
    
    # Kullanıcıyı güncelle
    await users_collection.update_one(
        {"email": email},
        {"$set": update_data}
    )
    
    # Güncellenmiş kullanıcıyı döndür
    return await users_collection.find_one({"email": email})

async def change_password(email: str, password_data: PasswordChange):
    """
    Kullanıcı şifresini değiştirir
    """
    # Kullanıcıyı bul
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı"
        )
    
       # Mevcut şifreyi doğrula
    if not verify_password(password_data.current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mevcut şifre yanlış"
        )
    
    # Yeni şifreyi hash'le
    hashed_password = get_password_hash(password_data.new_password)
    
    # Şifreyi güncelle
    await users_collection.update_one(
        {"email": email},
        {"$set": {"hashed_password": hashed_password}}
    )
    
    return {"message": "Şifre başarıyla değiştirildi"}

async def get_user_profile(email: str):
    """
    Kullanıcı profil bilgilerini döndürür
    """
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı"
        )
    
    return user

async def deactivate_account(email: str):
    """
    Kullanıcı hesabını devre dışı bırakır
    """
    result = await users_collection.update_one(
        {"email": email},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı"
        )
    
    return {"message": "Hesap başarıyla devre dışı bırakıldı"}
