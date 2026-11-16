import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const DB_PATH = path.resolve(process.cwd(), 'data', 'db.json');

// Default initial data if db.json does not exist
const INITIAL_DATA = {
  users: [
    {
      id: 'u-admin',
      employee_id: 'admin',
      nama: 'Ahmad Faisal (Admin)',
      role: 'admin',
      password: 'admin123',
      status: 'active',
      created_at: '2026-10-01T07:00:00.000Z',
      last_login_at: '2026-10-30T02:15:00.000Z',
    },
    {
      id: 'u-spv',
      employee_id: 'spv',
      nama: 'Rian Wijaya (Supervisor)',
      role: 'spv',
      password: 'spv123',
      status: 'active',
      created_at: '2026-10-01T07:00:00.000Z',
      last_login_at: '2026-10-30T03:00:00.000Z',
    },
    {
      id: 'u-mgr',
      employee_id: 'manager',
      nama: 'Bambang Soediro (Logistics Manager)',
      role: 'manager',
      password: 'manager123',
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
  ],
  raks: [
    { id: 'rak-1', kode_rak: 'RAK-A12', nama_rak: 'Rak Fasteners A12', zona: 'Zona Fastener - Hall A', status: 'active' },
    { id: 'rak-2', kode_rak: 'RAK-B08', nama_rak: 'Rak Electronics B08', zona: 'Zona Electronics - Hall B', status: 'active' },
    { id: 'rak-3', kode_rak: 'RAK-C05', nama_rak: 'Rak Mechanical C05', zona: 'Zona Sub-Assembly - Hall A', status: 'active' },
    { id: 'rak-4', kode_rak: 'RAK-D02', nama_rak: 'Rak Plastic & Casing D02', zona: 'Zona Molding - Hall C', status: 'active' },
  ],
  materials: [
    { id: 'mat-1', kode_material: 'MAT-001', deskripsi: 'Baut M6x20 Stainless Steel', satuan: 'Pcs', default_rak_id: 'rak-1', kategori: 'Hardware', status: 'active' },
    { id: 'mat-2', kode_material: 'MAT-002', deskripsi: 'Mur Hex M6 Nylon Lock', satuan: 'Pcs', default_rak_id: 'rak-1', kategori: 'Hardware', status: 'active' },
    { id: 'mat-3', kode_material: 'MAT-003', deskripsi: 'Kabel Harness Assy 12V', satuan: 'Set', default_rak_id: 'rak-2', kategori: 'Electrical', status: 'active' },
    { id: 'mat-4', kode_material: 'MAT-004', deskripsi: 'IC Controller Board V2.1', satuan: 'Box', default_rak_id: 'rak-2', kategori: 'Electrical', status: 'active' },
    { id: 'mat-5', kode_material: 'MAT-005', deskripsi: 'Bracket Motor Mounting', satuan: 'Pcs', default_rak_id: 'rak-3', kategori: 'Mechanical', status: 'active' },
    { id: 'mat-6', kode_material: 'MAT-006', deskripsi: 'Housing Casing Depan ABS', satuan: 'Crate', default_rak_id: 'rak-4', kategori: 'Plastic', status: 'active' },
  ],
  lines: [
    { id: 'line-1', kode_line: 'LINE-01', nama_line: 'Line 1 - Assy Main Frame', qr_code_proses: 'QR-LINE-01-ASSY', area: 'Area A - Assembly Hall', status: 'active' },
    { id: 'line-2', kode_line: 'LINE-02', nama_line: 'Line 2 - Sub-Assembly Drive', qr_code_proses: 'QR-LINE-02-SUBASSY', area: 'Area B - Sub-Assembly', status: 'active' },
    { id: 'line-3', kode_line: 'LINE-03', nama_line: 'Line 3 - Wiring & Electronics', qr_code_proses: 'QR-LINE-03-WIRING', area: 'Area B - Sub-Assembly', status: 'active' },
    { id: 'line-4', kode_line: 'LINE-04', nama_line: 'Line 4 - Final Testing & Pack', qr_code_proses: 'QR-LINE-04-FINAL', area: 'Area C - Quality & Pack', status: 'active' },
  ],
  tasks: [
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
  ],
  task_items: [
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
      picked_at: '2026-10-30T02:05:00.000Z',
      delivered_at: '2026-10-30T02:09:12.000Z',
      return_at: '2026-10-30T02:14:30.000Z',
      delivery_duration_sec: 252,
      return_duration_sec: 318,
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
      departure_mode: 'AUTO_FALLBACK',
      last_material_scanned_at: '2026-10-30T02:22:30.000Z',
      picked_at: '2026-10-30T02:22:30.000Z',
      delivered_at: '2026-10-30T02:28:40.000Z',
      return_at: '2026-10-30T02:35:12.000Z',
      delivery_duration_sec: 370,
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
  ],
  logs: [
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
  ],
  last_updated: Date.now(),
};

// Ensure data folder and file exists
function ensureDb(): any {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    return INITIAL_DATA;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[ZEVA-API] Error reading db.json, re-initializing...', err);
    fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    return INITIAL_DATA;
  }
}

function writeDb(data: any) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  data.last_updated = Date.now();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  return data.last_updated;
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function setCors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

export function handleApiRequest(req: IncomingMessage, res: ServerResponse, next?: () => void) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = req.url || '';
  const pathname = url.split('?')[0];

  // Route 1: GET /api/data or /api/storage
  if ((pathname === '/api/data' || pathname === '/api/storage') && req.method === 'GET') {
    const db = ensureDb();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: db, last_updated: db.last_updated || Date.now() }));
    return;
  }

  // Route 2: POST /api/data or /api/storage (Full save or initial sync)
  if ((pathname === '/api/data' || pathname === '/api/storage') && req.method === 'POST') {
    parseJsonBody(req).then((body) => {
      const current = ensureDb();
      const updated = {
        ...current,
        ...(body.users ? { users: body.users } : {}),
        ...(body.raks ? { raks: body.raks } : {}),
        ...(body.materials ? { materials: body.materials } : {}),
        ...(body.lines ? { lines: body.lines } : {}),
        ...(body.tasks ? { tasks: body.tasks } : {}),
        ...(body.task_items ? { task_items: body.task_items } : {}),
        ...(body.logs ? { logs: body.logs } : {}),
      };
      const last_updated = writeDb(updated);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, last_updated }));
    });
    return;
  }

  // Route 3: POST /api/save-entity (Save single table: tasks, task_items, materials, raks, lines, users, logs)
  if (pathname === '/api/save-entity' && req.method === 'POST') {
    parseJsonBody(req).then((body) => {
      const { entity, data } = body;
      if (!entity || !data) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: 'Invalid entity or data' }));
        return;
      }
      const current = ensureDb();
      current[entity] = data;
      const last_updated = writeDb(current);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, entity, last_updated }));
    });
    return;
  }

  // Route 4: GET /api/last-updated (For high-frequency polling with ultra-light payload)
  if (pathname === '/api/last-updated' && req.method === 'GET') {
    const db = ensureDb();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, last_updated: db.last_updated || 0 }));
    return;
  }

  // Route 5: POST /api/reset (Reset database to defaults)
  if (pathname === '/api/reset' && req.method === 'POST') {
    const last_updated = writeDb({ ...INITIAL_DATA, last_updated: Date.now() });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, message: 'Database reset to default seeds', last_updated }));
    return;
  }

  // If next exists, call it; otherwise 404
  if (typeof next === 'function') {
    next();
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
}

