import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { UserRole } from '../types';

interface AccessDeniedProps {
  currentRole?: UserRole;
  requiredRole: string;
  onBackToAllowed: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  currentRole,
  requiredRole,
  onBackToAllowed,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/50 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-2xl shadow-rose-950/40">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-rose-400">
            403 FORBIDDEN • AKSES DITOLAK
          </span>
          <h2 className="text-xl font-black text-white">
            Hak Akses Terisolasi (RBAC)
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Akun Anda dengan role{' '}
            <strong className="text-amber-400 uppercase font-mono">
              [{currentRole || 'UNKNOWN'}]
            </strong>{' '}
            tidak memiliki izin untuk membuka modul{' '}
            <strong className="text-rose-400 uppercase font-mono">
              [{requiredRole}]
            </strong>
            .
          </p>
        </div>

        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Ketentuan RBAC ZEVA v1.6:</span>
          </div>
          <p>• <strong>Operator:</strong> Hanya dapat mengakses Panel Input &amp; Histori Task.</p>
          <p>• <strong>Supervisor:</strong> Hanya dapat mengakses Live Monitoring &amp; Spatiotemporal Timeline.</p>
          <p>• <strong>Manager:</strong> Hanya dapat mengakses Executive KPI &amp; Analisis Laporan.</p>
          <p>• <strong>Admin:</strong> Memiliki akses penuh (Super-Admin) ke seluruh modul.</p>
        </div>

        <button
          onClick={onBackToAllowed}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Menu Role Anda</span>
        </button>
      </div>
    </div>
  );
};
