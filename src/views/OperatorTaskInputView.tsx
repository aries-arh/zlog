import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  MasterRak,
  MasterMaterial,
  MasterLine,
  Task,
  TaskItem,
  DepartureMode,
} from '../types';
import { sound } from '../utils/audio';
import { formatDuration } from '../utils/storage';
import { ScannerModal } from '../components/ScannerModal';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Send,
  Timer,
  Trash2,
  Scan,
  ArrowLeft,
  Truck,
  RotateCcw,
  Check,
  PackageCheck,
} from 'lucide-react';

interface OperatorTaskInputViewProps {
  user: User;
  task: Task;
  allRaks: MasterRak[];
  allMaterials: MasterMaterial[];
  allLines: MasterLine[];
  taskItems: TaskItem[];
  onAddTaskItem: (item: Omit<TaskItem, 'id'>) => void;
  onRemoveTaskItem: (itemId: string) => void;
  onConfirmDeparture: (mode: DepartureMode) => void;
  onVerifyDestinationScan: (scannedQr: string) => {
    success: boolean;
    matchedCount: number;
    targetLineName?: string;
    depMode?: DepartureMode;
    leadTimeSec?: number;
    errorMessage?: string;
  };
  onReturnToRack: () => void;
  onCompleteTask: () => void;
  onBackToHistory: () => void;
}

