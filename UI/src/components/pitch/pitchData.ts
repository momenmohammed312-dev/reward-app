export type PitchLang = 'ar' | 'en';
export type PitchConceptId = 1 | 2 | 3;
export type PhoneDemoTab = 'pass' | 'menu' | 'ticket' | 'history';

export function getBrandDisplay(clientName: string, _lang: PitchLang): string {
  const cleaned = clientName.trim();
  return cleaned.length > 0 ? cleaned : 'MO2 Loyalty';
}

export function slugifyBrand(clientName: string): string {
  const ascii = clientName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || 'mo2-loyalty';
}

export interface LoopStep {
  num: string;
  key: PhoneDemoTab;
  title: { ar: string; en: string };
  badge: { ar: string; en: string };
  summary: { ar: string; en: string };
}

export const LOYALTY_LOOP_STEPS: LoopStep[] = [
  {
    num: '01',
    key: 'pass',
    title: {
      ar: 'امسح QR وادخل ببطاقة العضوية',
      en: 'Scan Table QR & Member Pass',
    },
    badge: { ar: '8 ثوانٍ بدون تطبيق', en: '8 sec · Zero App Download' },
    summary: {
      ar: 'العميل يمسح QR الطاولة أو الكاونتر، يدخل برقمه والـ OTP، وتصبح بطاقته جاهزة على المتصفح وتُقلب بالـ 3D لكود الكاشير.',
      en: 'Guests scan a table or counter QR, verify once by phone OTP, and unlock a 3D-flip Member Pass right inside their mobile browser.',
    },
  },
  {
    num: '02',
    key: 'menu',
    title: {
      ar: 'منيو تفاعلي بصور اختيارية لكل منتج',
      en: 'Interactive Menu with Optional Photos',
    },
    badge: { ar: 'نقاط لكل مشروب وحلى', en: 'Per-Item Points Preview' },
    summary: {
      ar: 'يتصفح العميل مشروباتك ومنتجاتك مع السعر والنقاط المكتسبة، وتتحكم أنت من لوحة الإدارة في رفع صور للمنتجات أو الاكتفاء بأيقونات أنيقة.',
      en: 'Guests browse your menu with exact EGP pricing and earned points, while you choose in Admin whether each item shows a studio photo or clean icon.',
    },
  },
  {
    num: '03',
    key: 'ticket',
    title: {
      ar: 'تذكرة استبدال غير قابلة للتكرار',
      en: 'One-Tap Anti-Fraud Voucher Ticket',
    },
    badge: { ar: 'صرف في 5 ثوانٍ', en: '5 sec Cashier Redeem' },
    summary: {
      ar: 'بمجرد وصول العميل للنقاط المطلوبة يطلب هديته ليظهر كود مميز (MO2-884210) يعتمد الكاشير صرفه مرة واحدة فقط بلا تلاعب.',
      en: 'When balance hits a reward threshold, the guest unlocks a single-use voucher code (MO2-884210) redeemed in 5 seconds at checkout.',
    },
  },
  {
    num: '04',
    key: 'history',
    title: {
      ar: 'سجل شفاف بكل فاتورة وصنف',
      en: 'Transparent Itemized Wallet Ledger',
    },
    badge: { ar: 'ثقة كاملة بالرصيد', en: 'Itemized Receipt Clarity' },
    summary: {
      ar: 'كل حركة نقاط (+120 أو -300) محفوظة في دفتر قيود لا يقبل التكرار، ويضغط العميل على أي عملية ليرى الأصناف والفرع والفاتورة.',
      en: 'Every credit and redemption is logged in an idempotent ledger; tapping any row reveals exact items purchased, branch, and invoice ID.',
    },
  },
];

