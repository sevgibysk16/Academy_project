const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');
const { db } = require('./firebase'); // Import db from firebase.js

// Initialize Firebase Admin SDK (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

// User authentication middleware
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
    
    // Verify token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    // Add user information to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture
    };
    
    // Check if user exists in database and update last login
    try {
      const userRef = db.collection('users').doc(decodedToken.uid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        // Create user if not exists
        await userRef.set({
          email: decodedToken.email,
          displayName: decodedToken.name || decodedToken.email,
          photoURL: decodedToken.picture || null,
          createdAt: new Date(),
          lastLogin: new Date()
        });
      } else {
        // Update last login
        await userRef.update({
          lastLogin: new Date()
        });
      }
    } catch (dbError) {
      console.error('Kullanıcı veritabanı işlemi hatası:', dbError);
      // Continue even if database operation fails
    }
    
    next();
  } catch (error) {
    console.error('Kimlik doğrulama hatası:', error);
    
    return res.status(401).json({
      success: false,
      message: 'Kimlik doğrulama başarısız: Geçersiz token'
    });
  }
};

// Admin authentication middleware (for admin-only routes)
const authenticateAdmin = async (req, res, next) => {
  try {
    // First authenticate the user
    await authenticateUser(req, res, async () => {
      // Then check if user is an admin
      try {
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();
        
        if (userDoc.exists && userDoc.data().isAdmin === true) {
          next();
        } else {
          return res.status(403).json({
            success: false,
            message: 'Yetkilendirme başarısız: Admin yetkisi gerekiyor'
          });
        }
      } catch (dbError) {
        console.error('Admin kontrolü hatası:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Sunucu hatası: Yetkilendirme yapılamadı'
        });
      }
    });
  } catch (error) {
    console.error('Admin kimlik doğrulama hatası:', error);
    return res.status(401).json({
      success: false,
      message: 'Kimlik doğrulama başarısız'
    });
  }
};

module.exports = { authenticateUser, authenticateAdmin };
