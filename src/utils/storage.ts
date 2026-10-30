import {
  User,
  MasterRak,
  MasterMaterial,
  MasterLine,
  Task,
  TaskItem,
  SpatiotemporalLogEvent,
} from '../types';

const STORAGE_KEYS = {
  USERS: 'zeva_users_v16',
  RAKS: 'zeva_raks_v16',
  MATERIALS: 'zeva_materials_v16',
  LINES: 'zeva_lines_v16',
  TASKS: 'zeva_tasks_v16',
  TASK_ITEMS: 'zeva_task_items_v16',
  LOGS: 'zeva_logs_v16',
  CURRENT_USER: 'zeva_current_user_v16',
  ACTIVE_TASK_ID: 'zeva_active_task_id_v16',
};

const SEED_USERS: User[] = [
  {
    id: 'u-admin',
    employee_id: 'admin',
    nama: 'Ahmad Faisal (Admin)',
    role: 'admin',
    status: 'active',
    created_at: '2026-10-01T07:00:00.000Z',
    last_login_at: '2026-10-30T02:15:00.000Z',
  },
  {
    id: 'u-spv',
    employee_id: 'spv',
    nama: 'Rian Wijaya (Supervisor)',
    role: 'spv',
    status: 'active',
    created_at: '2026-10-01T07:00:00.000Z',
    last_login_at: '2026-10-30T03:00:00.000Z',
  },
  {
    id: 'u-mgr',
    employee_id: 'manager',
    nama: 'Bambang Soediro (Logistics Manager)',
    role: 'manager',
    status: 'active',
    created_at: '2026-10-01T07:00:00.000Z',
    last_login_at: '2026-10-29T16:00:00.000Z',
  },
  {
    id: 'u-op-001',
    employee_id: 'OP-001',
    nama: 'Budi Santoso',
    qr_code: 'OP-001',
    role: 'operator',
    status: 'active',
    created_at: '2026-10-10T06:30:00.000Z',
    last_login_at: '2026-10-30T03:10:00.000Z',
  },
  {
    id: 'u-op-002',
    employee_id: 'OP-002',
    nama: 'Agus Pratama',
    qr_code: 'OP-002',
    role: 'operator',
    status: 'active',
    created_at: '2026-10-12T06:30:00.000Z',
    last_login_at: '2026-10-30T02:40:00.000Z',
  },
  {
    id: 'u-op-003',
    employee_id: 'OP-003',
    nama: 'Siti Rahma',
    qr_code: 'OP-003',
    role: 'operator',
    status: 'active',
    created_at: '2026-10-15T06:30:00.000Z',
    last_login_at: '2026-10-30T01:50:00.000Z',
  },
];

const SEED_RAKS: MasterRak[] = [
  { id: 'rak-1', kode_rak: 'RAK-A12', nama_rak: 'Rak Fasteners A12', zona: 'Zona Fastener - Hall A', status: 'active' },
  { id: 'rak-2', kode_rak: 'RAK-B08', nama_rak: 'Rak Electronics B08', zona: 'Zona Electronics - Hall B', status: 'active' },
  { id: 'rak-3', kode_rak: 'RAK-C05', nama_rak: 'Rak Mechanical C05', zona: 'Zona Sub-Assembly - Hall A', status: 'active' },
  { id: 'rak-4', kode_rak: 'RAK-D02', nama_rak: 'Rak Plastic & Casing D02', zona: 'Zona Molding - Hall C', status: 'active' },
];

