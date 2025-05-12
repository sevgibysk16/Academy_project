const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');

// Firebase Admin SDK'yı başlat (eğer henüz başlatılmadıysa)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

// Kullanıcı kimlik doğrulama ara yazılımı
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kimlik doğrulama başarısız: Token bulunamadı' 
      });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    // Token'ı doğrula
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    // Kullanıcı bilgilerini request nesnesine ekle
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture
    };
    
    next();
  } catch (error) {
    console.error('Kimlik doğrulama hatası:', error);
    
    return res.status(401).json({ 
      success: false, 
      message: 'Kimlik doğrulama başarısız: Geçersiz token' 
    });
  }
};

module.exports = { authenticateUser };
