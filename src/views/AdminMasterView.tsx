import React, { useState } from 'react';
import {
  User,
  MasterRak,
  MasterMaterial,
  MasterLine,
  Task,
  TaskItem,
  SpatiotemporalLogEvent,
  UserRole,
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
  UserPlus,
  Search,
  Key,
  ShieldCheck,
  AlertCircle,
  X,
  ShieldAlert,
  Shield,
  Truck,
  CheckSquare,
  Square,
  Eye,
} from 'lucide-react';
import { ImportExcelModal } from '../components/ImportExcelModal';
import { ImportDatabaseModal, DatabaseBackupPayload } from '../components/ImportDatabaseModal';
import { QRPrintPreviewModal, QRPrintItem } from '../components/QRPrintPreviewModal';
import { downloadTemplate, downloadFullMasterWorkbook } from '../utils/excelImport';

interface AdminMasterViewProps {
  raks: MasterRak[];
  materials: MasterMaterial[];
  lines: MasterLine[];
  users: User[];
  logs: SpatiotemporalLogEvent[];
  tasks?: Task[];
  taskItems?: TaskItem[];
  currentUser?: User | null;
  onSaveRaks: (raks: MasterRak[]) => void;
  onSaveMaterials: (mats: MasterMaterial[]) => void;
  onSaveLines: (lines: MasterLine[]) => void;
  onSaveUsers: (users: User[]) => void;
  onRestoreDatabase?: (data: DatabaseBackupPayload, mode: 'overwrite' | 'merge') => void;
}

