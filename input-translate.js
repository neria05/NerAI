// NerAI - עוזר AI לוואטסאפ | תרגום תיבת הקלט — תרגום הודעה לפני שליחה
// by Ner Online - neronline.co.il

window.initializeInputTranslate = initializeInputTranslate;

// איתור אזור תיבת ההקלדה — סלקטורים מהעמיד לפחות עמיד
// (וואטסאפ מחליפים מחלקות CSS תדיר; תג footer עצמו יציב)
function findComposerFooter() {
  return document.querySelector('#main footer') ||
         document.querySelector('footer._ak1i') ||
         document.querySelector('footer');
}

// איתור תיבת ההקלדה בתוך ה־footer
function findComposerInput(footer) {
  if (!footer) return null;
  return footer.querySelector('.lexical-rich-text-input div[contenteditable="true"]') ||
         footer.querySelector('div[contenteditable="true"]');
}

// הכנסת טקסט לתיבת ההקלדה — תיבת Lexical של וואטסאפ לא מקבלת השמה ישירה,
// לכן מדמים בחירת הכל, מחיקה והדבקה מהלוח
async function applyTextToComposer(text) {
  const footer = findComposerFooter();
  if (!footer) {
    throw new Error('לא נמצא מיכל תיבת ההקלדה');
  }

  const richTextInput = findComposerInput(footer);
  if (!richTextInput) {
    throw new Error('לא נמצאה תיבת הקלדה');
  }

  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  richTextInput.focus();

  // בחירת כל הטקסט הקיים (Ctrl+A / Cmd+A)
  richTextInput.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'a', code: 'KeyA', ctrlKey: !isMac, metaKey: isMac, bubbles: true
  }));

  // מחיקה
  richTextInput.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Backspace', code: 'Backspace', bubbles: true
  }));

  // העתקה ללוח והדבקה (Ctrl+V / Cmd+V)
  await navigator.clipboard.writeText(text);
  richTextInput.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'v', code: 'KeyV', ctrlKey: !isMac, metaKey: isMac, bubbles: true
  }));

  // אירוע input כדי שוואטסאפ יזהה את השינוי
  richTextInput.dispatchEvent(new InputEvent('input', {
    bubbles: true, cancelable: true, inputType: 'insertFromPaste', data: text
  }));
}

// תרגום טקסט לפי שירות התרגום המוגדר
async function translateText(text, targetLang = 'he') {
  console.log('מכין תרגום טקסט:', { text, targetLang });

  try {
    const { service, apiKey, apiUrl, model } = await window.getTranslationService();
    console.log('שירות תרגום נבחר:', service);

    let translation;
    if (service === 'google') {
      // תרגום Google — ללא מפתח
      translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
    } else if (service === 'siliconflow') {
      // OpenAI — דורש כתובת API ומודל
      translation = await window.ApiServices.translation.siliconflow(text, apiKey, apiUrl, model, targetLang);
    } else if (service === 'deepseek') {
      translation = await window.ApiServices.translation.deepseek(text, apiKey, targetLang);
    } else {
      translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
    }
    console.log('התרגום הושלם:', translation);

    // אם התוצאה כוללת תהליך חשיבה — מחזירים רק את התרגום
    if (translation && typeof translation === 'object' && translation.hasThinking) {
      return translation.translation;
    }

    return translation;
  } catch (error) {
    console.error('שגיאה בתרגום:', error);
    throw new Error(error.message || 'התרגום נכשל');
  }
}

