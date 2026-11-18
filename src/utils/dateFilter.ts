import { Task, TaskItem } from '../types';

export type PeriodFilterType = 'today' | 'date' | 'month' | '7days' | 'all';

export interface PeriodFilterConfig {
  periodFilter: PeriodFilterType;
  selectedDate?: string; // YYYY-MM-DD
  selectedMonth?: number; // 1 - 12
  selectedYear?: number; // e.g. 2026
}

export const INDONESIAN_MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

export const getLocalDateInputValue = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getItemLocalDate = (item: TaskItem, parentTask?: Task): Date | null => {
  const iso = item.delivered_at || item.picked_at || item.last_material_scanned_at;
  if (iso) {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }
  if (parentTask?.tanggal) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(parentTask.tanggal);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const d = new Date(parentTask.tanggal);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

export const matchesPeriodFilter = (
  item: TaskItem,
  parentTask: Task | undefined,
  config: PeriodFilterConfig
): boolean => {
  const { periodFilter, selectedDate, selectedMonth, selectedYear } = config;
  if (periodFilter === 'all') return true;

  const itemDate = getItemLocalDate(item, parentTask);
  if (!itemDate) return false;

  const now = new Date();

  if (periodFilter === 'today') {
    return (
      itemDate.getFullYear() === now.getFullYear() &&
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getDate() === now.getDate()
    );
  }

  if (periodFilter === 'date') {
    if (!selectedDate) return true;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(selectedDate);
    if (!match) return true;
    return (
      itemDate.getFullYear() === Number(match[1]) &&
      itemDate.getMonth() === Number(match[2]) - 1 &&
      itemDate.getDate() === Number(match[3])
    );
  }

  if (periodFilter === 'month') {
    const targetMonth = selectedMonth ?? now.getMonth() + 1;
    const targetYear = selectedYear ?? now.getFullYear();
    return (
      itemDate.getFullYear() === targetYear &&
      itemDate.getMonth() + 1 === targetMonth
    );
  }

  if (periodFilter === '7days') {
    const startOfSevenDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0
    );
    return itemDate >= startOfSevenDaysAgo;
  }

  return true;
};

export const formatPeriodLabel = (config: PeriodFilterConfig): string => {
  const { periodFilter, selectedDate, selectedMonth, selectedYear } = config;
  const now = new Date();
  if (periodFilter === 'today') {
    return `Hari Ini (${now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })})`;
  }
  if (periodFilter === 'date' && selectedDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(selectedDate);
    if (match) {
      const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return `Tanggal ${d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })}`;
    }
    return `Tanggal ${selectedDate}`;
  }
  if (periodFilter === 'month') {
    const m = selectedMonth ?? now.getMonth() + 1;
    const y = selectedYear ?? now.getFullYear();
    const mLabel = INDONESIAN_MONTHS.find((x) => x.value === m)?.label || String(m);
    return `Bulan ${mLabel} ${y}`;
  }
  if (periodFilter === '7days') {
    return '7 Hari Terakhir';
  }
  return 'Semua Periode';
};
