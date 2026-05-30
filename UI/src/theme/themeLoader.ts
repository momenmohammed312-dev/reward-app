// src/theme/themeLoader.ts

export interface TenantConfig {
  brand_name?: string;
  brand_logo?: string;
  primary_color?: string;
  primary_color_soft?: string;
  accent_color?: string;
  accent_color_soft?: string;
  bg_color?: string;
  surface_color?: string;
  font_display?: string;
  font_body?: string;
}

export const applyTenantTheme = (tenantConfig: TenantConfig | null | undefined): void => {
  const root = document.documentElement;
  
  // Default values
  const defaults: Record<string, string> = {
    '--color-primary': '#1e40af',
    '--color-primary-soft': 'rgba(30, 64, 175, 0.08)',
    '--color-accent': '#f59e0b',
    '--color-accent-soft': 'rgba(245, 158, 11, 0.08)',
    '--color-bg': '#f8fafc',
    '--color-surface': '#ffffff',
    '--font-display': "'Playfair Display', serif",
    '--font-body': "'Cairo', sans-serif"
  };

  // First apply defaults
  Object.entries(defaults).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  // Overwrite with tenant values if present
  if (tenantConfig) {
    if (tenantConfig.brand_name) {
      root.style.setProperty('--brand-name', tenantConfig.brand_name);
    }
    if (tenantConfig.brand_logo) {
      root.style.setProperty('--brand-logo', `url(${tenantConfig.brand_logo})`);
    }
    if (tenantConfig.primary_color) {
      root.style.setProperty('--color-primary', tenantConfig.primary_color);
      // Derive soft primary if not supplied
      const soft = tenantConfig.primary_color_soft || `${tenantConfig.primary_color}18`;
      root.style.setProperty('--color-primary-soft', soft);
    }
    if (tenantConfig.accent_color) {
      root.style.setProperty('--color-accent', tenantConfig.accent_color);
      // Derive soft accent if not supplied
      const soft = tenantConfig.accent_color_soft || `${tenantConfig.accent_color}18`;
      root.style.setProperty('--color-accent-soft', soft);
    }
    if (tenantConfig.bg_color) {
      root.style.setProperty('--color-bg', tenantConfig.bg_color);
    }
    if (tenantConfig.surface_color) {
      root.style.setProperty('--color-surface', tenantConfig.surface_color);
    }
    if (tenantConfig.font_display) {
      root.style.setProperty('--font-display', `'${tenantConfig.font_display}', serif`);
    }
    if (tenantConfig.font_body) {
      root.style.setProperty('--font-body', `'${tenantConfig.font_body}', sans-serif`);
    }
  }
};
