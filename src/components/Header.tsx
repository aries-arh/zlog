import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getCurrentShift } from '../utils/storage';
import {
  Boxes,
  Clock,
  LogOut,
  UserCheck,
  ChevronDown,
  Sparkles,
  RotateCcw,
  Shield,
  PackageCheck,
  Activity,
  BarChart3,
  History,
  Crown,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onResetData: () => void;
  hasActiveTask?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentView,
  onNavigate,
  onLogout,
  onResetData,
  hasActiveTask = false,
}) => {
  const [time, setTime] = useState(new Date());
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const currentShift = getCurrentShift();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-100 text-purple-700 border border-purple-200">
            ADMIN
          </span>
        );
      case 'spv':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-100 text-blue-700 border border-blue-200">
            SPV
          </span>
        );
      case 'manager':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
            MANAGER
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 text-amber-800 border border-amber-300">
            OPERATOR
          </span>
        );
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const isOperator = currentUser?.role === 'operator';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 select-none shadow-xs">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => {
            if (isAdmin) onNavigate('admin');
            else if (isOperator) onNavigate('operator-history');
            else if (currentUser?.role === 'spv') onNavigate('spv');
            else if (currentUser?.role === 'manager') onNavigate('manager');
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition transform">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-wide text-base sm:text-lg">
                ZEVA <span className="text-amber-600">LOGISTIK</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                v1.6
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Material Operator Tracking &amp; Spatiotemporal Log
            </p>
          </div>
        </div>

        {/* Center Shift & Time */}
        <div className="hidden md:flex items-center gap-4 bg-slate-100/80 px-4 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
          <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Shift {currentShift}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5 text-slate-600 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{time.toLocaleTimeString('id-ID')}</span>
          </div>
        </div>

        {/* User Profile & Demo Switcher */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition"
                title="Informasi Profil & Akun"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border ${
                    isAdmin
                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {isAdmin ? <Crown className="w-4 h-4 text-purple-600" /> : currentUser.employee_id.slice(0, 3)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{currentUser.nama}</span>
                    {getRoleBadge(currentUser.role)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    ID: {currentUser.employee_id}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Role Dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
                  <div className="px-1 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      {isAdmin ? 'PROFIL ADMINISTRATOR SISTEM' : 'PROFIL AKUN SAYA'}
                    </span>
                    {getRoleBadge(currentUser.role)}
                  </div>

                  {isAdmin ? (
                    <>
                      {/* Admin Identity Card */}
                      <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-purple-900 tracking-wider">
                            Akun Aktif
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900">
                            Super-Admin
                          </span>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm block">{currentUser.nama}</span>
                          <span className="text-[11px] font-mono text-slate-600 block">Username / NIK: {currentUser.employee_id}</span>
                        </div>
                        <div className="pt-2 border-t border-purple-200 text-[11px] space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-purple-900">
                            <Shield className="w-3.5 h-3.5 text-purple-700" />
                            <span>Akses Seluruh Menu (Non-Impersonation)</span>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-relaxed">
                            Demi integritas audit trail dan keamanan data, Admin <strong>tidak login sebagai akun OP, SPV, atau MGR</strong>. Admin mengakses seluruh menu kerja secara independen dengan hak otorisasi Admin.
                          </p>
                        </div>
                      </div>

                      {/* Menu Quick Navigation */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
                          Pintas Menu Kerja:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
                          <button
                            onClick={() => {
                              onNavigate('admin');
                              setShowRoleMenu(false);
                            }}
                            className={`p-2 rounded-lg text-left border transition flex items-center gap-1.5 ${
                              currentView === 'admin'
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5 text-purple-600" />
                            <span className="truncate">Master Admin</span>
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('operator-task-input');
                              setShowRoleMenu(false);
                            }}
                            className={`p-2 rounded-lg text-left border transition flex items-center gap-1.5 ${
                              currentView === 'operator-task-input'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <PackageCheck className="w-3.5 h-3.5 text-amber-600" />
                            <span className="truncate">Input OP</span>
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('operator-history');
                              setShowRoleMenu(false);
                            }}
                            className={`p-2 rounded-lg text-left border transition flex items-center gap-1.5 ${
                              currentView === 'operator-history'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <History className="w-3.5 h-3.5 text-amber-600" />
                            <span className="truncate">Histori OP</span>
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('spv');
                              setShowRoleMenu(false);
                            }}
                            className={`p-2 rounded-lg text-left border transition flex items-center gap-1.5 ${
                              currentView === 'spv'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                            <span className="truncate">Monitoring SPV</span>
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('manager');
                              setShowRoleMenu(false);
                            }}
                            className={`col-span-2 p-2 rounded-lg text-left border transition flex items-center gap-1.5 ${
                              currentView === 'manager'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="truncate">Executive KPI Manager</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                        <button
                          onClick={() => {
                            if (confirm('Reset seluruh data transaksi dan kembalikan ke default pabrik?')) {
                              onResetData();
                              setShowRoleMenu(false);
                            }
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Data Demo Pabrik</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Nama Personel</span>
                        <span className="font-bold text-slate-900 text-sm">{currentUser.nama}</span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-600">
                        <span>NIK: {currentUser.employee_id}</span>
                        <span className="text-emerald-700 font-bold">Status: Aktif</span>
                      </div>
                      <p className="text-[10px] text-slate-500 border-t border-slate-200 pt-1.5">
                        Hak akses akun ini terisolasi oleh sistem RBAC. Anda hanya dapat membuka modul kerja yang telah ditetapkan untuk role Anda.
                      </p>
                    </div>
                  )}

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>Login Mode</span>
            </div>
          )}

          {currentUser && (
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* OMNIPRESENT NAVIGATION BAR FOR ADMIN & ROLES */}
      {currentUser && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-2 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {isAdmin && (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 border border-purple-200 text-[11px] font-bold text-purple-800">
                  <Shield className="w-3.5 h-3.5 text-purple-700" />
                  <span>ADMIN SUITE (AKSES PENUH):</span>
                </div>
              )}

              {/* Navigation Tabs based on Role / Admin Omnipresence */}
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold">
                {/* 1. Admin Master Menu */}
                {isAdmin && (
                  <button
                    onClick={() => onNavigate('admin')}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                      currentView === 'admin'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Master &amp; System</span>
                  </button>
                )}

                {/* 2. Operator: Panel Input Task */}
                {(isAdmin || isOperator) && (
                  <button
                    onClick={() => onNavigate('operator-task-input')}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                      currentView === 'operator-task-input'
                        ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>{isAdmin ? 'OP: Panel Input' : 'Panel Input Task'}</span>
                    {hasActiveTask && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-0.5" />
                    )}
                  </button>
                )}

                {/* 3. Operator: History Task */}
                {(isAdmin || isOperator) && (
                  <button
                    onClick={() => onNavigate('operator-history')}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                      currentView === 'operator-history'
                        ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>{isAdmin ? 'OP: Histori Task' : 'Histori Task'}</span>
                  </button>
                )}

                {/* 4. SPV: Live Monitoring */}
                {(isAdmin || currentUser.role === 'spv') && (
                  <button
                    onClick={() => onNavigate('spv')}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                      currentView === 'spv'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{isAdmin ? 'SPV: Monitoring' : 'Live Monitoring Grid'}</span>
                  </button>
                )}

                {/* 5. MGR: Executive KPI */}
                {(isAdmin || currentUser.role === 'manager') && (
                  <button
                    onClick={() => onNavigate('manager')}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                      currentView === 'manager'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>{isAdmin ? 'MGR: Executive KPI' : 'Executive KPI & Laporan'}</span>
                  </button>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="text-[11px] font-mono text-purple-700 hidden sm:flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                <span>Super-Admin Mode (OP, SPV, MGR unlocked)</span>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
