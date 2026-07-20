// NerAI - עוזר AI לוואטסאפ | סקריפט תוכן ראשי
// תרגום הודעות, ניתוח שיחות AI, מודאל הגדרות
// by Ner Online - neronline.co.il

// מצב טעינת רכיבי התוסף
let pluginStatus = {
  translation: false,
  observer: false,
  apiService: false
};

// תרגום אוטומטי להודעות נכנסות — נטען מההגדרות ומתעדכן חי
let autoTranslateIncoming = false;
chrome.storage.sync.get(['autoTranslateIncoming'], (data) => {
  autoTranslateIncoming = data.autoTranslateIncoming === true;
  if (autoTranslateIncoming) {
    console.log('NerAI: תרגום אוטומטי להודעות נכנסות פעיל');
  }
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.autoTranslateIncoming) {
    autoTranslateIncoming = changes.autoTranslateIncoming.newValue === true;
    console.log('NerAI: תרגום אוטומטי להודעות נכנסות:', autoTranslateIncoming ? 'הופעל' : 'כובה');
  }
});

// בדיקת מצב התוסף
function checkStatus() {
  return {
    isLoaded: true,
    translation: pluginStatus.translation,
    observer: pluginStatus.observer,
    apiService: pluginStatus.apiService
  };
}

// האזנה להודעות מה־popup ומה־service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_STATUS') {
    sendResponse(checkStatus());
    return true;
  }

  if (request.type === 'CHECK_BUTTONS') {
    try {
      // בדיקה שכפתורי התוסף קיימים בעמוד
      const translateBtnExists = document.querySelector('.translate-btn') !== null;
      const analysisBtnExists = document.querySelector('.analysis-btn-container') !== null;
      const inputTranslateBtnExists = document.querySelector('.input-translate-btn') !== null;

      // מספיק שכפתור אחד קיים כדי להחשיב את התוסף כטעון
      const success = translateBtnExists || analysisBtnExists || inputTranslateBtnExists;

      sendResponse({
        success,
        details: {
          translateBtn: translateBtnExists,
          analysisBtn: analysisBtnExists,
          inputTranslateBtn: inputTranslateBtnExists
        }
      });
    } catch (error) {
      console.error('שגיאה בבדיקת הכפתורים:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.type === 'CHECK_CHAT_WINDOW') {
    try {
      // בדיקה אם קיים חלון שיחה פתוח
      const chatWindow = document.querySelector('#main');
      sendResponse({ exists: chatWindow !== null });
    } catch (error) {
      console.error('שגיאה בבדיקת חלון השיחה:', error);
      sendResponse({ exists: false });
    }
    return true;
  }

  if (request.action === 'notifyServiceSwitch') {
    showNotification(`שירות התרגום הוחלף מ־${request.from} ל־${request.to}: ${request.reason}`);
  }
});

// הצגת התראה צפה בפינת המסך
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'wa-ai-notification';
  notification.textContent = message;
  notification.style.cssText = 'position:fixed;z-index:9999;bottom:20px;right:20px;background:#4CAF50;color:white;padding:12px 15px;border-radius:4px;box-shadow:0 2px 10px rgba(0,0,0,0.2);font-size:14px;font-weight:bold;max-width:80%;overflow:hidden;text-overflow:ellipsis;direction:rtl;';

  const icon = document.createElement('span');
  icon.textContent = '🔄 ';
  notification.prepend(icon);

  document.body.appendChild(notification);

  // אנימציית כניסה
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(20px)';
  notification.style.transition = 'opacity 0.3s, transform 0.3s';

  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  // אנימציית יציאה אחרי 5 שניות
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    setTimeout(() => notification.remove(), 300);
  }, 5000);

  console.log('הוצגה התראה:', message);
}

// עדכון מצב רכיב בתוסף
function updatePluginStatus(feature, status) {
  pluginStatus[feature] = status;
  console.log(`מצב התוסף עודכן - ${feature}:`, status);
}

// אתחול ראשי של התוסף
async function initialize() {
  try {
    console.log('מאתחל את תרגום ההודעות...');
    injectStyles();
    updatePluginStatus('translation', true);

    observeMessages();
    updatePluginStatus('observer', true);

    // אתחול תרגום תיבת ההקלדה
    if (typeof window.initializeInputTranslate === 'function') {
      window.initializeInputTranslate();
      updatePluginStatus('apiService', true);
    } else {
      console.error('פונקציית אתחול תרגום תיבת ההקלדה לא נמצאה');
      updatePluginStatus('apiService', false);
    }

    // פתיחת אשף הגדרת הסוכן בפעם הראשונה (פעם אחת בלבד)
    chrome.storage.sync.get(['agentSetupDone'], (data) => {
      if (!data.agentSetupDone) {
        // המתנה קצרה כדי שוואטסאפ יסיים להיטען לפני שמציגים את האשף
        setTimeout(() => {
          if (typeof window.showAgentSetupWizard === 'function') {
            window.showAgentSetupWizard();
          }
        }, 4000);
      }
    });
  } catch (error) {
    console.error('שגיאת אתחול:', error);
    updatePluginStatus('translation', false);
    updatePluginStatus('observer', false);
    updatePluginStatus('apiService', false);
  }
}

// חשיפת האתחול (נקרא מ־quick-chat.js בסיום הטעינה)
window.initialize = initialize;

// אייקוני סטטוס שליחה (✓ / ✓✓ / שעון) — קיימים רק על הודעות שאני שלחתי.
// וואטסאפ החליפו את שמות האייקונים מ-msg-* ל-status-*, בודקים את שתי המשפחות
const OUTGOING_STATUS_SELECTOR = [
  'span[data-icon="msg-check"]',
  'span[data-icon="msg-dblcheck"]',
  'span[data-icon="msg-dblcheck-ack"]',
  'span[data-icon="msg-time"]',
  'span[data-icon="status-check"]',
  'span[data-icon="status-dblcheck"]',
  'span[data-icon="status-dblcheck-ack"]',
  'span[data-icon="status-time"]'
].join(', ');

// זיהוי כיוון הודעה — האם זו הודעה שאני שלחתי?
// שכבה 1: data-id של וואטסאפ מתחיל ב-"true_" בהודעות שלי וב-"false_" בנכנסות
// שכבה 2: אייקוני סטטוס השליחה — מרונדרים רק על הודעות שלי
// שכבה 3: גאומטריה — הבועות שלי צמודות לצד ההפוך מהנכנסות (לא תלוי בשמות פנימיים)
// שכבה 4 (גיבוי): מחלקות message-out / message-in הישנות
function isOutgoingMessage(element) {
  if (!element) return false;

  const idHolder = element.closest('[data-id]');
  if (idHolder) {
    const dataId = idHolder.getAttribute('data-id') || '';
    if (dataId.startsWith('true_')) return true;
    if (dataId.startsWith('false_')) return false;
  }

  // אייקוני סטטוס — מחפשים בהיקף הבועה כולה (כמה רמות מעל אלמנט הטקסט)
  const scope = idHolder ||
                element.parentElement?.parentElement?.parentElement?.parentElement ||
                element;
  if (scope.querySelector && scope.querySelector(OUTGOING_STATUS_SELECTOR)) {
    return true;
  }

  // גאומטריה: בממשק RTL הודעות שלי צמודות לשמאל, נכנסות לימין (ב-LTR הפוך).
  // בועת הודעה תמיד "מחבקת" צד אחד — משווים את המרחק משני צידי אזור השיחה
  try {
    const main = document.querySelector('#main');
    if (main) {
      const mainRect = main.getBoundingClientRect();
      const msgRect = element.getBoundingClientRect();
      if (msgRect.width > 0 && mainRect.width > 0) {
        const distLeft = msgRect.left - mainRect.left;
        const distRight = mainRect.right - msgRect.right;
        // רק כשההצמדה חד־משמעית (הפרש מעל 40px) סומכים על הגאומטריה
        if (Math.abs(distLeft - distRight) > 40) {
          const dir = document.documentElement.getAttribute('dir') ||
                      document.body.getAttribute('dir') ||
                      getComputedStyle(document.body).direction;
          const isRtlUi = dir === 'rtl';
          const hugsLeft = distLeft < distRight;
          return isRtlUi ? hugsLeft : !hugsLeft;
        }
      }
    }
  } catch (geoError) {
    // ממשיכים לשכבה הבאה
  }

  if (element.closest('.message-out')) return true;
  if (element.closest('.message-in')) return false;

  return false;
}

// חילוץ שם השולח האמיתי של הודעה — חשוב בקבוצות
// וואטסאפ שם את השם בתוך data-pre-plain-text בפורמט: "[שעה, תאריך] שם: "
function getMessageSender(row) {
  if (isOutgoingMessage(row)) return 'אני';

  const preText = row.getAttribute
    ? (row.getAttribute('data-pre-plain-text') || '')
    : '';
  const match = preText.match(/\]\s*([^:]+):\s*$/);
  if (match && match[1].trim()) {
    return match[1].trim();
  }
  return 'הצד השני';
}

// שליפת שפת היעד היוצאת ששמורה לאיש הקשר הנוכחי
// (אותו מנגנון זיכרון של תרגום תיבת ההקלדה — מפתח chatLanguagePreferences)
function getOutgoingLanguage() {
  try {
    const nameElement = document.querySelector('#main header span[class*="_ao3e"]');
    const chatName = nameElement?.textContent?.trim() || 'default';
    const prefs = JSON.parse(localStorage.getItem('chatLanguagePreferences') || '{}');
    const lang = prefs[chatName] || 'en';
    console.log('שפת יעד להודעה יוצאת:', { chatName, lang });
    return lang;
  } catch (error) {
    console.error('שליפת שפת היעד היוצאת נכשלה:', error);
    return 'en';
  }
}

// תרגום טקסט של הודעה לפי השירות המוגדר
// targetLangOverride — דריסת שפת היעד (משמש לתרגום הודעות יוצאות לשפת הנמען)
async function translateText(text, targetLangOverride = null) {
  try {
    const translationSettings = await window.getTranslationSettings();
    console.log('הגדרות תרגום:', translationSettings);

    const service = translationSettings.service;
    const targetLang = targetLangOverride || translationSettings.targetLang;

    console.log('משתמש בשירות תרגום:', service);

    // קבלת פרטי הגישה לשירות
    const { apiKey, apiUrl, model } = await window.getTranslationService();

    let translation;

    if (service === 'google') {
      // תרגום Google — ללא מפתח
      console.log('קורא לתרגום Google', {
        from: 'auto',
        to: targetLang,
        textLength: text.length
      });
      translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
      console.log('תוצאת תרגום Google:', { success: !!translation, resultLength: translation?.length });
    } else if (service === 'siliconflow') {
      // OpenAI — דורש כתובת API ומודל
      console.log('קורא לתרגום OpenAI', {
        apiKeyLength: apiKey?.length,
        hasApiUrl: !!apiUrl,
        hasModel: !!model,
        textLength: text.length
      });
      try {
        translation = await window.ApiServices.translation.siliconflow(text, apiKey, apiUrl, model, targetLang);

        if (translation && typeof translation === 'object' && translation.hasThinking) {
          console.log('תוצאת תרגום OpenAI (עם תהליך חשיבה):', {
            success: true,
            thinkingLength: translation.thinking?.length || 0,
            translationLength: translation.translation?.length || 0
          });
        } else {
          console.log('תוצאת תרגום OpenAI:', { success: !!translation, resultLength: translation?.length });
        }
      } catch (openaiError) {
        console.error('תרגום OpenAI נכשל, עובר לתרגום Google:', openaiError);
        translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
        console.log('תוצאת תרגום הגיבוי של Google:', { success: !!translation, resultLength: translation?.length });
      }
    } else if (service === 'deepseek') {
      console.log('קורא לתרגום DeepSeek', { apiKeyLength: apiKey?.length, textLength: text.length });
      try {
        translation = await window.ApiServices.translation.deepseek(text, apiKey, targetLang);
        console.log('תוצאת תרגום DeepSeek:', { success: !!translation, resultLength: translation?.length });
      } catch (deepseekError) {
        console.error('תרגום DeepSeek נכשל, עובר לתרגום Google:', deepseekError);
        translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
        console.log('תוצאת תרגום הגיבוי של Google:', { success: !!translation, resultLength: translation?.length });
      }
    } else {
      // שירות לא מוכר — נפילה חזרה ל־Google
      console.warn('שירות תרגום לא מוכר, עובר ל־Google:', service);
      translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
    }
    return translation;
  } catch (error) {
    console.error('התרגום נכשל:', error);
    // הודעת שגיאה ידידותית למשתמש
    if (error.message.includes('API Key')) {
      return 'התרגום נכשל: שירות התרגום דורש מפתח API תקין';
    } else {
      return 'התרגום נכשל. בדוק את ההגדרות ואת חיבור האינטרנט';
    }
  }
}

// הוספת כפתור תרגום להודעה בודדת
function addTranslateButton(textElement) {
  // בדיקה שהכפתור לא קיים כבר
  if (textElement.querySelector('.translate-btn-container')) {
    return;
  }

  // זיהוי כיוון ההודעה — יוצאת (שלי) או נכנסת
  const isOutgoing = isOutgoingMessage(textElement);

  const translateBtn = document.createElement('button');
  translateBtn.className = 'translate-btn';
  translateBtn.innerHTML = 'תרגם';
  translateBtn.setAttribute('title', isOutgoing
    ? 'תרגם את ההודעה שלי לשפת הנמען'
    : 'תרגם הודעה זו לשפת היעד שבהגדרות');
  translateBtn.onclick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('כפתור תרגום ההודעה נלחץ', { isOutgoing });

    // איתור מיכל ההודעה — עם נפילה חזרה לשורת ההודעה (data-id)
    const messageWrapper = textElement.closest('div[data-pre-plain-text]') ||
                           textElement.closest('[data-id]');
    if (messageWrapper) {
      await translateMessage(messageWrapper);
    } else {
      console.error('לא נמצא מיכל ההודעה');
    }
  };

  // כפתור בחירת ההודעה — לשיחה צדדית עם הסוכן על הודעות נבחרות
  const selectBtn = document.createElement('button');
  selectBtn.className = 'nerai-select-btn';
  selectBtn.innerHTML = '☑';
  selectBtn.setAttribute('title', 'בחר הודעה — לשיחה עם NerAI על הודעות נבחרות');
  selectBtn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const messageWrapper = textElement.closest('div[data-pre-plain-text]') ||
                           textElement.closest('[data-id]');
    if (messageWrapper) {
      neraiToggleSelect(messageWrapper, textElement, selectBtn);
    }
  };

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'translate-btn-container';
  buttonContainer.appendChild(translateBtn);
  buttonContainer.appendChild(selectBtn);

  textElement.appendChild(buttonContainer);
}

// עיבוד הודעה — הוספת כפתור תרגום. מחזירה true אם נוסף כפתור
function processMessage(message) {
  if (message.dataset.neraiProcessed) return false;

  // איתור אלמנט הטקסט — עם סלקטור גיבוי
  const textContainer = message.querySelector('span.selectable-text') ||
                        message.querySelector('.selectable-text');
  if (!textContainer) {
    // הודעה בלי טקסט (תמונה/קול) או שעדיין בטעינה — ננסה שוב בסריקה הבאה
    return false;
  }

  message.classList.add('message-wrapper');
  message.style.position = 'relative';
  addTranslateButton(textContainer);
  message.dataset.neraiProcessed = 'true';
  return true;
}

