# MO2-FEAT-0001 — Supermarket Engine v2 & Admin/Cashier/Customer UI Upgrade

## 1. البيانات الأساسية

| الحقل | القيمة |
|---|---|
| **الرقم** | MO2-FEAT-0001 |
| **المشروع** | MO2 Loyalty App |
| **العنوان** | MO2-FEAT-0001 — Supermarket Engine v2 & Admin/Cashier/Customer UI Upgrade |
| **النوع** | ميزة جديدة · تحسين أداء |
| **الأولوية** | P1 |
| **الحالة** | done |
| **الطلب** | من صاحب المشروع |
| **التاريخ** | 2026-11-27 |
| **الفرع** | `main` |

---

## 2. القيمة والسبب التجاري

- **المشكلة التي يحلها:** استكمال جاهزية المنصة لتشغيل السوبر ماركت على نطاق واسع (بطاقة عضوية `card_number` بدون كشف رقم الهاتف في QR/Barcode، محرك قواعد النقاط للأقسام والأصناف، فواتير تفصيلية واسترجاع بالأصناف، تكامل POS متزامن `/api/pos/*`، رصيد O(1) مخزّن، إنشاء عميل من لوحة التحكم، وإصلاح عرض حركات `adjustment` الموجبة في سجل العميل).
- **النتيجة المتوقعة:** تسجيل سريع بالكاشير بالكارت أو الهاتف مع إظهار الرصيد فوراً، قواعد احتساب مرنة على صافي الفاتورة، وإنشاء عملاء جدد ومراقبة كل القسائم والفواتير والأصناف من لوحة الإدارة.

---

## 3. المتطلبات (Requirements)

**يجب أن يفعل (Must):**
1. واجهة العميل: عرض `card_number` في الـ QR والباركود 1D في `PointsWallet.tsx` + قيمة النقاط بالجنيه + إجمالي التوفير + تفاصيل أصناف الفاتورة في `HistoryPage.tsx` + إظهار حركات `adjustment` الموجبة بعلامة `+` باللون الأخضر في `AppContext.tsx`.
2. واجهة الكاشير (`CashierDashboard.tsx`): البحث والمسح بالكارت أو الموبايل، استعلام فوري عن رصيد العميل (`GET /api/loyalty/customer-lookup`)، ودعم الفواتير الأقل من الحد الأدنى بـ `0` نقطة دون فشل.
3. لوحة الإدارة (`AdminDashboard`):
   - زر ومودال **"إضافة عميل جديد"** في `CustomersTab.tsx` (`POST /api/admin/customers`) مع نقاط افتتاحية اختيارية وتوليد `card_number` تلقائياً.
   - تبويب **"قواعد النقاط"** (`RulesTab.tsx` -> `/api/admin/earning-rules`) لإدارة قواعد الاستثناء والمضاعفات وبونص السلة.
   - تحديث `SettingsTab.tsx` لإعدادات `tier_basis` (`points` / `spend`)، `refund_policy` (`cap_zero` / `reject`)، `cashier_daily_manual_limit`، و`expiry_sms_days_before`.
   - تحديث `TransactionsTab.tsx` للاسترجاع الجزئي بالأصناف و`BranchesPosTab.tsx` لتوثيق `/api/pos/*`.

---

## 4. معايير القبول (Acceptance Criteria)

- [x] **AC1:** إضافة عميل ديمو (`01099887755`) من لوحة الإدارة وتوليد كارت `MKT-88394148` تلقائياً، إضافة `+350` نقطة له، التحقق من الكاشير، ودخول العميل عبر OTP لرؤية `+350` وقيمة `17.5 ج.م` وكارته وسجله باللون الأخضر.
- [x] **AC2:** عزل تام بين الـ Tenants (`tenant_id = $n::uuid` + 404 على موارد Tenant آخر + `x-api-key` على `/api/pos/*`).
- [x] **AC3:** دعم عربي RTL عبر `UI/src/services/translations.ts` وألوان CSS variables في `UI/src/theme/tokens.css`.
- [x] **AC4:** تغطية الحالات الحدية: فواتير أقل من الحد الأدنى (`0` نقطة بدون retry storm)، فشل مغلق في `getAdapter`، `cap_zero` و`reject` في المرتجع، وidempotency في `LedgerService.insert` و`PosApiService.redeem`.

---

## 5. الأثر التقني

| البُعد | التقييم |
|---|---|
| **الطبقات المتأثرة** | `DB/migrations/021_supermarket_engine_v2.sql` · `routes/` · `middlewares/` · `controllers/` · `services/` · `helpers/` · `UI/src/` |
| **Migration جديدة؟** | ☑ نعم — `DB/migrations/021_supermarket_engine_v2.sql` + مسجلة في `docker-compose.yml` (`22-migration-021.sql`) |
| **المناطق الحساسة** | ☑ `wallet_ledger` (O(1) cached counters) ☑ `FOR UPDATE` ☑ عزل `tenant_id` ☑ `x-api-key` Sync POS ☑ `DB/migrations/` |
| **توثيق Swagger و Validation** | مضاف `@swagger` لـ `/api/pos/*`, `/api/admin/earning-rules`, `/api/admin/customers` (POST), `/api/loyalty/customer-lookup` وschemas في `validate.ts` |

---

## 6. خطة التنفيذ والاختبار

**أوامر التحقق المنفذة فعلياً:**
- `cd backend; npm run build; npm test`: نجح `tsc` (`exit 0`) ونجح **18/18 ملف اختبار — 136/136 اختباراً** (`exit 0`).
- `cd UI; npm run lint; npm run build`: نجح `tsc --noEmit` (`exit 0`) ونجح `vite build` (`exit 0`).
- اختبار حي على المتصفح (`http://localhost:3000` + `http://localhost:4000` + PostgreSQL 18): التحقق من تبويبات الإدارة الجديدة، إنشاء عميل الديمو `عميل تجريبي ديمو` (`01099887755` / `MKT-88394148`)، إضافة `350` نقطة، استعلام الكاشير (`350 نقطة ≈ 17.5 ج.م`)، دخول العميل بالـ OTP (`275953`)، وظهور `+350` باللون الأخضر في الرئيسية والسجل.

---

## 8. سجل الحالة

| التاريخ | من | التغيير |
|---|---|---|
| 2026-11-27 | AI Agent | تنفيذ المرحلة الثانية، إضافة إنشاء عميل من الأدمن، إصلاح علامة `adjustment` في UI، واجتياز جميع الاختبارات (`done`) |
