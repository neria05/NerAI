// NerAI - עוזר AI לוואטסאפ | ניהול שירותי API
// by Ner Online - neronline.co.il

// הנחיית המערכת הבסיסית של סוכן NerAI — משמשת עד שהמשתמש מגדיר אחת משלו (דרך אשף ה-setup)
window.NERAI_DEFAULT_SYSTEM_ROLE = 'אתה NerAI — עוזר אישי חכם לוואטסאפ. אתה עוזר למשתמש לנתח שיחות, לנסח הודעות ולתקשר בצורה יעילה ומקצועית. ענה בעברית אלא אם התבקשת אחרת.';

// הפרופיל שממנו נבנתה הנחיית המערכת (נשמר כדי לאפשר עריכה חוזרת באשף)
window.getAgentProfile = function() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['agentProfile'], (data) => {
      resolve(data.agentProfile || null);
    });
  });
};

// הנחיית המערכת המאוחדת של הסוכן — מקור אמת יחיד לכל פונקציות ה-AI
window.getSystemRole = function() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['systemRole'], (data) => {
      resolve(data.systemRole || window.NERAI_DEFAULT_SYSTEM_ROLE);
    });
  });
};

// מיפוי קודי שפה לשמות (לשימוש בפרומפטים של מודלי השפה)
window.getLanguageName = function(langCode) {
  const names = {
    'he': 'עברית (Hebrew)',
    'en': 'אנגלית (English)',
    'zh': 'סינית (Chinese)',
    'zh-CN': 'סינית (Chinese)',
    'ja': 'יפנית (Japanese)',
    'ko': 'קוריאנית (Korean)',
    'ru': 'רוסית (Russian)',
    'fr': 'צרפתית (French)',
    'de': 'גרמנית (German)',
    'es': 'ספרדית (Spanish)',
    'it': 'איטלקית (Italian)',
    'pt': 'פורטוגזית (Portuguese)',
    'ar': 'ערבית (Arabic)'
  };
  return names[langCode] || langCode;
};

