# Allama Plugin System (نظام الإضافات في علامة)

هذا النظام يتيح لك إضافة أدوات (Tools) جديدة للذكاء الاصطناعي بسهولة دون تعديل الكود الأساسي للمشروع.

## هيكل المجلد (Structure)
يتم وضع كل أداة في مجلد خاص داخل `server/plugins/`:
```
server/plugins/my_tool/
├── manifest.json   (تعريف الأداة للنموذج)
└── index.js        (منطق الأداة البرمجي)
```

## 1. ملف التعريف `manifest.json`
يجب أن يتبع تنسيق Ollama للأدوات.
مثال لأداة تقوم بجمع رقمين:
```json
{
  "type": "function",
  "function": {
    "name": "add_numbers",
    "description": "يجمع رقمين معاً",
    "parameters": {
      "type": "object",
      "properties": {
        "a": { "type": "number", "description": "الرقم الأول" },
        "b": { "type": "number", "description": "الرقم الثاني" }
      },
      "required": ["a", "b"]
    }
  }
}
```

## 2. ملف المنطق `index.js`
يجب أن يكون الملف عبارة عن دالة (Async Function) تستقبل المدخلات ووسيط التحكم (Context).
```javascript
/**
 * @param {Object} args - المدخلات القادمة من النموذج
 * @param {Object} context - يحتوي على دالة log لإرسال تحديثات حالة للمستخدم
 */
module.exports = async (args, { log }) => {
    const { a, b } = args;

    log(`جاري حساب مجموع ${a} و ${b}...`);

    const result = a + b;

    return {
        success: true,
        result: result,
        message: `المجموع هو ${result}`
    };
};
```

## 3. كيفية التفعيل
بعد إضافة المجلد، قم بإعادة تشغيل السيرفر. ستظهر الأداة تلقائياً في **استوديو الوكلاء (Agent Studio)**، يمكنك تفعيلها لأي وكيل تقوم بإنشائه.

## الأدوات المدمجة حالياً:
- `pdf_reader`: قراءة ملفات PDF المحملة.
- `calculator`: إجراء عمليات حسابية معقدة.
- `web_request`: جلب بيانات من روابط ويب.
- `execute_command`: تنفيذ أوامر النظام (shell).
- `get_current_time`: معرفة الوقت والتاريخ الحالي.

---
**ملاحظة:** تأكد من أن النموذج الذي تستخدمه يدعم استدعاء الدوال (Tools Calling) مثل `qwen2.5`, `llama3.1`, `gemma2` إلخ.
