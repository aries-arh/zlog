import React, { useState } from 'react';
import {
  Task,
  TaskItem,
  User,
  MasterLine,
  MasterMaterial,
} from '../types';
import { formatDuration } from '../utils/storage';
import {
  TrendingUp,
  Award,
  BarChart3,
  PieChart,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Users,
  Target,
  FileSpreadsheet,
} from 'lucide-react';

interface ManagerKpiViewProps {
  tasks: Task[];
  taskItems: TaskItem[];
  allUsers: User[];
  allLines: MasterLine[];
  allMaterials: MasterMaterial[];
}

export const ManagerKpiView: React.FC<ManagerKpiViewProps> = ({
  tasks,
  taskItems,
  allUsers,
  allLines,
  allMaterials,
}) => {
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  const operators = allUsers.filter((u) => u.role === 'operator');

  // Filter items by shift
  const filteredItems = taskItems.filter((i) => {
    if (selectedShiftFilter === 'all') return true;
    const t = tasks.find((task) => task.id === i.task_id);
    return t && t.shift === parseInt(selectedShiftFilter);
  });

  const deliveredItems = filteredItems.filter((i) => i.status === 'DELIVERED');

  // KPI 1: Total Volume Delivered
  const totalVolumePcs = deliveredItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);

  // KPI 2: Average Delivery Lead Time
  const deliveryDurations = deliveredItems
    .map((i) => i.delivery_duration_sec)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const avgLeadTime =
    deliveryDurations.length > 0
      ? Math.round(deliveryDurations.reduce((a, b) => a + b, 0) / deliveryDurations.length)
      : 0;

  // KPI 3: Average Round-Trip Cycle Time (T3 - T1)
  const roundTrips = deliveredItems
    .map((i) => {
      if (i.delivery_duration_sec && i.return_duration_sec) {
        return i.delivery_duration_sec + i.return_duration_sec;
      }
      return i.delivery_duration_sec || 0;
    })
    .filter((d) => d > 0);
  const avgRoundTrip =
    roundTrips.length > 0
      ? Math.round(roundTrips.reduce((a, b) => a + b, 0) / roundTrips.length)
      : 0;

  // KPI 4: Fulfillment Rate (%)
  const totalRequestedItems = filteredItems.length;
  const fulfillmentRate =
    totalRequestedItems > 0
      ? Math.round((deliveredItems.length / totalRequestedItems) * 100)
      : 100;

  // KPI 5: On-Time Rate vs Target 5 minutes (300s)
  const onTimeDeliveries = deliveredItems.filter((i) => (i.delivery_duration_sec || 0) <= 300);
  const onTimeRate =
    deliveredItems.length > 0
      ? Math.round((onTimeDeliveries.length / deliveredItems.length) * 100)
      : 100;

  // Workload distribution by Line
  const lineWorkloads = allLines.map((line) => {
    const lineItems = deliveredItems.filter((i) => i.line_id === line.id);
    const lineQty = lineItems.reduce((acc, curr) => acc + curr.qty, 0);
    const percentage = totalVolumePcs > 0 ? Math.round((lineQty / totalVolumePcs) * 100) : 0;
    return {
      line,
      count: lineItems.length,
      volume: lineQty,
      percentage,
    };
  });

  // Operator Performance Ranking
  const operatorStats = operators.map((op) => {
    const opItems = deliveredItems.filter((i) => i.user_id === op.id);
    const opVolume = opItems.reduce((acc, curr) => acc + curr.qty, 0);
    const opDurations = opItems
      .map((i) => i.delivery_duration_sec)
      .filter((d): d is number => typeof d === 'number' && d > 0);
    const opAvgLeadTime =
      opDurations.length > 0
        ? Math.round(opDurations.reduce((a, b) => a + b, 0) / opDurations.length)
        : null;

    const opAutoFallback = opItems.filter((i) => i.departure_mode === 'AUTO_FALLBACK').length;

    return {
      operator: op,
      deliveredCount: opItems.length,
      volume: opVolume,
      avgLeadTime: opAvgLeadTime,
      autoFallbackCount: opAutoFallback,
    };
  }).sort((a, b) => b.deliveredCount - a.deliveredCount);

  // Export Executive Report (CSV)
  const handleExportCSV = () => {
    const headers = [
      'Task No',
      'Operator',
      'Shift',
      'Material',
      'Qty',
      'Satuan',
      'Rak',
      'Line Tujuan',
      'Status',
      'Departure Mode',
      'T1 Picked',
      'T2 Delivered',
      'Lead Time (Sec)',
      'Return (Sec)',
    ];

    const rows = deliveredItems.map((item) => {
      const t = tasks.find((task) => task.id === item.task_id);
      const u = allUsers.find((user) => user.id === item.user_id);
      const m = allMaterials.find((mat) => mat.id === item.material_id);
      const l = allLines.find((line) => line.id === item.line_id);
      return [
        t?.task_no || '',
        `"${u?.nama || ''}"`,
        t?.shift || '',
        `"${m?.deskripsi || item.material_id}"`,
        item.qty,
        item.satuan,
        item.rak_id,
        `"${l?.nama_line || ''}"`,
        item.status,
        item.departure_mode,
        item.picked_at || '',
        item.delivered_at || '',
        item.delivery_duration_sec || '',
        item.return_duration_sec || '',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ZEVA_Logistik_Executive_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              LOGISTICS MANAGER EXECUTIVE
            </span>
            <span className="text-xs text-slate-500 font-mono">KPI &amp; Lean Performance Evaluation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Executive KPI &amp; Operational Efficiency
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Analisis metrik lead time siklus material, tingkat ketercapaian target, dan evaluasi produktivitas Gemba.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedShiftFilter}
            onChange={(e) => setSelectedShiftFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium outline-none focus:border-emerald-500 focus:bg-white"
          >
            <option value="all">Semua Shift</option>
            <option value="1">Shift 1</option>
            <option value="2">Shift 2</option>
            <option value="3">Shift 3</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Laporan</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" /> Total Volume Delivered
            </span>
            <span className="text-emerald-700 font-mono text-[10px] font-bold">Pcs/Unit</span>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {totalVolumePcs.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">
            Dari {deliveredItems.length} transaksi suplai material
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Avg Lead Time (Kirim)
            </span>
            <span className="text-blue-700 font-mono text-[10px] font-bold">T2 - T1</span>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {formatDuration(avgLeadTime)}
          </div>
          <p className="text-[11px] text-slate-500">
            Standar Lean target: &le; 5 menit (300 dtk)
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-600" /> Round-Trip Cycle Time
            </span>
            <span className="text-amber-700 font-mono text-[10px] font-bold">T3 - T1</span>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {formatDuration(avgRoundTrip)}
          </div>
          <p className="text-[11px] text-slate-500">
            Total waktu ambil, antar ke line, dan balik ke rak
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-purple-600" /> On-Time Compliance
            </span>
            <span className="text-purple-700 font-mono text-[10px] font-bold">&le; 5 Menit</span>
          </div>
          <div className="text-3xl font-black text-emerald-600 font-mono">
            {onTimeRate}%
          </div>
          <p className="text-[11px] text-slate-500">
            Fulfillment rate: {fulfillmentRate}%
          </p>
        </div>
      </div>

      {/* Row 2: Distribution by Line + Operator Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workload by Line */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>DISTRIBUSI VOLUME SUPLAI PER LINE</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">Lean Flow</span>
          </div>

          <div className="space-y-3">
            {lineWorkloads.map(({ line, count, volume, percentage }) => (
              <div key={line.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 font-sans">{line.nama_line}</span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Area: {line.area}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-700 text-sm">{percentage}%</span>
                    <span className="text-[10px] text-slate-500 block">{volume} pcs</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(percentage, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operator Ranking Drill-Down */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>DRILL-DOWN PERFORMA INDIVIDU OPERATOR</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">{operatorStats.length} Operator</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3">Operator</th>
                  <th className="px-3 py-3">Delivered</th>
                  <th className="px-3 py-3">Total Qty</th>
                  <th className="px-3 py-3">Avg Lead Time</th>
                  <th className="px-3 py-3">Auto-Departure Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {operatorStats.map((stat, idx) => (
                  <tr key={stat.operator.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-sans font-bold text-slate-900">
                            {stat.operator.nama}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            NIK: {stat.operator.employee_id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-emerald-700 font-bold">
                      {stat.deliveredCount} item
                    </td>

                    <td className="px-3 py-3 text-slate-700">
                      {stat.volume} pcs
                    </td>

                    <td className="px-3 py-3">
                      <span className="text-amber-700 font-bold">
                        {stat.avgLeadTime ? formatDuration(stat.avgLeadTime) : '-'}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      {stat.autoFallbackCount > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {stat.autoFallbackCount}x Fallback
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">100% Manual Press</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
