from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.auth.jwt_handler import get_current_user
from app.models.user import TokenData
from app.routers import user
from app.database.mongodb import check_connection
from app.schemas.user import user_schema, user_profile_schema
from app.services.user_service import get_user_profile
import asyncio

app = FastAPI(
    title="Kullanıcı Yönetim API",
    description="JWT kimlik doğrulama ve MongoDB ile kullanıcı yönetimi",
    version="1.0.0"
)

# CORS ayarları
origins = [
    "http://localhost:3000",  # React frontend
    "http://localhost:8000",  # FastAPI backend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router'ları ekle
app.include_router(user.router)

@app.get("/api/users/me")
async def read_users_me(current_user: TokenData = Depends(get_current_user)):
    """
    Mevcut kullanıcı bilgilerini döndürür
    """
    user = await get_user_profile(current_user.email)
    return user_schema(user)

@app.get("/api/users/me/profile")
async def read_users_profile(current_user: TokenData = Depends(get_current_user)):
    """
    Mevcut kullanıcının profil bilgilerini döndürür
    """
    user = await get_user_profile(current_user.email)
    return user_profile_schema(user)

@app.get("/")
async def root():
    return {"message": "Kullanıcı Yönetim API'sine Hoş Geldiniz"}

@app.get("/health")
async def health_check():
    db_connected = await check_connection()
    return {
        "status": "healthy" if db_connected else "unhealthy",
        "database_connected": db_connected
    }

# Uygulama başlatıldığında veritabanı bağlantısını kontrol et
@app.on_event("startup")
async def startup_db_check():
    connected = await check_connection()
    if connected:
        print("✅ Veritabanına başarıyla bağlanıldı.")
    else:
        print("❌ Veritabanına bağlanılamadı. Lütfen bağlantıyı kontrol edin.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