// תרגום הודעה והצגת התוצאה מתחתיה
async function translateMessage(messageElement) {
  try {
    if (!messageElement) {
      console.error('translateMessage: אלמנט ההודעה לא קיים');
      return;
    }

    // איתור מיכל ההודעה
    let messageContainer = messageElement.closest('.message-container');

    if (!messageContainer) {
      if (messageElement.hasAttribute('data-id')) {
        // כשהגענו משורת הודעה (data-id) — התרגום נכנס לתוך השורה עצמה,
        // לא לאב שלה (האב הוא רשימת ההודעות כולה)
        messageContainer = messageElement;
      } else {
        // שיטת גיבוי: שימוש באלמנט האב או בהודעה עצמה
        messageContainer = messageElement.parentElement || messageElement;
      }
      messageContainer.classList.add('message-container');
    }

    // אם כבר יש תרגום — לחיצה נוספת מציגה/מסתירה אותו
    const existingTranslation = messageContainer.querySelector('.translation-content');
    if (existingTranslation) {
      const isHidden = existingTranslation.style.display === 'none';
      existingTranslation.style.display = isHidden ? 'block' : 'none';
      const thinkingContent = messageContainer.querySelector('.thinking-content');
      if (thinkingContent) {
        thinkingContent.style.display = isHidden ? 'block' : 'none';
      }
      return;
    }

    // מחוון טעינה
    const loadingElement = document.createElement('div');
    loadingElement.className = 'translation-loading';
    loadingElement.innerHTML = 'מתרגם<span class="loading-dots"></span>';
    messageContainer.appendChild(loadingElement);

    try {
      const textElement = messageElement.querySelector('.selectable-text');

      if (!textElement) {
        console.error('translateMessage: לא נמצא אלמנט טקסט');
        messageContainer.removeChild(loadingElement);
        return;
      }

      // איסוף תוכן הטקסט (כולל אימוג'ים)
      const text = collectTextContent(textElement);

      if (!text) {
        console.error('translateMessage: לא נמצא טקסט בהודעה');
        messageContainer.removeChild(loadingElement);
        return;
      }

      console.log('טקסט ההודעה המקורי:', text);

      // הודעה יוצאת (שלי) מתורגמת לשפת הנמען; נכנסת — לשפת היעד שבהגדרות
      const isOutgoing = isOutgoingMessage(messageElement);
      const translation = await translateText(text, isOutgoing ? getOutgoingLanguage() : null);
      console.log('התקבלה תוצאת תרגום:', translation);

      messageContainer.removeChild(loadingElement);

      if (translation) {
        // זיהוי מצב כהה
        const isDarkMode = document.body.classList.contains('dark') ||
                          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ||
                          document.documentElement.getAttribute('data-theme') === 'dark';

        // תוצאה עם תהליך חשיבה (מצב reasoning של OpenAI)
        if (typeof translation === 'object' && translation.hasThinking) {
          if (translation.thinking) {
            const thinkingElement = document.createElement('div');
            thinkingElement.className = 'thinking-content';

            if (isDarkMode) {
              thinkingElement.style.cssText = `
                background-color: rgba(20, 75, 150, 0.3);
                border-left: 3px solid #3b82f6;
                padding: 10px;
                margin-top: 5px;
                margin-bottom: 5px;
                font-size: 0.95em;
                color: #e0e0e0;
                white-space: pre-wrap;
                border-radius: 0 5px 5px 0;
                max-height: 300px;
                overflow-y: auto;
              `;
            } else {
              thinkingElement.style.cssText = `
                background-color: rgba(240, 247, 255, 0.8);
                border-left: 3px solid #2196F3;
                padding: 10px;
                margin-top: 5px;
                margin-bottom: 5px;
                font-size: 0.95em;
                color: #333;
                white-space: pre-wrap;
                border-radius: 0 5px 5px 0;
                max-height: 300px;
                overflow-y: auto;
              `;
            }

            thinkingElement.innerHTML = '';
            messageContainer.appendChild(thinkingElement);

            // אפקט מכונת כתיבה על תהליך החשיבה, ואז הצגת התרגום
            typeWriter(thinkingElement, translation.thinking, 5, () => {
              displayTranslationResult(messageContainer, translation.translation, isDarkMode);
            });
          } else {
            displayTranslationResult(messageContainer, translation.translation, isDarkMode);
          }
        } else {
          // תרגום רגיל
          displayTranslationResult(messageContainer, translation, isDarkMode);
        }
      }
    } catch (error) {
      console.error('שגיאת תרגום:', error);
      if (messageContainer.contains(loadingElement)) {
        loadingElement.textContent = `התרגום נכשל: ${error.message}`;
        loadingElement.className = 'translation-error';

        setTimeout(() => {
          if (messageContainer.contains(loadingElement)) {
            messageContainer.removeChild(loadingElement);
          }
        }, 3000);
      }
    }
  } catch (error) {
    console.error('שגיאה בפונקציית התרגום:', error);
  }
}

// אפקט מכונת כתיבה — הקלדה הדרגתית של טקסט
function typeWriter(element, text, speed = 10, callback) {
  let i = 0;

  element.classList.add('typing');

  // התאמת המהירות לאורך הטקסט
  let adjustedSpeed = speed;
  if (text.length > 1000) {
    adjustedSpeed = 1;
  } else if (text.length > 500) {
    adjustedSpeed = 3;
  }

  // השהיה משתנה לפי סוג התו — עצירה קלה בסימני פיסוק
  const getCharSpeed = (char) => {
    if (['.', '!', '?', '\n'].includes(char)) {
      return adjustedSpeed * 20;
    }
    if ([',', ';'].includes(char)) {
      return adjustedSpeed * 10;
    }
    return adjustedSpeed;
  };

  const typeNextChar = () => {
    if (i < text.length) {
      const char = text.charAt(i);
      element.textContent += char;
      i++;

      element.scrollTop = element.scrollHeight;

      setTimeout(typeNextChar, getCharSpeed(char));
    } else {
      element.classList.remove('typing');
      if (typeof callback === 'function') {
        // השהיה קצרה לפני ההמשך — נותנת למשתמש לקרוא
        setTimeout(callback, 500);
      }
    }
  };

  typeNextChar();

  // ממשק שליטה — עצירה או סיום מיידי
  return {
    stop: () => {
      i = text.length;
      element.classList.remove('typing');
    },
    finish: () => {
      element.textContent = text;
      element.classList.remove('typing');
      if (typeof callback === 'function') {
        callback();
      }
    }
  };
}

// הצגת תוצאת תרגום מתחת להודעה
function displayTranslationResult(container, translationText, isDarkMode) {
  const translationElement = document.createElement('div');
  translationElement.className = 'translation-content';

  if (isDarkMode) {
    translationElement.style.cssText = `
      background-color: rgba(124, 58, 237, 0.16);
      border-left: 3px solid #A78BFA;
      padding: 10px 12px;
      margin-top: 5px;
      font-size: 0.95em;
      white-space: pre-wrap;
      border-radius: 0 8px 8px 0;
      color: #e6e1f5;
    `;
  } else {
    translationElement.style.cssText = `
      background-color: rgba(237, 233, 254, 0.75);
      border-left: 3px solid #7C3AED;
      padding: 10px 12px;
      margin-top: 5px;
      font-size: 0.95em;
      white-space: pre-wrap;
      border-radius: 0 8px 8px 0;
      color: #2b2440;
    `;
  }

  translationElement.textContent = translationText;
  container.appendChild(translationElement);
}

// איסוף תוכן טקסט מהודעה — כולל אימוג'ים ושבירות שורה
function collectTextContent(element) {
  if (!element) return '';

  // עבודה על עותק כדי לא לגעת ב־DOM המקורי
  const elementClone = element.cloneNode(true);

  // הסרת כפתור התרגום מהעותק
  const translateBtn = elementClone.querySelector('.translate-btn-container');
  if (translateBtn) {
    translateBtn.remove();
  }

  let text = '';

  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      // אלמנטים ברמת בלוק ו־BR מייצרים שבירת שורה
      if (node.tagName === 'BR' ||
          window.getComputedStyle(node).display === 'block') {
        text += '\n';
      }

      // תמונות עם alt הן בדרך כלל אימוג'ים
      if (node.tagName === 'IMG' && node.alt) {
        text += node.alt;
      }

      for (const child of node.childNodes) {
        traverse(child);
      }
    }
  }

  traverse(elementClone);

  // ניקוי רווחים ושבירות שורה עודפים
  return text.trim()
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/gm, '');
}

// סריקה מלאה של כל ההודעות בעמוד — תופסת גם הודעות שנטענו בשלבים
// (הודעות יוצאות נבנות ב־DOM בהדרגה: קודם המעטפת ורק אחר כך הטקסט,
// ולכן בדיקת addedNodes בלבד מפספסת אותן)
let initialScanDone = false;
function scanForMessages() {
  const messages = document.querySelectorAll('div[data-pre-plain-text]');
  let newIncoming = 0;
  let newOutgoing = 0;

  messages.forEach(message => {
    if (processMessage(message)) {
      const outgoing = isOutgoingMessage(message);
      if (outgoing) {
        newOutgoing++;
      } else {
        newIncoming++;
        // תרגום אוטומטי — רק להודעות חדשות שהגיעו אחרי הטעינה,
        // לא להיסטוריה שנסרקת בסריקה הראשונה
        if (initialScanDone && autoTranslateIncoming) {
          autoTranslateIfNeeded(message);
        }
      }
    }
  });

  initialScanDone = true;

  if (newIncoming || newOutgoing) {
    console.log(`NerAI: נוספו כפתורי תרגום — ${newIncoming} להודעות נכנסות, ${newOutgoing} להודעות יוצאות`);
  }
}

// תרגום אוטומטי של הודעה נכנסת — מדלג אם היא כבר בשפת היעד
async function autoTranslateIfNeeded(message) {
  try {
    if (message.querySelector('.translation-content')) return;

    const textElement = message.querySelector('.selectable-text');
    if (!textElement) return;

    const text = collectTextContent(textElement);
    if (!text) return;

    const { targetLang } = await window.getTranslationSettings();

    // אם היעד עברית וההודעה כבר מכילה עברית — אין מה לתרגם
    if (targetLang === 'he' && /[\u0590-\u05FF]/.test(text)) return;

    console.log('NerAI: מתרגם אוטומטית הודעה נכנסת');
    await translateMessage(message);
  } catch (error) {
    console.error('שגיאה בתרגום האוטומטי:', error);
  }
}

// תזמון סריקה עם השהיה — מונע סריקות מיותרות בזמן שינויי DOM רצופים
let messageScanScheduled = false;
function scheduleMessageScan() {
  if (messageScanScheduled) return;
  messageScanScheduled = true;
  setTimeout(() => {
    messageScanScheduled = false;
    scanForMessages();
  }, 600);
}

// מעקב אחרי הודעות חדשות ב־DOM
function observeMessages() {
  console.log('מאתחל את מעקב ההודעות...');

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // חלון שיחה חדש נפתח — מוסיפים את קבוצת הכפתורים
        const main = document.querySelector('#main');
        if (main && !main.querySelector('.analysis-btn-container')) {
          console.log('זוהה חלון שיחה חדש, מוסיף את קבוצת הכפתורים...');
          addAnalysisButton(main);
        }

        // סריקת הודעות — מתוזמנת, על כל העמוד
        scheduleMessageScan();
        break;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // סריקה ראשונית של ההודעות הקיימות
  scanForMessages();

  // ניסיון ראשוני להוספת הכפתורים
  const main = document.querySelector('#main');
  if (main) {
    addAnalysisButton(main);
  }

  return () => {
    console.log('מנקה את מעקב ההודעות...');
    observer.disconnect();
  };
}

// כלי אבחון — הרץ window.NerAI_debug() בקונסול לקבלת תמונת מצב
window.NerAI_debug = function() {
  const rows = document.querySelectorAll('div[data-pre-plain-text]');
  const stats = {
    'סה"כ הודעות עם טקסט': rows.length,
    'הודעות יוצאות (שלי)': 0,
    'הודעות נכנסות': 0,
    'זוהו לפי data-id': 0,
    'זוהו לפי אייקון סטטוס (✓)': 0,
    'עם כפתור תרגום': 0,
    'יוצאות עם כפתור': 0
  };

  rows.forEach(row => {
    const out = isOutgoingMessage(row);
    if (out) stats['הודעות יוצאות (שלי)']++; else stats['הודעות נכנסות']++;

    const idHolder = row.closest('[data-id]');
    if (idHolder && /^(true|false)_/.test(idHolder.getAttribute('data-id') || '')) {
      stats['זוהו לפי data-id']++;
    }

    const scope = idHolder || row.parentElement?.parentElement?.parentElement?.parentElement || row;
    if (scope.querySelector && scope.querySelector(OUTGOING_STATUS_SELECTOR)) {
      stats['זוהו לפי אייקון סטטוס (✓)']++;
    }

    if (row.querySelector('.translate-btn')) {
      stats['עם כפתור תרגום']++;
      if (out) stats['יוצאות עם כפתור']++;
    }
  });

  // דוגמת data-id ראשונה לבדיקת הפורמט
  const firstId = document.querySelector('#main [data-id]');
  stats['דוגמת data-id'] = firstId ? firstId.getAttribute('data-id').substring(0, 30) + '...' : 'לא נמצא!';

  // אילו אייקונים בכלל קיימים באזור השיחה — עוזר לזהות שינויי שמות עתידיים
  const iconNames = new Set();
  document.querySelectorAll('#main span[data-icon]').forEach(el => iconNames.add(el.getAttribute('data-icon')));
  stats['אייקונים בעמוד'] = Array.from(iconNames).slice(0, 15).join(', ') || 'אין';

  console.table(stats);
  return stats;
};