export const OPERATIONS_EXPLAINED = {
  foodicsVsCashier: {
    ar: {
      eyebrow: 'التكامل والتشغيل اليومي',
      headline: 'إزاي السيستم بيشتغل مع Foodics — وإيه لازمة شاشة التاجر والكاشير؟',
      points: [
        {
          title: '1. Foodics POS (اكتساب النقاط أوتوماتيك بدون تعب الكاشير)',
          body: 'بمجرد تسجيل رقم العميل وإغلاق الفاتورة على Foodics، يرسل الكاشير إشعار Webhook تلقائي فتنزل النقاط في محفظة العميل فوراً دون أن يفتح الباريستا أي شاشة إضافية.',
        },
        {
          title: '2. شاشة الكاشير (/cashier) — لصرف الهدايا وتشغيل أي POS آخر',
          body: 'مهمتها الأساسية التحقق الفوري من تذكرة الهدية (MO2-884210) لمنع الصرف المزدوج، كما تُعد بديل تشغيل فوري في نفس اليوم لأي فرع لا يستخدم Foodics أو أثناء انقطاع الربط.',
        },
        {
          title: '3. لوحة التاجر (/admin) — عقل برنامج الولاء بالكامل',
          body: 'من هنا تضبط معادلة النقاط لكل جنيه، تضيف المكافآت وصورها اختيارياً، تطبع QR لكل طاولة، وتتابع ساعات الذروة ومعدل رجوع العملاء — وهي تحليلات وإدارة ولاء لا يوفرها شباك البيع العادي.',
        },
      ],
    },
    en: {
      eyebrow: 'Daily Operations & POS Sync',
      headline: 'How MO2 Works with Foodics — and Why Admin & Cashier Matter',
      points: [
        {
          title: '1. Foodics POS (Automatic Point Accrual with Zero Extra Clicks)',
          body: 'When your cashier attaches the guest phone and closes an order on Foodics, our queued webhook awards points into the customer wallet automatically.',
        },
        {
          title: '2. Cashier Terminal (/cashier) — Secure Reward Verification & Zero-POS Fallback',
          body: 'Used at the till to validate one-time reward codes (MO2-884210) in 5 seconds, and doubles as an instant Day-1 earning terminal if a branch uses another POS.',
        },
        {
          title: '3. Merchant Admin (/admin) — The Loyalty Control Room',
          body: 'Configure points-per-EGP rules, VIP tier multipliers, optional menu/reward photos, table QR standees, and live retention & peak-hour analytics.',
        },
      ],
    },
  },
};

export interface ComparisonRow {
  metric: { ar: string; en: string };
  paper: { ar: string; en: string };
  nativeApp: { ar: string; en: string };
  mo2: { ar: string; en: string };
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    metric: { ar: 'تجربة الزبون في الفرع', en: 'Guest Onboarding Friction' },
    paper: { ar: 'كارت ورق بيضيع ويتنسي', en: 'Paper card gets lost or forgotten' },
    nativeApp: { ar: 'تحميل تطبيق 80MB وتسجيل طويل', en: '80MB App Store download friction' },
    mo2: { ar: 'مسح QR المتصفح في 8 ثوانٍ', en: 'Instant 8-sec browser QR pass' },
  },
  {
    metric: { ar: 'دقة الحسابات ومنع التلاعب', en: 'Fraud & Audit Protection' },
    paper: { ar: 'أختام يدوية بلا أي رقابة', en: 'Zero audit trail on manual stamps' },
    nativeApp: { ar: 'يعتمد على تكلفة صيانة عالية', en: 'High ongoing mobile maintenance' },
    mo2: { ar: 'دفتر قيود محمي + كود يصرف مرة واحدة', en: 'Idempotent ledger + single-use codes' },
  },
  {
    metric: { ar: 'التوافق مع Foodics وباقي الكاشير', en: 'POS Compatibility' },
    paper: { ar: 'منفصل تماماً عن المبيعات', en: 'Completely disconnected from POS' },
    nativeApp: { ar: 'ربط مكلف ويستغرق شهوراً', en: 'Months & heavy integration fees' },
    mo2: { ar: 'ربط Foodics جاهز + شاشة كاشير فورية', en: 'Foodics-ready + instant Cashier web' },
  },
  {
    metric: { ar: 'تحليلات الاحتفاظ وساعات الذروة', en: 'Retention & Peak Insights' },
    paper: { ar: 'غير متوفرة إطلاقاً', en: 'None — blind guesswork' },
    nativeApp: { ar: 'تكلفة بناء لوحة منفصلة', en: 'Requires separate BI build' },
    mo2: { ar: 'لوحة تاجر حية بمعدل العودة والذروة', en: 'Live retention, peak hours & VIP view' },
  },
  {
    metric: { ar: 'التكلفة وزمن الإطلاق في مصر', en: 'Launch Speed & Pricing' },
    paper: { ar: 'مطبوعات متكررة بلا عائد قياس', en: 'Recurring print waste' },
    nativeApp: { ar: '120,000+ ج.م و3 أشهر تطوير', en: '120k+ EGP & 3+ months build' },
    mo2: { ar: 'تشغيل بنفس اليوم · 14 يوم تجربة مجانية', en: 'Same-day launch · 14-day free pilot' },
  },
];

