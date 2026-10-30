import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, QrCode, ScanLine, Keyboard, CheckCircle2, AlertTriangle } from 'lucide-react';
import { sound } from '../utils/audio';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  expectedType?: 'rak' | 'material' | 'line' | 'operator' | 'any';
  suggestedCodes?: { label: string; code: string; desc?: string }[];
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode / QR Code',
  expectedType = 'any',
  suggestedCodes = [],
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setManualCode('');
      setCameraError(null);
      // Auto-focus manual input for instant hardware scanner or typing
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('Kamera tidak dapat diakses atau diblokir. Gunakan input manual atau quick-scan.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    sound.playSuccessBeep();
    onScan(clean);
    onClose();
  };

  const handleSelectSuggested = (code: string) => {
    sound.playSuccessBeep();
    onScan(code);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg border border-amber-300">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
              <p className="text-xs text-slate-500 font-mono">
                Scanner Terminal Gemba v1.6 • {expectedType.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Hardware & Camera View */}
          <div className="relative aspect-video bg-black rounded-xl border border-slate-300 overflow-hidden flex items-center justify-center">
            {cameraActive ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" />
                {/* Aiming Reticle */}
                <div className="absolute inset-8 border-2 border-amber-400/80 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-amber-300" />
                    <div className="w-4 h-4 border-t-2 border-r-2 border-amber-300" />
                  </div>
                  {/* Laser line */}
                  <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-scanline" />
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-b-2 border-l-2 border-amber-300" />
                    <div className="w-4 h-4 border-b-2 border-r-2 border-amber-300" />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center text-amber-400">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Arahkan Barcode Scanner Fisik / Aktifkan Kamera
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Mendukung scanner laser genggam (Zebra/Honeywell) atau kamera tablet.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-semibold tracking-wide transition shadow-xs"
                  >
                    <Camera className="w-4 h-4" /> Buka Kamera Device
                  </button>
                </div>
                {cameraError && (
                  <p className="text-xs text-amber-200 bg-amber-950/70 border border-amber-700 rounded-lg p-2 mt-2">
                    {cameraError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick-Scan Suggestions for fast testing */}
          {suggestedCodes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  Quick Simulator (Gemba Fast Test):
                </span>
                <span className="text-slate-400">Klik untuk instan scan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedCodes.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelectSuggested(item.code)}
                    className="flex flex-col text-left p-2.5 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-400 rounded-xl transition group"
                  >
                    <span className="text-xs font-mono font-bold text-amber-700 group-hover:text-amber-800">
                      {item.code}
                    </span>
                    <span className="text-xs text-slate-800 font-medium truncate">{item.label}</span>
                    {item.desc && <span className="text-[10px] text-slate-500 truncate">{item.desc}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              Input Manual Kode / Barcode:
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ketik atau scan barcode di sini..."
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-sm transition shadow-xs"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
