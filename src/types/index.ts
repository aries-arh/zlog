export type UserRole = 'admin' | 'spv' | 'manager' | 'operator';

export interface User {
  id: string;
  employee_id: string;
  nama: string;
  qr_code?: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  created_at: string;
  last_login_at?: string;
}

export interface MasterRak {
  id: string;
  kode_rak: string;
  nama_rak: string;
  zona: string;
  status: 'active' | 'inactive';
}

export interface MasterMaterial {
  id: string;
  kode_material: string;
  deskripsi: string;
  satuan: string;
  default_rak_id: string;
  kategori: string;
  status: 'active' | 'inactive';
}

export interface MasterLine {
  id: string;
  kode_line: string;
  nama_line: string;
  qr_code_proses: string;
  area: string;
  status: 'active' | 'inactive';
}

export type TaskStatus = 'new' | 'active' | 'completed' | 'cancelled';
export type TaskItemStatus = 'PICKED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type DepartureMode = 'MANUAL_PRESS' | 'AUTO_FALLBACK';

export interface TaskItem {
  id: string;
  task_id: string;
  user_id: string;
  rak_id: string;
  material_id: string;
  qty: number;
  satuan: string;
  line_id: string;
  status: TaskItemStatus;
  departure_mode: DepartureMode;
  last_material_scanned_at: string;
  picked_at: string | null;     // T1
  delivered_at: string | null;  // T2
  return_at: string | null;     // T3
  delivery_duration_sec: number | null; // T2 - T1
  return_duration_sec: number | null;   // T3 - T2
}

export interface Task {
  id: string;
  user_id: string;
  task_no: string;
  tanggal: string;
  shift: 1 | 2 | 3;
  status: TaskStatus;
  start_time: string;
  end_time: string | null;
}

export type EventType =
  | 'LOGIN'
  | 'AUTO_REGISTER'
  | 'TASK_CREATE'
  | 'MATERIAL_PICKED'
  | 'DEPARTURE_MANUAL'
  | 'DEPARTURE_AUTO_FALLBACK'
  | 'DELIVERED_CONFIRMED'
  | 'DELIVERY_MISMATCH_REJECTED'
  | 'RETURN_TO_RACK'
  | 'TASK_COMPLETED';

export interface SpatiotemporalLogEvent {
  id: string;
  timestamp: string;
  task_id: string;
  task_item_id?: string;
  operator_id: string;
  operator_name: string;
  event_type: EventType;
  notes: string;
  departure_mode?: DepartureMode;
  location_ref?: string;
}