// יצירת כפתור התרגום שליד תיבת ההקלדה — כפתור עגול בצבעי המותג
function createTranslateButton() {
  const button = document.createElement('button');
  button.setAttribute('title', 'NerAI: תרגום ההודעה לפני שליחה');
  button.setAttribute('aria-label', 'תרגום ההודעה לפני שליחה');
  button.innerHTML = `
    <span aria-hidden="true" class="translate-icon" style="display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 1024 1024" height="20" width="20" fill="currentColor">
        <path d="M608 416h288c35.36 0 64 28.48 64 64v416c0 35.36-28.48 64-64 64H480c-35.36 0-64-28.48-64-64v-288H128c-35.36 0-64-28.48-64-64V128c0-35.36 28.48-64 64-64h416c35.36 0 64 28.48 64 64v288z m0 64v64c0 35.36-28.48 64-64 64h-64v256.032c0 17.664 14.304 31.968 31.968 31.968H864a31.968 31.968 0 0 0 31.968-31.968V512a31.968 31.968 0 0 0-31.968-31.968H608zM128 159.968V512c0 17.664 14.304 31.968 31.968 31.968H512a31.968 31.968 0 0 0 31.968-31.968V160A31.968 31.968 0 0 0 512.032 128H160A31.968 31.968 0 0 0 128 159.968z m64 244.288V243.36h112.736V176h46.752c6.4 0.928 9.632 1.824 9.632 2.752a10.56 10.56 0 0 1-1.376 4.128c-2.752 7.328-4.128 16.032-4.128 26.112v34.368h119.648v156.768h-50.88v-20.64h-68.768v118.272H306.112v-118.272H238.752v24.768H192z m46.72-122.368v60.48h67.392V281.92H238.752z m185.664 60.48V281.92h-68.768v60.48h68.768z m203.84 488H576L668.128 576h64.64l89.344 254.4h-54.976l-19.264-53.664h-100.384l-19.232 53.632z m33.024-96.256h72.864l-34.368-108.608h-1.376l-37.12 108.608zM896 320h-64a128 128 0 0 0-128-128V128a192 192 0 0 1 192 192zM128 704h64a128 128 0 0 0 128 128v64a192 192 0 0 1-192-192z"/>
      </svg>
    </span>
  `;

  button.style.cssText = `
    background: linear-gradient(135deg, #7C3AED 0%, #5B4CF5 55%, #06B6D4 100%);
    color: #ffffff;
    border: none;
    border-radius: 50%;
    width: 38px;
    height: 38px;
    min-width: 38px;
    margin: 0 6px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    flex-shrink: 0;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.35);
    transition: transform 0.15s, box-shadow 0.15s;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-1px) scale(1.06)';
    button.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.5)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'none';
    button.style.boxShadow = '0 2px 8px rgba(124, 58, 237, 0.35)';
  });

  button.onclick = async (e) => {
    console.log('כפתור התרגום נלחץ');
    e.stopPropagation();

    // איתור תיבת ההקלדה דרך ה־footer
    const footer = findComposerFooter();

    if (!footer) {
      console.warn('לא נמצא footer');
      return;
    }

    const inputBox = findComposerInput(footer);

    if (!inputBox) {
      console.warn('לא נמצאה תיבת הקלדה');
      return;
    }

    const text = inputBox.textContent.trim();
    console.log('טקסט מתיבת ההקלדה:', text);

    if (!text) {
      alert('כתוב קודם הודעה בתיבת ההקלדה, ואז לחץ על כפתור התרגום');
      return;
    }

    // פתיחת חלון התרגום
    const modal = createTranslateModal(text, inputBox);
    button.parentElement.appendChild(modal);
  };

  return button;
}

// הוספת כפתור התרגום לתיבת ההקלדה — ניסיון יחיד ושקט.
// הניסיונות החוזרים מגיעים מה־observer (עם קירור), לא משרשרת setTimeout —
// אחרת הקונסול מוצף כשה־footer לא נמצא
function addInputTranslateButton() {
  // מניעת הוספה כפולה
  if (document.querySelector('.input-translate-btn')) {
    return true;
  }

  const footer = findComposerFooter();
  if (!footer) {
    return false;
  }

  const inputBox = findComposerInput(footer);
  if (!inputBox) {
    return false;
  }

  try {
    const translateBtn = createTranslateButton();
    translateBtn.classList.add('input-translate-btn');

    // מיקום: אחרי מיכל תיבת ההקלדה, עם נפילה חזרה לאב הישיר
    const container = inputBox.closest('.lexical-rich-text-input') || inputBox.parentElement;
    if (!container || !container.parentNode) {
      return false;
    }

    container.parentNode.insertBefore(translateBtn, container.nextSibling);

    // כפתור שיפור ניסוח (✨) — צמוד לכפתור התרגום
    const rewriteBtn = createRewriteButton();
    rewriteBtn.classList.add('input-rewrite-btn');
    container.parentNode.insertBefore(rewriteBtn, translateBtn.nextSibling);

    // כפתור תשובות מהירות (💡) — הצעות תגובה לפי סוף השיחה
    const suggestBtn = createSmartReplyButton();
    suggestBtn.classList.add('input-suggest-btn');
    container.parentNode.insertBefore(suggestBtn, rewriteBtn.nextSibling);

    console.log('NerAI: כפתורי תרגום, שיפור ניסוח ותשובות מהירות נוספו לתיבת ההקלדה');
    return true;
  } catch (error) {
    console.error('שגיאה בהוספת כפתור התרגום:', error);
    return false;
  }
}

// יצירת כפתור שיפור הניסוח (✨) — בצבעי הלהבה של המותג
function createRewriteButton() {
  const button = document.createElement('button');
  button.setAttribute('title', 'NerAI: שיפור ניסוח עם AI');
  button.setAttribute('aria-label', 'שיפור ניסוח ההודעה עם AI');
  button.innerHTML = '<span aria-hidden="true" style="font-size:17px;line-height:1;">✨</span>';

  button.style.cssText = `
    background: linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%);
    color: #ffffff;
    border: none;
    border-radius: 50%;
    width: 38px;
    height: 38px;
    min-width: 38px;
    margin: 0 2px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    flex-shrink: 0;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(244, 63, 94, 0.35);
    transition: transform 0.15s, box-shadow 0.15s;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-1px) scale(1.06)';
    button.style.boxShadow = '0 4px 12px rgba(244, 63, 94, 0.5)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'none';
    button.style.boxShadow = '0 2px 8px rgba(244, 63, 94, 0.35)';
  });

  button.onclick = async (e) => {
    e.stopPropagation();

    const footer = findComposerFooter();
    const inputBox = findComposerInput(footer);

    if (!inputBox) {
      console.warn('לא נמצאה תיבת הקלדה');
      return;
    }

    const text = inputBox.textContent.trim();
    if (!text) {
      alert('כתוב קודם טיוטת הודעה בתיבת ההקלדה, ואז לחץ על ✨ לשיפור הניסוח');
      return;
    }

    const modal = createRewriteModal(text);
    button.parentElement.appendChild(modal);
  };

  return button;
}

