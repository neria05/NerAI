// NerAI - עוזר AI לוואטסאפ | צ'אט מהיר — פתיחת שיחה עם מספר בלי לשמור איש קשר
// by Ner Online - neronline.co.il

// פונקציית throttle להגבלת קצב קריאות
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// הוספת כפתור צ'אט מהיר לסרגל העליון של רשימת השיחות
function addQuickChatButton() {
  try {
    console.log('מנסה להוסיף כפתור צ\'אט מהיר');

    // בדיקה שהכפתור לא קיים כבר
    if (document.querySelector('.quick-chat-btn')) {
      console.log('כפתור הצ\'אט המהיר כבר קיים, מדלג');
      return;
    }

    // רשימת סלקטורים אפשריים למיקום הכפתור (ה־DOM של וואטסאפ משתנה תדיר)
    const selectors = [
      '.x78zum5.x1okw0bk.x6s0dn4.xh8yej3.x14wi4xw.xexx8yu.x4uap5.x18d9i69.xkhd6sd',
      'div[data-tab="3"]',
      '#side header',
      'header._23P3O',
      '#app div[role="navigation"]',
      '#app header',
      'header[data-testid="chatlist-header"]',
      '#side > header',
      '#app div[data-testid="chat-list-header"]'
    ];

    let targetContainer = null;
    for (const selector of selectors) {
      targetContainer = document.querySelector(selector);
      if (targetContainer) {
        console.log('נמצא מיכל יעד עם הסלקטור:', selector);
        break;
      }
    }

    if (!targetContainer) {
      console.warn('לא נמצא מיכל יעד מתאים, ימתין לניסיון נוסף');
      return;
    }

    // יצירת הכפתור
    const quickChatBtn = document.createElement('div');
    quickChatBtn.className = 'quick-chat-btn x78zum5 x6s0dn4 x1y1aw1k x1sxyh0 xwib8y2 xurb0ha';
    quickChatBtn.setAttribute('role', 'button');
    quickChatBtn.setAttribute('tabindex', '0');
    quickChatBtn.setAttribute('title', 'צ\'אט מהיר');
    quickChatBtn.setAttribute('aria-label', 'פתיחת שיחה עם מספר לא שמור');
    quickChatBtn.innerHTML = `
      <span aria-hidden="true" data-icon="quick-chat" class="">
        <svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <path d="M314.8288 518.9376c-10.3424 0-17.2288-3.456-24.1408-10.3424-6.8864-6.8864-10.3424-13.7984-10.3424-24.1408s3.456-17.2288 10.3424-24.1408c3.456-3.456 6.8864-6.8864 10.3424-6.8864 6.8864-3.456 17.2288-3.456 27.5712 0 3.456 0 6.8864 3.456 10.3424 6.8864 6.8864 6.8864 10.3424 13.7984 10.3424 24.1408s-3.456 17.2288-10.3424 24.1408c-6.8864 6.8864-17.2032 10.3424-24.1152 10.3424z m144.7936 0c-3.456 0-10.3424 0-13.7984-3.456-3.456-3.456-6.8864-3.456-10.3424-6.8864-6.8864-6.8864-10.3424-13.7984-10.3424-24.1408s3.456-17.2288 10.3424-24.1408c13.7984-13.7984 34.4832-13.7984 48.256 0 6.8864 6.8864 10.3424 13.7984 10.3424 24.1408s-3.456 17.2288-10.3424 24.1408c-3.456 3.456-6.8864 6.8864-10.3424 6.8864-3.4304 0-10.3424 3.456-13.7728 3.456z m144.768 0c-3.456 0-10.3424 0-13.7984-3.456-3.456-3.456-6.8864-3.456-10.3424-6.8864-6.8864-6.8864-10.3424-13.7984-10.3424-24.1408s3.456-17.2288 10.3424-24.1408c13.7984-13.7984 34.4832-13.7984 48.256 0 6.8864 6.8864 10.3424 13.7984 10.3424 24.1408s-3.456 17.2288-10.3424 24.1408c-3.456 3.456-6.8864 6.8864-10.3424 6.8864-3.4304 0-10.3168 3.456-13.7728 3.456z m0 0" fill="#7C3AED"/>
          <path d="M883.6096 753.3312c27.5712-44.8 41.3696-93.0816 41.3696-144.7936 0-93.0816-48.256-179.2512-127.5392-234.4192h-3.456C742.272 250.0096 611.2768 163.84 456.1664 163.84c-196.48-3.456-358.5024 141.3376-358.5024 320.5888 0 58.5984 13.7984 110.3104 48.256 158.5664l-44.8 117.1968c-3.456 10.3424-3.456 24.1408 6.8864 34.4832 3.456 10.3424 13.7984 13.7984 24.1408 13.7984h6.8864l158.5664-31.0272c13.7984 6.8864 27.5712 10.3424 41.3696 13.7984 62.0544 68.9408 155.136 110.3104 255.104 110.3104 51.712 0 99.968-10.3424 144.7936-27.5712l144.7936 27.5712h6.8864c10.3424 0 20.6848-3.456 27.5712-13.7984 6.8864-10.3424 10.3424-24.1408 6.8864-34.4832l-41.3952-99.9424z m-582.5536-44.8h-6.8864l-110.3104 20.6848 27.5712-75.8272c3.456-10.3424 3.456-24.1408-3.456-31.0272-27.5712-44.8-41.3696-89.6256-41.3696-137.8816 0-141.3376 130.9952-255.104 293.0176-255.104 162.0224 0 293.0176 113.7664 293.0176 255.104s-134.4512 255.104-293.0176 255.104c-51.712 0-99.968-10.3424-141.3376-31.0272h-17.2288z m513.6128 51.712l24.1408 62.0544-93.0816-17.2288c-6.8864 0-13.7984 0-20.6848 3.456-37.9136 17.2288-82.7392 27.5712-127.5392 27.5712-41.3696 0-82.7392-10.3424-120.6528-27.5712 189.5936-6.8864 341.2736-148.224 341.2736-320.5888 24.1408 34.4832 37.9136 75.8272 37.9136 120.6528 0 41.3696-13.7984 82.7392-41.3696 120.6528-3.4304 10.3168-3.4304 20.6592 0 31.0016z m0 0" fill="#7C3AED"/>
        </svg>
      </span>
    `;

    // עיצוב הכפתור
    const style = document.createElement('style');
    style.textContent = `
      .quick-chat-btn {
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        transition: background-color 0.3s;
        margin-left: 8px;
        display: inline-flex;
        align-items: center;
      }
      .quick-chat-btn:hover {
        background-color: rgba(134, 150, 160, 0.15);
      }
    `;
    document.head.appendChild(style);

    // לחיצה על הכפתור פותחת מודאל להזנת מספר
    quickChatBtn.addEventListener('click', () => {
      const modal = document.createElement('div');
      modal.className = 'quick-chat-modal';
      modal.innerHTML = `
        <div class="quick-chat-content" dir="rtl">
          <h3>פתיחת שיחה מהירה</h3>
          <div class="input-group">
            <div class="input-field phone-number">
              <label for="phoneNumber">מספר טלפון (כולל קידומת בינלאומית)</label>
              <input type="text" id="phoneNumber" placeholder="לדוגמה: 972501234567+" dir="ltr">
            </div>
          </div>
          <div class="button-group">
            <button id="cancelBtn">ביטול</button>
            <button id="confirmBtn">פתח שיחה</button>
          </div>
          <div class="copyright-info">
            מופעל על ידי NerAI — Ner Online
          </div>
        </div>
      `;

      // עיצוב המודאל
      const modalStyle = document.createElement('style');
      modalStyle.textContent = `
        .quick-chat-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .quick-chat-content {
          background: white;
          padding: 30px;
          border-radius: 12px;
          width: 360px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .quick-chat-content h3 {
          margin: 0 0 24px;
          text-align: center;
          color: #5B21B6;
          font-size: 20px;
          font-weight: 700;
        }
        .input-group {
          margin-bottom: 24px;
        }
        .input-field {
          margin-bottom: 16px;
        }
        .input-field label {
          display: block;
          margin-bottom: 8px;
          color: #6D28D9;
          font-weight: 500;
        }
        .input-field input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 16px;
          box-sizing: border-box;
        }
        .button-group {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-bottom: 20px;
        }
        .button-group button {
          padding: 10px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s;
        }
        #cancelBtn {
          background: #f5f5f5;
          border: 1px solid #ddd;
          color: #666;
        }
        #cancelBtn:hover {
          background: #e9e9e9;
        }
        #confirmBtn {
          background: linear-gradient(135deg, #7C3AED 0%, #5B4CF5 55%, #06B6D4 100%);
          border: none;
          color: white;
          font-weight: 600;
        }
        #confirmBtn:hover {
          opacity: 0.92;
        }
        .copyright-info {
          text-align: center;
          color: #666;
          font-size: 12px;
          line-height: 1.6;
        }
      `;
      document.head.appendChild(modalStyle);

      document.body.appendChild(modal);

      // חיווט אירועים
      const cancelBtn = modal.querySelector('#cancelBtn');
      const confirmBtn = modal.querySelector('#confirmBtn');
      const phoneNumberInput = modal.querySelector('#phoneNumber');

      // Enter מאשר את הטופס
      phoneNumberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          confirmBtn.click();
        }
      });

      cancelBtn.addEventListener('click', () => {
        modal.remove();
      });

      confirmBtn.addEventListener('click', () => {
        const phoneNumber = phoneNumberInput.value.trim();

        if (!phoneNumber) {
          alert('נא להזין מספר טלפון');
          return;
        }

        // הסרת כל התווים שאינם ספרות (שומרים על פלוס ואז מסירים אותו)
        const fullNumber = phoneNumber.replace(/[^\d+]/g, '').replace(/^\+/, '');

        try {
          // פתיחת שיחה דרך קישור WhatsApp
          const link = document.createElement('a');
          link.href = `whatsapp://send?phone=${fullNumber}`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => document.body.removeChild(link), 100);
        } catch (error) {
          alert('לא ניתן לפתוח את WhatsApp. ודא שהאפליקציה מותקנת במחשב.');
        }

        modal.remove();
      });
    });

    // ניסיון להוסיף את הכפתור בכמה דרכים
    try {
      // דרך 1: מיקום לפי XPath של הסרגל העליון
      try {
        const xpathResult = document.evaluate(
          '//*[@id="app"]/div/div[3]/div/div[3]/header/header/div/span/div/div[1]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );

        const targetElement = xpathResult.singleNodeValue;

        if (targetElement) {
          targetElement.parentNode.insertBefore(quickChatBtn, targetElement);
          console.log('הכפתור נוסף בהצלחה לפי נתיב XPath');
          return;
        }
        console.log('נתיב ה־XPath לא נמצא, מנסה דרכים אחרות');
      } catch (xpathError) {
        console.error('שגיאת XPath:', xpathError);
      }

      // דרך 2: הוספה בסוף ה־header
      targetContainer.appendChild(quickChatBtn);
      console.log('הכפתור נוסף בהצלחה בסוף ה־header');
    } catch (error) {
      console.error('שגיאה בהוספת הכפתור:', error);
    }
  } catch (error) {
    console.error('שגיאה בהוספת כפתור הצ\'אט המהיר:', error);
  }
}

