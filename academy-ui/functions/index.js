const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.getCommunityInfo = functions.https.onRequest((req, res) => {
  const communityInfo = {
    name: "Intellica Yazılım Topluluğu",
    description:
      "Kodlama, teknoloji ve inovasyon üzerine birlikte öğreniyoruz!",
  };

  res.status(200).json(communityInfo);
});

exports.joinCommunity = functions.https.onRequest(async (req, res) => {
  const { uid, firstName, lastName } = req.body;

  if (!uid || !firstName || !lastName) {
    return res.status(400).json({ message: "Kullanıcı ID, ad ve soyad gerekli." });
  }

  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    await userRef.set({
      community_member: true,
      first_name: firstName,
      last_name: lastName,
    }, { merge: true });

    console.log(`Kullanıcı ${uid} topluluğa katıldı: ${firstName} ${lastName}`);

    return res.status(200).json({ message: "Topluluğa başarıyla katıldınız!" });
  } catch (error) {
    console.error("Topluluğa katılırken hata oluştu:", error);
    return res.status(500).json({ message: "Sunucu hatası oluştu." });
  }
});
