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
  ChevronDown,
  ChevronUp,
  Boxes,
  Truck,
  FileSpreadsheet,
} from 'lucide-react';
import { exportSpvCompleteReport, exportManagerCompleteReport } from '../utils/excelReportExport';

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

// Helper to format delivery times
interface DeliveryTimestampInfo {
  rawTime: string;
  formattedTime: string;
  fullTime: string;
  qty: number;
  opName?: string;
  lineName?: string;
}

const formatDeliveryTime = (isoString?: string | null, forceDate = false): string => {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (!forceDate && isToday) {
      return timeStr;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month} ${timeStr}`;
  } catch {
    return '-';
  }
};

const formatFullDateTime = (isoString?: string | null): string => {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '-';
  }
};

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

  // Drill-down expanded cards state
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [expandedOperatorId, setExpandedOperatorId] = useState<string | null>(null);

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
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 to 21:00
    const hourCounts = hours.map((hour) => {
      const itemsInHour = filteredItems.filter((item) => {
        const timeStr = item.delivered_at || item.picked_at || item.last_material_scanned_at;
        if (!timeStr) return false;
        const h = new Date(timeStr).getHours();
        return h === hour;
      });
      const count = itemsInHour.length;
      const volume = itemsInHour.reduce((acc, curr) => acc + (curr.qty || 0), 0);
      return {
        hour: `${String(hour).padStart(2, '0')}:00`,
        hourLabel: `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`,
        count,
        volume,
      };
    });

    const maxCount = Math.max(...hourCounts.map((h) => h.count), 1);
    const activeHours = hourCounts.filter((h) => h.count > 0);
    const peakHour =
      activeHours.length > 0
        ? activeHours.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), activeHours[0])
        : null;
    const totalDeliveries = hourCounts.reduce((acc, curr) => acc + curr.count, 0);
    const avgPerHour =
      activeHours.length > 0 ? (totalDeliveries / activeHours.length).toFixed(1) : '0';

    return {
      hourCounts,
      maxCount,
      peakHour,
      totalDeliveries,
      avgPerHour,
    };
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

  // Drill-down: Get materials delivered to a specific Line
  const getLineMaterialBreakdown = (lineId: string) => {
    const lineItems = filteredItems.filter((i) => i.line_id === lineId);
    const totalLineQty = lineItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);

    const matMap = new Map<
      string,
      {
        count: number;
        volume: number;
        deliveries: DeliveryTimestampInfo[];
      }
    >();

    lineItems.forEach((item) => {
      const existing = matMap.get(item.material_id) || { count: 0, volume: 0, deliveries: [] };
      const rawTime = item.delivered_at || item.picked_at || item.last_material_scanned_at || '';
      const op = allUsers.find((u) => u.id === item.user_id);

      const deliveryInfo: DeliveryTimestampInfo = {
        rawTime,
        formattedTime: formatDeliveryTime(rawTime, periodFilter !== 'today'),
        fullTime: formatFullDateTime(rawTime),
        qty: item.qty || 0,
        opName: op?.nama || 'Operator',
      };

      matMap.set(item.material_id, {
        count: existing.count + 1,
        volume: existing.volume + (item.qty || 0),
        deliveries: [...existing.deliveries, deliveryInfo],
      });
    });

    return Array.from(matMap.entries())
      .map(([matId, stats]) => {
        const mat = allMaterials.find((m) => m.id === matId);
        const defaultRak = allRaks.find((r) => r.id === mat?.default_rak_id);
        const percentage = totalLineQty > 0 ? Math.round((stats.volume / totalLineQty) * 100) : 0;

        // Sort delivery timestamps chronologically (oldest to newest)
        const sortedDeliveries = [...stats.deliveries].sort((a, b) => {
          if (!a.rawTime) return 1;
          if (!b.rawTime) return -1;
          return new Date(a.rawTime).getTime() - new Date(b.rawTime).getTime();
        });

        return {
          materialId: matId,
          kode: mat?.kode_material || matId,
          deskripsi: mat?.deskripsi || 'Material Part',
          satuan: mat?.satuan || 'Pcs',
          defaultRak: defaultRak?.kode_rak || '-',
          count: stats.count,
          volume: stats.volume,
          percentage,
          deliveries: sortedDeliveries,
        };
      })
      .sort((a, b) => b.count - a.count || b.volume - a.volume);
  };

  // Drill-down: Get lines serviced and materials delivered by a specific Operator
  const getOperatorBreakdown = (userId: string) => {
    const opItems = filteredItems.filter((i) => i.user_id === userId);
    const totalOpQty = opItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);

    // 1. Lines serviced by this operator
    const lineMap = new Map<
      string,
      {
        count: number;
        volume: number;
        deliveries: DeliveryTimestampInfo[];
      }
    >();
    // 2. Materials delivered by this operator
    const matMap = new Map<
      string,
      {
        count: number;
        volume: number;
        deliveries: DeliveryTimestampInfo[];
      }
    >();

    opItems.forEach((item) => {
      const rawTime = item.delivered_at || item.picked_at || item.last_material_scanned_at || '';
      const line = allLines.find((l) => l.id === item.line_id);

      // Line stats
      const existingLine = lineMap.get(item.line_id) || { count: 0, volume: 0, deliveries: [] };
      const lineDelInfo: DeliveryTimestampInfo = {
        rawTime,
        formattedTime: formatDeliveryTime(rawTime, periodFilter !== 'today'),
        fullTime: formatFullDateTime(rawTime),
        qty: item.qty || 0,
      };
      lineMap.set(item.line_id, {
        count: existingLine.count + 1,
        volume: existingLine.volume + (item.qty || 0),
        deliveries: [...existingLine.deliveries, lineDelInfo],
      });

      // Material stats
      const existingMat = matMap.get(item.material_id) || { count: 0, volume: 0, deliveries: [] };
      const matDelInfo: DeliveryTimestampInfo = {
        rawTime,
        formattedTime: formatDeliveryTime(rawTime, periodFilter !== 'today'),
        fullTime: formatFullDateTime(rawTime),
        qty: item.qty || 0,
        lineName: line?.nama_line || item.line_id,
      };
      matMap.set(item.material_id, {
        count: existingMat.count + 1,
        volume: existingMat.volume + (item.qty || 0),
        deliveries: [...existingMat.deliveries, matDelInfo],
      });
    });

    const linesServiced = Array.from(lineMap.entries())
      .map(([lineId, stats]) => {
        const line = allLines.find((l) => l.id === lineId);
        const percentage = opItems.length > 0 ? Math.round((stats.count / opItems.length) * 100) : 0;
        const sortedDeliveries = [...stats.deliveries].sort((a, b) => {
          if (!a.rawTime) return 1;
          if (!b.rawTime) return -1;
          return new Date(a.rawTime).getTime() - new Date(b.rawTime).getTime();
        });
        return {
          lineId,
          namaLine: line?.nama_line || lineId,
          kodeLine: line?.kode_line || '',
          area: line?.area || '',
          count: stats.count,
          volume: stats.volume,
          percentage,
          deliveries: sortedDeliveries,
        };
      })
      .sort((a, b) => b.count - a.count || b.volume - a.volume);

    const materialsDelivered = Array.from(matMap.entries())
      .map(([matId, stats]) => {
        const mat = allMaterials.find((m) => m.id === matId);
        const defaultRak = allRaks.find((r) => r.id === mat?.default_rak_id);
        const percentage = totalOpQty > 0 ? Math.round((stats.volume / totalOpQty) * 100) : 0;
        const sortedDeliveries = [...stats.deliveries].sort((a, b) => {
          if (!a.rawTime) return 1;
          if (!b.rawTime) return -1;
          return new Date(a.rawTime).getTime() - new Date(b.rawTime).getTime();
        });
        return {
          materialId: matId,
          kode: mat?.kode_material || matId,
          deskripsi: mat?.deskripsi || 'Material Part',
          satuan: mat?.satuan || 'Pcs',
          defaultRak: defaultRak?.kode_rak || '-',
          count: stats.count,
          volume: stats.volume,
          percentage,
          deliveries: sortedDeliveries,
        };
      })
      .sort((a, b) => b.count - a.count || b.volume - a.volume);

    return {
      totalTrips: opItems.length,
      totalQty: totalOpQty,
      linesServiced,
      materialsDelivered,
    };
  };

  // Export Complete Multi-Sheet Excel Report (.xlsx)
  const handleExportExcel = () => {
    if (role === 'manager') {
      exportManagerCompleteReport({
        tasks,
        taskItems,
        allUsers,
        allLines,
        allMaterials,
        allRaks,
        selectedShiftFilter: shiftFilter,
        periodFilter,
      });
    } else {
      exportSpvCompleteReport({
        tasks,
        taskItems,
        allUsers,
        allLines,
        allMaterials,
        allRaks,
        filterShift: shiftFilter,
        periodFilter,
      });
    }
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

          {/* Export Excel (.xlsx) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition"
            title={`Download Laporan Lengkap ${role === 'manager' ? 'Manager' : 'SPV'} (.xlsx)`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel (.xlsx)</span>
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
                Klik kartu untuk melihat rincian material
              </span>
            </div>

            <div className="space-y-2.5">
              {lineDistribution.map((item, idx) => {
                const maxCount = Math.max(...lineDistribution.map((l) => l.count), 1);
                const barWidth = Math.max((item.count / maxCount) * 100, item.count > 0 ? 4 : 0);
                const isExpanded = expandedLineId === item.line.id;
                const lineBreakdown = isExpanded ? getLineMaterialBreakdown(item.line.id) : [];

                return (
                  <div
                    key={item.line.id}
                    onClick={() => setExpandedLineId((prev) => (prev === item.line.id ? null : item.line.id))}
                    className={`p-3 rounded-xl transition-all cursor-pointer space-y-2 border ${
                      isExpanded
                        ? 'bg-emerald-50/30 border-emerald-500 ring-2 ring-emerald-200/60 shadow-xs'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60 hover:border-slate-300'
                    }`}
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

                        {/* Expand indicator button */}
                        <div
                          className={`p-1 rounded-lg border transition ${
                            isExpanded
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
                          }`}
                          title={isExpanded ? 'Tutup rincian material' : 'Buka rincian material'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
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

                    {/* Drill-Down: List Material yang Dikirim ke Line Ini */}
                    {isExpanded && (
                      <div
                        className="mt-3 pt-3 border-t border-slate-200/90 space-y-2.5 animate-in fade-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Rincian Material yang Dikirim ke {item.line.nama_line}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {lineBreakdown.length} Jenis Part • {item.count}x Frekuensi Suplai
                          </span>
                        </div>

                        {lineBreakdown.length === 0 ? (
                          <div className="p-3 text-center text-slate-400 text-xs bg-white rounded-lg border border-slate-200">
                            Belum ada material yang disuplai ke line ini pada periode terpilih.
                          </div>
                        ) : (
                          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-2xs">
                            <table className="w-full text-left text-xs min-w-[600px]">
                              <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                                <tr>
                                  <th className="px-3 py-2">#</th>
                                  <th className="px-3 py-2">Material / Part</th>
                                  <th className="px-3 py-2">Rak Asal</th>
                                  <th className="px-3 py-2 text-right">Frekuensi Suplai</th>
                                  <th className="px-3 py-2">Waktu Pengiriman</th>
                                  <th className="px-3 py-2 text-right">Total Qty</th>
                                  <th className="px-3 py-2 text-right">Porsi (%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                {lineBreakdown.map((matItem, mIdx) => (
                                  <tr key={matItem.materialId} className="hover:bg-slate-50/80">
                                    <td className="px-3 py-2 font-bold text-slate-400">
                                      #{mIdx + 1}
                                    </td>
                                    <td className="px-3 py-2 font-sans">
                                      <div className="font-bold text-slate-900 leading-tight">
                                        {matItem.kode}
                                      </div>
                                      <div className="text-[10px] text-slate-500 line-clamp-1">
                                        {matItem.deskripsi}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                        {matItem.defaultRak}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="font-extrabold text-slate-900 text-xs">
                                        {matItem.count}x
                                      </span>
                                      <span className="text-[10px] text-slate-400 block font-normal">
                                        dikirim
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-sans">
                                      <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                                        {matItem.deliveries.length === 0 ? (
                                          <span className="text-[10px] text-slate-400 italic">-</span>
                                        ) : (
                                          matItem.deliveries.map((del, dIdx) => (
                                            <span
                                              key={dIdx}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-[10px] font-mono font-bold shadow-2xs hover:bg-emerald-100 transition-colors cursor-help"
                                              title={`Pengiriman #${dIdx + 1}: ${del.fullTime}${del.opName ? ` • Pengirim: ${del.opName}` : ''}${del.qty ? ` • Qty: ${del.qty} ${matItem.satuan}` : ''}`}
                                            >
                                              <Clock className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                              <span>{del.formattedTime}</span>
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="font-extrabold text-emerald-700">
                                        {matItem.volume}
                                      </span>
                                      <span className="text-[10px] text-slate-400 block font-sans">
                                        {matItem.satuan}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-extrabold text-[10px]">
                                        {matItem.percentage}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
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
                Klik kartu untuk melihat rincian line &amp; material
              </span>
            </div>

            <div className="space-y-2.5">
              {operatorDistribution.map((item, idx) => {
                const maxCount = Math.max(...operatorDistribution.map((o) => o.count), 1);
                const barWidth = Math.max((item.count / maxCount) * 100, item.count > 0 ? 4 : 0);
                const isExpanded = expandedOperatorId === item.operator.id;
                const opBreakdown = isExpanded ? getOperatorBreakdown(item.operator.id) : null;

                return (
                  <div
                    key={item.operator.id}
                    onClick={() =>
                      setExpandedOperatorId((prev) => (prev === item.operator.id ? null : item.operator.id))
                    }
                    className={`p-3 rounded-xl transition-all cursor-pointer space-y-2 border ${
                      isExpanded
                        ? 'bg-blue-50/30 border-blue-500 ring-2 ring-blue-200/60 shadow-xs'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60 hover:border-slate-300'
                    }`}
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

                        {/* Expand indicator button */}
                        <div
                          className={`p-1 rounded-lg border transition ${
                            isExpanded
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
                          }`}
                          title={isExpanded ? 'Tutup rincian' : 'Buka rincian line & material'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
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

                    {/* Drill-Down: Detail Line Mana Saja & Material Apa Saja yang Dikerjakan OP */}
                    {isExpanded && opBreakdown && (
                      <div
                        className="mt-3 pt-3 border-t border-slate-200/90 space-y-3 animate-in fade-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            <span>Rincian Kerja Operator: {item.operator.nama}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            NIK: {item.operator.employee_id} • Total {item.count}x Jalan ({item.volume} pcs)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* 1. Line Tujuan yang Dilayani */}
                          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Line Tujuan yang Dilayani</span>
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {opBreakdown.linesServiced.length} Line
                              </span>
                            </div>

                            {opBreakdown.linesServiced.length === 0 ? (
                              <p className="text-[11px] text-slate-400 py-3 text-center">
                                Belum ada pengantaran line yang tercatat
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {opBreakdown.linesServiced.map((lItem, lIdx) => (
                                  <div
                                    key={lItem.lineId}
                                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between text-xs hover:border-emerald-200 transition-colors"
                                  >
                                    <div className="min-w-0 flex items-start gap-2 flex-1">
                                      <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                                        #{lIdx + 1}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <span className="font-bold text-slate-900 block truncate leading-tight">
                                          {lItem.namaLine}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono block">
                                          {lItem.kodeLine} {lItem.area ? `• Area: ${lItem.area}` : ''}
                                        </span>
                                        {/* Waktu kapan saja dikirim ke line */}
                                        <div className="mt-1 flex flex-wrap items-center gap-1">
                                          <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5 shrink-0">
                                            <Clock className="w-2.5 h-2.5 text-emerald-600" /> Waktu:
                                          </span>
                                          {lItem.deliveries.length === 0 ? (
                                            <span className="text-[9px] text-slate-400 italic">-</span>
                                          ) : (
                                            lItem.deliveries.map((del, dIdx) => (
                                              <span
                                                key={dIdx}
                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-mono font-bold shadow-2xs hover:bg-emerald-100 transition-colors cursor-help"
                                                title={`Trip #${dIdx + 1}: ${del.fullTime}${del.qty ? ` (${del.qty} pcs)` : ''}`}
                                              >
                                                {del.formattedTime}
                                              </span>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right font-mono shrink-0 ml-2 pt-0.5">
                                      <span className="font-black text-slate-900 text-xs block leading-tight">
                                        {lItem.count}x jalan
                                      </span>
                                      <span className="text-[10px] text-emerald-700 block font-bold">
                                        {lItem.volume} pcs ({lItem.percentage}%)
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 2. Material Part yang Diantar */}
                          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-blue-600" />
                                <span>Material Part yang Diantar</span>
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {opBreakdown.materialsDelivered.length} Jenis Part
                              </span>
                            </div>

                            {opBreakdown.materialsDelivered.length === 0 ? (
                              <p className="text-[11px] text-slate-400 py-3 text-center">
                                Belum ada material yang diantar
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {opBreakdown.materialsDelivered.map((mItem, mIdx) => (
                                  <div
                                    key={mItem.materialId}
                                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between text-xs hover:border-blue-200 transition-colors"
                                  >
                                    <div className="min-w-0 flex items-start gap-2 flex-1">
                                      <span className="w-4 h-4 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                                        #{mIdx + 1}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-slate-900 leading-tight">
                                            {mItem.kode}
                                          </span>
                                          <span className="px-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold">
                                            {mItem.defaultRak}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 block truncate">
                                          {mItem.deskripsi}
                                        </span>
                                        {/* Waktu kapan saja material dikirim oleh operator */}
                                        <div className="mt-1 flex flex-wrap items-center gap-1">
                                          <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5 shrink-0">
                                            <Clock className="w-2.5 h-2.5 text-blue-500" /> Waktu:
                                          </span>
                                          {mItem.deliveries.length === 0 ? (
                                            <span className="text-[9px] text-slate-400 italic">-</span>
                                          ) : (
                                            mItem.deliveries.map((del, dIdx) => (
                                              <span
                                                key={dIdx}
                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-mono font-bold shadow-2xs hover:bg-blue-100 transition-colors cursor-help"
                                                title={`Pengantaran #${dIdx + 1}: ${del.fullTime}${del.lineName ? ` ke ${del.lineName}` : ''}${del.qty ? ` (${del.qty} ${mItem.satuan})` : ''}`}
                                              >
                                                {del.formattedTime}
                                              </span>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right font-mono shrink-0 ml-2 pt-0.5">
                                      <span className="font-black text-slate-900 text-xs block leading-tight">
                                        {mItem.count}x kirim
                                      </span>
                                      <span className="text-[10px] text-blue-700 block font-bold">
                                        {mItem.volume} {mItem.satuan}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>RITME KERJA PER JAM (PEAK HOURS PABRIK)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Grafik batang distribusi frekuensi pengantaran material per jam kerja harian.
              </p>
            </div>

            {hourlyData.peakHour ? (
              <span className="text-[10px] px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-extrabold flex items-center gap-1.5 shadow-2xs">
                <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500 animate-pulse" />
                <span>Peak: {hourlyData.peakHour.hour} ({hourlyData.peakHour.count}x Suplai)</span>
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                Standby Mode
              </span>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Jam Tersibuk (Peak)
              </span>
              <span className="text-base font-black text-amber-700 font-mono">
                {hourlyData.peakHour ? hourlyData.peakHour.hour : '-'}
              </span>
              <span className="text-[10px] text-amber-600 block">
                {hourlyData.peakHour ? `${hourlyData.peakHour.count}x kirim (${hourlyData.peakHour.volume} pcs)` : 'Tidak ada aktivitas'}
              </span>
            </div>

            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                Rata-rata Ritase
              </span>
              <span className="text-base font-black text-blue-700 font-mono">
                {hourlyData.avgPerHour}x
              </span>
              <span className="text-[10px] text-blue-600 block">per jam operasional aktif</span>
            </div>

            <div className="col-span-2 sm:col-span-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex sm:flex-col justify-between sm:justify-center">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Suplai Terdistribusi
                </span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {hourlyData.totalDeliveries}x
                </span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-2 sm:mt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-amber-500 inline-block" /> Peak
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-blue-500 inline-block" /> Normal
                </span>
              </div>
            </div>
          </div>

          {/* Vertical Bar Chart Container */}
          <div className="pt-2">
            <div className="relative">
              {/* Horizontal Reference Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                <div className="w-full border-b border-dashed border-slate-200 flex justify-end">
                  <span className="text-[9px] font-mono text-slate-400 bg-white px-1 -mt-2">
                    Max: {hourlyData.maxCount}x
                  </span>
                </div>
                <div className="w-full border-b border-dashed border-slate-100 flex justify-end">
                  <span className="text-[9px] font-mono text-slate-300 bg-white px-1 -mt-2">
                    {Math.round(hourlyData.maxCount * 0.5)}x
                  </span>
                </div>
                <div className="w-full border-b border-slate-200" />
              </div>

              {/* Bars Row */}
              <div className="h-48 flex items-end justify-between gap-1 sm:gap-2 px-1 pb-1 relative z-10">
                {hourlyData.hourCounts.map((h, i) => {
                  const isPeak = hourlyData.peakHour && h.hour === hourlyData.peakHour.hour && h.count > 0;
                  const heightPercent = hourlyData.maxCount > 0 ? (h.count / hourlyData.maxCount) * 100 : 0;

                  return (
                    <div
                      key={i}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    >
                      {/* Floating Tooltip */}
                      <div className="absolute -top-12 hidden group-hover:flex flex-col items-center z-30 pointer-events-none transition-all">
                        <div className="bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded-lg shadow-lg whitespace-nowrap text-center">
                          <span className="font-bold block text-amber-400">{h.hourLabel}</span>
                          <span>{h.count}x pengantaran ({h.volume} pcs)</span>
                        </div>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                      </div>

                      {/* Count label above bar */}
                      <div className="h-6 flex items-center justify-center">
                        {h.count > 0 ? (
                          <span
                            className={`text-[10px] font-mono font-black transition-transform group-hover:scale-125 ${
                              isPeak ? 'text-amber-600 font-extrabold' : 'text-slate-700'
                            }`}
                          >
                            {h.count}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-300 opacity-0 group-hover:opacity-100 font-mono">
                            0
                          </span>
                        )}
                      </div>

                      {/* Bar Track & Fill */}
                      <div className="w-full max-w-[28px] sm:max-w-[34px] h-36 flex flex-col justify-end bg-slate-100/70 hover:bg-slate-200/50 rounded-t-lg overflow-hidden border border-slate-200/50 p-0.5 transition-colors">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ease-out ${
                            isPeak
                              ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 shadow-sm ring-1 ring-amber-300'
                              : h.count > 0
                              ? 'bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 group-hover:from-blue-500 group-hover:to-blue-300 shadow-xs'
                              : 'h-0'
                          }`}
                          style={{
                            height: h.count > 0 ? `${Math.max(heightPercent, 12)}%` : '0%',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-2 px-1 font-semibold">
              {hourlyData.hourCounts
                .filter((_, i) => i % 2 === 0)
                .map((h, i) => (
                  <span key={i} className="hover:text-slate-900 transition-colors">
                    {h.hour}
                  </span>
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
