// NerAI - עוזר AI לוואטסאפ | שכבת תיקוף ו־fallback לשירותי התרגום
// by Ner Online - neronline.co.il

(function() {
  console.log('טוען שכבת תיקוף שירותי תרגום...');

  // שמירת הפונקציה המקורית לקבלת תצורת שירות התרגום
  const originalGetTranslationService = window.getTranslationService;

  // עטיפת הפונקציה: תיקוף התצורה ונפילה חזרה ל־Google בעת הצורך
  window.getTranslationService = function() {
    return new Promise((resolve) => {
      originalGetTranslationService().then(result => {
        console.log('תצורת שירות תרגום:', result);

        if (result.service === 'google') {
          // תרגום Google לא דורש מפתח API
          resolve({
            service: 'google',
            apiKey: '',
            secretKey: '',
            apiUrl: '',
            model: '',
            targetLang: result.targetLang
          });
        } else if (['deepseek', 'siliconflow'].includes(result.service) && !result.apiKey) {
          // שירות AI ללא מפתח — נפילה חזרה ל־Google
          console.warn(`השירות ${result.service} חסר API Key — עובר לתרגום Google`);
          resolve({
            service: 'google',
            apiKey: '',
            secretKey: '',
            apiUrl: '',
            model: '',
            targetLang: result.targetLang
          });
        } else {
          // התצורה תקינה — מחזירים כמו שהיא
          resolve(result);
        }
      });
    });
  };

  // פונקציית תרגום מאוחדת עם fallback אוטומטי ל־Google
  const fixTranslateText = async function(text, targetLang = 'he') {
    try {
      const { service, apiKey, apiUrl, model } = await window.getTranslationService();
      console.log('משתמש בשירות תרגום:', service);

      let translation;
      if (service === 'google') {
        // תרגום Google — ללא מפתח
        translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
      } else if (service === 'siliconflow') {
        // OpenAI — דורש גם כתובת API ומודל
        console.log('קורא לשירות תרגום OpenAI', { hasApiKey: !!apiKey, hasApiUrl: !!apiUrl, hasModel: !!model });
        translation = await window.ApiServices.translation.siliconflow(text, apiKey, apiUrl, model, targetLang);
      } else if (service === 'deepseek') {
        console.log('קורא לשירות תרגום DeepSeek');
        translation = await window.ApiServices.translation.deepseek(text, apiKey, targetLang);
      } else {
        console.warn('שירות תרגום לא מוכר, עובר ל־Google:', service);
        translation = await window.ApiServices.translation.google(text, 'auto', targetLang);
      }

      return translation;
    } catch (error) {
      console.error('התרגום נכשל:', error);

      // ניסיון גיבוי עם תרגום Google
      try {
        console.log('מנסה תרגום Google כגיבוי...');
        return await window.ApiServices.translation.google(text, 'auto', targetLang);
      } catch (fallbackError) {
        console.error('גם תרגום הגיבוי נכשל:', fallbackError);
        throw error;
      }
    }
  };

  // חשיפת פונקציית התרגום המאוחדת
  window.fixedTranslateText = fixTranslateText;

  console.log('שכבת תיקוף שירותי התרגום נטענה: תיקוף תצורה + fallback אוטומטי ל־Google');
})();