// יצירת כפתור התשובות המהירות (💡) — הצעות תגובה חכמות
function createSmartReplyButton() {
  const button = document.createElement('button');
  button.setAttribute('title', 'NerAI: הצעות תגובה חכמות לפי השיחה');
  button.setAttribute('aria-label', 'הצעות תגובה חכמות');
  button.innerHTML = '<span aria-hidden="true" style="font-size:17px;line-height:1;">💡</span>';

  button.style.cssText = `
    background: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%);
    color: #ffffff;
    border: none;
    border-radius: 50%;
    width: 38px;
    height: 38px;
    min-width: 38px;
    margin: 0 2px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    flex-shrink: 0;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-1px) scale(1.06)';
    button.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.5)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'none';
    button.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.35)';
  });

  button.onclick = async (e) => {
    e.stopPropagation();

    // סרגל הצעות פתוח? סוגרים
    const existing = document.querySelector('.nerai-suggestions-bar');
    if (existing) {
      existing.remove();
      return;
    }

    // הקשר: ההודעות האחרונות בשיחה (הפונקציה מוגדרת ב-content.js)
    const items = typeof collectRecentMessages === 'function' ? collectRecentMessages(10) : [];
    if (items.length === 0) {
      alert('לא נמצאו הודעות בשיחה — פתח שיחה עם הודעות ונסה שוב');
      return;
    }

    const contextText = items.map(s => `${s.sender}: ${s.text}`).join('\n');

    // מצב טעינה על הכפתור
    button.disabled = true;
    button.style.opacity = '0.6';
    button.innerHTML = '<span aria-hidden="true" style="font-size:15px;line-height:1;">⏳</span>';

    try {
      const suggestions = await window.suggestReplies(contextText);
      if (!suggestions || suggestions.length === 0) {
        throw new Error('לא התקבלו הצעות');
      }
      showSuggestionsBar(suggestions);
    } catch (error) {
      console.error('הפקת התשובות המהירות נכשלה:', error);
      showTranslationError('הצעות תגובה נכשלו: ' + (error.message || 'שגיאה לא ידועה'));
    } finally {
      button.disabled = false;
      button.style.opacity = '1';
      button.innerHTML = '<span aria-hidden="true" style="font-size:17px;line-height:1;">💡</span>';
    }
  };

  return button;
}

// סרגל שבבי ההצעות — מוצג מעל תיבת ההקלדה, לחיצה מכניסה לתיבה
function showSuggestionsBar(suggestions) {
  document.querySelector('.nerai-suggestions-bar')?.remove();

  const bar = document.createElement('div');
  bar.className = 'nerai-suggestions-bar';
  bar.setAttribute('dir', 'rtl');
  bar.style.cssText = `
    position: fixed;
    bottom: 78px;
    left: 50%;
    transform: translateX(-50%);
    max-width: min(720px, 92vw);
    background: #ffffff;
    border-radius: 14px;
    box-shadow: 0 8px 28px rgba(30, 27, 46, 0.25);
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    z-index: 2000;
    font-family: "Segoe UI", "Heebo", Arial, sans-serif;
  `;

  const label = document.createElement('span');
  label.textContent = '💡';
  label.style.cssText = 'font-size: 16px;';
  bar.appendChild(label);

  suggestions.forEach(text => {
    const chip = document.createElement('button');
    chip.textContent = text;
    chip.setAttribute('title', 'לחץ להכנסה לתיבת ההקלדה');
    chip.style.cssText = `
      background: #F4F3FB;
      color: #2b2440;
      border: 1px solid #DDD6FE;
      border-radius: 18px;
      padding: 8px 14px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
      max-width: 260px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: all 0.15s;
    `;
    chip.addEventListener('mouseenter', () => {
      chip.style.background = '#EDE9FE';
      chip.style.borderColor = '#7C3AED';
    });
    chip.addEventListener('mouseleave', () => {
      chip.style.background = '#F4F3FB';
      chip.style.borderColor = '#DDD6FE';
    });
    chip.addEventListener('click', async () => {
      try {
        await applyTextToComposer(text);
        bar.remove();
      } catch (error) {
        console.error('הכנסת ההצעה לתיבה נכשלה:', error);
      }
    });
    bar.appendChild(chip);
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.setAttribute('title', 'סגור');
  closeBtn.style.cssText = 'background:none;border:none;color:#8696a0;font-size:18px;cursor:pointer;padding:0 4px;font-family:inherit;';
  closeBtn.addEventListener('click', () => bar.remove());
  bar.appendChild(closeBtn);

  document.body.appendChild(bar);
}

// מודאל שיפור הניסוח — בחירת סגנון, שכתוב והחלה לתיבה
function createRewriteModal(text) {
  const TONES = {
    professional: 'מקצועי',
    friendly: 'ידידותי',
    concise: 'קצר ותכליתי',
    marketing: 'שיווקי'
  };
  const savedTone = localStorage.getItem('nerai_rewrite_tone') || 'professional';

  const modal = document.createElement('div');
  modal.className = 'translate-modal';
  modal.innerHTML = `
    <div class="translate-modal-content" dir="rtl">
      <div class="translate-modal-header" style="background: linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%);">
        <h3>✨ שיפור ניסוח</h3>
        <button class="modal-close">×</button>
      </div>
      <div class="translate-modal-body">
        <div class="source-text">
          <div class="text-label">הטיוטה שלך</div>
          <div class="text-content rewrite-source"></div>
        </div>
        <div class="target-lang">
          <div class="text-label">סגנון</div>
          <select class="lang-select tone-select">
            ${Object.entries(TONES).map(([value, name]) => `
              <option value="${value}"${value === savedTone ? ' selected' : ''}>${name}</option>
            `).join('')}
          </select>
        </div>
        <div class="translation-result">
          <div class="text-label">הגרסה המשופרת</div>
          <div class="result-content"></div>
        </div>
      </div>
      <div class="translate-modal-footer">
        <button class="rewrite-go-btn translate-btn" style="background: linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%);">שפר ניסוח</button>
        <button class="apply-btn" disabled>החל</button>
      </div>
    </div>
  `;

  // הטקסט מוזן כ־textContent כדי למנוע הזרקת HTML
  modal.querySelector('.rewrite-source').textContent = text;

  const closeBtn = modal.querySelector('.modal-close');
  const rewriteGoBtn = modal.querySelector('.rewrite-go-btn');
  const applyBtn = modal.querySelector('.apply-btn');
  const resultContent = modal.querySelector('.result-content');
  const toneSelect = modal.querySelector('.tone-select');

  closeBtn.onclick = () => modal.remove();

  // שמירת הסגנון הנבחר לפעם הבאה
  toneSelect.addEventListener('change', (e) => {
    localStorage.setItem('nerai_rewrite_tone', e.target.value);
  });

  rewriteGoBtn.onclick = async () => {
    try {
      rewriteGoBtn.classList.add('btn-loading');
      const tone = toneSelect.value;

      const improved = await window.rewriteText(text, tone);
      console.log('NerAI: שיפור הניסוח הושלם');

      resultContent.textContent = improved;
      applyBtn.disabled = false;
    } catch (error) {
      console.error('שיפור הניסוח נכשל:', error);
      resultContent.textContent = 'שיפור הניסוח נכשל: ' + (error.message || 'שגיאה לא ידועה');
    } finally {
      rewriteGoBtn.classList.remove('btn-loading');
    }
  };

  applyBtn.onclick = async () => {
    const improved = resultContent.textContent;
    if (!improved) return;

    try {
      await applyTextToComposer(improved);
      modal.remove();
    } catch (error) {
      console.error('החלת הניסוח המשופר נכשלה:', error);
      alert('החלת הניסוח המשופר נכשלה: ' + error.message);
    }
  };

  modal.onclick = (e) => e.stopPropagation();

  return modal;
}

// אתחול תכונת תרגום תיבת ההקלדה
function initializeInputTranslate() {
  console.log('מאתחל את תרגום תיבת ההקלדה...');

  // מעקב אחרי שינויים ב־DOM עם קירור של 2 שניות בין ניסיונות
  let lastAttempt = 0;
  const observer = new MutationObserver(() => {
    if (document.querySelector('.input-translate-btn')) return;

    const now = Date.now();
    if (now - lastAttempt < 2000) return;
    lastAttempt = now;

    addInputTranslateButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // ניסיון ראשוני
  addInputTranslateButton();

  // פונקציית ניקוי
  return () => {
    console.log('מנקה את תכונת תרגום תיבת ההקלדה...');
    observer.disconnect();
  };
}

// עיצוב הודעות toast
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  .translate-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 999999;
    animation: toastFade 0.3s ease;
  }

  .translate-toast-error {
    background: rgba(220, 38, 38, 0.9);
  }

  @keyframes toastFade {
    from {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
`;
document.head.appendChild(toastStyles);

// תרגום Google ישיר — משמש לאימות תרגום (תרגום חוזר)
async function googleTranslate(text, targetLang) {
  console.log('מתחיל תרגום Google:', { text, targetLang });

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    const data = await response.json();

    const translation = data[0]
      .map(item => item[0])
      .filter(Boolean)
      .join('');

    console.log('תוצאת תרגום Google:', { originalText: text, translation, targetLang });

    return translation;
  } catch (error) {
    console.error('תרגום Google נכשל:', { error, text, targetLang });
    throw error;
  }
}

