import React, { useState } from 'react';
import { User } from '../types';
import { sound } from '../utils/audio';
import { ScannerModal } from '../components/ScannerModal';
import {
  Scan,
  UserCheck,
  Shield,
  KeyRound,
  ArrowRight,
  Sparkles,
  Zap,
  QrCode,
} from 'lucide-react';

interface LoginViewProps {
  onOperatorLogin: (employeeIdOrQr: string) => void;
  onStaffLogin: (username: string, pass: string) => boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onOperatorLogin,
  onStaffLogin,
}) => {
  const [tab, setTab] = useState<'operator' | 'staff'>('operator');
  const [operatorId, setOperatorId] = useState('');
  const [staffUsername, setStaffUsername] = useState('admin');
  const [staffPassword, setStaffPassword] = useState('admin123');
  const [staffError, setStaffError] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleOperatorSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = operatorId.trim();
    if (!clean) return;
    if (clean.length < 3) {
      sound.playErrorBeep();
      alert('ID Karyawan minimal 3 karakter!');
      return;
    }
    sound.playSuccessBeep();
    onOperatorLogin(clean);
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    const success = onStaffLogin(staffUsername.trim(), staffPassword);
    if (!success) {
      sound.playErrorBeep();
      setStaffError('Username atau password tidak valid!');
    } else {
      sound.playSuccessBeep();
    }
  };

  const handleQuickOperator = (id: string) => {
    setOperatorId(id);
    sound.playSuccessBeep();
    onOperatorLogin(id);
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200">
      <div className="w-full max-w-xl space-y-6">
        {/* Banner Card */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Lean Manufacturing &amp; Gemba Tracking v1.6</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            ZEVA <span className="text-amber-600">LOGISTIK</span> MATERIAL
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Sistem pemantauan perpindahan material, verifikasi QR Code fisik lokasi proses, dan audit lead time otomatis.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-200/80 p-1.5 rounded-2xl border border-slate-300 shadow-sm">
          <button
            type="button"
            onClick={() => setTab('operator')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
              tab === 'operator'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scan className="w-4 h-4 text-amber-600" />
            <span>Operator Gemba (Fast-Track)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('staff')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
              tab === 'staff'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Staff (Admin/SPV/Manager)</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {tab === 'operator' ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Poka-Yoke Fast-Track Onboarding:</span>
                </div>
                <p>
                  • <strong>User Baru:</strong> Otomatis dibuatkan akun &amp; langsung direct ke <strong>Panel Input Task</strong>.
                </p>
                <p>
                  • <strong>User Lama:</strong> Otomatis membuka <strong>Dashboard History Task</strong> untuk memilih task aktif atau buat task baru.
                </p>
              </div>

              {/* Input Form */}
              <form onSubmit={handleOperatorSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
                    <span>Scan QR / Masukkan ID Karyawan (NIK)</span>
                    <span className="text-amber-700 font-mono text-[11px] bg-amber-100 px-2 py-0.5 rounded font-semibold">Barcode Gun Ready</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={operatorId}
                      onChange={(e) => setOperatorId(e.target.value)}
                      placeholder="Contoh: OP-001 atau NIK baru (OP-007)..."
                      className="w-full bg-slate-50 border-2 border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 rounded-xl px-4 py-3.5 text-base font-mono text-slate-900 placeholder-slate-400 transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="absolute right-2 top-2 bottom-2 px-3 bg-slate-100 hover:bg-slate-200 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition"
                      title="Buka Kamera / Scanner Simulator"
                    >
                      <QrCode className="w-4 h-4 text-amber-600" />
                      <span className="hidden sm:inline">Scan QR</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!operatorId.trim()}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition transform active:scale-[0.98]"
                >
                  <span>LOGIN OPERATOR &amp; TRACKING</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              {/* Fast Onboarding Simulation Buttons */}
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  Quick Test Operator (Klik untuk uji coba):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickOperator('OP-001')}
                    className="p-2.5 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-400 rounded-xl text-left transition group"
                  >
                    <span className="font-mono font-bold text-amber-700 block">OP-001</span>
                    <span className="text-slate-600 text-[11px] truncate block">Budi Santoso (Lama)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickOperator('OP-002')}
                    className="p-2.5 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-400 rounded-xl text-left transition group"
                  >
                    <span className="font-mono font-bold text-amber-700 block">OP-002</span>
                    <span className="text-slate-600 text-[11px] truncate block">Agus Pratama (Lama)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickOperator(`OP-${Math.floor(100 + Math.random() * 900)}`)}
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 hover:border-emerald-400 rounded-xl text-left transition group"
                  >
                    <span className="font-mono font-bold text-emerald-700 block">Auto-Create +</span>
                    <span className="text-emerald-800 text-[11px] truncate block">User Baru (Acak)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Staff Login Form */
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Username Staff
                  </label>
                  <input
                    type="text"
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-mono text-slate-900 outline-none"
                    placeholder="admin / spv / manager"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Password</span>
                    <span className="text-[11px] text-slate-500">Default: username123</span>
                  </label>
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-900 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {staffError && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                  {staffError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-md"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Masuk Dashboard Manajemen</span>
              </button>

              <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStaffUsername('admin');
                    setStaffPassword('admin123');
                  }}
                  className="p-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 border border-purple-200 font-semibold"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaffUsername('spv');
                    setStaffPassword('spv123');
                  }}
                  className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 border border-blue-200 font-semibold"
                >
                  Supervisor (SPV)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaffUsername('manager');
                    setStaffPassword('manager123');
                  }}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-800 border border-emerald-200 font-semibold"
                >
                  Manager
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Barcode scanner modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          setOperatorId(code);
          handleQuickOperator(code);
        }}
        title="Scan ID Karyawan / QR Operator"
        expectedType="operator"
        suggestedCodes={[
          { label: 'Budi Santoso', code: 'OP-001', desc: 'Operator Lama' },
          { label: 'Agus Pratama', code: 'OP-002', desc: 'Operator Lama' },
          { label: 'Siti Rahma', code: 'OP-003', desc: 'Operator Lama' },
          { label: 'Operator Baru', code: 'OP-777', desc: 'Auto-Create Account' },
        ]}
      />
    </div>
  );
};
