import React, { useState } from 'react';
import {
  User,
  Task,
  TaskItem,
  MasterRak,
  MasterMaterial,
  MasterLine,
} from '../types';
import { formatDuration } from '../utils/storage';
import {
  History,
  PlusCircle,
  Play,
  Clock,
  Boxes,
  CheckCircle2,
  Truck,
  ArrowRight,
  Eye,
  X,
  FileText,
} from 'lucide-react';

const formatTime = (isoString?: string | null) => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
};

const formatDate = (isoString?: string | null) => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return isoString;
  }
};

interface OperatorHistoryViewProps {
  user: User;
  tasks: Task[];
  taskItems: TaskItem[];
  allRaks: MasterRak[];
  allMaterials: MasterMaterial[];
  allLines: MasterLine[];
  allUsers?: User[];
  onOpenTask: (task: Task) => void;
  onCreateNewTask: () => void;
}

export const OperatorHistoryView: React.FC<OperatorHistoryViewProps> = ({
  user,
  tasks,
  taskItems,
  allRaks,
  allMaterials,
  allLines,
  allUsers = [],
  onOpenTask,
  onCreateNewTask,
}) => {
  const isAdmin = user.role === 'admin';
  const [selectedOperatorFilter, setSelectedOperatorFilter] = React.useState<string>(
    isAdmin ? 'all' : user.id
  );

  const operators = allUsers.filter((u) => u.role === 'operator');

  // Filter tasks
  const myTasks = tasks.filter((t) => {
    if (isAdmin && selectedOperatorFilter === 'all') return true;
    return t.user_id === (isAdmin ? selectedOperatorFilter : user.id);
  });
  const activeTask = myTasks.find((t) => t.status === 'active' || t.status === 'new');
  const completedTasks = myTasks.filter((t) => t.status === 'completed');

  // Calculate operator stats
  const myItems = taskItems.filter((i) => {
    if (isAdmin && selectedOperatorFilter === 'all') return true;
    return i.user_id === (isAdmin ? selectedOperatorFilter : user.id);
  });
  const deliveredItems = myItems.filter((i) => i.status === 'DELIVERED');
  const validDurations = deliveredItems
    .map((i) => i.delivery_duration_sec)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const avgLeadTime =
    validDurations.length > 0
      ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length)
      : null;

  // State untuk Modal Buka Detail Task
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);

  const detailItems = selectedTaskForDetail
    ? taskItems.filter((i) => i.task_id === selectedTaskForDetail.id)
    : [];
  const detailOwner = selectedTaskForDetail
    ? allUsers.find((u) => u.id === selectedTaskForDetail.user_id) || user
    : user;
  const totalQty = detailItems.reduce((acc, curr) => acc + curr.qty, 0);
  const deliveredCount = detailItems.filter((i) => i.status === 'DELIVERED').length;
  const taskDurations = detailItems
    .map((i) => i.delivery_duration_sec)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const avgTaskLeadTime =
    taskDurations.length > 0
      ? Math.round(taskDurations.reduce((a, b) => a + b, 0) / taskDurations.length)
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs uppercase font-extrabold px-2.5 py-0.5 rounded ${
                isAdmin ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {isAdmin ? 'ADMIN VIEW: MODUL OPERATOR' : 'OPERATOR GEMBA'}
            </span>
            <span className="font-mono text-xs text-slate-500 font-medium">ID: {user.employee_id}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {isAdmin ? 'Pusat Riwayat & Task Operator' : `Selamat Bertugas, ${user.nama}`}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Admin memiliki akses penuh untuk memeriksa, melanjutkan, atau membuat task bagi operator lapangan.'
              : 'Kelola penugasan material logistik Anda hari ini.'}
          </p>

          {isAdmin && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-800">Pilih Operator:</span>
              <select
                value={selectedOperatorFilter}
                onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                className="bg-slate-50 border border-purple-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium outline-none focus:border-purple-400"
              >
                <option value="all">Semua Operator ({tasks.length} total task)</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.employee_id} - {op.nama}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTask ? (
            <button
              onClick={() => onOpenTask(activeTask)}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition transform active:scale-95"
            >
              <Play className="w-4 h-4" />
              <span>LANJUTKAN TASK AKTIF ({activeTask.task_no})</span>
            </button>
          ) : (
            <button
              onClick={onCreateNewTask}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ MULAI TASK BARU</span>
            </button>
          )}

          {activeTask && (
            <button
              onClick={onCreateNewTask}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-200 transition"
            >
              <PlusCircle className="w-4 h-4 text-amber-600" />
              <span>+ Buat Task Lain</span>
            </button>
          )}
        </div>
      </div>

      {/* Operator Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-amber-600" /> Total Items Dikirim
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {deliveredItems.length} <span className="text-xs font-normal text-slate-500">item</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" /> Rata-rata Lead Time
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {avgLeadTime ? formatDuration(avgLeadTime) : '-'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Task Selesai
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {completedTasks.length} <span className="text-xs font-normal text-slate-500">task</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-purple-600" /> Task Aktif Saat Ini
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {activeTask ? '1 Berjalan' : '0'}
          </div>
        </div>
      </div>

      {/* Active Task Hero Card if exists */}
      {activeTask && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                TASK AKTIF SEDANG BERJALAN
              </span>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-500 text-white px-2 py-0.5 rounded shadow-xs">
              Shift {activeTask.shift}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-slate-900 font-mono">
                {activeTask.task_no}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Dimulai: {new Date(activeTask.start_time).toLocaleTimeString('id-ID')}
              </p>
            </div>
            <button
              onClick={() => onOpenTask(activeTask)}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <span>BUKA PANEL INPUT OPERATOR</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <span>RIWAYAT TASK OPERATOR</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {myTasks.length} Total Task
          </span>
        </div>

        <div className="space-y-3">
          {myTasks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              Belum ada task. Tekan tombol &quot;Mulai Task Baru&quot; di atas untuk memulai penugasan.
            </p>
          ) : (
            myTasks.map((t) => {
              const itemsForTask = taskItems.filter((i) => i.task_id === t.id);
              const taskOwner = allUsers.find((u) => u.id === t.user_id);
              return (
                <div
                  key={t.id}
                  className="p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {t.task_no}
                      </span>
                      {isAdmin && taskOwner && (
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {taskOwner.nama}
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-white text-slate-700 border border-slate-200">
                        Shift {t.shift}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          t.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForDetail(t)}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 flex items-center gap-1.5 border border-amber-200 shadow-2xs transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-600" />
                        <span>Buka Detail</span>
                      </button>
                      {(t.status === 'new' || t.status === 'active') && (
                        <button
                          type="button"
                          onClick={() => onOpenTask(t)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white flex items-center gap-1 shadow-2xs transition cursor-pointer"
                          title="Buka form input material untuk task ini"
                        >
                          <span>Input Task</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Task Items Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {itemsForTask.map((item) => {
                      const mat = allMaterials.find((m) => m.id === item.material_id);
                      const rak = allRaks.find((r) => r.id === item.rak_id);
                      const line = allLines.find((l) => l.id === item.line_id);

                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-amber-700">
                              {rak?.kode_rak}
                            </span>
                            <span className="text-slate-500 font-mono">
                              {line?.kode_line}
                            </span>
                          </div>
                          <p className="text-slate-800 truncate font-semibold">
                            {mat?.kode_material} ({item.qty} {item.satuan})
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span className="capitalize">{item.status.toLowerCase()}</span>
                            {item.delivery_duration_sec && (
                              <span className="text-emerald-700 font-bold">
                                LT: {formatDuration(item.delivery_duration_sec)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL BUKA DETAIL TASK OPERATOR */}
      {selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base font-mono">
                      {selectedTaskForDetail.task_no}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        selectedTaskForDetail.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {selectedTaskForDetail.status}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      Shift {selectedTaskForDetail.shift}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Operator: <strong className="text-slate-800">{detailOwner?.nama || user.nama}</strong> ({detailOwner?.employee_id || user.employee_id}) • Tanggal: {formatDate(selectedTaskForDetail.tanggal || selectedTaskForDetail.start_time)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskForDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Total Material</div>
                  <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                    {detailItems.length} <span className="text-xs font-normal text-slate-500">Part</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Total Kuantitas</div>
                  <div className="text-lg font-mono font-bold text-amber-700 mt-0.5">
                    {totalQty} <span className="text-xs font-normal text-slate-500">Pcs</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Status Selesai</div>
                  <div className="text-lg font-mono font-bold text-emerald-700 mt-0.5">
                    {deliveredCount}/{detailItems.length}{' '}
                    <span className="text-xs font-normal text-slate-500">Terkirim</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Avg Lead Time</div>
                  <div className="text-lg font-mono font-bold text-blue-700 mt-0.5">
                    {avgTaskLeadTime ? formatDuration(avgTaskLeadTime) : '-'}
                  </div>
                </div>
              </div>

              {/* Time Info Bar */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Mulai:{' '}
                    <strong className="font-mono">
                      {formatTime(selectedTaskForDetail.start_time)}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Selesai:{' '}
                    <strong className="font-mono">
                      {formatTime(selectedTaskForDetail.end_time)}
                    </strong>
                  </span>
                </div>
                <div className="text-slate-600 font-mono text-[11px]">
                  ID Task: {selectedTaskForDetail.id}
                </div>
              </div>

              {/* Rincian Material List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-amber-600" />
                    <span>Rincian Pengantaran Material ({detailItems.length} Item)</span>
                  </h4>
                </div>

                {detailItems.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                    Belum ada material yang diinput pada task ini.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {detailItems.map((item, index) => {
                      const mat = allMaterials.find((m) => m.id === item.material_id);
                      const rak = allRaks.find((r) => r.id === item.rak_id);
                      const line = allLines.find((l) => l.id === item.line_id);

                      let statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                      let statusText = 'Siap di Troli';
                      if (item.status === 'IN_TRANSIT') {
                        statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
                        statusText = 'Dalam Perjalanan';
                      } else if (item.status === 'DELIVERED') {
                        statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                        statusText = 'Tiba & Terverifikasi';
                      }

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                                {mat?.kode_material || item.material_id}
                              </span>
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300">
                                {item.qty} {item.satuan}
                              </span>
                              {mat?.deskripsi && (
                                <span className="text-xs text-slate-500 font-medium hidden sm:inline truncate max-w-[200px]">
                                  • {mat.deskripsi}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}
                            >
                              {statusText}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                                Rak Asal (Gudang)
                              </span>
                              <span className="font-mono font-bold text-amber-700">
                                {rak?.kode_rak || '-'}
                              </span>
                              <span className="text-slate-600 block text-[11px] truncate">
                                {rak?.nama_rak} ({rak?.zona})
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                                Line / Proses Tujuan
                              </span>
                              <span className="font-mono font-bold text-blue-700">
                                {line?.kode_line || '-'}
                              </span>
                              <span className="text-slate-600 block text-[11px] truncate">
                                {line?.nama_line} ({line?.area})
                              </span>
                            </div>
                          </div>

                          {/* Gemba Timing Breakdown */}
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-700">
                            <div className="flex items-center gap-3">
                              <span>
                                T1 (Ambil):{' '}
                                <strong>
                                  {formatTime(item.picked_at || item.last_material_scanned_at)}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                T2 (Tiba):{' '}
                                <strong className="text-emerald-700">
                                  {formatTime(item.delivered_at)}
                                </strong>
                              </span>
                              {item.return_at && (
                                <>
                                  <span>•</span>
                                  <span>
                                    T3 (Kembali):{' '}
                                    <strong>{formatTime(item.return_at)}</strong>
                                  </span>
                                </>
                              )}
                            </div>
                            {item.delivery_duration_sec && (
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Lead Time: {formatDuration(item.delivery_duration_sec)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTaskForDetail(null)}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold transition text-xs cursor-pointer"
              >
                Tutup
              </button>

              {(selectedTaskForDetail.status === 'new' || selectedTaskForDetail.status === 'active') && (
                <button
                  type="button"
                  onClick={() => {
                    const t = selectedTaskForDetail;
                    setSelectedTaskForDetail(null);
                    onOpenTask(t);
                  }}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm transition transform active:scale-95 cursor-pointer"
                >
                  <span>Lanjutkan Input Task</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
