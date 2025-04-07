from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Düz metin şifreyi hash'lenmiş şifre ile karşılaştırır
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Verilen şifreyi hash'ler
    """
    return pwd_context.hash(password)