window.ApiServices = {
  // שירותי תרגום
  translation: {
    // תרגום Google (ממשק לא רשמי, ללא צורך במפתח) — הבקשה עוברת דרך ה־service worker
    google: async (text, from = 'auto', to = 'he') => {
      const response = await chrome.runtime.sendMessage({
        type: 'translate',
        text,
        from,
        to
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.translation;
    },

    // תרגום DeepSeek
    async deepseek(text, apiKey, targetLang = 'he') {
      try {
        const targetLanguageName = window.getLanguageName(targetLang);
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                "role": "system",
                "content": `אתה מתרגם מקצועי. תרגם את הטקסט הבא לשפה: ${targetLanguageName}. פלוט אך ורק את התרגום עצמו — ללא הסברים, הערות או תוכן נוסף.`
              },
              {
                "role": "user",
                "content": text
              }
            ],
            temperature: 1.3
          })
        });
        const data = await response.json();
        return data.choices[0].message.content.trim();
      } catch (error) {
        console.error('שגיאת תרגום DeepSeek:', error);
        throw error;
      }
    },

    // תרגום דרך ממשק תואם OpenAI (השם siliconflow נשמר לתאימות פנימית)
    async siliconflow(text, apiKey, apiUrl = 'https://api.openai.com/v1/chat/completions', model = 'gpt-4o-mini', targetLang = 'he') {
      try {
        console.log('מתחיל בקשת תרגום OpenAI:', {
          textLength: text?.length || 0,
          apiKeyLength: apiKey?.length || 0,
          apiUrl,
          model,
          targetLang
        });

        // אימות פרמטרים
        if (!text || !apiKey) {
          console.error('פרמטרים חסרים לתרגום OpenAI:', {
            hasText: !!text,
            hasApiKey: !!apiKey
          });
          throw new Error('פרמטרים חסרים: בדוק את הטקסט ואת הגדרת ה־API Key');
        }

        // קריאת הגדרות מתקדמות מהאחסון
        let temperature = 0.7;
        let useReasoning = false;

        try {
          const settings = await new Promise((resolve) => {
            chrome.storage.sync.get(['openaiTemperature', 'openaiReasoningEnabled'], (data) => {
              resolve(data);
            });
          });

          if (settings.openaiTemperature !== undefined) {
            temperature = parseFloat(settings.openaiTemperature);
          }

          if (settings.openaiReasoningEnabled !== undefined) {
            useReasoning = settings.openaiReasoningEnabled;
          }

          console.log('הגדרות OpenAI מתקדמות:', { temperature, useReasoning });
        } catch (settingsError) {
          console.warn('קריאת הגדרות OpenAI נכשלה, משתמש בברירות מחדל:', settingsError);
        }

        const targetLanguageName = window.getLanguageName(targetLang);
        console.log('שפת יעד לתרגום:', { targetLang, targetLanguageName });

        // בניית פרומפט מערכת — שונה כשמצב חשיבה (reasoning) מופעל
        let systemPrompt = '';

        if (useReasoning) {
          systemPrompt = `תרגם את הטקסט הבא לשפה: ${targetLanguageName}.
חשוב תחילה על אסטרטגיית התרגום והקשיים האפשריים — מונחים מקצועיים, ביטויים והקשר תרבותי — כדי שהתרגום ישקף במדויק את כוונת המקור.
לאחר מכן פלוט תרגום מדויק וזורם בלבד, ללא תוכן הניתוח.`;
        } else {
          systemPrompt = `תרגם את הטקסט הבא לשפה: ${targetLanguageName}. פלוט אך ורק את התרגום — מדויק, ללא הסברים, ניתוחים או תגיות מיותרות.`;
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                "role": "system",
                "content": systemPrompt
              },
              {
                "role": "user",
                "content": text
              }
            ],
            temperature: temperature
          })
        });

        if (!response.ok) {
          console.error('שגיאת API בתרגום OpenAI:', {
            status: response.status,
            statusText: response.statusText
          });
          throw new Error(`שגיאת API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('תגובת תרגום OpenAI התקבלה:', {
          status: response.status,
          hasChoices: !!data.choices,
          choicesLength: data.choices?.length || 0
        });

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          console.error('פורמט תגובת OpenAI שגוי:', data);
          throw new Error('פורמט תגובת API שגוי: חסרה תוצאת תרגום');
        }

        const content = data.choices[0].message.content.trim();

        // במצב חשיבה — מפרידים בין תהליך החשיבה לתוצאת התרגום
        if (useReasoning) {
          // ניסיון ראשון: תגיות <think>
          const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>([\s\S]*)/);

          if (thinkMatch) {
            return {
              thinking: thinkMatch[1].trim(),
              translation: thinkMatch[2].trim(),
              hasThinking: true
            };
          }

          console.warn('לא נמצאו תגיות חשיבה, מנסה פורמטים אחרים');

          // ניסיון שני: הפרדה לפי שורות ריקות — החלק האחרון הוא התרגום
          const parts = content.split(/\n{2,}/);
          if (parts.length >= 2) {
            return {
              thinking: parts.slice(0, parts.length - 1).join('\n\n').trim(),
              translation: parts[parts.length - 1].trim(),
              hasThinking: true
            };
          }

          // ניסיון שלישי: חיפוש סמן "תרגום"
          const translationMarkers = ['תרגום:', 'התרגום:', 'Translation:'];
          for (const marker of translationMarkers) {
            const markerIndex = content.indexOf(marker);
            if (markerIndex > 0) {
              return {
                thinking: content.substring(0, markerIndex).trim(),
                translation: content.substring(markerIndex).replace(marker, '').trim(),
                hasThinking: true
              };
            }
          }

          // לא הצלחנו להפריד — מחזירים את הכל כתרגום
          return {
            thinking: 'המודל לא סיפק תהליך חשיבה. בדוק שהמודל הנבחר הוא מודל חשיבה (reasoning), או כבה את הצגת החשיבה בהגדרות.',
            translation: content,
            hasThinking: true
          };
        }

        return content;
      } catch (error) {
        console.error('שגיאת תרגום OpenAI:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        throw error;
      }
    }
  },

  // שירותי ניתוח AI
  analysis: {
    // ניתוח שיחה עם DeepSeek
    async deepseek(messages, apiKey) {
      try {
        console.log('מתחיל בקשת ניתוח DeepSeek');

        const promptSettings = await getPromptSettings();

        const requestBody = {
          model: "deepseek-chat",
          messages: [
            {
              "role": "system",
              "content": `${promptSettings.systemRole}\n\n${promptSettings.analysisTemplate}`
            },
            {
              "role": "user",
              "content": messages.map(m => `${m.sender}: ${m.text}`).join('\n')
            }
          ],
          temperature: 1.3
        };

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        console.log('סטטוס תגובת DeepSeek:', response.status);
        const data = await response.json();

        return data.choices[0].message.content;
      } catch (error) {
        console.error('שגיאת ניתוח DeepSeek:', {
          errorName: error.name,
          errorMessage: error.message,
          apiKey: apiKey ? 'סופק' : 'לא סופק'
        });
        throw error;
      }
    },

    // ניתוח שיחה דרך ממשק תואם OpenAI
    async siliconflow(messages, apiKey, apiUrl = 'https://api.openai.com/v1/chat/completions', model = 'gpt-4o-mini') {
      try {
        console.log('מתחיל בקשת ניתוח OpenAI');

        const promptSettings = await getPromptSettings();

        console.log('תצורת OpenAI:', { apiUrl, model });

        const requestBody = {
          model: model,
          messages: [
            {
              "role": "system",
              "content": `${promptSettings.systemRole}\n\n${promptSettings.analysisTemplate}`
            },
            {
              "role": "user",
              "content": messages.map(m => `${m.sender}: ${m.text}`).join('\n')
            }
          ],
          temperature: 0.7
        };

        console.log('בקשת ניתוח OpenAI:', {
          apiUrl,
          model,
          messagesCount: messages.length,
          contentLength: messages.map(m => m.text).join('').length
        });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const responseText = await response.text().catch(() => '');
          console.error('שגיאת API בניתוח OpenAI:', {
            status: response.status,
            statusText: response.statusText,
            responseBody: responseText
          });
          throw new Error(`שגיאת API: ${response.status} ${response.statusText}${responseText ? ' - ' + responseText : ''}`);
        }

        console.log('סטטוס תגובת OpenAI:', response.status);
        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          console.error('פורמט תגובת ניתוח OpenAI שגוי:', data);
          throw new Error('פורמט תגובת API שגוי: חסרה תוצאת ניתוח');
        }

        return data.choices[0].message.content.trim();
      } catch (error) {
        console.error('שגיאת ניתוח OpenAI:', {
          errorName: error.name,
          errorMessage: error.message,
          apiKey: apiKey ? 'סופק' : 'לא סופק',
          apiUrl,
          model
        });
        throw error;
      }
    }
  }
};

// קבלת הגדרות תרגום בסיסיות
window.getTranslationSettings = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['translationApi', 'targetLanguage'], (data) => {
      resolve({
        service: data.translationApi || 'google',   // ברירת מחדל: Google (חינם)
        targetLang: data.targetLanguage || 'he'     // ברירת מחדל: עברית
      });
    });
  });
};

// קבלת תצורת שירות ה־AI הפעיל
window.getAiService = function() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(
      [
        'aiEnabled',
        'aiApi',
        'deepseekApiKey_ai',
        'siliconflowApiKey_ai',
        'siliconflowApiUrl_ai',
        'siliconflowModel_ai',
        'systemRole'
      ],
      function(data) {
        try {
          // אם תכונות ה־AI כבויות — מחזירים תצורה ריקה
          if (!data.aiEnabled) {
            resolve({
              enabled: false,
              service: null,
              apiKey: null,
              systemRole: null
            });
            return;
          }

          // בחירת מפתח API לפי השירות הנבחר
          let service = data.aiApi || 'deepseek';
          let apiKey = null;
          let apiUrl = null;
          let model = null;
          // הנחיית המערכת המאוחדת של סוכן NerAI — משותפת לכל פונקציות ה־AI
          let systemRole = data.systemRole || window.NERAI_DEFAULT_SYSTEM_ROLE;

          if (service === 'deepseek') {
            apiKey = data.deepseekApiKey_ai || '';
          } else if (service === 'siliconflow') {
            apiKey = data.siliconflowApiKey_ai || '';
            apiUrl = data.siliconflowApiUrl_ai || 'https://api.openai.com/v1/chat/completions';
            model = data.siliconflowModel_ai || 'gpt-4o-mini';
          }

          resolve({
            enabled: true,
            service,
            apiKey,
            apiUrl,
            model,
            systemRole
          });
        } catch (error) {
          console.error('שגיאה בקבלת תצורת שירות AI:', error);
          reject(error);
        }
      }
    );
  });
};

// קבלת הגדרות הפרומפט לניתוח שיחה
async function getPromptSettings() {
  const defaultTemplate = `אווירת השיחה
[תיאור הטון הכללי והנטייה הרגשית של השיחה]

נושאים מרכזיים
[רשימת הנושאים והנקודות המרכזיות בשיחה]

עמדות הצדדים
העמדה שלי: [תיאור העמדה והגישה שלי]
עמדת הצד השני: [תיאור העמדה והגישה של הצד השני]

אופן תגובה מומלץ
[תיאור אסטרטגיית התגובה המומלצת]

דוגמת תגובה מומלצת:
"[כתוב כאן טקסט תגובה קונקרטי, בשפה שבה מתנהלת השיחה, עטוף במרכאות. זכור שמדובר בשיחה מקוונת — התאם את הסגנון ואל תוסיף חתימה]"`;

  return new Promise((resolve) => {
    chrome.storage.sync.get(['systemRole'], (data) => {
      // אופי הסוכן שהמשתמש הגדיר + הנחיה קבועה לפורמט הניתוח
      const persona = data.systemRole || window.NERAI_DEFAULT_SYSTEM_ROLE;
      resolve({
        systemRole: `${persona}\n\nכעת נתח את השיחה הבאה בהתחשב במצב שני הצדדים, ופלוט את התוצאה בדיוק לפי הפורמט הקבוע — ללא עיצוב Markdown.`,
        analysisTemplate: defaultTemplate
      });
    });
  });
}

// קבלת תצורת שירות התרגום הפעיל
window.getTranslationService = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['translationApi', 'deepseekApiKey', 'siliconflowApiKey', 'siliconflowApiUrl', 'siliconflowModel', 'targetLanguage'], (data) => {
      const service = data.translationApi || 'google';  // ברירת מחדל: Google
      let apiKey = '';
      let apiUrl = '';
      let model = '';

      // בחירת מפתח API לפי השירות הנבחר
      switch (service) {
        case 'deepseek':
          apiKey = data.deepseekApiKey || '';
          break;
        case 'siliconflow':
          apiKey = data.siliconflowApiKey || '';
          apiUrl = data.siliconflowApiUrl || 'https://api.openai.com/v1/chat/completions';
          model = data.siliconflowModel || 'gpt-4o-mini';
          break;
        case 'google':
        default:
          // תרגום Google לא דורש מפתח
          apiKey = '';
      }

      // אם השירות דורש מפתח ואין כזה — נפילה חזרה ל־Google
      if ((service === 'deepseek' || service === 'siliconflow') && !apiKey) {
        console.warn(`השירות ${service} דורש API Key שלא הוגדר — עובר אוטומטית לתרגום Google`);
        resolve({
          service: 'google',
          apiKey: '',
          secretKey: '',
          apiUrl: '',
          model: '',
          targetLang: data.targetLanguage || 'he'
        });
      } else {
        resolve({
          service,                                   // שירות התרגום
          apiKey,                                    // מפתח API
          secretKey: '',                             // נשמר לתאימות מבנה
          apiUrl,                                    // כתובת API (ל־OpenAI)
          model,                                     // שם המודל (ל־OpenAI)
          targetLang: data.targetLanguage || 'he'    // שפת יעד
        });
      }
    });
  });
};

// שיפור ניסוח (AI Rewrite) — משכתב טיוטת הודעה בסגנון נבחר
// משתמש בשירות ה־AI המוגדר (DeepSeek / OpenAI)
window.rewriteText = async function(text, tone = 'professional') {
  const toneInstructions = {
    professional: 'טון מקצועי, מכובד וברור',
    friendly: 'טון ידידותי, חם וקליל',
    concise: 'ניסוח קצר ותכליתי — משפט או שניים לכל היותר',
    marketing: 'טון שיווקי ומשכנע שמניע לפעולה'
  };

  const cfg = await window.getAiService();
  if (!cfg.enabled || !cfg.apiKey) {
    throw new Error('שיפור ניסוח דורש הפעלת AI והזנת מפתח API בהגדרות');
  }

  // אופי הסוכן שהמשתמש הגדיר משמש כהקשר — כדי שהניסוח יתאים לזהות שלו
  const agentContext = cfg.systemRole ? `הקשר על מי שמנסח: ${cfg.systemRole}\n\n` : '';
  const systemPrompt = `${agentContext}אתה עוזר כתיבה להודעות וואטסאפ. שכתב את ההודעה הבאה ב${toneInstructions[tone] || toneInstructions.professional}, באותה שפה שבה היא כתובה. שמור על הכוונה והמידע המקוריים. פלוט אך ורק את הגרסה המשופרת — ללא הסברים, ללא מרכאות וללא חתימה.`;

  const isOpenAi = cfg.service === 'siliconflow';
  const url = isOpenAi
    ? (cfg.apiUrl || 'https://api.openai.com/v1/chat/completions')
    : 'https://api.deepseek.com/v1/chat/completions';
  const model = isOpenAi ? (cfg.model || 'gpt-4o-mini') : 'deepseek-chat';

  console.log('NerAI: בקשת שיפור ניסוח', { service: cfg.service, tone, textLength: text.length });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`שגיאת API: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('פורמט תגובת API שגוי: חסרה תוצאה');
  }

  return data.choices[0].message.content.trim();
};

