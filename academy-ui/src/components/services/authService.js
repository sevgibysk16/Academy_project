// Giriş işlemi
export const loginUser = async (credentials) => {
    // API çağrısını simüle etmek için bir gecikme ekliyoruz
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = users.find(u => u.email === credentials.email);
        
        if (user && user.password === credentials.password) {
          // Başarılı giriş
          resolve({
            success: true,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            }
          });
        } else {
          // Başarısız giriş
          resolve({
            success: false,
            message: 'Email veya şifre hatalı'
          });
        }
      }, 1000); // 1 saniyelik gecikme
    });
  };
  
  // Kayıt işlemi
  export const registerUser = async (userData) => {
    // API çağrısını simüle etmek için bir gecikme ekliyoruz
    return new Promise((resolve) => {
      setTimeout(() => {
        // Email zaten kullanılıyor mu kontrol et
        const existingUser = users.find(u => u.email === userData.email);
        
        if (existingUser) {
          resolve({
            success: false,
            message: 'Bu email adresi zaten kullanılıyor'
          });
          return;
        }
        
        // Yeni kullanıcı oluştur
        const newUser = {
          id: Date.now().toString(),
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: userData.password
        };
        
        // Kullanıcıyı kaydet
        users.push(newUser);
        
        // Başarılı yanıt döndür
        resolve({
          success: true,
          user: {
            id: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email
          }
        });
      }, 1000); // 1 saniyelik gecikme
    });
  };