// הזרקת סגנונות כלליים של התוסף
function injectStyles() {
  const styles = `
    .translate-btn-container {
      position: relative;
      display: inline-block;
      margin-left: 8px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    div[data-pre-plain-text]:hover .translate-btn-container {
      opacity: 1;
    }

    div[data-pre-plain-text] .translate-btn {
      background: linear-gradient(135deg, #7C3AED 0%, #5B4CF5 55%, #06B6D4 100%);
      color: white;
      border: none;
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 8px;
      opacity: 0.9;
      transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
      box-shadow: 0 2px 6px rgba(124, 58, 237, 0.35);
    }

    div[data-pre-plain-text] .translate-btn:hover {
      opacity: 1;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(124, 58, 237, 0.45);
    }

    .translation {
      color: #667781;
      font-size: 14px;
      margin-top: 4px;
      padding-left: 4px;
      border-left: 2px solid #7C3AED;
    }

    .translation p {
      margin: 4px 0;
    }

    .translation p:first-child {
      margin-top: 0;
    }

    .translation p:last-child {
      margin-bottom: 0;
    }

    .translation-loading {
      color: #667781;
      font-size: 13px;
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid #7C3AED;
      background-color: rgba(124, 58, 237, 0.05);
      border-radius: 0 4px 4px 0;
      display: flex;
      align-items: center;
    }

    /* התאמה למצב כהה */
    html[data-theme='dark'] .translation-loading,
    .dark .translation-loading {
      color: #aebac1;
      background-color: rgba(124, 58, 237, 0.12);
    }

    .loading-dots {
      display: inline-block;
      width: 20px;
      text-align: left;
      position: relative;
      margin-left: 4px;
    }

    .loading-dots:after {
      content: '';
      animation: ellipsis 1.5s infinite;
      position: absolute;
      left: 0;
    }

    @keyframes ellipsis {
      0% { content: '.'; }
      33% { content: '..'; }
      66% { content: '...'; }
      100% { content: '.'; }
    }

    .thinking-content {
      position: relative;
      overflow-y: auto;
      max-height: 300px;
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    }

    .thinking-content::-webkit-scrollbar {
      width: 6px;
    }

    .thinking-content::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }

    html[data-theme='dark'] .thinking-content::-webkit-scrollbar-thumb,
    .dark .thinking-content::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.2);
    }

    /* סמן הקלדה מהבהב */
    .thinking-content.typing::after {
      content: '|';
      display: inline-block;
      animation: blinkCursor 0.8s infinite;
      font-weight: normal;
      color: #666;
    }

    html[data-theme='dark'] .thinking-content.typing::after,
    .dark .thinking-content.typing::after {
      color: #ccc;
    }

    @keyframes blinkCursor {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    .translation-content {
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .translation-error {
      color: #e53935;
      font-size: 13px;
      margin-top: 4px;
      padding: 4px 8px;
      border-left: 2px solid #e53935;
      background-color: rgba(229, 57, 53, 0.05);
      border-radius: 0 4px 4px 0;
    }

    html[data-theme='dark'] .translation-error,
    .dark .translation-error {
      color: #ff6b6b;
      background-color: rgba(229, 57, 53, 0.1);
    }

    .analysis-btn-container {
      display: flex;
      align-items: center;
      margin-left: 12px;
      gap: 4px;
    }

    .analysis-panel {
      position: fixed;
      right: 20px;
      top: 20px;
      width: 380px;
      background: white;
      border-radius: 16px;
      border-top: 4px solid transparent;
      border-image: linear-gradient(90deg, #7C3AED, #06B6D4) 1;
      box-shadow: 0 12px 40px rgba(30, 27, 46, 0.18);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
      direction: rtl;
    }

    html[data-theme='dark'] .analysis-panel,
    .dark .analysis-panel {
      background: #1f2937;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .analysis-content {
      padding: 20px;
    }

    .analysis-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e9edef;
    }

    html[data-theme='dark'] .analysis-header,
    .dark .analysis-header {
      border-bottom: 1px solid #374151;
    }

    .analysis-header h3 {
      margin: 0;
      color: #41525d;
      font-size: 18px;
      font-weight: 600;
    }

    html[data-theme='dark'] .analysis-header h3,
    .dark .analysis-header h3 {
      color: #e5e7eb;
    }

    .close-btn {
      background: none;
      border: none;
      color: #8696a0;
      font-size: 22px;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    /* הבלטת שדה קלט שדורש מילוי */
    .input-required {
      animation: inputRequired 1.5s ease-in-out 3;
    }

    @keyframes inputRequired {
      0% {
        border-color: #e9edef;
        box-shadow: none;
      }
      50% {
        border-color: #ff3b30;
        box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.3);
        transform: translateY(-2px);
      }
      100% {
        border-color: #e9edef;
        box-shadow: none;
        transform: translateY(0);
      }
    }

    .analysis-section h4 {
      color: #41525d;
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 12px;
    }

    .analysis-mood {
      color: #667781;
      font-size: 14px;
      line-height: 1.5;
      padding: 12px 16px;
      background: #f0f2f5;
      border-radius: 8px;
    }

    .analysis-topics {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .topic-item {
      background: #EDE9FE;
      color: #6D28D9;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 500;
    }

    .analysis-attitudes {
      background: #f0f2f5;
      border-radius: 8px;
      padding: 12px 16px;
    }

    .attitude-item {
      margin-bottom: 8px;
      font-size: 14px;
      line-height: 1.5;
    }

    .attitude-item:last-child {
      margin-bottom: 0;
    }

    .attitude-label {
      color: #41525d;
      font-weight: 500;
    }

    .attitude-value {
      color: #667781;
    }

    .analysis-suggestions {
      margin-bottom: 16px;
    }

    .suggestion-item {
      background: #f0f2f5;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 8px;
      color: #667781;
      font-size: 14px;
      line-height: 1.5;
    }

    .suggested-reply {
      margin-top: 20px;
      padding: 16px;
      background: linear-gradient(135deg, #EDE9FE 0%, #E0F7FA 100%);
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.12);
    }

    .suggested-reply h4 {
      color: #5B21B6;
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .reply-text {
      position: relative;
      color: #111b21;
      font-size: 14px;
      line-height: 1.6;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.92);
      border-radius: 8px;
      border: 1px solid rgba(124, 58, 237, 0.25);
      white-space: pre-wrap;
    }

    /* כפתור העתקת התגובה המוצעת */
    .copy-reply-btn {
      background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 5px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: opacity 0.2s, transform 0.1s;
      font-family: inherit;
    }

    .copy-reply-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .copy-reply-btn.copied {
      background: #16A34A;
    }

    .analysis-loading {
      padding: 40px 20px;
      text-align: center;
      color: #667781;
      font-size: 14px;
    }

    /* רשימת ההודעות בפאנל הניתוח */
    .chat-list {
      border: 1px solid #e9edef;
      border-radius: 8px;
      max-height: 400px;
      overflow-y: auto;
      background-color: #fff;
      margin: 12px 0;
    }

    .chat-list-header {
      background-color: #f0f2f5;
      padding: 12px;
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e9edef;
    }

    .chat-list-header label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #41525d;
      font-size: 14px;
    }

    .chat-list-header input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .selected-count {
      color: #667781;
      font-size: 13px;
    }

    .chat-message {
      display: flex;
      align-items: flex-start;
      padding: 12px;
      border-bottom: 1px solid #e9edef;
      transition: background-color 0.2s;
    }

    .chat-message:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .chat-message.me {
      background-color: rgba(217, 253, 211, 0.1);
    }

    .chat-message.other {
      background-color: #ffffff;
    }

    .message-select {
      display: flex;
      align-items: center;
      padding: 0 12px;
    }

    .message-select input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .message-sender {
      font-size: 13px;
      font-weight: 500;
    }

    .sender-me {
      color: #1fa855;
    }

    .sender-other {
      color: #53bdeb;
    }

    .message-time {
      color: #667781;
      font-size: 12px;
    }

    .message-text {
      color: #111b21;
      font-size: 14px;
      line-height: 1.4;
      word-break: break-word;
    }

    .analysis-actions {
      padding: 16px 0 0;
      text-align: left;
    }

    .start-analysis {
      background: linear-gradient(135deg, #7C3AED 0%, #5B4CF5 55%, #06B6D4 100%);
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
    }

    .start-analysis:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    .start-analysis:disabled {
      background: #cccccc;
      cursor: not-allowed;
    }

    .chat-list::-webkit-scrollbar {
      width: 6px;
    }

    .chat-list::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    .chat-list::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }

    .chat-list::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }

    .prompt-input {
      margin-bottom: 16px;
    }

    .prompt-input label {
      display: block;
      margin-bottom: 8px;
      color: #41525d;
      font-size: 14px;
    }

    .prompt-input textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid #e9edef;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.5;
      resize: vertical;
      font-family: inherit;
    }

    .prompt-input textarea:focus {
      outline: none;
      border-color: #7C3AED;
      box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.12);
    }

    .settings-section {
      margin-bottom: 24px;
    }

    .settings-section h4 {
      color: #41525d;
      font-size: 16px;
      margin: 0 0 16px;
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

// הוספת קבוצת הכפתורים (הגדרות / תרגום הכל / ניתוח AI) לכותרת השיחה
function addAnalysisButton(messageContainer) {
  // מניעת הוספה כפולה
  if (messageContainer.querySelector('.analysis-btn-container')) {
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'analysis-btn-container';
  buttonContainer.innerHTML = `
    <button class="settings-btn" title="הגדרות NerAI">
      <svg viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor">
        <path d="M998.4 358.4c-12.8 6.4-32 12.8-44.8 12.8-38.4 0-76.8-19.2-96-57.6-32-51.2-12.8-115.2 32-147.2-70.4-76.8-160-128-262.4-153.6-6.4 57.6-57.6 102.4-115.2 102.4S403.2 70.4 396.8 12.8c-102.4 25.6-192 76.8-262.4 153.6 44.8 32 57.6 96 32 147.2-19.2 38.4-57.6 57.6-96 57.6-12.8 0-32 0-44.8-12.8C6.4 409.6 0 460.8 0 512s6.4 102.4 25.6 153.6c12.8-6.4 32-12.8 44.8-12.8 38.4 0 76.8 19.2 96 57.6 32 51.2 12.8 115.2-32 147.2 70.4 76.8 160 128 262.4 153.6 6.4-57.6 51.2-102.4 115.2-102.4s108.8 44.8 115.2 102.4c102.4-25.6 192-76.8 262.4-153.6-44.8-32-57.6-96-32-147.2 19.2-38.4 57.6-57.6 96-57.6 12.8 0 32 0 44.8 12.8 19.2-51.2 25.6-102.4 25.6-153.6s-6.4-102.4-25.6-153.6z m-44.8 230.4c-64 0-121.6 32-153.6 89.6-32 57.6-32 121.6 0 172.8-38.4 32-89.6 64-134.4 76.8-32-44.8-89.6-83.2-153.6-83.2s-121.6 32-153.6 89.6c-51.2-19.2-96-44.8-134.4-76.8 32-51.2 32-121.6 0-172.8-32-57.6-89.6-96-153.6-96C64 563.2 64 537.6 64 512s0-51.2 6.4-76.8c64 0 121.6-32 153.6-89.6 32-57.6 32-121.6 0-172.8 38.4-32 83.2-64 134.4-76.8 32 44.8 89.6 83.2 153.6 83.2s121.6-32 153.6-89.6c51.2 19.2 96 44.8 134.4 76.8-32 51.2-32 121.6 0 172.8 32 51.2 89.6 89.6 153.6 89.6 6.4 32 6.4 57.6 6.4 83.2s0 51.2-6.4 76.8zM512 320C403.2 320 320 403.2 320 512s83.2 192 192 192 192-83.2 192-192-83.2-192-192-192z m0 320c-70.4 0-128-57.6-128-128s57.6-128 128-128 128 57.6 128 128-57.6 128-128 128z"/>
      </svg>
    </button>
    <button class="translate-all-btn" title="תרגום כל ההודעות">
      <svg viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor">
        <path d="M666.296 824.08c-12.56-30.72-54.224-83.312-123.576-156.384-18.616-19.552-17.456-34.448-10.704-78.896v-5.12c4.424-30.48 12.104-48.4 114.504-64.696 52.128-8.144 65.624 12.56 84.712 41.424l6.28 9.544a101 101 0 0 0 51.44 41.656c9.072 4.192 20.24 9.312 35.368 17.92 36.768 20.24 36.768 43.28 36.768 94.024v5.816a215.28 215.28 0 0 1-41.424 139.632 472.44 472.44 0 0 1-152.2 88.208c27.92-52.368 6.512-114.504 0-132.424l-1.168-0.696zM512 40.96a468.016 468.016 0 0 1 203.872 46.544 434.504 434.504 0 0 0-102.872 82.616c-7.44 10.24-13.728 19.784-19.776 28.632-19.552 29.552-29.096 42.816-46.544 44.912a200.84 200.84 0 0 1-33.752 0c-34.208-2.32-80.752-5.12-95.648 35.376-9.544 25.84-11.168 95.648 19.552 131.96 5.28 8.616 6.224 19.2 2.56 28.624a56.08 56.08 0 0 1-16.528 25.832 151.504 151.504 0 0 1-23.272-23.28 151.28 151.28 0 0 0-66.56-52.824c-10-2.792-21.176-5.12-31.88-7.44-30.256-6.288-64.24-13.504-72.152-30.496a119.16 119.16 0 0 1-5.816-46.544 175.48 175.48 0 0 0-11.168-74 70.984 70.984 0 0 0-44.456-39.568A469.64 469.64 0 0 1 512 40.96zM0 512c0 282.768 229.232 512 512 512 282.768 0 512-229.232 512-512 0-282.768-229.232-512-512-512C229.232 0 0 229.232 0 512z"/>
      </svg>
    </button>
    <button class="analysis-btn" title="ניתוח שיחה עם AI">
      <svg viewBox="0 0 1024 1024" width="24" height="24" fill="currentColor">
        <path d="M535.311 49.212a343.944 343.944 0 0 1 330.752 249.615h-84.149a264.614 264.614 0 0 0-59.331-92.702 263.65 263.65 0 0 0-187.272-77.402h-82.16a264.192 264.192 0 0 0-264.735 264.794v58.73a42.104 42.104 0 0 1-3.132 15.54l-87.1 203.415 83.606 16.806c18.553 3.553 31.925 19.877 31.925 38.912v106.496c0 23.13 4.096 39.273 9.818 50.959 5.783 11.625 12.89 19.395 21.745 25.84 17.71 12.65 45.297 18.01 69.632 17.89 16.746 0 32.286-2.53 37.587-3.975 48.248-12.89 132.096-36.081 203.716-55.959 71.68-19.817 131.011-36.382 131.072-36.382l21.504 76.499c-0.12 0.12-238.17 66.56-335.812 92.642a242.748 242.748 0 0 1-58.067 6.746 219.738 219.738 0 0 1-85.775-16.263 148.119 148.119 0 0 1-77.04-72.343c-11.807-24.094-17.89-52.947-17.89-85.654v-73.97l-99.63-19.937a40.237 40.237 0 0 1-27.347-20.54 40.297 40.297 0 0 1-1.385-34.033l103.183-241.002v-50.417A344.124 344.124 0 0 1 453.15 49.212zM734.45 382.615l126.615 394.54h-94.992l-24.214-88.184H618.014l-27.106 88.125h-89.57l131.313-394.481H734.45z m259.915 0v394.48h-92.642v-394.48h92.642zM683.008 458.27h-1.205L635 622.23h88.607l-40.599-163.96z"/>
      </svg>
    </button>
    <button class="nerai-chat-header-btn" title="צ'אט עם סוכן NerAI — על השיחה הנוכחית או על הודעות שסימנת">
      <span style="font-size:17px;line-height:1;">💬</span>
    </button>
  `;

  // כפתור הגדרות
  buttonContainer.querySelector('.settings-btn').addEventListener('click', () => {
    showSettingsModal();
  });

  // כפתור תרגום כל ההודעות — עם דיאלוג אישור
  buttonContainer.querySelector('.translate-all-btn').addEventListener('click', async () => {
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
      <div class="confirm-content" dir="rtl">
        <h3>אישור תרגום מרוכז</h3>
        <p>פעולה זו תתרגם באמצעות Google את כל ההודעות המוצגות כרגע בשיחה.</p>
        <p style="color: #6D28D9; margin-top: 8px;">שים לב: התרגום המרוכז משתמש תמיד ב־Google Translate, ללא מודלי AI וללא תהליך חשיבה.</p>
        <div class="confirm-buttons">
          <button class="cancel-btn">ביטול</button>
          <button class="confirm-btn">תרגם הכל</button>
        </div>
      </div>
    `;

    const dialogStyles = `
      .confirm-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .confirm-content {
        background: white;
        border-radius: 8px;
        padding: 20px;
        width: 90%;
        max-width: 400px;
      }

      .confirm-content h3 {
        margin: 0 0 12px;
        color: #41525d;
        font-size: 16px;
      }

      .confirm-content p {
        margin: 0 0 20px;
        color: #667781;
        font-size: 14px;
        line-height: 1.5;
      }

      .confirm-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      .confirm-buttons button {
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .cancel-btn {
        background: #f0f2f5;
        color: #667781;
      }

      .cancel-btn:hover {
        background: #e9edef;
      }

      .confirm-btn {
        background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%);
        color: white;
        font-weight: 600;
      }

      .confirm-btn:hover {
        opacity: 0.92;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = dialogStyles;
    document.head.appendChild(styleElement);

    document.body.appendChild(confirmDialog);

    confirmDialog.querySelector('.cancel-btn').onclick = () => {
      confirmDialog.remove();
    };

    confirmDialog.querySelector('.confirm-btn').onclick = async () => {
      confirmDialog.remove();
      await translateAllMessages(messageContainer);
    };

    // לחיצה על הרקע סוגרת את הדיאלוג
    confirmDialog.addEventListener('click', (e) => {
      if (e.target === confirmDialog) {
        confirmDialog.remove();
      }
    });
  });

  // כפתור ניתוח AI
  buttonContainer.querySelector('.analysis-btn').addEventListener('click', async () => {
    await analyzeConversation(messageContainer);
  });

  // כפתור צ'אט עם הסוכן — נפתח עם ההודעות שסומנו, או עם השיחה האחרונה
  buttonContainer.querySelector('.nerai-chat-header-btn').addEventListener('click', () => {
    openNeraiSideChat();
  });

  const styles = `
    .analysis-btn-container {
      display: flex;
      align-items: center;
      margin-left: 12px;
      gap: 4px;
    }

    .settings-btn,
    .translate-all-btn,
    .analysis-btn,
    .nerai-chat-header-btn {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: #8696a0;
      border-radius: 50%;
      transition: all 0.2s;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .settings-btn:hover,
    .translate-all-btn:hover,
    .analysis-btn:hover,
    .nerai-chat-header-btn:hover {
      background-color: rgba(124, 58, 237, 0.1);
      color: #7C3AED;
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);

  // הוספה לכותרת השיחה
  const header = messageContainer.querySelector('header');
  if (header) {
    header.appendChild(buttonContainer);
  }
}

// תרגום מרוכז של כל ההודעות המוצגות (תמיד דרך Google)
async function translateAllMessages(messageContainer) {
  const notificationId = showToast('מתרגם את כל ההודעות באמצעות Google...', 'info', 0);

  try {
    // שפת היעד מההגדרות
    const { targetLang } = await window.getTranslationSettings();

    const messages = messageContainer.querySelectorAll('div[data-pre-plain-text]');
    let translatedCount = 0;

    for (const message of messages) {
      if (!message.querySelector('.translation-content')) {
        try {
          const textElement = message.querySelector('.selectable-text');
          if (textElement) {
            const text = collectTextContent(textElement);
            if (text) {
              let msgContainer = message.closest('.message-container');
              if (!msgContainer) {
                msgContainer = message.parentElement || message;
                msgContainer.classList.add('message-container');
              }

              // תמיד Google בתרגום מרוכז — מהיר וחינמי
              const translation = await window.ApiServices.translation.google(text, 'auto', targetLang);

              if (translation) {
                const isDarkMode = document.body.classList.contains('dark') ||
                                  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ||
                                  document.documentElement.getAttribute('data-theme') === 'dark';

                const translationElement = document.createElement('div');
                translationElement.className = 'translation-content';

                if (isDarkMode) {
                  translationElement.style.cssText = `
                    background-color: rgba(6, 182, 212, 0.12);
                    border-left: 3px solid #22D3EE;
                    color: #e2e2e2;
                    padding: 8px 12px;
                    margin-top: 5px;
                    font-size: 14px;
                    border-radius: 0 8px 8px 0;
                    position: relative;
                    animation: fadeIn 0.3s ease-in-out;
                  `;
                } else {
                  translationElement.style.cssText = `
                    background-color: rgba(224, 247, 250, 0.75);
                    border-left: 3px solid #06B6D4;
                    color: #164e63;
                    padding: 8px 12px;
                    margin-top: 5px;
                    font-size: 14px;
                    border-radius: 0 8px 8px 0;
                    position: relative;
                    animation: fadeIn 0.3s ease-in-out;
                  `;
                }

                translationElement.textContent = translation;
                msgContainer.appendChild(translationElement);
                translatedCount++;

                // עדכון ההתקדמות בהתראה
                if (translatedCount % 5 === 0 || translatedCount === messages.length) {
                  const toastElement = document.getElementById(notificationId);
                  if (toastElement && toastElement.querySelector('.toast-content')) {
                    toastElement.querySelector('.toast-content').textContent =
                      `מתרגם את כל ההודעות... (${translatedCount}/${messages.length})`;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('תרגום הודעה נכשל:', error);
          // ממשיכים להודעה הבאה גם אם אחת נכשלה
          continue;
        }
      }
    }

    // הודעת סיום
    const toastElement = document.getElementById(notificationId);
    if (toastElement && toastElement.querySelector('.toast-content')) {
      toastElement.querySelector('.toast-content').textContent =
        `התרגום המרוכז הושלם! תורגמו ${translatedCount} הודעות`;
      setTimeout(() => {
        if (document.getElementById(notificationId)) {
          document.getElementById(notificationId).remove();
        }
      }, 3000);
    }
  } catch (error) {
    console.error('התרגום המרוכז נכשל:', error);
    const toastElement = document.getElementById(notificationId);
    if (toastElement) {
      if (toastElement.querySelector('.toast-content')) {
        toastElement.querySelector('.toast-content').textContent =
          `התרגום המרוכז נכשל: ${error.message || 'שגיאה לא ידועה'}`;
      }
      toastElement.className = toastElement.className.replace('info', 'error');
      setTimeout(() => {
        if (document.getElementById(notificationId)) {
          document.getElementById(notificationId).remove();
        }
      }, 3000);
    }
  }
}

// ניתוח שיחה עם AI — בחירת הודעות ושליחה למודל
async function analyzeConversation(messageContainer) {
  try {
    // בדיקה שתכונת ה־AI מופעלת
    const aiEnabled = await checkAiEnabled();
    if (!aiEnabled) {
      const toast = document.createElement('div');
      toast.className = 'settings-toast error';
      toast.textContent = 'ניתוח ה־AI כבוי. הפעל אותו בהגדרות והזן מפתח API';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      // פתיחת ההגדרות והפעלת המתג אוטומטית
      setTimeout(() => {
        showSettingsModal();

        setTimeout(() => {
          const aiEnabledCheckbox = document.getElementById('aiEnabled');
          if (aiEnabledCheckbox && !aiEnabledCheckbox.checked) {
            aiEnabledCheckbox.checked = true;
            aiEnabledCheckbox.dispatchEvent(new Event('change'));
          }

          // הבלטת שדה המפתח של השירות הנבחר
          const aiApiSelect = document.getElementById('aiApi');
          if (aiApiSelect) {
            const service = aiApiSelect.value;
            const aiApiInput = document.getElementById(`${service}ApiKey_ai`);

            if (aiApiInput) {
              aiApiInput.classList.add('input-required');
              aiApiInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              aiApiInput.focus();

              const handleInput = () => {
                aiApiInput.classList.remove('input-required');
                aiApiInput.removeEventListener('input', handleInput);
              };

              aiApiInput.addEventListener('input', handleInput);

              setTimeout(() => {
                aiApiInput.classList.remove('input-required');
              }, 5000);
            }
          }
        }, 300);
      }, 500);

      return;
    }

    // בדיקה שהוגדר מפתח API
    const { service, apiKey, apiUrl, model } = await window.getAiService();
    if (!apiKey) {
      const toast = document.createElement('div');
      toast.className = 'settings-toast error';
      toast.textContent = `הזן קודם בהגדרות מפתח API לניתוח ${service === 'deepseek' ? 'DeepSeek' : 'OpenAI'}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      // פתיחת ההגדרות והבלטת שדה המפתח
      setTimeout(() => {
        showSettingsModal();

        setTimeout(() => {
          const aiApiInput = document.getElementById(`${service}ApiKey_ai`);

          if (aiApiInput) {
            const aiEnabledCheckbox = document.getElementById('aiEnabled');
            if (aiEnabledCheckbox && !aiEnabledCheckbox.checked) {
              aiEnabledCheckbox.checked = true;
              aiEnabledCheckbox.dispatchEvent(new Event('change'));
            }

            const aiApiSelect = document.getElementById('aiApi');
            if (aiApiSelect && aiApiSelect.value !== service) {
              aiApiSelect.value = service;
              aiApiSelect.dispatchEvent(new Event('change'));
            }

            aiApiInput.classList.add('input-required');
            aiApiInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            aiApiInput.focus();

            const handleInput = () => {
              aiApiInput.classList.remove('input-required');
              aiApiInput.removeEventListener('input', handleInput);
            };

            aiApiInput.addEventListener('input', handleInput);

            setTimeout(() => {
              aiApiInput.classList.remove('input-required');
            }, 5000);
          }
        }, 300);
      }, 500);

      return;
    }

    // פאנל בחירת ההודעות לניתוח
    const panel = document.createElement('div');
    panel.className = 'analysis-panel';
    panel.innerHTML = `
      <div class="analysis-content">
        <div class="analysis-header">
          <h3>בחר הודעות לניתוח</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="chat-list">
          <div class="chat-list-header">
            <label>
              <input type="checkbox" class="select-all">
              בחר הכל
            </label>
            <span class="selected-count"></span>
          </div>
          <div class="chat-messages"></div>
        </div>
        <div class="custom-ask" style="margin: 4px 0 10px;">
          <textarea class="custom-ask-text" rows="2" placeholder='בקשה חופשית לסוכן (רשות) — למשל: "סכם את השיח ותעד אם דובר על באגים"' style="width: 100%; padding: 10px; border: 1px solid #e9edef; border-radius: 8px; font-size: 13px; font-family: inherit; box-sizing: border-box; resize: vertical;"></textarea>
        </div>
        <div class="analysis-actions" style="display: flex; align-items: center; justify-content: flex-start; gap: 8px;">
          <button class="start-analysis">ניתוח מלא</button>
          <button class="ask-agent-btn" style="background: linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">💬 שאל את הסוכן</button>
          <button class="export-chat" style="background: #f5f5f5; border: 1px solid #ddd; color: #666; padding: 8px 16px; border-radius: 8px; cursor: pointer; margin-right: auto;">ייצוא</button>
        </div>
      </div>
    `;

    messageContainer.appendChild(panel);

    const startButton = panel.querySelector('.start-analysis');
    const exportButton = panel.querySelector('.export-chat');

    // איסוף ההודעות מהשיחה
    const messageElements = messageContainer.querySelectorAll('div[data-pre-plain-text]');
    const chatList = panel.querySelector('.chat-messages');

    messageElements.forEach(element => {
      const preText = element.getAttribute('data-pre-plain-text');
      let time = '';
      let text = '';
      // זיהוי הודעות שלי + שם השולח האמיתי (חשוב בקבוצות)
      let isMe = isOutgoingMessage(element);
      let sender = getMessageSender(element);

      // חילוץ השעה מהמאפיין data-pre-plain-text
      if (preText) {
        const timeMatch = preText.match(/(\d{1,2}:\d{2}(?:\s*(?:AM|PM)?)?)/);
        if (timeMatch) {
          time = timeMatch[1];
        }
      }

      // חילוץ טקסט ההודעה (בלי כפתור התרגום)
      const textElement = element.querySelector('span.selectable-text');
      if (textElement) {
        const textClone = textElement.cloneNode(true);
        const translateBtn = textClone.querySelector('.translate-btn-container');
        if (translateBtn) {
          translateBtn.remove();
        }
        text = textClone.textContent.trim();
      }

      // מוסיפים לרשימה רק הודעות עם תוכן
      if (text) {
        const messageItem = document.createElement('div');
        messageItem.className = `chat-message ${isMe ? 'me' : 'other'}`;
        messageItem.innerHTML = `
          <label class="message-select">
            <input type="checkbox" data-sender="${sender}" data-text="${text.replace(/"/g, '&quot;')}" data-time="${time}" checked>
          </label>
          <div class="message-content">
            <div class="message-header">
              <span class="message-sender ${isMe ? 'sender-me' : 'sender-other'}">${sender}</span>
              <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${text}</div>
          </div>
        `;
        chatList.appendChild(messageItem);
      }
    });

    // עדכון מונה ההודעות שנבחרו ומצב הכפתורים
    const updateSelectionStatus = () => {
      const selectedCount = panel.querySelectorAll('.chat-message input[type="checkbox"]:checked').length;
      const totalCount = panel.querySelectorAll('.chat-message input[type="checkbox"]').length;
      const selectedCountElement = panel.querySelector('.selected-count');

      selectedCountElement.textContent = `נבחרו ${selectedCount}/${totalCount} הודעות`;
      startButton.disabled = selectedCount === 0;
      exportButton.disabled = selectedCount === 0;
    };

    updateSelectionStatus();

    panel.querySelectorAll('.chat-message input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', updateSelectionStatus);
    });

    // תיבת "בחר הכל"
    const selectAllCheckbox = panel.querySelector('.select-all');
    selectAllCheckbox.checked = true;
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      panel.querySelectorAll('.chat-message input[type="checkbox"]').forEach(cb => {
        cb.checked = isChecked;
      });
      updateSelectionStatus();
    });

    // ייצוא השיחה לקובץ טקסט
    exportButton.addEventListener('click', () => {
      try {
        // שם איש הקשר מכותרת השיחה
        let headerName = '';
        const headerElement = document.querySelector('span.x1iyjqo2.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft.x1rg5ohu._ao3e');
        if (headerElement) {
          headerName = headerElement.textContent.trim() || 'איש קשר לא ידוע';
        } else {
          // סלקטור גיבוי
          const backupElement = document.querySelector('[data-testid="conversation-info-header-chat-title"], ._amig, .xliyjgo2');
          headerName = backupElement ? backupElement.textContent.trim() : 'איש קשר לא ידוע';
          console.log('נעשה שימוש בסלקטור הגיבוי לכותרת:', headerName);
        }

        const messages = document.querySelectorAll('.copyable-text[data-pre-plain-text]');
        let chatContent = `שיחה יוצאה בתאריך: ${new Date().toLocaleString('he-IL')}\n`;
        chatContent += `איש קשר: ${headerName}\n\n`;

        messages.forEach(msg => {
          try {
            const preText = msg.getAttribute('data-pre-plain-text') || '';
            // רק הטקסט המקורי — בלי כפתור התרגום והתוצאות
            const messageText = msg.querySelector('.selectable-text')?.textContent || '';

            // הסרת הטקסט של כפתור התרגום אם נדבק לסוף ההודעה
            const cleanedText = messageText.replace(/תרגם$/, '');

            if (cleanedText) {
              chatContent += `${preText}${cleanedText}\n`;
            }
          } catch (err) {
            console.warn('שגיאה בעיבוד הודעה בודדת:', err);
          }
        });

        // יצירת הקובץ והורדתו
        const fileName = `WhatsApp-${headerName}-${new Date().toLocaleDateString('he-IL').replace(/\./g, '-')}.txt`;
        const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('השיחה יוצאה בהצלחה, איש קשר:', headerName);
      } catch (error) {
        console.error('שגיאה בייצוא השיחה:', error);
      }
    });

    // כפתור "התחל ניתוח"
    startButton.addEventListener('click', async () => {
      try {
        console.log('כפתור התחל ניתוח נלחץ');

        const selectedMessages = Array.from(panel.querySelectorAll('.chat-message input[type="checkbox"]:checked'))
          .map(cb => ({
            sender: cb.dataset.sender,
            text: cb.dataset.text
          }));

        console.log('מספר ההודעות שנבחרו:', selectedMessages.length);

        if (selectedMessages.length === 0) {
          console.warn('לא נבחרו הודעות, הניתוח בוטל');
          return;
        }

        // מצב טעינה
        panel.innerHTML = `
          <div class="analysis-loading">
            <span>ה־AI מנתח את השיחה...</span>
            <div class="loading-dots"></div>
          </div>
        `;

        const { service, apiKey, apiUrl, model } = await window.getAiService();
        console.log('שירות ה־AI בשימוש:', service);

        // שליחת הבקשה למודל
        let analysis;
        if (service === 'siliconflow') {
          analysis = await window.ApiServices.analysis.siliconflow(selectedMessages, apiKey, apiUrl, model);
        } else {
          analysis = await window.ApiServices.analysis[service](selectedMessages, apiKey);
        }
        console.log('התקבלה תוצאת ניתוח מה־AI');

        showAnalysisResult(messageContainer, analysis);

      } catch (error) {
        console.error('שגיאה בתהליך הניתוח:', {
          errorName: error.name,
          errorMessage: error.message
        });
        showAnalysisError(messageContainer, error.message);
      }
    });

    // כפתור "שאל את הסוכן" — בקשה חופשית על ההודעות שנבחרו, בצ'אט הצדדי
    panel.querySelector('.ask-agent-btn').addEventListener('click', () => {
      const selectedItems = Array.from(panel.querySelectorAll('.chat-message input[type="checkbox"]:checked'))
        .map(cb => ({
          sender: cb.dataset.sender,
          text: cb.dataset.text
        }));

      if (selectedItems.length === 0) {
        console.warn('לא נבחרו הודעות לשאילת הסוכן');
        return;
      }

      const question = panel.querySelector('.custom-ask-text').value.trim();
      panel.remove();

      openNeraiSideChat({
        items: selectedItems,
        initialQuestion: question || null
      });
    });

    // כפתור סגירה
    panel.querySelector('.close-btn').addEventListener('click', () => {
      panel.remove();
    });

  } catch (error) {
    console.error('שגיאת ניתוח:', error);
    showAnalysisError(messageContainer, error.message);
  }
}

// בדיקה האם תכונת ה־AI מופעלת בהגדרות
function checkAiEnabled() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['aiEnabled'], (data) => {
      const enabled = data.aiEnabled === true;
      console.log('תכונת ה־AI מופעלת:', enabled);
      resolve(enabled);
    });
  });
}

// הצגת תוצאות הניתוח בפאנל
function showAnalysisResult(container, analysis) {
  const panel = container.querySelector('.analysis-panel');
  if (!panel) return;

  // פירוק הטקסט שהמודל החזיר לחלקים מובנים
  // הפורמט הצפוי (מוגדר ב־api-services.js): אווירת השיחה / נושאים מרכזיים /
  // עמדות הצדדים / אופן תגובה מומלץ / דוגמת תגובה מומלצת
  function parseAnalysis(text) {
    const result = {
      mood: '',
      topics: [],
      attitudes: {
        me: '',
        other: ''
      },
      suggestions: [],
      suggestedReply: ''
    };

    try {
      console.log('מתחיל לפרק את תוצאת הניתוח');

      if (!text || typeof text !== 'string') {
        console.error('טקסט ניתוח לא תקין:', text);
        return result;
      }

      // חילוץ דוגמת התגובה — תמיכה בכמה פורמטים של מרכאות
      const replyPatterns = [
        /דוגמת תגובה( מומלצת)?[：:]\s*[""]([^""]+)[""]/,
        /דוגמת תגובה( מומלצת)?[：:]\s*"([^"]+)"/,
        /תגובה מומלצת[：:]\s*"([^"]+)"/,
        /דוגמה[：:]\s*"([^"]+)"/,
        /[""]([^""]{10,})[""]/,
        /"([^"]{10,})"/
      ];

      for (const pattern of replyPatterns) {
        const match = text.match(pattern);
        if (match) {
          // הקבוצה האחרונה במבע היא תוכן התגובה
          const reply = (match[match.length - 1] || '').trim();
          result.suggestedReply = reply.replace(/^\[(.*)\]$/, '$1').trim();
          console.log('נמצאה דוגמת תגובה מומלצת');
          break;
        }
      }

      const cleanText = text.replace(/\r\n/g, '\n');

      // פיצול לפסקאות
      let sections = [];
      if (cleanText.includes('\n\n')) {
        sections = cleanText.split('\n\n');
      } else {
        // אין שורות ריקות — מזהים כותרות מוכרות ומקבצים לפיהן
        sections = cleanText.split('\n')
          .filter(line => line.trim())
          .reduce((acc, line) => {
            if (/^(אווירת השיחה|נושאים מרכזיים|עמדות הצדדים|אופן תגובה מומלץ|דוגמת תגובה)/.test(line)) {
              acc.push(line);
            } else if (acc.length > 0) {
              acc[acc.length - 1] += '\n' + line;
            }
            return acc;
          }, []);
      }

      console.log('מספר הפסקאות שזוהו:', sections.length);

      for (const section of sections) {
        const lines = section.trim().split('\n');
        const title = lines[0].trim();

        // אווירת השיחה
        if (/אווירת השיחה|אווירה/.test(title)) {
          if (lines.length <= 1) {
            const moodMatch = cleanText.match(/אווירה[：:]?\s*(.+)/);
            if (moodMatch) {
              result.mood = moodMatch[1].replace(/[\[\]]/g, '').trim();
            }
          } else {
            result.mood = lines.slice(1).join(' ')
              .replace(/[\[\]]/g, '')
              .trim();
          }
        }

        // נושאים מרכזיים
        else if (/נושאים מרכזיים|נושאים/.test(title)) {
          const topicContent = lines.slice(1).join(' ');

          let topics = [];

          if (topicContent.includes('.') || topicContent.includes(';')) {
            topics = topicContent
              .replace(/[\[\]]/g, '')
              .split(/[.;]/)
              .map(t => t.trim())
              .filter(t => t);
          } else {
            // כנראה רשימה — מפצלים לפי שורות
            topics = lines.slice(1)
              .map(line => line.replace(/^[\d\-•]+[\s.]*|[\[\]]/g, '').trim())
              .filter(t => t);
          }

          if (topics.length > 0) {
            result.topics = topics;
          }
        }

        // עמדות הצדדים
        else if (/עמדות הצדדים|עמדות/.test(title)) {
          const mePatterns = [
            /העמדה שלי[：:]\s*(.+)/,
            /עמדתי[：:]\s*(.+)/,
            /אני[：:]\s*(.+)/
          ];

          const otherPatterns = [
            /עמדת הצד השני[：:]\s*(.+)/,
            /הצד השני[：:]\s*(.+)/,
            /עמדת השני[：:]\s*(.+)/
          ];

          for (const line of lines) {
            for (const pattern of mePatterns) {
              const match = line.match(pattern);
              if (match) {
                result.attitudes.me = match[1].replace(/[\[\]]/g, '').trim();
                break;
              }
            }

            for (const pattern of otherPatterns) {
              const match = line.match(pattern);
              if (match) {
                result.attitudes.other = match[1].replace(/[\[\]]/g, '').trim();
                break;
              }
            }
          }

          // חיפוש בכל הטקסט אם לא נמצא בפסקה
          if (!result.attitudes.me) {
            for (const pattern of mePatterns) {
              const match = cleanText.match(pattern);
              if (match) {
                result.attitudes.me = match[1].replace(/[\[\]]/g, '').trim();
                break;
              }
            }
          }

          if (!result.attitudes.other) {
            for (const pattern of otherPatterns) {
              const match = cleanText.match(pattern);
              if (match) {
                result.attitudes.other = match[1].replace(/[\[\]]/g, '').trim();
                break;
              }
            }
          }
        }

        // אופן תגובה מומלץ
        else if (/אופן תגובה|המלצות תגובה|אסטרטגיית תגובה/.test(title)) {
          const suggestions = [];

          for (const line of lines.slice(1)) {
            const cleanLine = line.replace(/[\[\]]/g, '').trim();

            // מסננים את דוגמת התגובה עצמה — היא מוצגת בנפרד
            if (cleanLine &&
                !cleanLine.includes('דוגמת תגובה') &&
                !cleanLine.startsWith('"') &&
                !cleanLine.startsWith('"')) {
              suggestions.push(cleanLine);
            }
          }

          if (suggestions.length > 0) {
            result.suggestions = suggestions;
          }
        }
      }

      // ניסיונות גיבוי אם חלקים לא זוהו
      if (!result.mood) {
        const moodMatch = cleanText.match(/אוויר(ה|ת)[^：:\n]*[：:]\s*(.+?)(?=\n|$)/);
        if (moodMatch) {
          result.mood = moodMatch[2].replace(/[\[\]]/g, '').trim();
        }
      }

      if (!result.mood && cleanText.length > 0) {
        const firstPara = cleanText.split('\n')[0];
        if (firstPara.length > 10 && !/אוויר|נושא|עמד/.test(firstPara)) {
          result.mood = firstPara.replace(/[\[\]]/g, '').trim();
        }
      }

      if (result.topics.length === 0 && cleanText.includes('נושא')) {
        const topicSection = cleanText.match(/נושא(ים)?[：:]\s*(.+?)(?=\n\n|\n[^\n]|$)/s);
        if (topicSection) {
          result.topics = [topicSection[2].replace(/[\[\]]/g, '').trim()];
        }
      }

      console.log('תוצאת הפירוק הסופית:', result);
      return result;

    } catch (error) {
      console.error('שגיאה בפירוק תוצאת הניתוח:', error);

      // גם במקרה של שגיאה — מנסים לחלץ מידע בסיסי
      if (text && typeof text === 'string') {
        const firstLine = text.split('\n')[0];
        if (firstLine && firstLine.length > 0) {
          result.mood = firstLine.replace(/[\[\]]/g, '').trim();
        }

        // הפסקה הארוכה ביותר כנראה מכילה את התגובה המוצעת
        const paragraphs = text.split('\n\n');
        if (paragraphs.length > 1) {
          const longestPara = paragraphs.reduce((longest, current) =>
            current.length > longest.length ? current : longest, '');
          if (longestPara.length > 20) {
            result.suggestedReply = longestPara.replace(/[\[\]"]/g, '').trim();
          }
        }
      }

      return result;
    }
  }

  const parsedAnalysis = parseAnalysis(analysis);

  // גלילה כשהתוכן ארוך
  panel.style.maxHeight = '80vh';
  panel.style.overflowY = 'auto';

  panel.innerHTML = `
    <div class="analysis-content">
      <div class="analysis-header">
        <h3>ניתוח השיחה</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="analysis-body">
        <div class="analysis-section">
          <h4>אווירת השיחה</h4>
          <div class="analysis-mood">${parsedAnalysis.mood || 'לא זוהה'}</div>
        </div>

        <div class="analysis-section">
          <h4>נושאים מרכזיים</h4>
          <div class="analysis-topics">
            ${parsedAnalysis.topics.length > 0
              ? parsedAnalysis.topics.map(topic => `
                  <div class="topic-item">${topic}</div>
                `).join('')
              : '<div class="topic-item">לא זוהו</div>'
            }
          </div>
        </div>

        <div class="analysis-section">
          <h4>עמדות הצדדים</h4>
          <div class="analysis-attitudes">
            <div class="attitude-item">
              <span class="attitude-label">העמדה שלי: </span>
              <span class="attitude-value">${parsedAnalysis.attitudes.me || 'לא זוהתה'}</span>
            </div>
            <div class="attitude-item">
              <span class="attitude-label">עמדת הצד השני: </span>
              <span class="attitude-value">${parsedAnalysis.attitudes.other || 'לא זוהתה'}</span>
            </div>
          </div>
        </div>

        <div class="analysis-section">
          <h4>אופן תגובה מומלץ</h4>
          <div class="analysis-suggestions">
            ${parsedAnalysis.suggestions.length > 0
              ? parsedAnalysis.suggestions.map(suggestion => `
                  <div class="suggestion-item">
                    <div class="suggestion-text">${suggestion}</div>
                  </div>
                `).join('')
              : '<div class="suggestion-item">לא סופקו המלצות</div>'
            }
          </div>
        </div>
        ${parsedAnalysis.suggestedReply
          ? `<div class="suggested-reply">
              <h4>
                <span>דוגמת תגובה מומלצת</span>
                <button class="copy-reply-btn" title="העתקת התגובה ללוח">📋 העתק</button>
              </h4>
              <div class="reply-text">"${parsedAnalysis.suggestedReply}"</div>
            </div>`
          : ''
        }
      </div>
    </div>
  `;

  panel.querySelector('.close-btn').addEventListener('click', () => {
    panel.remove();
  });

  // כפתור העתקת התגובה המוצעת ללוח
  const copyBtn = panel.querySelector('.copy-reply-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(parsedAnalysis.suggestedReply);
        copyBtn.textContent = '✓ הועתק!';
        copyBtn.classList.add('copied');
        console.log('התגובה המוצעת הועתקה ללוח');

        setTimeout(() => {
          copyBtn.textContent = '📋 העתק';
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (error) {
        console.error('ההעתקה ללוח נכשלה:', error);
        copyBtn.textContent = 'ההעתקה נכשלה';
        setTimeout(() => {
          copyBtn.textContent = '📋 העתק';
        }, 2000);
      }
    });
  }
}

// הצגת שגיאת ניתוח בפאנל
function showAnalysisError(container, message) {
  const panel = container.querySelector('.analysis-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="analysis-error" dir="rtl">
      <span>הניתוח נכשל: ${message}</span>
      <button class="close-btn">×</button>
    </div>
  `;

  panel.querySelector('.close-btn').addEventListener('click', () => {
    panel.remove();
  });
}

// ========================= אשף הגדרת סוכן NerAI =========================

// הרכבת הנחיית מערכת מותאמת מתשובות המשתמש (ללא צורך ב-AI — מיידי וחינמי)
// המבנה: זהות → כרטיס ידע על העסק → סגנון ומטרה → כללים
function composeSystemPrompt(p) {
  const toneMap = {
    professional: 'מקצועי, מכובד וברור',
    friendly: 'ידידותי, חם ונגיש',
    direct: 'ישיר, תכליתי וקצר',
    warm: 'אישי, אמפתי וחם'
  };
  const goalMap = {
    sales: 'לקדם מכירות, לזהות הזדמנויות ולשכנע בעדינות מבלי להיות דוחק',
    support: 'לתת שירות ותמיכה מעולים, לפתור בעיות ולהרגיע',
    coordination: 'לתאם פגישות ומשימות, לעקוב אחר סטטוסים ולוודא שדברים לא נופלים',
    general: 'לתקשר בצורה ברורה, יעילה ואנושית'
  };

  const owner = p.businessName || p.business || 'המשתמש';
  const lines = [];

  lines.push(`אתה NerAI — הסוכן האישי של ${owner}. אתה פועל בשם המשתמש ומסייע לו בשיחות הוואטסאפ שלו.`);

  // כרטיס הידע — מוצג למודל כמידע שהוא אמור לדעת ולהשתמש בו
  const facts = [];
  if (p.businessName) facts.push(`שם העסק: ${p.businessName}`);
  if (p.business) facts.push(`תחום העיסוק: ${p.business}`);
  if (p.audience) facts.push(`עם מי מתכתבים בדרך כלל: ${p.audience}`);
  if (p.details && p.details.trim()) facts.push(`פרטים חשובים: ${p.details.trim()}`);

  if (facts.length > 0) {
    lines.push('');
    lines.push('זה המידע שאתה יודע על העסק והמשתמש. כשנשאל על "אנחנו", "העסק שלנו" או פרטים דומים — ענה מתוך המידע הזה:');
    facts.forEach(f => lines.push(`- ${f}`));
  }

  lines.push('');
  lines.push(`הטון שלך תמיד ${toneMap[p.tone] || toneMap.professional}. המטרה המרכזית שלך היא ${goalMap[p.goal] || goalMap.general}.`);

  if (p.notes && p.notes.trim()) {
    lines.push(`הנחיות נוספות חשובות: ${p.notes.trim()}.`);
  }

  lines.push('ענה תמיד בעברית אלא אם התבקשת אחרת, בסגנון מותאם לשיחת וואטסאפ — קצר, טבעי ולעניין. אם נשאל על מידע עסקי שאין לך — אמור זאת בכנות והצע שהמשתמש יוסיף אותו בהגדרות הסוכן.');

  return lines.join('\n');
}

// אשף ה-setup — שאלות בסיסיות → הנחיית מערכת לסוכן (ניתנת לעריכה)
async function showAgentSetupWizard() {
  // מניעת פתיחה כפולה
  if (document.querySelector('.nerai-wizard-modal')) return;

  const existingProfile = (await window.getAgentProfile()) || {};

  const modal = document.createElement('div');
  modal.className = 'settings-modal nerai-wizard-modal';

  const content = document.createElement('div');
  content.className = 'settings-content';
  content.setAttribute('dir', 'rtl');
  content.innerHTML = `
    <div class="settings-header">
      <h3>✨ הגדרת סוכן NerAI</h3>
      <button class="close-btn">×</button>
    </div>

    <!-- שלב 1: שאלות -->
    <div class="wizard-step wizard-questions">
      <div class="settings-body">
        <p style="margin: 0 0 20px; color: #555; font-size: 14px;">כמה שאלות קצרות, וניצור לך סוכן AI מותאם אישית. תוכל לערוך הכל אחר כך.</p>

        <div class="api-key-input">
          <label>שם העסק / המותג</label>
          <input type="text" id="wiz-businessname" placeholder="לדוגמה: Ner Online" value="${(existingProfile.businessName || '').replace(/"/g, '&quot;')}">
        </div>

        <div class="api-key-input">
          <label>במה אתה עוסק? (התחום)</label>
          <input type="text" id="wiz-business" placeholder="לדוגמה: ייעוץ פיננסי, חנות בגדים, סוכנות ביטוח" value="${(existingProfile.business || '').replace(/"/g, '&quot;')}">
        </div>

        <div class="api-key-input">
          <label>פרטים שהסוכן חייב להכיר (רשות)</label>
          <textarea id="wiz-details" rows="2" placeholder="שירותים, מחירים, אתר, שעות פעילות — כל מה שהסוכן צריך כדי לענות על שאלות">${existingProfile.details || ''}</textarea>
        </div>

        <div class="api-key-input">
          <label>עם מי אתה מתכתב בעיקר?</label>
          <input type="text" id="wiz-audience" placeholder="לדוגמה: לקוחות פוטנציאליים, לקוחות קיימים, ספקים" value="${(existingProfile.audience || '').replace(/"/g, '&quot;')}">
        </div>

        <div class="api-key-input">
          <label>איזה טון מתאים לך?</label>
          <select id="wiz-tone">
            <option value="professional">מקצועי ומכובד</option>
            <option value="friendly">ידידותי וחם</option>
            <option value="direct">ישיר וקצר</option>
            <option value="warm">אישי ואמפתי</option>
          </select>
        </div>

        <div class="api-key-input">
          <label>מה המטרה המרכזית שלך בשיחות?</label>
          <select id="wiz-goal">
            <option value="sales">מכירות ושכנוע</option>
            <option value="support">שירות ותמיכה</option>
            <option value="coordination">תיאום וניהול משימות</option>
            <option value="general">תקשורת כללית</option>
          </select>
        </div>

        <div class="api-key-input">
          <label>הנחיות נוספות לסוכן (רשות)</label>
          <textarea id="wiz-notes" rows="2" placeholder="לדוגמה: תמיד להזכיר את שעות הפעילות, לא להבטיח מחירים בלי אישור">${existingProfile.notes || ''}</textarea>
        </div>
      </div>
      <div class="settings-footer">
        <button class="save-btn wizard-generate-btn">צור הנחיית מערכת ✨</button>
      </div>
    </div>

    <!-- שלב 2: תצוגה מקדימה ועריכה -->
    <div class="wizard-step wizard-preview" style="display: none;">
      <div class="settings-body">
        <p style="margin: 0 0 12px; color: #555; font-size: 14px;">זו הנחיית המערכת של הסוכן שלך. אפשר לערוך אותה חופשי לפני שמירה:</p>
        <div class="api-key-input">
          <textarea id="wiz-result" rows="8" style="line-height: 1.6;"></textarea>
        </div>
      </div>
      <div class="settings-footer" style="justify-content: space-between;">
        <button class="wizard-back-btn" style="background: #f0f2f5; color: #667781; border: none; border-radius: 8px; padding: 10px 20px; font-weight: 500; cursor: pointer;">← חזרה לשאלות</button>
        <button class="save-btn wizard-save-btn">שמור את הסוכן</button>
      </div>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // טעינת ערכים שמורים לתפריטים
  if (existingProfile.tone) content.querySelector('#wiz-tone').value = existingProfile.tone;
  if (existingProfile.goal) content.querySelector('#wiz-goal').value = existingProfile.goal;

  const questionsStep = content.querySelector('.wizard-questions');
  const previewStep = content.querySelector('.wizard-preview');
  const resultTextarea = content.querySelector('#wiz-result');

  const readProfile = () => ({
    businessName: content.querySelector('#wiz-businessname').value.trim(),
    business: content.querySelector('#wiz-business').value.trim(),
    details: content.querySelector('#wiz-details').value.trim(),
    audience: content.querySelector('#wiz-audience').value.trim(),
    tone: content.querySelector('#wiz-tone').value,
    goal: content.querySelector('#wiz-goal').value,
    notes: content.querySelector('#wiz-notes').value.trim()
  });

  content.querySelector('.close-btn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // צור → הרכבת הפרומפט ומעבר לתצוגה מקדימה
  content.querySelector('.wizard-generate-btn').addEventListener('click', () => {
    const profile = readProfile();
    resultTextarea.value = composeSystemPrompt(profile);
    questionsStep.style.display = 'none';
    previewStep.style.display = 'block';
  });

  // חזרה לשאלות
  content.querySelector('.wizard-back-btn').addEventListener('click', () => {
    previewStep.style.display = 'none';
    questionsStep.style.display = 'block';
  });

  // שמירה → systemRole + agentProfile + סימון שהאשף הושלם
  content.querySelector('.wizard-save-btn').addEventListener('click', () => {
    const profile = readProfile();
    const systemRole = resultTextarea.value.trim();

    chrome.storage.sync.set({
      systemRole: systemRole,
      agentProfile: profile,
      agentSetupDone: true
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('שמירת הסוכן נכשלה:', chrome.runtime.lastError);
        return;
      }
      console.log('NerAI: הסוכן נשמר');
      modal.remove();

      // הודעת הצלחה
      const toast = document.createElement('div');
      toast.className = 'settings-toast success';
      toast.textContent = '✓ סוכן NerAI שלך מוכן! אפשר לערוך אותו בכל עת בהגדרות';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3500);
    });
  });
}

// חשיפה גלובלית (לשימוש מכפתור בהגדרות)
window.showAgentSetupWizard = showAgentSetupWizard;

// מודאל ההגדרות של התוסף
function showSettingsModal() {
  const modal = document.createElement('div');
  modal.className = 'settings-modal';

  const content = document.createElement('div');
  content.className = 'settings-content';
  content.setAttribute('dir', 'rtl');
  content.innerHTML = `
    <div class="settings-header">
      <h3>הגדרות NerAI</h3>
      <button class="close-btn">×</button>
    </div>

    <div class="settings-body">
      <!-- הגדרות שירות התרגום -->
      <div class="settings-section">
        <h4>שירות תרגום</h4>
        <div class="service-selection">
          <label for="translationApi">בחר שירות תרגום</label>
          <select id="translationApi">
            <option value="google">Google Translate (חינם)</option>
            <option value="deepseek">DeepSeek</option>
            <option value="siliconflow">OpenAI (וכל ממשק תואם)</option>
          </select>
        </div>

        <!-- בחירת שפת יעד -->
        <div class="target-language" style="margin-top: 12px;">
          <label for="targetLanguage">שפת יעד לתרגום</label>
          <select id="targetLanguage">
            <option value="he">עברית</option>
            <option value="en">אנגלית</option>
            <option value="ar">ערבית</option>
            <option value="ru">רוסית</option>
            <option value="fr">צרפתית</option>
            <option value="de">גרמנית</option>
            <option value="es">ספרדית</option>
            <option value="pt">פורטוגזית</option>
            <option value="zh-CN">סינית</option>
          </select>
        </div>

        <!-- תרגום אוטומטי להודעות נכנסות -->
        <div class="toggle-switch-container" style="margin-top: 14px; margin-bottom: 4px;">
          <label for="autoTranslateIncoming" class="toggle-label">תרגום אוטומטי להודעות נכנסות</label>
          <label class="toggle-switch">
            <input type="checkbox" id="autoTranslateIncoming" class="toggle-input">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <p style="font-size: 12px; color: #666; margin: 0;">הודעות חדשות שמגיעות בשפה זרה יתורגמו מיד, בלי ללחוץ על "תרגם"</p>

        <!-- הגדרות API לפי השירות הנבחר -->
        <div class="api-settings" id="translation-settings" style="margin-top: 16px;">
          <!-- Google — לא דורש מפתח -->
          <div class="api-setting-group" id="google-settings" style="display: none;">
            <p class="api-notice">תרגום Google לא דורש מפתח API</p>
          </div>

          <!-- DeepSeek -->
          <div class="api-setting-group" id="deepseek-settings" style="display: none;">
            <div class="api-key-input">
              <label>מפתח API של DeepSeek</label>
              <div class="api-key-wrapper">
                <input type="password" id="deepseekApiKey">
                <button class="toggle-visibility" data-for="deepseekApiKey">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- OpenAI -->
          <div class="api-setting-group" id="siliconflow-settings" style="display: none;">
            <div class="api-key-input">
              <label>מפתח API של OpenAI</label>
              <div class="api-key-wrapper">
                <input type="password" id="siliconflowApiKey">
                <button class="toggle-visibility" data-for="siliconflowApiKey">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="api-key-input">
              <label>כתובת ה־API</label>
              <div class="api-key-wrapper">
                <input type="text" id="siliconflowApiUrl" placeholder="https://api.openai.com/v1/chat/completions" dir="ltr">
              </div>
            </div>

            <div class="api-key-input">
              <label>שם המודל</label>
              <div class="api-key-wrapper">
                <input type="text" id="siliconflowModel" placeholder="gpt-4o-mini" dir="ltr">
              </div>
            </div>

            <!-- אפשרויות מתקדמות -->
            <div class="advanced-settings-toggle" style="margin-top: 12px; cursor: pointer;">
              <span style="display: flex; align-items: center;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-left: 5px;" class="advanced-settings-icon">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
                אפשרויות מתקדמות
              </span>
            </div>

            <div class="advanced-settings" style="display: none; margin-top: 10px; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
              <!-- טמפרטורה -->
              <div class="setting-item">
                <label for="openaiTemperature">טמפרטורה (0.1-2.0)</label>
                <div style="display: flex; align-items: center;">
                  <input type="range" id="openaiTemperature" min="0.1" max="2.0" step="0.1" value="0.7" style="flex: 1;">
                  <span id="openaiTemperatureValue" style="margin-right: 8px; min-width: 30px;">0.7</span>
                </div>
              </div>

              <!-- הצגת תהליך חשיבה -->
              <div class="setting-item" style="margin-top: 12px;">
                <div class="toggle-switch-container">
                  <label for="openaiReasoningEnabled" class="toggle-label">הצגת תהליך החשיבה</label>
                  <label class="toggle-switch">
                    <input type="checkbox" id="openaiReasoningEnabled" class="toggle-input">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <p style="margin-top: 6px; font-size: 12px; color: #666;">כשמופעל, התרגום יציג את תהליך החשיבה של המודל (מתאים למודלי reasoning)</p>
              </div>
            </div>

            <p class="api-notice" style="margin-top: 8px; font-size: 12px; color: #666;">טיפ: כל שירות תואם OpenAI יעבוד כאן — OpenAI, Azure OpenAI, Groq, ועוד</p>
          </div>
        </div>
      </div>

      <!-- הגדרות שירות ה־AI לניתוח -->
      <div class="settings-section">
        <h4>ניתוח שיחות עם AI</h4>

        <!-- מתג הפעלה -->
        <div class="toggle-switch-container">
          <label for="aiEnabled" class="toggle-label">הפעלת ניתוח AI</label>
          <label class="toggle-switch">
            <input type="checkbox" id="aiEnabled" class="toggle-input">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div id="ai-service-options" style="display: none;">
          <div class="service-selection">
            <label for="aiApi">בחר שירות AI</label>
            <select id="aiApi">
              <option value="deepseek">DeepSeek</option>
              <option value="siliconflow">OpenAI (וכל ממשק תואם)</option>
            </select>
          </div>

          <!-- הגדרות API לפי השירות הנבחר -->
          <div class="api-settings" id="ai-settings" style="margin-top: 16px;">
            <!-- DeepSeek -->
            <div class="api-setting-group" id="ai-deepseek-settings" style="display: none;">
              <div class="api-key-input">
                <label>מפתח API של DeepSeek</label>
                <div class="api-key-wrapper">
                  <input type="password" id="deepseekApiKey_ai">
                  <button class="toggle-visibility" data-for="deepseekApiKey_ai">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- OpenAI -->
            <div class="api-setting-group" id="ai-siliconflow-settings" style="display: none;">
              <div class="api-key-input">
                <label>מפתח API של OpenAI</label>
                <div class="api-key-wrapper">
                  <input type="password" id="siliconflowApiKey_ai">
                  <button class="toggle-visibility" data-for="siliconflowApiKey_ai">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="api-key-input">
                <label>כתובת ה־API</label>
                <div class="api-key-wrapper">
                  <input type="text" id="siliconflowApiUrl_ai" placeholder="https://api.openai.com/v1/chat/completions" dir="ltr">
                </div>
              </div>

              <div class="api-key-input">
                <label>שם המודל</label>
                <div class="api-key-wrapper">
                  <input type="text" id="siliconflowModel_ai" placeholder="gpt-4o-mini" dir="ltr">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- הגדרת תפקיד המערכת של ה־AI -->
        <div class="settings-section" id="ai-system-role" style="margin-top: 16px; border-bottom: none; padding-bottom: 0; display: none;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h4 style="margin: 0;">אופי הסוכן (System Prompt)</h4>
            <button type="button" class="open-wizard-btn" style="background: linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%); color: white; border: none; border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">✨ אשף הגדרה</button>
          </div>
          <p style="margin: 0 0 10px; font-size: 12px; color: #666;">הנחיה זו משפיעה על כל פונקציות ה-AI: ניתוח שיחה, שיפור ניסוח ועוד. השתמש באשף ליצירה מהירה, או כתוב ידנית.</p>
          <div class="prompt-input">
            <textarea id="systemRole" rows="4" placeholder="הגדר את האופי והתפקיד של סוכן NerAI שלך">אתה NerAI — עוזר אישי חכם לוואטסאפ. אתה עוזר למשתמש לנתח שיחות, לנסח הודעות ולתקשר בצורה יעילה ומקצועית. ענה בעברית אלא אם התבקשת אחרת.</textarea>
          </div>
        </div>

        <!-- כלים לסוכן (webhooks) -->
        <div class="settings-section" id="ai-tools-section" style="margin-top: 16px; border-bottom: none; padding-bottom: 0; display: none;">
          <h4 style="margin: 0 0 6px;">🔧 כלים לסוכן (Webhooks)</h4>
          <p style="margin: 0 0 12px; font-size: 12px; color: #666;">חבר את הסוכן ל-n8n / Make / Zapier. כשתבקש ממנו בצ'אט "הוסף ליומן" או "צור משימה", הוא ישלח את המידע לכתובת ה-webhook שהגדרת.</p>
          <div id="tools-list"></div>
          <button type="button" class="add-tool-btn" style="background: #EDE9FE; color: #6D28D9; border: 1px dashed #A78BFA; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; width: 100%; margin-top: 8px;">+ הוסף כלי</button>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <button class="save-btn">שמור הגדרות</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // כפתור סגירה
  const closeBtn = content.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });

  // לחיצה מחוץ למודאל סוגרת אותו
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // כפתורי הצגת/הסתרת סיסמה
  const toggleBtns = content.querySelectorAll('.toggle-visibility');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.getAttribute('data-for');
      const input = document.getElementById(inputId);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // החלפת שירות תרגום — הצגת שדות ההגדרה המתאימים
  const translationApiSelect = content.querySelector('#translationApi');
  translationApiSelect.addEventListener('change', () => {
    document.querySelectorAll('#translation-settings .api-setting-group').forEach(el => {
      el.style.display = 'none';
    });

    const selectedService = translationApiSelect.value;
    const settingsEl = document.getElementById(`${selectedService}-settings`);
    if (settingsEl) {
      settingsEl.style.display = 'block';
    }
  });

  // החלפת שירות AI — הצגת שדות ההגדרה המתאימים
  const aiApiSelect = content.querySelector('#aiApi');
  aiApiSelect.addEventListener('change', () => {
    document.querySelectorAll('#ai-settings .api-setting-group').forEach(el => {
      el.style.display = 'none';
    });

    const selectedService = aiApiSelect.value;
    const settingsEl = document.getElementById(`ai-${selectedService}-settings`);
    if (settingsEl) {
      settingsEl.style.display = 'block';
    }
  });

  // מתג הפעלת ה־AI
  const aiEnabledToggle = content.querySelector('#aiEnabled');
  const aiServiceOptions = content.querySelector('#ai-service-options');
  const aiSystemRole = content.querySelector('#ai-system-role');
  const aiToolsSection = content.querySelector('#ai-tools-section');

  aiEnabledToggle.addEventListener('change', () => {
    console.log('מתג ה־AI שונה:', aiEnabledToggle.checked);
    aiServiceOptions.style.display = aiEnabledToggle.checked ? 'block' : 'none';
    aiSystemRole.style.display = aiEnabledToggle.checked ? 'block' : 'none';
    if (aiToolsSection) aiToolsSection.style.display = aiEnabledToggle.checked ? 'block' : 'none';

    // הצגת שדות השירות הנבחר
    if (aiEnabledToggle.checked) {
      const selectedAiService = document.getElementById('aiApi').value;

      document.querySelectorAll('#ai-settings .api-setting-group').forEach(el => {
        el.style.display = 'none';
      });

      const aiSettingsEl = document.getElementById(`ai-${selectedAiService}-settings`);
      if (aiSettingsEl) {
        aiSettingsEl.style.display = 'block';
      }
    }
  });

  // כפתור שמירה
  const saveBtn = content.querySelector('.save-btn');
  saveBtn.addEventListener('click', () => {
    saveSettings();
    modal.remove();
  });

  // כפתור אשף הגדרת הסוכן — סוגר את ההגדרות ופותח את האשף
  const openWizardBtn = content.querySelector('.open-wizard-btn');
  if (openWizardBtn) {
    openWizardBtn.addEventListener('click', () => {
      modal.remove();
      showAgentSetupWizard();
    });
  }

  // === ניהול כלים (webhooks) ===
  const toolsList = content.querySelector('#tools-list');

  // יצירת כרטיס כלי (ריק או מאותחל מנתונים שמורים)
  function renderToolCard(tool = {}) {
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.style.cssText = 'background:#F9F8FE;border:1px solid #E9E5F5;border-radius:8px;padding:12px;margin-bottom:10px;';
    // params מוצגים כשורות "שם: תיאור"
    const paramsText = (tool.params || []).map(p => `${p.name}: ${p.description || ''}`).join('\n');
    card.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <input type="text" class="tool-name" placeholder="שם הכלי (באנגלית, למשל add_to_calendar)" dir="ltr" style="flex:1;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;" value="${(tool.name || '').replace(/"/g, '&quot;')}">
        <button type="button" class="tool-remove" title="הסר כלי" style="background:#FEE2E2;color:#B91C1C;border:none;border-radius:6px;width:34px;cursor:pointer;font-size:16px;">×</button>
      </div>
      <input type="text" class="tool-desc" placeholder="מתי להשתמש בכלי? (למשל: כשמבקשים להוסיף אירוע ליומן)" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:8px;box-sizing:border-box;" value="${(tool.description || '').replace(/"/g, '&quot;')}">
      <input type="text" class="tool-url" placeholder="כתובת Webhook (n8n/Make)" dir="ltr" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:8px;box-sizing:border-box;" value="${(tool.webhookUrl || '').replace(/"/g, '&quot;')}">
      <textarea class="tool-params" rows="2" placeholder="שדות שהסוכן יחלץ, שורה לכל שדה בפורמט — שם: תיאור&#10;למשל:&#10;title: כותרת האירוע&#10;date: תאריך ושעה" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:12px;box-sizing:border-box;font-family:inherit;">${paramsText}</textarea>
    `;
    card.querySelector('.tool-remove').addEventListener('click', () => card.remove());
    toolsList.appendChild(card);
  }

  content.querySelector('.add-tool-btn').addEventListener('click', () => renderToolCard());

  // איסוף הכלים מהטופס — נחשף ל-saveSettings דרך closure
  content._collectTools = function() {
    const tools = [];
    toolsList.querySelectorAll('.tool-card').forEach(card => {
      const name = card.querySelector('.tool-name').value.trim();
      const webhookUrl = card.querySelector('.tool-url').value.trim();
      if (!name || !webhookUrl) return; // כלי לא שלם — מדלגים
      const params = card.querySelector('.tool-params').value
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const i = line.indexOf(':');
          return i > 0
            ? { name: line.slice(0, i).trim(), description: line.slice(i + 1).trim() }
            : { name: line, description: '' };
        });
      tools.push({ name, description: card.querySelector('.tool-desc').value.trim(), webhookUrl, params });
    });
    return tools;
  };

  content._renderToolCard = renderToolCard;

  // קיפול/פתיחת האפשרויות המתקדמות
  const advancedSettingsToggle = content.querySelector('.advanced-settings-toggle');
  if (advancedSettingsToggle) {
    advancedSettingsToggle.addEventListener('click', () => {
      const advancedSettings = content.querySelector('.advanced-settings');
      const icon = content.querySelector('.advanced-settings-icon');
      if (advancedSettings.style.display === 'none') {
        advancedSettings.style.display = 'block';
        icon.innerHTML = '<path d="M7 14l5-5 5 5z"/>';
      } else {
        advancedSettings.style.display = 'none';
        icon.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
      }
    });
  }

  // הצגת ערך הטמפרטורה ליד המחוון
  const temperatureSlider = content.querySelector('#openaiTemperature');
  const temperatureValue = content.querySelector('#openaiTemperatureValue');
  if (temperatureSlider && temperatureValue) {
    temperatureSlider.addEventListener('input', () => {
      temperatureValue.textContent = temperatureSlider.value;
    });
  }

  // שמירת ההגדרות ל־chrome.storage
  function saveSettings() {
    try {
      const formData = {
        translationApi: document.getElementById('translationApi').value,
        targetLanguage: document.getElementById('targetLanguage').value,
        autoTranslateIncoming: document.getElementById('autoTranslateIncoming').checked,
        aiEnabled: document.getElementById('aiEnabled').checked
      };

      // מפתחות API לפי שירות התרגום הנבחר
      if (formData.translationApi === 'deepseek') {
        formData.deepseekApiKey = document.getElementById('deepseekApiKey').value;
      } else if (formData.translationApi === 'siliconflow') {
        formData.siliconflowApiKey = document.getElementById('siliconflowApiKey').value;
        formData.siliconflowApiUrl = document.getElementById('siliconflowApiUrl').value;
        formData.siliconflowModel = document.getElementById('siliconflowModel').value;

        // הגדרות OpenAI מתקדמות
        const temperatureSlider = document.getElementById('openaiTemperature');
        if (temperatureSlider) {
          formData.openaiTemperature = parseFloat(temperatureSlider.value);
        }

        const reasoningEnabled = document.getElementById('openaiReasoningEnabled');
        if (reasoningEnabled) {
          formData.openaiReasoningEnabled = reasoningEnabled.checked;
        }
      }

      // הגדרות שירות ה־AI
      if (formData.aiEnabled) {
        formData.aiApi = document.getElementById('aiApi').value;

        if (formData.aiApi === 'deepseek') {
          formData.deepseekApiKey_ai = document.getElementById('deepseekApiKey_ai').value;
        } else if (formData.aiApi === 'siliconflow') {
          formData.siliconflowApiKey_ai = document.getElementById('siliconflowApiKey_ai').value;
          formData.siliconflowApiUrl_ai = document.getElementById('siliconflowApiUrl_ai').value;
          formData.siliconflowModel_ai = document.getElementById('siliconflowModel_ai').value;
        }

        formData.systemRole = document.getElementById('systemRole').value;

        // כלים (webhooks) — נאספים מהטופס
        if (typeof content._collectTools === 'function') {
          formData.agentTools = content._collectTools();
        }
      }

      chrome.storage.sync.set(formData, () => {
        if (chrome.runtime.lastError) {
          console.error('שגיאה בשמירת ההגדרות:', chrome.runtime.lastError);
          showExtensionInvalidatedError();
          return;
        }

        showToast('ההגדרות נשמרו');
      });
    } catch (error) {
      console.error('שגיאה בשמירת ההגדרות:', error);
      showExtensionInvalidatedError();
    }
  }

  // טעינת ההגדרות השמורות למודאל
  function loadSettings() {
    try {
      chrome.storage.sync.get([
        'translationApi',
        'targetLanguage',
        'autoTranslateIncoming',
        'aiEnabled',
        'aiApi',
        'deepseekApiKey',
        'siliconflowApiKey',
        'siliconflowApiUrl',
        'siliconflowModel',
        'openaiTemperature',
        'openaiReasoningEnabled',
        'deepseekApiKey_ai',
        'siliconflowApiKey_ai',
        'siliconflowApiUrl_ai',
        'siliconflowModel_ai',
        'systemRole',
        'agentTools'
      ], (data) => {
        if (chrome.runtime.lastError) {
          console.error('שגיאה בטעינת ההגדרות:', chrome.runtime.lastError);
          showExtensionInvalidatedError();
          return;
        }

        // שירות התרגום
        if (data.translationApi) {
          document.getElementById('translationApi').value = data.translationApi;
        }

        // הצגת שדות השירות הנבחר
        document.querySelectorAll('#translation-settings .api-setting-group').forEach(el => {
          el.style.display = 'none';
        });

        const currentService = document.getElementById('translationApi').value;
        const settingsEl = document.getElementById(`${currentService}-settings`);
        if (settingsEl) {
          settingsEl.style.display = 'block';
        }

        // שפת יעד
        if (data.targetLanguage) {
          document.getElementById('targetLanguage').value = data.targetLanguage;
        }

        // תרגום אוטומטי להודעות נכנסות
        const autoTranslateCheckbox = document.getElementById('autoTranslateIncoming');
        if (autoTranslateCheckbox) {
          autoTranslateCheckbox.checked = data.autoTranslateIncoming === true;
        }

        // מצב מתג ה־AI
        const aiEnabledCheckbox = document.getElementById('aiEnabled');
        if (aiEnabledCheckbox) {
          aiEnabledCheckbox.checked = data.aiEnabled === true;

          const aiServiceOptions = document.getElementById('ai-service-options');
          const aiSystemRole = document.getElementById('ai-system-role');

          if (aiServiceOptions) {
            aiServiceOptions.style.display = data.aiEnabled === true ? 'block' : 'none';
          }

          if (aiSystemRole) {
            aiSystemRole.style.display = data.aiEnabled === true ? 'block' : 'none';
          }
        }

        // שירות ה־AI
        if (data.aiApi) {
          const aiApiSelect = document.getElementById('aiApi');
          if (aiApiSelect) {
            aiApiSelect.value = data.aiApi;
          }
        }

        // הצגת שדות שירות ה־AI הנבחר (אם התכונה מופעלת)
        if (data.aiEnabled === true) {
          document.querySelectorAll('#ai-settings .api-setting-group').forEach(el => {
            el.style.display = 'none';
          });

          const currentAiService = document.getElementById('aiApi').value;
          const aiSettingsEl = document.getElementById(`ai-${currentAiService}-settings`);
          if (aiSettingsEl) {
            aiSettingsEl.style.display = 'block';
          }
        }

        // מפתחות API
        if (data.deepseekApiKey) {
          document.getElementById('deepseekApiKey').value = data.deepseekApiKey;
        }

        if (data.siliconflowApiKey) {
          document.getElementById('siliconflowApiKey').value = data.siliconflowApiKey;
        }

        if (data.siliconflowApiUrl) {
          document.getElementById('siliconflowApiUrl').value = data.siliconflowApiUrl;
        }

        if (data.siliconflowModel) {
          document.getElementById('siliconflowModel').value = data.siliconflowModel;
        }

        // הגדרות OpenAI מתקדמות
        const temperatureSlider = document.getElementById('openaiTemperature');
        const temperatureValue = document.getElementById('openaiTemperatureValue');
        if (temperatureSlider && data.openaiTemperature !== undefined) {
          temperatureSlider.value = data.openaiTemperature;
          if (temperatureValue) {
            temperatureValue.textContent = data.openaiTemperature;
          }
        }

        const reasoningEnabled = document.getElementById('openaiReasoningEnabled');
        if (reasoningEnabled && data.openaiReasoningEnabled !== undefined) {
          reasoningEnabled.checked = data.openaiReasoningEnabled;
        }

        // מפתחות שירות ה־AI — כשאין מפתח ייעודי, משתמשים במפתח התרגום
        if (data.deepseekApiKey_ai) {
          document.getElementById('deepseekApiKey_ai').value = data.deepseekApiKey_ai;
        } else if (data.deepseekApiKey) {
          document.getElementById('deepseekApiKey_ai').value = data.deepseekApiKey;
        }

        if (data.siliconflowApiKey_ai) {
          document.getElementById('siliconflowApiKey_ai').value = data.siliconflowApiKey_ai;
        } else if (data.siliconflowApiKey) {
          document.getElementById('siliconflowApiKey_ai').value = data.siliconflowApiKey;
        }

        if (data.siliconflowApiUrl_ai) {
          document.getElementById('siliconflowApiUrl_ai').value = data.siliconflowApiUrl_ai;
        } else if (data.siliconflowApiUrl) {
          document.getElementById('siliconflowApiUrl_ai').value = data.siliconflowApiUrl;
        } else {
          document.getElementById('siliconflowApiUrl_ai').value = "https://api.openai.com/v1/chat/completions";
        }

        if (data.siliconflowModel_ai) {
          document.getElementById('siliconflowModel_ai').value = data.siliconflowModel_ai;
        } else if (data.siliconflowModel) {
          document.getElementById('siliconflowModel_ai').value = data.siliconflowModel;
        } else {
          document.getElementById('siliconflowModel_ai').value = "gpt-4o-mini";
        }

        // תפקיד המערכת
        if (data.systemRole) {
          document.getElementById('systemRole').value = data.systemRole;
        }

        // כלים (webhooks) — טעינת הכרטיסים השמורים
        if (Array.isArray(data.agentTools) && typeof content._renderToolCard === 'function') {
          data.agentTools.forEach(tool => content._renderToolCard(tool));
        }

        // הצגת אזור הכלים אם ה-AI מופעל
        const toolsSection = document.getElementById('ai-tools-section');
        if (toolsSection && data.aiEnabled === true) {
          toolsSection.style.display = 'block';
        }
      });
    } catch (error) {
      console.error('שגיאה בטעינת ההגדרות:', error);
      showExtensionInvalidatedError();
    }
  }

  loadSettings();
}

// סגנונות מודאל ההגדרות — מוזרקים בטעינת הסקריפט
const settingsStyles = `
  .settings-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .settings-content {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 560px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 16px 48px rgba(30, 27, 46, 0.22);
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .settings-header {
    padding: 20px 24px;
    border-bottom: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    background: linear-gradient(135deg, #7C3AED 0%, #5B4CF5 55%, #06B6D4 100%);
    z-index: 1;
    border-radius: 16px 16px 0 0;
  }

  .settings-header h3 {
    margin: 0;
    font-size: 20px;
    color: #ffffff;
    font-weight: 700;
  }

  .settings-header .close-btn {
    color: rgba(255, 255, 255, 0.85);
  }

  .settings-header .close-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.15);
  }

  .settings-body {
    padding: 24px;
  }

  .settings-section {
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e9edef;
  }

  .settings-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .settings-section h4 {
    margin: 0 0 16px;
    font-size: 16px;
    color: #111b21;
    font-weight: 600;
  }

  .service-selection {
    margin-bottom: 12px;
  }

  .service-selection label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }

  .api-settings {
    background-color: #f0f2f5;
    border-radius: 8px;
    padding: 16px;
    margin-top: 12px;
  }

  .api-setting-group {
    margin-bottom: 8px;
  }

  .api-notice {
    color: #444;
    font-size: 14px;
    margin: 0;
    padding: 8px 0;
  }

  .api-key-input {
    margin-bottom: 12px;
  }

  .api-key-input:last-child {
    margin-bottom: 0;
  }

  .api-key-input label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }

  .api-key-wrapper {
    display: flex;
    position: relative;
  }

  .api-key-wrapper input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #bbb;
    border-radius: 6px;
    font-size: 14px;
    width: 100%;
    transition: border-color 0.2s;
    color: #000;
    background-color: #fff;
  }

  .api-key-wrapper input:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
  }

  .toggle-visibility {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #555;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-visibility:hover {
    color: #000;
  }

  .settings-content select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #bbb;
    border-radius: 6px;
    font-size: 14px;
    background-color: white;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='18' height='18' fill='%23555'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: left 12px center;
    color: #000;
  }

  .settings-content select:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
  }

  .settings-content textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #bbb;
    border-radius: 6px;
    font-size: 14px;
    resize: vertical;
    min-height: 80px;
    transition: border-color 0.2s;
    color: #000;
    background-color: #fff;
  }

  .settings-content textarea:focus {
    outline: none;
    border-color: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
  }

  .settings-footer {
    padding: 16px 24px;
    border-top: 1px solid #e9edef;
    display: flex;
    justify-content: flex-end;
    background: white;
    border-radius: 0 0 12px 12px;
  }

  .save-btn {
    padding: 10px 24px;
    background: linear-gradient(135deg, #7C3AED 0%, #5B4CF5 55%, #06B6D4 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
  }

  .save-btn:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  .save-btn:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }

  .settings-toast {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 20px;
    background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%);
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(30, 27, 46, 0.25);
    z-index: 1001;
    animation: toastIn 0.3s ease-out;
    direction: rtl;
  }

  .settings-toast.error {
    background: #DC2626;
  }

  .settings-toast.success {
    background: linear-gradient(135deg, #16A34A 0%, #059669 100%);
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  /* מתגי הפעלה */
  .toggle-switch-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 8px 0;
  }

  .toggle-label {
    font-size: 14px;
    color: #333;
    font-weight: 500;
    cursor: pointer;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 46px;
    height: 24px;
    cursor: pointer;
  }

  .toggle-input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 24px;
    cursor: pointer;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }

  .toggle-input:checked + .toggle-slider {
    background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%);
  }

  .toggle-input:focus + .toggle-slider {
    box-shadow: 0 0 1px #7C3AED;
  }

  .toggle-input:checked + .toggle-slider:before {
    transform: translateX(22px);
  }
