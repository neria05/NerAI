/**
 * NerAI — קובץ סלקטורים מרכזי
 * ==============================
 * כל סלקטורי ה־CSS, XPath ו־DOM Query מרוכזים כאן.
 * כשהסלקטורים של WhatsApp Web משתנים — מעדכנים רק כאן.
 *
 * שימוש:
 *   import { SELECTORS } from './selectors.js';    (מודולים)
 *   const S = window.NerAI.Selectors;              (global namespace)
 */

window.NerAI = window.NerAI || {};

window.NerAI.Selectors = {

  // =========================================================================
  // WhatsApp Web — אלמנטים כלליים
  // =========================================================================

  /** תיבת הצ'אט הראשית — #main */
  MAIN: '#main',

  /** כותרת השיחה (header) */
  CHAT_HEADER: '#main header',

  /** שם איש הקשר בכותרת — סלקטור ראשי + גיבויים */
  CHAT_TITLE: {
    primary:    '#main header span[class*="_ao3e"]',
    backups:    [
      'span.x1iyjqo2.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft.x1rg5ohu._ao3e',
      '[data-testid="conversation-info-header-chat-title"]',
      '._amig',
      '.xliyjgo2'
    ]
  },

  /** הודעות בצ'אט — לפי data-pre-plain-text */
  MESSAGE_ELEMENT: 'div[data-pre-plain-text]',

  /** טקסט בתוך הודעה */
  MESSAGE_TEXT: 'span.selectable-text',

  /** הודעה יוצאת (שלי) */
  MESSAGE_OUT: '.message-out',

  /** הודעה נכנסת */
  MESSAGE_IN: '.message-in',

  /** מיכל הודעה */
  MESSAGE_CONTAINER: '.message-container',

  /** הודעות להעתקה (לייצוא) */
  COPYABLE_MESSAGE: '.copyable-text[data-pre-plain-text]',

  // =========================================================================
  // סלקטורים לתיבת הקלדה (footer)
  // =========================================================================

  /** Footer תיבת ההקלדה */
  INPUT_FOOTER: 'footer._ak1i',

  /** תיבת טקסט עשיר (Lexical) */
  LEXICAL_INPUT: '.lexical-rich-text-input div[contenteditable="true"]',

  /** מיכל תיבת הטקסט העשיר */
  LEXICAL_CONTAINER: '.lexical-rich-text-input',

  /** עטיפת האפליקציה — לחיפוש chatWindow */
  APP_WRAPPER: '.app-wrapper-web',

  /** שם איש קשר בכותרת (input-translate) */
  INPUT_HEADER_NAME: 'header._amid span[class*="_ao3e"]',

  // =========================================================================
  // כפתורים של התוסף
  // =========================================================================

  /** כפתור תרגום הודעה */
  TRANSLATE_BTN: '.translate-btn',

  /** מיכל כפתור תרגום */
  TRANSLATE_BTN_CONTAINER: '.translate-btn-container',

  /** מיכל כפתורי הניתוח בכותרת */
  ANALYSIS_BTN_CONTAINER: '.analysis-btn-container',

  /** כפתור תרגום תיבת הקלדה */
  INPUT_TRANSLATE_BTN: '.input-translate-btn',

  // =========================================================================
  // תוצאת תרגום
  // =========================================================================

  /** תוכן תרגום */
  TRANSLATION_CONTENT: '.translation-content',

  /** תוכן תהליך חשיבה */
  THINKING_CONTENT: '.thinking-content',

  /** סמן טעינת תרגום */
  TRANSLATION_LOADING: '.translation-loading',

  // =========================================================================
  // quick-chat.js — סלקטורים לכפתור צ'אט מהיר
  // =========================================================================

  QUICK_CHAT: {
    /** כפתור צ'אט מהיר */
    BTN: '.quick-chat-btn',

    /** מיכלי יעד למיקום הכפתור (לפי סדר עדיפות) */
    TARGET_CONTAINERS: [
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
    ],

    /** XPath למיקום מדויק */
    XPATH: '//*[@id="app"]/div/div[3]/div/div[3]/header/header/div/span/div/div[1]'
  },

  // =========================================================================
  // מודאל הגדרות
  // =========================================================================

  SETTINGS: {
    MODAL:            '.settings-modal',
    CONTENT:          '.settings-content',
    AI_ENABLED:       '#aiEnabled',
    AI_API_SELECT:    '#aiApi',
    TRANSLATION_API:  '#translationApi',
    TARGET_LANGUAGE:  '#targetLanguage',
    SYSTEM_ROLE:      '#systemRole',
    SAVE_BTN:         '.save-btn',
    CLOSE_BTN:        '.close-btn'
  },

  // =========================================================================
  // מודאל ניתוח AI
  // =========================================================================

  ANALYSIS: {
    PANEL:            '.analysis-panel',
    START_BTN:        '.start-analysis',
    EXPORT_BTN:       '.export-chat',
    CHAT_LIST:        '.chat-messages',
    CHAT_MESSAGE:     '.chat-message',
    SELECT_ALL:       '.select-all',
    SELECTED_COUNT:   '.selected-count'
  },

  // =========================================================================
  // מודאל תרגום תיבת הקלדה
  // =========================================================================

  TRANSLATE_MODAL: {
    CONTAINER:        '.translate-modal',
    CONTENT:          '.translate-modal-content',
    CLOSE:            '.modal-close',
    TRANSLATE_BTN:    '.translate-btn',
    VERIFY_BTN:       '.verify-btn',
    APPLY_BTN:        '.apply-btn',
    RESULT_CONTENT:   '.result-content',
    LANG_SELECT:      '.lang-select',
    VERIFY_RESULT:    '.verify-result',
    VERIFY_CONTENT:   '.verify-content'
  },

  // =========================================================================
  // התראות (toast / notification)
  // =========================================================================

  NOTIFICATION:       '.wa-ai-notification',
  TOAST:              '.toast',
  TOAST_CONTENT:      '.toast-content',
  TOAST_CLOSE:        '.toast-close-btn',
  SETTINGS_TOAST:     '.settings-toast',

  // =========================================================================
  // מצב כהה
  // =========================================================================

  DARK_MODE: {
    BODY_CLASS:       'dark',
    HTML_ATTR:        'data-theme',
    MEDIA_QUERY:      '(prefers-color-scheme: dark)'
  },

  // =========================================================================
  // פונקציות עזר
  // =========================================================================

  /**
   * בדיקה אם האלמנט במצב כהה
   * @returns {boolean}
   */
  isDarkMode() {
    return document.body.classList.contains('dark') ||
           (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
           document.documentElement.getAttribute('data-theme') === 'dark';
  }
};
