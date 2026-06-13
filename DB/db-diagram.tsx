import { useState } from "react";

const C = {
  bg: "#0f172a", card: "#898a8b", border: "#334155",
  accent: "#38bdf8", green: "#4ade80", orange: "#fb923c",
  purple: "#c084fc", pink: "#f472b6", yellow: "#facc15",
  red: "#f87171", text: "#f1f5f9", muted: "#94a3b8",
  white: "#ffffff",
};

const tables = [
  {
    name: "tenants", icon: "🏢", color: C.accent, note: "كل كافيه = Tenant",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "name", type: "VARCHAR(100)", required: true },
      { name: "slug", type: "VARCHAR(50)", unique: true },
      { name: "points_per_egp", type: "NUMERIC", default: "1.0" },
      { name: "min_purchase_egp", type: "NUMERIC", default: "0" },
      { name: "points_expiry_days", type: "INTEGER", nullable: true },
      { name: "is_active", type: "BOOLEAN", default: "true" },
      { name: "plan", type: "VARCHAR(20)", default: "'starter'" },
      { name: "created_at", type: "TIMESTAMPTZ", default: "NOW()" },
    ],
  },
  {
    name: "branches", icon: "📍", color: C.yellow, note: "فروع كل كافيه",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants" },
      { name: "name", type: "VARCHAR(100)", required: true },
      { name: "city", type: "VARCHAR(50)" },
      { name: "pos_type", type: "ENUM", values: "foodics/square/toast/manual" },
      { name: "pos_location_id", type: "VARCHAR(100)" },
      { name: "api_key", type: "VARCHAR(100)", unique: true },
      { name: "is_active", type: "BOOLEAN", default: "true" },
    ],
  },
  {
    name: "customers", icon: "👤", color: C.green, note: "عملاء كل Tenant",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants" },
      { name: "phone", type: "VARCHAR(20)", required: true },
      { name: "name", type: "VARCHAR(100)" },
      { name: "tier", type: "ENUM", values: "bronze/silver/gold/platinum", default: "bronze" },
      { name: "total_earned", type: "INTEGER", default: "0" },
      { name: "is_verified", type: "BOOLEAN", default: "false" },
      { name: "last_visit", type: "TIMESTAMPTZ" },
      { name: "UNIQUE", type: "", note: "(tenant_id, phone)" },
    ],
  },
  {
    name: "otp_codes", icon: "🔑", color: C.pink, note: "كودات OTP المؤقتة",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants" },
      { name: "phone", type: "VARCHAR(20)", required: true },
      { name: "code", type: "VARCHAR(6)", required: true },
      { name: "attempts", type: "INTEGER", default: "0" },
      { name: "max_attempts", type: "INTEGER", default: "5" },
      { name: "expires_at", type: "TIMESTAMPTZ", note: "+5 دقايق" },
      { name: "used_at", type: "TIMESTAMPTZ", nullable: true },
    ],
  },
  {
    name: "transactions", icon: "🛒", color: C.orange, note: "كل عملية شراء",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants" },
      { name: "customer_id", type: "UUID", fk: "customers" },
      { name: "branch_id", type: "UUID", fk: "branches" },
      { name: "invoice_id", type: "VARCHAR(100)", note: "UNIQUE per tenant" },
      { name: "amount", type: "NUMERIC(10,2)", required: true },
      { name: "points_earned", type: "INTEGER", required: true },
      { name: "pos_payload", type: "JSONB", default: "{}" },
      { name: "UNIQUE", type: "", note: "(tenant_id, invoice_id)" },
    ],
  },
  {
    name: "wallet_ledger", icon: "📒", color: C.purple, note: "دفتر الأستاذ — قلب النظام",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants" },
      { name: "customer_id", type: "UUID", fk: "customers" },
      { name: "type", type: "ENUM", values: "earned/redeemed/bonus/refund/expired/adjustment" },
      { name: "points", type: "INTEGER", note: "دايماً موجب" },
      { name: "reference_id", type: "UUID", note: "transaction أو redemption" },
      { name: "reference_type", type: "VARCHAR(30)" },
      { name: "note", type: "TEXT", nullable: true },
      { name: "created_by", type: "VARCHAR(50)", default: "'system'" },
    ],
  },
  {
    name: "rewards", icon: "🎁", color: C.red, note: "المكافآت المتاحة",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants" },
      { name: "name", type: "VARCHAR(100)", required: true },
      { name: "reward_type", type: "ENUM", values: "free_item/discount_fixed/discount_percent" },
      { name: "required_points", type: "INTEGER", required: true },
      { name: "discount_value", type: "NUMERIC", nullable: true },
      { name: "code_validity_hours", type: "INTEGER", default: "1" },
      { name: "max_redemptions", type: "INTEGER", nullable: true },
      { name: "min_tier", type: "ENUM", nullable: true },
      { name: "is_active", type: "BOOLEAN", default: "true" },
    ],
  },
  {
    name: "redemptions", icon: "🎫", color: "#e879f9", note: "كودات الاستبدال",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants" },
      { name: "customer_id", type: "UUID", fk: "customers" },
      { name: "reward_id", type: "UUID", fk: "rewards" },
      { name: "branch_id", type: "UUID", fk: "branches", nullable: true },
      { name: "code", type: "VARCHAR(20)", note: "CAFE-XXXXXX", unique: true },
      { name: "points_used", type: "INTEGER", required: true },
      { name: "expires_at", type: "TIMESTAMPTZ" },
      { name: "used_at", type: "TIMESTAMPTZ", nullable: true },
    ],
  },
  {
    name: "users", icon: "🔑", color: C.purple, note: "مستخدمي لوحة التحكم",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants" },
      { name: "email", type: "VARCHAR(255)", required: true },
      { name: "password_hash", type: "VARCHAR(255)", required: true },
      { name: "name", type: "VARCHAR(100)" },
      { name: "role", type: "ENUM", values: "owner/manager/cashier" },
      { name: "is_active", type: "BOOLEAN", default: "true" },
      { name: "created_at", type: "TIMESTAMPTZ", default: "NOW()" },
      { name: "UNIQUE", type: "", note: "(tenant_id, email)" },
    ],
  },
  {
    name: "subscriptions", icon: "💳", color: C.yellow, note: "اشتراكات الكافيهات",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants" },
      { name: "status", type: "ENUM", values: "active/past_due/canceled/trialing" },
      { name: "provider_sub_id", type: "VARCHAR(100)", nullable: true },
      { name: "current_period_end", type: "TIMESTAMPTZ" },
      { name: "created_at", type: "TIMESTAMPTZ", default: "NOW()" },
      { name: "UNIQUE", type: "", note: "(tenant_id)" },
    ],
  },
  {
    name: "billing_history", icon: "🧾", color: C.pink, note: "سجل فواتير الاشتراكات",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants" },
      { name: "amount", type: "NUMERIC(10,2)", required: true },
      { name: "currency", type: "VARCHAR(3)", default: "'EGP'" },
      { name: "status", type: "VARCHAR(20)", note: "paid/failed/pending" },
      { name: "invoice_url", type: "TEXT", nullable: true },
      { name: "paid_at", type: "TIMESTAMPTZ", nullable: true },
    ],
  },
  {
    name: "webhook_logs", icon: "🌐", color: C.accent, note: "سجل العمليات الواردة من POS",
    columns: [
      { name: "id", type: "UUID", pk: true },
      { name: "tenant_id", type: "UUID", fk: "tenants", nullable: true },
      { name: "pos_type", type: "VARCHAR(20)", default: "'foodics'" },
      { name: "event_type", type: "VARCHAR(50)", note: "order.closed / order.updated" },
      { name: "payload", type: "JSONB", required: true },
      { name: "status", type: "ENUM", values: "pending/processed/failed" },
      { name: "error_message", type: "TEXT", nullable: true },
      { name: "created_at", type: "TIMESTAMPTZ", default: "NOW()" },
    ],
  },
];