`;

const settingsStyleSheet = document.createElement('style');
settingsStyleSheet.textContent = settingsStyles;
document.head.appendChild(settingsStyleSheet);

// הודעת שגיאה כשההקשר של התוסף התבטל (לרוב אחרי עדכון התוסף)
function showExtensionInvalidatedError() {
  const errorMessage = `
    <div class="extension-error" dir="rtl">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <h3>ההקשר של התוסף התבטל</h3>
        <p>זה קורה בדרך כלל כאשר:</p>
        <ul>
          <li>התוסף עודכן או נטען מחדש</li>
          <li>הדפדפן פועל זמן רב</li>
          <li>הדפדפן עודכן</li>
        </ul>
        <p>פתרונות מומלצים:</p>
        <ol>
          <li>רענן את העמוד</li>
          <li>אם הבעיה נמשכת, הפעל מחדש את הדפדפן</li>
          <li>אם עדיין לא נפתר, כבה והפעל מחדש את התוסף</li>
        </ol>
      </div>
      <button class="refresh-btn">רענן את העמוד</button>
    </div>
  `;

  const errorDiv = document.createElement('div');
  errorDiv.className = 'extension-error-overlay';
  errorDiv.innerHTML = errorMessage;
  document.body.appendChild(errorDiv);

  const style = document.createElement('style');
  style.textContent = `
    .extension-error-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
    }

    .extension-error {
      background: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .error-icon {
      font-size: 48px;
      text-align: center;
      margin-bottom: 15px;
    }

    .error-content {
      margin-bottom: 20px;
    }

    .error-content h3 {
      color: #e74c3c;
      margin-top: 0;
    }

    .refresh-btn {
      background: #2ecc71;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      display: block;
      margin: 0 auto;
    }

    .refresh-btn:hover {
      background: #27ae60;
    }
  `;
  document.head.appendChild(style);

  const refreshBtn = errorDiv.querySelector('.refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      location.reload();
    });
  }
}

// הצגת הודעת toast (success / error / info); duration=0 מציג עד לסגירה ידנית
function showToast(message, type = 'success', duration = 3000) {
  const toastId = 'toast-' + Date.now();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.id = toastId;
  toast.setAttribute('dir', 'rtl');

  // אלמנט תוכן נפרד — מאפשר עדכון ההודעה בהמשך (למשל התקדמות)
  const contentElement = document.createElement('div');
  contentElement.className = 'toast-content';
  contentElement.textContent = message;
  toast.appendChild(contentElement);

  // הודעה קבועה מקבלת כפתור סגירה
  if (duration === 0) {
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close-btn';
    closeButton.innerHTML = '×';
    closeButton.onclick = () => {
      document.getElementById(toastId)?.remove();
    };
    toast.appendChild(closeButton);
  }

  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
      z-index: 9999;
      display: flex;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: toast-in 0.3s ease;
    }

    .toast-success {
      background-color: #2ecc71;
    }

    .toast-error {
      background-color: #e74c3c;
    }

    .toast-info {
      background-color: #3498db;
    }

    .toast-close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      margin-right: 12px;
      padding: 0 4px;
      cursor: pointer;
      opacity: 0.8;
    }

    .toast-close-btn:hover {
      opacity: 1;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translate(-50%, 20px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }

    @keyframes toast-out {
      from {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      to {
        opacity: 0;
        transform: translate(-50%, -20px);
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(toast);

  // הסרה אוטומטית עם אנימציית יציאה
  if (duration > 0) {
    setTimeout(() => {
      const toastElement = document.getElementById(toastId);
      if (toastElement) {
        toastElement.style.animation = 'toast-out 0.3s ease forwards';
      }
    }, duration - 300);

    setTimeout(() => {
      const toastElement = document.getElementById(toastId);
      if (toastElement) {
        toastElement.remove();
      }
    }, duration);
  }

  return toastId;
}

// ================ בחירת הודעות ושיחה צדדית עם הסוכן ================

// ההודעות שנבחרו — צילום טקסט בזמן הבחירה (עמיד לגלילה שמסירה אלמנטים)
const neraiSelection = [];

// סימון/ביטול בחירה של הודעה
function neraiToggleSelect(messageWrapper, textEl, btn) {
  let id = messageWrapper.getAttribute('data-nerai-sel-id');
  const idx = id ? neraiSelection.findIndex(s => s.id === id) : -1;

  if (idx >= 0) {
    // ביטול בחירה
    neraiSelection.splice(idx, 1);
    messageWrapper.classList.remove('nerai-selected');
    if (btn) btn.classList.remove('active');
  } else {
    // בחירה — שומרים צילום של הטקסט והכיוון
    if (!id) {
      id = 'sel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      messageWrapper.setAttribute('data-nerai-sel-id', id);
    }
    const sender = getMessageSender(messageWrapper);
    const text = collectTextContent(textEl);
    if (text) {
      neraiSelection.push({ id, sender, text });
      messageWrapper.classList.add('nerai-selected');
      if (btn) btn.classList.add('active');
    }
  }

  updateSelectionBar();
}

// עדכון סרגל הפעולות הצף לפי מספר ההודעות הנבחרות
function updateSelectionBar() {
  let bar = document.querySelector('.nerai-selection-bar');

  if (neraiSelection.length === 0) {
    if (bar) bar.remove();
    return;
  }

  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'nerai-selection-bar';
    bar.setAttribute('dir', 'rtl');
    bar.innerHTML = `
      <span class="nerai-sel-info"><b class="nerai-sel-count">0</b> הודעות נבחרו</span>
      <button class="nerai-sel-chat">💬 שוחח עם NerAI</button>
      <button class="nerai-sel-clear">נקה</button>
    `;
    document.body.appendChild(bar);

    bar.querySelector('.nerai-sel-chat').addEventListener('click', openNeraiSideChat);
    bar.querySelector('.nerai-sel-clear').addEventListener('click', clearNeraiSelection);
  }

  bar.querySelector('.nerai-sel-count').textContent = neraiSelection.length;
}

// ניקוי כל הבחירות
function clearNeraiSelection() {
  neraiSelection.length = 0;
  document.querySelectorAll('.nerai-selected').forEach(el => el.classList.remove('nerai-selected'));
  document.querySelectorAll('.nerai-select-btn.active').forEach(el => el.classList.remove('active'));
  updateSelectionBar();
}

// איסוף ההודעות האחרונות בשיחה הפתוחה — הקשר ברירת מחדל לצ'אט
function collectRecentMessages(limit = 15) {
  const rows = Array.from(document.querySelectorAll('#main div[data-pre-plain-text]')).slice(-limit);
  const items = [];
  rows.forEach(row => {
    const textEl = row.querySelector('.selectable-text');
    if (!textEl) return;
    const text = collectTextContent(textEl);
    if (!text) return;
    items.push({ sender: getMessageSender(row), text });
  });
  return items;
}

// פתיחת פאנל הצ'אט הצדדי עם הסוכן
// options.items — הקשר מפורש (מפאנל הניתוח) | options.initialQuestion — שאלה שנשלחת מיד
// בלי options: הודעות שסומנו אם יש, אחרת ההודעות האחרונות בשיחה
function openNeraiSideChat(options = {}) {
  if (document.querySelector('.nerai-sidechat')) return;

  let contextItems;
  let contextLabel;
  let welcome;

  if (Array.isArray(options.items) && options.items.length > 0) {
    contextItems = options.items;
    contextLabel = `${contextItems.length} הודעות נבחרות בהקשר ▾`;
    welcome = `קיבלתי ${contextItems.length} הודעות מהניתוח. מה תרצה לדעת עליהן?`;
  } else if (neraiSelection.length > 0) {
    contextItems = neraiSelection.slice();
    contextLabel = `${contextItems.length} הודעות שסימנת בהקשר ▾`;
    welcome = `בחרת ${contextItems.length} הודעות. מה תרצה לדעת עליהן? (למשל: "סכם לי", "מה הצד השני רוצה?", "נסח לי תשובה")`;
  } else {
    contextItems = collectRecentMessages();
    if (contextItems.length > 0) {
      contextLabel = `${contextItems.length} ההודעות האחרונות בשיחה בהקשר ▾`;
      welcome = 'היי! אני רואה את ההודעות האחרונות בשיחה. מה תרצה? (למשל: "סכם לי את השיחה", "נסח תשובה", או כל שאלה אחרת)\n\nטיפ: אפשר גם לסמן הודעות ספציפיות עם ☑ ואז לפתוח אותי.';
    } else {
      contextLabel = 'ללא הקשר שיחה';
      welcome = 'היי! אני הסוכן האישי שלך. אין כרגע הודעות בהקשר — אבל אפשר לשאול אותי הכל, או לסמן הודעות עם ☑ כדי לשוחח עליהן.';
    }
  }

  const contextText = contextItems.length > 0
    ? contextItems.map(s => `${s.sender}: ${s.text}`).join('\n')
    : 'אין הודעות בהקשר.';
  const history = [];

  const panel = document.createElement('div');
  panel.className = 'nerai-sidechat';
  panel.setAttribute('dir', 'rtl');
  panel.innerHTML = `
    <div class="nerai-sidechat-header">
      <h3>💬 שיחה עם NerAI</h3>
      <button class="nerai-sidechat-close">×</button>
    </div>
    <div class="nerai-sidechat-context">
      <div class="nerai-context-label"></div>
      <div class="nerai-context-body" style="display:none;"></div>
    </div>
    <div class="nerai-sidechat-messages"></div>
    <div class="nerai-sidechat-input">
      <textarea class="nerai-chat-text" rows="1" placeholder="שאל את NerAI..."></textarea>
      <button class="nerai-chat-send">שלח</button>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('.nerai-context-label').textContent = contextLabel;

  // הצגת ההקשר (טקסט בטוח)
  const contextBody = panel.querySelector('.nerai-context-body');
  contextBody.textContent = contextText;
  panel.querySelector('.nerai-context-label').addEventListener('click', () => {
    contextBody.style.display = contextBody.style.display === 'none' ? 'block' : 'none';
  });

  const messagesArea = panel.querySelector('.nerai-sidechat-messages');
  const input = panel.querySelector('.nerai-chat-text');
  const sendBtn = panel.querySelector('.nerai-chat-send');

  panel.querySelector('.nerai-sidechat-close').addEventListener('click', () => panel.remove());

  // הוספת בועת הודעה לצ'אט
  const addBubble = (role, text) => {
    const bubble = document.createElement('div');
    bubble.className = `nerai-bubble nerai-bubble-${role}`;
    bubble.textContent = text;
    messagesArea.appendChild(bubble);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    return bubble;
  };

  // הודעת פתיחה מהסוכן
  addBubble('assistant', welcome);

  const sendMessage = async () => {
    const question = input.value.trim();
    if (!question) return;

    input.value = '';
    input.style.height = 'auto';
    addBubble('user', question);
    history.push({ role: 'user', content: question });

    const thinking = addBubble('assistant', '···');
    thinking.classList.add('nerai-thinking');
    sendBtn.disabled = true;

    // מציג בצ'אט כשהסוכן מפעיל כלי חיצוני (webhook)
    const onToolCall = ({ name, args }) => {
      const note = document.createElement('div');
      note.className = 'nerai-tool-note';
      const argsStr = Object.entries(args).map(([k, v]) => `${k}: ${v}`).join(', ');
      note.textContent = `🔧 מפעיל כלי: ${name}${argsStr ? ' (' + argsStr + ')' : ''}`;
      messagesArea.insertBefore(note, thinking);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    };

    try {
      const reply = await window.askAgent(contextText, history, onToolCall);
      thinking.classList.remove('nerai-thinking');
      thinking.textContent = reply;
      history.push({ role: 'assistant', content: reply });
    } catch (error) {
      console.error('שגיאה בצ\'אט עם הסוכן:', error);
      thinking.classList.remove('nerai-thinking');
      thinking.classList.add('nerai-bubble-error');
      thinking.textContent = 'שגיאה: ' + (error.message || 'לא ידועה');
    } finally {
      sendBtn.disabled = false;
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
  };

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  // גובה דינמי לתיבת הקלט
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input.focus();

  // בקשה פותחת (מכפתור "שאל את הסוכן" בפאנל הניתוח) — נשלחת מיד
  if (options.initialQuestion) {
    input.value = options.initialQuestion;
    sendMessage();
  }
}

// הזרקת סגנונות הבחירה והצ'אט הצדדי
(function injectSelectionStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .nerai-select-btn {
      background: #ffffff;
      color: #7C3AED;
      border: 1.5px solid #C4B5FD;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
      margin-right: 6px;
      padding: 0;
      transition: all 0.15s;
      vertical-align: middle;
    }
    .nerai-select-btn:hover { background: #EDE9FE; }
    .nerai-select-btn.active {
      background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%);
      color: #ffffff;
      border-color: transparent;
    }

    .nerai-selected {
      outline: 2px solid #7C3AED !important;
      outline-offset: 2px;
      border-radius: 8px;
    }

    .nerai-selection-bar {
      position: fixed;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%);
      background: #ffffff;
      border-radius: 30px;
      box-shadow: 0 6px 24px rgba(30, 27, 46, 0.22);
      padding: 8px 10px 8px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 2000;
      animation: nerai-bar-in 0.25s ease-out;
      font-family: "Segoe UI", "Heebo", Arial, sans-serif;
    }
    @keyframes nerai-bar-in {
      from { opacity: 0; transform: translate(-50%, 12px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    .nerai-sel-info { font-size: 13px; color: #41525d; }
    .nerai-sel-info b { color: #7C3AED; }
    .nerai-sel-chat {
      background: linear-gradient(135deg, #7C3AED 0%, #5B4CF5 55%, #06B6D4 100%);
      color: white;
      border: none;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .nerai-sel-chat:hover { opacity: 0.92; }
    .nerai-sel-clear {
      background: none;
      border: none;
      color: #8696a0;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
    }
    .nerai-sel-clear:hover { color: #41525d; }

    .nerai-sidechat {
      position: fixed;
      top: 0;
      right: 0;
      width: 380px;
      max-width: 90vw;
      height: 100vh;
      background: #F4F3FB;
      box-shadow: -6px 0 24px rgba(30, 27, 46, 0.18);
      z-index: 2001;
      display: flex;
      flex-direction: column;
      animation: nerai-panel-in 0.25s ease-out;
      font-family: "Segoe UI", "Heebo", Arial, sans-serif;
    }
    @keyframes nerai-panel-in {
      from { transform: translateX(30px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .nerai-sidechat-header {
      background: linear-gradient(135deg, #7C3AED 0%, #5B4CF5 55%, #06B6D4 100%);
      color: white;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nerai-sidechat-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
    .nerai-sidechat-close {
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
    }
    .nerai-sidechat-close:hover { background: rgba(255,255,255,0.3); }
    .nerai-sidechat-context {
      background: #EDE9FE;
      padding: 8px 16px;
      font-size: 12px;
      color: #5B21B6;
      border-bottom: 1px solid #DDD6FE;
    }
    .nerai-context-label { cursor: pointer; font-weight: 600; }
    .nerai-context-body {
      margin-top: 8px;
      white-space: pre-wrap;
      color: #4c4266;
      max-height: 160px;
      overflow-y: auto;
      font-size: 12px;
      line-height: 1.5;
    }
    .nerai-sidechat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .nerai-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .nerai-bubble-user {
      align-self: flex-start;
      background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .nerai-bubble-assistant {
      align-self: flex-end;
      background: #ffffff;
      color: #2b2440;
      border: 1px solid #E9E5F5;
      border-bottom-left-radius: 4px;
    }
    .nerai-bubble-error { border-color: #FCA5A5 !important; color: #DC2626 !important; }
    .nerai-thinking { color: #8696a0 !important; letter-spacing: 2px; }
    .nerai-tool-note {
      align-self: center;
      background: #FEF3C7;
      color: #92400E;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 12px;
      border: 1px solid #FDE68A;
    }
    .nerai-sidechat-input {
      padding: 12px;
      background: #ffffff;
      border-top: 1px solid #E9E5F5;
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .nerai-chat-text {
      flex: 1;
      border: 1px solid #D1CCE4;
      border-radius: 18px;
      padding: 9px 14px;
      font-size: 14px;
      font-family: inherit;
      resize: none;
      max-height: 120px;
      outline: none;
    }
    .nerai-chat-text:focus { border-color: #7C3AED; }
    .nerai-chat-send {
      background: linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%);
      color: white;
      border: none;
      border-radius: 18px;
      padding: 9px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .nerai-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }

    html[data-theme='dark'] .nerai-sidechat,
    .dark .nerai-sidechat { background: #1f2937; }
    html[data-theme='dark'] .nerai-bubble-assistant,
    .dark .nerai-bubble-assistant { background: #374151; color: #e5e7eb; border-color: #4b5563; }
    html[data-theme='dark'] .nerai-sidechat-input,
    .dark .nerai-sidechat-input { background: #111827; border-color: #374151; }
    html[data-theme='dark'] .nerai-chat-text,
    .dark .nerai-chat-text { background: #1f2937; color: #e5e7eb; border-color: #4b5563; }
  `;
  document.head.appendChild(style);
})();