export const PRICING_TIERS = {
  pilot: {
    badge: { ar: 'عرض التأسيس الحصري', en: 'Founding Partner Offer' },
    name: { ar: 'تجربة ميدانية كاملة — 14 يوم مجاناً', en: 'Full 14-Day Free Pilot' },
    price: { ar: '0 ج.م', en: '0 EGP' },
    period: { ar: 'بدون التزام أو رسوم تأسيس', en: 'Zero risk · Zero setup fee' },
    features: {
      ar: [
        'تخصيص الهوية والرابط والألوان باسم كافيهك',
        'شاشة العميل PWA + المنيو + بطاقة الـ 3D QR',
        'تصميم كروت الـ QR للطاولات والكاونتر جاهزة للطباعة',
        'تدريب فريق الكاشير والباريستا ومتابعة النتائج أسبوعياً',
      ],
      en: [
        'Custom branded URL, colors, logo & rewards catalog',
        'Customer PWA wallet + interactive Menu + 3D Member Pass',
        'Print-ready Table & Counter QR standee designs',
        'Live staff onboarding & 14-day retention review',
      ],
    },
  },
  plans: [
    {
      name: 'Starter',
      price: { ar: '950 – 1,200 ج.م', en: '950 – 1,200 EGP' },
      unit: { ar: '/ شهر للفرع الواحد', en: '/ month · 1 branch' },
      highlight: false,
      bullets: {
        ar: [
          'محفظة النقاط الكاملة وتذاكر الاسترداد',
          'شاشة الكاشير الفورية (صرف + إضافة نقاط)',
          'إدارة المكافآت والمنيو مع صور اختيارية',
          'دخول العملاء عبر QR + OTP',
        ],
        en: [
          'Full Points Wallet & single-use Redemption Tickets',
          'Instant Cashier Terminal (Redeem + Manual Earn)',
          'Menu & Rewards Manager with optional photos',
          'Browser QR + OTP customer onboarding',
        ],
      },
    },
    {
      name: 'Growth',
      price: { ar: '1,800 – 2,200 ج.م', en: '1,800 – 2,200 EGP' },
      unit: { ar: '/ شهر حتى 3 فروع', en: '/ month · up to 3 branches' },
      highlight: true,
      bullets: {
        ar: [
          'كل مميزات باقة Starter لـ 3 فروع مترابطة',
          'ربط Foodics POS التلقائي عبر Webhooks',
          'تحليلات الاحتفاظ وساعات الذروة وأفضل العملاء',
          'مستويات VIP متعددة المضاعفات + شبكة فروع',
        ],
        en: [
          'Everything in Starter across up to 3 branches',
          'Automated Foodics POS Webhook integration',
          'Retention rate, peak-hour velocity & VIP insights',
          'Multi-tier VIP multipliers & cross-branch sync',
        ],
      },
    },
  ],
};
