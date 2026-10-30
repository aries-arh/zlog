import React from 'react';
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
} from 'lucide-react';

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
                        onClick={() => onOpenTask(t)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-xs font-semibold text-amber-700 flex items-center gap-1 border border-slate-200 shadow-2xs"
                      >
                        <span>Buka Detail</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
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
    </div>
  );
};
