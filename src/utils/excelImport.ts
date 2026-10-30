import * as XLSX from 'xlsx';
import { MasterRak, MasterMaterial, MasterLine } from '../types';

// Sample template rows
export const SAMPLE_RAK_ROWS = [
  {
    kode_rak: 'RAK-E01',
    nama_rak: 'Rak Stamping Press Hall E',
    zona: 'Hall E - Press Stamping Room',
  },
  {
    kode_rak: 'RAK-E02',
    nama_rak: 'Rak Fastener Bolt & Nut M8-M12',
    zona: 'Hall E - Central Hardware Warehouse',
  },
  {
    kode_rak: 'RAK-F01',
    nama_rak: 'Rak Bracket Sensor & ECU',
    zona: 'Hall F - Electrical Storage',
  },
  {
    kode_rak: 'RAK-F02',
    nama_rak: 'Rak Wire Harness & Cable Sub-Assy',
    zona: 'Hall F - Electrical Storage',
  },
];

export const SAMPLE_MATERIAL_ROWS = [
  {
    kode_material: 'MAT-101',
    deskripsi: 'Hex Flange Bolt M10x35 Grade 8.8',
    satuan: 'Pcs',
    kategori: 'Fasteners',
    default_rak_kode: 'RAK-A01',
  },
  {
    kode_material: 'MAT-102',
    deskripsi: 'Spring Washer 10mm Stainless 304',
    satuan: 'Pcs',
    kategori: 'Hardware',
    default_rak_kode: 'RAK-B01',
  },
  {
    kode_material: 'MAT-103',
    deskripsi: 'Engine Mounting Rubber Bushing',
    satuan: 'Pcs',
    kategori: 'Chassis & Engine',
    default_rak_kode: 'RAK-C01',
  },
  {
    kode_material: 'MAT-104',
    deskripsi: 'Cable Tie Industrial Heavy Duty 300mm',
    satuan: 'Box',
    kategori: 'Electrical',
    default_rak_kode: 'RAK-D01',
  },
  {
    kode_material: 'MAT-105',
    deskripsi: 'Bracket Sensor Proximity Aluminium',
    satuan: 'Set',
    kategori: 'Sub-Assembly',
    default_rak_kode: 'RAK-A01',
  },
];

export const SAMPLE_LINE_ROWS = [
  {
    kode_line: 'LINE-05',
    nama_line: 'Final Quality Audit & Testing',
    qr_code_proses: 'QR-LINE-05-QA',
    area: 'Area C - Quality & Pack',
  },
  {
    kode_line: 'LINE-06',
    nama_line: 'Chassis Main Assembly Station',
    qr_code_proses: 'QR-LINE-06-MAIN',
    area: 'Area A - Chassis Line',
  },
  {
    kode_line: 'LINE-07',
    nama_line: 'Sub-Assembly Paint & Coating',
    qr_code_proses: 'QR-LINE-07-COAT',
    area: 'Area D - Surface Treatment',
  },
];

/**
 * Downloads a sample template Excel (.xlsx) file
 */
export const downloadTemplate = (
  type: 'rak' | 'material' | 'line',
  fileType: 'xlsx' | 'csv' = 'xlsx'
) => {
  const wb = XLSX.utils.book_new();

  let data: any[] = [];
  let sheetName = '';
  let fileName = '';

  if (type === 'rak') {
    data = SAMPLE_RAK_ROWS;
    sheetName = 'Master_Rak';
    fileName = `Contoh_Format_Master_Rak_ZEVA.${fileType}`;
  } else if (type === 'material') {
    data = SAMPLE_MATERIAL_ROWS;
    sheetName = 'Master_Material';
    fileName = `Contoh_Format_Master_Material_ZEVA.${fileType}`;
  } else {
    data = SAMPLE_LINE_ROWS;
    sheetName = 'Master_Line';
    fileName = `Contoh_Format_Master_Line_ZEVA.${fileType}`;
  }

  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths for clean readability
  const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 28 }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  if (fileType === 'csv') {
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
  }
};

/**
 * Downloads a complete Multi-Sheet Master Template (.xlsx) containing Rak, Material, and Line
 */
export const downloadFullMasterWorkbook = () => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rak
  const wsRak = XLSX.utils.json_to_sheet(SAMPLE_RAK_ROWS);
  wsRak['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsRak, 'Master_Rak');

  // Sheet 2: Material
  const wsMat = XLSX.utils.json_to_sheet(SAMPLE_MATERIAL_ROWS);
  wsMat['!cols'] = [{ wch: 18 }, { wch: 38 }, { wch: 12 }, { wch: 22 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsMat, 'Master_Material');

  // Sheet 3: Line
  const wsLine = XLSX.utils.json_to_sheet(SAMPLE_LINE_ROWS);
  wsLine['!cols'] = [{ wch: 18 }, { wch: 35 }, { wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsLine, 'Master_Line');

  XLSX.writeFile(wb, 'Format_Lengkap_Master_Data_Pabrik_ZEVA_v1.6.xlsx', { bookType: 'xlsx' });
};

/**
 * Parses uploaded file (.xlsx, .xls, .csv) into JSON rows
 */
export const parseUploadedExcel = async (file: File): Promise<Record<string, any>[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Pick first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Raw array of objects
  const rawData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
  });

  return rawData;
};