const SEED_MATERIALS: MasterMaterial[] = [
  {
    id: 'mat-1',
    kode_material: 'MAT-001',
    deskripsi: 'Baut M6x20 Stainless Steel',
    satuan: 'Pcs',
    default_rak_id: 'rak-1',
    kategori: 'Hardware',
    status: 'active',
  },
  {
    id: 'mat-2',
    kode_material: 'MAT-002',
    deskripsi: 'Mur Hex M6 Nylon Lock',
    satuan: 'Pcs',
    default_rak_id: 'rak-1',
    kategori: 'Hardware',
    status: 'active',
  },
  {
    id: 'mat-3',
    kode_material: 'MAT-003',
    deskripsi: 'Kabel Harness Assy 12V',
    satuan: 'Set',
    default_rak_id: 'rak-2',
    kategori: 'Electrical',
    status: 'active',
  },
  {
    id: 'mat-4',
    kode_material: 'MAT-004',
    deskripsi: 'IC Controller Board V2.1',
    satuan: 'Box',
    default_rak_id: 'rak-2',
    kategori: 'Electrical',
    status: 'active',
  },
  {
    id: 'mat-5',
    kode_material: 'MAT-005',
    deskripsi: 'Bracket Motor Mounting',
    satuan: 'Pcs',
    default_rak_id: 'rak-3',
    kategori: 'Mechanical',
    status: 'active',
  },
  {
    id: 'mat-6',
    kode_material: 'MAT-006',
    deskripsi: 'Housing Casing Depan ABS',
    satuan: 'Crate',
    default_rak_id: 'rak-4',
    kategori: 'Plastic',
    status: 'active',
  },
];

const SEED_LINES: MasterLine[] = [
  {
    id: 'line-1',
    kode_line: 'LINE-01',
    nama_line: 'Line 1 - Assy Main Frame',
    qr_code_proses: 'QR-LINE-01-ASSY',
    area: 'Area A - Assembly Hall',
    status: 'active',
  },
  {
    id: 'line-2',
    kode_line: 'LINE-02',
    nama_line: 'Line 2 - Sub-Assembly Drive',
    qr_code_proses: 'QR-LINE-02-SUBASSY',
    area: 'Area B - Sub-Assembly',
    status: 'active',
  },
  {
    id: 'line-3',
    kode_line: 'LINE-03',
    nama_line: 'Line 3 - Wiring & Electronics',
    qr_code_proses: 'QR-LINE-03-WIRING',
    area: 'Area B - Sub-Assembly',
    status: 'active',
  },
  {
    id: 'line-4',
    kode_line: 'LINE-04',
    nama_line: 'Line 4 - Final Testing & Pack',
    qr_code_proses: 'QR-LINE-04-FINAL',
    area: 'Area C - Quality & Pack',
    status: 'active',
  },
];

const SEED_TASKS: Task[] = [
  {
    id: 'task-101',
    user_id: 'u-op-001',
    task_no: 'T-20261030-001',
    tanggal: '2026-10-30',
    shift: 1,
    status: 'completed',
    start_time: '2026-10-30T02:00:00.000Z',
    end_time: '2026-10-30T02:18:45.000Z',
  },
  {
    id: 'task-102',
    user_id: 'u-op-002',
    task_no: 'T-20261030-002',
    tanggal: '2026-10-30',
    shift: 1,
    status: 'completed',
    start_time: '2026-10-30T02:20:00.000Z',
    end_time: '2026-10-30T02:35:12.000Z',
  },
  {
    id: 'task-103',
    user_id: 'u-op-001',
    task_no: 'T-20261030-003',
    tanggal: '2026-10-30',
    shift: 1,
    status: 'active',
    start_time: '2026-10-30T03:05:00.000Z',
    end_time: null,
  },
];