// קבלת הכלים שהמשתמש הגדיר (webhooks לסוכן)
window.getAgentTools = function() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['agentTools'], (data) => {
      resolve(Array.isArray(data.agentTools) ? data.agentTools : []);
    });
  });
};

// כלים מובנים — פועלים על נתוני וואטסאפ מקומית (נרשמים מ-content.js)
// מבנה: { name, description, params, execute: async (args) => string }
window.NERAI_BUILTIN_TOOLS = window.NERAI_BUILTIN_TOOLS || [];

// המרת כלי NerAI לפורמט function-calling של OpenAI/DeepSeek
function neraiToolToApiFormat(tool) {
  const properties = {};
  const required = [];
  (tool.params || []).forEach(p => {
    if (!p.name) return;
    properties[p.name] = { type: 'string', description: p.description || '' };
    required.push(p.name);
  });
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: { type: 'object', properties, required }
    }
  };
}

// שליחת קריאת כלי ל-webhook שהוגדר (n8n/make וכו') והחזרת התוצאה
async function callToolWebhook(tool, args) {
  try {
    console.log('NerAI: קורא ל-webhook', { tool: tool.name, url: tool.webhookUrl });
    const response = await fetch(tool.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: tool.name, arguments: args, source: 'NerAI' })
    });
    const text = await response.text();
    if (!response.ok) {
      return `שגיאה מה-webhook (${response.status}): ${text.substring(0, 200)}`;
    }
    return text ? text.substring(0, 500) : 'בוצע בהצלחה';
  } catch (error) {
    console.error('קריאת ה-webhook נכשלה:', error);
    return `קריאת ה-webhook נכשלה: ${error.message}`;
  }
}

