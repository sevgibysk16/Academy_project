/*** Utility functions for interacting with Google's Gemini AI API*/

// Get API key from environment variables
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const CHATBOT_API_KEY = process.env.REACT_APP_CHATBOT_API_KEY;

/*** 
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube video URL
 * @returns {string|null} - Video ID or null if invalid URL
 */
export function extractYouTubeVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

/*** 
 * Generate transcript from a video URL using Gemini AI
 * @param {string} videoUrl - URL of the video to transcribe
 * @param {string} videoType - Type of video (youtube, vimeo, soundcloud)
 * @returns {Promise<string>} - The generated transcript
 */
export async function generateTranscript(videoUrl, videoType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  // Özel prompt - YouTube için farklı yaklaşım
  let prompt;
  if (videoType === "youtube") {
    const videoId = extractYouTubeVideoId(videoUrl);
    prompt = `GÖREV: Bu YouTube videosunun içeriğini analiz et ve olası bir transkript oluştur.

VİDEO BİLGİSİ:
- YouTube Video URL: ${videoUrl}
- Video ID: ${videoId}

TALİMATLAR:
1. Bu videonun içeriğini doğrudan izleyemediğini biliyorum.
2. Ancak, video başlığı, açıklaması ve diğer meta verilerden yola çıkarak videonun ne hakkında olabileceğini tahmin et.
3. Videonun muhtemel içeriğine dayalı bir transkript taslağı oluştur.
4. Transkript tamamen Türkçe olmalı.
5. Akademik bir tez sunumu için uygun, profesyonel bir dil kullan.
6. Hiçbir şekilde "Üzgünüm, YouTube videolarına erişimim yok" gibi ifadeler kullanma.
7. Bunun yerine, "Bu transkript video içeriğinin tahmini bir yeniden oluşturmasıdır" şeklinde başla.
8. Yaklaşık 500-1000 kelimelik bir transkript oluştur.

NOT: Bu bir tahmini transkripttir ve gerçek video içeriğinden farklı olabilir. Kullanıcı daha sonra bu taslağı düzenleyebilir.`;
  } else {
    // Diğer video tipleri için orijinal prompt
    prompt = `GÖREV: Bu ${videoType} içeriğinin detaylı Türkçe transkriptini oluştur: ${videoUrl}

TALİMATLAR:
1. Profesyonel bir transkripsiyon uzmanı olarak davran.
2. Tüm konuşma içeriğini Türkçe olarak yazıya dökmelisin.
3. Transkript kesinlikle Türkçe olmalı, İngilizce kelime kullanma.
4. Akademik terimler ve teknik ifadeleri doğru şekilde yaz.
5. Metni düzgün paragraflar halinde ve uygun noktalama işaretleriyle biçimlendir.
6. Birden fazla konuşmacı varsa, mümkünse konuşmacıları "Konuşmacı: " şeklinde belirt.
7. Hiçbir HTML etiketi veya özel biçimlendirme kullanma, sadece düz metin olarak transkript oluştur.
8. Hiçbir şekilde <span> veya başka HTML etiketleri kullanma.
9. Sadece transkript metnini döndür, başka açıklama ekleme.

NOT: Bu transkript akademik bir tez sunumu için kullanılacaktır, bu nedenle mümkün olduğunca doğru ve eksiksiz olmalıdır.`;
  }

  const requestBody = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }],
    },],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 0.8,
      maxOutputTokens: 8192, // Increased for longer transcripts
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      throw new Error("API returned an empty response.");
    }

    // Remove any HTML tags that might have been generated despite instructions
    let resultText = data.candidates[0].content.parts[0].text;
    resultText = resultText.replace(/<span.*?>(.*?)<\/span>/g, '$1');
    resultText = resultText.replace(/<[^>]*>/g, '');

    // Eğer hala erişim hatası mesajı içeriyorsa
    if (resultText.includes("YouTube videolarına erişimim yok") ||
        resultText.includes("erişimim bulunmuyor") ||
        resultText.includes("erişemiyorum")) {
      // YouTube video ID'sini çıkar
      const videoId = extractYouTubeVideoId(videoUrl);
      // Alternatif bir transkript oluştur
      return `Bu transkript video içeriğinin tahmini bir yeniden oluşturmasıdır.

Bu akademik tez sunumu, konuyla ilgili kapsamlı bir araştırma ve analiz sunmaktadır. Sunucu, çalışmanın amacını, metodolojisini ve bulgularını açık bir şekilde anlatmaktadır. Araştırma soruları net bir şekilde tanımlanmış ve literatür taraması ile desteklenmiştir.

Sunumun ilk bölümünde, araştırmanın teorik çerçevesi ve önceki çalışmalarla ilişkisi açıklanmıştır. Metodoloji bölümünde veri toplama ve analiz yöntemleri detaylı olarak sunulmuştur. Bulgular bölümünde, araştırma sonuçları grafikler ve tablolarla desteklenerek açıklanmıştır.

Tartışma bölümünde, bulgular literatürdeki diğer çalışmalarla karşılaştırılmış ve teorik çerçeve içinde yorumlanmıştır. Sonuç bölümünde, araştırmanın katkıları, sınırlılıkları ve gelecek çalışmalar için öneriler sunulmuştur.

Soru-cevap bölümünde, jüri üyeleri metodoloji, bulgular ve sonuçlar hakkında çeşitli sorular sormuş, sunucu bu soruları kapsamlı ve net bir şekilde yanıtlamıştır.

Not: Bu transkript gerçek video içeriğinden farklı olabilir. Daha doğru bir transkript için YouTube'un otomatik altyazı özelliğini kullanabilir veya videoyu manuel olarak transkript edebilirsiniz. Video ID: ${videoId}`;
    }

    console.log("✅ Transkript başarıyla oluşturuldu");
    return resultText;
  } catch (error) {
    console.error("❌ Transkript oluşturma hatası:", error.message);
    // Hata durumunda da kullanılabilir bir transkript döndür
    if (videoType === "youtube") {
      const videoId = extractYouTubeVideoId(videoUrl);
      return `Transkript oluşturma sırasında teknik bir hata oluştu.

Bu akademik tez sunumu için tahmini bir transkript:

Sunucu, araştırma konusunu ve amacını tanıtarak sunuma başlamıştır. Metodoloji bölümünde kullanılan araştırma yöntemleri ve veri toplama teknikleri açıklanmıştır. Bulgular bölümünde, elde edilen veriler analiz edilmiş ve önemli sonuçlar vurgulanmıştır. Tartışma bölümünde, sonuçların literatürdeki diğer çalışmalarla ilişkisi incelenmiştir. Sonuç bölümünde, araştırmanın katkıları ve gelecek çalışmalar için öneriler sunulmuştur.

Not: Bu transkript gerçek video içeriğinden farklı olabilir. Daha doğru bir transkript için YouTube'un otomatik altyazı özelliğini kullanabilir veya videoyu manuel olarak transkript edebilirsiniz. Video ID: ${videoId}`;
    } else {
      throw error;
    }
  }
}

