def user_schema(user) -> dict:
    """
    MongoDB'den gelen kullanıcı verisini düzenler
    """
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "is_active": user["is_active"],
        "is_verified": user["is_verified"],
        "account_type": user["account_type"],
        "joined_date": user["joined_date"],
        "last_login": user["last_login"],
        "phone": user.get("phone"),
        "address": user.get("address")
    }

def users_schema(users) -> list:
    """
    Birden fazla kullanıcı için şema
    """
    return [user_schema(user) for user in users]

def user_profile_schema(user) -> dict:
    """
    Kullanıcı profil bilgilerini döndürür
    """
    return {
        "full_name": f"{user['first_name']} {user['last_name']}",
        "email": user["email"],
        "joined_date": user["joined_date"].strftime("%Y-%m-%d"),
        "last_login": user["last_login"].strftime("%Y-%m-%d %H:%M") if user["last_login"] else "Henüz giriş yapılmadı",
        "account_type": user["account_type"],
        "phone": user.get("phone"),
        "address": user.get("address")
    }