// תרגום מתוך חלון התרגום
async function modalTranslation(text, targetLang) {
  console.log('מתחיל תרגום בחלון:', { text, targetLang });

  try {
    let translation;
    const { service, apiKey, apiUrl, model } = await window.getTranslationService();
    console.log('משתמש בשירות תרגום:', service);

    if (service === 'google') {
      translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
    } else if (service === 'siliconflow') {
      translation = await window.ApiServices.translation.siliconflow(text, apiKey, apiUrl, model, targetLang);
    } else if (service === 'deepseek') {
      translation = await window.ApiServices.translation.deepseek(text, apiKey, targetLang);
    } else {
      translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
    }

    // אם התוצאה כוללת תהליך חשיבה — לוקחים רק את התרגום
    if (translation && typeof translation === 'object' && translation.hasThinking) {
      console.log('התקבלה תוצאה עם תהליך חשיבה:', {
        thinkingLength: translation.thinking?.length || 0,
        translationLength: translation.translation?.length || 0
      });
      translation = translation.translation;
    }

    return translation;
  } catch (error) {
    console.error('תרגום בחלון נכשל:', error);
    throw error;
  }
}

// אימות תרגום — תרגום התוצאה חזרה לשפת המקור להשוואה
async function verifyTranslation(translatedText, originalLang) {
  console.log('מתחיל אימות תרגום:', { translatedText, originalLang });

  try {
    const backTranslation = await googleTranslate(translatedText, originalLang);
    console.log('תוצאת תרגום חוזר:', { translatedText, backTranslation });

    return backTranslation;
  } catch (error) {
    console.error('אימות התרגום נכשל:', error);
    throw error;
  }
}

