import React, { useState } from 'react';
import {
  X,
  Printer,
  Sliders,
  CheckSquare,
  Square,
  LayoutGrid,
  FileText,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export interface QRPrintItem {
  id: string;
  type: 'rak' | 'material' | 'line';
  code: string;
  title: string;
  subtitle?: string;
  location?: string;
  badge: string;
}

interface QRPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QRPrintItem[];
}

export const QRPrintPreviewModal: React.FC<QRPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  // Grid layout options: '12' = 3x4 (standar), '6' = 2x3 (sedang), '4' = 2x2 (besar)
  const [gridSize, setGridSize] = useState<'12' | '6' | '4'>('12');
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [showCutLines, setShowCutLines] = useState(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Tentukan ukuran QR code berdasarkan pilihan layout grid
  const qrSize = gridSize === '12' ? 95 : gridSize === '6' ? 135 : 175;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      {/* Modal Container: Di layar tampil sebagai popup modal, saat cetak (#qr-print-sheet) hanya stikernya yang tercetak */}
      <div className="relative w-full max-w-5xl bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Header - Hidden saat print */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Pratinjau Lembar Cetak Stiker QR ({items.length} Label Terpilih)
              </h3>
              <p className="text-xs text-slate-500">
                Pilih ukuran stiker dan sesuaikan informasi label sebelum mencetak atau menyimpan ke PDF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Control Toolbar - Hidden saat print */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          {/* Layout Grid Buttons */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              Ukuran Stiker:
            </span>
            <div className="inline-flex rounded-xl p-0.5 bg-white border border-slate-300 shadow-2xs font-semibold">
              <button
                type="button"
                onClick={() => setGridSize('12')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  gridSize === '12'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="3 kolom per lembar (12 stiker/A4) - Ukuran standar bin & rak"
              >
                Standar (3 x 4)
              </button>
              <button
                type="button"
                onClick={() => setGridSize('6')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  gridSize === '6'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="2 kolom sedang per lembar (6 stiker/A4) - Ukuran wadah box/troli"
              >
                Sedang (2 x 3)
              </button>
              <button
                type="button"
                onClick={() => setGridSize('4')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  gridSize === '4'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="2 kolom besar per lembar (4 stiker/A4) - Ukuran papan line"
              >
                Besar (2 x 2)
              </button>
            </div>
          </div>

          {/* Sticker Detail Toggles */}
          <div className="flex flex-wrap items-center gap-4 text-slate-700">
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium hover:text-slate-900">
              <input
                type="checkbox"
                checked={showBadge}
                onChange={(e) => setShowBadge(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Tipe Stiker</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium hover:text-slate-900">
              <input
                type="checkbox"
                checked={showSubtitle}
                onChange={(e) => setShowSubtitle(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Nama/Deskripsi</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium hover:text-slate-900">
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => setShowLocation(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Area/Lokasi</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium hover:text-slate-900">
              <input
                type="checkbox"
                checked={showCutLines}
                onChange={(e) => setShowCutLines(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Garis Potong</span>
            </label>
          </div>
        </div>

        {/* Sheet Preview Scroll Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 print:p-0 print:bg-white print:overflow-visible">
          {items.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-300 text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 text-amber-500" />
              <p className="font-bold text-sm text-slate-700">Belum Ada QR Code yang Dipilih</p>
              <p className="text-xs text-slate-500 mt-1">
                Tutup jendela ini lalu centang kotak [✓] pada stiker QR yang ingin dicetak.
              </p>
            </div>
          ) : (
            /* PRINT SHEET TARGET: Hanya elemen ini yang dicetak ke kertas */
            <div
              id="qr-print-sheet"
              className="bg-white mx-auto shadow-md border border-slate-300 p-4 sm:p-6 rounded-xl max-w-[210mm] min-h-[297mm] print:m-0 print:p-0 print:shadow-none print:border-none print:w-full print:max-w-none"
            >
              <div
                className={`grid gap-3 sm:gap-4 print:gap-3 ${
                  gridSize === '12'
                    ? 'grid-cols-2 sm:grid-cols-3 print:grid-cols-3'
                    : gridSize === '6'
                    ? 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2'
                }`}
              >
                {items.map((item, idx) => {
                  let badgeText = item.badge;
                  let badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
                  if (item.type === 'line') badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                  if (item.type === 'material') badgeClass = 'bg-blue-100 text-blue-900 border-blue-300';

                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className={`bg-white text-slate-950 p-3 sm:p-3.5 rounded-xl flex flex-col items-center text-center justify-between transition print:break-inside-avoid print:page-break-inside-avoid ${
                        showCutLines
                          ? 'border border-dashed border-slate-400 print:border-dashed print:border-slate-500'
                          : 'border border-slate-200 print:border-none'
                      }`}
                      style={{
                        minHeight: gridSize === '12' ? '190px' : gridSize === '6' ? '250px' : '310px',
                      }}
                    >
                      {/* Badge Tipe Stiker */}
                      {showBadge && (
                        <div
                          className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded border mb-1.5 w-full truncate ${badgeClass} print:border-black print:text-black`}
                        >
                          {badgeText}
                        </div>
                      )}

                      {/* QR Code Graphic Container */}
                      <div className="p-2 bg-white rounded-lg border border-slate-200 print:border-none flex items-center justify-center my-auto">
                        <QRCodeSVG
                          value={item.code}
                          size={qrSize}
                          level="H"
                          includeMargin={false}
                        />
                      </div>

                      {/* Label Text Details */}
                      <div className="w-full mt-2 pt-1 border-t border-slate-100 print:border-slate-300 space-y-0.5">
                        <div className="font-mono font-black text-xs sm:text-sm text-slate-900 tracking-wide break-all">
                          {item.code}
                        </div>
                        {showSubtitle && (
                          <div className="font-bold text-[11px] text-slate-800 line-clamp-1 leading-tight">
                            {item.title} {item.subtitle && `• ${item.subtitle}`}
                          </div>
                        )}
                        {showLocation && item.location && (
                          <div className="text-[10px] text-slate-600 truncate font-medium">
                            {item.location}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer - Hidden saat print */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500 font-medium">
            Siap cetak {items.length} label stiker • Printer standard A4 atau Thermal Roll
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold transition text-xs"
            >
              Tutup
            </button>

            <button
              type="button"
              disabled={items.length === 0}
              onClick={handlePrint}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print / PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
