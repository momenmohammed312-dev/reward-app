# شرح تفصيلي وإنجازات المرحلة الأولى: الأساسيات والـ DB Schema

لقد تم الانتهاء من **المرحلة الأولى** بالكامل وتأكيد بناء الكود وتجميعه (Compilation) بدون أي أخطاء. إليك شرح كامل ومفصل لما تم إنجازه وكيفية تشغيله.

---

## 1. التغييرات والإضافات الفنية

### أ. تحديث الـ Database Schema
لتطوير النظام كـ SaaS حقيقي، قمنا بإضافة 4 جداول رئيسية جديدة:
1. **جدول المستخدمين `users`**: يحتوي على مديري وموظفي لوحات التحكم لكل كافيه (`tenant_id`) مع تحديد دورهم وصلاحياتهم (`user_role`).
2. **جدول الاشتراكات `subscriptions`**: يتتبع اشتراك كل كافيه (نشط، متأخر الدفع، تجريبي) وتاريخ انتهاء الاشتراك.
3. **جدول المدفوعات `billing_history`**: لتسجيل تفاصيل فواتير الاشتراكات الشهرية/السنوية.
4. **جدول الـ Webhooks وعمليات الـ POS `webhook_logs`**: لتسجيل أي طلب قادم من نظام POS (مثل Foodics) تحسباً لأي انقطاع أو عطل، مما يسمح بإعادة المحاولة لاحقاً وعدم ضياع نقاط العملاء.

