import { Tenant } from '../types';

export const applyTenantTheme = (tenant: Tenant | null | undefined): void => {
  const root = document.documentElement;

  const defaults: Record<string, string> = {
    '--color-primary': '#6b4a35',
    '--color-primary-dark': '#53392a',
    '--color-primary-soft': 'rgba(107, 74, 53, 0.10)',
    '--color-accent': '#d99b52',
    '--color-accent-soft': 'rgba(217, 155, 82, 0.14)',
    '--color-bg': '#f7f7f5',
    '--color-surface': '#ffffff',
    '--font-display': "'Rubik', -apple-system, BlinkMacSystemFont, sans-serif",
    '--font-body': "'Rubik', -apple-system, BlinkMacSystemFont, sans-serif",
  };

  Object.entries(defaults).forEach(([key, val]) => root.style.setProperty(key, val));

  if (!tenant) return;

  if (tenant.primaryColor) {
    root.style.setProperty('--color-primary', tenant.primaryColor);
    root.style.setProperty(
      '--color-primary-soft',
      tenant.primaryColorSoft || `${tenant.primaryColor}18`
    );
  }
  if (tenant.accentColor) {
    root.style.setProperty('--color-accent', tenant.accentColor);
    root.style.setProperty(
      '--color-accent-soft',
      tenant.accentColorSoft || `${tenant.accentColor}18`
    );
  }
  if (tenant.bgColor) root.style.setProperty('--color-bg', tenant.bgColor);
  if (tenant.surfaceColor) root.style.setProperty('--color-surface', tenant.surfaceColor);
  if (tenant.fontDisplay)
    root.style.setProperty('--font-display', `'${tenant.fontDisplay}', sans-serif`);
  if (tenant.fontBody)
    root.style.setProperty('--font-body', `'${tenant.fontBody}', sans-serif`);
  if (tenant.name) root.style.setProperty('--brand-name', tenant.name);
  if (tenant.logo) root.style.setProperty('--brand-logo', `url(${tenant.logo})`);
};