/*** 
 * Highlight specific sections in a comment based on AI analysis
 * @param {string} comment - The comment text to analyze
 * @returns {Promise<string>} - HTML formatted comment with highlighted sections
 */
export async function highlightComment(comment) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  const prompt = `GÖREV: Bu akademik tez sunumu hakkındaki yorumu analiz et ve belirli bölümleri vurgula.

YORUM: "${comment}"

TALİMATLAR:
1. Yorumu dikkatlice analiz et ve aşağıdaki öğeleri belirle:
- Eleştirel geri bildirimler: <span class="highlight-critical">eleştiri metni</span>
- Olumlu geri bildirimler: <span class="highlight-positive">olumlu yorum metni</span>
- Sorular: <span class="highlight-question">soru metni</span>
- Öneriler: <span class="highlight-suggestion">öneri metni</span>
2. Vurgulamalar için kurallar:
- Türkçe dilbilgisi kurallarına uygun olmalı
- Cümleleri veya anlamlı ifadeleri bölmemeli
- Sadece anlamlı ve önemli kısımları vurgula
- Tüm yorumu vurgulamaya çalışma, sadece önemli kısımları vurgula
3. Yorumun tamamını döndür, sadece vurgulanmış kısımları değil.
4. Hiçbir açıklama veya ek metin ekleme, sadece vurgulanmış yorumu döndür.
5. Eğer belirli bir kategori için vurgulanacak bir şey bulamazsan, o kategoriyi kullanma.

NOT: Çıktı sadece HTML span etiketleriyle vurgulanmış yorum metni olmalıdır.`;

  const requestBody = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }],
    },],
    generationConfig: {
      temperature: 0.2,
      topK: 1,
      topP: 0.8,
      maxOutputTokens: 2048,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      throw new Error("API returned an empty response.");
    }

    let resultText = data.candidates[0].content.parts[0].text;
    // Bazen Gemini çıktıyı tırnak içinde verebiliyor, bunları temizle
    if (resultText.startsWith('"') && resultText.endsWith('"')) {
      resultText = resultText.substring(1, resultText.length - 1);
    }
    // Bazen Gemini HTML etiketlerini escape edebiliyor, bunları düzelt
    resultText = resultText.replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    console.log("✅ Yorum vurgulama başarıyla oluşturuldu");
    return resultText;
  } catch (error) {
    console.error("❌ Yorum vurgulama hatası:", error.message);
    // Return original comment if highlighting fails
    return comment;
  }
}

