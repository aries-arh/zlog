import React, { useState, useMemo } from 'react';
import {
  User,
  Task,
  TaskItem,
  MasterRak,
  MasterMaterial,
  MasterLine,
  SpatiotemporalLogEvent,
} from '../types';
import { formatDuration } from '../utils/storage';
import {
  Activity,
  AlertTriangle,
  Clock,
  Filter,
  Truck,
  CheckCircle2,
  Search,
  Zap,
} from 'lucide-react';

interface SpvMonitoringViewProps {
  tasks: Task[];
  taskItems: TaskItem[];
  allUsers: User[];
  allRaks: MasterRak[];
  allMaterials: MasterMaterial[];
  allLines: MasterLine[];
  logs: SpatiotemporalLogEvent[];
}

export const SpvMonitoringView: React.FC<SpvMonitoringViewProps> = ({
  tasks,
  taskItems,
  allUsers,
  allRaks,
  allMaterials,
  allLines,
  logs,
}) => {
  // Filters
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterLine, setFilterLine] = useState<string>('all');
  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'grid' | 'timeline'>('grid');

  const operators = allUsers.filter((u) => u.role === 'operator');

  const filteredItems = useMemo(() => {
    return taskItems.filter((item) => {
      const parentTask = tasks.find((t) => t.id === item.task_id);
      if (filterShift !== 'all' && parentTask && parentTask.shift !== parseInt(filterShift)) {
        return false;
      }
      if (filterLine !== 'all' && item.line_id !== filterLine) {
        return false;
      }
      if (filterOperator !== 'all' && item.user_id !== filterOperator) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mat = allMaterials.find((m) => m.id === item.material_id);
        const rak = allRaks.find((r) => r.id === item.rak_id);
        const user = allUsers.find((u) => u.id === item.user_id);
        const matchMat = mat?.kode_material.toLowerCase().includes(q) || mat?.deskripsi.toLowerCase().includes(q);
        const matchRak = rak?.kode_rak.toLowerCase().includes(q);
        const matchUser = user?.nama.toLowerCase().includes(q) || user?.employee_id.toLowerCase().includes(q);
        if (!matchMat && !matchRak && !matchUser) return false;
      }
      return true;
    });
  }, [taskItems, tasks, filterShift, filterLine, filterOperator, searchQuery, allMaterials, allRaks, allUsers]);

  // Metric calculations
  const activeTasksCount = tasks.filter((t) => t.status === 'active' || t.status === 'new').length;
  const inTransitCount = taskItems.filter((i) => i.status === 'IN_TRANSIT').length;
  const deliveredCount = taskItems.filter((i) => i.status === 'DELIVERED').length;

  const deliveredDurations = taskItems
    .filter((i) => i.status === 'DELIVERED' && i.delivery_duration_sec)
    .map((i) => i.delivery_duration_sec as number);

  const avgLeadTime =
    deliveredDurations.length > 0
      ? Math.round(deliveredDurations.reduce((a, b) => a + b, 0) / deliveredDurations.length)
      : 0;

  const delayAlertCount = taskItems.filter((i) => {
    if (i.status === 'IN_TRANSIT' && i.picked_at) {
      const elapsed = (Date.now() - new Date(i.picked_at).getTime()) / 1000;
      return elapsed > 300;
    }
    return (i.delivery_duration_sec || 0) > 360;
  }).length;

  const autoFallbackCount = taskItems.filter(
    (i) => i.departure_mode === 'AUTO_FALLBACK'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
              SUPERVISOR LOGISTIK (SPV)
            </span>
            <span className="text-xs text-slate-500 font-mono">Live Monitoring &amp; Spatiotemporal Control</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Monitoring Operasional &amp; Rute Gemba
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau status operator in-transit, deteksi delay/bottleneck rute, dan identifikasi flag Poka-Yoke Auto-Departure.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'grid'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Monitoring Grid
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'timeline'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Spatiotemporal Timeline
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-600" /> Task Aktif / In-Transit
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {activeTasksCount} <span className="text-xs font-normal text-slate-500">({inTransitCount} item jalan)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Items Delivered
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
            {deliveredCount}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Avg Delivery Lead Time
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {formatDuration(avgLeadTime)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Delay / Overtime Alert
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1 font-mono flex items-center gap-2">
            <span>{delayAlertCount}</span>
            {delayAlertCount > 0 && <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">&gt;5 mnt</span>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs col-span-2 md:col-span-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-600" /> Auto-Departure Fallbacks
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1 font-mono">
            {autoFallbackCount}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter:</span>
        </div>

        {/* Shift Filter */}
        <select
          value={filterShift}
          onChange={(e) => setFilterShift(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-blue-500 font-medium"
        >
          <option value="all">Semua Shift</option>
          <option value="1">Shift 1 (Pagi)</option>
          <option value="2">Shift 2 (Siang)</option>
          <option value="3">Shift 3 (Malam)</option>
        </select>

        {/* Line Filter */}
        <select
          value={filterLine}
          onChange={(e) => setFilterLine(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-blue-500 font-medium"
        >
          <option value="all">Semua Line Tujuan</option>
          {allLines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.kode_line} - {l.nama_line}
            </option>
          ))}
        </select>

        {/* Operator Filter */}
        <select
          value={filterOperator}
          onChange={(e) => setFilterOperator(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-blue-500 font-medium"
        >
          <option value="all">Semua Operator</option>
          {operators.map((op) => (
            <option key={op.id} value={op.id}>
              {op.employee_id} - {op.nama}
            </option>
          ))}
        </select>

        {/* Search Input */}
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari material, rak, atau operator..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 font-mono"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
        </div>
      </div>

      {/* Tab 1: Live Monitoring Grid */}
      {activeTab === 'grid' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>LIVE OPERATOR &amp; MATERIAL IN-TRANSIT GRID</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {filteredItems.length} Records Terfilter
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Operator</th>
                  <th className="px-4 py-3.5">Task No</th>
                  <th className="px-4 py-3.5">Material &amp; Rak</th>
                  <th className="px-4 py-3.5">Line Tujuan</th>
                  <th className="px-4 py-3.5">Status &amp; Flag</th>
                  <th className="px-4 py-3.5">T1 (Picked/Berangkat)</th>
                  <th className="px-4 py-3.5">T2 (Delivered)</th>
                  <th className="px-4 py-3.5">Lead Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada data transaksi yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const taskObj = tasks.find((t) => t.id === item.task_id);
                    const userObj = allUsers.find((u) => u.id === item.user_id);
                    const matObj = allMaterials.find((m) => m.id === item.material_id);
                    const rakObj = allRaks.find((r) => r.id === item.rak_id);
                    const lineObj = allLines.find((l) => l.id === item.line_id);

                    const isOvertime = (item.delivery_duration_sec || 0) > 300;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        {/* Operator */}
                        <td className="px-4 py-3.5">
                          <div className="font-sans font-bold text-slate-900">
                            {userObj?.nama || 'Unknown'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {userObj?.employee_id}
                          </div>
                        </td>

                        {/* Task No */}
                        <td className="px-4 py-3.5 text-amber-700 font-bold">
                          {taskObj?.task_no}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Shift {taskObj?.shift}
                          </div>
                        </td>

                        {/* Material & Rak */}
                        <td className="px-4 py-3.5">
                          <div className="text-slate-900 font-sans font-semibold">
                            {matObj?.kode_material} ({item.qty} {item.satuan})
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono">
                            Rak: <span className="text-amber-700 font-bold">{rakObj?.kode_rak}</span>
                          </div>
                        </td>

                        {/* Line Tujuan */}
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-blue-700 font-sans">
                            {lineObj?.kode_line}
                          </span>
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                            {lineObj?.nama_line}
                          </div>
                        </td>

                        {/* Status & Departure Mode */}
                        <td className="px-4 py-3.5 space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : item.status === 'IN_TRANSIT'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200 animate-pulse'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.departure_mode === 'AUTO_FALLBACK' && (
                            <span className="block text-[9px] font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                              ⚡ AUTO_FALLBACK
                            </span>
                          )}
                        </td>

                        {/* T1 */}
                        <td className="px-4 py-3.5 text-slate-700 text-[11px]">
                          {item.picked_at
                            ? new Date(item.picked_at).toLocaleTimeString('id-ID')
                            : '-'}
                        </td>

                        {/* T2 */}
                        <td className="px-4 py-3.5 text-slate-700 text-[11px]">
                          {item.delivered_at
                            ? new Date(item.delivered_at).toLocaleTimeString('id-ID')
                            : '-'}
                        </td>

                        {/* Lead Time */}
                        <td className="px-4 py-3.5">
                          {item.delivery_duration_sec ? (
                            <span
                              className={`font-bold ${
                                isOvertime ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {formatDuration(item.delivery_duration_sec)}
                              {isOvertime && (
                                <span className="block text-[9px] text-rose-600 uppercase font-bold">
                                  Delay (&gt;5m)
                                </span>
                              )}
                            </span>
                          ) : item.status === 'IN_TRANSIT' ? (
                            <span className="text-blue-600 font-semibold animate-pulse">
                              In-Transit...
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Chronological Spatiotemporal Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>SPATIOTEMPORAL EVENT LOG AUDIT TRAIL</span>
              </h2>
              <p className="text-xs text-slate-500">
                Catatan kronologis perjalanan operator (T1 Departure → T2 Delivery Scan → T3 Return).
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">{logs.length} Log Events</span>
          </div>

          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 max-h-[600px] overflow-y-auto pl-6">
            {logs.map((log) => {
              let dotColor = 'bg-slate-400';
              if (log.event_type === 'DELIVERED_CONFIRMED') dotColor = 'bg-emerald-500';
              if (log.event_type === 'DEPARTURE_AUTO_FALLBACK') dotColor = 'bg-rose-500 animate-ping';
              if (log.event_type === 'DEPARTURE_MANUAL') dotColor = 'bg-blue-500';
              if (log.event_type === 'MATERIAL_PICKED') dotColor = 'bg-amber-500';

              return (
                <div key={log.id} className="relative group text-xs space-y-1">
                  <span
                    className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full ${dotColor} border-2 border-white shadow-xs`}
                  />
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-700">
                          {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-slate-900">{log.operator_name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-700 font-mono">
                          {log.event_type}
                        </span>
                      </div>
                      {log.departure_mode && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            log.departure_mode === 'AUTO_FALLBACK'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {log.departure_mode}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 mt-1">{log.notes}</p>
                    {log.location_ref && (
                      <p className="text-[10px] text-amber-800 font-mono mt-0.5 font-semibold">
                        Lokasi Ref: {log.location_ref}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
