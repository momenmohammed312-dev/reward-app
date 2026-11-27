// src/services/mockData.ts

import { Tenant, Reward, Transaction } from '../types';

export const mockTenants: Tenant[] = [
  {
    id: 'mo2-loyalty',
    name: 'MO2 Loyalty',
    tagline: 'برنامج الولاء الذكي للعلامات والمقاهي',
    logo: 'https://picsum.photos/seed/mo2loyaltylogo/160',
    coverImage: 'https://picsum.photos/seed/mo2loyaltycover/600/300',
    primaryColor: '#6b4a35', // Cafe Espresso Brown
    primaryColorSoft: 'rgba(107, 74, 53, 0.10)',
    accentColor: '#d99b52', // Warm Caramel Gold
    accentColorSoft: 'rgba(217, 155, 82, 0.14)',
    bgColor: '#f7f7f5',
    surfaceColor: '#ffffff',
    fontDisplay: 'Rubik',
    fontBody: 'Rubik',
  },
  {
    id: 'brew-co',
    name: 'برو أند كو',
    tagline: 'مذاق القهوة الغني الذي تستحقه يومياً',
    logo: 'https://picsum.photos/seed/brewcologo/160',
    coverImage: 'https://picsum.photos/seed/brewcocover/600/300',
    primaryColor: '#78350f', // Espresso wood brown
    primaryColorSoft: 'rgba(120, 53, 15, 0.08)',
    accentColor: '#c2410c', // Cinnamon orange
    accentColorSoft: 'rgba(194, 65, 12, 0.08)',
    bgColor: '#fafaf9',
    surfaceColor: '#ffffff',
    fontDisplay: 'Rubik',
    fontBody: 'Rubik',
  },
  {
    id: 'yasmeen',
    name: 'مخبز وحلويات الياسمين',
    tagline: 'من الفرن إليك.. حب في كل قطعة',
    logo: 'https://picsum.photos/seed/yasmeenlogo/160',
    coverImage: 'https://picsum.photos/seed/yasmeencover/600/300',
    primaryColor: '#065f46', // Matcha Gold Green
    primaryColorSoft: 'rgba(6, 95, 70, 0.08)',
    accentColor: '#db2777', // Rose berry pink
    accentColorSoft: 'rgba(219, 39, 119, 0.08)',
    bgColor: '#f0fdf4',
    surfaceColor: '#ffffff',
    fontDisplay: 'Rubik',
    fontBody: 'Rubik',
  },
  {
    id: 'albaraka-market',
    name: 'البركة ماركت',
    tagline: 'كل احتياجات بيتك.. ونقاط كاش باك على كل فاتورة',
    logo: 'https://picsum.photos/seed/albarakamarket/160',
    coverImage: 'https://picsum.photos/seed/albarakacover/600/300',
    primaryColor: '#047857',
    primaryColorSoft: 'rgba(4, 120, 87, 0.10)',
    accentColor: '#f59e0b',
    accentColorSoft: 'rgba(245, 158, 11, 0.14)',
    bgColor: '#f0fdf4',
    surfaceColor: '#ffffff',
    fontDisplay: 'Rubik',
    fontBody: 'Rubik',
    businessType: 'supermarket',
    codePrefix: 'MKT',
    showMenu: false,
    pointsPerEgp: 0.2,
    minPurchaseEgp: 50,
  }
];

