import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Trash2,
  Scan,
  ArrowLeft,
  Truck,
  RotateCcw,
  Check,
  PackageCheck,
  Lock,
  RefreshCw,
  Zap,
  ArrowRight,
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
  // Step 1: Rak Asal (persisted per task so remount/navigation never forces re-scan)
  const [selectedRakId, setSelectedRakId] = useState<string>('');
  const [rakInput, setRakInput] = useState<string>('');
  const [rakValid, setRakValid] = useState<boolean>(false);
  const [userUnlockedRak, setUserUnlockedRak] = useState<boolean>(false);

  // Step 2: Material
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [materialInput, setMaterialInput] = useState<string>('');
  const [materialValid, setMaterialValid] = useState<boolean>(false);

  // Step 3: Qty & Target Line
  const [qty, setQty] = useState<number>(10);
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [lineInput, setLineInput] = useState<string>('');
  const [lineValid, setLineValid] = useState<boolean>(false);
  const [showLineDropdown, setShowLineDropdown] = useState<boolean>(false);

  // Multi-Pick Speed Modes (1 Rak -> Banyak Material -> Banyak Line)
  const [autoAddOnLine, setAutoAddOnLine] = useState<boolean>(true);
  const [skipQtyOnScan, setSkipQtyOnScan] = useState<boolean>(false);
  const [lastAddedBanner, setLastAddedBanner] = useState<{
    materialCode: string;
    qty: number;
    satuan: string;
    lineName: string;
  } | null>(null);

  // Scanner Modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'rak' | 'material' | 'destination'>('rak');


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
  const rakInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const lineInputRef = useRef<HTMLInputElement>(null);
  const lineDropdownRef = useRef<HTMLDivElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  const rakStorageKey = `zeva_locked_rak_${task.id}`;

  // Helper to lock a Rak consistently across state & sessionStorage
  const lockRak = (rak: MasterRak) => {
    setSelectedRakId(rak.id);
    setRakInput(rak.kode_rak);
    setRakValid(true);
    setUserUnlockedRak(false);
    try {
      sessionStorage.setItem(rakStorageKey, rak.id);
    } catch {
      // ignore storage errors
    }
  };

  // Auto-restore locked Rack for current task (from sessionStorage or latest item in trolley)
  useEffect(() => {
    setUserUnlockedRak(false);
    let savedRakId: string | null = null;
    try {
      savedRakId = sessionStorage.getItem(rakStorageKey);
    } catch {
      savedRakId = null;
    }

    const currentTaskItems = taskItems.filter((item) => item.task_id === task.id);
    const fallbackRakId =
      savedRakId ||
      (currentTaskItems.length > 0 ? currentTaskItems[currentTaskItems.length - 1].rak_id : null);

    if (fallbackRakId) {
      const rakObj = allRaks.find((r) => r.id === fallbackRakId);
      if (rakObj) {
        setSelectedRakId(rakObj.id);
        setRakInput(rakObj.kode_rak);
        setRakValid(true);
        setTimeout(() => materialInputRef.current?.focus(), 100);
        return;
      }
    }

    setSelectedRakId('');
    setRakInput('');
    setRakValid(false);
    setTimeout(() => rakInputRef.current?.focus(), 100);
    // Only run on task switch / initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  // Also hydrate locked Rak if taskItems/allRaks arrive asynchronously after mount
  useEffect(() => {
    if (selectedRakId || userUnlockedRak) return;
    let savedRakId: string | null = null;
    try {
      savedRakId = sessionStorage.getItem(rakStorageKey);
    } catch {
      savedRakId = null;
    }
    const currentTaskItems = taskItems.filter((item) => item.task_id === task.id);
    const candidateId =
      savedRakId ||
      (currentTaskItems.length > 0 ? currentTaskItems[currentTaskItems.length - 1].rak_id : null);
    if (!candidateId) return;
    const rakObj = allRaks.find((r) => r.id === candidateId);
    if (rakObj) {
      setSelectedRakId(rakObj.id);
      setRakInput(rakObj.kode_rak);
      setRakValid(true);
      setTimeout(() => materialInputRef.current?.focus(), 100);
    }
  }, [allRaks, taskItems, task.id, selectedRakId, userUnlockedRak, rakStorageKey]);

  // Auto focus destination scan input when completion modal opens
  useEffect(() => {
    if (showCompletionModal) {
      setTimeout(() => {
        destInputRef.current?.focus();
      }, 100);
    }
  }, [showCompletionModal]);

  // Filter items in trolley (current task items)
  const itemsInTrolley = taskItems.filter((item) => item.task_id === task.id);
  const pickedItems = itemsInTrolley.filter((item) => item.status === 'PICKED');
  const inTransitItems = itemsInTrolley.filter((item) => item.status === 'IN_TRANSIT');
  const deliveredItems = itemsInTrolley.filter((item) => item.status === 'DELIVERED');

  // Target lines specifically for pending items in current trolley/task
  const pendingTrolleyItems = useMemo(
    () => itemsInTrolley.filter((item) => item.status === 'PICKED' || item.status === 'IN_TRANSIT'),
    [itemsInTrolley]
  );

  const targetLinesInTrolley = useMemo(() => {
    const lineIds = Array.from(new Set(pendingTrolleyItems.map((item) => item.line_id)));
    return allLines.filter((l) => lineIds.includes(l.id));
  }, [allLines, pendingTrolleyItems]);

  // Active Raks and limited suggestions (max 4 to prevent layout vertical expansion)
  const activeRaks = useMemo(() => allRaks.filter((r) => r.status !== 'inactive'), [allRaks]);

  const suggestedRaks = useMemo(() => {
    if (rakInput.trim()) {
      const q = rakInput.trim().toUpperCase();
      const matched = activeRaks.filter(
        (r) => r.kode_rak.toUpperCase().includes(q) || r.nama_rak.toUpperCase().includes(q)
      );
      return matched.slice(0, 4);
    }
    return activeRaks.slice(0, 4);
  }, [activeRaks, rakInput]);

  // Active Materials and limited suggestions (max 4, prioritized by selected rack)
  const activeMaterials = useMemo(
    () => allMaterials.filter((m) => m.status !== 'inactive'),
    [allMaterials]
  );

  const suggestedMaterials = useMemo(() => {
    if (materialInput.trim()) {
      const q = materialInput.trim().toUpperCase();
      const matched = activeMaterials.filter(
        (m) => m.kode_material.toUpperCase().includes(q) || m.deskripsi.toUpperCase().includes(q)
      );
      return matched.slice(0, 4);
    }
    if (selectedRakId) {
      const byRak = activeMaterials.filter((m) => m.default_rak_id === selectedRakId);
      if (byRak.length > 0) {
        return byRak.slice(0, 4);
      }
    }
    return activeMaterials.slice(0, 4);
  }, [activeMaterials, materialInput, selectedRakId]);

  // Active Lines and suggestions (prioritize lines already in trolley for multi-material multi-line picking)
  const activeLines = useMemo(
    () => allLines.filter((l) => l.status !== 'inactive'),
    [allLines]
  );

  const trolleyLineIdSet = useMemo(
    () => new Set(itemsInTrolley.map((item) => item.line_id)),
    [itemsInTrolley]
  );

  const lineSummaryInTrolley = useMemo(() => {
    const map = new Map<
      string,
      {
        line: MasterLine;
        totalItems: number;
        totalQty: number;
        pickedCount: number;
        inTransitCount: number;
        deliveredCount: number;
      }
    >();
    itemsInTrolley.forEach((item) => {
      const lineObj = allLines.find((l) => l.id === item.line_id);
      if (!lineObj) return;
      const existing = map.get(lineObj.id) || {
        line: lineObj,
        totalItems: 0,
        totalQty: 0,
        pickedCount: 0,
        inTransitCount: 0,
        deliveredCount: 0,
      };
      existing.totalItems += 1;
      existing.totalQty += item.qty;
      if (item.status === 'PICKED') existing.pickedCount += 1;
      else if (item.status === 'IN_TRANSIT') existing.inTransitCount += 1;
      else if (item.status === 'DELIVERED') existing.deliveredCount += 1;
      map.set(lineObj.id, existing);
    });
    return Array.from(map.values());
  }, [itemsInTrolley, allLines]);

  const suggestedLines = useMemo(() => {
    if (lineInput.trim()) {
      const q = lineInput.trim().toUpperCase();
      const matched = activeLines.filter(
        (l) =>
          l.kode_line.toUpperCase().includes(q) ||
          l.nama_line.toUpperCase().includes(q) ||
          l.area.toUpperCase().includes(q) ||
          l.qr_code_proses.toUpperCase().includes(q)
      );
      return matched;
    }
    // When empty, prioritize lines already present in current trolley first
    const inTrolley = activeLines.filter((l) => trolleyLineIdSet.has(l.id));
    const others = activeLines.filter((l) => !trolleyLineIdSet.has(l.id));
    return [...inTrolley, ...others];
  }, [activeLines, lineInput, trolleyLineIdSet]);

  const quickSuggestedLines = useMemo(() => {
    return suggestedLines.slice(0, 5);
  }, [suggestedLines]);

  // Close line dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        lineDropdownRef.current &&
        !lineDropdownRef.current.contains(e.target as Node) &&
        lineInputRef.current &&
        !lineInputRef.current.contains(e.target as Node)
      ) {
        setShowLineDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const commitMaterialToTrolley = (overrideLineId?: string): boolean => {
    const effectiveLineId = overrideLineId ?? selectedLineId;
    if (!selectedRakId) {
      sound.playErrorBeep();
      rakInputRef.current?.focus();
      return false;
    }
    if (!selectedMaterialId) {
      sound.playErrorBeep();
      materialInputRef.current?.focus();
      return false;
    }
    if (qty <= 0) {
      sound.playErrorBeep();
      qtyInputRef.current?.focus();
      return false;
    }
    if (!effectiveLineId) {
      sound.playErrorBeep();
      lineInputRef.current?.focus();
      setShowLineDropdown(true);
      return false;
    }

    const materialObj = allMaterials.find((m) => m.id === selectedMaterialId);
    if (!materialObj) return false;
    const lineObj = activeLines.find((l) => l.id === effectiveLineId) || allLines.find((l) => l.id === effectiveLineId);

    sound.playSuccessBeep();
    onAddTaskItem({
      task_id: task.id,
      user_id: user.id,
      rak_id: selectedRakId,
      material_id: selectedMaterialId,
      qty,
      satuan: materialObj.satuan,
      line_id: effectiveLineId,
      status: 'PICKED',
      departure_mode: 'MANUAL_PRESS',
      last_material_scanned_at: new Date().toISOString(),
      picked_at: null,
      delivered_at: null,
      return_at: null,
      delivery_duration_sec: null,
      return_duration_sec: null,
    });

    setLastAddedBanner({
      materialCode: materialObj.kode_material,
      qty,
      satuan: materialObj.satuan,
      lineName: lineObj?.nama_line || lineObj?.kode_line || effectiveLineId,
    });

    // Reset ONLY Material & Line; keep Rak locked for rapid multi-pick!
    setMaterialInput('');
    setSelectedMaterialId('');
    setMaterialValid(false);
    setLineInput('');
    setSelectedLineId('');
    setLineValid(false);
    setShowLineDropdown(false);
    if (!skipQtyOnScan) {
      setQty(10);
    }
    setTimeout(() => materialInputRef.current?.focus(), 80);
    return true;
  };

  const handleSelectLine = (line: MasterLine, triggerAutoAdd = true) => {
    setSelectedLineId(line.id);
    setLineInput(line.kode_line);
    setLineValid(true);
    setShowLineDropdown(false);

    if (triggerAutoAdd && autoAddOnLine && selectedRakId && selectedMaterialId && qty > 0) {
      commitMaterialToTrolley(line.id);
    } else {
      sound.playSuccessBeep();
    }
  };

  const handleChangeRak = () => {
    setUserUnlockedRak(true);
    setSelectedRakId('');
    setRakInput('');
    setRakValid(false);
    try {
      sessionStorage.removeItem(rakStorageKey);
    } catch {
      // ignore
    }
    setTimeout(() => rakInputRef.current?.focus(), 60);
  };

  const handleLineInputChange = (val: string) => {
    setLineInput(val);
    const clean = val.trim().replace(/[\r\n]+/g, '').toUpperCase();
    if (!clean) {
      setSelectedLineId('');
      setLineValid(false);
      setShowLineDropdown(false);
      return;
    }
    setShowLineDropdown(true);

    const exact = activeLines.find(
      (l) =>
        l.kode_line.toUpperCase() === clean ||
        l.nama_line.toUpperCase() === clean ||
        l.qr_code_proses.toUpperCase() === clean ||
        l.id.toUpperCase() === clean
    );
    if (exact) {
      setSelectedLineId(exact.id);
      setLineValid(true);
      sound.playSuccessBeep();
    } else {
      const partial = activeLines.filter(
        (l) =>
          l.kode_line.toUpperCase().includes(clean) ||
          l.nama_line.toUpperCase().includes(clean) ||
          l.area.toUpperCase().includes(clean)
      );
      if (partial.length === 1) {
        setSelectedLineId(partial[0].id);
        setLineValid(true);
      } else {
        setSelectedLineId('');
        setLineValid(false);
      }
    }
  };

  const handleLineSubmit = (val?: string) => {
    const raw = val !== undefined ? val : lineInput;
    const clean = raw.trim().replace(/[\r\n]+/g, '').toUpperCase();
    if (!clean) {
      if (selectedLineId) {
        commitMaterialToTrolley(selectedLineId);
      }
      return;
    }

    const found = activeLines.find(
      (l) =>
        l.kode_line.toUpperCase() === clean ||
        l.nama_line.toUpperCase() === clean ||
        l.qr_code_proses.toUpperCase() === clean ||
        l.id.toUpperCase() === clean ||
        clean.includes(l.kode_line.toUpperCase()) ||
        clean.includes(l.qr_code_proses.toUpperCase())
    );

    if (found) {
      setSelectedLineId(found.id);
      setLineInput(found.kode_line);
      setLineValid(true);
      setShowLineDropdown(false);
      commitMaterialToTrolley(found.id);
    } else if (suggestedLines.length > 0) {
      const topPick = suggestedLines[0];
      setSelectedLineId(topPick.id);
      setLineInput(topPick.kode_line);
      setLineValid(true);
      setShowLineDropdown(false);
      commitMaterialToTrolley(topPick.id);
    } else {
      sound.playErrorBeep();
      setLineValid(false);
      lineInputRef.current?.select();
    }
  };

  // Dedicated Rak submit (PDA enter or instant match)
  const handleRakSubmit = (val?: string) => {
    const raw = val !== undefined ? val : rakInput;
    const clean = raw.trim().replace(/[\r\n]+/g, '').toUpperCase();
    if (!clean) return;

    const found = allRaks.find(
      (r) =>
        r.kode_rak.toUpperCase() === clean ||
        r.id.toUpperCase() === clean ||
        clean.includes(r.kode_rak.toUpperCase())
    );
    if (found) {
      lockRak(found);
      sound.playSuccessBeep();
      setTimeout(() => materialInputRef.current?.focus(), 80);
    } else {
      sound.playErrorBeep();
      setRakValid(false);
      rakInputRef.current?.select();
    }
  };

  // Dedicated Material submit (PDA enter or instant match)
  const handleMaterialSubmit = (val?: string) => {
    const raw = val !== undefined ? val : materialInput;
    const clean = raw.trim().replace(/[\r\n]+/g, '').toUpperCase();
    if (!clean) return;

    const found = allMaterials.find(
      (m) =>
        m.kode_material.toUpperCase() === clean ||
        m.id.toUpperCase() === clean ||
        clean.includes(m.kode_material.toUpperCase())
    );
    if (found) {
      setLastAddedBanner(null);
      setSelectedMaterialId(found.id);
      setMaterialInput(found.kode_material);
      setMaterialValid(true);
      sound.playSuccessBeep();
      if (!selectedRakId && found.default_rak_id) {
        const defaultRak = allRaks.find((r) => r.id === found.default_rak_id);
        if (defaultRak) {
          lockRak(defaultRak);
        }
      }
      setTimeout(() => {
        if (skipQtyOnScan) {
          lineInputRef.current?.focus();
        } else {
          qtyInputRef.current?.focus();
          qtyInputRef.current?.select();
        }
      }, 80);
    } else {
      sound.playErrorBeep();
      setMaterialValid(false);
      materialInputRef.current?.select();
    }
  };

  // Rak validation on change
  const handleRakChange = (val: string) => {
    setRakInput(val);
    const clean = val.trim().replace(/[\r\n]+/g, '').toUpperCase();
    const found = allRaks.find(
      (r) => r.kode_rak.toUpperCase() === clean || r.id === val
    );
    if (found) {
      lockRak(found);
      sound.playSuccessBeep();
      setTimeout(() => materialInputRef.current?.focus(), 100);
    } else {
      setSelectedRakId('');
      setRakValid(false);
    }
  };

  // Material validation on change
  const handleMaterialChange = (val: string) => {
    setMaterialInput(val);
    const clean = val.trim().replace(/[\r\n]+/g, '').toUpperCase();
    const found = allMaterials.find(
      (m) => m.kode_material.toUpperCase() === clean || m.id === val
    );
    if (found) {
      setLastAddedBanner(null);
      setSelectedMaterialId(found.id);
      setMaterialValid(true);
      sound.playSuccessBeep();
      if (!selectedRakId && found.default_rak_id) {
        const defaultRak = allRaks.find((r) => r.id === found.default_rak_id);
        if (defaultRak) {
          lockRak(defaultRak);
        }
      }
      setTimeout(() => {
        if (skipQtyOnScan) {
          lineInputRef.current?.focus();
        } else {
          qtyInputRef.current?.focus();
          qtyInputRef.current?.select();
        }
      }, 100);
    } else {
      setSelectedMaterialId('');
      setMaterialValid(false);
    }
  };

  // Keep latest scan handlers in ref so global PDA wedge listener never hits stale state
  const globalScanRef = useRef({
    allLines,
    allRaks,
    allMaterials,
    inTransitCount: 0,
    onSelectLine: (l: MasterLine) => handleSelectLine(l, true),
    onRakSubmit: (code: string) => handleRakSubmit(code),
    onMaterialSubmit: (code: string) => handleMaterialSubmit(code),
    onDestScan: (qr: string) => {
      setShowCompletionModal(true);
      setDestScanInput(qr);
      handleDestinationScanSubmit(qr);
    },
  });

  globalScanRef.current = {
    allLines,
    allRaks,
    allMaterials,
    inTransitCount: inTransitItems.length,
    onSelectLine: (l: MasterLine) => handleSelectLine(l, true),
    onRakSubmit: (code: string) => handleRakSubmit(code),
    onMaterialSubmit: (code: string) => handleMaterialSubmit(code),
    onDestScan: (qr: string) => {
      setShowCompletionModal(true);
      setDestScanInput(qr);
      handleDestinationScanSubmit(qr);
    },
  };

  // Global Keydown Buffer to catch PDA Barcode Wedge anywhere on screen
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = 0;

    const handleGlobalScan = (e: KeyboardEvent) => {
      // Don't intercept if user is typing numbers in qty input or in line input
      if (
        (document.activeElement === qtyInputRef.current || document.activeElement === lineInputRef.current) &&
        e.key !== 'Enter'
      ) {
        return;
      }

      const now = Date.now();
      const elapsed = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (scanBuffer.length >= 3 && elapsed < 80) {
          e.preventDefault();
          const scanned = scanBuffer.trim().replace(/[\r\n]+/g, '').toUpperCase();
          scanBuffer = '';

          const {
            allLines: lines,
            allRaks: raks,
            allMaterials: mats,
            inTransitCount,
            onSelectLine,
            onRakSubmit,
            onMaterialSubmit,
            onDestScan,
          } = globalScanRef.current;

          // 1. Line QR Code check
          const lineFound = lines.find(
            (l) =>
              l.qr_code_proses.toUpperCase() === scanned ||
              l.kode_line.toUpperCase() === scanned ||
              scanned.includes(l.qr_code_proses.toUpperCase())
          );
          if (lineFound) {
            if (inTransitCount > 0) {
              onDestScan(lineFound.qr_code_proses);
              return;
            } else {
              onSelectLine(lineFound);
              return;
            }
          }

          // 2. Rak Barcode check
          const rakFound = raks.find(
            (r) =>
              r.kode_rak.toUpperCase() === scanned ||
              r.id.toUpperCase() === scanned ||
              scanned.includes(r.kode_rak.toUpperCase())
          );
          if (rakFound) {
            onRakSubmit(scanned);
            return;
          }

          // 3. Material Barcode check
          const matFound = mats.find(
            (m) =>
              m.kode_material.toUpperCase() === scanned ||
              m.id.toUpperCase() === scanned ||
              scanned.includes(m.kode_material.toUpperCase())
          );
          if (matFound) {
            onMaterialSubmit(scanned);
            return;
          }
        }
      } else if (e.key.length === 1) {
        if (elapsed > 100) {
          scanBuffer = e.key;
        } else {
          scanBuffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalScan);
    return () => window.removeEventListener('keydown', handleGlobalScan);
  }, []);

  // Add Material to Trolley
  const handleAddMaterial = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    commitMaterialToTrolley();
  };

  const handleManualDeparture = () => {
    sound.playSuccessBeep();
    onConfirmDeparture('MANUAL_PRESS');
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
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600" />
                <span>FORM PENGAMBILAN MATERIAL GUDANG</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mode 1 Rak → Banyak Material → Multi-Line: Scan Rak 1x, lalu scan beruntun Material &amp; pilih Line.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoAddOnLine((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                  autoAddOnLine
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title="Jika aktif, memilih/scan Line langsung memasukkan material ke troli & fokus ke Material berikutnya"
              >
                <Zap className="w-3 h-3" />
                <span>Auto-Masuk saat Pilih Line: {autoAddOnLine ? 'ON' : 'OFF'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSkipQtyOnScan((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                  skipQtyOnScan
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title="Jika aktif, Qty memakai nilai saat ini & setelah scan Material kursor langsung ke Line Tujuan"
              >
                <ArrowRight className="w-3 h-3" />
                <span>Skip Qty ({qty}): {skipQtyOnScan ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleAddMaterial} className="space-y-4">
            {/* STEP 1: SCAN RAK ASAL (COLLAPSED LOCKED BANNER AFTER VERIFIED) */}
            {rakValid && currentRakObj ? (
              <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                        STEP 1: RAK TERKUNCI (MULTI-PICK)
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono text-xs font-extrabold">
                        {currentRakObj.kode_rak}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900 font-medium truncate mt-0.5">
                      {currentRakObj.nama_rak} ({currentRakObj.zona}) • <span className="font-semibold">Tidak perlu scan ulang rak — lanjut Step 2 &amp; 3</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleChangeRak}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-2xs"
                  title="Klik jika ingin pindah ke rak lain"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Ganti Rak</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border-2 bg-slate-50 border-slate-200 hover:border-slate-300 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs">
                      1
                    </span>
                    <span>STEP 1: SCAN RAK ASAL</span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      PDA Gun Ready
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    ref={rakInputRef}
                    type="text"
                    autoFocus={!rakValid}
                    value={rakInput}
                    onChange={(e) => handleRakChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRakSubmit();
                      }
                    }}
                    placeholder="Arahkan PDA & Scan Barcode Rak (e.g. RAK-A12)..."
                    className="flex-1 bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setScannerMode('rak');
                      setScannerOpen(true);
                    }}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Buka Kamera HP (hanya jika perangkat tidak memiliki hardware scanner PDA)"
                  >
                    <Scan className="w-4 h-4 text-slate-500" />
                    <span className="hidden sm:inline">Kamera</span>
                  </button>
                </div>

                <p className="text-[11px] text-emerald-800 font-medium mt-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <span>
                    <strong>Mode PDA:</strong> Scan Rak 1x saja. Setelah terverifikasi, Rak otomatis dikunci agar Anda bisa ambil banyak material dengan cepat.
                  </span>
                </p>

                {/* Quick Rak selector chips - Limited to single row (max 4 + compact dropdown) to prevent vertical expansion */}
                <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none flex-nowrap">
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">Sugesti:</span>
                  {suggestedRaks.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRakChange(r.kode_rak)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition shrink-0 cursor-pointer ${
                        selectedRakId === r.id
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {r.kode_rak}
                    </button>
                  ))}

                  {activeRaks.length > 4 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleRakChange(e.target.value);
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 outline-none transition shrink-0 cursor-pointer"
                      title="Pilih dari seluruh daftar rak"
                    >
                      <option value="">
                        + {activeRaks.length > suggestedRaks.length ? `${activeRaks.length - suggestedRaks.length} Rak Lainnya` : 'Semua Rak'}...
                      </option>
                      {activeRaks.map((r) => (
                        <option key={r.id} value={r.kode_rak}>
                          {r.kode_rak} - {r.nama_rak}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Inline feedback after adding material so operator knows it went to trolley & rack is still locked */}
            {lastAddedBanner && (
              <div className="px-3.5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Masuk Troli: <strong className="font-mono">{lastAddedBanner.materialCode}</strong> ({lastAddedBanner.qty} {lastAddedBanner.satuan}) → <strong>{lastAddedBanner.lineName}</strong>. Lanjut scan Material berikutnya!
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setLastAddedBanner(null)}
                  className="text-emerald-100 hover:text-white px-1.5 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

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
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    PDA Gun Ready
                  </span>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMaterialSubmit();
                    }
                  }}
                  placeholder="Arahkan PDA & Scan Barcode Material (e.g. MAT-001)..."
                  className="flex-1 bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    setScannerMode('material');
                    setScannerOpen(true);
                  }}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Buka Kamera HP (hanya jika perangkat tidak memiliki hardware scanner PDA)"
                >
                  <Scan className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">Kamera</span>
                </button>
              </div>

              <p className="text-[11px] text-emerald-800 font-medium mt-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span><strong>Mode PDA:</strong> Kursor otomatis berpindah ke sini setelah scan Rak. Tekan tombol trigger PDA ke barcode Material part.</span>
              </p>

              {/* Quick Material selector chips - Limited to single row (max 4 + compact dropdown) to prevent vertical expansion */}
              <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none flex-nowrap">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0">Sugesti:</span>
                {suggestedMaterials.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMaterialChange(m.kode_material)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition shrink-0 ${
                      selectedMaterialId === m.id
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {m.kode_material}
                  </button>
                ))}

                {activeMaterials.length > 4 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) handleMaterialChange(e.target.value);
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 outline-none transition shrink-0 cursor-pointer"
                    title="Pilih dari seluruh daftar material"
                  >
                    <option value="">
                      + {activeMaterials.length > suggestedMaterials.length ? `${activeMaterials.length - suggestedMaterials.length} Part Lainnya` : 'Semua Part'}...
                    </option>
                    {activeMaterials.map((m) => (
                      <option key={m.id} value={m.kode_material}>
                        {m.kode_material} - {m.deskripsi}
                      </option>
                    ))}
                  </select>
                )}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs">
                    3
                  </span>
                  <span>STEP 3: JUMLAH (QTY) &amp; LINE/PROSES TUJUAN</span>
                </label>
                {autoAddOnLine && selectedRakId && selectedMaterialId && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                    ⚡ Pilih/Scan Line = Langsung Masuk Troli
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-semibold">
                    Qty ({currentMaterialObj?.satuan || 'Pcs'})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 5))}
                      className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-lg font-bold text-slate-800 border border-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      ref={qtyInputRef}
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!selectedLineId) {
                            lineInputRef.current?.focus();
                            setShowLineDropdown(true);
                          } else {
                            commitMaterialToTrolley(selectedLineId);
                          }
                        }
                      }}
                      className="flex-1 bg-white border border-slate-300 rounded-xl py-2 px-3 text-center text-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setQty((q) => q + 5)}
                      className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-lg font-bold text-slate-800 border border-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  {/* Quick Qty Presets */}
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-400 mr-0.5">Cepat:</span>
                    {[1, 5, 10, 20, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setQty(preset);
                          if (selectedMaterialId && !selectedLineId) {
                            setTimeout(() => lineInputRef.current?.focus(), 40);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border transition cursor-pointer ${
                          qty === preset
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-slate-600 font-semibold">
                      Target Line / Proses Tujuan
                    </label>
                    {lineValid && currentLineObj && (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Terverifikasi
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      ref={lineInputRef}
                      type="text"
                      value={lineInput}
                      onChange={(e) => handleLineInputChange(e.target.value)}
                      onFocus={() => {
                        if (lineInput.trim().length > 0) {
                          setShowLineDropdown(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleLineSubmit();
                        } else if (e.key === 'Escape') {
                          setShowLineDropdown(false);
                        }
                      }}
                      placeholder="Scan/ketik kode line (e.g. PACKING IN)..."
                      className={`w-full bg-white border-2 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none transition ${
                        lineValid
                          ? 'border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                          : 'border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                      }`}
                      autoComplete="off"
                    />

                    {lineInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setLineInput('');
                          setSelectedLineId('');
                          setLineValid(false);
                          setShowLineDropdown(false);
                          lineInputRef.current?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs font-bold cursor-pointer"
                        title="Hapus input line"
                      >
                        ✕
                      </button>
                    )}

                    {/* Floating Dropdown Autocomplete - Hanya muncul saat kolom diisi */}
                    {showLineDropdown && lineInput.trim().length > 0 && suggestedLines.length > 0 && (
                      <div
                        ref={lineDropdownRef}
                        className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-300 divide-y divide-slate-100"
                      >
                        {suggestedLines.map((l) => {
                          const isSelected = l.id === selectedLineId;
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => handleSelectLine(l)}
                              className={`w-full px-3 py-2 text-left text-xs transition flex items-center justify-between hover:bg-amber-50 cursor-pointer ${
                                isSelected ? 'bg-amber-100/70 font-bold text-amber-950' : 'text-slate-800'
                              }`}
                            >
                              <div>
                                <div className="font-mono font-bold text-slate-900">
                                  {l.kode_line}
                                  <span className="ml-1.5 font-sans font-semibold text-slate-600">
                                    • {l.nama_line}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Area: {l.area} • QR: {l.qr_code_proses}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-amber-700 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Always-visible Multi-Line Quick Chips (prioritize lines already in trolley) */}
                  {quickSuggestedLines.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none flex-nowrap">
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        {lineInput.trim().length > 0 ? 'Cocok:' : 'Line Cepat:'}
                      </span>
                      {quickSuggestedLines.map((l) => {
                        const isInTrolley = trolleyLineIdSet.has(l.id);
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => handleSelectLine(l)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                              selectedLineId === l.id
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : isInTrolley
                                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                            title={`${l.nama_line} (${l.area})${isInTrolley ? ' • Sudah ada di troli' : ''}`}
                          >
                            <span>{l.kode_line}</span>
                            {isInTrolley && selectedLineId !== l.id && (
                              <span className="text-[9px] font-sans font-extrabold text-blue-600">•Troli</span>
                            )}
                          </button>
                        );
                      })}

                      {suggestedLines.length > quickSuggestedLines.length && (
                        <select
                          value=""
                          onChange={(e) => {
                            const chosen = activeLines.find(
                              (l) => l.id === e.target.value || l.kode_line === e.target.value
                            );
                            if (chosen) handleSelectLine(chosen);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 outline-none transition shrink-0 cursor-pointer"
                          title="Pilih dari seluruh daftar line"
                        >
                          <option value="">
                            + {suggestedLines.length - quickSuggestedLines.length} Line...
                          </option>
                          {suggestedLines.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.kode_line} - {l.nama_line}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Selected Line Details */}
                  {currentLineObj && (
                    <div className="text-[11px] text-emerald-800 font-medium mt-1.5 flex items-center justify-between">
                      <span>✓ {currentLineObj.nama_line} (Area: {currentLineObj.area})</span>
                      <span className="text-[10px] text-amber-700 font-mono font-bold">
                        Target QR: {currentLineObj.qr_code_proses}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Button Tambah Material */}
            <button
              type="submit"
              disabled={!selectedRakId || !selectedMaterialId || !selectedLineId}
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
                  Total {itemsInTrolley.length} item • {lineSummaryInTrolley.length} Line tujuan
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {pickedItems.length} Siap | {inTransitItems.length} Jalan | {deliveredItems.length} Tiba
              </span>
            </div>

            {/* Ringkasan Rute Multi-Line dalam Troli */}
            {lineSummaryInTrolley.length > 0 && (
              <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">
                    Ringkasan Rute Pengiriman ({lineSummaryInTrolley.length} Line):
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {pendingTrolleyItems.length > 0 ? `${targetLinesInTrolley.length} Line menunggu drop` : 'Semua line terkirim'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lineSummaryInTrolley.map(({ line, totalItems, totalQty, deliveredCount, inTransitCount }) => {
                    const isAllDelivered = deliveredCount === totalItems;
                    const hasInTransit = inTransitCount > 0;
                    return (
                      <span
                        key={line.id}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold border flex items-center gap-1.5 ${
                          isAllDelivered
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : hasInTransit
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                      >
                        <span>{line.nama_line}</span>
                        <span className="opacity-75 font-normal">
                          ({totalItems} item • {totalQty} pcs)
                        </span>
                        {isAllDelivered && <Check className="w-3 h-3 text-emerald-600" />}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

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
                  let statusLabel = 'SIAP DI TROLI';
                  if (item.status === 'IN_TRANSIT') {
                    badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
                    statusLabel = 'MENUJU LINE (T1)';
                  }
                  if (item.status === 'DELIVERED') {
                    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    statusLabel = 'TIBA DI LINE (T2)';
                  }

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
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                            {statusLabel}
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
                          title="Batal / Hapus Item dari Troli"
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
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-700" />
                      Siap Berangkat ({pickedItems.length} Material Dimuat):
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      Troli di Area Rak
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    Material tersimpan aman di troli. Anda dapat terus memindai/menambahkan material lain di panel samping. Tekan tombol di bawah saat troli selesai dimuat dan Anda siap jalan menuju lini produksi.
                  </p>

                  <button
                    type="button"
                    onClick={handleManualDeparture}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>✓ KONFIRMASI BERANGKAT (CATAT T1)</span>
                  </button>
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
                    {pendingTrolleyItems.length > 0
                      ? `Masih ada ${pendingTrolleyItems.length} item untuk ${targetLinesInTrolley.length} line tujuan lain. Selesaikan pengantaran semua line sebelum kembali ke rak (T3).`
                      : 'Semua material telah diterima di lini produksi. Operator kembali ke area rak gudang untuk siklus selanjutnya.'}
                  </p>
                  {pendingTrolleyItems.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playSuccessBeep();
                        onReturnToRack();
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>✓ SEMUA LINE TERKIRIM • KEMBALI KE RAK (CATAT T3)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 6.2: POP-UP COMPLETION (VERIFIKASI SCAN TUJUAN) */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
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
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (destScanInput.trim()) {
                          handleDestinationScanSubmit(destScanInput);
                        }
                      }
                    }}
                    placeholder="Scan QR Lokasi (e.g. QR-LINE-01-ASSY)..."
                    className="flex-1 bg-slate-50 border-2 border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-sm cursor-pointer"
                  >
                    Verifikasi
                  </button>
                </div>

                {/* Target Line Prioritas: Hanya tampilkan line tujuan yang ADA di dalam troli saat ini */}
                {targetLinesInTrolley.length > 0 && (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                        Target Line Tugas Ini ({targetLinesInTrolley.length} Lokasi):
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">Klik untuk verifikasi instan</span>
                    </div>
                    <div className="space-y-1.5">
                      {targetLinesInTrolley.map((line) => {
                        const count = pendingTrolleyItems.filter((i) => i.line_id === line.id).length;
                        return (
                          <button
                            key={line.id}
                            type="button"
                            onClick={() => {
                              setDestScanInput(line.qr_code_proses);
                              handleDestinationScanSubmit(line.qr_code_proses);
                            }}
                            className="w-full p-2.5 bg-white hover:bg-emerald-100/70 border border-emerald-300 rounded-xl text-left transition flex items-center justify-between shadow-2xs cursor-pointer group"
                          >
                            <div>
                              <span className="text-xs font-mono font-bold text-emerald-900 block group-hover:text-emerald-950">
                                {line.qr_code_proses}
                              </span>
                              <span className="text-[11px] text-slate-600 block">
                                {line.nama_line} ({line.area})
                              </span>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {count} Item
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dropdown ringkas untuk simulasi / memilih dari seluruh line lainnya tanpa memenuhi layar */}
                <div className="pt-1">
                  <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                    Atau pilih cepat QR line manual (Simulator / Alternatif):
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setDestScanInput(e.target.value);
                        handleDestinationScanSubmit(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none transition cursor-pointer"
                  >
                    <option value="">-- Pilih dari seluruh {allLines.length} Daftar Line Gudang --</option>
                    {allLines.map((line) => (
                      <option key={line.id} value={line.qr_code_proses}>
                        {line.qr_code_proses} - {line.nama_line} ({line.area})
                      </option>
                    ))}
                  </select>
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

                      <div className="pt-2 space-y-2">
                        {pendingTrolleyItems.length > 0 ? (
                          <>
                            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 font-medium">
                              Masih ada <strong>{pendingTrolleyItems.length} item</strong> untuk{' '}
                              <strong>{targetLinesInTrolley.length} line tujuan</strong> berikutnya:{' '}
                              <span className="font-mono font-bold">
                                {targetLinesInTrolley.map((l) => l.nama_line).join(', ')}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setVerificationResult(null);
                                setDestScanInput('');
                                setTimeout(() => destInputRef.current?.focus(), 60);
                              }}
                              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                            >
                              <ArrowRight className="w-4 h-4" />
                              <span>LANJUT SCAN LINE TUJUAN BERIKUTNYA</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCompletionModal(false)}
                              className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                            >
                              Tutup Modal Sementara
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setShowCompletionModal(false);
                              sound.playSuccessBeep();
                              onReturnToRack();
                            }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>✓ SEMUA LINE TERKIRIM • KEMBALI KE RAK (CATAT T3)</span>
                          </button>
                        )}
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
            ? suggestedRaks.map((r) => ({ label: r.nama_rak, code: r.kode_rak, desc: r.zona }))
            : suggestedMaterials.map((m) => ({ label: m.deskripsi, code: m.kode_material, desc: m.satuan }))
        }
      />
    </div>
  );
};
