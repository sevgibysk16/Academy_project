import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Voice recording functionality using Web Speech API
let recognition;
let isRecording = false;
let recognizedText = '';
let onTextUpdateCallback = null;
let autoSaveInterval = null;
let sessionTranscript = ''; // Tüm oturum için metin biriktirme

// Initialize speech recognition
export const initVoiceRecording = (onTextUpdate) => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('Tarayıcınız Konuşma Tanıma özelliğini desteklemiyor');
    return false;
  }

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'tr-TR';

  onTextUpdateCallback = onTextUpdate;

  setupRecognitionEvents();
  return true;
};

// Set up recognition event handlers
const setupRecognitionEvents = () => {
  if (!recognition) return;

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
        sessionTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    recognizedText = finalTranscript || recognizedText;

    if (onTextUpdateCallback) {
      onTextUpdateCallback(sessionTranscript, interimTranscript);
    }
  };

  recognition.onerror = (event) => {
    console.error('Konuşma tanıma hatası:', event.error);
    if (event.error === 'no-speech') {
      if (isRecording) {
        try {
          recognition.stop();
        } catch (e) {}
        // Güvenli yeniden başlatma için kısa gecikme
        setTimeout(() => {
          try {
            if (!isRecording) return;
            recognition.start();
          } catch (err) {
            console.error('Tanımayı yeniden başlatma hatası:', err);
          }
        }, 200);
      }
    } else {
      stopRecording();
    }
  };

  recognition.onend = () => {
    if (isRecording) {
      try {
        recognition.start();
      } catch (err) {
        console.error('onend sonrası yeniden başlatma hatası:', err);
      }
    }
  };
};

// Start recording
export const startRecording = () => {
  if (!recognition) return false;

  if (isRecording) {
    console.warn('Kayıt zaten başlatılmış.');
    return false;
  }

  try {
    sessionTranscript = '';
    recognition.start();
    isRecording = true;
    return true;
  } catch (error) {
    console.error('Kayıt başlatma hatası:', error);
    return false;
  }
};

// Stop recording
export const stopRecording = () => {
  if (!recognition) return false;

  isRecording = false;

  try {
    recognition.stop();
  } catch (err) {
    console.error('Durdurma hatası:', err);
  }

  return true;
};

// Get current recording status
export const getRecordingStatus = () => {
  return {
    isRecording,
    recognizedText: sessionTranscript
  };
};

// Get recognized text
export const getRecognizedText = () => {
  return sessionTranscript;
};

// Reset recognized text
export const resetRecognizedText = () => {
  recognizedText = '';
  sessionTranscript = '';
  return true;
};

// Clean up resources
export const cleanupVoiceRecording = () => {
  if (recognition && isRecording) {
    try {
      recognition.stop();
    } catch (e) {}
  }

  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }

  isRecording = false;
  recognition = null;
  onTextUpdateCallback = null;
  sessionTranscript = '';
};

// Auto-save transcript to Firestore
export const setupAutoSaveTranscript = (seminarId, transcriptId) => {
  console.log('[Voice Recording] Otomatik kaydetme başlatılıyor...');

  autoSaveInterval = setInterval(async () => {
    try {
      const currentText = getRecognizedText();
      if (currentText) {
        await updateDoc(doc(db, 'seminarRecordings', transcriptId), {
          text: currentText,
          lastUpdated: serverTimestamp()
        });
        console.log('[Voice Recording] Metin otomatik kaydedildi');
      }
    } catch (error) {
      console.error('[Voice Recording] Otomatik kaydetme hatası:', error);
    }
  }, 30000); // Her 30 saniyede bir kaydet

  return () => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
  };
};