export const mockRewards: Record<string, Reward[]> = {
  'mo2-loyalty': [
    {
      id: 'ar_r1',
      title: 'كوب كابتشينو مجاني',
      description: 'كوب قهوة كابتشينو غني برغوة الحليب الدافئة والشوكولاتة البلجيكية.',
      pointsRequired: 80,
      imageUrl: 'https://picsum.photos/seed/cappuccino/300/200',
      category: 'مشروبات ساخنة',
      terms: 'صالح لجميع المقاسات. لا يمكن دمجه مع العروض الأخرى.',
      expiryDays: 7
    },
    {
      id: 'ar_r2',
      title: 'كرواسون زبدة فرنسي',
      description: 'كرواسون طازج مخبوز بزبدة فرنسية فاخرة ومحشو بالهندباء حسب رغبتك.',
      pointsRequired: 120,
      imageUrl: 'https://picsum.photos/seed/croissant/300/200',
      category: 'مخبوزات',
      terms: 'متاح للاستلام والطلب داخل الفرع حتى نفاد الكمية اليومية.',
      expiryDays: 5
    },
    {
      id: 'ar_r3',
      title: 'كعكة فستق بلجيكية',
      description: 'قطعة تارت فستق فاخرة محشوة بكريم زبدة الفستق مع الشوكولاتة البيضاء.',
      pointsRequired: 250,
      imageUrl: 'https://picsum.photos/seed/pistachiocake/300/200',
      category: 'حلويات',
      terms: 'صالحة للاستخدام الداخلي فقط. تتطلب طلباً مسبقاً بنصف ساعة.',
      expiryDays: 10
    },
    {
      id: 'ar_r4',
      title: 'بوكس سبيشالتي هدايا',
      description: 'صندوق فخم يحتوي على ربع كيلو بن كولومبي فاخر مع كوب زجاجي مطفي.',
      pointsRequired: 500,
      imageUrl: 'https://picsum.photos/seed/giftbox/300/200',
      category: 'منتجات',
      terms: 'التوصيل مجاني أو الاستلام من أقرب فرع خلال يوم عمل.',
      expiryDays: 30
    }
  ],
  'brew-co': [
    {
      id: 'bc_r1',
      title: 'جراند إسبريسو سنغل',
      description: 'كوب إسبريسو مزدوج مستخلص بمزيج القهوة الخاص بنا مع طبقة كريمة مذهلة.',
      pointsRequired: 50,
      imageUrl: 'https://picsum.photos/seed/espresso/300/200',
      category: 'قهوة كلاسيكية',
      terms: 'لا يشمل الإضافات كشربات الفانيلا وبدائل الحليب الأخرى.',
      expiryDays: 3
    },
    {
      id: 'bc_r2',
      title: 'تورتيليني السلمون المدخن',
      description: 'قطعة ساندوتش خفيف من الخبز البري المحشو بسلمون مدخن وجبنة ريكوتا ناعمة.',
      pointsRequired: 180,
      imageUrl: 'https://picsum.photos/seed/salmonclb/300/200',
      category: 'كلوب ساندوتش',
      terms: 'متوفر يومياً للغذاء والطلب من الساعة ١١ صباحاً.',
      expiryDays: 7
    },
    {
      id: 'bc_r3',
      title: 'دونات دبل شوكلت',
      description: 'دونات طازجة مغطاة بجناش الشوكولاتة الداكنة الفاخرة ورقائق الكاكاو.',
      pointsRequired: 90,
      imageUrl: 'https://picsum.photos/seed/donut/300/200',
      category: 'حلويات',
      terms: 'صالحة للاستلام الفوري من المعروض.',
      expiryDays: 5
    }
  ],
  yasmeen: [
    {
      id: 'ys_r1',
      title: 'علبة بيتفور الياسمين',
      description: 'ربع كيلو بيتفور منوع بالزبدة الطبيعية والمستكة الفاخرة مع شوكولاتة البندق.',
      pointsRequired: 150,
      imageUrl: 'https://picsum.photos/seed/petitsfours/300/200',
      category: 'نواعم العيد',
      terms: 'متوفر طوال الأسبوع. يرجى طلب النكهة المفضلة للكاشير.',
      expiryDays: 14
    },
    {
      id: 'ys_r2',
      title: 'توست بريد بالحبوب الكاملة',
      description: 'رغيف خبز التوست الألماني الغني ببذور الكتان والشوفان والحبوب السبعة.',
      pointsRequired: 80,
      imageUrl: 'https://picsum.photos/seed/toastbread/300/200',
      category: 'مخبوزات',
      terms: 'مخبوز طازج يومياً. يفضل استهلاكه خلال ثلاثة أيام.',
      expiryDays: 4
    },
    {
      id: 'ys_r3',
      title: 'كيكة أعياد خاصة',
      description: 'كيكة اسفنجية بطبقتين من الكريمة الطبيعية لتكفي حتى ٨ أشخاص مع تخصيص الاسم مجاناً.',
      pointsRequired: 600,
      imageUrl: 'https://picsum.photos/seed/birthdaycake/300/200',
      category: 'مناسبات',
      terms: 'تتطلب الحجز بحد أدنى ٢٤ ساعة مسبقاً من تطبيق الفرع أو الاتصال.',
      expiryDays: 45
    }
  ],
  'albaraka-market': [
    {
      id: 'mkt_r1',
      title: 'قسيمة خصم 25 ج.م',
      description: 'خصم فوري 25 جنيه على فاتورة مشترياتك في السوبر ماركت.',
      pointsRequired: 150,
      imageUrl: 'https://picsum.photos/seed/voucher25/300/200',
      category: 'قسائم خصم',
      terms: 'بحد أدنى 200 ج.م للفاتورة. صالحة في جميع الفروع.',
      expiryDays: 14,
      rewardType: 'discount_fixed',
      discountValue: 25,
      minOrderEgp: 200,
    },
    {
      id: 'mkt_r2',
      title: 'قسيمة خصم 50 ج.م',
      description: 'خصم مباشر 50 جنيه على إجمالي سلة المشتريات.',
      pointsRequired: 300,
      imageUrl: 'https://picsum.photos/seed/voucher50/300/200',
      category: 'قسائم خصم',
      terms: 'بحد أدنى 400 ج.م للفاتورة.',
      expiryDays: 30,
      rewardType: 'discount_fixed',
      discountValue: 50,
      minOrderEgp: 400,
    },
    {
      id: 'mkt_r3',
      title: 'خصم 10% على الفاتورة',
      description: 'خصم 10% على مشتريات البقالة والألبان والمنظفات.',
      pointsRequired: 400,
      imageUrl: 'https://picsum.photos/seed/discount10/300/200',
      category: 'قسائم خصم',
      terms: 'بحد أدنى 300 ج.م (لا يشمل السجائر وكروت الشحن).',
      expiryDays: 14,
      rewardType: 'discount_percent',
      discountValue: 10,
      minOrderEgp: 300,
    },
    {
      id: 'mkt_r4',
      title: 'زجاجة زيت طعام 1 لتر مجاناً',
      description: 'هدية مجانية من قسم البقالة عند الاستلام من الكاشير.',
      pointsRequired: 220,
      imageUrl: 'https://picsum.photos/seed/cookingoil/300/200',
      category: 'بقالة',
      terms: 'حسب التوفر في الفرع.',
      expiryDays: 7,
      rewardType: 'free_item',
    }
  ]
};

