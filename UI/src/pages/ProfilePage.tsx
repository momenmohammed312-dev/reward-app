// src/pages/ProfilePage.tsx

import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardBody } from '../components/ui/Card';
import { User, SignOut, Phone, Calendar, Envelope, PencilSimple, Gear, Translate } from '@phosphor-icons/react';
import { formatEgyptianPhoneForDisplay } from '../utils/validators';

interface ProfilePageProps {
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

const tierStyles: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700',
  Bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-slate-200 text-slate-700',
  Silver: 'bg-slate-200 text-slate-700',
  gold: 'bg-yellow-100 text-yellow-700',
  Gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-cyan-100 text-cyan-700',
  Platinum: 'bg-cyan-100 text-cyan-700',
  'العادي': 'bg-amber-100 text-amber-700',
  'الذهبي': 'bg-yellow-100 text-yellow-700',
  'البلاتيني': 'bg-cyan-100 text-cyan-700',
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ onShowToast }) => {
  const { user, logout, updateProfileName, language, setLanguage, t } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const tierStyle = tierStyles[user?.loyaltyTier || 'Bronze'] || 'bg-amber-100 text-amber-700';

  if (loading) {
    return (
      <div className="flex flex-col gap-[var(--space-5)] animate-pulse">
        <div className="h-3 w-24 bg-[var(--color-border)] rounded" />
        <div className="h-28 bg-[var(--color-border)] rounded-[var(--radius-lg)]" />
        <div className="h-64 bg-[var(--color-border)] rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast(t('profile.nameRequired'), 'error');
      return;
    }
    
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    updateProfileName(name.trim());
    setEditing(false);
    setSaving(false);
    onShowToast(t('profile.saveSuccess'), 'success');
  };

  return (
    <div className="flex flex-col gap-[var(--space-5)] text-right pb-[var(--space-10)] font-body">
      {/* Page header */}
      <div className="flex flex-col gap-0.5 select-none text-right">
        <h1 className="text-[24px] font-extrabold text-[var(--color-text)]">
          {t('profile.title')}
        </h1>
        <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
          {t('profile.subtitle')}
        </p>
      </div>

      {/* Visual profile cover branding banner */}
      <div className="relative h-28 rounded-[var(--radius-lg)] overflow-hidden select-none shadow-sm flex items-end">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://picsum.photos/seed/cafe-cover/500/200")' }}
        />
        <div className="absolute inset-0 bg-slate-950/60 z-10" />

        {/* User initials inside ring inside banner bottom */}
        <div className="relative z-20 flex px-4 pb-3 items-center gap-3 w-full justify-start text-white">
          <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] border-2 border-white flex justify-center items-center font-bold text-center text-white shrink-0 shadow-md">
            {user?.name ? user.name.slice(0, 2) : 'أع'}
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[var(--text-md)] font-bold">{user?.name || 'أحمد عبد الله'}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tierStyle}`}>
                {user?.loyaltyTier || 'العادي'}
              </span>
              <span className="text-[9px] text-white/80">{t('profile.memberSince')} {user?.joinDate || '٢٠٢٤/١٢/١٥'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main card representation */}
      <Card className="border border-[var(--color-border)] shadow-[var(--shadow-card)]">
        <CardBody className="p-[var(--space-5)] flex flex-col gap-[var(--space-4)]">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 text-[var(--text-sm)] font-bold text-[var(--color-text)]">
              <Gear size={15} className="text-[var(--color-primary)] shrink-0" />
              <span>{t('profile.settings')}</span>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-[var(--text-xs)] font-bold text-[var(--color-primary)] flex items-center gap-1 cursor-pointer"
              >
                <PencilSimple size={12} />
                <span>{t('profile.edit')}</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-[var(--space-4)]">
            {editing ? (
              <>
                <Input
                  label={t('profile.nameLabel')}
                  type="text"
                  placeholder={t('profile.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  icon={<User size={16} />}
                />
                
                <div className="flex flex-col gap-2 w-full pt-1.5">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    className="w-full py-2.5 text-[var(--text-sm)] font-bold"
                  >
                    {t('profile.save')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setName(user?.name || '');
                      setEditing(false);
                    }}
                    disabled={saving}
                    className="w-full py-2 text-[var(--text-xs)] font-bold border-[var(--color-border)] text-[var(--color-text-muted)]"
                  >
                    {t('profile.cancel')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3.5 select-all mt-1 pr-1 font-sans">
                {/* Full name detail row */}
                <div className="flex items-center gap-4 text-right">
                  <User size={16} className="text-[var(--color-text-muted)] shrink-0" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[11px] text-[var(--color-text-light)]">{t('profile.nameLabel')}</span>
                    <span className="text-[var(--text-sm)] font-bold text-[var(--color-text)] mt-0.5">
                      {user?.name || 'أحمد عبد الله'}
                    </span>
                  </div>
                </div>

                {/* Secure Egyptian Phone row */}
                <div className="flex items-center gap-4 text-right">
                  <Phone size={16} className="text-[var(--color-text-muted)] shrink-0" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[11px] text-[var(--color-text-light)]">{t('profile.phoneLabel')}</span>
                    <span className="text-[var(--text-sm)] font-bold text-[var(--color-text)] mt-0.5 number tracking-wide">
                      {user?.phone ? formatEgyptianPhoneForDisplay(user.phone) : '01012345678'}
                    </span>
                    <span className="text-[9px] text-[var(--color-text-light)] opacity-75 mt-0.5">
                      {t('profile.phoneHint')}
                    </span>
                  </div>
                </div>

                {/* Email row (only if user.email exists) */}
                {user?.email && (
                  <div className="flex items-center gap-4 text-right">
                    <Envelope size={16} className="text-[var(--color-text-muted)] shrink-0" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-[11px] text-[var(--color-text-light)]">{t('profile.email')}</span>
                      <span className="text-[var(--text-sm)] font-semibold text-[var(--color-text)] mt-0.5 font-mono">
                        {user.email}
                      </span>
                    </div>
                  </div>
                )}

                {/* Join level row */}
                <div className="flex items-center gap-4 text-right">
                  <Calendar size={16} className="text-[var(--color-text-muted)] shrink-0" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[11px] text-[var(--color-text-light)]">{t('profile.joinDate')}</span>
                    <span className="text-[var(--text-sm)] font-bold text-[var(--color-text)] mt-0.5">
                      {user?.joinDate || '٢٠٢٤/١٢/١٥'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </CardBody>
      </Card>

      {/* Language Toggle */}
      <button
        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] font-bold text-xs hover:bg-[var(--color-bg)] transition-all cursor-pointer"
      >
        <Translate size={16} />
        <span>{t('profile.switchLang')}</span>
      </button>

      {/* Logout button */}
      <Button 
        variant="ghost" 
        size="md" 
        onClick={logout}
        className="text-[var(--color-danger)] border-[rgba(220,38,38,0.2)] hover:bg-red-50 text-[var(--text-xs)] font-bold py-3 text-center flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        <SignOut size={16} />
        <span>{t('profile.logout')}</span>
      </Button>

      {/* MO2 Footer */}
      <div className="text-center pt-4 pb-2 select-none">
        <span className="text-[9px] tracking-widest uppercase font-semibold text-[var(--color-text-light)] opacity-40">
          Developed by MO2 © 2026
        </span>
      </div>
    </div>
  );
};
export default ProfilePage;
