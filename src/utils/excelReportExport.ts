import * as XLSX from 'xlsx';
import {
  Task,
  TaskItem,
  User,
  MasterLine,
  MasterMaterial,
  MasterRak,
} from '../types';
import { formatDuration } from './storage';

const formatDateTime = (isoString?: string | null): string => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return '-';
  }
};

const formatTimeOnly = (isoString?: string | null): string => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '-';
  }
};

// ==========================================
// 1. EXPORT LAPORAN LENGKAP SUPERVISOR (SPV)
// ==========================================
export interface ExportSpvParams {
  tasks: Task[];
  taskItems: TaskItem[];
  allUsers: User[];
  allLines: MasterLine[];
  allMaterials: MasterMaterial[];
  allRaks?: MasterRak[];
  filterShift?: string;
  filterLine?: string;
  filterOperator?: string;
  searchQuery?: string;
  periodFilter?: 'today' | '7days' | 'all';
}

export const exportSpvCompleteReport = (params: ExportSpvParams) => {
  const {
    tasks,
    taskItems,
    allUsers,
    allLines,
    allMaterials,
    allRaks = [],
    filterShift = 'all',
    filterLine = 'all',
    filterOperator = 'all',
    searchQuery = '',
    periodFilter = 'all',
  } = params;

  // Filter task items according to SPV filters
  const filteredItems = taskItems.filter((item) => {
    const parentTask = tasks.find((t) => t.id === item.task_id);
    const user = allUsers.find((u) => u.id === item.user_id);
    const material = allMaterials.find((m) => m.id === item.material_id);
    const rak = allRaks.find((r) => r.id === item.rak_id);

    // Shift Filter
    if (filterShift !== 'all' && parentTask && parentTask.shift !== parseInt(filterShift)) {
      return false;
    }

    // Line Filter
    if (filterLine !== 'all' && item.line_id !== filterLine) {
      return false;
    }

    // Operator Filter
    if (filterOperator !== 'all' && item.user_id !== filterOperator) {
      return false;
    }

    // Period Filter
    if (periodFilter !== 'all' && item.delivered_at) {
      const itemDate = new Date(item.delivered_at);
      const now = new Date();
      if (periodFilter === 'today') {
        if (
          itemDate.getDate() !== now.getDate() ||
          itemDate.getMonth() !== now.getMonth() ||
          itemDate.getFullYear() !== now.getFullYear()
        ) {
          return false;
        }
      } else if (periodFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (itemDate < sevenDaysAgo) return false;
      }
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMat =
        material?.kode_material.toLowerCase().includes(q) ||
        material?.deskripsi.toLowerCase().includes(q);
      const matchRak = rak?.kode_rak.toLowerCase().includes(q);
      const matchOp =
        user?.nama.toLowerCase().includes(q) ||
        user?.employee_id.toLowerCase().includes(q);
      if (!matchMat && !matchRak && !matchOp) return false;
    }

    return true;
  });

  const wb = XLSX.utils.book_new();

  // ------------------------------------------------------------------
  // Sheet 1: Live Monitoring Grid (Data Transaksi Lapangan Lengkap)
  // ------------------------------------------------------------------
  const gridRows = filteredItems.map((item, idx) => {
    const taskObj = tasks.find((t) => t.id === item.task_id);
    const userObj = allUsers.find((u) => u.id === item.user_id);
    const lineObj = allLines.find((l) => l.id === item.line_id);
    const matObj = allMaterials.find((m) => m.id === item.material_id);
    const rakObj = allRaks.find((r) => r.id === item.rak_id);

    const isOvertime =
      typeof item.delivery_duration_sec === 'number' && item.delivery_duration_sec > 300;

    return {
      'No': idx + 1,
      'No Task': taskObj?.task_no || item.task_id,
      'Shift': taskObj ? `Shift ${taskObj.shift}` : '-',
      'Tanggal Task': taskObj?.tanggal || '-',
      'Nama Operator': userObj?.nama || 'Unknown',
      'NIK Operator': userObj?.employee_id || '-',
      'Kode Material': matObj?.kode_material || item.material_id,
      'Deskripsi Material': matObj?.deskripsi || 'Material Part',
      'Qty': item.qty,
      'Satuan': item.satuan,
      'Rak Asal': rakObj?.kode_rak || '-',
      'Nama Rak': rakObj?.nama_rak || '-',
      'Zona Rak': rakObj?.zona || '-',
      'Line Tujuan': lineObj?.nama_line || item.line_id,
      'Kode Line': lineObj?.kode_line || '-',
      'Area Line': lineObj?.area || '-',
      'Status': item.status,
      'Departure Mode': item.departure_mode,
      'T1 (Berangkat/Picked)': formatDateTime(item.picked_at),
      'T2 (Selesai/Delivered)': formatDateTime(item.delivered_at),
      'T3 (Kembali/Return)': formatDateTime(item.return_at),
      'Lead Time (Detik)': item.delivery_duration_sec ?? '-',
      'Lead Time (Format)': formatDuration(item.delivery_duration_sec),
      'Return (Detik)': item.return_duration_sec ?? '-',
      'Status Ketepatan': isOvertime ? 'DELAY (>5m)' : 'ON-TIME (<=5m)',
    };
  });

  const wsGrid = XLSX.utils.json_to_sheet(gridRows);
  wsGrid['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // No Task
    { wch: 10 }, // Shift
    { wch: 14 }, // Tanggal
    { wch: 22 }, // Nama Operator
    { wch: 14 }, // NIK Operator
    { wch: 16 }, // Kode Material
    { wch: 32 }, // Deskripsi
    { wch: 8 },  // Qty
    { wch: 8 },  // Satuan
    { wch: 14 }, // Rak Asal
    { wch: 25 }, // Nama Rak
    { wch: 20 }, // Zona
    { wch: 24 }, // Line Tujuan
    { wch: 14 }, // Kode Line
    { wch: 18 }, // Area
    { wch: 14 }, // Status
    { wch: 18 }, // Departure Mode
    { wch: 22 }, // T1
    { wch: 22 }, // T2
    { wch: 22 }, // T3
    { wch: 16 }, // Lead Time (Detik)
    { wch: 18 }, // Lead Time (Format)
    { wch: 14 }, // Return (Detik)
    { wch: 18 }, // Status Ketepatan
  ];
  XLSX.utils.book_append_sheet(wb, wsGrid, 'Live_Monitoring_Grid');

  // ------------------------------------------------------------------
  // Sheet 2: Rekap Beban & Frekuensi per Line
  // ------------------------------------------------------------------
  const totalDelivered = filteredItems.filter((i) => i.status === 'DELIVERED').length;
  const lineStats = allLines.map((line, idx) => {
    const lItems = filteredItems.filter((i) => i.line_id === line.id && i.status === 'DELIVERED');
    const count = lItems.length;
    const volume = lItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);
    const percentage = totalDelivered > 0 ? Math.round((count / totalDelivered) * 100) : 0;
    const durations = lItems
      .map((i) => i.delivery_duration_sec)
      .filter((d): d is number => typeof d === 'number' && d > 0);
    const avgDuration =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

    return {
      line,
      count,
      volume,
      percentage,
      avgDuration,
    };
  }).sort((a, b) => b.count - a.count);

  const lineSummaryRows = lineStats.map((item, idx) => ({
    'Ranking': `#${idx + 1}`,
    'Nama Line Produksi': item.line.nama_line,
    'Kode Line': item.line.kode_line,
    'Area': item.line.area,
    'Frekuensi Suplai (Kali)': item.count,
    'Porsi Beban (%)': `${item.percentage}%`,
    'Total Volume (Pcs)': item.volume,
    'Rata-rata Lead Time (Detik)': item.avgDuration ?? '-',
    'Rata-rata Lead Time (Format)': formatDuration(item.avgDuration),
  }));

  const wsLineSummary = XLSX.utils.json_to_sheet(lineSummaryRows);
  wsLineSummary['!cols'] = [
    { wch: 10 }, { wch: 28 }, { wch: 15 }, { wch: 20 },
    { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 24 }, { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLineSummary, 'Rekap_Frekuensi_Line');

  // ------------------------------------------------------------------
  // Sheet 3: Rincian Material per Line (Beserta Waktu Kirim)
  // ------------------------------------------------------------------
  const lineMaterialRows: any[] = [];
  allLines.forEach((line) => {
    const lItems = filteredItems.filter((i) => i.line_id === line.id && i.status === 'DELIVERED');
    const totalLineQty = lItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);
    const matMap = new Map<string, { count: number; volume: number; times: string[] }>();

    lItems.forEach((i) => {
      const existing = matMap.get(i.material_id) || { count: 0, volume: 0, times: [] };
      const timeStr = i.delivered_at || i.picked_at;
      const formattedTime = timeStr ? formatDateTime(timeStr) : '-';
      matMap.set(i.material_id, {
        count: existing.count + 1,
        volume: existing.volume + (i.qty || 0),
        times: [...existing.times, formattedTime],
      });
    });

    Array.from(matMap.entries()).forEach(([matId, stats]) => {
      const mat = allMaterials.find((m) => m.id === matId);
      const defaultRak = allRaks.find((r) => r.id === mat?.default_rak_id);
      const porsi = totalLineQty > 0 ? Math.round((stats.volume / totalLineQty) * 100) : 0;

      lineMaterialRows.push({
        'Line Tujuan': line.nama_line,
        'Kode Line': line.kode_line,
        'Kode Material': mat?.kode_material || matId,
        'Deskripsi Material': mat?.deskripsi || 'Material Part',
        'Rak Asal': defaultRak?.kode_rak || '-',
        'Frekuensi Suplai (Kali)': stats.count,
        'Total Qty Disuplai': stats.volume,
        'Satuan': mat?.satuan || 'Pcs',
        'Porsi dari Line (%)': `${porsi}%`,
        'Waktu-Waktu Pengiriman': stats.times.join(', '),
      });
    });
  });

  const wsLineMat = XLSX.utils.json_to_sheet(lineMaterialRows);
  wsLineMat['!cols'] = [
    { wch: 25 }, { wch: 14 }, { wch: 18 }, { wch: 32 },
    { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLineMat, 'Detail_Material_Per_Line');

  // ------------------------------------------------------------------
  // Sheet 4: Kinerja Operator (Beserta Line & Material yang Dilayani)
  // ------------------------------------------------------------------
  const operators = allUsers.filter((u) => u.role === 'operator');
  const opStatsRows = operators.map((op, idx) => {
    const opItems = filteredItems.filter((i) => i.user_id === op.id && i.status === 'DELIVERED');
    const count = opItems.length;
    const volume = opItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);
    const percentage = totalDelivered > 0 ? Math.round((count / totalDelivered) * 100) : 0;
    const durations = opItems
      .map((i) => i.delivery_duration_sec)
      .filter((d): d is number => typeof d === 'number' && d > 0);
    const avgDuration =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
    const autoFallbackCount = opItems.filter((i) => i.departure_mode === 'AUTO_FALLBACK').length;

    // Distinct lines and materials
    const lineNames = Array.from(new Set(opItems.map((i) => allLines.find((l) => l.id === i.line_id)?.nama_line).filter(Boolean)));
    const matCodes = Array.from(new Set(opItems.map((i) => allMaterials.find((m) => m.id === i.material_id)?.kode_material).filter(Boolean)));

    return {
      'Ranking': `#${idx + 1}`,
      'Nama Operator': op.nama,
      'NIK Operator': op.employee_id,
      'Total Ritase Jalan (Kali)': count,
      'Porsi Kontribusi (%)': `${percentage}%`,
      'Total Volume (Pcs)': volume,
      'Rata-rata Lead Time (Detik)': avgDuration ?? '-',
      'Rata-rata Lead Time (Format)': formatDuration(avgDuration),
      'Insiden Auto-Fallback (Poka-Yoke)': autoFallbackCount,
      'Line yang Dilayani': lineNames.join(', '),
      'Material yang Diantar': matCodes.join(', '),
    };
  }).sort((a, b) => b['Total Ritase Jalan (Kali)'] - a['Total Ritase Jalan (Kali)']);

  const wsOp = XLSX.utils.json_to_sheet(opStatsRows);
  wsOp['!cols'] = [
    { wch: 10 }, { wch: 24 }, { wch: 15 }, { wch: 24 },
    { wch: 20 }, { wch: 18 }, { wch: 24 }, { wch: 24 }, { wch: 28 }, { wch: 35 }, { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsOp, 'Kinerja_Operator_Logistik');

  // ------------------------------------------------------------------
  // Sheet 5: Ritme Kerja per Jam (Peak Hours Pabrik)
  // ------------------------------------------------------------------
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 to 21:00
  const hourCounts = hours.map((hour) => {
    const itemsInHour = filteredItems.filter((item) => {
      const timeStr = item.delivered_at || item.picked_at || item.last_material_scanned_at;
      if (!timeStr) return false;
      const h = new Date(timeStr).getHours();
      return h === hour;
    });
    const count = itemsInHour.length;
    const volume = itemsInHour.reduce((acc, curr) => acc + (curr.qty || 0), 0);
    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      hourLabel: `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`,
      count,
      volume,
    };
  });
  const maxHourCount = Math.max(...hourCounts.map((h) => h.count), 0);

  const hourlyRows = hourCounts.map((h) => ({
    'Rentang Jam Operasional': h.hourLabel,
    'Frekuensi Suplai (Kali)': h.count,
    'Total Volume Material (Pcs)': h.volume,
    'Status Beban': h.count === maxHourCount && h.count > 0 ? 'JAM TERSIBUK (PEAK)' : h.count > 0 ? 'Normal' : 'Standby / Kosong',
  }));

  const wsHourly = XLSX.utils.json_to_sheet(hourlyRows);
  wsHourly['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 26 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsHourly, 'Ritme_Jam_Kerja_Pabrik');

  const fileName = `ZEVA_Laporan_Lengkap_SPV_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
};

// ==========================================
// 2. EXPORT LAPORAN LENGKAP LOGISTICS MANAGER
// ==========================================
export interface ExportManagerParams {
  tasks: Task[];
  taskItems: TaskItem[];
  allUsers: User[];
  allLines: MasterLine[];
  allMaterials: MasterMaterial[];
  allRaks?: MasterRak[];
  selectedShiftFilter?: string;
  periodFilter?: 'today' | '7days' | 'all';
}

export const exportManagerCompleteReport = (params: ExportManagerParams) => {
  const {
    tasks,
    taskItems,
    allUsers,
    allLines,
    allMaterials,
    allRaks = [],
    selectedShiftFilter = 'all',
    periodFilter = 'all',
  } = params;

  // Filter items by shift and period
  const filteredItems = taskItems.filter((i) => {
    const parentTask = tasks.find((t) => t.id === i.task_id);
    if (selectedShiftFilter !== 'all' && parentTask && parentTask.shift !== parseInt(selectedShiftFilter)) {
      return false;
    }

    if (periodFilter !== 'all' && i.delivered_at) {
      const itemDate = new Date(i.delivered_at);
      const now = new Date();
      if (periodFilter === 'today') {
        if (
          itemDate.getDate() !== now.getDate() ||
          itemDate.getMonth() !== now.getMonth() ||
          itemDate.getFullYear() !== now.getFullYear()
        ) {
          return false;
        }
      } else if (periodFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (itemDate < sevenDaysAgo) return false;
      }
    }

    return true;
  });

  const deliveredItems = filteredItems.filter((i) => i.status === 'DELIVERED');

  // Executive KPI Calculations
  const totalVolumePcs = deliveredItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);
  const deliveryDurations = deliveredItems
    .map((i) => i.delivery_duration_sec)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const avgLeadTime =
    deliveryDurations.length > 0
      ? Math.round(deliveryDurations.reduce((a, b) => a + b, 0) / deliveryDurations.length)
      : 0;

  const roundTrips = deliveredItems
    .map((i) => {
      if (i.delivery_duration_sec && i.return_duration_sec) {
        return i.delivery_duration_sec + i.return_duration_sec;
      }
      return i.delivery_duration_sec || 0;
    })
    .filter((d) => d > 0);
  const avgRoundTrip =
    roundTrips.length > 0
      ? Math.round(roundTrips.reduce((a, b) => a + b, 0) / roundTrips.length)
      : 0;

  const totalRequestedItems = filteredItems.length;
  const fulfillmentRate =
    totalRequestedItems > 0
      ? Math.round((deliveredItems.length / totalRequestedItems) * 100)
      : 100;

  const onTimeDeliveries = deliveredItems.filter((i) => (i.delivery_duration_sec || 0) <= 300);
  const onTimeRate =
    deliveredItems.length > 0
      ? Math.round((onTimeDeliveries.length / deliveredItems.length) * 100)
      : 100;

  const wb = XLSX.utils.book_new();

  // ------------------------------------------------------------------
  // Sheet 1: Ringkasan Eksekutif KPI Manajemen
  // ------------------------------------------------------------------
  const executiveKpiRows = [
    {
      'Indikator KPI Manajemen': 'Total Volume Material Disuplai',
      'Nilai Realisasi': totalVolumePcs,
      'Satuan': 'Pcs',
      'Target / Standar': 'Sesuai Rencana Produksi',
      'Evaluasi Lean Manufacturing': 'Output Aktual Pengiriman Gemba',
    },
    {
      'Indikator KPI Manajemen': 'Rata-rata Delivery Lead Time (T2 - T1)',
      'Nilai Realisasi': avgLeadTime,
      'Satuan': 'Detik',
      'Target / Standar': '<= 300 Detik (5 Menit)',
      'Evaluasi Lean Manufacturing': formatDuration(avgLeadTime),
    },
    {
      'Indikator KPI Manajemen': 'Rata-rata Round-Trip Cycle Time (T3 - T1)',
      'Nilai Realisasi': avgRoundTrip,
      'Satuan': 'Detik',
      'Target / Standar': '<= 600 Detik (10 Menit)',
      'Evaluasi Lean Manufacturing': formatDuration(avgRoundTrip),
    },
    {
      'Indikator KPI Manajemen': 'Tingkat Pemenuhan Suplai (Fulfillment Rate)',
      'Nilai Realisasi': `${fulfillmentRate}%`,
      'Satuan': '%',
      'Target / Standar': '100%',
      'Evaluasi Lean Manufacturing': `${deliveredItems.length} dari ${totalRequestedItems} item selesai`,
    },
    {
      'Indikator KPI Manajemen': 'Tingkat Ketepatan Waktu (On-Time Rate)',
      'Nilai Realisasi': `${onTimeRate}%`,
      'Satuan': '%',
      'Target / Standar': '>= 95%',
      'Evaluasi Lean Manufacturing': `${onTimeDeliveries.length} trip tepat waktu (<=5m)`,
    },
    {
      'Indikator KPI Manajemen': 'Total Ritase Perjalanan Gemba Selesai',
      'Nilai Realisasi': deliveredItems.length,
      'Satuan': 'Trip',
      'Target / Standar': '-',
      'Evaluasi Lean Manufacturing': 'Total siklus T1-T2 terverifikasi QR',
    },
    {
      'Indikator KPI Manajemen': 'Filter Shift Aktif',
      'Nilai Realisasi': selectedShiftFilter === 'all' ? 'Semua Shift' : `Shift ${selectedShiftFilter}`,
      'Satuan': 'Shift',
      'Target / Standar': 'Shift 1, 2, 3',
      'Evaluasi Lean Manufacturing': 'Ruang Lingkup Laporan',
    },
    {
      'Indikator KPI Manajemen': 'Waktu Ekspor Laporan',
      'Nilai Realisasi': new Date().toLocaleString('id-ID'),
      'Satuan': 'Timestamp',
      'Target / Standar': '-',
      'Evaluasi Lean Manufacturing': 'Generated by ZEVA Logistik v1.6',
    },
  ];

  const wsKpi = XLSX.utils.json_to_sheet(executiveKpiRows);
  wsKpi['!cols'] = [
    { wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 25 }, { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsKpi, 'Ringkasan_KPI_Eksekutif');

  // ------------------------------------------------------------------
  // Sheet 2: Analisis Beban per Line Produksi
  // ------------------------------------------------------------------
  const lineWorkloads = allLines.map((line) => {
    const lineItems = deliveredItems.filter((i) => i.line_id === line.id);
    const lineQty = lineItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);
    const lineTrips = lineItems.length;
    const durations = lineItems
      .map((i) => i.delivery_duration_sec)
      .filter((d): d is number => typeof d === 'number' && d > 0);
    const lineAvgLt =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const share = totalVolumePcs > 0 ? Math.round((lineQty / totalVolumePcs) * 100) : 0;

    return {
      line,
      lineQty,
      lineTrips,
      lineAvgLt,
      share,
    };
  }).sort((a, b) => b.lineQty - a.lineQty);

  const lineWorkloadRows = lineWorkloads.map((lw, idx) => ({
    'Ranking': `#${idx + 1}`,
    'Nama Line Produksi': lw.line.nama_line,
    'Kode Line': lw.line.kode_line,
    'Area': lw.line.area,
    'Total Volume Suplai (Pcs)': lw.lineQty,
    'Frekuensi Suplai (Trip)': lw.lineTrips,
    'Porsi Share Beban (%)': `${lw.share}%`,
    'Rata-rata Lead Time (Detik)': lw.lineAvgLt || '-',
    'Rata-rata Lead Time (Format)': formatDuration(lw.lineAvgLt),
  }));

  const wsLineWorkload = XLSX.utils.json_to_sheet(lineWorkloadRows);
  wsLineWorkload['!cols'] = [
    { wch: 10 }, { wch: 28 }, { wch: 15 }, { wch: 20 },
    { wch: 24 }, { wch: 22 }, { wch: 20 }, { wch: 24 }, { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLineWorkload, 'Analisis_Beban_Line');

  // ------------------------------------------------------------------
  // Sheet 3: Evaluasi Produktivitas Operator
  // ------------------------------------------------------------------
  const operators = allUsers.filter((u) => u.role === 'operator');
  const opPerformances = operators.map((op, idx) => {
    const opItems = deliveredItems.filter((i) => i.user_id === op.id);
    const opQty = opItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);
    const opTrips = opItems.length;
    const durations = opItems
      .map((i) => i.delivery_duration_sec)
      .filter((d): d is number => typeof d === 'number' && d > 0);
    const opAvgLt =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const opOnTime = opItems.filter((i) => (i.delivery_duration_sec || 0) <= 300).length;
    const complianceRate = opTrips > 0 ? Math.round((opOnTime / opTrips) * 100) : 100;
    const autoFallbackCount = opItems.filter((i) => i.departure_mode === 'AUTO_FALLBACK').length;

    return {
      'Ranking': `#${idx + 1}`,
      'Nama Operator': op.nama,
      'NIK Operator': op.employee_id,
      'Total Ritase Jalan (Trip)': opTrips,
      'Total Volume Diantar (Pcs)': opQty,
      'Rata-rata Lead Time (Detik)': opAvgLt || '-',
      'Rata-rata Lead Time (Format)': formatDuration(opAvgLt),
      'On-Time Compliance (<=5m)': `${complianceRate}%`,
      'Trip Tepat Waktu': opOnTime,
      'Insiden Auto-Fallback (Poka-Yoke)': autoFallbackCount,
    };
  }).sort((a, b) => b['Total Volume Diantar (Pcs)'] - a['Total Volume Diantar (Pcs)']);

  const wsOpPerf = XLSX.utils.json_to_sheet(opPerformances);
  wsOpPerf['!cols'] = [
    { wch: 10 }, { wch: 24 }, { wch: 15 }, { wch: 24 },
    { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 18 }, { wch: 28 }
  ];
  XLSX.utils.book_append_sheet(wb, wsOpPerf, 'Produktivitas_Operator');

  // ------------------------------------------------------------------
  // Sheet 4: Data Lengkap Transaksi Gemba (Audit Trail Terperinci)
  // ------------------------------------------------------------------
  const transactionRows = deliveredItems.map((item, idx) => {
    const t = tasks.find((task) => task.id === item.task_id);
    const u = allUsers.find((user) => user.id === item.user_id);
    const m = allMaterials.find((mat) => mat.id === item.material_id);
    const l = allLines.find((line) => line.id === item.line_id);
    const r = allRaks.find((rak) => rak.id === item.rak_id);

    return {
      'No': idx + 1,
      'No Task': t?.task_no || item.task_id,
      'Shift': t ? `Shift ${t.shift}` : '-',
      'Tanggal Task': t?.tanggal || '-',
      'Nama Operator': u?.nama || '-',
      'NIK Operator': u?.employee_id || '-',
      'Kode Material': m?.kode_material || item.material_id,
      'Deskripsi Material': m?.deskripsi || 'Material Part',
      'Kategori Material': m?.kategori || '-',
      'Qty': item.qty,
      'Satuan': item.satuan,
      'Rak Asal': r?.kode_rak || item.rak_id,
      'Nama Rak': r?.nama_rak || '-',
      'Line Tujuan': l?.nama_line || item.line_id,
      'Kode Line': l?.kode_line || '-',
      'Status': item.status,
      'Departure Mode': item.departure_mode,
      'Waktu T1 (Picked)': formatDateTime(item.picked_at),
      'Waktu T2 (Delivered)': formatDateTime(item.delivered_at),
      'Waktu T3 (Return)': formatDateTime(item.return_at),
      'Lead Time (Detik)': item.delivery_duration_sec ?? '-',
      'Lead Time (Format)': formatDuration(item.delivery_duration_sec),
      'Return (Detik)': item.return_duration_sec ?? '-',
      'Status Keterlambatan': (item.delivery_duration_sec || 0) > 300 ? 'DELAY (>5m)' : 'ON-TIME',
    };
  });

  const wsTransactions = XLSX.utils.json_to_sheet(transactionRows);
  wsTransactions['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 10 }, { wch: 14 },
    { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 32 }, { wch: 18 },
    { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 25 }, { wch: 24 }, { wch: 14 },
    { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
    { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Data_Lengkap_Transaksi');

  // ------------------------------------------------------------------
  // Sheet 5: Detail Material per Line (Waktu & Volume)
  // ------------------------------------------------------------------
  const lineMaterialRows: any[] = [];
  allLines.forEach((line) => {
    const lItems = deliveredItems.filter((i) => i.line_id === line.id);
    const totalLineQty = lItems.reduce((acc, curr) => acc + (curr.qty || 0), 0);
    const matMap = new Map<string, { count: number; volume: number; times: string[] }>();

    lItems.forEach((i) => {
      const existing = matMap.get(i.material_id) || { count: 0, volume: 0, times: [] };
      const timeStr = i.delivered_at || i.picked_at;
      const formattedTime = timeStr ? formatDateTime(timeStr) : '-';
      matMap.set(i.material_id, {
        count: existing.count + 1,
        volume: existing.volume + (i.qty || 0),
        times: [...existing.times, formattedTime],
      });
    });

    Array.from(matMap.entries()).forEach(([matId, stats]) => {
      const mat = allMaterials.find((m) => m.id === matId);
      const defaultRak = allRaks.find((r) => r.id === mat?.default_rak_id);
      const porsi = totalLineQty > 0 ? Math.round((stats.volume / totalLineQty) * 100) : 0;

      lineMaterialRows.push({
        'Line Tujuan': line.nama_line,
        'Kode Line': line.kode_line,
        'Kode Material': mat?.kode_material || matId,
        'Deskripsi Material': mat?.deskripsi || 'Material Part',
        'Rak Asal': defaultRak?.kode_rak || '-',
        'Frekuensi Suplai (Trip)': stats.count,
        'Total Qty Disuplai': stats.volume,
        'Satuan': mat?.satuan || 'Pcs',
        'Porsi dari Line (%)': `${porsi}%`,
        'Waktu-Waktu Pengiriman': stats.times.join(', '),
      });
    });
  });

  const wsLineMat = XLSX.utils.json_to_sheet(lineMaterialRows);
  wsLineMat['!cols'] = [
    { wch: 25 }, { wch: 14 }, { wch: 18 }, { wch: 32 },
    { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLineMat, 'Rincian_Material_Per_Line');

  // ------------------------------------------------------------------
  // Sheet 6: Ritme Jam Kerja Pabrik (Peak Hours)
  // ------------------------------------------------------------------
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);
  const hourCounts = hours.map((hour) => {
    const itemsInHour = deliveredItems.filter((item) => {
      const timeStr = item.delivered_at || item.picked_at || item.last_material_scanned_at;
      if (!timeStr) return false;
      const h = new Date(timeStr).getHours();
      return h === hour;
    });
    const count = itemsInHour.length;
    const volume = itemsInHour.reduce((acc, curr) => acc + (curr.qty || 0), 0);
    return {
      hourLabel: `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`,
      count,
      volume,
    };
  });
  const maxHourCount = Math.max(...hourCounts.map((h) => h.count), 0);

  const hourlyRows = hourCounts.map((h) => ({
    'Rentang Jam Operasional': h.hourLabel,
    'Frekuensi Suplai (Trip)': h.count,
    'Total Volume Material (Pcs)': h.volume,
    'Status Beban': h.count === maxHourCount && h.count > 0 ? 'JAM TERSIBUK (PEAK)' : h.count > 0 ? 'Normal' : 'Standby / Kosong',
  }));

  const wsHourly = XLSX.utils.json_to_sheet(hourlyRows);
  wsHourly['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 26 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsHourly, 'Ritme_Jam_Kerja_Peak');

  const fileName = `ZEVA_Laporan_Eksekutif_Manager_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
};
