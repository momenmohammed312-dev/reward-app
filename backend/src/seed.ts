import db from './config/db.js';

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed() should not be run in production — it will delete all data');
  }
  console.log('🌱 Seeding database...');

  // 1. Clean existing data
  await db.query('DELETE FROM webhook_logs');
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
    `, ['أروما كافيه', 'aroma', 1.0, 20, 365, 'premium', true,
        'https://picsum.photos/seed/aromacafelogo/160', '#1e40af', '#f59e0b', '#f8fafc', '#ffffff', 'Playfair Display', 'Cairo', 'القهوة المختصة وأرقى المخبوزات الفرنسية']),
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
  ]);

  const [aroma, brewCo, yasmeen] = tenants.map(t => t.rows[0]);
  console.log(`  ✅ Tenants: ${aroma.name}, ${brewCo.name}, ${yasmeen.name}`);

  // 4. Seed admin users (password: admin123)
  const bcrypt = await import('bcrypt');
  const hash = await bcrypt.hash('admin123', 10);

  await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
    [aroma.id, 'admin@aroma.com', hash, 'مدير أروما', 'owner']
  );
  await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
    [brewCo.id, 'admin@brewco.com', hash, 'مدير برو', 'owner']
  );
  await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
    [yasmeen.id, 'admin@yasmeen.com', hash, 'مدير الياسمين', 'owner']
  );

  // Superadmin user
  await db.query(
    `INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
    [aroma.id, 'superadmin@mo2.com', hash, 'MO2 Super Admin', 'superadmin']
  );
  console.log('  ✅ Admin users created (password: admin123)');

  // 5. Seed branches
  const aromaBranches = await Promise.all([
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [aroma.id, 'فرع وسط البلد', 'القاهرة', 'foodics', true]),
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [aroma.id, 'فرع مصر الجديدة', 'القاهرة', 'foodics', true]),
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [aroma.id, 'فرع سموحة', 'الإسكندرية', 'manual', false]),
  ]);

  const brewBranches = await Promise.all([
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [brewCo.id, 'فرع المهندسين', 'الجيزة', 'foodics', true]),
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [brewCo.id, 'فرع زايد', 'الجيزة', 'foodics', true]),
  ]);

  const yasmeenBranches = await Promise.all([
    db.query(`INSERT INTO branches (tenant_id, name, city, pos_type, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [yasmeen.id, 'فرع الرحاب', 'القاهرة', 'manual', true]),
  ]);

  const allBranches = [...aromaBranches, ...brewBranches, ...yasmeenBranches].map(b => b.rows[0]);
  console.log(`  ✅ ${allBranches.length} branches created`);

  // 6. Seed customers
  const aromaCustomers = await Promise.all([
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [aroma.id, '01000000001', 'أحمد محمود', 'gold', 3500, true, '2026-05-30']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [aroma.id, '01000000002', 'سارة علي', 'platinum', 8900, true, '2026-05-31']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [aroma.id, '01000000003', 'مصطفى كامل', 'silver', 950, true, '2026-05-25']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [aroma.id, '01000000004', 'منى أحمد', 'bronze', 340, true, '2026-05-20']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [aroma.id, '01000000005', 'كريم حسن', 'gold', 4800, true, '2026-05-29']),
  ]);

  const brewCustomers = await Promise.all([
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [brewCo.id, '01000000006', 'نورا سامي', 'silver', 1500, true, '2026-05-28']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [brewCo.id, '01000000007', 'عمر هشام', 'gold', 2200, true, '2026-05-30']),
  ]);

  const yasmeenCustomers = await Promise.all([
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [yasmeen.id, '01000000008', 'ليلى خالد', 'bronze', 600, true, '2026-05-27']),
    db.query(`INSERT INTO customers (tenant_id, phone, name, tier, total_earned, is_verified, last_visit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [yasmeen.id, '01000000009', 'هاني جمال', 'silver', 1300, true, '2026-05-26']),
  ]);

  console.log(`  ✅ ${aromaCustomers.length + brewCustomers.length + yasmeenCustomers.length} customers created`);

  // 7. Seed wallet_ledger entries (so customers have balances)
  const allCustomers = [...aromaCustomers, ...brewCustomers, ...yasmeenCustomers].map(c => c.rows[0]);

  for (const c of allCustomers) {
    const earned = Math.floor(Math.random() * 2000) + 100;
    await db.query(
      `INSERT INTO wallet_ledger (tenant_id, customer_id, type, points, note, created_by, created_at) VALUES ($1, $2, 'earned', $3, $4, 'system', NOW() - INTERVAL '1 day')`,
      [c.tenant_id || aroma.id, c.id, earned, 'ترحيب جديد في برنامج الولاء']
    );
  }
  console.log(`  ✅ Wallet ledger entries created`);

  // 8. Seed rewards for each tenant
  const aromaRewards = await Promise.all([
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [aroma.id, 'كوب كابتشينو مجاني', 'free_item', 80, 'كوب قهوة كابتشينو غني برغوة الحليب الدافئة', 'مشروبات ساخنة', 'https://picsum.photos/seed/cappuccino/300/200', 'صالح لجميع المقاسات', 7, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [aroma.id, 'كرواسون زبدة فرنسي', 'free_item', 120, 'كرواسون طازج مخبوز بزبدة فرنسية فاخرة', 'مخبوزات', 'https://picsum.photos/seed/croissant/300/200', 'متاح للاستلام والطلب داخل الفرع', 5, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [aroma.id, 'خصم 20%', 'discount_percent', 200, 'خصم 20% على طلبك القادم', 'خصومات', 'https://picsum.photos/seed/discount/300/200', 'لا يمكن دمجه مع العروض الأخرى', 14, true]),
    db.query(`INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, image_url, terms, expiry_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [aroma.id, 'بوكس هدايا سبشيالتي', 'free_item', 500, 'صندوق فخم يحتوي على ربع كيلو بن كولومبي فاخر', 'منتجات', 'https://picsum.photos/seed/giftbox/300/200', 'التوصيل مجاني أو الاستلام من أقرب فرع', 30, true]),
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

  console.log(`  ✅ ${aromaRewards.length + brewRewards.length + yasmeenRewards.length} rewards created`);

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
    { tenantId: aroma.id, customerId: aromaCustomers[0].rows[0].id, branchId: aromaBranches[0].rows[0].id, invoice: 'INV-1001', amount: 190, points: 45 },
    { tenantId: aroma.id, customerId: aromaCustomers[1].rows[0].id, branchId: aromaBranches[1].rows[0].id, invoice: 'INV-1002', amount: 450, points: 120 },
    { tenantId: brewCo.id, customerId: brewCustomers[0].rows[0].id, branchId: brewBranches[0].rows[0].id, invoice: 'INV-2001', amount: 320, points: 75 },
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

  console.log('');
  console.log('🎉 Seed complete!');
  console.log('');
  console.log('📋 Admin logins (password: admin123):');
  console.log('   admin@aroma.com  — أروما كافيه');
  console.log('   admin@brewco.com — برو أند كو');
  console.log('   admin@yasmeen.com — حلويات الياسمين');
  console.log('   superadmin@mo2.com — Super Admin (all tenants)');
  console.log('');
  console.log('📱 Customer test phones: 01000000001 through 01000000009');
  console.log('   (OTP will be logged to console in dev mode)');

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