const views = [
  {
    name: "customer_balances",
    desc: "رصيد النقاط الحالي لكل عميل",
    sql: `SELECT customer_id,
  SUM(CASE WHEN type IN ('earned','bonus','refund') THEN points
           WHEN type IN ('redeemed','expired') THEN -points
      END) AS current_balance
FROM wallet_ledger
GROUP BY tenant_id, customer_id`,
  },
  {
    name: "customer_summary",
    desc: "بيانات العميل الكاملة + رصيده",
    sql: `SELECT c.*, cb.current_balance,
  cb.total_earned, cb.total_redeemed
FROM customers c
LEFT JOIN customer_balances cb
  ON c.id = cb.customer_id`,
  },
];

const functions = [
  { name: "calculate_points()", desc: "يحسب النقاط حسب المبلغ والـ Tier", color: C.green },
  { name: "update_customer_tier()", desc: "Trigger — يحدث الـ Tier تلقائياً", color: C.orange },
  { name: "generate_redemption_code()", desc: "يولد كود CAFE-XXXXXX فريد", color: C.purple },
  { name: "get_customer_balance()", desc: "يرجع الرصيد الحالي للعميل", color: C.accent },
  { name: "set_updated_at()", desc: "Trigger — يحدث updated_at تلقائياً", color: C.muted },
];

