import motor.motor_asyncio
from app.config import settings

# MongoDB istemcisi oluşturuluyor
client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_url)

# Veritabanı seçiliyor
db = client[settings.mongodb_db_name]

# Kullanıcı koleksiyonu tanımlanıyor
users_collection = db["users"]

# Bağlantı kontrol fonksiyonu
async def check_connection() -> bool:
    try:
        await client.admin.command("ping")
        print("✅ MongoDB bağlantısı başarılı.")
        return True
    except Exception as e:
        print(f"❌ MongoDB bağlantı hatası: {e}")
        return False
