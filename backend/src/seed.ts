import db from './config/db.js';

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed() should not be run in production — it will delete all data');
  }
  console.log('🌱 Seeding database...');

  // 1. Clean existing data
  await db.query('DELETE FROM webhook_logs');
  await db.query('DELETE FROM weekly_offers');
  await db.query('DELETE FROM campaigns');
  await db.query('DELETE FROM wallet_ledger');
  await db.query('DELETE FROM redemptions');
  await db.query('DELETE FROM transactions');
  await db.query('DELETE FROM otp_codes');
  await db.query('DELETE FROM customer_tier_history');
  await db.query('DELETE FROM tier_benefits WHERE tenant_id IS NOT NULL');
  await db.query('DELETE FROM rewards');
  await db.query('DELETE FROM customers');
  await db.query('DELETE FROM branches');
  await db.query('DELETE FROM users');
  await db.query('DELETE FROM subscriptions');
  await db.query('DELETE FROM billing_history');
  await db.query('DELETE FROM tenants');

  // 2. Seed system tier defaults (if not exist)
  await db.query(`
    INSERT INTO tier_benefits (tier_name, multiplier, hierarchy_rank) VALUES
      ('bronze', 1.0, 1),
      ('silver', 1.5, 2),
      ('gold', 2.0, 3),
      ('platinum', 3.0, 4)
    ON CONFLICT (tenant_id, tier_name) WHERE tenant_id IS NULL DO NOTHING
  `);

  // 3. Seed tenants
  const tenants = await Promise.all([
    db.query(`
      INSERT INTO tenants (name, slug, points_per_egp, min_purchase_egp, points_expiry_days, plan, is_active,
        logo_url, primary_color, accent_color, bg_color, surface_color, font_display, font_body, tagline)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, name, slug
    `, ['MO2 Loyalty', 'mo2-loyalty', 1.0, 20, 365, 'premium', true,
        'https://picsum.photos/seed/mo2loyaltylogo/160', '#1e40af', '#f59e0b', '#f8fafc', '#ffffff', 'Playfair Display', 'Cairo', 'برنامج الولاء الذكي للعلامات والمقاهي']),
    db.query(`
      INSERT INTO tenants (name, slug, points_per_egp, min_purchase_egp, points_expiry_days, plan, is_active,
        logo_url, primary_color, accent_color, bg_color, surface_color, font_display, font_body, tagline)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, name, slug
    `, ['برو أند كو', 'brew-co', 1.5, 30, 180, 'premium', true,
        'https://picsum.photos/seed/brewcologo/160', '#78350f', '#c2410c', '#fafaf9', '#ffffff', 'Playfair Display', 'Cairo', 'مذاق القهوة الغني الذي تستحقه يومياً']),
    db.query(`
      INSERT INTO tenants (name, slug, points_per_egp, min_purchase_egp, points_expiry_days, plan, is_active,
        logo_url, primary_color, accent_color, bg_color, surface_color, font_display, font_body, tagline)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, name, slug
    `, ['حلويات الياسمين', 'yasmeen', 1.0, 15, 365, 'starter', true,
        'https://picsum.photos/seed/yasmeenlogo/160', '#065f46', '#db2777', '#f0fdf4', '#ffffff', 'Playfair Display', 'Cairo', 'من الفرن إليك.. حب في كل قطعة']),
    db.query(`
      INSERT INTO tenants (name, slug, points_per_egp, min_purchase_egp, points_expiry_days, plan, is_active,
        logo_url, primary_color, accent_color, bg_color, surface_color, font_display, font_body, tagline,
        business_type, code_prefix, show_menu, point_value_egp, cashier_max_invoice_egp, welcome_bonus_points)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id, name, slug
    `, ['البركة ماركت', 'albaraka-market', 0.2, 50, 180, 'premium', true,
        'https://picsum.photos/seed/albarakamarket/160', '#047857', '#f59e0b', '#f0fdf4', '#ffffff', 'Cairo', 'Cairo', 'كل احتياجات بيتك.. ونقاط كاش باك على كل فاتورة',
        'supermarket', 'MKT', true, 0.05, 5000, 50]),
  ]);

  const [mo2Demo, brewCo, yasmeen, albarakaMarket] = tenants.map(t => t.rows[0]);
  console.log(`  ✅ Tenants: ${mo2Demo.name}, ${brewCo.name}, ${yasmeen.name}, ${albarakaMarket.name}`);

  // Supermarket-safe tier thresholds & multipliers for Albaraka Market
  await db.query(`
    INSERT INTO tier_benefits (tenant_id, tier_name, multiplier, hierarchy_rank, min_earned_points) VALUES
      ($1, 'bronze',   1.00, 1, 0),
      ($1, 'silver',   1.10, 2, 1000),
      ($1, 'gold',     1.25, 3, 3000),
      ($1, 'platinum', 1.50, 4, 8000)
  `, [albarakaMarket.id]);

  // 4. Seed admin users (password: admin123)
  const bcrypt = await import('bcrypt');
  const hash = await bcrypt.hash('admin123', 10);

  await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
    [mo2Demo.id, 'admin@mo2loyalty.com', hash, 'مدير MO2 Loyalty', 'owner']
  );
  await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
    [brewCo.id, 'admin@brewco.com', hash, 'مدير برو', 'owner']
  );
  await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
    [yasmeen.id, 'admin@yasmeen.com', hash, 'مدير الياسمين', 'owner']
  );
  await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
    [albarakaMarket.id, 'admin@albaraka.com', hash, 'مدير البركة ماركت', 'owner']
  );
  await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
    [albarakaMarket.id, 'cashier@albaraka.com', hash, 'كاشير البركة ماركت', 'cashier']
  );

  // Superadmin user (must have tenant_id = NULL so it is platform-scoped)
  await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
    [null, 'superadmin@mo2.com', hash, 'MO2 Super Admin', 'superadmin']
  );
  console.log('  ✅ Admin users created (password: admin123)');

  // 5. Seed branches
  const mo2Branches = await Promise.all([
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [mo2Demo.id, 'فرع وسط البلد', 'القاهرة', 'foodics', true]),
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [mo2Demo.id, 'فرع مصر الجديدة', 'القاهرة', 'foodics', true]),
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [mo2Demo.id, 'فرع سموحة', 'الإسكندرية', 'manual', false]),
  ]);

  const brewBranches = await Promise.all([
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [brewCo.id, 'فرع المهندسين', 'الجيزة', 'foodics', true]),
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [brewCo.id, 'فرع زايد', 'الجيزة', 'foodics', true]),
  ]);

  const yasmeenBranches = await Promise.all([
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [yasmeen.id, 'فرع الرحاب', 'القاهرة', 'manual', true]),
  ]);

  const albarakaBranches = await Promise.all([
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [albarakaMarket.id, 'فرع مدينة نصر', 'القاهرة', 'custom_api', true]),
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [albarakaMarket.id, 'فرع التجمع الخامس', 'القاهرة', 'manual', true]),
  ]);

  const allBranches = [...mo2Branches, ...brewBranches, ...yasmeenBranches, ...albarakaBranches].map(b => b.rows[0]);
  console.log(`  ✅ ${allBranches.length} branches created`);

  // 6. Seed customers
  const mo2Customers = await Promise.all([
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [mo2Demo.id, '01000000001', 'أحمد محمود', 'gold', 3500, true, '2026-05-30']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [mo2Demo.id, '01000000002', 'سارة علي', 'platinum', 8900, true, '2026-05-31']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [mo2Demo.id, '01000000003', 'مصطفى كامل', 'silver', 950, true, '2026-05-25']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [mo2Demo.id, '01000000004', 'منى أحمد', 'bronze', 340, true, '2026-05-20']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [mo2Demo.id, '01000000005', 'كريم حسن', 'gold', 4800, true, '2026-05-29']),
  ]);

  const brewCustomers = await Promise.all([
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [brewCo.id, '01000000006', 'نورا سامي', 'silver', 1500, true, '2026-05-28']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [brewCo.id, '01000000007', 'عمر هشام', 'gold', 2200, true, '2026-05-30']),
  ]);

  const yasmeenCustomers = await Promise.all([
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [yasmeen.id, '01000000008', 'ليلى خالد', 'bronze', 600, true, '2026-05-27']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [yasmeen.id, '01000000009', 'هاني جمال', 'silver', 1300, true, '2026-05-26']),
  ]);

  const albarakaCustomers = await Promise.all([
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [albarakaMarket.id, '01000000010', 'محمود سعيد', 'gold', 3200, true, '2026-05-30']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [albarakaMarket.id, '01000000011', 'نادية حسن', 'silver', 1150, true, '2026-05-29']),
  ]);

  console.log(`  ✅ ${mo2Customers.length + brewCustomers.length + yasmeenCustomers.length + albarakaCustomers.length} customers created`);

  // 7. Seed wallet_ledger entries (so customers have balances)
  const allCustomers = [
    ...mo2Customers.map(c => ({ ...c.rows[0], tenant_id: mo2Demo.id })),
    ...brewCustomers.map(c => ({ ...c.rows[0], tenant_id: brewCo.id })),
    ...yasmeenCustomers.map(c => ({ ...c.rows[0], tenant_id: yasmeen.id })),
    ...albarakaCustomers.map(c => ({ ...c.rows[0], tenant_id: albarakaMarket.id })),
  ];

  for (const c of allCustomers) {
    const earned = Math.floor(Math.random() * 2000) + 100;
    await db.query(
      `INSERT INTO wallet_ledger (tenant_id, customer_id, type, points, note, created_by, created_at) VALUES ($1, $2, 'earned', $3, $4, 'system', NOW() - INTERVAL '1 day')`,
      [c.tenant_id, c.id, earned, 'ترحيب جديد في برنامج الولاء']
    );
  }
  console.log(`  ✅ Wallet ledger entries created`);

  // 8. Seed rewards for each tenant
  const mo2Rewards = await Promise.all([
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [mo2Demo.id, 'كوب كابتشينو مجاني', 'free_item', 80, 'كوب قهوة كابتشينو غني برغوة الحليب الدافئة', 'مشروبات ساخنة', 'https://picsum.photos/seed/cappuccino/300/200', 'صالح لجميع المقاسات', 7, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [mo2Demo.id, 'كرواسون زبدة فرنسي', 'free_item', 120, 'كرواسون طازج مخبوز بزبدة فرنسية فاخرة', 'مخبوزات', 'https://picsum.photos/seed/croissant/300/200', 'متاح للاستلام والطلب داخل الفرع', 5, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [mo2Demo.id, 'خصم 20%', 'discount_percent', 200, 'خصم 20% على طلبك القادم', 'خصومات', 'https://picsum.photos/seed/discount/300/200', 'لا يمكن دمجه مع العروض الأخرى', 14, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [mo2Demo.id, 'بوكس هدايا سبشيالتي', 'free_item', 500, 'صندوق فخم يحتوي على ربع كيلو بن كولومبي فاخر', 'منتجات', 'https://picsum.photos/seed/giftbox/300/200', 'التوصيل مجاني أو الاستلام من أقرب فرع', 30, true]),
  ]);

  const brewRewards = await Promise.all([
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [brewCo.id, 'جراند إسبريسو', 'free_item', 50, 'كوب إسبريسو مزدوج بمزيج القهوة الخاص بنا', 'قهوة كلاسيكية', 'https://picsum.photos/seed/espresso/300/200', 'لا يشمل الإضافات', 3, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [brewCo.id, 'دونات دبل شوكلت', 'free_item', 90, 'دونات مغطاة بجناش الشوكولاتة الداكنة', 'حلويات', 'https://picsum.photos/seed/donut/300/200', 'صالحة للاستلام الفوري', 5, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [brewCo.id, 'خصم 15%', 'discount_percent', 150, 'خصم 15% على فاتورتك القادمة', 'خصومات', 'https://picsum.photos/seed/discount2/300/200', 'ساري في جميع الفروع', 7, true]),
  ]);

  const yasmeenRewards = await Promise.all([
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [yasmeen.id, 'علبة بيتفور الياسمين', 'free_item', 150, 'ربع كيلو بيتفور منوع بالزبدة الطبيعية', 'نواعم العيد', 'https://picsum.photos/seed/petitsfours/300/200', 'متوفر طوال الأسبوع', 14, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [yasmeen.id, 'توست بالحبوب الكاملة', 'free_item', 80, 'رغيف توست ألماني غني ببذور الكتان', 'مخبوزات', 'https://picsum.photos/seed/toastbread/300/200', 'مخبوز طازج يومياً', 4, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [yasmeen.id, 'كيكة أعياد خاصة', 'free_item', 600, 'كيكة اسفنجية بطبقتين من الكريمة لتكفي 8 أشخاص', 'مناسبات', 'https://picsum.photos/seed/birthdaycake/300/200', 'تتطلب الحجز 24 ساعة مسبقاً', 45, true]),
  ]);

  const albarakaRewards = await Promise.all([
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, discount_value, min_order_egp, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`, [albarakaMarket.id, 'قسيمة خصم 25 ج.م', 'discount_fixed', 150, 25, 200, 'خصم فوري 25 جنيه على فاتورة مشترياتك', 'قسائم خصم', 'https://picsum.photos/seed/voucher25/300/200', 'بحد أدنى 200 ج.م للفاتورة', 14, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, discount_value, min_order_egp, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`, [albarakaMarket.id, 'قسيمة خصم 50 ج.م', 'discount_fixed', 300, 50, 400, 'خصم فوري 50 جنيه على إجمالي السلة', 'قسائم خصم', 'https://picsum.photos/seed/voucher50/300/200', 'بحد أدنى 400 ج.م للفاتورة', 30, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, discount_value, min_order_egp, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`, [albarakaMarket.id, 'خصم 10% على السلة', 'discount_percent', 400, 10, 300, 'خصم 10% على مشتريات السوبر ماركت', 'قسائم خصم', 'https://picsum.photos/seed/discount10/300/200', 'بحد أدنى 300 ج.م (لا يشمل السجائر وكروت الشحن)', 14, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, discount_value, min_order_egp, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`, [albarakaMarket.id, 'زجاجة زيت طعام 1 لتر مجاناً', 'free_item', 220, null, null, 'هدية مجانية من قسم البقالة عند الاستلام من الكاشير', 'بقالة', 'https://picsum.photos/seed/cookingoil/300/200', 'حسب التوفر في الفرع', 7, true]),
  ]);

  console.log(`  ✅ ${mo2Rewards.length + brewRewards.length + yasmeenRewards.length + albarakaRewards.length} rewards created`);

  // 9. Seed trial subscriptions
  for (const t of tenants.map(r => r.rows[0])) {
    await db.query(
      `INSERT INTO subscriptions (tenant_id, status, current_period_end) VALUES ($1, 'trialing', NOW() + INTERVAL '14 days')`,
      [t.id]
    );
  }
  console.log('  ✅ Trial subscriptions created');

  // 10. Seed sample transactions
  const txData = [
    { tenantId: mo2Demo.id, customerId: mo2Customers[0].rows[0].id, branchId: mo2Branches[0].rows[0].id, invoice: 'INV-1001', amount: 190, points: 45 },
    { tenantId: mo2Demo.id, customerId: mo2Customers[1].rows[0].id, branchId: mo2Branches[1].rows[0].id, invoice: 'INV-1002', amount: 450, points: 120 },
    { tenantId: brewCo.id, customerId: brewCustomers[0].rows[0].id, branchId: brewBranches[0].rows[0].id, invoice: 'INV-2001', amount: 320, points: 75 },
    { tenantId: albarakaMarket.id, customerId: albarakaCustomers[0].rows[0].id, branchId: albarakaBranches[0].rows[0].id, invoice: 'MKT-3001', amount: 850, points: 212 },
  ];

  for (const tx of txData) {
    await db.query(
      `INSERT INTO transactions (tenant_id, customer_id, branch_id, invoice_id, amount, points_earned)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tenant_id, invoice_id) DO NOTHING`,
      [tx.tenantId, tx.customerId, tx.branchId, tx.invoice, tx.amount, tx.points]
    );
    await db.query(
      `INSERT INTO wallet_ledger (tenant_id, customer_id, type, points, reference_type, note, created_by)
       VALUES ($1, $2, 'earned', $3, 'transaction', $4, 'foodics')`,
      [tx.tenantId, tx.customerId, tx.points, `نقاط من فاتورة #${tx.invoice}`]
    );
  }
  console.log('  ✅ Sample transactions created');

  // 11. Seed weekly offers & Happy Hour campaign for Albaraka Market
  await Promise.all([
    db.query(
      `INSERT INTO weekly_offers (tenant_id, title, description, category, original_price, offer_price, image_url, is_popular, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [albarakaMarket.id, 'باقة الألبان الأسبوعية', 'حليب طازج + زبادي + جبنة بيضاء بخصم فوري', 'ألبان وطازج', 220, 185, 'https://picsum.photos/seed/dairy-pack/400/300', true]
    ),
    db.query(
      `INSERT INTO weekly_offers (tenant_id, title, description, category, original_price, offer_price, image_url, is_popular, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [albarakaMarket.id, 'سلة أساسيات المطبخ', 'أرز 5 كجم + مكرونة + زيت طعام 1 لتر + صلصة', 'بقالة', 490, 420, 'https://picsum.photos/seed/grocery-basket/400/300', true]
    ),
    db.query(
      `INSERT INTO weekly_offers (tenant_id, title, description, category, original_price, offer_price, image_url, is_popular, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [albarakaMarket.id, 'عرض المنظفات العائلي', 'مسحوق غسيل أوتوماتيك + سائل أطباق + مطهر', 'منظفات', 360, 310, 'https://picsum.photos/seed/detergents/400/300', false]
    ),
    db.query(
      `INSERT INTO weekly_offers (tenant_id, title, description, category, original_price, offer_price, image_url, is_popular, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [albarakaMarket.id, 'مخبوزات طازجة يومياً', 'توست حبوب كاملة + عيش فينو + كرواسون عائلي', 'مخبوزات', 115, 95, 'https://picsum.photos/seed/fresh-bakery/400/300', true]
    ),
  ]);

  await db.query(
    `INSERT INTO campaigns (tenant_id, name, description, campaign_type, multiplier, days_of_week, start_hour, end_hour, is_active)
     VALUES ($1, $2, $3, 'happy_hour', 2.00, $4::integer[], 9, 14, true)`,
    [albarakaMarket.id, 'ساعات الصباح السعيدة ×2', 'مضاعفة النقاط صباحاً من الأحد للأربعاء لتحريك الساعات الهادئة', [0, 1, 2, 3]]
  );
  console.log('  ✅ Weekly offers & Happy Hour campaign created');

  console.log('');
  console.log('🎉 Seed complete!');
  console.log('');
  console.log('📋 Admin logins (password: admin123):');
  console.log('   admin@mo2loyalty.com  — MO2 Loyalty');
  console.log('   admin@brewco.com — برو أند كو');
  console.log('   admin@yasmeen.com — حلويات الياسمين');
  console.log('   admin@albaraka.com — البركة ماركت (Supermarket Owner)');
  console.log('   cashier@albaraka.com — كاشير البركة ماركت (Supermarket Cashier)');
  console.log('   superadmin@mo2.com — Super Admin (all tenants)');
  console.log('');
  console.log('📱 Customer test phones: 01000000001 through 01000000011');
  console.log('   (OTP will be logged to console in dev mode)');

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