// Key normalizer (handles 'Kode Rak', 'kode_rak', 'KODE_RAK', 'KODE', etc.)
const getPropValue = (obj: Record<string, any>, possibleKeys: string[]): string => {
  const objKeys = Object.keys(obj);
  for (const targetKey of possibleKeys) {
    const matched = objKeys.find(
      (k) => k.toLowerCase().replace(/[\s_\-]/g, '') === targetKey.toLowerCase().replace(/[\s_\-]/g, '')
    );
    if (matched && obj[matched] !== undefined && obj[matched] !== null) {
      return String(obj[matched]).trim();
    }
  }
  return '';
};

/**
 * Normalizes and validates Rak rows
 */
export const normalizeRakData = (
  rawRows: Record<string, any>[]
): { valid: MasterRak[]; errors: string[] } => {
  const valid: MasterRak[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // header is row 1
    const kode = getPropValue(row, ['kode_rak', 'koderak', 'kode', 'code', 'rak']);
    const nama = getPropValue(row, ['nama_rak', 'namarak', 'nama', 'name', 'deskripsi']);
    const zona = getPropValue(row, ['zona', 'area', 'lokasi', 'zone', 'gudang']) || 'Zona Gudang Default';

    if (!kode) {
      errors.push(`Baris ${rowNum}: Kode Rak tidak boleh kosong.`);
      return;
    }

    const cleanKode = kode.toUpperCase();
    valid.push({
      id: `rak-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kode_rak: cleanKode,
      nama_rak: nama || `Rak ${cleanKode}`,
      zona,
      status: 'active',
    });
  });

  return { valid, errors };
};

/**
 * Normalizes and validates Material rows
 */
export const normalizeMaterialData = (
  rawRows: Record<string, any>[],
  existingRaks: MasterRak[]
): { valid: MasterMaterial[]; errors: string[] } => {
  const valid: MasterMaterial[] = [];
  const errors: string[] = [];
  const defaultRakId = existingRaks[0]?.id || '';

  rawRows.forEach((row, index) => {
    const rowNum = index + 2;
    const kode = getPropValue(row, ['kode_material', 'kodematerial', 'kode', 'part_number', 'part_no', 'material']);
    const deskripsi = getPropValue(row, ['deskripsi', 'nama_material', 'namamaterial', 'nama', 'description', 'part_name']);
    const satuan = getPropValue(row, ['satuan', 'unit', 'uom']) || 'Pcs';
    const kategori = getPropValue(row, ['kategori', 'category', 'jenis']) || 'Hardware';
    const rakRef = getPropValue(row, ['default_rak_kode', 'rak_kode', 'koderak', 'rak', 'kode_rak']);

    if (!kode) {
      errors.push(`Baris ${rowNum}: Kode Material tidak boleh kosong.`);
      return;
    }

    // Try finding rak by code
    let matchedRakId = defaultRakId;
    if (rakRef) {
      const found = existingRaks.find(
        (r) => r.kode_rak.toUpperCase() === rakRef.toUpperCase() || r.id === rakRef
      );
      if (found) matchedRakId = found.id;
    }

    const cleanKode = kode.toUpperCase();
    valid.push({
      id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kode_material: cleanKode,
      deskripsi: deskripsi || `Material ${cleanKode}`,
      satuan,
      kategori,
      default_rak_id: matchedRakId,
      status: 'active',
    });
  });

  return { valid, errors };
};

/**
 * Normalizes and validates Line rows
 */
export const normalizeLineData = (
  rawRows: Record<string, any>[]
): { valid: MasterLine[]; errors: string[] } => {
  const valid: MasterLine[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, index) => {
    const rowNum = index + 2;
    const kode = getPropValue(row, ['kode_line', 'kodeline', 'kode', 'line']);
    const nama = getPropValue(row, ['nama_line', 'namaline', 'nama', 'stasiun', 'proses']);
    const qr = getPropValue(row, ['qr_code_proses', 'qr_proses', 'qrcode', 'qr']);
    const area = getPropValue(row, ['area', 'zona', 'departemen', 'lokasi']) || 'Assembly Area';

    if (!kode) {
      errors.push(`Baris ${rowNum}: Kode Line tidak boleh kosong.`);
      return;
    }

    const cleanKode = kode.toUpperCase();
    const cleanQr = qr ? qr.toUpperCase() : `QR-${cleanKode}`;

    valid.push({
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kode_line: cleanKode,
      nama_line: nama || `Line ${cleanKode}`,
      qr_code_proses: cleanQr,
      area,
      status: 'active',
    });
  });

  return { valid, errors };
};
