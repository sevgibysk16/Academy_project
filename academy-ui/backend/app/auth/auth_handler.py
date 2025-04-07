from passlib.context import CryptContext
from app.database.mongodb import users_collection
from datetime import datetime
from bson import ObjectId

# Şifre şifreleme için
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """
    Düz metin şifreyi hash ile karşılaştırır
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """
    Şifreyi güvenli bir şekilde hashler
    """
    return pwd_context.hash(password)

async def authenticate_user(email: str, password: str):
    """
    Kullanıcı kimlik doğrulaması yapar
    """
    user = await users_collection.find_one({"email": email})
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    
    # Son giriş zamanını güncelle
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    return user

async def get_user_by_email(email: str):
    """
    Email'e göre kullanıcı bulur
    """
    return await users_collection.find_one({"email": email})

async def get_user_by_id(user_id: str):
    """
    ID'ye göre kullanıcı bulur
    """
    return await users_collection.find_one({"_id": ObjectId(user_id)})