const SEED_TASK_ITEMS: TaskItem[] = [
  {
    id: 'item-101-1',
    task_id: 'task-101',
    user_id: 'u-op-001',
    rak_id: 'rak-1',
    material_id: 'mat-1',
    qty: 50,
    satuan: 'Pcs',
    line_id: 'line-1',
    status: 'DELIVERED',
    departure_mode: 'MANUAL_PRESS',
    last_material_scanned_at: '2026-10-30T02:04:10.000Z',
    picked_at: '2026-10-30T02:05:00.000Z', // T1
    delivered_at: '2026-10-30T02:09:12.000Z', // T2
    return_at: '2026-10-30T02:14:30.000Z', // T3
    delivery_duration_sec: 252, // 4m 12s
    return_duration_sec: 318, // 5m 18s
  },
  {
    id: 'item-101-2',
    task_id: 'task-101',
    user_id: 'u-op-001',
    rak_id: 'rak-1',
    material_id: 'mat-2',
    qty: 50,
    satuan: 'Pcs',
    line_id: 'line-1',
    status: 'DELIVERED',
    departure_mode: 'MANUAL_PRESS',
    last_material_scanned_at: '2026-10-30T02:04:45.000Z',
    picked_at: '2026-10-30T02:05:00.000Z',
    delivered_at: '2026-10-30T02:09:12.000Z',
    return_at: '2026-10-30T02:14:30.000Z',
    delivery_duration_sec: 252,
    return_duration_sec: 318,
  },
  {
    id: 'item-102-1',
    task_id: 'task-102',
    user_id: 'u-op-002',
    rak_id: 'rak-2',
    material_id: 'mat-3',
    qty: 15,
    satuan: 'Set',
    line_id: 'line-2',
    status: 'DELIVERED',
    departure_mode: 'AUTO_FALLBACK', // Poka-Yoke fallback example!
    last_material_scanned_at: '2026-10-30T02:22:30.000Z',
    picked_at: '2026-10-30T02:22:30.000Z', // T1 = last scanned
    delivered_at: '2026-10-30T02:28:40.000Z', // T2
    return_at: '2026-10-30T02:35:12.000Z', // T3
    delivery_duration_sec: 370, // 6m 10s
    return_duration_sec: 392,
  },
  {
    id: 'item-103-1',
    task_id: 'task-103',
    user_id: 'u-op-001',
    rak_id: 'rak-1',
    material_id: 'mat-1',
    qty: 20,
    satuan: 'Pcs',
    line_id: 'line-1',
    status: 'IN_TRANSIT',
    departure_mode: 'MANUAL_PRESS',
    last_material_scanned_at: '2026-10-30T03:07:00.000Z',
    picked_at: '2026-10-30T03:07:30.000Z',
    delivered_at: null,
    return_at: null,
    delivery_duration_sec: null,
    return_duration_sec: null,
  },
  {
    id: 'item-103-2',
    task_id: 'task-103',
    user_id: 'u-op-001',
    rak_id: 'rak-2',
    material_id: 'mat-4',
    qty: 5,
    satuan: 'Box',
    line_id: 'line-2',
    status: 'IN_TRANSIT',
    departure_mode: 'MANUAL_PRESS',
    last_material_scanned_at: '2026-10-30T03:08:15.000Z',
    picked_at: '2026-10-30T03:08:30.000Z',
    delivered_at: null,
    return_at: null,
    delivery_duration_sec: null,
    return_duration_sec: null,
  },
];

const SEED_LOGS: SpatiotemporalLogEvent[] = [
  {
    id: 'log-1',
    timestamp: '2026-10-30T02:00:00.000Z',
    task_id: 'task-101',
    operator_id: 'u-op-001',
    operator_name: 'Budi Santoso',
    event_type: 'TASK_CREATE',
    notes: 'Task T-20261030-001 dibuat (Shift 1)',
  },
  {
    id: 'log-2',
    timestamp: '2026-10-30T02:04:10.000Z',
    task_id: 'task-101',
    task_item_id: 'item-101-1',
    operator_id: 'u-op-001',
    operator_name: 'Budi Santoso',
    event_type: 'MATERIAL_PICKED',
    notes: 'Scan Material MAT-001 di RAK-A12 (Qty: 50 Pcs)',
    location_ref: 'RAK-A12',
  },
  {
    id: 'log-3',
    timestamp: '2026-10-30T02:05:00.000Z',
    task_id: 'task-101',
    operator_id: 'u-op-001',
    operator_name: 'Budi Santoso',
    event_type: 'DEPARTURE_MANUAL',
    departure_mode: 'MANUAL_PRESS',
    notes: 'Konfirmasi Berangkat ditekan manual (T1 set)',
  },
  {
    id: 'log-4',
    timestamp: '2026-10-30T02:09:12.000Z',
    task_id: 'task-101',
    task_item_id: 'item-101-1',
    operator_id: 'u-op-001',
    operator_name: 'Budi Santoso',
    event_type: 'DELIVERED_CONFIRMED',
    departure_mode: 'MANUAL_PRESS',
    notes: 'Verifikasi Scan Sukses di Line 1 - Assy Main Frame (T2: Lead Time 4m 12s)',
    location_ref: 'QR-LINE-01-ASSY',
  },
  {
    id: 'log-5',
    timestamp: '2026-10-30T02:28:40.000Z',
    task_id: 'task-102',
    task_item_id: 'item-102-1',
    operator_id: 'u-op-002',
    operator_name: 'Agus Pratama',
    event_type: 'DEPARTURE_AUTO_FALLBACK',
    departure_mode: 'AUTO_FALLBACK',
    notes: 'POKA-YOKE: Operator lupa tekan berangkat. T1 otomatis diambil dari scan material terakhir.',
    location_ref: 'QR-LINE-02-SUBASSY',
  },
];