// מנגנון ניסיונות חוזרים — ה־DOM של וואטסאפ נטען בהדרגה
let retryCount = 0;
const MAX_RETRIES = 15;
const RETRY_INTERVAL = 3000;

function retryAddButton() {
  const selectors = [
    '.x78zum5.x1okw0bk.x6s0dn4.xh8yej3.x14wi4xw.xexx8yu.x4uap5.x18d9i69.xkhd6sd',
    'div[data-tab="3"]',
    '#side header',
    'header._23P3O',
    '#app div[role="navigation"]',
    '#app header',
    'header[data-testid="chatlist-header"]',
    '#side > header',
    '#app div[data-testid="chat-list-header"]',
    '#app > div > div > div > div > header'
  ];

  let targetContainer = null;
  for (const selector of selectors) {
    targetContainer = document.querySelector(selector);
    if (targetContainer) {
      break;
    }
  }

  if (!targetContainer) {
    console.debug('ממתין לטעינת מיכל היעד...');

    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        retryCount++;
        retryAddButton();
      }, RETRY_INTERVAL);
    }
    return;
  }

  // בדיקה שהכפתור לא קיים כבר
  if (targetContainer.querySelector('.quick-chat-btn')) {
    return;
  }

  addQuickChatButton();
}

// מעקב אחרי שינויים ב־DOM כדי להוסיף את הכפתור ברגע שהסרגל נטען
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length && !document.querySelector('.quick-chat-btn')) {
      retryAddButton();
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true
});

// בדיקה ראשונית
retryAddButton();

// הפעלת האתחול הראשי של התוסף (מוגדר ב־content.js)
initialize();