// קריאת השלמת צ'אט אחת (עם או בלי כלים)
async function chatCompletion(cfg, messages, tools) {
  const isOpenAi = cfg.service === 'siliconflow';
  const url = isOpenAi
    ? (cfg.apiUrl || 'https://api.openai.com/v1/chat/completions')
    : 'https://api.deepseek.com/v1/chat/completions';
  const model = isOpenAi ? (cfg.model || 'gpt-4o-mini') : 'deepseek-chat';

  const body = { model, messages, temperature: 0.7 };
  if (tools && tools.length > 0) {
    body.tools = tools.map(neraiToolToApiFormat);
    body.tool_choice = 'auto';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`שגיאת API: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('פורמט תגובת API שגוי: חסרה תשובה');
  }
  return data.choices[0].message;
}

// שיחה עם הסוכן על הודעות שנבחרו — רב־תורית, עם תמיכה בכלים (function-calling)
// contextText: ההודעות שנבחרו | history: [{role, content}]
// onToolCall: callback אופציונלי שמקבל {name, args} להצגה ב-UI
window.askAgent = async function(contextText, history, onToolCall) {
  const cfg = await window.getAiService();
  if (!cfg.enabled || !cfg.apiKey) {
    throw new Error('הצ\'אט עם הסוכן דורש הפעלת AI והזנת מפתח API בהגדרות');
  }

  // כלים = מובנים (גישה לנתוני וואטסאפ) + חיצוניים (webhooks של המשתמש)
  const webhookTools = await window.getAgentTools();
  const builtinTools = Array.isArray(window.NERAI_BUILTIN_TOOLS) ? window.NERAI_BUILTIN_TOOLS : [];
  const tools = [...builtinTools, ...webhookTools];

  const toolsNote = tools.length > 0
    ? `\n\nיש לך גישה לכלים. השתמש בהם כשהמשתמש מבקש פעולה שהם מתאימים לה (למשל רשימת משתתפי הקבוצה, הוספה ליומן, יצירת משימה).`
    : '';

  const systemPrompt = `${cfg.systemRole}\n\n---\nהמשתמש שאתה משרת (הבעלים שלך) פתח איתך צ'אט לצד שיחת וואטסאפ. אלה ההודעות שבהקשר:\n\n${contextText}\n\nכללים: כשנשאל על "אנחנו", "העסק" או פרטים עסקיים — ענה מתוך המידע שבהנחיה שלך למעלה; אל תגיד שלא סיפרו לך אם המידע קיים שם. ענה על שאלות בהתייחס להודעות שבהקשר. היה תמציתי, מעשי וענה בעברית.${toolsNote}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history
  ];

  // לולאת function-calling — עד 4 סבבים כדי למנוע לולאה אינסופית
  for (let round = 0; round < 4; round++) {
    const message = await chatCompletion(cfg, messages, tools);

    // אין קריאות כלים — זו התשובה הסופית
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ? message.content.trim() : '';
    }

    // מוסיפים את הודעת הסוכן (עם בקשות הכלים) להיסטוריה
    messages.push(message);

    // מבצעים כל קריאת כלי ומחזירים את התוצאה למודל
    for (const call of message.tool_calls) {
      const tool = tools.find(t => t.name === call.function.name);
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch (e) { /* ריק */ }

      if (typeof onToolCall === 'function') {
        onToolCall({ name: call.function.name, args });
      }

      // כלי מובנה מורץ מקומית; כלי משתמש נשלח ל-webhook
      let result;
      if (tool && typeof tool.execute === 'function') {
        try {
          result = await tool.execute(args);
        } catch (execError) {
          console.error('שגיאה בהרצת כלי מובנה:', execError);
          result = 'שגיאה בהרצת הכלי: ' + execError.message;
        }
      } else if (tool) {
        result = await callToolWebhook(tool, args);
      } else {
        result = `הכלי "${call.function.name}" לא נמצא`;
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: String(result)
      });
    }
  }

  return 'הסוכן ביצע את הפעולות המבוקשות.';
};

