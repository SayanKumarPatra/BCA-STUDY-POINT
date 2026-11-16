export type AdminNavTab =
  | 'dashboard'
  | 'orders'
  | 'customers'
  | 'products'
  | 'packages'
  | 'offers'
  | 'banners'
  | 'website'
  | 'reports'
  | 'settings';

export type DateRangePreset = 'today' | 'yesterday' | '7days' | 'month' | 'all' | 'custom';

export function formatInr(amount: number | undefined | null): string {
  const num = Number(amount || 0);
  return `₹${num.toLocaleString('en-IN')}`;
}

export function formatDateTimeIST(isoString?: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateIST(isoString?: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function exportCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const PRESET_BOOK_COVERS = [
  { label: 'Data Structures & Algo', url: '/assets/aistudio/bca_301_ds_3d_cover_1776138957828.png' },
  { label: 'OOP in C++', url: '/assets/aistudio/bca_302_oop_3d_cover_1776138972688.png' },
  { label: 'Computer Networks', url: '/assets/aistudio/bca_303_cn_3d_cover_1776138988557.png' },
  { label: 'Discrete Mathematics', url: '/assets/aistudio/bca_304_math_3d_cover_1776139006684.png' },
  { label: 'Bengali MIL', url: '/assets/aistudio/bca_305_bengali_3d_cover_1776139022670.png' },
  { label: 'Sanskrit MIL', url: '/assets/aistudio/bca_306_sanskrit_3d_cover_1776139040084.png' },
  { label: 'Artificial Intelligence', url: '/assets/aistudio/bca_307_ai_3d_cover_1776139058821.png' },
  { label: 'Data Science', url: '/assets/aistudio/bca_308_ds_spec_3d_cover_1776139075498.png' },
  { label: 'Cyber Security', url: '/assets/aistudio/bca_309_cyber_3d_cover_1776139091009.png' },
  { label: 'Cloud Computing', url: '/assets/aistudio/bca_310_cloud_3d_cover_1776139106875.png' },
  { label: 'Full Stack Web Dev', url: '/assets/aistudio/bca_311_fullstack_3d_cover_1776139121696.png' },
];
