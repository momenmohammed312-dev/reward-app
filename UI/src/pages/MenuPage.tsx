import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';
import { Coffee, Drop, Hamburger, Cake, Star, CurrencyCircleDollar, Info, ShoppingBag } from '@phosphor-icons/react';
import { BottomSheet } from '../components/ui/BottomSheet';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  endsAt?: string | null;
  category: string;
  image?: string;
  popular?: boolean;
}

const menuItems: MenuItem[] = [
  { id: 'm1', name: 'فلات وايت', description: 'اسبريسو مزدوج مع حليب مبخر, كثيف وناعم', price: 45, category: 'مشروبات ساخنة', image: 'https://picsum.photos/seed/flat-white/400/300', popular: true },
  { id: 'm2', name: 'كابتشينو كلاسيك', description: 'اسبريسو مع حليب ورغوة كثيفة, مثلجة أو ساخنة', price: 38, category: 'مشروبات ساخنة', image: 'https://picsum.photos/seed/cappuccino/400/300', popular: true },
  { id: 'm3', name: 'لاتيه مثلج', description: 'حليب بارد مع اسبريسو طازج وثلج', price: 42, category: 'مشروبات باردة', image: 'https://picsum.photos/seed/iced-latte/400/300' },
  { id: 'm4', name: 'موهيتو توت', description: 'مشروب غازي منعش بنكهة التوت والنعنع', price: 35, category: 'مشروبات باردة', image: 'https://picsum.photos/seed/mojito/400/300' },
  { id: 'm5', name: 'كرواسون زبدة', description: 'معجنات فرنسية هشة محشوة بالزبدة البلجيكية', price: 28, category: 'مخبوزات', image: 'https://picsum.photos/seed/croissant/400/300', popular: true },
  { id: 'm6', name: 'تشيز كيك توت', description: 'شريحة تشيز كيك منزلية مع صوص التوت الطازج', price: 55, category: 'حلويات', image: 'https://picsum.photos/seed/cheesecake/400/300' },
  { id: 'm7', name: 'سانتوتشي دجاج', description: 'خبز توست محمص مع دجاج مشوي وخضار طازجة', price: 62, category: 'وجبات خفيفة', image: 'https://picsum.photos/seed/sandwich/400/300' },
  { id: 'm8', name: 'سبانش لاتيه', description: 'حليب مكثف مع اسبريسو وقليل من القرفة', price: 48, category: 'مشروبات ساخنة', image: 'https://picsum.photos/seed/spanish-latte/400/300' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 20 } },
};

const supermarketOfferItems: MenuItem[] = [
  { id: 's1', name: 'باقة الألبان الأسبوعية', description: 'حليب طازج + زبادي + جبنة بيضاء بخصم فوري ونقاط مضاعفة', price: 185, category: 'ألبان وطازج', image: 'https://picsum.photos/seed/dairy-pack/400/300', popular: true },
  { id: 's2', name: 'سلة أساسيات المطبخ', description: 'أرز 5 كجم + مكرونة + زيت طعام 1 لتر + صلصة طماطم', price: 420, category: 'بقالة', image: 'https://picsum.photos/seed/grocery-basket/400/300', popular: true },
  { id: 's3', name: 'عرض المنظفات العائلي', description: 'مسحوق غسيل أوتوماتيك + سائل أطباق + مطهر أرضيات', price: 310, category: 'منظفات', image: 'https://picsum.photos/seed/detergents/400/300' },
  { id: 's4', name: 'مخبوزات طازجة يومياً', description: 'توست حبوب كاملة + عيش فينو + كرواسون عائلي', price: 95, category: 'مخبوزات', image: 'https://picsum.photos/seed/fresh-bakery/400/300', popular: true },
];

const categoryIcons: Record<string, React.ReactNode> = {
  'مشروبات ساخنة': <Coffee size={15} weight="regular" />,
  'مشروبات باردة': <Drop size={15} weight="regular" />,
  'مخبوزات': <Hamburger size={15} weight="regular" />,
  'حلويات': <Cake size={15} weight="regular" />,
  'وجبات خفيفة': <Hamburger size={15} weight="regular" />,
  'ألبان وطازج': <ShoppingBag size={15} weight="regular" />,
  'بقالة': <ShoppingBag size={15} weight="regular" />,
  'منظفات': <Drop size={15} weight="regular" />,
};

