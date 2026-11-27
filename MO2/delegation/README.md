# نظام التفويض متعدد الوكلاء — MO2 Loyalty Delegation System

مجلد `MO2/delegation/` هو المركز التوثيقي المعتمد لتصميم وتنفيذ ومراجعة الميزات المعمارية في **MO2 Loyalty App** باستخدام **التفويض متعدد الموديلات (Multi-Model Delegation)** مع حماية التوكنز.

---

## محتويات المجلد

1. **المهارة التنفيذية ([`.agents/skills/mo2-delegation/SKILL.md`](../.agents/skills/mo2-delegation/SKILL.md)):**
   - تعريف أدوار الموديلات:
     - **المعماري والمراجع:** موديل التفكير العميق (Opus / Sonnet / Gemini Pro / Argon) لصياغة العقد البرمجي ومراجعة الـ Diff فقط.
     - **المنفّذ السريع:** Flash لكتابة المنطق المتكامل.
     - **أسطول OpenCode Zen المجاني ($0.00):** `opencode/big-pickle`، `opencode/deepseek-v4.1-flash-free`، `opencode/glm-5.3-flash-free`، `opencode/nemotron-3.5-lightning-free`، `opencode/mimo-v2.6-flash-free` لكتابة اختبارات Vitest والـ helpers والـ UI boilerplate عبر `.agents/skills/opencode-delegate/scripts/relay.mjs`.
   - **بروتوكول Delta-Only Token Shield:** الموديل المعماري يراجع فقط `git diff -U2 backend/ UI/src/ DB/migrations/` (أقل من 500 توكن).
   - **Thin Router:** يوجّه المهام للـ skills الموجودة أصلًا في `.agents/skills/` بدل تكرار التعليمات.

2. **القالب المعتمد ([`_template-delegated-feature.md`](./_template-delegated-feature.md)):**
   - يوثّق: **مين فكّر وفكّر إزاي** (المعمارية والقيود)، **مين نفّذ وتنفّذ إزاي** (الملفات، الاختبارات، التوافق مع قواعد MO2)، و**المراجعة والاعتماد** (`tsc` + `vitest` + `UI lint/build` + Delta Diff).

3. **المزامنة التلقائية مع GitHub و Notion:**
   - عبر [`MO2/scripts/sync_to_github_and_notion.ps1`](../scripts/sync_to_github_and_notion.ps1):
     - **Project في Notion:** `MO2 Loyalty App`
     - **Tasks DB:** `1ab4c829-3bd9-47e6-a2cd-55a65d7a2dcb`
     - **Bugs DB:** `a63061e4-eebe-4040-a057-a9dbd4454dc9`
     - **GitHub Repo:** `momenmohammed312-dev/reward-app`

---

## كيف تبدأ ميزة جديدة بنظام التفويض؟

1. انسخ `_template-delegated-feature.md` باسم:
   ```text
   MO2/delegation/MO2-DELEG-XXXX-<slug>.md
   ```
2. يملأ الموديل المعماري **القسم 3 (التفكير والعقد البرمجي)** مع تحديد الـ Skills المطلوبة من `.agents/skills/`.
3. ينفّذ Flash أو OpenCode المهمة في نطاقها، مع تشغيل:
   - `cd backend; npm run build; npm test`
   - `cd UI; npm run lint; npm run build`
4. يراجع الموديل المعماري الـ `git diff -U2` فقط ويعتمد التعديل في **القسم 5**.
5. تُزامن التذكرة مع GitHub و Notion:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "MO2/scripts/sync_to_github_and_notion.ps1" -File "MO2/delegation/MO2-DELEG-XXXX-<slug>.md"
   ```
