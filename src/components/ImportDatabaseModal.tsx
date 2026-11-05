import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Database,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Package,
  MapPin,
  Users,
  FileText,
  Truck,
  RotateCcw,
} from 'lucide-react';
import {
  User,
  MasterRak,
  MasterMaterial,
  MasterLine,
  Task,
  TaskItem,
  SpatiotemporalLogEvent,
} from '../types';
import { sound } from '../utils/audio';

export interface DatabaseBackupPayload {
  export_date?: string;
  version?: string;
  users?: User[];
  raks?: MasterRak[];
  materials?: MasterMaterial[];
  lines?: MasterLine[];
  tasks?: Task[];
  taskItems?: TaskItem[];
  logs?: SpatiotemporalLogEvent[];
}

interface ImportDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportConfirm: (
    data: DatabaseBackupPayload,
    mode: 'overwrite' | 'merge'
  ) => void;
}

export const ImportDatabaseModal: React.FC<ImportDatabaseModalProps> = ({
  isOpen,
  onClose,
  onImportConfirm,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<DatabaseBackupPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      sound.playErrorBeep();
      setParseError('Format file tidak didukung! Harap unggah file cadangan berekstensi .json.');
      setSelectedFile(null);
      setParsedData(null);
      return;
    }

    setSelectedFile(file);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        // Validasi minimal ada salah satu tabel sistem
        const hasValidTable =
          (Array.isArray(json.users) && json.users.length > 0) ||
          (Array.isArray(json.raks) && json.raks.length > 0) ||
          (Array.isArray(json.materials) && json.materials.length > 0) ||
          (Array.isArray(json.lines) && json.lines.length > 0) ||
          (Array.isArray(json.tasks) && json.tasks.length > 0) ||
          (Array.isArray(json.taskItems) && json.taskItems.length > 0) ||
          (Array.isArray(json.logs) && json.logs.length > 0);

        if (!hasValidTable) {
          throw new Error('File JSON tidak memiliki struktur database sistem ZEVA (tidak ditemukan tabel raks, materials, lines, users, atau logs).');
        }

        setParsedData(json);
        sound.playSuccessBeep();
      } catch (err: any) {
        sound.playErrorBeep();
        setParseError(`Gagal membaca file JSON: ${err.message || 'Format JSON tidak valid'}`);
        setParsedData(null);
      }
    };

    reader.onerror = () => {
      sound.playErrorBeep();
      setParseError('Terjadi kesalahan saat membaca file dari disk.');
      setParsedData(null);
    };

    reader.readAsText(file);
  };

  const handleConfirm = () => {
    if (!parsedData) return;

    setIsProcessing(true);
    try {
      onImportConfirm(parsedData, importMode);
      sound.playSuccessBeep();
      handleClose();
    } catch (err: any) {
      sound.playErrorBeep();
      setParseError(`Gagal memulihkan database: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError(null);
    setImportMode('overwrite');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const usersCount = Array.isArray(parsedData?.users) ? parsedData!.users.length : 0;
  const raksCount = Array.isArray(parsedData?.raks) ? parsedData!.raks.length : 0;
  const materialsCount = Array.isArray(parsedData?.materials) ? parsedData!.materials.length : 0;
  const linesCount = Array.isArray(parsedData?.lines) ? parsedData!.lines.length : 0;
  const tasksCount = Array.isArray(parsedData?.tasks) ? parsedData!.tasks.length : 0;
  const itemsCount = Array.isArray(parsedData?.taskItems) ? parsedData!.taskItems.length : 0;
  const logsCount = Array.isArray(parsedData?.logs) ? parsedData!.logs.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl border border-purple-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Import &amp; Restore Database (JSON)
              </h3>
              <p className="text-xs text-slate-500">
                Pulihkan master data, user, task troli, dan audit log sistem dari file cadangan JSON
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* File Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
              selectedFile
                ? 'border-purple-400 bg-purple-50/40 hover:bg-purple-50/70'
                : 'border-slate-300 hover:border-purple-400 bg-slate-50/60 hover:bg-purple-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-white text-purple-600 rounded-2xl border border-purple-200 shadow-xs">
                {selectedFile ? (
                  <FileJson className="w-8 h-8 text-purple-600" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  {selectedFile ? selectedFile.name : 'Pilih File Database Backup (.json)'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti file`
                    : 'Klik atau seret file JSON hasil Export Raw Database ke sini'}
                </p>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {parseError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Gagal Membaca File Database</p>
                <p className="text-[11px] text-rose-700">{parseError}</p>
              </div>
            </div>
          )}

          {/* Parsed Summary Card */}
          {parsedData && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>File Backup Valid &amp; Siap Dipulihkan</span>
                  </div>
                  {parsedData.version && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold">
                      Versi {parsedData.version}
                    </span>
                  )}
                </div>

                {parsedData.export_date && (
                  <p className="text-[11px] text-emerald-800">
                    Waktu Export:{' '}
                    <strong>{new Date(parsedData.export_date).toLocaleString('id-ID')}</strong>
                  </p>
                )}

                {/* Grid Ringskasan Data */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                  <div className="p-2.5 bg-white border border-emerald-200 rounded-lg flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">{raksCount}</div>
                      <div className="text-[10px] text-slate-500 font-sans">Master Rak</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-emerald-200 rounded-lg flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">{materialsCount}</div>
                      <div className="text-[10px] text-slate-500 font-sans">Material</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-emerald-200 rounded-lg flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">{linesCount}</div>
                      <div className="text-[10px] text-slate-500 font-sans">Line / Lokasi</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-emerald-200 rounded-lg flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">{usersCount}</div>
                      <div className="text-[10px] text-slate-500 font-sans">User Akun</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-emerald-200 rounded-lg flex items-center gap-2">
                    <Truck className="w-4 h-4 text-orange-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">{tasksCount}</div>
                      <div className="text-[10px] text-slate-500 font-sans">Data Task</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-emerald-200 rounded-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">{itemsCount}</div>
                      <div className="text-[10px] text-slate-500 font-sans">Item Troli</div>
                    </div>
                  </div>
                  <div className="col-span-2 p-2.5 bg-white border border-emerald-200 rounded-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">{logsCount}</div>
                      <div className="text-[10px] text-slate-500 font-sans">Audit Trail Logs</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Pemulihan / Import Options */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-900">
                  Pilih Metode Import / Restore:
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 bg-white border rounded-xl cursor-pointer hover:border-purple-400 transition">
                    <input
                      type="radio"
                      name="import_mode"
                      value="overwrite"
                      checked={importMode === 'overwrite'}
                      onChange={() => setImportMode('overwrite')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                        Ganti Seluruh Database (Overwrite / Restore Penuh)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Menimpa database yang ada dengan data dari file backup. Sangat direkomendasikan saat melakukan pemulihan bencana (*disaster recovery*) atau migrasi antar perangkat.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-white border rounded-xl cursor-pointer hover:border-purple-400 transition">
                    <input
                      type="radio"
                      name="import_mode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-blue-600" />
                        Gabungkan Data (Merge / Non-Destructive)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Menambahkan entri baru dari backup dan memperbarui entri dengan ID yang sama tanpa menghapus data master lain yang saat ini sudah ada.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {importMode === 'overwrite' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Peringatan:</strong> Mode Overwrite akan menimpa data master dan log sistem saat ini. Pastikan Anda telah membuat cadangan database jika diperlukan.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold transition text-xs"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!parsedData || isProcessing}
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-xs transition"
          >
            <Database className="w-4 h-4" />
            <span>
              {importMode === 'overwrite'
                ? 'Restore Seluruh Database'
                : 'Gabungkan Data ke Database'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