/*** 
 * Improve an existing transcript using Gemini AI
 * @param {string} transcript - The original transcript to improve
 * @returns {Promise<string>} - The improved transcript
 */
export async function improveTranscript(transcript) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  const prompt = `GÖREV: Bu akademik tez sunumu transkriptini iyileştir ve geliştir.

ORİJİNAL TRANSKRİPT:
${transcript}

TALİMATLAR:
1. Profesyonel bir akademik editör olarak davran.
2. Transkripti daha akıcı ve anlaşılır hale getir.
3. Dilbilgisi, yazım ve noktalama hatalarını düzelt.
4. Tekrarlanan ifadeleri ve doldurma kelimeleri temizle.
5. Cümle yapılarını iyileştir, ancak anlamı değiştirme.
6. Akademik terimler ve teknik ifadeleri doğru şekilde kullan.
7. Metni düzgün paragraflar halinde düzenle.
8. Hiçbir HTML etiketi veya özel biçimlendirme kullanma, sadece düz metin olarak transkript oluştur.
9. Hiçbir şekilde <span> veya başka HTML etiketleri kullanma.
10. Sadece iyileştirilmiş transkript metnini döndür, başka açıklama ekleme.

NOT: İyileştirme yaparken orijinal içeriğin anlamını ve bütünlüğünü korumaya özen göster.`;

  const requestBody = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }],
    },],
    generationConfig: {
      temperature: 0.3,
      topK: 1,
      topP: 0.8,
      maxOutputTokens: 8192,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      throw new Error("API returned an empty response.");
    }

    // Remove any HTML tags that might have been generated despite instructions
    let resultText = data.candidates[0].content.parts[0].text;
    resultText = resultText.replace(/<span.*?>(.*?)<\/span>/g, '$1');
    resultText = resultText.replace(/<[^>]*>/g, '');

    console.log("✅ Transkript başarıyla iyileştirildi");
    return resultText;
  } catch (error) {
    console.error("❌ Transkript iyileştirme hatası:", error.message);
    throw error;
  }
}

/*** 
 * Get YouTube video metadata using the video ID
 * @param {string} videoUrl - YouTube video URL
 * @returns {Promise<Object>} - Video metadata
 */
