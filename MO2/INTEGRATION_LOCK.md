# MO2 Loyalty Integration Lock

- **Branch:** `main`
- **Status:** `UNLOCKED`
- **Last Updated:** `2026-11-27`
- **Owner:** Free (any approved agent or developer may commit to feature branches or `main` after passing gates)

---

## كيف يُستخدم هذا القفل؟

عند وجود وكيل واحد يعمل على `main`: لا يلزم القفل.
عند تشغيل **أكثر من وكيل متوازي** أو أثناء مرحلة تثبيت/إطلاق (`Stabilization`):

1. يغيّر الوكيل المالك `Status` أعلاه إلى `LOCKED` ويذكر:
   - `Lock Owner` (اسم الوكيل/المهمة)
   - `Acquired At` (التاريخ والوقت)
   - `Purpose` (سبب القفل، مثل دمج مرحلة أو تجهيز إطلاق)
2. أثناء حالة `LOCKED`: **ممنوع** أي `commit` أو `push` مباشر على `main` من أي وكيل آخر؛ يعمل البقية على فروع أو `git worktree` منفصل (`feat/...` أو `fix/...`).
3. بعد انتهاء الدمج واجتياز البوابات (`backend: npm run build && npm test` و `UI: npm run lint`), يُعاد `Status` إلى `UNLOCKED`.
