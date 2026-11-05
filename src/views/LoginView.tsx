import React, { useState } from 'react';
import { sound } from '../utils/audio';
import { ScannerModal } from '../components/ScannerModal';
import {
  Scan,
  Shield,
  KeyRound,
  ArrowRight,
  QrCode,
  Lock,
  User,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface LoginViewProps {
  onOperatorLogin: (employeeIdOrQr: string) => { success: boolean; message?: string };
  onStaffLogin: (username: string, pass: string) => { success: boolean; message?: string };
}

export const LoginView: React.FC<LoginViewProps> = ({
  onOperatorLogin,
  onStaffLogin,
}) => {
  const [tab, setTab] = useState<'operator' | 'staff'>('operator');

  // Strict clean state with NO PREFILLED CREDENTIALS or suggestions
  const [operatorId, setOperatorId] = useState('');
  const [operatorError, setOperatorError] = useState('');

  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleOperatorSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOperatorError('');
    const clean = operatorId.trim();
    if (!clean) {
      setOperatorError('Harap masukkan ID Karyawan atau scan barcode NIK.');
      sound.playErrorBeep();
      return;
    }

    const result = onOperatorLogin(clean);
    if (!result.success) {
      setOperatorError(result.message || 'Login operator gagal.');
      sound.playErrorBeep();
    } else {
      sound.playSuccessBeep();
    }
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    const cleanUser = staffUsername.trim();
    const cleanPass = staffPassword.trim();

    if (!cleanUser || !cleanPass) {
      setStaffError('Harap masukkan username dan password.');
      sound.playErrorBeep();
      return;
    }

    const result = onStaffLogin(cleanUser, cleanPass);
    if (!result.success) {
      setStaffError(result.message || 'Username atau password salah.');
      sound.playErrorBeep();
    } else {
      sound.playSuccessBeep();
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200">
      <div className="w-full max-w-lg space-y-6">
        {/* Banner Card */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xs">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Sistem Otentikasi &amp; Akses Terkontrol v1.6</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            ZEVA <span className="text-amber-600">LOGISTIK</span> MATERIAL
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Sistem pemantauan perpindahan material pabrik, verifikasi QR Code fisik lokasi proses, dan audit lead time.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-200/90 p-1.5 rounded-2xl border border-slate-300 shadow-xs">
          <button
            type="button"
            onClick={() => {
              setTab('operator');
              setOperatorError('');
              setStaffError('');
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
              tab === 'operator'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scan className="w-4 h-4 text-amber-600" />
            <span>Operator Gemba</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('staff');
              setOperatorError('');
              setStaffError('');
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
              tab === 'staff'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-600" />
            <span>Staff Manajemen</span>
          </button>
        </div>

        {/* Card Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {tab === 'operator' ? (
            /* Operator Login Tab */
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                  <Scan className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900">Akses Operator Gemba (Auto-Onboarding)</h4>
                  <p className="text-amber-800/90 text-[11px] mt-0.5">
                    Scan barcode NIK atau masukkan ID Karyawan Anda. Operator baru yang belum terdaftar otomatis dibuatkan akun dan dapat langsung memulai task kerja.
                  </p>
                </div>
              </div>

              {operatorError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{operatorError}</span>
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleOperatorSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      ID Karyawan / NIK Operator
                    </span>
                    <span className="text-amber-700 font-mono text-[11px] bg-amber-100 px-2 py-0.5 rounded font-semibold">
                      Barcode Gun Ready
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      autoComplete="off"
                      value={operatorId}
                      onChange={(e) => {
                        setOperatorId(e.target.value);
                        setOperatorError('');
                      }}
                      placeholder="Masukkan ID / NIK (contoh: OP-001 atau NIK baru)..."
                      className="w-full bg-slate-50 border-2 border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 rounded-xl px-4 py-3.5 text-base font-mono text-slate-900 placeholder-slate-400 transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="absolute right-2 top-2 bottom-2 px-3 bg-slate-100 hover:bg-slate-200 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition"
                      title="Buka Scanner Kamera"
                    >
                      <QrCode className="w-4 h-4 text-amber-600" />
                      <span className="hidden sm:inline">Scan QR</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!operatorId.trim()}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition transform active:scale-[0.98]"
                >
                  <span>MASUK OPERATOR GEMBA</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-slate-500">
                <span>⚡ <strong>Poka-Yoke Onboarding:</strong> NIK baru otomatis terdaftar &amp; langsung diarahkan ke form pengambilan material.</span>
              </div>
            </div>
          ) : (
            /* Staff Login Tab */
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-purple-50/90 border border-purple-200 text-xs text-purple-950">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-800">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-purple-900">Portal Staff Manajemen</h4>
                  <p className="text-purple-800/90 text-[11px] mt-0.5">
                    Akses terautentikasi untuk Administrator Sistem, Supervisor (SPV), dan Logistics Manager.
                  </p>
                </div>
              </div>

              {staffError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{staffError}</span>
                </div>
              )}

              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Username Staff</span>
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={staffUsername}
                      onChange={(e) => {
                        setStaffUsername(e.target.value);
                        setStaffError('');
                      }}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-purple-500 focus:bg-white rounded-xl px-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 outline-none transition"
                      placeholder="Masukkan username..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Kata Sandi (Password)</span>
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={staffPassword}
                      onChange={(e) => {
                        setStaffPassword(e.target.value);
                        setStaffError('');
                      }}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-purple-500 focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition"
                      placeholder="Masukkan kata sandi..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!staffUsername.trim() || !staffPassword.trim()}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-md"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>MASUK DASHBOARD MANAJEMEN</span>
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-slate-400">
                <span>Perlindungan akses berlapis. Hubungi Admin jika lupa kata sandi.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barcode scanner modal - without any hardcoded suggested user accounts */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          setOperatorId(code);
          const result = onOperatorLogin(code);
          if (!result.success) {
            setOperatorError(result.message || 'ID tidak terdaftar.');
          }
        }}
        title="Scan Barcode / QR ID Karyawan"
        expectedType="operator"
        suggestedCodes={[]}
      />
    </div>
  );
};
