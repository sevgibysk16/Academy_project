/**
 * Utility functions for interacting with Google's Gemini AI API
 */

// Get API key from environment variables
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

/**
 * Generate transcript from a video URL using Gemini AI
 * @param {string} videoUrl - URL of the video to transcribe
 * @param {string} videoType - Type of video (youtube, vimeo, soundcloud)
 * @returns {Promise<string>} - The generated transcript
 */
export async function generateTranscript(videoUrl, videoType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  const prompt = `
    GÖREV: Bu ${videoType} içeriğinin detaylı Türkçe transkriptini oluştur: ${videoUrl}
    
    TALİMATLAR:
    1. Profesyonel bir transkripsiyon uzmanı olarak davran.
    2. Tüm konuşma içeriğini Türkçe olarak yazıya dökmelisin.
    3. Transkript kesinlikle Türkçe olmalı, İngilizce kelime kullanma.
    4. Akademik terimler ve teknik ifadeleri doğru şekilde yaz.
    5. Metni düzgün paragraflar halinde ve uygun noktalama işaretleriyle biçimlendir.
    6. Birden fazla konuşmacı varsa, mümkünse konuşmacıları "Konuşmacı: " şeklinde belirt.
    7. Önemli akademik kavramları <span class="highlight-critical">önemli kavram</span> şeklinde işaretle.
    8. Araştırma bulgularını <span class="highlight-positive">araştırma bulgusu</span> şeklinde işaretle.
    9. Araştırma sorularını <span class="highlight-question">araştırma sorusu</span> şeklinde işaretle.
    10. Önerileri ve gelecek çalışmaları <span class="highlight-suggestion">öneri</span> şeklinde işaretle.
    11. Sadece transkript metnini döndür, başka açıklama ekleme.
    
    NOT: Bu transkript akademik bir tez sunumu için kullanılacaktır, bu nedenle mümkün olduğunca doğru ve eksiksiz olmalıdır.
  `;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
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

    const resultText = data.candidates[0].content.parts[0].text;
    console.log("✅ Transkript başarıyla oluşturuldu");
    return resultText;
  } catch (error) {
    console.error("❌ Transkript oluşturma hatası:", error.message);
    throw error;
  }
}

/**
 * Highlight specific sections in a comment based on AI analysis
 * @param {string} comment - The comment text to analyze
 * @returns {Promise<string>} - HTML formatted comment with highlighted sections
 */
export async function highlightComment(comment) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  const prompt = `
    GÖREV: Bu akademik tez sunumu hakkındaki yorumu analiz et ve belirli bölümleri vurgula.
    
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
    
    NOT: Çıktı sadece HTML span etiketleriyle vurgulanmış yorum metni olmalıdır.
  `;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
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

/**
 * Improve an existing transcript using Gemini AI
 * @param {string} transcript - The original transcript to improve
 * @returns {Promise<string>} - The improved transcript
 */
export async function improveTranscript(transcript) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  const prompt = `
    GÖREV: Bu akademik tez sunumu transkriptini iyileştir ve geliştir.
    
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
    8. Önemli akademik kavramları <span class="highlight-critical">önemli kavram</span> şeklinde işaretle.
    9. Araştırma bulgularını <span class="highlight-positive">araştırma bulgusu</span> şeklinde işaretle.
    10. Araştırma sorularını <span class="highlight-question">araştırma sorusu</span> şeklinde işaretle.
    11. Önerileri ve gelecek çalışmaları <span class="highlight-suggestion">öneri</span> şeklinde işaretle.
    12. Sadece iyileştirilmiş transkript metnini döndür, başka açıklama ekleme.
    
    NOT: İyileştirme yaparken orijinal içeriğin anlamını ve bütünlüğünü korumaya özen göster.
  `;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
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

    const resultText = data.candidates[0].content.parts[0].text;
    console.log("✅ Transkript başarıyla iyileştirildi");
    return resultText;
  } catch (error) {
    console.error("❌ Transkript iyileştirme hatası:", error.message);
    throw error;
  }
}