// מיפוי שפות יעד לתרגום יוצא
const LANGUAGES = {
  'en': 'אנגלית',
  'he': 'עברית',
  'ar': 'ערבית',
  'ru': 'רוסית',
  'fr': 'צרפתית',
  'de': 'גרמנית',
  'es': 'ספרדית',
  'it': 'איטלקית',
  'pt': 'פורטוגזית',
  'zh': 'סינית',
  'ja': 'יפנית',
  'ko': 'קוריאנית',
  'hi': 'הינדי',
  'th': 'תאית'
};

// שמירת בחירת השפה לפי שם איש הקשר
function rememberLanguageChoice(chatWindow, lang) {
  if (chatWindow) {
    const nameElement = chatWindow.querySelector('header._amid span[class*="_ao3e"]');
    const chatName = nameElement?.textContent?.trim() || 'default';

    try {
      const languagePreferences = JSON.parse(localStorage.getItem('chatLanguagePreferences') || '{}');
      languagePreferences[chatName] = lang;
      localStorage.setItem('chatLanguagePreferences', JSON.stringify(languagePreferences));

      console.log('בחירת השפה נשמרה:', { chatName, lang });
    } catch (error) {
      console.error('שמירת בחירת השפה נכשלה:', error);
    }
  }
}

// שליפת בחירת השפה השמורה לאיש הקשר
function getRememberedLanguage(chatWindow) {
  if (!chatWindow) return 'en';

  try {
    const nameElement = chatWindow.querySelector('header._amid span[class*="_ao3e"]');
    const chatName = nameElement?.textContent?.trim() || 'default';

    const languagePreferences = JSON.parse(localStorage.getItem('chatLanguagePreferences') || '{}');
    const rememberedLang = languagePreferences[chatName];

    console.log('בחירת שפה שמורה:', { chatName, rememberedLang });

    return rememberedLang || 'en';
  } catch (error) {
    console.error('שליפת בחירת השפה נכשלה:', error);
    return 'en';
  }
}

