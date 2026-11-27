# SOP-02 — فحص الأخطاء وتحليل السبب الجذري (Bug Investigation)

| | |
|---|---|
| **المشروع** | `MO2 Loyalty App` |
| **الحالة** | معتمد |
| **المالك** | صاحب المشروع |
| **ينطبق على** | النوع **B** (عيب عادي) ومسار التحقيق لـ **A** بعد الاحتواء |
| **المرجع الأعلى** | `AGENTS.md` — لا يُنشئ هذا الإجراء أي قاعدة جديدة |
| **التنفيذ الآلي** | `.agents/skills/mo2-bug-hunt/SKILL.md` |
| **القالب** | `MO2/issues/_template-bug.md` (`MO2-BUG-XXXX`) |

---

## A. معايير الدخول

لا يبدأ فحص أي عيب قبل تحقق أحد الشرطين:
1. **وجود ملف قضية** في `MO2/issues/MO2-BUG-XXXX-*.md` بالحالة `open` أو `in-progress`، أو
2. **إنشاؤه فورًا** عبر `SOP-01` قبل أي تعديل كود.

> **بند P1:** حوادث الإنتاج تُحتوى أولًا وتُوثّق بالتوازي؛ لا يُكتب إصلاح كود لـ P1 قبل موافقة صاحب المشروع.

---

## B. أسئلة الفحص قبل أي تعديل

| السؤال | لماذا يهم |
|---|---|
| خطوات إعادة الإنتاج بالترتيب؟ | بدونها لا يمكن التحقق من الإصلاح |
| النتيجة المتوقعة مقابل الفعلية؟ | يحدد الانحراف بدقة |
| التكرار: دائمًا / أحيانًا / race condition؟ | يكشف نقص `FOR UPDATE` أو خطأ تزامن |
| السطح: Customer PWA / Admin / Cashier / SuperAdmin / API / Worker؟ | يحدد نقطة البداية |
| سياق الـ Tenant (`slug` أو `UUID`) والدور (`customer`/`cashier`/`owner`/`manager`/`superadmin`)؟ | يكشف أخطاء `resolveTenantId()` أو `requireRole` / `branch_id` |
| هل يمس `wallet_ledger` أو أرصدة أو أمان أو `DB/migrations/`؟ | يفعّل بوابات التحقق الإضافية (القسم I) |

> **قاعدة الخصوصية:** ممنوع نقل أرقام هواتف عملاء حقيقية أو OTPs حية أو أسرار إلى ملف القضية أو الاختبارات. استخدم بيانات وهمية فقط.

---

## C. الفحص المبني على الأدلة (بالترتيب — لا تعديل قبل الخطوة 6)

1. **إعادة الإنتاج:** أعد الإنتاج محليًا، ويفضّل تحويله إلى **اختبار Vitest فاشل** في `backend/src/**/__tests__/*.test.ts`.
2. **تسجيل الأدلة:** Stack trace كامل، HTTP status، استجابة API، أو سجل BullMQ / PostgreSQL.
3. **تحديد موضع الكود:** تتبع المسار الكامل `route → middleware → controller → service → SQL` أو `page → api.ts → AppContext`.
4. **البحث عن المنطق المكرر:** ابحث بـ `rg` في `backend/src/` و `UI/src/` حتى لا يصلح فرع ويظل آخر معطوبًا (مثال: حسابات النقاط أو مبالغ الخصم أو نصوص `translations.ts`).
5. **فحص Regression (قراءة فقط):**
   ```powershell
   git log --oneline -20 -- <path>
   git log -S "<snippet>" --oneline
   ```
   > 🚫 لا تشغّل `git bisect` أو `git checkout` على شجرة العمل المشتركة؛ لو لزم استخدم `git worktree` معزولًا.
6. **صياغة فرضية واحدة قابلة للإبطال:**
   > «العطل يحدث لأن **[سلوك محدد]** في **`path:line`** بسبب **[سبب محدد]**، ويظهر عندما **[شرط قابل للملاحظة]**.»
7. **مراجعة الفرضية:** إن دحضتها الأدلة ← ارجع للخطوة 2 ولا تركّب ترقيعًا فوقها.
8. **توثيق السبب الجذري:** املأ القسم 4 من `MO2/issues/MO2-BUG-XXXX-*.md` قبل لمس الكود.

---

## D. حدود الإصلاح (إحالة إلى `AGENTS.md`)