const relations = [
  { from: "branches", to: "tenants", label: "tenant_id →", type: "N:1" },
  { from: "customers", to: "tenants", label: "tenant_id →", type: "N:1" },
  { from: "transactions", to: "customers", label: "customer_id →", type: "N:1" },
  { from: "transactions", to: "branches", label: "branch_id →", type: "N:1" },
  { from: "wallet_ledger", to: "customers", label: "customer_id →", type: "N:1" },
  { from: "rewards", to: "tenants", label: "tenant_id →", type: "N:1" },
  { from: "redemptions", to: "customers", label: "customer_id →", type: "N:1" },
  { from: "redemptions", to: "rewards", label: "reward_id →", type: "N:1" },
  { from: "users", to: "tenants", label: "tenant_id →", type: "N:1" },
  { from: "subscriptions", to: "tenants", label: "tenant_id →", type: "1:1" },
  { from: "billing_history", to: "tenants", label: "tenant_id →", type: "N:1" },
  { from: "webhook_logs", to: "tenants", label: "tenant_id →", type: "N:1", nullable: true },
];

function ColBadge({ col }) {
  if (col.pk) return <span style={{ background: "#fbbf2422", color: "#fbbf24", border: "1px solid #fbbf2444", borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>PK</span>;
  if (col.fk) return <span style={{ background: "#38bdf822", color: "#38bdf8", border: "1px solid #38bdf844", borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>FK</span>;
  if (col.unique) return <span style={{ background: "#a78bfa22", color: "#a78bfa", border: "1px solid #a78bfa44", borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>UQ</span>;
  if (col.required) return <span style={{ background: "#f8717122", color: "#f87171", border: "1px solid #f8717144", borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>NN</span>;
  return null;
}

function TableCard({ table, selected, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: selected ? table.color + "18" : C.card,
      border: `2px solid ${selected ? table.color : C.border}`,
      borderRadius: 10,
      overflow: "hidden",
      cursor: "pointer",
      transition: "all 0.2s",
      boxShadow: selected ? `0 0 20px ${table.color}33` : "none",
    }}>
      <div style={{
        background: table.color + "22",
        padding: "10px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: `1px solid ${table.color}33`,
      }}>
        <div>
          <span style={{ fontSize: 16 }}>{table.icon}</span>
          <span style={{ color: table.color, fontWeight: 800, fontSize: 13, marginRight: 6 }}>{table.name}</span>
        </div>
        <span style={{ color: C.muted, fontSize: 10 }}>{table.note}</span>
      </div>
      <div style={{ padding: "8px 0" }}>
        {table.columns.map((col, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 14px",
            borderBottom: i < table.columns.length - 1 ? `1px solid ${C.border}44` : "none",
          }}>
            <ColBadge col={col} />
            <span style={{
              color: col.pk ? "#fbbf24" : col.fk ? C.accent : col.name === "UNIQUE" ? C.purple : C.text,
              fontSize: 11,
              fontFamily: "monospace",
              flex: 1,
              fontWeight: col.pk || col.fk ? 700 : 400,
            }}>{col.name}</span>
            <span style={{ color: C.muted, fontSize: 10, fontFamily: "monospace" }}>
              {col.type}{col.default ? ` = ${col.default}` : ""}{col.note ? ` — ${col.note}` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const tabs = [
  { id: "schema", label: "📋 الجداول" },
  { id: "relations", label: "🔗 العلاقات" },
  { id: "logic", label: "⚙️ الـ Logic" },
  { id: "sql", label: "📄 SQL جاهز" },
];

const sqlSnippets = [
  {
    title: "🔍 جلب رصيد العميل (الأسرع)",
    sql: `SELECT get_customer_balance('customer-uuid-here');
-- أو من الـ View:
SELECT points_balance FROM customer_summary
WHERE phone = '01012345678'
  AND tenant_id = 'tenant-uuid';`,
  },
  {
    title: "💳 تسجيل عملية شراء من الـ POS (Webhook)",
    sql: `-- Step 1: تأكد إن الفاتورة مش موجودة (Idempotency)
INSERT INTO transactions
  (tenant_id, customer_id, branch_id, invoice_id, amount, points_earned)
VALUES
  ($tenant_id, $customer_id, $branch_id, $invoice_id, $amount, $points)
ON CONFLICT (tenant_id, invoice_id) DO NOTHING;

-- Step 2: أضف النقاط للـ Wallet Ledger
INSERT INTO wallet_ledger
  (tenant_id, customer_id, type, points, reference_id, reference_type)
VALUES
  ($tenant_id, $customer_id, 'earned', $points, $transaction_id, 'transaction');
-- الـ Trigger هيحدث الـ Tier تلقائياً`,
  },
  {
    title: "🎁 استبدال مكافأة",
    sql: `-- Step 1: تحقق من الرصيد
SELECT get_customer_balance($customer_id) >= $required_points;

-- Step 2: أنشئ الكود
INSERT INTO redemptions
  (tenant_id, customer_id, reward_id, code, points_used, expires_at)
VALUES (
  $tenant_id, $customer_id, $reward_id,
  generate_redemption_code(),
  $points_used,
  NOW() + ($hours || ' hours')::INTERVAL
);

-- Step 3: اخصم من الـ Wallet
INSERT INTO wallet_ledger
  (tenant_id, customer_id, type, points, reference_id, reference_type)
VALUES
  ($tenant_id, $customer_id, 'redeemed', $points_used, $redemption_id, 'redemption');`,
  },
  {
    title: "📊 تقرير أكثر العملاء نشاطاً",
    sql: `SELECT
  c.name, c.phone, c.tier,
  cs.points_balance,
  cs.total_earned,
  COUNT(t.id) AS total_visits,
  SUM(t.amount) AS total_spent
FROM customers c
JOIN customer_summary cs ON c.id = cs.id
LEFT JOIN transactions t ON c.id = t.customer_id
WHERE c.tenant_id = $tenant_id
GROUP BY c.id, c.name, c.phone, c.tier, cs.points_balance, cs.total_earned
ORDER BY total_spent DESC
LIMIT 20;`,
  },
];

export default function DBDiagram() {
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("schema");
  const [sqlIdx, setSqlIdx] = useState(0);

  const selectedTable = tables.find(t => t.name === selected);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "monospace, sans-serif", direction: "rtl", color: C.text }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b, #0f172a)",
        borderBottom: `2px solid #334155`,
        padding: "16px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>🗄️</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.white }}>Database Schema</div>
            <div style={{ color: C.muted, fontSize: 11 }}>PostgreSQL 15 | 8 Tables | 3 Views | 5 Functions | 6 Triggers</div>
          </div>
          <div style={{ marginRight: "auto", display: "flex", gap: 8 }}>
            {["Multi-Tenant ✓", "Wallet Ledger ✓", "Auto Tier ✓"].map(t => (
              <span key={t} style={{ background: C.green + "22", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#1e293b", borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", gap: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: "transparent",
            border: "none",
            borderBottom: `3px solid ${activeTab === t.id ? C.accent : "transparent"}`,
            color: activeTab === t.id ? C.accent : C.muted,
            padding: "12px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 24 }}>

        {/* SCHEMA TAB */}
        {activeTab === "schema" && (
          <div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
              اضغط على أي جدول لتكبيره 👇
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {tables.map(t => (
                <TableCard
                  key={t.name}
                  table={t}
                  selected={selected === t.name}
                  onClick={() => setSelected(selected === t.name ? null : t.name)}
                />
              ))}
            </div>

            {/* ENUMs */}
            <div style={{ marginTop: 24 }}>
              <div style={{ color: C.yellow, fontWeight: 800, marginBottom: 12, fontSize: 14 }}>📋 الـ ENUMs</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { name: "ledger_type", values: ["earned", "redeemed", "bonus", "refund", "expired", "adjustment"], color: C.purple },
                  { name: "reward_type", values: ["free_item", "discount_fixed", "discount_percent", "free_upgrade"], color: C.red },
                  { name: "pos_type", values: ["foodics", "square", "toast", "custom_api", "manual"], color: C.yellow },
                  { name: "tier_type", values: ["bronze", "silver", "gold", "platinum"], color: C.orange },
                ].map((e, i) => (
                  <div key={i} style={{ background: C.card, border: `1px solid ${e.color}33`, borderRadius: 8, padding: 12 }}>
                    <div style={{ color: e.color, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>ENUM: {e.name}</div>
                    {e.values.map((v, j) => (
                      <div key={j} style={{ color: C.muted, fontSize: 11, marginBottom: 3 }}>'{v}'</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RELATIONS TAB */}
        {activeTab === "relations" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div style={{ color: C.accent, fontWeight: 800, marginBottom: 12 }}>🔗 Foreign Keys</div>
                {relations.map((r, i) => (
                  <div key={i} style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: C.orange, fontWeight: 700, fontSize: 12 }}>{r.from}</span>
                      <span style={{ color: C.muted, fontSize: 12 }}>→</span>
                      <span style={{ color: C.green, fontWeight: 700, fontSize: 12 }}>{r.to}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: C.muted, fontSize: 11 }}>{r.label}</span>
                      <span style={{ background: C.accent + "22", color: C.accent, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{r.type}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ color: C.green, fontWeight: 800, marginBottom: 12 }}>📐 قواعد التصميم المهمة</div>
                {[
                  ["tenant_id في كل جدول", "عزل البيانات بين الكافيهات — إلزامي في كل Query"],
                  ["UNIQUE(tenant_id, phone)", "نفس الرقم يقدر يكون في كافيهات مختلفة"],
                  ["UNIQUE(tenant_id, invoice_id)", "منع احتساب نفس الفاتورة مرتين (Idempotency)"],
                  ["wallet_ledger فقط للنقاط", "ممنوع تعديل النقاط مباشرة في أي جدول تاني"],
                  ["ON DELETE CASCADE", "لو حذفت Tenant، بياناته كلها بتتحذف تلقائياً"],
                  ["UUID كـ Primary Keys", "أأمن وأسهل في الـ Multi-Tenant من الـ Integers"],
                ].map(([rule, why], i) => (
                  <div key={i} style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 8,
                  }}>
                    <div style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>✓ {rule}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{why}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ color: C.purple, fontWeight: 800, marginBottom: 12 }}>👁️ Views</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {views.map((v, i) => (
                  <div key={i} style={{ background: C.card, border: `1px solid ${C.purple}33`, borderRadius: 8, padding: 16 }}>
                    <div style={{ color: C.purple, fontWeight: 700, marginBottom: 4 }}>📊 {v.name}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginBottom: 10 }}>{v.desc}</div>
                    <pre style={{ color: C.green, fontSize: 10, background: "#0f172a", padding: 10, borderRadius: 6, overflowX: "auto", margin: 0 }}>{v.sql}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOGIC TAB */}
        {activeTab === "logic" && (
          <div>
            <div style={{ color: C.orange, fontWeight: 800, marginBottom: 12 }}>⚙️ Functions & Triggers</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
              {functions.map((f, i) => (
                <div key={i} style={{
                  background: C.card,
                  border: `1px solid ${f.color}33`,
                  borderRadius: 8,
                  padding: "14px 16px",
                }}>
                  <div style={{ color: f.color, fontWeight: 700, fontSize: 13, fontFamily: "monospace", marginBottom: 6 }}>fn: {f.name}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ color: C.accent, fontWeight: 800, marginBottom: 12 }}>💡 منطق الـ Wallet Ledger (الأهم)</div>
            <div style={{ background: C.card, border: `1px solid ${C.accent}33`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ color: C.red, fontWeight: 700, marginBottom: 8 }}>❌ الطريقة الغلط</div>
                  <pre style={{ background: "#0f172a", padding: 12, borderRadius: 6, fontSize: 11, color: "#f87171", margin: 0 }}>{`-- ممنوع!
UPDATE customers
SET points = points + 50
WHERE id = $id;

-- ليه غلط؟
-- مفيش history
-- مفيش audit
-- لو في bug مش هتعرف تتراجع`}</pre>
                </div>
                <div>
                  <div style={{ color: C.green, fontWeight: 700, marginBottom: 8 }}>✅ الطريقة الصح</div>
                  <pre style={{ background: "#0f172a", padding: 12, borderRadius: 6, fontSize: 11, color: "#4ade80", margin: 0 }}>{`-- صح دايماً
INSERT INTO wallet_ledger (
  customer_id, type, points,
  reference_id, reference_type
) VALUES (
  $id, 'earned', 50,
  $tx_id, 'transaction'
);

-- الرصيد = SUM دايماً من الـ Ledger`}</pre>
                </div>
              </div>
              <div style={{ marginTop: 16, background: "#0f172a", borderRadius: 6, padding: 12 }}>
                <div style={{ color: C.yellow, fontSize: 11, marginBottom: 6 }}>-- حساب الرصيد</div>
                <pre style={{ color: C.text, fontSize: 11, margin: 0 }}>{`SELECT
  SUM(CASE WHEN type IN ('earned','bonus','refund') THEN points  -- موجب
           WHEN type IN ('redeemed','expired')      THEN -points -- سالب
      END) AS balance
FROM wallet_ledger
WHERE customer_id = $id;`}</pre>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ color: C.purple, fontWeight: 800, marginBottom: 12 }}>🎯 منطق الـ Tier System</div>
              <div style={{ display: "flex", gap: 0, position: "relative" }}>
                {[
                  { tier: "Bronze", min: 0, max: 499, color: "#cd7f32", multiplier: "1x", icon: "🥉" },
                  { tier: "Silver", min: 500, max: 1999, color: "#94a3b8", multiplier: "1.5x", icon: "🥈" },
                  { tier: "Gold", min: 2000, max: 4999, color: "#fbbf24", multiplier: "2x", icon: "🥇" },
                  { tier: "Platinum", min: 5000, max: "∞", color: "#e879f9", multiplier: "3x", icon: "💎" },
                ].map((t, i) => (
                  <div key={i} style={{
                    flex: 1,
                    background: t.color + "22",
                    border: `2px solid ${t.color}44`,
                    borderRadius: i === 0 ? "8px 0 0 8px" : i === 3 ? "0 8px 8px 0" : 0,
                    padding: "14px 12px",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 24 }}>{t.icon}</div>
                    <div style={{ color: t.color, fontWeight: 800, fontSize: 13 }}>{t.tier}</div>
                    <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>{t.min} — {t.max} نقطة</div>
                    <div style={{ color: t.color, fontSize: 12, fontWeight: 700, marginTop: 4 }}>{t.multiplier} نقاط</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SQL TAB */}
        {activeTab === "sql" && (
          <div>
            <div style={{ color: C.accent, fontWeight: 800, marginBottom: 16 }}>📄 SQL Snippets جاهزة للاستخدام في الـ Backend</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {sqlSnippets.map((s, i) => (
                <button key={i} onClick={() => setSqlIdx(i)} style={{
                  background: sqlIdx === i ? C.accent + "22" : "transparent",
                  border: `2px solid ${sqlIdx === i ? C.accent : C.border}`,
                  color: sqlIdx === i ? C.accent : C.muted,
                  borderRadius: 8,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                }}>{s.title.split(" ").slice(0, 3).join(" ")}</button>
              ))}
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: C.border, padding: "10px 16px", color: C.text, fontWeight: 700, fontSize: 13 }}>
                {sqlSnippets[sqlIdx].title}
              </div>
              <pre style={{
                padding: 20,
                color: C.green,
                fontSize: 12,
                lineHeight: 1.9,
                margin: 0,
                overflowX: "auto",
                background: "#0a0f1e",
              }}>{sqlSnippets[sqlIdx].sql}</pre>
            </div>

            <div style={{ marginTop: 20, background: C.card, border: `1px solid ${C.orange}33`, borderRadius: 10, padding: 16 }}>
              <div style={{ color: C.orange, fontWeight: 800, marginBottom: 12 }}>🚀 خطوات التشغيل على جهازك</div>
              {[
                { step: "1", cmd: "psql -U postgres", desc: "افتح PostgreSQL" },
                { step: "2", cmd: "CREATE DATABASE loyalty_db;", desc: "أنشئ الـ Database" },
                { step: "3", cmd: "\\c loyalty_db", desc: "اتصل بالـ Database" },
                { step: "4", cmd: "\\i schema.sql", desc: "شغّل الـ Schema" },
                { step: "5", cmd: "SELECT * FROM customer_summary;", desc: "تحقق من الـ Seed Data" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "center" }}>
                  <div style={{
                    background: C.orange + "22", color: C.orange,
                    borderRadius: "50%", width: 22, height: 22,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, flexShrink: 0,
                  }}>{s.step}</div>
                  <code style={{ color: C.green, fontSize: 12, background: "#0a0f1e", padding: "2px 10px", borderRadius: 4, flex: 1 }}>{s.cmd}</code>
                  <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