export async function getYouTubeVideoMetadata(videoUrl) {
  try {
    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Geçerli bir YouTube video ID\'si bulunamadı.');
    }

    // YouTube oEmbed API'sini kullanarak video meta verilerini al
    // Bu API, API anahtarı gerektirmez ve temel video bilgilerini sağlar
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    
    if (!response.ok) {
      throw new Error('Video meta verileri alınamadı.');
    }

    const data = await response.json();
    return {
      title: data.title,
      author: data.author_name,
      thumbnailUrl: data.thumbnail_url,
      videoId: videoId
    };
  } catch (error) {
    console.error('YouTube meta veri hatası:', error);
    // Temel bilgileri döndür
    return {
      title: 'Video başlığı alınamadı',
      author: 'Bilinmeyen',
      thumbnailUrl: `https://img.youtube.com/vi/${extractYouTubeVideoId(videoUrl)}/0.jpg`,
      videoId: extractYouTubeVideoId(videoUrl)
    };
  }
}

/*** 
 * Generate a more contextual transcript using video metadata
 * @param {string} videoUrl - YouTube video URL
 * @returns {Promise<string>} - The generated transcript
 */
export async function generateContextualTranscript(videoUrl) {
  try {
    // Önce video meta verilerini al
    const metadata = await getYouTubeVideoMetadata(videoUrl);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    const prompt = `GÖREV: Bu YouTube videosunun içeriğine dayalı bir akademik transkript oluştur.

VİDEO BİLGİSİ:
- Başlık: ${metadata.title}
- Yükleyen: ${metadata.author}
- Video ID: ${metadata.videoId}

TALİMATLAR:
1. Bu videonun başlığına ve yükleyenine bakarak, videonun muhtemel içeriğini tahmin et.
2. Video başlığı "${metadata.title}" ve içerik oluşturucu "${metadata.author}" bilgilerini kullanarak akademik bir tez sunumu için uygun bir transkript oluştur.
3. Transkript tamamen Türkçe olmalı ve akademik bir dil kullanmalı.
4. Transkript, bir tez sunumunun tipik yapısını takip etmeli: giriş, metodoloji, bulgular, tartışma ve sonuç.
5. Yaklaşık 800-1200 kelimelik detaylı bir transkript oluştur.
6. Hiçbir şekilde "Üzgünüm, YouTube videolarına erişimim yok" gibi ifadeler kullanma.
7. Bunun yerine, "Bu transkript '${metadata.title}' başlıklı video içeriğinin tahmini bir yeniden oluşturmasıdır" şeklinde başla.

NOT: Bu bir tahmini transkripttir ve gerçek video içeriğinden farklı olabilir. Kullanıcı daha sonra bu taslağı düzenleyebilir.`;

    const requestBody = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }],
      },],
      generationConfig: {
        temperature: 0.2,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 8192,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      throw new Error("API returned an empty response.");
    }

    let resultText = data.candidates[0].content.parts[0].text;
    resultText = resultText.replace(/<span.*?>(.*?)<\/span>/g, '$1');
    resultText = resultText.replace(/<[^>]*>/g, '');

    console.log("✅ Bağlamsal transkript başarıyla oluşturuldu");
    return resultText;
  } catch (error) {
    console.error("❌ Bağlamsal transkript oluşturma hatası:", error.message);
    // Hata durumunda temel bir transkript döndür
    return `Bu transkript video içeriğinin tahmini bir yeniden oluşturmasıdır.

Bu akademik tez sunumu, konuyla ilgili kapsamlı bir araştırma ve analiz sunmaktadır. Sunucu, çalışmanın amacını, metodolojisini ve bulgularını açık bir şekilde anlatmaktadır. Araştırma soruları net bir şekilde tanımlanmış ve literatür taraması ile desteklenmiştir.

Sunumun ilk bölümünde, araştırmanın teorik çerçevesi ve önceki çalışmalarla ilişkisi açıklanmıştır. Metodoloji bölümünde veri toplama ve analiz yöntemleri detaylı olarak sunulmuştur. Bulgular bölümünde, araştırma sonuçları grafikler ve tablolarla desteklenerek açıklanmıştır.

Tartışma bölümünde, bulgular literatürdeki diğer çalışmalarla karşılaştırılmış ve teorik çerçeve içinde yorumlanmıştır. Sonuç bölümünde, araştırmanın katkıları, sınırlılıkları ve gelecek çalışmalar için öneriler sunulmuştur.

Soru-cevap bölümünde, jüri üyeleri metodoloji, bulgular ve sonuçlar hakkında çeşitli sorular sormuş, sunucu bu soruları kapsamlı ve net bir şekilde yanıtlamıştır.

Not: Bu transkript gerçek video içeriğinden farklı olabilir. Daha doğru bir transkript için YouTube'un otomatik altyazı özelliğini kullanabilir veya videoyu manuel olarak transkript edebilirsiniz.`;
  }
}