export const AdminMasterView: React.FC<AdminMasterViewProps> = ({
  raks,
  materials,
  lines,
  users,
  logs,
  tasks = [],
  taskItems = [],
  currentUser,
  onSaveRaks,
  onSaveMaterials,
  onSaveLines,
  onSaveUsers,
  onRestoreDatabase,
}) => {
  const [activeTab, setActiveTab] = useState<'raks' | 'materials' | 'lines' | 'users' | 'qrcodes' | 'logs'>('qrcodes');

  // Excel Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'rak' | 'material' | 'line'>('rak');
  // Raw DB Import modal state
  const [importDbModalOpen, setImportDbModalOpen] = useState(false);

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

  // Edit Master Rak State
  const [editingRak, setEditingRak] = useState<MasterRak | null>(null);
  const [editRakCode, setEditRakCode] = useState('');
  const [editRakName, setEditRakName] = useState('');
  const [editRakZone, setEditRakZone] = useState('');
  const [editRakStatus, setEditRakStatus] = useState<'active' | 'inactive'>('active');
  const [editRakError, setEditRakError] = useState('');

  // Edit Master Material State
  const [editingMaterial, setEditingMaterial] = useState<MasterMaterial | null>(null);
  const [editMatCode, setEditMatCode] = useState('');
  const [editMatDesc, setEditMatDesc] = useState('');
  const [editMatUnit, setEditMatUnit] = useState('Pcs');
  const [editMatRakId, setEditMatRakId] = useState('');
  const [editMatCategory, setEditMatCategory] = useState('Hardware');
  const [editMatStatus, setEditMatStatus] = useState<'active' | 'inactive'>('active');
  const [editMatError, setEditMatError] = useState('');

  // Edit Master Line State
  const [editingLine, setEditingLine] = useState<MasterLine | null>(null);
  const [editLineCode, setEditLineCode] = useState('');
  const [editLineName, setEditLineName] = useState('');
  const [editLineQr, setEditLineQr] = useState('');
  const [editLineArea, setEditLineArea] = useState('');
  const [editLineStatus, setEditLineStatus] = useState<'active' | 'inactive'>('active');
  const [editLineError, setEditLineError] = useState('');

  // QR Print State & Selective Printing
  const [qrFilter, setQrFilter] = useState<'all' | 'raks' | 'materials' | 'lines'>('all');
  const [qrSearchTerm, setQrSearchTerm] = useState('');
  const [selectedQrIds, setSelectedQrIds] = useState<Set<string>>(new Set());
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // User Management State
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | UserRole>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Add User Modal state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserNik, setNewUserNik] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('operator');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserQr, setNewUserQr] = useState('');
  const [newUserStatus, setNewUserStatus] = useState<'active' | 'inactive'>('active');
  const [addUserError, setAddUserError] = useState('');

  // Edit User Modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserNik, setEditUserNik] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('operator');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserQr, setEditUserQr] = useState('');
  const [editUserStatus, setEditUserStatus] = useState<'active' | 'inactive'>('active');
  const [editUserError, setEditUserError] = useState('');

  // Delete User Confirmation state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteUserError, setDeleteUserError] = useState('');

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

  // Edit Master Rak Handlers
  const handleOpenEditRak = (rak: MasterRak) => {
    setEditingRak(rak);
    setEditRakCode(rak.kode_rak);
    setEditRakName(rak.nama_rak);
    setEditRakZone(rak.zona);
    setEditRakStatus(rak.status || 'active');
    setEditRakError('');
  };

  const handleEditRakSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRak) return;
    const cleanCode = editRakCode.trim().toUpperCase();
    const cleanName = editRakName.trim();
    const cleanZone = editRakZone.trim() || 'Zona Default';

    if (!cleanCode || !cleanName) {
      setEditRakError('Kode Rak dan Nama Rak wajib diisi.');
      sound.playErrorBeep();
      return;
    }

    if (raks.some((r) => r.id !== editingRak.id && r.kode_rak.toUpperCase() === cleanCode)) {
      setEditRakError(`Kode Rak "${cleanCode}" sudah digunakan oleh rak lain.`);
      sound.playErrorBeep();
      return;
    }

    const updated = raks.map((r) =>
      r.id === editingRak.id
        ? { ...r, kode_rak: cleanCode, nama_rak: cleanName, zona: cleanZone, status: editRakStatus }
        : r
    );
    onSaveRaks(updated);
    setEditingRak(null);
    sound.playSuccessBeep();
  };

  // Edit Master Material Handlers
  const handleOpenEditMaterial = (mat: MasterMaterial) => {
    setEditingMaterial(mat);
    setEditMatCode(mat.kode_material);
    setEditMatDesc(mat.deskripsi);
    setEditMatUnit(mat.satuan);
    setEditMatRakId(mat.default_rak_id || raks[0]?.id || '');
    setEditMatCategory(mat.kategori);
    setEditMatStatus(mat.status || 'active');
    setEditMatError('');
  };

  const handleEditMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    const cleanCode = editMatCode.trim().toUpperCase();
    const cleanDesc = editMatDesc.trim();

    if (!cleanCode || !cleanDesc) {
      setEditMatError('Kode Material dan Deskripsi wajib diisi.');
      sound.playErrorBeep();
      return;
    }

    if (materials.some((m) => m.id !== editingMaterial.id && m.kode_material.toUpperCase() === cleanCode)) {
      setEditMatError(`Kode Material "${cleanCode}" sudah digunakan oleh material lain.`);
      sound.playErrorBeep();
      return;
    }

    const updated = materials.map((m) =>
      m.id === editingMaterial.id
        ? {
            ...m,
            kode_material: cleanCode,
            deskripsi: cleanDesc,
            satuan: editMatUnit,
            default_rak_id: editMatRakId,
            kategori: editMatCategory.trim() || 'Hardware',
            status: editMatStatus,
          }
        : m
    );
    onSaveMaterials(updated);
    setEditingMaterial(null);
    sound.playSuccessBeep();
  };

  // Edit Master Line Handlers
  const handleOpenEditLine = (line: MasterLine) => {
    setEditingLine(line);
    setEditLineCode(line.kode_line);
    setEditLineName(line.nama_line);
    setEditLineQr(line.qr_code_proses);
    setEditLineArea(line.area);
    setEditLineStatus(line.status || 'active');
    setEditLineError('');
  };

  const handleEditLineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLine) return;
    const cleanCode = editLineCode.trim().toUpperCase();
    const cleanName = editLineName.trim();
    const cleanQr = editLineQr.trim() || `QR-${cleanCode}`;
    const cleanArea = editLineArea.trim() || 'Assembly Area';

    if (!cleanCode || !cleanName) {
      setEditLineError('Kode Line dan Nama Proses wajib diisi.');
      sound.playErrorBeep();
      return;
    }

    if (lines.some((l) => l.id !== editingLine.id && l.kode_line.toUpperCase() === cleanCode)) {
      setEditLineError(`Kode Line "${cleanCode}" sudah digunakan oleh line lain.`);
      sound.playErrorBeep();
      return;
    }

    const updated = lines.map((l) =>
      l.id === editingLine.id
        ? {
            ...l,
            kode_line: cleanCode,
            nama_line: cleanName,
            qr_code_proses: cleanQr,
            area: cleanArea,
            status: editLineStatus,
          }
        : l
    );
    onSaveLines(updated);
    setEditingLine(null);
    sound.playSuccessBeep();
  };

  // User Management Handlers
  const handleOpenAddUser = () => {
    setNewUserNik('');
    setNewUserName('');
    setNewUserRole('operator');
    setNewUserPassword('');
    setNewUserQr('');
    setNewUserStatus('active');
    setAddUserError('');
    setIsAddUserModalOpen(true);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');

    const cleanNik = newUserNik.trim().toUpperCase();
    const cleanName = newUserName.trim();
    const cleanPass = newUserPassword.trim();
    const cleanQr = newUserQr.trim() || cleanNik;

    if (!cleanNik || cleanNik.length < 3) {
      setAddUserError('NIK / ID Karyawan minimal 3 karakter.');
      sound.playErrorBeep();
      return;
    }
    if (!cleanName || cleanName.length < 3) {
      setAddUserError('Nama Lengkap minimal 3 karakter.');
      sound.playErrorBeep();
      return;
    }

    // Check duplicate NIK
    if (users.some((u) => u.employee_id.toUpperCase() === cleanNik)) {
      setAddUserError(`NIK / ID "${cleanNik}" sudah terdaftar pada pengguna lain!`);
      sound.playErrorBeep();
      return;
    }

    // For staff roles, ensure password is provided
    if (newUserRole !== 'operator' && (!cleanPass || cleanPass.length < 4)) {
      setAddUserError('Password untuk Staff (Admin/SPV/Manager) minimal 4 karakter.');
      sound.playErrorBeep();
      return;
    }

    const newUser: User = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employee_id: cleanNik,
      nama: cleanName,
      role: newUserRole,
      password: cleanPass || (newUserRole !== 'operator' ? `${cleanNik.toLowerCase()}123` : undefined),
      qr_code: cleanQr,
      status: newUserStatus,
      created_at: new Date().toISOString(),
    };

    onSaveUsers([...users, newUser]);
    setIsAddUserModalOpen(false);
    sound.playSuccessBeep();
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserNik(user.employee_id);
    setEditUserName(user.nama);
    setEditUserRole(user.role);
    setEditUserPassword(''); // blank means do not change
    setEditUserQr(user.qr_code || user.employee_id);
    setEditUserStatus(user.status);
    setEditUserError('');
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserError('');

    const cleanNik = editUserNik.trim().toUpperCase();
    const cleanName = editUserName.trim();
    const cleanPass = editUserPassword.trim();
    const cleanQr = editUserQr.trim() || cleanNik;

    if (!cleanNik || cleanNik.length < 3) {
      setEditUserError('NIK / ID Karyawan minimal 3 karakter.');
      sound.playErrorBeep();
      return;
    }
    if (!cleanName || cleanName.length < 3) {
      setEditUserError('Nama Lengkap minimal 3 karakter.');
      sound.playErrorBeep();
      return;
    }

    // Check duplicate NIK against other users
    if (users.some((u) => u.id !== editingUser.id && u.employee_id.toUpperCase() === cleanNik)) {
      setEditUserError(`NIK / ID "${cleanNik}" sudah digunakan oleh pengguna lain!`);
      sound.playErrorBeep();
      return;
    }

    // Safeguard: If demoting or deactivating this admin, ensure at least one other active admin remains
    if (editingUser.role === 'admin' && (editUserRole !== 'admin' || editUserStatus !== 'active')) {
      const otherActiveAdmins = users.filter((u) => u.id !== editingUser.id && u.role === 'admin' && u.status === 'active');
      if (otherActiveAdmins.length === 0) {
        setEditUserError('Operasi ditolak: Sistem harus memiliki minimal satu akun Administrator aktif!');
        sound.playErrorBeep();
        return;
      }
    }

    const updatedUsers = users.map((u) => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          employee_id: cleanNik,
          nama: cleanName,
          role: editUserRole,
          status: editUserStatus,
          qr_code: cleanQr,
          password: cleanPass ? cleanPass : (u.password || `${cleanNik.toLowerCase()}123`),
        };
      }
      return u;
    });

    onSaveUsers(updatedUsers);
    setEditingUser(null);
    sound.playSuccessBeep();
  };

  const handleToggleUserStatus = (user: User) => {
    // If deactivating an admin, ensure not the last active admin
    if (user.role === 'admin' && user.status === 'active') {
      const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'active');
      if (activeAdmins.length <= 1) {
        alert('Tidak dapat menonaktifkan akun Administrator terakhir!');
        sound.playErrorBeep();
        return;
      }
    }

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    onSaveUsers(
      users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
    );
    sound.playSuccessBeep();
  };

  const handleOpenDeleteUser = (user: User) => {
    setDeleteUserError('');
    if (currentUser && currentUser.id === user.id) {
      alert('AKSES DITOLAK: Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan!');
      sound.playErrorBeep();
      return;
    }

    if (user.role === 'admin') {
      const remainingAdmins = users.filter((u) => u.id !== user.id && u.role === 'admin');
      if (remainingAdmins.length === 0) {
        alert('AKSES DITOLAK: Tidak dapat menghapus Administrator terakhir. Sistem harus memiliki minimal satu Admin!');
        sound.playErrorBeep();
        return;
      }
    }

    setDeletingUser(user);
  };

  const handleConfirmDeleteUser = () => {
    if (!deletingUser) return;

    if (currentUser && currentUser.id === deletingUser.id) {
      alert('AKSES DITOLAK: Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan!');
      sound.playErrorBeep();
      setDeletingUser(null);
      return;
    }

    if (deletingUser.role === 'admin') {
      const remainingAdmins = users.filter((u) => u.id !== deletingUser.id && u.role === 'admin');
      if (remainingAdmins.length === 0) {
        alert('AKSES DITOLAK: Tidak dapat menghapus Administrator terakhir. Sistem harus memiliki minimal satu Admin!');
        sound.playErrorBeep();
        setDeletingUser(null);
        return;
      }
    }

    onSaveUsers(users.filter((u) => u.id !== deletingUser.id));
    setDeletingUser(null);
    sound.playSuccessBeep();
  };

  // Compile all QR items into unified QRPrintItem format
  const allPrintableQrItems: QRPrintItem[] = [
    ...lines.map((line) => ({
      id: `line-${line.id}`,
      type: 'line' as const,
      code: line.qr_code_proses,
      title: line.nama_line,
      subtitle: line.kode_line,
      location: line.area ? `Area: ${line.area}` : undefined,
      badge: 'STIKER LOKASI PROSES TUJUAN',
    })),
    ...raks.map((rak) => ({
      id: `rak-${rak.id}`,
      type: 'rak' as const,
      code: rak.kode_rak,
      title: rak.nama_rak,
      subtitle: rak.kode_rak,
      location: `Zona: ${rak.zona}`,
      badge: 'STIKER RAK ASAL GUDANG',
    })),
    ...materials.map((mat) => {
      const sourceRak = raks.find((r) => r.id === mat.default_rak_id);
      return {
        id: `mat-${mat.id}`,
        type: 'material' as const,
        code: mat.kode_material,
        title: mat.deskripsi,
        subtitle: `Satuan: ${mat.satuan} • ${mat.kategori}`,
        location: sourceRak ? `Rak: ${sourceRak.kode_rak}` : undefined,
        badge: 'LABEL MATERIAL / PART',
      };
    }),
  ];

  // Filter QR items by category and search term
  const filteredQrItems = allPrintableQrItems.filter((item) => {
    if (qrFilter === 'lines' && item.type !== 'line') return false;
    if (qrFilter === 'raks' && item.type !== 'rak') return false;
    if (qrFilter === 'materials' && item.type !== 'material') return false;

    if (qrSearchTerm.trim()) {
      const term = qrSearchTerm.toLowerCase();
      const matchCode = item.code.toLowerCase().includes(term);
      const matchTitle = item.title.toLowerCase().includes(term);
      const matchSub = item.subtitle?.toLowerCase().includes(term);
      const matchLoc = item.location?.toLowerCase().includes(term);
      if (!matchCode && !matchTitle && !matchSub && !matchLoc) return false;
    }

    return true;
  });

  const toggleSelectQr = (id: string) => {
    setSelectedQrIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFilteredQr = () => {
    setSelectedQrIds((prev) => {
      const next = new Set(prev);
      filteredQrItems.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const handleDeselectAllQr = () => {
    setSelectedQrIds(new Set());
  };

  const handleOpenPrintModal = () => {
    if (selectedQrIds.size === 0) {
      // Auto-select current filtered items if none selected so the user can immediately print what's on screen
      const next = new Set<string>();
      filteredQrItems.forEach((item) => next.add(item.id));
      setSelectedQrIds(next);
    }
    setIsPrintModalOpen(true);
  };

  // Selected items to pass into the Print Preview Modal
  const selectedPrintItems = allPrintableQrItems.filter((item) => selectedQrIds.has(item.id));

  // Download Raw DB Backup JSON
  const handleExportJSON = () => {
    const backup = {
      export_date: new Date().toISOString(),
      version: '1.6',
      users,
      raks,
      materials,
      lines,
      tasks: tasks || [],
      taskItems: taskItems || [],
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
            type="button"
            onClick={handleExportJSON}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs"
            title="Download seluruh database sistem ke file JSON backup"
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>Export Raw Database (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setImportDbModalOpen(true)}
            className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs"
            title="Import & restore database sistem dari file JSON backup"
          >
            <Upload className="w-4 h-4 text-purple-600" />
            <span>Import Database (JSON)</span>
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
          <span>Kelola User ({users.length})</span>
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
          {/* Header Card & Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span>BULK PRINTING MODUL QR CODE FISIK PABRIK</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih label QR yang ingin dicetak secara selektif. Hasil cetak terisolasi khusus stiker dan bebas dari elemen halaman web.
                </p>
              </div>

              {/* Action: Open Print Preview */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPrintModal}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                  title="Buka pratinjau layout cetak stiker"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    Pratinjau &amp; Cetak {selectedQrIds.size > 0 ? `(${selectedQrIds.size} Dipilih)` : `(${filteredQrItems.length} Label)`}
                  </span>
                </button>
              </div>
            </div>

            {/* Filter, Search & Batch Selection Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative min-w-[200px] sm:min-w-[260px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={qrSearchTerm}
                    onChange={(e) => setQrSearchTerm(e.target.value)}
                    placeholder="Cari kode QR, nama, lokasi..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                  {qrSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setQrSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <select
                  value={qrFilter}
                  onChange={(e) => setQrFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold outline-none focus:border-amber-500 focus:bg-white cursor-pointer"
                >
                  <option value="all">Semua Kategori ({allPrintableQrItems.length})</option>
                  <option value="raks">Khusus Rak Asal ({raks.length})</option>
                  <option value="materials">Khusus Material &amp; Part ({materials.length})</option>
                  <option value="lines">Khusus Line Proses ({lines.length})</option>
                </select>
              </div>

              {/* Selection Batch Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFilteredQr}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition flex items-center gap-1.5"
                  title="Pilih semua stiker yang sesuai filter saat ini"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pilih Semua ({filteredQrItems.length})</span>
                </button>

                {selectedQrIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAllQr}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold rounded-lg transition flex items-center gap-1.5"
                    title="Kosongkan pilihan stiker"
                  >
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Batalkan Pilihan</span>
                  </button>
                )}

                <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg font-bold text-[11px]">
                  {selectedQrIds.size} dari {filteredQrItems.length} dipilih
                </div>
              </div>
            </div>
          </div>

          {/* QR Cards Grid */}
          {filteredQrItems.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <QrCode className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">Tidak Ada QR Code yang Cocok</p>
              <p className="text-xs text-slate-500">
                Coba ubah kata kunci pencarian atau ganti filter kategori.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredQrItems.map((item) => {
                const isSelected = selectedQrIds.has(item.id);

                let badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
                let borderColor = 'border-amber-400';
                if (item.type === 'line') {
                  badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                  borderColor = 'border-emerald-400';
                } else if (item.type === 'material') {
                  badgeColor = 'bg-blue-100 text-blue-900 border-blue-300';
                  borderColor = 'border-blue-400';
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelectQr(item.id)}
                    className={`relative bg-white text-slate-950 p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center space-y-2 select-none group ${
                      isSelected
                        ? `border-amber-500 ring-3 ring-amber-400/40 bg-amber-50/20 shadow-md`
                        : `border-slate-200 hover:border-slate-300 hover:shadow-xs`
                    }`}
                  >
                    {/* Top Row: Checkbox & Type Badge */}
                    <div className="w-full flex items-center justify-between gap-2">
                      <div className="p-0.5 rounded text-amber-600 transition">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-amber-600 fill-amber-100" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition" />
                        )}
                      </div>
                      <span
                        className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded border truncate ${badgeColor}`}
                      >
                        {item.type === 'line'
                          ? 'LINE TUJUAN'
                          : item.type === 'rak'
                          ? 'RAK GUDANG'
                          : 'MATERIAL PART'}
                      </span>
                    </div>

                    {/* QR Code Container */}
                    <div
                      className={`p-2 rounded-xl border transition ${
                        isSelected
                          ? 'bg-white border-amber-300 shadow-sm'
                          : 'bg-slate-50 border-slate-200 group-hover:bg-white'
                      }`}
                    >
                      <QRCodeSVG value={item.code} size={110} level="M" />
                    </div>

                    {/* QR Details */}
                    <div className="w-full space-y-0.5">
                      <span className="font-mono font-black text-sm block tracking-wide text-slate-900">
                        {item.code}
                      </span>
                      <span className="font-bold text-xs text-slate-800 block truncate" title={item.title}>
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-[10px] text-slate-500 block truncate font-medium">
                          {item.subtitle}
                        </span>
                      )}
                      {item.location && (
                        <span className="text-[10px] text-slate-600 block truncate font-mono">
                          {item.location}
                        </span>
                      )}
                    </div>

                    {/* Selection Prompt Footer */}
                    <div className="w-full pt-1.5 border-t border-slate-100 text-[10px] font-bold">
                      {isSelected ? (
                        <span className="text-amber-700 flex items-center justify-center gap-1">
                          <Check className="w-3 h-3 text-amber-600" />
                          <span>Label Dipilih</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 group-hover:text-slate-600">
                          Klik untuk memilih
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                              r.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {r.status || 'active'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRak(r)}
                              className="p-1.5 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded-lg transition"
                              title="Edit Master Rak"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRak(r.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 rounded-lg transition"
                              title="Hapus Master Rak"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                      <th className="px-3 py-2.5">Rak Asal</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {materials.map((m) => {
                      const rakObj = raks.find((r) => r.id === m.default_rak_id);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5 text-blue-700 font-bold">{m.kode_material}</td>
                          <td className="px-3 py-2.5 font-sans text-slate-900 font-medium">{m.deskripsi}</td>
                          <td className="px-3 py-2.5 text-slate-700">{m.satuan}</td>
                          <td className="px-3 py-2.5 font-sans text-slate-600">{m.kategori}</td>
                          <td className="px-3 py-2.5 text-amber-700 font-bold text-[11px]">
                            {rakObj ? rakObj.kode_rak : '-'}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                m.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {m.status || 'active'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditMaterial(m)}
                                className="p-1.5 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded-lg transition"
                                title="Edit Master Material"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMaterial(m.id)}
                                className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 rounded-lg transition"
                                title="Hapus Master Material"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                      <th className="px-3 py-2.5">Status</th>
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
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                              l.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {l.status || 'active'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditLine(l)}
                              className="p-1.5 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded-lg transition"
                              title="Edit Master Line"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(l.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 rounded-lg transition"
                              title="Hapus Master Line"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
        <div className="space-y-4">
          {/* Top Actions & Summary Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span>MANAJEMEN PENGGUNA &amp; HAK AKSES SISTEM</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tambah, perbarui profil/password, atur status aktif/nonaktif, serta hapus akun untuk semua tingkatan role (Admin, SPV, Manager, Operator).
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddUser}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition transform active:scale-95 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pengguna Baru</span>
              </button>
            </div>

            {/* Role Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col">
                <span className="text-[11px] font-semibold text-slate-500">Total Pengguna</span>
                <span className="text-lg font-black text-slate-900">{users.length}</span>
              </div>
              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 flex flex-col">
                <span className="text-[11px] font-semibold text-purple-700">Administrator</span>
                <span className="text-lg font-black text-purple-900">{users.filter((u) => u.role === 'admin').length}</span>
              </div>
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-col">
                <span className="text-[11px] font-semibold text-blue-700">Supervisor (SPV)</span>
                <span className="text-lg font-black text-blue-900">{users.filter((u) => u.role === 'spv').length}</span>
              </div>
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-col">
                <span className="text-[11px] font-semibold text-emerald-700">Logistics Manager</span>
                <span className="text-lg font-black text-emerald-900">{users.filter((u) => u.role === 'manager').length}</span>
              </div>
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex flex-col col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold text-amber-700">Operator Gemba</span>
                <span className="text-lg font-black text-amber-900">{users.filter((u) => u.role === 'operator').length}</span>
              </div>
            </div>

            {/* Search and Filters Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Cari berdasarkan NIK, Nama, atau Role..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium outline-none focus:border-purple-500 focus:bg-white"
                >
                  <option value="all">Semua Role</option>
                  <option value="admin">Administrator</option>
                  <option value="spv">Supervisor</option>
                  <option value="manager">Manager</option>
                  <option value="operator">Operator</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium outline-none focus:border-purple-500 focus:bg-white"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">NIK / ID Karyawan</th>
                    <th className="px-3.5 py-3">Nama Pengguna</th>
                    <th className="px-3.5 py-3">Role Akses</th>
                    <th className="px-3.5 py-3">Kredensial</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3">Terdaftar</th>
                    <th className="px-3.5 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users
                    .filter((u) => {
                      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
                      if (userStatusFilter !== 'all' && u.status !== userStatusFilter) return false;
                      if (userSearchTerm.trim()) {
                        const q = userSearchTerm.toLowerCase();
                        const matchNik = u.employee_id.toLowerCase().includes(q);
                        const matchName = u.nama.toLowerCase().includes(q);
                        const matchRole = u.role.toLowerCase().includes(q);
                        if (!matchNik && !matchName && !matchRole) return false;
                      }
                      return true;
                    })
                    .map((u) => {
                      const isSelf = currentUser && currentUser.id === u.id;
                      const isLastAdmin = u.role === 'admin' && users.filter((x) => x.role === 'admin').length <= 1;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="text-purple-700">{u.employee_id}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-300 font-sans px-1.5 py-0.2 rounded font-bold">
                                  Anda
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-3 font-medium text-slate-900">
                            <div>{u.nama}</div>
                            {u.qr_code && u.qr_code !== u.employee_id && (
                              <div className="text-[10px] text-slate-400 font-mono">QR: {u.qr_code}</div>
                            )}
                          </td>
                          <td className="px-3.5 py-3">
                            {u.role === 'admin' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                Administrator
                              </span>
                            )}
                            {u.role === 'spv' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                Supervisor (SPV)
                              </span>
                            )}
                            {u.role === 'manager' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Manager
                              </span>
                            )}
                            {u.role === 'operator' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Operator Gemba
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 font-mono text-[11px] text-slate-600">
                            {u.role === 'operator' ? (
                              <span className="text-slate-400 italic">Barcode Scan</span>
                            ) : u.password ? (
                              <span className="text-slate-500 tracking-wider">••••••••</span>
                            ) : (
                              <span className="text-amber-600 font-sans text-[10px]">Default</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3">
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                u.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                              }`}
                              title="Klik untuk mengubah status akun"
                            >
                              {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="px-3.5 py-3 text-slate-500 text-[11px]">
                            <div>{new Date(u.created_at).toLocaleDateString('id-ID')}</div>
                            {u.last_login_at && (
                              <div className="text-[10px] text-slate-400">
                                Login: {new Date(u.last_login_at).toLocaleDateString('id-ID')}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 rounded-lg transition"
                                title="Edit Pengguna"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteUser(u)}
                                disabled={Boolean(isSelf || isLastAdmin)}
                                className={`p-1.5 rounded-lg transition ${
                                  isSelf || isLastAdmin
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                    : 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600'
                                }`}
                                title={
                                  isSelf
                                    ? 'Akun Anda saat ini tidak dapat dihapus'
                                    : isLastAdmin
                                    ? 'Admin terakhir tidak dapat dihapus'
                                    : 'Hapus Pengguna'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah User Baru */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Tambah Pengguna Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-5 space-y-4 text-xs">
              {addUserError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addUserError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Role Hak Akses <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium outline-none focus:border-purple-500 focus:bg-white"
                >
                  <option value="operator">Operator Gemba</option>
                  <option value="spv">Supervisor (SPV)</option>
                  <option value="manager">Logistics Manager</option>
                  <option value="admin">Administrator Sistem</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  NIK / ID Karyawan (Username) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserNik}
                  onChange={(e) => {
                    setNewUserNik(e.target.value);
                    if (!newUserQr) setNewUserQr(e.target.value.toUpperCase());
                  }}
                  placeholder="Contoh: OP-004 atau admin2"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              {newUserRole !== 'operator' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                    <span>Password Login Staff <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-slate-400">Minimal 4 karakter</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              )}

              {newUserRole === 'operator' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                    <span>QR Code / Barcode Fisik</span>
                    <span className="text-[10px] text-slate-400">Otomatis sama dengan NIK jika kosong</span>
                  </label>
                  <input
                    type="text"
                    value={newUserQr}
                    onChange={(e) => setNewUserQr(e.target.value)}
                    placeholder="Contoh: OP-004"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Status Akun</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="new_status"
                      value="active"
                      checked={newUserStatus === 'active'}
                      onChange={() => setNewUserStatus('active')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-800">Aktif</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="new_status"
                      value="inactive"
                      checked={newUserStatus === 'inactive'}
                      onChange={() => setNewUserStatus('inactive')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-800">Nonaktif</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs transition"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Edit Data Pengguna</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="p-5 space-y-4 text-xs">
              {editUserError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editUserError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Role Hak Akses <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium outline-none focus:border-purple-500 focus:bg-white"
                >
                  <option value="operator">Operator Gemba</option>
                  <option value="spv">Supervisor (SPV)</option>
                  <option value="manager">Logistics Manager</option>
                  <option value="admin">Administrator Sistem</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  NIK / ID Karyawan (Username) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editUserNik}
                  onChange={(e) => setEditUserNik(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span>Kata Sandi Baru</span>
                  <span className="text-[10px] text-slate-400">Kosongkan jika tidak diubah</span>
                </label>
                <input
                  type="password"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru jika ingin mengubah..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  QR Code / Barcode String
                </label>
                <input
                  type="text"
                  value={editUserQr}
                  onChange={(e) => setEditUserQr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Status Akun</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_status"
                      value="active"
                      checked={editUserStatus === 'active'}
                      onChange={() => setEditUserStatus('active')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-800">Aktif</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_status"
                      value="inactive"
                      checked={editUserStatus === 'inactive'}
                      onChange={() => setEditUserStatus('inactive')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-800">Nonaktif</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus User */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">Hapus Pengguna?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus akun pengguna berikut dari sistem secara permanen?
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-left space-y-1">
              <div>
                <span className="text-slate-400">NIK:</span> <strong className="text-purple-700">{deletingUser.employee_id}</strong>
              </div>
              <div className="font-sans">
                <span className="text-slate-400 font-mono">Nama:</span> <strong className="text-slate-900">{deletingUser.nama}</strong>
              </div>
              <div>
                <span className="text-slate-400">Role:</span> <strong className="text-slate-700 uppercase">{deletingUser.role}</strong>
              </div>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Raw Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">System Raw Audit Trail &amp; Database Hub</h3>
            <span className="text-xs font-mono text-slate-500">{logs.length} Total Logs</span>
          </div>

          {/* Database Backup & Recovery Hub Card */}
          <div className="p-4 bg-gradient-to-r from-purple-50 via-slate-50 to-purple-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Database className="w-4 h-4 text-purple-600" />
                Pusat Cadangan &amp; Pemulihan Database (Backup &amp; Restore)
              </span>
              <p className="text-[11px] text-slate-600">
                Unduh seluruh isi database sistem (Master, User, Tasks, &amp; Logs) ke file JSON atau pulihkan dari cadangan sebelumnya.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportJSON}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                title="Download seluruh database sistem ke file JSON backup"
              >
                <Download className="w-3.5 h-3.5 text-purple-600" />
                <span>Export Backup (JSON)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportDbModalOpen(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                title="Import & restore database sistem dari file JSON backup"
              >
                <Upload className="w-3.5 h-3.5 text-white" />
                <span>Import Database (JSON)</span>
              </button>
            </div>
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

      {/* Modal: Edit Master Rak */}
      {editingRak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Boxes className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Edit Master Rak Gudang</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRak(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditRakSubmit} className="p-5 space-y-4 text-xs">
              {editRakError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editRakError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Kode Rak (Unik) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editRakCode}
                  onChange={(e) => setEditRakCode(e.target.value)}
                  placeholder="e.g. RAK-A12"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nama Rak <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editRakName}
                  onChange={(e) => setEditRakName(e.target.value)}
                  placeholder="e.g. Rak Fasteners A12"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Zona / Area Gudang</label>
                <input
                  type="text"
                  value={editRakZone}
                  onChange={(e) => setEditRakZone(e.target.value)}
                  placeholder="e.g. Zona Fastener - Hall A"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Status Rak</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_rak_status"
                      value="active"
                      checked={editRakStatus === 'active'}
                      onChange={() => setEditRakStatus('active')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-800">Aktif</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_rak_status"
                      value="inactive"
                      checked={editRakStatus === 'inactive'}
                      onChange={() => setEditRakStatus('inactive')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-800">Nonaktif</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRak(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Master Material */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Edit Master Material &amp; Part</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditMaterialSubmit} className="p-5 space-y-4 text-xs">
              {editMatError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editMatError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Kode Material (Unik) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editMatCode}
                    onChange={(e) => setEditMatCode(e.target.value)}
                    placeholder="e.g. MAT-001"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Rak Gudang Default Asal
                  </label>
                  <select
                    value={editMatRakId}
                    onChange={(e) => setEditMatRakId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    {raks.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.kode_rak} ({r.nama_rak})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Deskripsi Material <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editMatDesc}
                  onChange={(e) => setEditMatDesc(e.target.value)}
                  placeholder="e.g. Baut M6x20 Stainless Steel"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Satuan</label>
                  <select
                    value={editMatUnit}
                    onChange={(e) => setEditMatUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Box">Box</option>
                    <option value="Crate">Crate</option>
                    <option value="Set">Set</option>
                    <option value="Roll">Roll</option>
                    <option value="Kg">Kg</option>
                    <option value="Liter">Liter</option>
                    <option value="Batang">Batang</option>
                    <option value="Lembar">Lembar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kategori</label>
                  <input
                    type="text"
                    value={editMatCategory}
                    onChange={(e) => setEditMatCategory(e.target.value)}
                    placeholder="e.g. Hardware"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Status Material</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_mat_status"
                      value="active"
                      checked={editMatStatus === 'active'}
                      onChange={() => setEditMatStatus('active')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-800">Aktif</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_mat_status"
                      value="inactive"
                      checked={editMatStatus === 'inactive'}
                      onChange={() => setEditMatStatus('inactive')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-800">Nonaktif</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Master Line */}
      {editingLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Edit Master Line / Proses</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingLine(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditLineSubmit} className="p-5 space-y-4 text-xs">
              {editLineError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editLineError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Kode Line (Unik) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editLineCode}
                  onChange={(e) => setEditLineCode(e.target.value)}
                  placeholder="e.g. LINE-01"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nama Proses / Stasiun <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editLineName}
                  onChange={(e) => setEditLineName(e.target.value)}
                  placeholder="e.g. Sub-Assembly Mainframe"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span>QR Code String Fisik Lokasi</span>
                  <span className="text-[10px] text-slate-400 font-mono">Untuk verifikasi penyerahan</span>
                </label>
                <input
                  type="text"
                  required
                  value={editLineQr}
                  onChange={(e) => setEditLineQr(e.target.value)}
                  placeholder="e.g. QR-LINE-01-SUBASSY"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Area Pabrik</label>
                <input
                  type="text"
                  value={editLineArea}
                  onChange={(e) => setEditLineArea(e.target.value)}
                  placeholder="e.g. Hall A - Sub Assembly"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Status Line</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_line_status"
                      value="active"
                      checked={editLineStatus === 'active'}
                      onChange={() => setEditLineStatus('active')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-800">Aktif</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_line_status"
                      value="inactive"
                      checked={editLineStatus === 'inactive'}
                      onChange={() => setEditLineStatus('inactive')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-slate-800">Nonaktif</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLine(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
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

      {/* Import Raw Database JSON Modal */}
      <ImportDatabaseModal
        isOpen={importDbModalOpen}
        onClose={() => setImportDbModalOpen(false)}
        onImportConfirm={(data, mode) => {
          if (onRestoreDatabase) {
            onRestoreDatabase(data, mode);
          }
        }}
      />

      {/* QR Print Preview & Selective Print Sheet Modal */}
      <QRPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        items={selectedPrintItems.length > 0 ? selectedPrintItems : filteredQrItems}
      />
    </div>
  );
};
