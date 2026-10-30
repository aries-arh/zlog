import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Plus,
  HelpCircle,
  Table,
} from 'lucide-react';
import { sound } from '../utils/audio';
import {
  downloadTemplate,
  parseUploadedExcel,
  normalizeRakData,
  normalizeMaterialData,
  normalizeLineData,
  SAMPLE_RAK_ROWS,
  SAMPLE_MATERIAL_ROWS,
  SAMPLE_LINE_ROWS,
} from '../utils/excelImport';
import { MasterRak } from '../types';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'rak' | 'material' | 'line';
  existingRaks?: MasterRak[];
  onImportConfirm: (
    items: any[],
    mode: 'append' | 'replace'
  ) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  type,
  existingRaks = [],
  onImportConfirm,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [normalizedItems, setNormalizedItems] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSamplePreview, setShowSamplePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getEntityTitle = () => {
    switch (type) {
      case 'rak':
        return 'Master Rak Gudang';
      case 'material':
        return 'Master Material & Part';
      case 'line':
        return 'Master Line & QR Lokasi Proses';
    }
  };

  const getSampleData = () => {
    switch (type) {
      case 'rak':
        return SAMPLE_RAK_ROWS;
      case 'material':
        return SAMPLE_MATERIAL_ROWS;
      case 'line':
        return SAMPLE_LINE_ROWS;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    setValidationErrors([]);

    try {
      const rawRows = await parseUploadedExcel(selectedFile);
      setParsedRows(rawRows);

      if (rawRows.length === 0) {
        setValidationErrors(['File Excel/CSV tidak memiliki baris data (kosong).']);
        setNormalizedItems([]);
        setIsProcessing(false);
        return;
      }

      // Normalize depending on type
      let validResult: any[] = [];
      let errs: string[] = [];

      if (type === 'rak') {
        const res = normalizeRakData(rawRows);
        validResult = res.valid;
        errs = res.errors;
      } else if (type === 'material') {
        const res = normalizeMaterialData(rawRows, existingRaks);
        validResult = res.valid;
        errs = res.errors;
      } else {
        const res = normalizeLineData(rawRows);
        validResult = res.valid;
        errs = res.errors;
      }

      setNormalizedItems(validResult);
      setValidationErrors(errs);
      sound.playSuccessBeep();
    } catch {
      setValidationErrors([
        'Gagal membaca file. Pastikan format file adalah Excel (.xlsx, .xls) atau .csv yang valid.',
      ]);
      setNormalizedItems([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
      setFile(droppedFile);
      setIsProcessing(true);
      try {
        const rawRows = await parseUploadedExcel(droppedFile);
        setParsedRows(rawRows);
        let validResult: any[] = [];
        let errs: string[] = [];

        if (type === 'rak') {
          const res = normalizeRakData(rawRows);
          validResult = res.valid;
          errs = res.errors;
        } else if (type === 'material') {
          const res = normalizeMaterialData(rawRows, existingRaks);
          validResult = res.valid;
          errs = res.errors;
        } else {
          const res = normalizeLineData(rawRows);
          validResult = res.valid;
          errs = res.errors;
        }
        setNormalizedItems(validResult);
        setValidationErrors(errs);
        sound.playSuccessBeep();
      } catch {
        setValidationErrors(['Gagal memproses file yang di-drop. Gunakan format Excel/CSV.']);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleConfirm = () => {
    if (normalizedItems.length === 0) return;
    sound.playSuccessBeep();
    onImportConfirm(normalizedItems, importMode);
    onClose();
  };

  const sampleColumns = Object.keys(getSampleData()[0] || {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                Import Excel / CSV: {getEntityTitle()}
              </h3>
              <p className="text-xs text-slate-500">
                Isi data massal secara otomatis tanpa perlu input manual satu-persatu.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Step 1: Download Template */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Unduh Format File Contoh</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSamplePreview(!showSamplePreview)}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
              >
                <Table className="w-3.5 h-3.5" />
                <span>{showSamplePreview ? 'Sembunyikan Kolom' : 'Lihat Format Kolom'}</span>
              </button>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Gunakan template resmi di bawah ini agar judul kolom dan format data langsung dikenali oleh sistem:
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => downloadTemplate(type, 'xlsx')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTemplate(type, 'csv')}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download (.csv)</span>
              </button>
            </div>

            {/* Column Guide Preview */}
            {showSamplePreview && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Contoh Data &amp; Header Kolom:
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-mono font-bold border-b border-slate-200">
                      <tr>
                        {sampleColumns.map((col) => (
                          <th key={col} className="px-2.5 py-1.5 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {getSampleData().map((row, idx) => (
                        <tr key={idx}>
                          {sampleColumns.map((col) => (
                            <td key={col} className="px-2.5 py-1 text-slate-800 whitespace-nowrap">
                              {(row as Record<string, any>)[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Upload File Dropzone */}
          <div className="space-y-2">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Pilih atau Tarik File Excel / CSV</span>
            </span>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${
                file
                  ? 'border-emerald-400 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-12 h-12 mx-auto rounded-full bg-white border border-slate-200 flex items-center justify-center text-emerald-600 mb-2 shadow-xs">
                {file ? <FileCheck className="w-6 h-6 text-emerald-600" /> : <Upload className="w-6 h-6" />}
              </div>

              {file ? (
                <div>
                  <span className="font-bold text-slate-900 text-sm block">{file.name}</span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Klik untuk ganti file
                  </span>
                </div>
              ) : (
                <div>
                  <span className="font-bold text-slate-900 text-xs block">
                    Klik di sini untuk memilih file atau seret file ke area ini
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-1">
                    Mendukung format .xlsx, .xls, dan .csv
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Preview Parsed Data */}
          {normalizedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>Pratinjau Data Terdeteksi</span>
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-[10px]">
                  ✓ {normalizedItems.length} Data Siap Diimpor
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      {type === 'rak' && (
                        <>
                          <th className="px-3 py-2">Kode Rak</th>
                          <th className="px-3 py-2">Nama Rak</th>
                          <th className="px-3 py-2">Zona</th>
                        </>
                      )}
                      {type === 'material' && (
                        <>
                          <th className="px-3 py-2">Kode Material</th>
                          <th className="px-3 py-2">Deskripsi</th>
                          <th className="px-3 py-2">Satuan</th>
                          <th className="px-3 py-2">Kategori</th>
                        </>
                      )}
                      {type === 'line' && (
                        <>
                          <th className="px-3 py-2">Kode Line</th>
                          <th className="px-3 py-2">Nama Line</th>
                          <th className="px-3 py-2">QR Code</th>
                          <th className="px-3 py-2">Area</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {normalizedItems.slice(0, 15).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                        {type === 'rak' && (
                          <>
                            <td className="px-3 py-1.5 text-amber-700 font-bold">{item.kode_rak}</td>
                            <td className="px-3 py-1.5 font-sans text-slate-800">{item.nama_rak}</td>
                            <td className="px-3 py-1.5 font-sans text-slate-500">{item.zona}</td>
                          </>
                        )}
                        {type === 'material' && (
                          <>
                            <td className="px-3 py-1.5 text-blue-700 font-bold">{item.kode_material}</td>
                            <td className="px-3 py-1.5 font-sans text-slate-800">{item.deskripsi}</td>
                            <td className="px-3 py-1.5 text-slate-600">{item.satuan}</td>
                            <td className="px-3 py-1.5 font-sans text-slate-500">{item.kategori}</td>
                          </>
                        )}
                        {type === 'line' && (
                          <>
                            <td className="px-3 py-1.5 text-blue-700 font-bold">{item.kode_line}</td>
                            <td className="px-3 py-1.5 font-sans text-slate-800">{item.nama_line}</td>
                            <td className="px-3 py-1.5 text-amber-700 font-bold">{item.qr_code_proses}</td>
                            <td className="px-3 py-1.5 font-sans text-slate-500">{item.area}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {normalizedItems.length > 15 && (
                <p className="text-[10px] text-slate-500 italic text-right">
                  Menampilkan 15 dari total {normalizedItems.length} baris data.
                </p>
              )}
            </div>
          )}

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-800">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Catatan Validasi File:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                {validationErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 4: Import Mode Option */}
          {normalizedItems.length > 0 && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-xs block">
                Pilih Mode Penggabungan Data:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                    importMode === 'append'
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="mt-0.5 text-emerald-600"
                  />
                  <div>
                    <span className="block font-bold">Tambahkan (Merge &amp; Update)</span>
                    <span className="text-[10px] text-slate-500 font-normal block leading-tight">
                      Data baru digabungkan. Item dengan kode unik sama akan diperbarui.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                    importMode === 'replace'
                      ? 'bg-rose-50/70 border-rose-300 text-rose-950 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-0.5 text-rose-600"
                  />
                  <div>
                    <span className="block font-bold">Gantikan Semua (Replace All)</span>
                    <span className="text-[10px] text-slate-500 font-normal block leading-tight">
                      Menghapus data lama pada master ini dan menggantinya dengan data file.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={normalizedItems.length === 0 || isProcessing}
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-xs transition transform active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Memproses...'
                : `Konfirmasi & Impor ${normalizedItems.length} Data`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