export const mockTransactions: Record<string, Transaction[]> = {
  'mo2-loyalty': [
    {
      id: 'tx_ar1',
      date: '2026-05-20T14:22:00Z',
      points: 45,
      type: 'earn',
      description: 'شراء قهوة إسبريسو وكرواسون بالجبنة',
      amount: 190,
      invoiceNumber: 'INV-4929A'
    },
    {
      id: 'tx_ar2',
      date: '2026-05-18T09:15:00Z',
      points: 80,
      type: 'redeem',
      description: 'استبدال كوب كابوتشينو مجاني',
      invoiceNumber: 'RDM-8822B'
    },
    {
      id: 'tx_ar3',
      date: '2026-05-15T19:40:00Z',
      points: 120,
      type: 'earn',
      description: 'شراء كعكة فستق بلجيكية وطلب تيك أواي',
      amount: 450,
      invoiceNumber: 'INV-4122C'
    },
    {
      id: 'tx_ar4',
      date: '2026-05-10T12:00:00Z',
      points: 35,
      type: 'earn',
      description: 'شراء آيس سبانش لاتيه',
      amount: 140,
      invoiceNumber: 'INV-3092D'
    }
  ],
  'brew-co': [
    {
      id: 'tx_bc1',
      date: '2026-05-22T10:00:00Z',
      points: 75,
      type: 'earn',
      description: 'شراء كوبين جراند لاتيه وتارت التفاح',
      amount: 320,
      invoiceNumber: 'BC-11009'
    },
    {
      id: 'tx_bc2',
      date: '2026-05-12T08:30:00Z',
      points: 50,
      type: 'redeem',
      description: 'استرداد جراند إسبريسو مجاني',
      invoiceNumber: 'BC-RDM-12'
    }
  ],
  yasmeen: [
    {
      id: 'tx_ys1',
      date: '2026-05-24T10:00:00Z',
      points: 150,
      type: 'earn',
      description: 'شراء علبتين كحك بالعجوة والملبن الفاخر',
      amount: 600,
      invoiceNumber: 'YS-89201'
    },
    {
      id: 'tx_ys2',
      date: '2026-05-19T16:15:00Z',
      points: 40,
      type: 'earn',
      description: 'شراء خبز بالبذور الكاملة وتوست حلو',
      amount: 160,
      invoiceNumber: 'YS-81200'
    }
  ],
  'albaraka-market': [
    {
      id: 'tx_mkt1',
      date: '2026-05-24T17:40:00Z',
      points: 170,
      type: 'earn',
      description: 'فاتورة مشتريات بقالة وألبان (#MKT-9012)',
      amount: 850,
      invoiceNumber: 'MKT-9012'
    },
    {
      id: 'tx_mkt2',
      date: '2026-05-18T14:10:00Z',
      points: 150,
      type: 'redeem',
      description: 'استبدال قسيمة خصم 25 ج.م',
      invoiceNumber: 'MKT-RDM-25'
    }
  ]
};