// תשובות מהירות חכמות — 3 הצעות תגובה לפי סוף השיחה ואופי הסוכן
window.suggestReplies = async function(contextText) {
  const cfg = await window.getAiService();
  if (!cfg.enabled || !cfg.apiKey) {
    throw new Error('תשובות מהירות דורשות הפעלת AI והזנת מפתח API בהגדרות');
  }

  const systemPrompt = `${cfg.systemRole}\n\nלפניך סוף שיחת וואטסאפ. הצע בדיוק 3 תשובות קצרות וטבעיות שהמשתמש ("אני") יכול לשלוח עכשיו, בשפה שבה מתנהלת השיחה. גוון את הסגנונות (למשל: מאשרת, שאלת המשך, עניינית). החזר JSON בלבד, בלי שום טקסט נוסף: ["תשובה 1", "תשובה 2", "תשובה 3"]`;

  const message = await chatCompletion(cfg, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: contextText }
  ], null);

  const content = (message.content || '').trim();

  // ניסיון ראשון: JSON תקין
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.slice(0, 3).map(String);
      }
    } catch (parseError) {
      console.warn('פירוק JSON של ההצעות נכשל, עובר לפירוק שורות');
    }
  }

  // גיבוי: פירוק לפי שורות
  return content.split('\n')
    .map(line => line.replace(/^[\d\-.*\s"']+|["',]+$/g, '').trim())
    .filter(Boolean)
    .slice(0, 3);
};

// טיפול אחיד בשגיאות תרגום
window.handleTranslationError = (error) => {
  console.error('שגיאת תרגום:', {
    message: error.message,
    stack: error.stack,
    details: error.toString()
  });

  return {
    error: true,
    message: error.message || 'שירות התרגום אינו זמין כרגע, נסה שוב מאוחר יותר',
    code: error.code || 'TRANSLATION_ERROR'
  };
};