// Helper Storage methods
export const storage = {
  getUsers: (): User[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    return JSON.parse(raw);
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getRaks: (): MasterRak[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.RAKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RAKS, JSON.stringify(SEED_RAKS));
      return SEED_RAKS;
    }
    return JSON.parse(raw);
  },
  saveRaks: (raks: MasterRak[]) => {
    localStorage.setItem(STORAGE_KEYS.RAKS, JSON.stringify(raks));
  },

  getMaterials: (): MasterMaterial[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.MATERIALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(SEED_MATERIALS));
      return SEED_MATERIALS;
    }
    return JSON.parse(raw);
  },
  saveMaterials: (mats: MasterMaterial[]) => {
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(mats));
  },

  getLines: (): MasterLine[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.LINES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LINES, JSON.stringify(SEED_LINES));
      return SEED_LINES;
    }
    return JSON.parse(raw);
  },
  saveLines: (lines: MasterLine[]) => {
    localStorage.setItem(STORAGE_KEYS.LINES, JSON.stringify(lines));
  },

  getTasks: (): Task[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(SEED_TASKS));
      return SEED_TASKS;
    }
    return JSON.parse(raw);
  },
  saveTasks: (tasks: Task[]) => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  getTaskItems: (): TaskItem[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.TASK_ITEMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TASK_ITEMS, JSON.stringify(SEED_TASK_ITEMS));
      return SEED_TASK_ITEMS;
    }
    return JSON.parse(raw);
  },
  saveTaskItems: (items: TaskItem[]) => {
    localStorage.setItem(STORAGE_KEYS.TASK_ITEMS, JSON.stringify(items));
  },

  getLogs: (): SpatiotemporalLogEvent[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(SEED_LOGS));
      return SEED_LOGS;
    }
    return JSON.parse(raw);
  },
  addLog: (log: Omit<SpatiotemporalLogEvent, 'id' | 'timestamp'>) => {
    const logs = storage.getLogs();
    const newLog: SpatiotemporalLogEvent = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog); // latest first
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 500))); // keep up to 500
    return newLog;
  },

  getCurrentUser: (): User | null => {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getActiveTaskId: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_TASK_ID);
  },
  setActiveTaskId: (taskId: string | null) => {
    if (taskId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TASK_ID, taskId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TASK_ID);
    }
  },

  resetAllData: () => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(STORAGE_KEYS.RAKS, JSON.stringify(SEED_RAKS));
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(SEED_MATERIALS));
    localStorage.setItem(STORAGE_KEYS.LINES, JSON.stringify(SEED_LINES));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(SEED_TASKS));
    localStorage.setItem(STORAGE_KEYS.TASK_ITEMS, JSON.stringify(SEED_TASK_ITEMS));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(SEED_LOGS));
  },
};

// Shift calculator helper
export function getCurrentShift(): 1 | 2 | 3 {
  const hour = new Date().getHours();
  // Shift 1: 06:00 - 14:00, Shift 2: 14:00 - 22:00, Shift 3: 22:00 - 06:00
  if (hour >= 6 && hour < 14) return 1;
  if (hour >= 14 && hour < 22) return 2;
  return 3;
}

// Generate unique task number: e.g. T-20261030-004
export function generateTaskNo(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(100 + Math.random() * 900);
  return `T-${yyyy}${mm}${dd}-${rand}`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} dtk`;
  return `${m} mnt ${s} dtk`;
}