- **لا إخفاء للأعراض:** ممنوع `catch` فارغ أو السقوط الصامت على `mockData.ts`.
- **مسار كتابة وحيد للدفتر:** كل كتابة في `wallet_ledger` تمر عبر `LedgerService.insert` مع `idempotencyKey`.
- **الذرية والأقفال:** أي مسار يغيّر رصيدًا أو مكافأة يعمل داخل `BEGIN/COMMIT/ROLLBACK` مع `FOR UPDATE`.
- **العزل والفصل بين الطبقات:** لا SQL في `routes/` أو `controllers/`، ولا `res` في `services/`، وكل استعلام يتضمن `tenant_id = $n::uuid` و `AND deleted_at IS NULL` حيث ينطبق.
- **ESM و Migrations:** كل استيراد نسبي في `backend/src/` ينتهي بـ `.js`، والهجرات الجديدة `DB/migrations/NNN_*.sql` تُسجَّل في `docker-compose.yml` دون لمس `DB/schema.sql`.

---

## E. الاختبار والتحقق (بوابات MO2 الفعلية)

### أوامر التحقق الإلزامية

```powershell
# 1. الباك إند (الأنواع + كل اختبارات Vitest)
cd backend; npm run build; if ($LASTEXITCODE -eq 0) { npm test }

# 2. الواجهة الأمامية (فحص الأنواع + البناء عند تعديل UI)
cd ../UI; npm run lint; if ($LASTEXITCODE -eq 0) { npm run build }
```

> **تنبيه معروف (`AGENTS.md` §4.7):** سكربت `npm run lint` في `backend/` غير مفعّل لأن `eslint` غير مثبت؛ بوابة التحقق الساكنة للباك إند هي `npm run build` (`tsc`). لا تدّعِ أن lint الباك إند مرّ.

### قاعدة الصدق في الأدلة
🚫 لا يُكتب «اختُبر بنجاح» إلا مع الأمر المُنفَّذ ومخرجه الحرفي المسجَّل في القسم 6 من ملف التذكرة.

---

## F. مصفوفة التحقق للمناطق الحساسة في MO2

| المنطقة | التحقق الإضافي الإلزامي | ملفات Vitest المرجعية القائمة |
|---|---|---|
| **دفتر النقاط (`wallet_ledger`)** | إثبات Idempotency (استدعاء مكرر = صف واحد) وعدم وجود `INSERT` مباشر خارج `LedgerService` | `backend/src/services/__tests__/ledger.test.ts` · `phase2.test.ts` · `phase3.test.ts` |
| **النقاط، الانتهاء، والاسترداد** | اختبار الحالات الحدية (صفر/نقص رصيد/حد أقصى/FIFO expiry/`reversal`) | `helpers/__tests__/points.test.ts` · `services/__tests__/loyalty.test.ts` · `expiry.test.ts` |
| **عزل الـ Tenant والفروع و Auth** | اختبار إرجاع `404` لـ ID يخص Tenant آخر، ومنع الكاشير من فرع آخر، وتمرير `security.test.ts` | `controllers/__tests__/security.test.ts` · `helpers/__tests__/resolveTenant.test.ts` |
| **Webhooks و POS** | التحقق من `timingSafeEqual` ورفض السر المفقود بـ `403` ورفض توقيع Tenant A على Tenant B | `controllers/__tests__/webhook.test.ts` · `services/__tests__/supermarket.test.ts` |
| **الشبكات والتسويات العابرة** | فحص أسعار الصرف والـ cross-tenant ledger والتسويات | `services/__tests__/network.test.ts` · `networkPhases.test.ts` |
| **تحليلات وحملات والبنية التحتية** | اختبار الاستعلامات/القواعد والـ `MigrationRunner` | `services/__tests__/analytics.test.ts` · `helpers/__tests__/campaigns.test.ts` · `services/__tests__/infrastructure.test.ts` |

---

## G. الإغلاق والمزامنة

لا ينتقل البلاغ إلى `done` إلا إذا:
1. السبب الجذري موثق في القسم 4 والحل الجذري في القسم 5.
2. أُضيف اختبار انحدار في `backend/src/**/__tests__/*.test.ts` (أو وُثق مبرر عدم انطباقه) ونجحت بوابات `backend` و `UI`.
3. حُدِّث القسم 7 (الأثر الخلفي وخطة التراجع).
4. رُوجع التعديل ودُمج في الفرع الهدف، ثم نُفّذت المزامنة:

```powershell
powershell -ExecutionPolicy Bypass -File "MO2/scripts/sync_to_github_and_notion.ps1" -File "MO2/issues/MO2-BUG-XXXX-<slug>.md"
```