export const MenuPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [liveOffers, setLiveOffers] = useState<MenuItem[] | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const { points, currentTenant, language, t } = useApp();

  const isRetailStore =
    currentTenant.businessType === 'supermarket' || currentTenant.businessType === 'retail';
  const fallbackItems = isRetailStore ? supermarketOfferItems : menuItems;
  const activeItems = liveOffers && liveOffers.length > 0 ? liveOffers : fallbackItems;
  const activeCategories = Array.from(new Set(activeItems.map((i) => i.category)));
  const pointsRate = currentTenant.pointsPerEgp ?? (isRetailStore ? 0.2 : 1);

  useEffect(() => {
    setActiveCategory('all');
    let cancelled = false;
    setLoading(true);
    api.getPublicOffers(currentTenant.id)
      .then((rows) => {
        if (cancelled) return;
        if (Array.isArray(rows) && rows.length > 0) {
          setLiveOffers(
            rows.map((r: any) => ({
              id: r.id,
              name: r.title,
              description: r.description || '',
              price: Number(r.offer_price),
              originalPrice: r.original_price ? Number(r.original_price) : null,
              endsAt: r.ends_at || null,
              category: r.category || 'بقالة',
              image: r.image_url || 'https://picsum.photos/seed/grocery-basket/400/300',
              popular: Boolean(r.is_popular),
            }))
          );
        } else {
          setLiveOffers(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveOffers(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentTenant.id]);

  const filtered = activeCategory === 'all'
    ? activeItems
    : activeItems.filter(i => i.category === activeCategory);

  if (loading) {
    return (
      <div className="flex flex-col gap-[var(--space-5)] animate-pulse">
        <div className="h-3 w-28 bg-[var(--color-border)] rounded" />
        <div className="h-8 w-36 bg-[var(--color-border)] rounded-lg" />
        <div className="flex gap-2">
          <div className="h-8 w-14 bg-[var(--color-border)] rounded-full" />
          <div className="h-8 w-24 bg-[var(--color-border)] rounded-full" />
          <div className="h-8 w-20 bg-[var(--color-border)] rounded-full" />
        </div>
        <div className="h-28 bg-[var(--color-border)] rounded-[var(--radius-lg)]" />
        <div className="h-28 bg-[var(--color-border)] rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-[var(--space-5)] text-right"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1 select-none">
        <h1 className="text-[24px] font-extrabold text-[var(--color-text)] tracking-tight leading-tight">
          {isRetailStore ? t('offers.title') : t('menu.title')}
        </h1>
        <p className="text-[13px] font-medium text-[var(--color-text-muted)]">
          {isRetailStore ? t('offers.subtitle') : t('menu.subtitle')}
        </p>
      </motion.div>

      {/* Points badge */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 bg-[var(--color-primary-soft)] rounded-xl px-[var(--space-3)] py-[var(--space-2)] self-start">
        <CurrencyCircleDollar size={16} weight="regular" className="text-[var(--color-primary)]" />
        <span className="text-[12px] font-bold text-[var(--color-text)]">
          {t('menu.yourPoints')} <span className="number text-[var(--color-primary)]">{points.toLocaleString()}</span>
        </span>
      </motion.div>

      {/* Category filters */}
      <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-2 scrollbar-none justify-start select-none" style={{ direction: 'rtl' }}>
        <button
          onClick={() => setActiveCategory('all')}
          className={`py-1.5 px-3.5 rounded-full text-[var(--text-xs)] font-bold cursor-pointer transition-all shrink-0 border flex items-center gap-1.5 ${
            activeCategory === 'all'
              ? 'bg-[var(--color-primary)] text-white border-transparent shadow-sm'
              : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-bg)]'
          }`}
        >
          {t('menu.all')}
        </button>
        {activeCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`py-1.5 px-3.5 rounded-full text-[var(--text-xs)] font-bold cursor-pointer transition-all shrink-0 border flex items-center gap-1.5 ${
              activeCategory === cat
                ? 'bg-[var(--color-primary)] text-white border-transparent shadow-sm'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-bg)]'
            }`}
          >
            {categoryIcons[cat] || null}
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Menu Grid */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 gap-[var(--space-4)] pb-[var(--space-10)]">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <motion.div key={item.id} variants={itemVariants} layout>
              <div onClick={() => setSelectedItem(item)} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[22px] p-2 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200 group cursor-pointer">
                <div className="flex gap-3">
                  {/* Outer rounded-[22px] - p-2 (8px) = Inner rounded-[14px] */}
                  <div className="w-24 h-24 rounded-[14px] shrink-0 overflow-hidden bg-[var(--color-bg)]">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover outline-1 -outline-offset-1 outline-black/10 group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 py-1 pl-1 flex flex-col justify-between min-w-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--text-sm)] font-black text-[var(--color-text)] leading-tight truncate">
                          {item.name}
                        </span>
                        {item.popular && (
                          <Star size={12} weight="fill" className="text-[var(--color-accent)] shrink-0" />
                        )}
                      </div>
                      <p className="text-[12px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                        {item.category}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-[11px] line-through text-[var(--color-text-muted)] number">
                            {item.originalPrice}
                          </span>
                        )}
                        <span className="text-[var(--text-md)] font-black text-[var(--color-primary)] number">
                          {item.price} {language === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-16 text-center text-[var(--color-text-light)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] flex flex-col items-center gap-2">
            <Info size={36} className="text-slate-300" />
            <span className="text-[var(--text-sm)] font-bold">{t('menu.empty')}</span>
            <span className="text-[11px] text-[var(--color-text-muted)]">{t('menu.emptyHint')}</span>
          </div>
        )}
      </motion.div>

      {/* Item Detail BottomSheet */}
      <BottomSheet
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name || ''}
      >
        {selectedItem && (
          <div className="flex flex-col gap-[var(--space-4)]">
            <div className="w-full h-44 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg)]">
              <img
                src={selectedItem.image}
                alt={selectedItem.name}
                className="w-full h-full object-cover outline-1 -outline-offset-1 outline-black/10"
              />
            </div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-[var(--color-text-muted)] bg-[var(--color-bg)] px-2.5 py-0.5 rounded-lg self-start">
                  {selectedItem.category}
                </span>
                <h3 className="text-[var(--text-lg)] font-black text-[var(--color-text)] leading-tight">
                  {selectedItem.name}
                </h3>
              </div>
              <div className="text-left">
                <span className="text-xl font-black text-[var(--color-primary)] number">
                  {selectedItem.price} {language === 'ar' ? 'ج.م' : 'EGP'}
                </span>
              </div>
            </div>
            <p className="text-[var(--text-sm)] text-[var(--color-text-muted)] leading-relaxed">
              {selectedItem.description}
            </p>
            <div className="bg-[var(--color-primary-soft)] rounded-[var(--radius-md)] p-[var(--space-3)] flex items-center gap-3">
              <ShoppingBag size={20} weight="regular" className="text-[var(--color-primary)] shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-[var(--color-text)]">
                  {t('menu.youEarn', { points: Math.floor(selectedItem.price * pointsRate) })}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{t('menu.whenBuy')}</p>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </motion.div>
  );
};

export default MenuPage;
