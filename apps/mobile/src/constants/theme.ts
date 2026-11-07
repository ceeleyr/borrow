import type { Tone } from '../lib/status';

export const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  bg: '#f3f4f6',
  surface: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  faint: '#9ca3af',
  border: '#e5e7eb',
  danger: '#dc2626',
  success: '#16a34a',
} as const;

export const toneColors: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: '#f3f4f6', fg: '#4b5563' },
  info: { bg: '#dbeafe', fg: '#1d4ed8' },
  success: { bg: '#dcfce7', fg: '#15803d' },
  warning: { bg: '#fef3c7', fg: '#b45309' },
  danger: { bg: '#fee2e2', fg: '#b91c1c' },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;
export const MAX_WIDTH = 720;
