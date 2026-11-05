import React, { useState, useMemo } from 'react';
import {
  Task,
  TaskItem,
  User,
  MasterLine,
  MasterMaterial,
  MasterRak,
} from '../types';
import { formatDuration } from '../utils/storage';
import {
  BarChart3,
  PieChart,
  Users,
  MapPin,
  TrendingUp,
  Clock,
  Layers,
  Award,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Package,
  Activity,
  Printer,
} from 'lucide-react';

interface AnalyticsChartsViewProps {
  tasks: Task[];
  taskItems: TaskItem[];
  allUsers: User[];
  allLines: MasterLine[];
  allMaterials: MasterMaterial[];
  allRaks?: MasterRak[];
  role?: 'spv' | 'manager';
}

const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#ec4899', // pink
];

// Helper to draw SVG Donut slice
interface DonutSlice {
  label: string;
  subLabel?: string;
  value: number;
  percentage: number;
  color: string;
}

const SVGDonutChart: React.FC<{
  slices: DonutSlice[];
  centerLabel: string;
  centerSub: string;
}> = ({ slices, centerLabel, centerSub }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = slices.reduce((acc, curr) => acc + curr.value, 0);

  if (total === 0 || slices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <PieChart className="w-12 h-12 mb-2 text-slate-300 stroke-1" />
        <p className="text-xs font-bold text-slate-600">Belum Ada Data Transaksi</p>
        <p className="text-[10px] text-slate-400">Data grafik akan muncul setelah ada pengantaran material selesai</p>
      </div>
    );
  }

  // Calculate arc angles
  let cumulativeAngle = 0;
  const radius = 80;
  const strokeWidth = 28;
  const innerRadius = radius - strokeWidth / 2;
  const center = 100;
  const circumference = 2 * Math.PI * innerRadius;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
      {/* SVG Circle */}
      <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
          {slices.map((slice, idx) => {
            const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((cumulativeAngle / 360) * circumference);
            cumulativeAngle += (slice.percentage / 100) * 360;

            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={innerRadius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="font-mono text-xl font-black text-slate-900 tracking-tight">
            {hoveredIdx !== null ? slices[hoveredIdx].value : centerLabel}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 line-clamp-1 max-w-[100px]">
            {hoveredIdx !== null ? slices[hoveredIdx].label : centerSub}
          </span>
          {hoveredIdx !== null && (
            <span className="text-[11px] font-black text-amber-600 font-mono">
              {slices[hoveredIdx].percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Legend alongside */}
      <div className="flex-1 w-full space-y-2 max-h-56 overflow-y-auto pr-1">
        {slices.map((slice, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer border ${
                isHovered
                  ? 'bg-slate-100 border-slate-300 shadow-2xs'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: slice.color }}
                />
                <div className="min-w-0">
                  <span className="font-bold text-slate-800 block truncate leading-tight">
                    {slice.label}
                  </span>
                  {slice.subLabel && (
                    <span className="text-[10px] text-slate-500 block truncate font-mono">
                      {slice.subLabel}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0 ml-2 font-mono">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="font-extrabold text-slate-900">{slice.value}x</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-white border border-slate-200 text-slate-700 shadow-2xs">
                    {slice.percentage}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AnalyticsChartsView: React.FC<AnalyticsChartsViewProps> = ({
  tasks,
  taskItems,
  allUsers,
  allLines,
  allMaterials,
  allRaks = [],
  role = 'spv',
}) => {
  // Filter States
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'today' | '7days' | 'all'>('all');
  const [activeSection, setActiveSection] = useState<'all' | 'operator' | 'line' | 'hourly'>('all');

  const operators = allUsers.filter((u) => u.role === 'operator');

  // Filter Task Items by Shift & Period
  const filteredItems = useMemo(() => {
    return taskItems.filter((item) => {
      // Status check: must be DELIVERED for performance evaluation
      if (item.status !== 'DELIVERED') return false;

      const parentTask = tasks.find((t) => t.id === item.task_id);

      // Shift Filter
      if (shiftFilter !== 'all' && parentTask && parentTask.shift !== parseInt(shiftFilter)) {
        return false;
      }

      // Period Filter
      if (periodFilter !== 'all' && item.delivered_at) {
        const itemDate = new Date(item.delivered_at);
        const now = new Date();
        if (periodFilter === 'today') {
          if (
            itemDate.getDate() !== now.getDate() ||
            itemDate.getMonth() !== now.getMonth() ||
            itemDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        } else if (periodFilter === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (itemDate < sevenDaysAgo) return false;
        }
      }

      return true;
    });
  }, [taskItems, tasks, shiftFilter, periodFilter]);

  // Overall Global KPI Stats
  const totalDeliveries = filteredItems.length;
  const totalVolumePcs = filteredItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);

  const leadTimeValues = filteredItems
    .map((i) => i.delivery_duration_sec)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const avgLeadTime =
    leadTimeValues.length > 0
      ? Math.round(leadTimeValues.reduce((a, b) => a + b, 0) / leadTimeValues.length)
      : 0;

  const onTimeCount = filteredItems.filter((i) => (i.delivery_duration_sec || 0) <= 300).length;
  const onTimePercentage = totalDeliveries > 0 ? Math.round((onTimeCount / totalDeliveries) * 100) : 100;

  // 1. Operator (OP) Distribution & Frequency
  const operatorDistribution = useMemo(() => {
    return operators
      .map((op, idx) => {
        const opItems = filteredItems.filter((i) => i.user_id === op.id);
        const count = opItems.length;
        const volume = opItems.reduce((acc, curr) => acc + curr.qty, 0);
        const percentage = totalDeliveries > 0 ? Math.round((count / totalDeliveries) * 100) : 0;

        const durations = opItems
          .map((i) => i.delivery_duration_sec)
          .filter((d): d is number => typeof d === 'number' && d > 0);
        const avgDuration =
          durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : null;

        const autoFallbackCount = opItems.filter((i) => i.departure_mode === 'AUTO_FALLBACK').length;

        return {
          operator: op,
          count,
          volume,
          percentage,
          avgDuration,
          autoFallbackCount,
          color: CHART_COLORS[idx % CHART_COLORS.length],
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [operators, filteredItems, totalDeliveries]);

  // Operator Donut Slices
  const operatorDonutSlices: DonutSlice[] = operatorDistribution
    .filter((d) => d.count > 0)
    .map((d) => ({
      label: d.operator.nama,
      subLabel: `NIK: ${d.operator.employee_id}`,
      value: d.count,
      percentage: d.percentage,
      color: d.color,
    }));

  // 2. Line Distribution & Frequency
  const lineDistribution = useMemo(() => {
    return allLines
      .map((line, idx) => {
        const lineItems = filteredItems.filter((i) => i.line_id === line.id);
        const count = lineItems.length;
        const volume = lineItems.reduce((acc, curr) => acc + curr.qty, 0);
        const percentage = totalDeliveries > 0 ? Math.round((count / totalDeliveries) * 100) : 0;

        const durations = lineItems
          .map((i) => i.delivery_duration_sec)
          .filter((d): d is number => typeof d === 'number' && d > 0);
        const avgDuration =
          durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : null;

        return {
          line,
          count,
          volume,
          percentage,
          avgDuration,
          color: CHART_COLORS[(idx + 3) % CHART_COLORS.length],
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [allLines, filteredItems, totalDeliveries]);

  // Line Donut Slices
  const lineDonutSlices: DonutSlice[] = lineDistribution
    .filter((d) => d.count > 0)
    .map((d) => ({
      label: d.line.nama_line,
      subLabel: d.line.kode_line,
      value: d.count,
      percentage: d.percentage,
      color: d.color,
    }));

  // 3. Hourly Workload Distribution (Peak Hours)
  const hourlyData = useMemo(() => {
    // Factory typical operational hours: 06:00 to 21:00
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 to 21
    const hourCounts = hours.map((hour) => {
      const count = filteredItems.filter((item) => {
        if (!item.delivered_at) return false;
        const h = new Date(item.delivered_at).getHours();
        return h === hour;
      }).length;
      return {
        hour: `${String(hour).padStart(2, '0')}:00`,
        count,
      };
    });

    const maxCount = Math.max(...hourCounts.map((h) => h.count), 1);
    return { hourCounts, maxCount };
  }, [filteredItems]);

  // 4. Top Fast-Moving Material (Top 5 Parts)
  const topMaterials = useMemo(() => {
    return allMaterials
      .map((mat) => {
        const matItems = filteredItems.filter((i) => i.material_id === mat.id);
        const count = matItems.length;
        const volume = matItems.reduce((acc, curr) => acc + curr.qty, 0);
        const defaultRak = allRaks.find((r) => r.id === mat.default_rak_id);
        return {
          material: mat,
          count,
          volume,
          defaultRak: defaultRak?.kode_rak || '-',
        };
      })
      .filter((m) => m.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allMaterials, filteredItems, allRaks]);

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = [
      'Jenis Laporan',
      'Entitas (Nama OP / Line)',
      'ID / Kode',
      'Frekuensi Dikerjakan (Kali)',
      'Persentase Share (%)',
      'Total Volume (Pcs)',
      'Rata-rata Lead Time (Detik)',
    ];

    const opRows = operatorDistribution.map((d) => [
      'OPERATOR',
      `"${d.operator.nama}"`,
      d.operator.employee_id,
      d.count,
      `${d.percentage}%`,
      d.volume,
      d.avgDuration || 0,
    ]);

    const lineRows = lineDistribution.map((d) => [
      'LINE PRODUKSI',
      `"${d.line.nama_line}"`,
      d.line.kode_line,
      d.count,
      `${d.percentage}%`,
      d.volume,
      d.avgDuration || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...opRows.map((r) => r.join(',')), ...lineRows.map((r) => r.join(','))].join(
        '\n'
      );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ZEVA_Laporan_Grafik_${role.toUpperCase()}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${
                role === 'manager'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-blue-100 text-blue-800 border-blue-300'
              }`}
            >
              {role === 'manager' ? 'EXECUTIVE KPI & ANALISIS GRAFIK' : 'LAPORAN & GRAFIK DISPLAY SPV'}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Evaluasi Frekuensi &amp; Persentase
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <span>Distribusi &amp; Frekuensi Pengerjaan (Operator &amp; Line)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis visual berapa kali operator &amp; line dikerjakan serta persentase kontribusi beban kerja.
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Shift Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="all">Semua Shift</option>
              <option value="1">Shift 1</option>
              <option value="2">Shift 2</option>
              <option value="3">Shift 3</option>
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="all">Semua Periode</option>
              <option value="today">Hari Ini Saja</option>
              <option value="7days">7 Hari Terakhir</option>
            </select>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition"
            title="Download CSV rekapitulasi data grafik"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Flash Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Total Frekuensi Pengantaran</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
            {totalDeliveries.toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-500 font-sans">kali</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Total ritase berhasil sampai di stasiun line
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Volume Terkirim</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700">
            {totalVolumePcs.toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-500 font-sans">pcs/unit</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Komponen part disuplai ke lantai produksi
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Rata-Rata Lead Time (T1-T2)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
            {formatDuration(avgLeadTime)}
          </div>
          <p className="text-[10px] text-slate-400">
            Standar Lean target pengiriman: &le; 5 menit (300s)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span>Kepatuhan On-Time (&le; 5 Menit)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-purple-700">
            {onTimePercentage}%
          </div>
          <p className="text-[10px] text-slate-400">
            {onTimeCount} dari {totalDeliveries} pengantaran tepat waktu
          </p>
        </div>
      </div>

      {/* Section 1: Line Produksi - Frekuensi & Persentase */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <span>GRAFIK DISTRIBUSI &amp; FREKUENSI LINE PRODUKSI</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Berapa Kali Line Dikerjakan
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Menampilkan seberapa sering masing-masing line disuplai material serta porsi persentasenya.
              </p>
            </div>
          </div>

          <div className="text-xs font-bold font-mono px-3 py-1 bg-slate-100 rounded-lg text-slate-700">
            {allLines.length} Line Terdaftar
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Donut Chart: Persentase Suplai per Line */}
          <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-emerald-600" />
                Persentase Beban Suplai (% Share)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Diagram Proporsi</span>
            </div>

            <SVGDonutChart
              slices={lineDonutSlices}
              centerLabel={`${totalDeliveries}`}
              centerSub="Total Suplai"
            />
          </div>

          {/* Bar Chart & Breakdown: Frekuensi Dikerjakan per Line */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Ranking Frekuensi Kedatangan Suplai per Line
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Diurutkan dari frekuensi terbanyak
              </span>
            </div>

            <div className="space-y-2.5">
              {lineDistribution.map((item, idx) => {
                const maxCount = Math.max(...lineDistribution.map((l) => l.count), 1);
                const barWidth = Math.max((item.count / maxCount) * 100, item.count > 0 ? 4 : 0);

                return (
                  <div
                    key={item.line.id}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100/60 transition space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold font-mono text-[10px]">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">
                            {item.line.nama_line}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {item.line.kode_line} • Area: {item.line.area}
                          </span>
                        </div>
                      </div>

                      {/* Right Stats: Frekuensi & Persentase */}
                      <div className="text-right font-mono flex items-center gap-3">
                        <div>
                          <span className="font-black text-slate-900 text-sm block leading-tight">
                            {item.count}x
                          </span>
                          <span className="text-[10px] text-slate-400 block">Dikerjakan</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-700 text-sm block leading-tight">
                            {item.percentage}%
                          </span>
                          <span className="text-[10px] text-slate-500 block">Porsi</span>
                        </div>
                        <div className="text-right pl-2 border-l border-slate-200">
                          <span className="font-bold text-slate-700 text-xs block leading-tight">
                            {item.volume} pcs
                          </span>
                          <span className="text-[10px] text-amber-700 font-semibold block">
                            {item.avgDuration ? formatDuration(item.avgDuration) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Bar Indicator */}
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Operator (OP) - Frekuensi & Persentase */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <span>GRAFIK DISTRIBUSI &amp; FREKUENSI OPERATOR (OP)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                  Berapa Kali OP Mengerjakan
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Membandingkan produktivitas, jumlah ritase pengantaran, dan persentase kontribusi kerja tiap operator.
              </p>
            </div>
          </div>

          <div className="text-xs font-bold font-mono px-3 py-1 bg-slate-100 rounded-lg text-slate-700">
            {operators.length} Operator Aktif
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Donut Chart: Persentase Beban Kerja Operator */}
          <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-blue-600" />
                Persentase Beban Kerja OP (% Share)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Workload Balance</span>
            </div>

            <SVGDonutChart
              slices={operatorDonutSlices}
              centerLabel={`${totalDeliveries}`}
              centerSub="Total Task OP"
            />
          </div>

          {/* Bar Chart & Breakdown: Frekuensi Pengantaran per Operator */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Ranking Frekuensi Task Selesai per Operator
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Ritase pengantaran ke line
              </span>
            </div>

            <div className="space-y-2.5">
              {operatorDistribution.map((item, idx) => {
                const maxCount = Math.max(...operatorDistribution.map((o) => o.count), 1);
                const barWidth = Math.max((item.count / maxCount) * 100, item.count > 0 ? 4 : 0);

                return (
                  <div
                    key={item.operator.id}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100/60 transition space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold font-mono text-[10px]">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">
                            {item.operator.nama}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            NIK: {item.operator.employee_id}
                          </span>
                        </div>
                      </div>

                      {/* Right Stats */}
                      <div className="text-right font-mono flex items-center gap-3">
                        <div>
                          <span className="font-black text-slate-900 text-sm block leading-tight">
                            {item.count}x
                          </span>
                          <span className="text-[10px] text-slate-400 block">Jalan/Trip</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-blue-700 text-sm block leading-tight">
                            {item.percentage}%
                          </span>
                          <span className="text-[10px] text-slate-500 block">Kontribusi</span>
                        </div>
                        <div className="text-right pl-2 border-l border-slate-200">
                          <span className="font-bold text-slate-700 text-xs block leading-tight">
                            {item.volume} pcs
                          </span>
                          <span className="text-[10px] text-amber-700 font-semibold block">
                            {item.avgDuration ? formatDuration(item.avgDuration) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Bar Indicator */}
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Saran Tambahan - Ritme Jam Kerja Pabrik & Pareto Material */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Peak Hours Workload Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>RITME KERJA PER JAM (PEAK HOURS PABRIK)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Distribusi frekuensi pengantaran material berdasarkan jam kerja harian.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-600" />
              <span>Analisis Jam Sibuk</span>
            </span>
          </div>

          {/* Vertical Bar Chart */}
          <div className="pt-4">
            <div className="h-44 flex items-end justify-between gap-1 sm:gap-2 px-1 border-b border-slate-200 pb-2">
              {hourlyData.hourCounts.map((h, i) => {
                const heightPercent = Math.max((h.count / hourlyData.maxCount) * 100, h.count > 0 ? 8 : 2);
                const isPeak = h.count === hourlyData.maxCount && h.count > 0;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 hidden group-hover:flex flex-col items-center z-10">
                      <div className="bg-slate-900 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                        {h.hour}: {h.count}x
                      </div>
                    </div>

                    {/* Count above bar if peak */}
                    {h.count > 0 && (
                      <span className="text-[9px] font-mono font-bold text-slate-600 mb-1">
                        {h.count}
                      </span>
                    )}

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isPeak
                          ? 'bg-amber-500 shadow-sm'
                          : h.count > 0
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : 'bg-slate-100'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-2 px-1">
              {hourlyData.hourCounts.filter((_, i) => i % 2 === 0).map((h, i) => (
                <span key={i}>{h.hour}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Top 5 Fast Moving Parts */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span>TOP MATERIAL FAST-MOVING</span>
              </h3>
              <p className="text-xs text-slate-500">Part yang paling sering diambil dari rak.</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Top 5</span>
          </div>

          <div className="space-y-2.5">
            {topMaterials.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Belum ada data pengambilan material
              </div>
            ) : (
              topMaterials.map((item, idx) => (
                <div
                  key={item.material.id}
                  className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px]">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block truncate leading-tight">
                        {item.material.deskripsi}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {item.material.kode_material} • Rak: {item.defaultRak}
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono shrink-0 ml-2">
                    <span className="font-black text-purple-700 block leading-tight">
                      {item.count}x diambil
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {item.volume} {item.material.satuan}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
