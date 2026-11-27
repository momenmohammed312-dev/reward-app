# MO2-DELEG-XXXX — <اسم الميزة المعمارية>

> قالب توثيق الميزات المطورة بنظام التفويض متعدد الوكلاء في **MO2 Loyalty App**.
> انسخ هذا الملف داخل `MO2/delegation/` باسم `MO2-DELEG-<رقم>-<slug>.md`.

---

## 1. البيانات الأساسية

| الحقل | القيمة |
|---|---|
| **الرقم المرجعي** | MO2-DELEG-XXXX |
| **المشروع** | MO2 Loyalty App |
| **عنوان الميزة** | |
| **النوع** | ميزة معمارية · إعادة هيكلة · مسار أرصدة/شبكات/POS · واجهة RTL متقدمة |
| **الأولوية** | P0 حرجة جدًا · P1 حرجة · P2 عالية · P3 عادية |
| **الحالة** | open · in-progress · review · done · rejected |
| **النطاق** | Backend (`backend/src/`) · UI (`UI/src/`) · DB (`DB/migrations/`) |
| **الفرع** | `feat/...` من `main` |
| **التاريخ** | YYYY-MM-DD |

---

## 2. طاقم الوكلاء المفوّض (Model Delegation Fleet)

| الدور | الموديل المعتمد | هل حدث Failover؟ | الموديل البديل المستخدم (إن وجد) |
|---|---|---|---|
| **التفكير والتخطيط المعماري** | Claude Opus / Sonnet / Gemini Pro / Argon | ☐ لا ☐ نعم | |
| **التنفيذ البرمجي والاختبارات** | Gemini Flash / `opencode/<free-model>` | ☐ لا ☐ نعم | |
| **مراجعة الـ Delta والاعتماد** | الموديل المعماري + المطوّر | — | — |

---

## 3. محور التفكير والتخطيط المعماري (Thinking & Architecture Phase)

### 3.1 مين اللي فكّر؟ (The Thinking Model)
- **اسم الموديل:**
- **سبب اختياره لهذه المهمة:** (مثلًا: تصميم migration، حسابات `wallet_ledger`، عزل Multi-Tenant، أو Webhook idempotency)

### 3.2 فكّر إزاي؟ (How the Thinker Analyzed the Problem)
- **تحليل المشكلة من الجذور:**
- **ثوابت النطاق في MO2 (Domain Invariants):**
  1. كل كتابة في `wallet_ledger` تمر عبر `LedgerService.insert` مع `idempotencyKey`.
  2. كل استعلام تاجر يقيّد بـ `tenant_id = $n::uuid` و `deleted_at IS NULL`.
  3. أي مسار يعدّل رصيدًا يعمل داخل `BEGIN/COMMIT/ROLLBACK` مع `FOR UPDATE`.
- **الحالات الحدية والفشل المحتمل (Failure Modes & Edge Cases):**
  - *حالة حافة 1:*
  - *حالة حافة 2:* (تزامن طلبات / تكرار Webhook / غياب Redis)

### 3.3 البدائل المعمارية المرفوضة وتبرير الرفض
| البديل المقترح | سبب الرفض وعدم اعتماده |
|---|---|
| مثال: `INSERT INTO wallet_ledger` مباشرة في الـ Controller | يكسر مسار الدفتر الوحيد ويلغي ضمان الـ Idempotency |

### 3.4 عقد التسليم للمنفّذ (Hand-off Contract)
- **الـ Skills الموصى بقراءتها من `.agents/skills/`:**
- **الملفات المستهدفة:**
  - `backend/src/...`
  - `UI/src/...`
  - `DB/migrations/...`
- **التوقيع البرمجي للدوال / الـ Endpoints (Signatures):**
- **معايير القبول الصارمة للمنفّذ:**
  - [ ] **AC1:**
  - [ ] **AC2:**
  - [ ] **AC3:** احترام الطبقات الأربع (`route → middleware → controller → service → pg`) واستيرادات ESM (`.js`)
  - [ ] **AC4:** اختبارات Vitest تغطي المسار والحالات الحدية + نجاح `tsc`

---

## 4. محور التنفيذ البرمجي (Implementation Phase)

### 4.1 مين اللي نفّذ؟ (The Implementing Model)
- **اسم الموديل:**
- **طريقة التشغيل:** (مباشر أو عبر `relay.mjs` في `Workspace: branch` / `worktree`)

### 4.2 تنفّذ إزاي؟ (How the Implementer Coded the Solution)
- **خطوات التنفيذ:**
  1.
  2.
- **الملفات التي تم إنشاؤها أو تعديلها:**
  | مسار الملف | نوع التعديل (جديد / تعديل) | الغرض |
  |---|---|---|
  | `DB/migrations/...` | | |
  | `backend/src/...` | | |
  | `UI/src/...` | | |

- **ضمانات قواعد MO2 Loyalty (`AGENTS.md`):**
  - [ ] **الفصل المعماري:** `routes` ← `middlewares` ← `controllers` ← `services` ← `pg` (بلا SQL في controllers ولا `res` في services)
  - [ ] **الدفتر والتزامن:** `LedgerService.insert` + `idempotencyKey` + `FOR UPDATE` عند اللزوم
  - [ ] **عزل الـ Tenant:** `tenant_id = $n::uuid` + `deleted_at IS NULL` + `resolveTenantId()` للعامة فقط
  - [ ] **ESM و الهجرات:** امتداد `.js` للاستيرادات النسبية، وأي migration جديدة مسجّلة في `docker-compose.yml`
  - [ ] **الواجهة:** نصوص عبر `translations.ts`، ألوان عبر `tokens.css`، ودعم RTL سليم

---

## 5. محور المراجعة والتحقق (Delta-Only Review & Quality Gates)

### 5.1 مراجعة فوارق الكود فقط (Pure Git Diff Review)
- **الموديل المراجع:**
- **أمر الفارق المراجَع:** `git diff -U2 backend/ UI/src/ DB/migrations/`
- **تقييم الموديل المعماري لأسطر التعديل:**
- **قرار الاعتماد:** APPROVED ☐ / REJECTED ☐

### 5.2 نتائج أوامر الفحص والتحقق الفعلية
| الأمر المُنفَّذ | النتيجة الحرفية | الحالة |
|---|---|---|
| `cd backend; npm run build` | | ☐ ناجح ☐ فاشل |
| `cd backend; npm test` | | ☐ ناجح ☐ فاشل |
| `cd UI; npm run lint` | | ☐ ناجح ☐ فاشل |
| `cd UI; npm run build` | | ☐ ناجح ☐ فاشل |

---

## 6. خطة التراجع وسجل الحالة (Rollback & Audit)

- **خطة التراجع (Rollback Plan):**
- **سجل حركة الميزة:**

| التاريخ | الفاعل (الموديل / المطوّر) | الإجراء المتخذ |
|---|---|---|
| YYYY-MM-DD | الموديل المعماري | صياغة العقد والتخطيط (`open`) |
| YYYY-MM-DD | المنفّذ | إتمام البرمجة والاختبارات (`review`) |
| YYYY-MM-DD | الموديل المعماري + المطوّر | الاعتماد النهائي والدمج في `main` (`done`) |

---

**شرط الإغلاق النهائي:** موافقة المراجع على الـ Delta Diff · نجاح `backend` (`tsc` + `vitest`) و `UI` (`tsc --noEmit` + `build`) · الدمج في `main` · المزامنة عبر `MO2/scripts/sync_to_github_and_notion.ps1`.
