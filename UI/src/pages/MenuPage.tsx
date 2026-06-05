import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../store/AppContext';
import { Coffee, Drop, Hamburger, Cake, Star, CurrencyCircleDollar } from '@phosphor-icons/react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
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

const categories = Array.from(new Set(menuItems.map(i => i.category)));

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } },
};

const categoryIcons: Record<string, React.ReactNode> = {
  'مشروبات ساخنة': <Coffee size={16} weight="duotone" />,
  'مشروبات باردة': <Drop size={16} weight="duotone" />,
  'مخبوزات': <Hamburger size={16} weight="duotone" />,
  'حلويات': <Cake size={16} weight="duotone" />,
  'وجبات خفيفة': <Hamburger size={16} weight="duotone" />,
};

export const MenuPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { points } = useApp();

  const filtered = activeCategory === 'all'
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-[var(--space-5)] text-right"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-0.5 select-none">
        <h1 className="text-[var(--text-2xl)] font-black text-[var(--color-text)] tracking-tight leading-none">
          قائمة المشروبات
        </h1>
        <p className="text-[10px] tracking-widest font-bold text-[var(--color-text-light)] uppercase">
          Menu & Offerings
        </p>
      </motion.div>

      {/* Points badge */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 bg-[var(--color-primary-soft)] rounded-xl px-[var(--space-3)] py-[var(--space-2)] self-start">
        <CurrencyCircleDollar size={16} weight="duotone" className="text-[var(--color-primary)]" />
        <span className="text-[11px] font-bold text-[var(--color-text)]">
          رصيد نقاطك: <span className="number text-[var(--color-primary)]">{points.toLocaleString()}</span>
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
          الكل
        </button>
        {categories.map(cat => (
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
        {filtered.map(item => (
          <motion.div key={item.id} variants={itemVariants} layout>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-md)] transition-all group">
              <div className="flex">
                {/* Image */}
                <div className="w-28 h-28 shrink-0 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover brightness-95 group-hover:brightness-100 transition-all duration-300"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 p-[var(--space-3)] flex flex-col justify-between min-w-0">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-sm)] font-black text-[var(--color-text)] leading-tight truncate">
                        {item.name}
                      </span>
                      {item.popular && (
                        <Star size={12} weight="fill" className="text-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-bold text-[var(--color-text-light)] bg-[var(--color-bg)] px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    <span className="text-[var(--text-md)] font-black text-[var(--color-primary)] number">
                      {item.price} EGP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default MenuPage;