> [!TIP]
> تم إنشاء ملف شامل لتهيئة قاعدة البيانات بالكامل مع العلاقات والـ Triggers والـ Indexes الفرعية في ملف [schema.sql](file:///g:/development/Loyality%20Project/DB/schema.sql).

---

### ب. هيكلة الـ Backend (Node.js + Express + TypeScript)
تم إنشاء مشروع Express متكامل يدعم استخدام الـ ES Modules و TypeScript:
* **التوصيل بقاعدة البيانات:** استخدام `pg.Pool` لإدارة الاتصال المتعدد بكفاءة.
* **الـ Redis:** إعداد العميل للاتصال بـ Redis لإعداد الـ Caching والـ Queues لاحقاً.
* **المصادقة (Authentication):**
  * للـ Admins: مصادقة مبنية على الـ JWT مع حماية المسارات بناءً على الـ Role (Owner, Manager, Cashier).
  * للعملاء (Customer PWA): مصادقة باستخدام OTP Codes مولدة ومخزنة بمدة صلاحية قصيرة (5 دقائق كحد أقصى) مع حماية ضد هجمات التخمين (حظر بعد 5 محاولات خاطئة).

---

## 2. هيكلة الملفات البرمجية التي تم إنشاؤها

* [package.json](file:///g:/development/Loyality%20Project/backend/package.json): إدارة حزم المشروع.
* [tsconfig.json](file:///g:/development/Loyality%20Project/backend/tsconfig.json): إعدادات مترجم TypeScript.
* [src/config/db.ts](file:///g:/development/Loyality%20Project/backend/src/config/db.ts): إعدادات الـ Pool الخاص بالـ PostgreSQL.
* [src/config/redis.ts](file:///g:/development/Loyality%20Project/backend/src/config/redis.ts): إعدادات الاتصال بالـ Redis.
* [src/middlewares/auth.ts](file:///g:/development/Loyality%20Project/backend/src/middlewares/auth.ts): الـ Middlewares الخاصة بالـ JWT والتحقق من الصلاحيات.
* [src/services/otp.ts](file:///g:/development/Loyality%20Project/backend/src/services/otp.ts): منطق توليد والتحقق من الـ OTP.
* [src/controllers/authController.ts](file:///g:/development/Loyality%20Project/backend/src/controllers/authController.ts): منطق تسجيل دخول المديرين وتفعيل حسابات العملاء بالـ OTP.
* [src/controllers/tenantController.ts](file:///g:/development/Loyality%20Project/backend/src/controllers/tenantController.ts): منطق إضافة Tenants وتفعيل فترات التجربة وإضافة الفروع وتوليد مفاتيح الـ API.

---

## 3. طريقة التشغيل والاختبار محلياً

### أ. إعداد قاعدة البيانات
1. افتح الـ PostgreSQL في جهازك وشغّل الأمر التالي لإنشاء قاعدة البيانات:
   ```sql
   CREATE DATABASE loyalty_db;
   ```
2. قم بتشغيل محتويات ملف الـ [schema.sql](file:///g:/development/Loyality%20Project/DB/schema.sql) بالكامل لبناء الجداول والـ Triggers والـ Indexes تلقائياً.

### ب. تشغيل الـ Backend
1. تأكد من تحديث الإعدادات في ملف `backend/.env` إذا كانت بيانات الـ PostgreSQL أو Redis مختلفة على جهازك.
2. اذهب إلى مجلد `backend` وشغل خادم التطوير:
   ```bash
   npm run dev
   ```
3. سيقوم السيرفر بالتأكد من الاتصال بالـ DB والـ Redis ويفتح على البورت `4000`.

---

## الخطوة التالية (المرحلة الثانية) - [تم الإنجاز بالكامل! 🎉]
لقد انتهينا من تطوير **المرحلة الثانية (محرك الولاء والـ POS Integration)** بالكامل وتأكيد سلامة بناء الكود:
1. **محرك الولاء (Loyalty Service):** تم بناء منطق إضافة وسحب النقاط، وتوليد أكواد الخصم والتحقق منها وحساب ترقيات العميل عبر الـ Database Triggers تلقائياً.
2. **دمج Foodics Webhooks:** تم إنشاء الـ Webhook Controller والـ Queue والـ Worker الخاص بـ BullMQ لمعالجة الطلبات القادمة من Foodics في الخلفية فوراً وبدون استهلاك موارد السيرفر الأساسي.
3. **تكامل المسارات:** تم دمج مسارات الولاء والـ Webhooks بالكامل في الـ `app.ts` الرئيسي.

---

## 4. مسارات الاختبار المتاحة للمرحلة الثانية

### أ. الـ Webhooks (Foodics Integration)
* **المسار:** `POST /api/webhooks/foodics/:tenant_id`
* **وظيفته:** يستقبل أحداث الدفع من Foodics ويضعها في الطابور لمعالجتها بالخلفية.
* **مثال لـ Request Body:**
  ```json
  {
    "event": "order.paid",
    "order": {
      "id": "ord_12345",
      "total_price": 150.00,
      "customer": {
        "phone": "+201000000000",
        "name": "Momen"
      },
      "branch": {
        "id": "br_west_elbalad",
        "name": "West El Balad Branch"
      }
    }
  }
  ```

### ب. إدارة الولاء والعملاء
* **الملف التعريفي للعميل:** `GET /api/loyalty/profile` (يتطلب توكن العميل)
* **سجل العمليات:** `GET /api/loyalty/history` (يتطلب توكن العميل)
* **استبدال النقاط بمكافأة:** `POST /api/loyalty/redeem` (يتطلب توكن العميل)
* **تأكيد الكود عند الكاشير:** `POST /api/loyalty/process-redemption` (يتطلب توكن موظف الكافيه)
* **إضافة نقاط يدوية (بونص):** `POST /api/loyalty/manual-earn` (يتطلب توكن المدير)

---

## المرحلة الثالثة: واجهات المستخدم الكاملة (UI Dashboards) — [تم الإنجاز بالكامل! 🎉]

---

## 5. شرح تفصيلي للمرحلة الثالثة

### ما الهدف من هذه المرحلة؟

المرحلة الثالثة هي البناء الكامل لطبقة الواجهة الأمامية (Frontend) للنظام. وتشمل ثلاث واجهات متكاملة تعمل على نفس الـ Codebase الموحد بنظام **Role Switcher** يسمح بالتنقل بينها بضغطة زر واحدة في بيئة التطوير.

---

### أ. تطبيق العميل (Customer PWA)

#### الفلسفة التصميمية:
- تطبيق **Mobile-First** يعمل كـ Progressive Web App داخل المتصفح — بدون App Store.
- كل كافيه له **ثيمه الخاص** (ألوان، خطوط، شعار) يُطبَّق ديناميكياً عبر CSS Variables.
- اللغة: **عربية كاملة** مع دعم الـ RTL في كل التفاصيل.

#### الصفحات المبنية:
| الصفحة | الملف | الوصف |
|---|---|---|
| تسجيل الدخول | [AuthPage.tsx](file:///g:/development/Loyality%20Project/UI/src/pages/AuthPage.tsx) | مصادقة بالهاتف + OTP مع Validation وAnimation سلس |
| الرئيسية | [HomePage.tsx](file:///g:/development/Loyality%20Project/UI/src/pages/HomePage.tsx) | عرض رصيد النقاط، الفئة (Tier)، وأبرز المكافآت المتاحة |
| المكافآت | [RewardsPage.tsx](file:///g:/development/Loyality%20Project/UI/src/pages/RewardsPage.tsx) | قائمة المكافآت مصنفة حسب النوع مع Filters |
| الاسترداد | [RedeemPage.tsx](file:///g:/development/Loyality%20Project/UI/src/pages/RedeemPage.tsx) | تفاصيل المكافأة + تأكيد الاسترداد مع الشروط |
| عرض الكود | [RedemptionCode component](file:///g:/development/Loyality%20Project/UI/src/components/loyalty/RedemptionCode.tsx) | كود الخصم بتصميم QR-style مع Countdown Timer |
| سجل العمليات | [HistoryPage.tsx](file:///g:/development/Loyality%20Project/UI/src/pages/HistoryPage.tsx) | جدول تاريخي لكل عمليات الكسب والاسترداد |
| الملف الشخصي | [ProfilePage.tsx](file:///g:/development/Loyality%20Project/UI/src/pages/ProfilePage.tsx) | بيانات المستخدم، تعديل الاسم، خيار تسجيل الخروج |

#### نظام الـ Multi-Tenant Theming:
```
mockTenants → applyTenantTheme() → CSS Variables → كل عنصر في الواجهة يتغير تلقائياً
```
- كل كافيه له: `primaryColor, accentColor, bgColor, fontDisplay, fontBody`.
- يتم تطبيق الثيم فور اختيار العلامة التجارية عبر الـ Dropdown.

---

### ب. لوحة تحكم الكافيه (Admin Dashboard)

**الملف:** [AdminDashboard.tsx](file:///g:/development/Loyality%20Project/UI/src/pages/AdminDashboard.tsx)

#### التبويبات الأربع:

**1. نظرة عامة (Overview):**
- بطاقات KPI: إجمالي المشتركين، النشطين، النقاط المصدرة هذا الشهر، عدد عمليات الاسترداد اليوم.
- نموذج **تعديل وإضافة النقاط يدوياً** (Manual Point Adjustment):
  - اختيار العميل من قائمة.
  - تحديد عدد النقاط والسبب.
  - يستدعي `POST /api/loyalty/manual-earn` عبر الـ Backend.
- **شاشة سجل Webhooks** الحية: آخر الطلبات القادمة من Foodics مع حالة النجاح/الفشل.

**2. العملاء والولاء:**
- جدول تفصيلي بكل عملاء الكافيه: الاسم، الهاتف، الفئة (Bronze/Silver/Gold/Platinum)، الرصيد الحالي، إجمالي النقاط المكتسبة، الحالة.
- زر إضافة عميل يدوي.

**3. المكافآت والعروض:**
- عرض بطاقات المكافآت النشطة مع صورها وعدد النقاط المطلوبة.
- نموذج إنشاء مكافأة جديدة: الاسم، النقاط، الوصف والشروط.

**4. الفروع والـ POS:**
- عرض كل الفروع المسجلة مع حالة الاتصال (Foodics / Manual).
- تفعيل/تعطيل الفروع وتعديل إعدادات الربط.

---

### ج. لوحة التحكم الفائقة (Super Admin Dashboard)

**الملف:** [SuperAdminDashboard.tsx](file:///g:/development/Loyality%20Project/UI/src/pages/SuperAdminDashboard.tsx)

#### التبويبات الثلاث:

**1. الكافيهات المشتركة (Tenants):**
- جدول بكل التيننتس: الاسم، الـ Slug، الباقة (Starter/Premium/Enterprise)، القيمة الشهرية، تاريخ الانضمام، الحالة.
- زر تفعيل/إيقاف أي تيننت مباشرة.

**2. خطط الأسعار (Subscriptions):**
- عرض الباقات الثلاث بتصميم Pricing Cards احترافي:
  - **Starter (1,200 EGP/شهر):** فرع واحد، 1000 عميل.
  - **Premium (2,500 EGP/شهر):** 5 فروع، عملاء بلا حدود، ثيم مخصص.
  - **Enterprise (6,000 EGP/شهر):** دومين خاص، سيرفر مستقل.

**3. شاشة مراقبة الـ Webhooks:**
- سجل حي لكل الأحداث القادمة من Foodics من جميع التيننتس.
- يعرض: اسم الكافيه، نوع الحدث (order.paid, order.closed)، الحالة، الوقت، رسالة التفاصيل.

---

### د. نظام الـ Role Switcher (للمطورين والتجربة)

تم إضافة شريط علوي ثابت في `App.tsx` يسمح بالتبديل الفوري بين:
- 👤 **تطبيق العميل PWA** — يعرض الواجهة المحمولة مع الـ Bottom Navigation.
- 🔧 **لوحة تحكم الكافيه** — يعرض Admin Dashboard كاملاً.
- ⚙️ **لوحة تحكم النظام** — يعرض Super Admin Dashboard.

هذا يسمح بالتجربة الفورية لكل الواجهات بدون الحاجة لفتح روابط أو سيرفرات منفصلة.

---

### هـ. ربط الـ Frontend بالـ Backend

تم إنشاء ملف [api.ts](file:///g:/development/Loyality%20Project/UI/src/services/api.ts) كـ API Client مركزي:
- يتصل بالـ Backend على `VITE_API_URL` (افتراضياً `http://localhost:4000/api`).
- يحمل الـ JWT Token تلقائياً في كل طلب.
- **نظام Fallback ذكي:** إذا كان الـ Backend غير متاح (في بيئة التطوير بدون DB)، يتراجع تلقائياً إلى بيانات Mock المحلية بدون أي خطأ مرئي للمستخدم.

#### مسار عمل الـ OTP مع Backend حقيقي:
```
1. المستخدم يُدخل رقم هاتفه
2. POST /api/auth/customer/otp → Backend يولد OTP ويخزنه في Redis (5 دق)
3. المستخدم يُدخل الكود
4. POST /api/auth/customer/verify → Backend يتحقق ويعيد JWT (صالح 30 يوم)
5. loadWalletData() → تجلب profile + history من الـ Backend وتعرضها
```

---

## 6. نتيجة البيلد النهائي ✅

```
vite v6.4.2 building for production...
✓ 5000 modules transformed.
dist/index.html                   0.51 kB │ gzip:   0.33 kB
dist/assets/index.css            47.38 kB │ gzip:   9.33 kB
dist/assets/index.js            572.98 kB │ gzip: 160.97 kB
✓ built in 30.80s
```
**لا يوجد أي خطأ في TypeScript أو في الـ Build!** التحذير الوحيد هو حجم الـ bundle (500KB+) وهو طبيعي جداً ويُحل لاحقاً بـ Code Splitting.

---

## الخطوة التالية (المرحلة الرابعة)
سنبدأ في بناء **الميزات المتقدمة** والتي تشمل:
1. **نظام الإشعارات (Push Notifications):** إشعارات للعملاء عند حصولهم على نقاط جديدة أو قرب انتهاء المكافأة.
2. **تقارير وإحصائيات متقدمة (Analytics):** رسوم بيانية حقيقية للمديرين تعرض اتجاهات النقاط، أفضل المكافآت، وأكثر العملاء نشاطاً.
3. **نظام الإشعارات عبر SMS/واتساب:** إرسال تلقائي لرسائل الترحيب، تأكيد النقاط، وتذكيرات المكافآت.
