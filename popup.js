// NerAI - עוזר AI לוואטסאפ | לוגיקת חלון ההגדרות
// by Ner Online - neronline.co.il

// בדיקת סטטוס התוסף מול טאב הוואטסאפ הפתוח
async function checkPluginStatus(retryCount = 0, maxRetries = 3) {
  const statusArea = document.getElementById('statusArea');
  const reloadBtn = document.getElementById('reloadBtn');

  if (!statusArea || !reloadBtn) return;

  try {
    // חיפוש טאב פתוח של WhatsApp Web
    const tabs = await chrome.tabs.query({ url: "*://web.whatsapp.com/*" });

    if (tabs.length === 0) {
      throw new Error('פתח קודם את WhatsApp Web');
    }

    try {
      // בדיקה אם המשתמש נמצא בתוך חלון שיחה
      const chatWindowExists = await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'CHECK_CHAT_WINDOW'
      });

      if (!chatWindowExists || !chatWindowExists.exists) {
        // עדיין לא נכנס לשיחה — מציגים הודעת המתנה
        statusArea.className = 'status-area status-waiting';
        statusArea.innerHTML = `
          <div class="status-icon">💬</div>
          <div class="status-text">
            <div>היכנס לחלון שיחה כלשהו</div>
            <div class="status-detail">התוסף יופעל בתוך חלון השיחה</div>
          </div>
        `;
        reloadBtn.classList.remove('visible');
        return;
      }

      // בדיקה שכפתורי התוסף נטענו בעמוד
      const buttonsLoaded = await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'CHECK_BUTTONS'
      });

      if (buttonsLoaded && buttonsLoaded.success) {
        statusArea.className = 'status-area status-success';
        statusArea.innerHTML = `
          <div class="status-icon">✓</div>
          <div class="status-text">
            <div>התוסף נטען בהצלחה</div>
            <div class="status-detail">הכל מוכן לשימוש</div>
          </div>
        `;
        reloadBtn.classList.remove('visible');
      } else {
        throw new Error('כפתורי התוסף לא נטענו במלואם');
      }

    } catch (error) {
      // ניסיון חוזר אם נותרו ניסיונות
      if (retryCount < maxRetries) {
        console.debug(`מנסה שוב... (${retryCount + 1}/${maxRetries})`);
        statusArea.innerHTML = `
          <div class="status-icon">⟳</div>
          <div class="status-text">
            <div>מנסה להתחבר שוב...</div>
            <div class="status-detail">ניסיון ${retryCount + 1}</div>
          </div>
        `;

        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkPluginStatus(retryCount + 1, maxRetries);
      }

      throw error;
    }

  } catch (error) {
    console.error('בדיקת סטטוס התוסף נכשלה:', error);

    if (statusArea) {
      statusArea.className = 'status-area status-error';
      statusArea.innerHTML = `
        <div class="status-icon">!</div>
        <div class="status-text">
          <div>${error.message}</div>
          <div class="status-detail">נסה לטעון מחדש את התוסף</div>
        </div>
      `;
    }

    if (reloadBtn) {
      reloadBtn.classList.add('visible');
    }
  }
}

// אתחול מאזיני אירועים
document.addEventListener('DOMContentLoaded', async () => {
  // בדיקת סטטוס ראשונית
  await checkPluginStatus();

  // כפתור טעינה מחדש
  const reloadBtn = document.getElementById('reloadBtn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', async () => {
      await reloadPlugin();
    });
  }
});

// טעינה מחדש של התוסף (רענון טאב הוואטסאפ)
async function reloadPlugin() {
  const reloadBtn = document.getElementById('reloadBtn');
  if (!reloadBtn) return;

  try {
    reloadBtn.disabled = true;
    reloadBtn.textContent = 'טוען מחדש...';

    const tabs = await chrome.tabs.query({ url: "*://web.whatsapp.com/*" });
    if (tabs.length > 0) {
      await chrome.tabs.reload(tabs[0].id);
      // המתנה לסיום טעינת העמוד ואז בדיקת סטטוס
      setTimeout(async () => {
        await checkPluginStatus();
        reloadBtn.disabled = false;
        reloadBtn.textContent = 'טען מחדש את התוסף';
      }, 2000);
    } else {
      throw new Error('לא נמצא טאב של WhatsApp Web');
    }
  } catch (error) {
    console.error('הטעינה מחדש נכשלה:', error);
    const statusArea = document.getElementById('statusArea');
    if (statusArea) {
      statusArea.className = 'status-area status-error';
      statusArea.innerHTML = `
        <div class="status-icon">!</div>
        <div class="status-text">
          <div>הטעינה מחדש נכשלה: ${error.message}</div>
          <div class="status-detail">רענן את עמוד הוואטסאפ ונסה שוב</div>
        </div>
      `;
    }
    reloadBtn.disabled = false;
    reloadBtn.textContent = 'טען מחדש את התוסף';
  }
}