// יצירת חלון התרגום
function createTranslateModal(text, inputBox) {
  const chatWindow = inputBox.closest('.app-wrapper-web');
  const rememberedLang = getRememberedLanguage(chatWindow);

  const modal = document.createElement('div');
  modal.className = 'translate-modal';
  modal.innerHTML = `
    <div class="translate-modal-content" dir="rtl">
      <div class="translate-modal-header">
        <h3>תרגום לפני שליחה</h3>
        <button class="modal-close">×</button>
      </div>
      <div class="translate-modal-body">
        <div class="source-text">
          <div class="text-label">טקסט מקור</div>
          <div class="text-content">${text}</div>
        </div>
        <div class="target-lang">
          <div class="text-label">שפת יעד</div>
          <select class="lang-select">
            ${Object.entries(LANGUAGES).map(([code, name]) => `
              <option value="${code}"${code === rememberedLang ? ' selected' : ''}>${name}</option>
            `).join('')}
          </select>
        </div>
        <div class="translation-result">
          <div class="text-label">תוצאת התרגום</div>
          <div class="result-content"></div>
        </div>
        <div class="verify-result" style="display: none">
          <div class="text-label">אימות (תרגום חוזר דרך Google)</div>
          <div class="verify-content"></div>
        </div>
      </div>
      <div class="translate-modal-footer">
        <button class="translate-btn">תרגם</button>
        <button class="verify-btn" style="display: none">אמת</button>
        <button class="apply-btn" disabled>החל</button>
      </div>
    </div>
  `;

  const styles = `
    .translate-modal {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 8px;
      background: transparent;
      z-index: 999999;
      width: 320px;
    }

    .translate-modal-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: modalSlideUp 0.2s ease-out;
    }

    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .translate-modal-header {
      padding: 12px 16px;
      border-bottom: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #7C3AED 0%, #5B4CF5 55%, #06B6D4 100%);
      border-radius: 8px 8px 0 0;
    }

    .translate-modal-header h3 {
      margin: 0;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
    }

    .translate-modal-header .modal-close {
      color: rgba(255, 255, 255, 0.85);
    }

    .translate-modal-header .modal-close:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.15);
    }

    .modal-close {
      background: none;
      border: none;
      color: #8696a0;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .translate-modal-body {
      padding: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .text-label {
      color: #8696a0;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .text-content, .result-content {
      background: #f0f2f5;
      padding: 8px 12px;
      border-radius: 6px;
      color: #41525d;
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 12px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .target-lang {
      margin-bottom: 12px;
    }

    .lang-select {
      width: 100%;
      padding: 8px;
      border: 1px solid #e9edef;
      border-radius: 6px;
      color: #41525d;
      font-size: 13px;
      background: white;
      cursor: pointer;
    }

    .lang-select:hover {
      border-color: #7C3AED;
    }

    .lang-select:focus {
      outline: none;
      border-color: #7C3AED;
      box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.12);
    }

    .lang-select option {
      padding: 8px;
    }

    .translate-modal-footer {
      padding: 8px 12px;
      border-top: 1px solid #e9edef;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      background: #f8f9fa;
    }

    .translate-modal-footer button {
      padding: 6px 12px;
      border-radius: 4px;
      border: none;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .translate-btn {
      background: linear-gradient(135deg, #7C3AED 0%, #5B4CF5 55%, #06B6D4 100%);
      color: white;
      font-weight: 600;
    }

    .apply-btn {
      background: #16A34A;
      color: white;
      font-weight: 600;
    }

    .apply-btn:disabled {
      background: #e9edef;
      color: #8696a0;
      cursor: not-allowed;
    }

    button:hover:not(:disabled) {
      opacity: 0.9;
    }

    /* חץ קטן שמצביע על תיבת ההקלדה */
    .translate-modal-content::after {
      content: '';
      position: absolute;
      bottom: -6px;
      right: 12px;
      width: 12px;
      height: 12px;
      background: white;
      transform: rotate(45deg);
      box-shadow: 3px 3px 3px rgba(0, 0, 0, 0.05);
      border-right: 1px solid #e9edef;
      border-bottom: 1px solid #e9edef;
    }

    .verify-result {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #e9edef;
    }

    .verify-content {
      background: #f8f9fa;
      padding: 8px 12px;
      border-radius: 6px;
      color: #667781;
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid #e9edef;
    }

    .verify-btn {
      background: #f0f2f5;
      color: #41525d;
      border: 1px solid #e9edef;
    }

    .verify-btn:hover {
      background: #e9edef;
    }

    /* אנימציית טעינה על כפתורים */
    .btn-loading {
      position: relative;
      color: transparent !important;
    }

    .btn-loading::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: btn-spin 0.8s linear infinite;
    }

    @keyframes btn-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // חיווט אירועים
  const closeBtn = modal.querySelector('.modal-close');
  const translateBtn = modal.querySelector('.translate-btn');
  const verifyBtn = modal.querySelector('.verify-btn');
  const applyBtn = modal.querySelector('.apply-btn');
  const resultContent = modal.querySelector('.result-content');
  const langSelect = modal.querySelector('.lang-select');
  const verifyResult = modal.querySelector('.verify-result');
  const verifyContent = modal.querySelector('.verify-content');

  closeBtn.onclick = () => modal.remove();

  // שמירת בחירת השפה בכל שינוי
  langSelect.addEventListener('change', (e) => {
    rememberLanguageChoice(chatWindow, e.target.value);
    console.log('בחירת השפה שונתה:', { newLang: e.target.value });
  });

  // כפתור תרגום
  translateBtn.onclick = async () => {
    console.log('כפתור תרגם נלחץ');
    try {
      translateBtn.classList.add('btn-loading');
      const targetLang = langSelect.value;
      console.log('מתחיל תרגום:', { text, targetLang });

      const translation = await modalTranslation(text, targetLang);
      console.log('התרגום הושלם:', { originalText: text, translation });

      // טיפול בתוצאה שהיא אובייקט (תרגום עם תהליך חשיבה)
      if (translation && typeof translation === 'object') {
        if (translation.hasThinking) {
          resultContent.textContent = translation.translation;
        } else {
          resultContent.textContent = JSON.stringify(translation);
        }
      } else {
        resultContent.textContent = translation;
      }

      verifyBtn.style.display = 'inline-block';
      applyBtn.disabled = false;
      verifyResult.style.display = 'none';

      rememberLanguageChoice(chatWindow, targetLang);
    } catch (error) {
      console.error('שגיאה בתרגום:', {
        message: error.message,
        stack: error.stack
      });

      resultContent.textContent = 'התרגום נכשל: ' + (error.message || 'שגיאה לא ידועה');

      // הודעת toast עם השגיאה
      const toast = document.createElement('div');
      toast.className = 'translate-toast translate-toast-error';
      toast.textContent = 'התרגום נכשל: ' + (error.message || 'שגיאה לא ידועה');
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 3000);
    } finally {
      translateBtn.classList.remove('btn-loading');
    }
  };

  // כפתור אימות — תרגום חוזר של התוצאה לעברית להשוואה
  verifyBtn.onclick = async () => {
    console.log('כפתור אימות נלחץ');
    try {
      verifyBtn.classList.add('btn-loading');
      const translatedText = resultContent.textContent;
      const currentLang = langSelect.value;

      // שפת האימות: אם תרגמנו לעברית — נאמת באנגלית, אחרת נאמת בעברית
      const originalLang = currentLang === 'he' ? 'en' : 'he';

      console.log('מתחיל אימות תרגום:', { translatedText, originalLang, currentLang });

      const verification = await verifyTranslation(translatedText, originalLang);
      console.log('אימות התרגום הושלם:', { translatedText, verification });

      verifyContent.textContent = verification;
      verifyResult.style.display = 'block';
    } catch (error) {
      console.error('שגיאה באימות התרגום:', error);
      verifyContent.textContent = 'האימות נכשל: ' + error.message;
      verifyResult.style.display = 'block';
    } finally {
      verifyBtn.classList.remove('btn-loading');
    }
  };

  // כפתור החלה — הכנסת התרגום לתיבת ההקלדה
  applyBtn.onclick = async () => {
    const translation = resultContent.textContent;

    if (!translation) {
      console.error('אין תוצאת תרגום להחלה');
      return;
    }

    console.log('מחיל את תוצאת התרגום:', { translationText: translation });

    try {
      const footer = findComposerFooter();

      if (!footer) {
        throw new Error('לא נמצא מיכל תיבת ההקלדה');
      }

      const richTextInput = findComposerInput(footer);

      if (!richTextInput) {
        throw new Error('לא נמצאה תיבת הקלדה');
      }

      try {
        // תיבת ההקלדה של וואטסאפ היא רכיב Lexical — הדרך האמינה להחליף
        // תוכן היא סימולציה של בחירת הכל, מחיקה והדבקה מהלוח

        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

        richTextInput.focus();

        // בחירת כל הטקסט הקיים (Ctrl+A / Cmd+A)
        const selectAll = new KeyboardEvent('keydown', {
          key: 'a',
          code: 'KeyA',
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true
        });
        richTextInput.dispatchEvent(selectAll);

        // מחיקה
        const backspace = new KeyboardEvent('keydown', {
          key: 'Backspace',
          code: 'Backspace',
          bubbles: true
        });
        richTextInput.dispatchEvent(backspace);

        // העתקת התרגום ללוח
        await navigator.clipboard.writeText(translation);
        console.log('התרגום הועתק ללוח');

        // הדבקה (Ctrl+V / Cmd+V)
        const paste = new KeyboardEvent('keydown', {
          key: 'v',
          code: 'KeyV',
          ctrlKey: !isMac,
          metaKey: isMac,
          bubbles: true
        });
        richTextInput.dispatchEvent(paste);

        // הפעלת אירוע input כדי שוואטסאפ יזהה את השינוי
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertFromPaste',
          data: translation
        });
        richTextInput.dispatchEvent(inputEvent);

        console.log('מצב סופי:', {
          expectedContent: translation,
          actualContent: richTextInput.textContent,
          success: richTextInput.textContent === translation
        });

        modal.remove();
      } catch (inputError) {
        console.error('פעולת ההקלדה נכשלה:', inputError);
        throw inputError;
      }
    } catch (error) {
      console.error('החלת תוצאת התרגום נכשלה:', { error, translation });
      alert('החלת תוצאת התרגום נכשלה: ' + error.message);
    }
  };

  // מניעת סגירה בלחיצה בתוך החלון
  modal.onclick = (e) => {
    e.stopPropagation();
  };

  return modal;
}

// הצגת שגיאת תרגום כ־toast
function showTranslationError(message, code) {
  const toast = document.createElement('div');
  toast.className = 'translate-toast translate-toast-error';
  toast.textContent = message + (code ? ` (${code})` : '');
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// הפעלת תכונת תרגום תיבת ההקלדה
initializeInputTranslate();
