// NerAI - עוזר AI לוואטסאפ | Service Worker
// by Ner Online - neronline.co.il

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // אתחול הגדרות ברירת מחדל של התוסף
      new Promise((resolve) => {
        chrome.storage.sync.get(['translationApi', 'targetLang'], (data) => {
          const updates = {};
          if (!data.translationApi) {
            updates.translationApi = 'google';
          }
          if (!data.targetLang) {
            updates.targetLang = 'he';
          }
          if (Object.keys(updates).length > 0) {
            chrome.storage.sync.set(updates);
          }
          resolve();
        });
      }),
      // קבלת שליטה על כל הטאבים הפתוחים
      clients.claim()
    ])
  );
});

// האזנה להודעות מה־content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate' || request.type === 'TRANSLATE') {
    handleTranslation(request, sendResponse);
    return true;
  } else if (request.action === 'showTranslationServiceSwitch') {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs && tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'notifyServiceSwitch',
            from: request.from,
            to: request.to,
            reason: request.reason
          }, function(response) {
            if (chrome.runtime.lastError) {
              console.error('שליחת התראת החלפת שירות נכשלה:', chrome.runtime.lastError);
            } else {
              console.log('התראת החלפת שירות נשלחה');
            }
          });
        } else {
          console.error('לא נמצא טאב פעיל');
        }
      });
    } catch (error) {
      console.error('שגיאה בטיפול בהתראת החלפת שירות תרגום:', error);
    }
    // מחזירים תשובה בכל מקרה כדי למנוע שגיאת סגירת ערוץ הודעות
    if (sendResponse) {
      sendResponse({ status: 'notification_processed' });
    }
    return true;
  }
});

// טיפול בבקשת תרגום Google (רץ ב־service worker כדי לעקוף מגבלות CORS)
async function handleTranslation(request, sendResponse) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${request.from}&tl=${request.to}&dt=t&q=${encodeURIComponent(request.text)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data && data[0]) {
      const translation = data[0]
        .filter(item => item && item[0])
        .map(item => item[0])
        .join('\n');

      sendResponse({ translation });
    } else {
      sendResponse({ error: 'פורמט תוצאת התרגום שגוי' });
    }
  } catch (error) {
    console.error('שגיאת תרגום:', error);
    sendResponse({ error: 'שירות התרגום אינו זמין כרגע, נסה שוב מאוחר יותר' });
  }
}

// טיפול בשגיאות כלליות
self.addEventListener('error', (event) => {
  console.error('שגיאת Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejection לא מטופל:', event.reason);
});