export const OperatorTaskInputView: React.FC<OperatorTaskInputViewProps> = ({
  user,
  task,
  allRaks,
  allMaterials,
  allLines,
  taskItems,
  onAddTaskItem,
  onRemoveTaskItem,
  onConfirmDeparture,
  onVerifyDestinationScan,
  onReturnToRack,
  onCompleteTask,
  onBackToHistory,
}) => {
  // Step 1: Rak Asal
  const [selectedRakId, setSelectedRakId] = useState<string>('');
  const [rakInput, setRakInput] = useState<string>('');
  const [rakValid, setRakValid] = useState<boolean>(false);

  // Step 2: Material
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [materialInput, setMaterialInput] = useState<string>('');
  const [materialValid, setMaterialValid] = useState<boolean>(false);

  // Step 3: Qty & Target Line
  const [qty, setQty] = useState<number>(10);
  const [selectedLineId, setSelectedLineId] = useState<string>('');

  // Scanner Modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'rak' | 'material' | 'destination'>('rak');

  // Departure Countdown Timer (Auto-Confirm 5s)
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<any>(null);

  // Completion Verification Modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [destScanInput, setDestScanInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    matchedCount: number;
    targetLineName?: string;
    depMode?: DepartureMode;
    leadTimeSec?: number;
    errorMessage?: string;
  } | null>(null);

  // References for hands-free auto advance
  const materialInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  // Filter items in trolley (current task items)
  const itemsInTrolley = taskItems.filter((item) => item.task_id === task.id);
  const pickedItems = itemsInTrolley.filter((item) => item.status === 'PICKED');
  const inTransitItems = itemsInTrolley.filter((item) => item.status === 'IN_TRANSIT');
  const deliveredItems = itemsInTrolley.filter((item) => item.status === 'DELIVERED');

  // Set default line if none selected
  useEffect(() => {
    if (allLines.length > 0 && !selectedLineId) {
      setSelectedLineId(allLines[0].id);
    }
  }, [allLines, selectedLineId]);

  // Rak validation on change
  const handleRakChange = (val: string) => {
    setRakInput(val);
    const clean = val.trim().toUpperCase();
    const found = allRaks.find(
      (r) => r.kode_rak.toUpperCase() === clean || r.id === val
    );
    if (found) {
      setSelectedRakId(found.id);
      setRakValid(true);
      sound.playSuccessBeep();
      setTimeout(() => materialInputRef.current?.focus(), 150);
    } else {
      setSelectedRakId('');
      setRakValid(false);
    }
  };

  // Material validation on change
  const handleMaterialChange = (val: string) => {
    setMaterialInput(val);
    const clean = val.trim().toUpperCase();
    const found = allMaterials.find(
      (m) => m.kode_material.toUpperCase() === clean || m.id === val
    );
    if (found) {
      setSelectedMaterialId(found.id);
      setMaterialValid(true);
      sound.playSuccessBeep();
      if (!selectedRakId && found.default_rak_id) {
        const defaultRak = allRaks.find((r) => r.id === found.default_rak_id);
        if (defaultRak) {
          setSelectedRakId(defaultRak.id);
          setRakInput(defaultRak.kode_rak);
          setRakValid(true);
        }
      }
      setTimeout(() => qtyInputRef.current?.focus(), 150);
    } else {
      setSelectedMaterialId('');
      setMaterialValid(false);
    }
  };

  // Add Material to Trolley
  const handleAddMaterial = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedRakId || !selectedMaterialId || qty <= 0 || !selectedLineId) {
      sound.playErrorBeep();
      alert('Harap lengkapi Scan Rak, Scan Material, Qty, dan Line Tujuan!');
      return;
    }

    const materialObj = allMaterials.find((m) => m.id === selectedMaterialId);
    if (!materialObj) return;

    sound.playSuccessBeep();
    onAddTaskItem({
      task_id: task.id,
      user_id: user.id,
      rak_id: selectedRakId,
      material_id: selectedMaterialId,
      qty,
      satuan: materialObj.satuan,
      line_id: selectedLineId,
      status: 'PICKED',
      departure_mode: 'MANUAL_PRESS',
      last_material_scanned_at: new Date().toISOString(),
      picked_at: null,
      delivered_at: null,
      return_at: null,
      delivery_duration_sec: null,
      return_duration_sec: null,
    });

    setMaterialInput('');
    setSelectedMaterialId('');
    setMaterialValid(false);
    setQty(10);
    setTimeout(() => materialInputRef.current?.focus(), 100);

    startDepartureCountdown();
  };

  const startDepartureCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(5);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          onConfirmDeparture('MANUAL_PRESS');
          return null;
        }
        sound.playTick();
        return prev - 1;
      });
    }, 1000);
  };

  const handleManualDeparture = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    sound.playSuccessBeep();
    onConfirmDeparture('MANUAL_PRESS');
  };

  const handleCancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  const handleDestinationScanSubmit = (qrCodeToVerify: string) => {
    const res = onVerifyDestinationScan(qrCodeToVerify.trim());
    setVerificationResult(res);
    if (res.success) {
      sound.playDeliveryConfirmedChime();
    } else {
      sound.playErrorBeep();
    }
  };

  const currentRakObj = allRaks.find((r) => r.id === selectedRakId);
  const currentMaterialObj = allMaterials.find((m) => m.id === selectedMaterialId);
  const currentLineObj = allLines.find((l) => l.id === selectedLineId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Gemba Status Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHistory}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
            title="Kembali ke Dashboard History"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">History Task</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded bg-amber-500 text-white">
                PANEL INPUT OPERATOR
              </span>
              <span className="font-mono font-bold text-slate-900 text-base">
                {task.task_no}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Shift {task.shift}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Operator: <strong className="text-slate-800">{user.nama}</strong> ({user.employee_id}) • Status:{' '}
              <span className="text-amber-700 uppercase font-bold">{task.status}</span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setVerificationResult(null);
              setDestScanInput('');
              setShowCompletionModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm transition transform active:scale-95"
          >
            <PackageCheck className="w-4 h-4" />
            <span>VERIFIKASI SCAN DI LOKASI PROSES</span>
          </button>

          {deliveredItems.length > 0 && pickedItems.length === 0 && inTransitItems.length === 0 && (
            <button
              onClick={onCompleteTask}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Selesaikan Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Form Input (Left) + Troli Task (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: 3-Step Gemba Touchscreen Friendly Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-600" />
              <span>FORM PENGAMBILAN MATERIAL GUDANG</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Touchscreen Friendly</span>
          </div>

          <form onSubmit={handleAddMaterial} className="space-y-4">
            {/* STEP 1: SCAN RAK ASAL */}
            <div
              className={`p-4 rounded-xl border-2 transition-all ${
                rakValid
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs">
                    1
                  </span>
                  <span>STEP 1: SCAN RAK ASAL</span>
                </label>
                {rakValid && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={rakInput}
                  onChange={(e) => handleRakChange(e.target.value)}
                  placeholder="Scan Barcode Rak (e.g. RAK-A12)..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setScannerMode('rak');
                    setScannerOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Scan className="w-4 h-4 text-amber-600" />
                  <span>Scan</span>
                </button>
              </div>

              {/* Quick Rak selector chips */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {allRaks.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRakChange(r.kode_rak)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                      selectedRakId === r.id
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {r.kode_rak}
                  </button>
                ))}
              </div>
              {currentRakObj && (
                <p className="text-xs text-emerald-800 mt-2 font-medium">
                  ✓ {currentRakObj.nama_rak} ({currentRakObj.zona})
                </p>
              )}
            </div>

            {/* STEP 2: SCAN MATERIAL */}
            <div
              className={`p-4 rounded-xl border-2 transition-all ${
                materialValid
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs">
                    2
                  </span>
                  <span>STEP 2: SCAN KODE MATERIAL</span>
                </label>
                {materialValid && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  ref={materialInputRef}
                  type="text"
                  value={materialInput}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  placeholder="Scan Barcode Material (e.g. MAT-001)..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setScannerMode('material');
                    setScannerOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Scan className="w-4 h-4 text-amber-600" />
                  <span>Scan</span>
                </button>
              </div>

              {/* Quick Material selector chips */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {allMaterials.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMaterialChange(m.kode_material)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                      selectedMaterialId === m.id
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {m.kode_material}
                  </button>
                ))}
              </div>
              {currentMaterialObj && (
                <div className="text-xs text-emerald-800 mt-2 font-medium flex items-center justify-between">
                  <span>✓ {currentMaterialObj.deskripsi}</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-semibold">
                    {currentMaterialObj.satuan} • {currentMaterialObj.kategori}
                  </span>
                </div>
              )}
            </div>

            {/* STEP 3: JUMLAH & LINE TUJUAN */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs">
                  3
                </span>
                <span>STEP 3: JUMLAH (QTY) &amp; LINE/PROSES TUJUAN</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-semibold">
                    Qty ({currentMaterialObj?.satuan || 'Pcs'})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 5))}
                      className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-lg font-bold text-slate-800 border border-slate-200 flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      ref={qtyInputRef}
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 bg-white border border-slate-300 rounded-xl py-2 px-3 text-center text-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setQty((q) => q + 5)}
                      className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-lg font-bold text-slate-800 border border-slate-200 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-semibold">
                    Target Line / Proses Tujuan
                  </label>
                  <select
                    value={selectedLineId}
                    onChange={(e) => setSelectedLineId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    {allLines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.kode_line} - {l.nama_line}
                      </option>
                    ))}
                  </select>
                  {currentLineObj && (
                    <span className="text-[10px] text-amber-700 font-mono mt-1 block font-semibold">
                      Target QR: {currentLineObj.qr_code_proses}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Button Tambah Material */}
            <button
              type="submit"
              disabled={!selectedRakId || !selectedMaterialId}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-base flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition transform active:scale-[0.98]"
            >
              <span>+ TAMBAH MATERIAL KE TROLI (ENTER)</span>
            </button>
          </form>
        </div>

        {/* Right Column: Troli Task & Departure Controller */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-600" />
                  <span>DAFTAR MATERIAL DALAM TROLI</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Total {itemsInTrolley.length} item dalam task ini
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {pickedItems.length} Diambil | {inTransitItems.length} Jalan | {deliveredItems.length} Tiba
              </span>
            </div>

            {/* List of items */}
            <div className="py-3 space-y-2.5 flex-1 max-h-[380px] overflow-y-auto">
              {itemsInTrolley.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  <Boxes className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
                  Troli masih kosong. Scan Rak &amp; Material di samping untuk mulai memuat.
                </div>
              ) : (
                itemsInTrolley.map((item, idx) => {
                  const rak = allRaks.find((r) => r.id === item.rak_id);
                  const mat = allMaterials.find((m) => m.id === item.material_id);
                  const line = allLines.find((l) => l.id === item.line_id);

                  let badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                  if (item.status === 'IN_TRANSIT') badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
                  if (item.status === 'DELIVERED') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-700">
                            #{idx + 1} {rak?.kode_rak}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-slate-900 truncate">
                            {mat?.kode_material} ({item.qty} {item.satuan})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">
                          {mat?.deskripsi}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[10px] text-slate-600 font-mono">
                            Line: {line?.nama_line || line?.kode_line}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badgeColor}`}>
                            {item.status}
                          </span>
                          {item.departure_mode === 'AUTO_FALLBACK' && (
                            <span className="text-[9px] font-bold px-1 rounded bg-rose-100 text-rose-700 border border-rose-200">
                              AUTO_FALLBACK
                            </span>
                          )}
                        </div>
                      </div>

                      {item.status === 'PICKED' && (
                        <button
                          type="button"
                          onClick={() => onRemoveTaskItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                          title="Batal / Hapus Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Departure Controller Card */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              {pickedItems.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-amber-700" />
                      Auto-Confirm Departure:
                    </span>
                    {countdown !== null ? (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-white animate-pulse">
                        Otomatis Berangkat dlm {countdown}s
                      </span>
                    ) : (
                      <button
                        onClick={startDepartureCountdown}
                        className="text-[11px] text-amber-700 font-semibold hover:underline"
                      >
                        Mulai Timer 5s
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-amber-900/80">
                    Sistem mendeteksi {pickedItems.length} item siap di troli. Tekan konfirmasi atau biarkan timer berjalan saat operator mulai jalan.
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleManualDeparture}
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <Send className="w-4 h-4" />
                      <span>✓ KONFIRMASI BERANGKAT (T1)</span>
                    </button>
                    {countdown !== null && (
                      <button
                        type="button"
                        onClick={handleCancelCountdown}
                        className="px-3 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs"
                        title="Batal Timer Auto-Confirm"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* In Transit Alert Card */}
              {inTransitItems.length > 0 && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-blue-700 animate-bounce" />
                      {inTransitItems.length} Item Sedang Menuju Line
                    </span>
                    <span className="text-[10px] font-mono text-blue-700 font-semibold">T1 Recorded</span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Bawa troli ke line tujuan. Sesampainya di line, wajib scan <strong>QR Code Fisik Line</strong> untuk mencatat stempel waktu T2.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setVerificationResult(null);
                      setDestScanInput('');
                      setShowCompletionModal(true);
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Buka Scanner Lokasi Line Tujuan</span>
                  </button>
                </div>
              )}

              {/* Delivered Summary Card & Return to Rack */}
              {deliveredItems.length > 0 && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {deliveredItems.length} Item Berhasil Diserahkan (T2)
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Material telah diterima di lini produksi. Operator kembali ke area rak gudang untuk siklus selanjutnya.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playSuccessBeep();
                      onReturnToRack();
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>✓ SELESAI &amp; KEMBALI KE RAK (CATAT T3)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 6.2: POP-UP COMPLETION (VERIFIKASI SCAN TUJUAN) */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    MODAL VERIFIKASI SELESAI KIRIM
                  </h3>
                  <p className="text-xs text-amber-700 font-mono font-medium">
                    Mandatory Line Completion Scan • Poka-Yoke Verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-slate-900">
                  SILAKAN SCAN QR CODE NAMA PROSES DI LOKASI TUJUAN
                </p>
                <p className="text-xs text-slate-500">
                  Scan QR code fisik yang tertempel di stasiun kerja/line untuk memvalidasi penyerahan material.
                </p>
              </div>

              {/* Form Input Barcode / QR */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (destScanInput.trim()) {
                    handleDestinationScanSubmit(destScanInput);
                  }
                }}
                className="space-y-3"
              >
                <div className="flex gap-2">
                  <input
                    ref={destInputRef}
                    autoFocus
                    type="text"
                    value={destScanInput}
                    onChange={(e) => setDestScanInput(e.target.value)}
                    placeholder="Scan QR Lokasi (e.g. QR-LINE-01-ASSY)..."
                    className="flex-1 bg-slate-50 border-2 border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-mono text-slate-900 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-sm"
                  >
                    Verifikasi
                  </button>
                </div>

                {/* Quick Process Line QR Simulator chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Quick-Scan QR Lokasi Line Fisik:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {allLines.map((line) => (
                      <button
                        key={line.id}
                        type="button"
                        onClick={() => {
                          setDestScanInput(line.qr_code_proses);
                          handleDestinationScanSubmit(line.qr_code_proses);
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition group"
                      >
                        <span className="text-[11px] font-mono font-bold text-amber-700 block">
                          {line.qr_code_proses}
                        </span>
                        <span className="text-[10px] text-slate-700 truncate block">
                          {line.nama_line}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              {/* Verification Result Feedback */}
              {verificationResult && (
                <div
                  className={`p-4 rounded-xl border-2 space-y-2 animate-in zoom-in-95 duration-150 ${
                    verificationResult.success
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                      : 'bg-rose-50 border-rose-500 text-rose-950'
                  }`}
                >
                  {verificationResult.success ? (
                    <>
                      <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>[✓] Material Berhasil Diserahkan!</span>
                      </div>
                      <div className="text-xs space-y-1 font-mono text-slate-700 pt-1">
                        <p>• Lokasi Valid: <strong>{verificationResult.targetLineName}</strong></p>
                        <p>• Item Terverifikasi: <strong>{verificationResult.matchedCount} Item</strong></p>
                        <p>
                          • Mode Keberangkatan:{' '}
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              verificationResult.depMode === 'AUTO_FALLBACK'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            [{verificationResult.depMode}]
                          </span>
                          {verificationResult.depMode === 'AUTO_FALLBACK' && ' (Poka-Yoke: From Last Scan)'}
                        </p>
                        <p>
                          • Delivery Lead Time: <strong>{formatDuration(verificationResult.leadTimeSec || 0)}</strong>
                        </p>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCompletionModal(false);
                            sound.playSuccessBeep();
                            onReturnToRack();
                          }}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>✓ SELESAI &amp; KEMBALI KE RAK (CATAT T3)</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                        <span>LOKASI SALAH! VALIDASI DITOLAK</span>
                      </div>
                      <p className="text-xs text-rose-800">
                        {verificationResult.errorMessage ||
                          'QR Code yang di-scan tidak sesuai dengan target pengiriman item aktif dalam troli ini.'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Pastikan Anda berada di line tujuan yang sesuai dengan daftar di troli Anda.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barcode / QR Scanner Modal for Step 1 & Step 2 */}
      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          if (scannerMode === 'rak') {
            handleRakChange(code);
          } else if (scannerMode === 'material') {
            handleMaterialChange(code);
          }
        }}
        title={scannerMode === 'rak' ? 'Scan Barcode Rak Asal' : 'Scan Barcode Material'}
        expectedType={scannerMode === 'destination' ? 'line' : scannerMode}
        suggestedCodes={
          scannerMode === 'rak'
            ? allRaks.map((r) => ({ label: r.nama_rak, code: r.kode_rak, desc: r.zona }))
            : allMaterials.map((m) => ({ label: m.deskripsi, code: m.kode_material, desc: m.satuan }))
        }
      />
    </div>
  );
};
