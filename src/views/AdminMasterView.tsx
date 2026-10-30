import React, { useState } from 'react';
import {
  User,
  MasterRak,
  MasterMaterial,
  MasterLine,
  SpatiotemporalLogEvent,
} from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { sound } from '../utils/audio';
import {
  Settings,
  Database,
  QrCode,
  Users,
  Printer,
  Plus,
  Trash2,
  Edit2,
  Check,
  Download,
  Boxes,
  MapPin,
  Package,
  Layers,
  FileText,
  Upload,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react';
import { ImportExcelModal } from '../components/ImportExcelModal';
import { downloadTemplate, downloadFullMasterWorkbook } from '../utils/excelImport';

interface AdminMasterViewProps {
  raks: MasterRak[];
  materials: MasterMaterial[];
  lines: MasterLine[];
  users: User[];
  logs: SpatiotemporalLogEvent[];
  onSaveRaks: (raks: MasterRak[]) => void;
  onSaveMaterials: (mats: MasterMaterial[]) => void;
  onSaveLines: (lines: MasterLine[]) => void;
  onSaveUsers: (users: User[]) => void;
}

export const AdminMasterView: React.FC<AdminMasterViewProps> = ({
  raks,
  materials,
  lines,
  users,
  logs,
  onSaveRaks,
  onSaveMaterials,
  onSaveLines,
  onSaveUsers,
}) => {
  const [activeTab, setActiveTab] = useState<'raks' | 'materials' | 'lines' | 'users' | 'qrcodes' | 'logs'>('qrcodes');

  // Excel Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'rak' | 'material' | 'line'>('rak');

  // Handle Excel Import Confirm
  const handleImportConfirm = (items: any[], mode: 'append' | 'replace') => {
    if (importType === 'rak') {
      if (mode === 'replace') {
        onSaveRaks(items);
      } else {
        const map = new Map<string, MasterRak>();
        raks.forEach((r) => map.set(r.kode_rak.toUpperCase(), r));
        items.forEach((r) => map.set(r.kode_rak.toUpperCase(), r));
        onSaveRaks(Array.from(map.values()));
      }
    } else if (importType === 'material') {
      if (mode === 'replace') {
        onSaveMaterials(items);
      } else {
        const map = new Map<string, MasterMaterial>();
        materials.forEach((m) => map.set(m.kode_material.toUpperCase(), m));
        items.forEach((m) => map.set(m.kode_material.toUpperCase(), m));
        onSaveMaterials(Array.from(map.values()));
      }
    } else if (importType === 'line') {
      if (mode === 'replace') {
        onSaveLines(items);
      } else {
        const map = new Map<string, MasterLine>();
        lines.forEach((l) => map.set(l.kode_line.toUpperCase(), l));
        items.forEach((l) => map.set(l.kode_line.toUpperCase(), l));
        onSaveLines(Array.from(map.values()));
      }
    }
  };

  // New Rak form state
  const [newRakCode, setNewRakCode] = useState('');
  const [newRakName, setNewRakName] = useState('');
  const [newRakZone, setNewRakZone] = useState('');

  // New Material form state
  const [newMatCode, setNewMatCode] = useState('');
  const [newMatDesc, setNewMatDesc] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('Pcs');
  const [newMatRakId, setNewMatRakId] = useState(raks[0]?.id || '');
  const [newMatCategory, setNewMatCategory] = useState('Hardware');

  // New Line form state
  const [newLineCode, setNewLineCode] = useState('');
  const [newLineName, setNewLineName] = useState('');
  const [newLineQr, setNewLineQr] = useState('');
  const [newLineArea, setNewLineArea] = useState('');

  // QR Print Category Filter
  const [qrFilter, setQrFilter] = useState<'all' | 'raks' | 'materials' | 'lines'>('all');

  // User edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');

  // Add Rak
  const handleAddRak = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRakCode.trim() || !newRakName.trim()) return;
    const item: MasterRak = {
      id: `rak-${Date.now()}`,
      kode_rak: newRakCode.trim().toUpperCase(),
      nama_rak: newRakName.trim(),
      zona: newRakZone.trim() || 'Zona Default',
      status: 'active',
    };
    onSaveRaks([...raks, item]);
    setNewRakCode('');
    setNewRakName('');
    setNewRakZone('');
    sound.playSuccessBeep();
  };

  // Delete Rak
  const handleDeleteRak = (id: string) => {
    if (confirm('Hapus master rak ini?')) {
      onSaveRaks(raks.filter((r) => r.id !== id));
      sound.playSuccessBeep();
    }
  };

  // Add Material
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatCode.trim() || !newMatDesc.trim()) return;
    const item: MasterMaterial = {
      id: `mat-${Date.now()}`,
      kode_material: newMatCode.trim().toUpperCase(),
      deskripsi: newMatDesc.trim(),
      satuan: newMatUnit.trim(),
      default_rak_id: newMatRakId || raks[0]?.id || '',
      kategori: newMatCategory.trim(),
      status: 'active',
    };
    onSaveMaterials([...materials, item]);
    setNewMatCode('');
    setNewMatDesc('');
    sound.playSuccessBeep();
  };

  const handleDeleteMaterial = (id: string) => {
    if (confirm('Hapus master material ini?')) {
      onSaveMaterials(materials.filter((m) => m.id !== id));
      sound.playSuccessBeep();
    }
  };

  // Add Line
  const handleAddLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineCode.trim() || !newLineName.trim()) return;
    const item: MasterLine = {
      id: `line-${Date.now()}`,
      kode_line: newLineCode.trim().toUpperCase(),
      nama_line: newLineName.trim(),
      qr_code_proses: newLineQr.trim() || `QR-${newLineCode.trim().toUpperCase()}`,
      area: newLineArea.trim() || 'Assembly Area',
      status: 'active',
    };
    onSaveLines([...lines, item]);
    setNewLineCode('');
    setNewLineName('');
    setNewLineQr('');
    setNewLineArea('');
    sound.playSuccessBeep();
  };

  const handleDeleteLine = (id: string) => {
    if (confirm('Hapus master line proses ini?')) {
      onSaveLines(lines.filter((l) => l.id !== id));
      sound.playSuccessBeep();
    }
  };

  // User Management
  const handleSaveUserName = (userId: string) => {
    if (!editUserName.trim()) return;
    onSaveUsers(
      users.map((u) => (u.id === userId ? { ...u, nama: editUserName.trim() } : u))
    );
    setEditingUserId(null);
    sound.playSuccessBeep();
  };

  const handleToggleUserStatus = (userId: string) => {
    onSaveUsers(
      users.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === 'active' ? 'inactive' : 'active';
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
    sound.playSuccessBeep();
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Hapus akun operator ini (misal kesalahan ketik/typo)?')) {
      onSaveUsers(users.filter((u) => u.id !== userId));
      sound.playSuccessBeep();
    }
  };

  // Print QR Sheet
  const handlePrintQRs = () => {
    window.print();
  };

  // Download Raw DB Backup JSON
  const handleExportJSON = () => {
    const backup = {
      export_date: new Date().toISOString(),
      version: '1.6',
      users,
      raks,
      materials,
      lines,
      logs,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `ZEVA_Database_Raw_Export_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
              ADMINISTRATOR SISTEM
            </span>
            <span className="text-xs text-slate-500 font-mono">Master Data &amp; Hardware QR Printing</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Konfigurasi &amp; Master Sistem ZEVA v1.6
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Pengelolaan Master Rak, Material, QR Code Fisik Lokasi Proses, User Operator, serta Raw Log Database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadFullMasterWorkbook}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs"
            title="Unduh 1 file Excel berisi sheet Master_Rak, Master_Material, dan Master_Line lengkap dengan contoh data"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Format Excel Lengkap (3 Master)</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>Export Raw Database (JSON)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex-wrap gap-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('qrcodes')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition ${
            activeTab === 'qrcodes'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Generator &amp; Bulk Print QR</span>
        </button>
        <button
          onClick={() => setActiveTab('raks')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition ${
            activeTab === 'raks'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Master Rak ({raks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition ${
            activeTab === 'materials'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Master Material ({materials.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('lines')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition ${
            activeTab === 'lines'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Master Line / QR Lokasi ({lines.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Operator ({users.filter((u) => u.role === 'operator').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition ${
            activeTab === 'logs'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Raw Logs ({logs.length})</span>
        </button>
      </div>

      {/* Tab: QR Code Bulk Generator & Print Sheet */}
      {activeTab === 'qrcodes' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-600" />
                <span>BULK PRINTING MODUL QR CODE FISIK PABRIK</span>
              </h2>
              <p className="text-xs text-slate-500">
                Cetak stiker barcode / QR code fisik untuk ditempelkan di rak gudang, wadah material, dan stasiun kerja line proses.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={qrFilter}
                onChange={(e) => setQrFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium outline-none focus:border-amber-500 focus:bg-white"
              >
                <option value="all">Tampilkan Semua QR</option>
                <option value="raks">Khusus Rak Asal</option>
                <option value="materials">Khusus Material</option>
                <option value="lines">Khusus QR Lokasi Line Proses</option>
              </select>

              <button
                onClick={handlePrintQRs}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Stiker (Print)</span>
              </button>
            </div>
          </div>

          {/* Printable QR Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3 print:gap-4">
            {/* Lines / Process QR (Physical location stickers) */}
            {(qrFilter === 'all' || qrFilter === 'lines') &&
              lines.map((line) => (
                <div
                  key={line.id}
                  className="bg-white text-slate-950 p-4 rounded-2xl border-2 border-emerald-500 shadow-md flex flex-col items-center text-center space-y-2 print:border-black print:break-inside-avoid"
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    STIKER LOKASI PROSES TUJUAN
                  </span>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-inner">
                    <QRCodeSVG value={line.qr_code_proses} size={110} level="M" />
                  </div>
                  <div className="w-full">
                    <span className="font-mono font-black text-sm block tracking-wide">
                      {line.qr_code_proses}
                    </span>
                    <span className="font-bold text-xs text-slate-800 block truncate">
                      {line.nama_line}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{line.area}</span>
                  </div>
                </div>
              ))}

            {/* Rak QR */}
            {(qrFilter === 'all' || qrFilter === 'raks') &&
              raks.map((rak) => (
                <div
                  key={rak.id}
                  className="bg-white text-slate-950 p-4 rounded-2xl border-2 border-amber-500 shadow-md flex flex-col items-center text-center space-y-2 print:border-black print:break-inside-avoid"
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                    STIKER RAK ASAL GUDANG
                  </span>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-inner">
                    <QRCodeSVG value={rak.kode_rak} size={110} level="M" />
                  </div>
                  <div className="w-full">
                    <span className="font-mono font-black text-sm block tracking-wide">
                      {rak.kode_rak}
                    </span>
                    <span className="font-bold text-xs text-slate-800 block truncate">
                      {rak.nama_rak}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{rak.zona}</span>
                  </div>
                </div>
              ))}

            {/* Material Barcode / QR */}
            {(qrFilter === 'all' || qrFilter === 'materials') &&
              materials.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white text-slate-950 p-4 rounded-2xl border-2 border-blue-500 shadow-md flex flex-col items-center text-center space-y-2 print:border-black print:break-inside-avoid"
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                    LABEL MATERIAL / PART
                  </span>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-inner">
                    <QRCodeSVG value={mat.kode_material} size={110} level="M" />
                  </div>
                  <div className="w-full">
                    <span className="font-mono font-black text-sm block tracking-wide">
                      {mat.kode_material}
                    </span>
                    <span className="font-bold text-xs text-slate-800 block truncate">
                      {mat.deskripsi}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Satuan: {mat.satuan} • {mat.kategori}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab: Master Rak */}
      {activeTab === 'raks' && (
        <div className="space-y-4">
          {/* Import Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Import Massal Master Rak dari Excel</h3>
                <p className="text-xs text-slate-500">
                  Isi data master rak gudang sekaligus menggunakan file Excel (.xlsx) atau .csv.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadTemplate('rak', 'xlsx')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                title="Unduh contoh file format Excel untuk Master Rak"
              >
                <FileDown className="w-4 h-4 text-emerald-600" />
                <span>Contoh Format (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportType('rak');
                  setImportModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition transform active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel Rak</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                <span>Tambah Master Rak Baru</span>
              </h3>
              <form onSubmit={handleAddRak} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Kode Rak (Unik)</label>
                  <input
                    type="text"
                    value={newRakCode}
                    onChange={(e) => setNewRakCode(e.target.value)}
                    placeholder="e.g. RAK-E01"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Nama Rak</label>
                  <input
                    type="text"
                    value={newRakName}
                    onChange={(e) => setNewRakName(e.target.value)}
                    placeholder="e.g. Rak Stamping E01"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Zona / Area Gudang</label>
                  <input
                    type="text"
                    value={newRakZone}
                    onChange={(e) => setNewRakZone(e.target.value)}
                    placeholder="e.g. Hall E - Press Room"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" /> Simpan Rak
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Daftar Master Rak</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Kode Rak</th>
                      <th className="px-3 py-2.5">Nama Rak</th>
                      <th className="px-3 py-2.5">Zona</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {raks.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 text-amber-700 font-bold">{r.kode_rak}</td>
                        <td className="px-3 py-2.5 font-sans text-slate-900 font-medium">{r.nama_rak}</td>
                        <td className="px-3 py-2.5 font-sans text-slate-600">{r.zona}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-emerald-800 text-[10px] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => handleDeleteRak(r.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Master Material */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {/* Import Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl border border-blue-300">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Import Massal Master Material dari Excel</h3>
                <p className="text-xs text-slate-500">
                  Upload daftar material/part dengan deskripsi, satuan, kategori, dan rak gudang default.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadTemplate('material', 'xlsx')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                title="Unduh contoh file format Excel untuk Master Material"
              >
                <FileDown className="w-4 h-4 text-emerald-600" />
                <span>Contoh Format (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportType('material');
                  setImportModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition transform active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel Material</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                <span>Tambah Master Material</span>
              </h3>
              <form onSubmit={handleAddMaterial} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Kode Material (Unik)</label>
                  <input
                    type="text"
                    value={newMatCode}
                    onChange={(e) => setNewMatCode(e.target.value)}
                    placeholder="e.g. MAT-007"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Deskripsi Material</label>
                  <input
                    type="text"
                    value={newMatDesc}
                    onChange={(e) => setNewMatDesc(e.target.value)}
                    placeholder="e.g. Ring Plat M6 Zinc Plated"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-1">Satuan</label>
                    <select
                      value={newMatUnit}
                      onChange={(e) => setNewMatUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Box">Box</option>
                      <option value="Crate">Crate</option>
                      <option value="Set">Set</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Kategori</label>
                    <input
                      type="text"
                      value={newMatCategory}
                      onChange={(e) => setNewMatCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" /> Simpan Material
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Daftar Master Material</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Kode</th>
                      <th className="px-3 py-2.5">Deskripsi</th>
                      <th className="px-3 py-2.5">Satuan</th>
                      <th className="px-3 py-2.5">Kategori</th>
                      <th className="px-3 py-2.5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {materials.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 text-blue-700 font-bold">{m.kode_material}</td>
                        <td className="px-3 py-2.5 font-sans text-slate-900 font-medium">{m.deskripsi}</td>
                        <td className="px-3 py-2.5 text-slate-700">{m.satuan}</td>
                        <td className="px-3 py-2.5 font-sans text-slate-600">{m.kategori}</td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => handleDeleteMaterial(m.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Master Line / Proses QR */}
      {activeTab === 'lines' && (
        <div className="space-y-4">
          {/* Import Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl border border-purple-300">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Import Massal Master Line &amp; QR Proses</h3>
                <p className="text-xs text-slate-500">
                  Upload kode line, nama stasiun proses, area kerja, dan kode QR fisik lokasi.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadTemplate('line', 'xlsx')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                title="Unduh contoh file format Excel untuk Master Line"
              >
                <FileDown className="w-4 h-4 text-emerald-600" />
                <span>Contoh Format (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportType('line');
                  setImportModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition transform active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel Line</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                <span>Tambah Master Line / Proses</span>
              </h3>
              <form onSubmit={handleAddLine} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1">Kode Line (Unik)</label>
                  <input
                    type="text"
                    value={newLineCode}
                    onChange={(e) => setNewLineCode(e.target.value)}
                    placeholder="e.g. LINE-05"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Nama Proses / Stasiun</label>
                  <input
                    type="text"
                    value={newLineName}
                    onChange={(e) => setNewLineName(e.target.value)}
                    placeholder="e.g. Final Quality Audit"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">QR Code String Fisik</label>
                  <input
                    type="text"
                    value={newLineQr}
                    onChange={(e) => setNewLineQr(e.target.value)}
                    placeholder="e.g. QR-LINE-05-QA"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Area Pabrik</label>
                  <input
                    type="text"
                    value={newLineArea}
                    onChange={(e) => setNewLineArea(e.target.value)}
                    placeholder="e.g. Area C - Quality & Pack"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" /> Simpan Master Line
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Daftar Master Line &amp; QR Fisik</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Kode</th>
                      <th className="px-3 py-2.5">Nama Line</th>
                      <th className="px-3 py-2.5">QR Code Proses</th>
                      <th className="px-3 py-2.5">Area</th>
                      <th className="px-3 py-2.5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {lines.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 text-blue-700 font-bold">{l.kode_line}</td>
                        <td className="px-3 py-2.5 font-sans text-slate-900 font-medium">{l.nama_line}</td>
                        <td className="px-3 py-2.5 text-amber-700 font-bold">{l.qr_code_proses}</td>
                        <td className="px-3 py-2.5 font-sans text-slate-600">{l.area}</td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => handleDeleteLine(l.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: User Management */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>PENGELOLAAN USER OPERATOR (AUTO-CREATED &amp; REGISTERED)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Edit nama operator, aktif/nonaktifkan akun, atau hapus ID yang salah ketik (typo).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3">NIK / ID Karyawan</th>
                  <th className="px-3 py-3">Nama Lengkap</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Terdaftar Pada</th>
                  <th className="px-3 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3 text-purple-700 font-bold">{u.employee_id}</td>
                    <td className="px-3 py-3 font-sans text-slate-900">
                      {editingUserId === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editUserName}
                            onChange={(e) => setEditUserName(e.target.value)}
                            className="bg-white border border-purple-500 rounded px-2 py-1 text-slate-900 text-xs outline-none"
                          />
                          <button
                            onClick={() => handleSaveUserName(u.id)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{u.nama}</span>
                          <button
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditUserName(u.nama);
                            }}
                            className="text-slate-400 hover:text-slate-700 transition"
                            title="Edit Nama"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 uppercase text-[10px] font-bold text-slate-600">{u.role}</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleToggleUserStatus(u.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {u.status}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-3 py-3">
                      {u.role === 'operator' && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-slate-400 hover:text-rose-600 transition"
                          title="Hapus ID Typo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Raw Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">System Raw Audit Trail</h3>
            <span className="text-xs font-mono text-slate-500">{logs.length} Total Logs</span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Operator</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-amber-700 font-bold">{l.event_type}</td>
                    <td className="px-3 py-2 text-slate-900 font-semibold">{l.operator_name}</td>
                    <td className="px-3 py-2">
                      {l.departure_mode ? (
                        <span className="text-blue-700 font-bold">{l.departure_mode}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700 font-sans">{l.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      <ImportExcelModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        type={importType}
        existingRaks={raks}
        onImportConfirm={handleImportConfirm}
      />
    </div>
  );
};