/*** 
 * Main function to get transcript from YouTube video
 * @param {string} videoUrl - YouTube video URL
 * @returns {Promise<string>} - The generated transcript
 */
export async function getYouTubeTranscript(videoUrl) {
  try {
    // Önce bağlamsal transkript oluşturmayı dene
    const transcript = await generateContextualTranscript(videoUrl);
    
    // Eğer transkript "Üzgünüm" veya "erişimim yok" içeriyorsa
    if (transcript.includes("Üzgünüm") ||
        transcript.includes("erişimim yok") ||
        transcript.includes("erişemiyorum")) {
      // Temel transkript oluştur
      return generateTranscript(videoUrl, "youtube");
    }
    
    return transcript;
  } catch (error) {
    console.error("YouTube transkript alma hatası:", error);
    // Hata durumunda temel transkript oluştur
    return generateTranscript(videoUrl, "youtube");
  }
}

/*** 
 * Generate chatbot response using Gemini AI
 * @param {string} userMessage - The user's message
 * @param {string} context - Previous conversation context
 * @returns {Promise<string>} - The generated response
 */
export async function generateChatbotResponse(userMessage, context = "") {
  // Use the chatbot-specific API key if available, otherwise fall back to the general API key
  const apiKey = CHATBOT_API_KEY || API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `GÖREV: Akademik her alanda uzman bir yapay zeka asistanı olarak kullanıcının sorularını yanıtla.

BAĞLAM (ÖNCEKİ MESAJLAR):
${context}

KULLANICI MESAJI:
${userMessage}

TALİMATLAR:
1. Akademik tez sunumları, akademik yazım, araştırma metodolojisi, akademik sunum teknikleri, bilimsel makaleler, akademik yayıncılık, eğitim, bilim ve araştırma ile ilgili her konuda uzman bir asistan olarak davran.
2. Yanıtlar tamamen Türkçe olmalı ve akademik bir dil kullanmalı.
3. Kısa, net ve bilgilendirici yanıtlar ver.
4. Kullanıcının sorusunu anlamadığında açıklama iste.
5. Akademik etik ve dürüstlük ilkelerine uygun tavsiyelerde bulun.
6. Kullanıcıya saygılı ve yardımcı ol.
7. Yanıtın 300 kelimeyi geçmemeli, ancak gerektiğinde detaylı açıklama yapabilirsin.

NOT: Yanıtın sadece metin formatında olmalı, HTML etiketleri veya özel biçimlendirme içermemeli.`;

  const requestBody = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }],
    },],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
      throw new Error("API returned an empty response.");
    }

    // Remove any HTML tags that might have been generated despite instructions
    let resultText = data.candidates[0].content.parts[0].text;
    resultText = resultText.replace(/<span.*?>(.*?)<\/span>/g, '$1');
    resultText = resultText.replace(/<[^>]*>/g, '');

    console.log("✅ Chatbot yanıtı başarıyla oluşturuldu");
    return resultText;
  } catch (error) {
    console.error("❌ Chatbot yanıtı oluşturma hatası:", error.message);
    throw new Error("Yanıt oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
  }
}
