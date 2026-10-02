import React, { useState } from 'react';
import { LaundryOrder, LaundrySettings, LaundryStage, STAGE_CONFIG, STAGES_LIST, formatDateIndo, formatRupiah } from '../types';
import { Search, Package, Clock, CheckCircle2, AlertCircle, Phone, Sparkles, Receipt, FileText, ArrowRight, RotateCcw } from 'lucide-react';
import { generateWhatsAppNotificationUrl } from '../utils/whatsapp';

interface PublicTrackingProps {
  orders: LaundryOrder[];
  settings: LaundrySettings;
  onViewReceipt: (order: LaundryOrder) => void;
}

export const PublicTracking: React.FC<PublicTrackingProps> = ({
  orders,
  settings,
  onViewReceipt,
}) => {
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<LaundryOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    
    // Validasi: Wajib masukkan nomor nota terlebih dahulu
    if (!cleanQuery) {
      setValidationError('Silakan masukkan Nomor Nota terlebih dahulu untuk mencari status cucian.');
      setSelectedOrder(null);
      setSearched(false);
      return;
    }

    setValidationError(null);
    setSearched(true);

    const queryUpper = cleanQuery.toUpperCase();
    const queryDigits = cleanQuery.replace(/\D/g, '');

    const found = orders.find((o) => {
      const oIdUpper = o.id.toUpperCase();
      const oIdDigits = o.id.replace(/\D/g, '');

      // Cocok persis nomor nota (contoh: LDN-240901)
      if (oIdUpper === queryUpper) return true;
      // Cocok tanpa tanda strip/spasi
      if (oIdUpper.replace(/[\s-]/g, '') === queryUpper.replace(/[\s-]/g, '')) return true;
      // Cocok digit angka nota jika dimasukkan minimal 3 digit
      if (queryDigits.length >= 3 && oIdDigits.endsWith(queryDigits)) return true;
      // Cadangan: jika pelanggan memasukkan nomor telepon terdaftar (minimal 8 digit)
      if (queryDigits.length >= 8 && o.customer.phone.replace(/\D/g, '').includes(queryDigits)) return true;
      return false;
    });

    setSelectedOrder(found || null);
  };

  const handleResetSearch = () => {
    setQuery('');
    setSelectedOrder(null);
    setSearched(false);
    setValidationError(null);
  };

  const getStageIndex = (stage: string) => STAGES_LIST.indexOf(stage as any);

  return (
    <div id="public-tracking-view" className="max-w-4xl mx-auto space-y-6">
      {/* Hero Search Box */}
      <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Cek Status Laundry Mandiri
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Lacak Progres Cucian Anda
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
            Masukkan <strong className="text-white">Nomor Nota</strong> yang tertera pada struk kasir Anda (contoh: <span className="font-mono font-bold text-white bg-white/20 px-1.5 py-0.5 rounded">LDN-240901</span>) untuk memantau status pengerjaan cucian.
          </p>

          <form onSubmit={handleSearch} className="pt-2 space-y-2 max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Receipt className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="tracking-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Ketik Nomor Nota (misal: LDN-240901)..."
                  className={`w-full pl-11 pr-4 py-3 bg-white text-slate-900 placeholder-slate-400 rounded-2xl text-sm font-semibold focus:outline-none shadow-sm transition-all ${
                    validationError
                      ? 'ring-3 ring-rose-400 border-rose-500'
                      : 'focus:ring-3 focus:ring-amber-300'
                  }`}
                />
              </div>
              <button
                id="tracking-submit-btn"
                type="submit"
                className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-sm shadow-md transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                <Search className="w-4 h-4" /> Lacak Sekarang
              </button>
            </div>

            {/* Validation Alert */}
            {validationError && (
              <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-300/40 text-rose-100 text-xs flex items-center justify-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
                <span className="font-semibold">{validationError}</span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* State 1: Tracking Result View (Jika Nomor Nota Ditemukan) */}
      {selectedOrder ? (
        <div id="tracking-result-card" className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-8 animate-fadeIn">
          {/* Header of order */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg sm:text-xl font-black text-slate-900">
                  {selectedOrder.id}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${STAGE_CONFIG[selectedOrder.stage].badgeClass}`}
                >
                  {STAGE_CONFIG[selectedOrder.stage].label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Atas nama: <strong className="text-slate-800">{selectedOrder.customer.name}</strong> • Masuk: {formatDateIndo(selectedOrder.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleResetSearch}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
                title="Lacak nomor nota lain"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Cari Nota Lain
              </button>
              <button
                id="view-receipt-from-tracking"
                type="button"
                onClick={() => onViewReceipt(selectedOrder)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Lihat Nota Digital
              </button>
              <a
                id="wa-shop-btn"
                href={`https://wa.me/${settings.shopPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Halo ${settings.shopName}, saya ingin menanyakan pesanan nomor ${selectedOrder.id}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Hubungi Outlet
              </a>
            </div>
          </div>

          {/* Special Banner if ready */}
          {selectedOrder.stage === 'siap_ambil' && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Cucian Sudah Bersih, Rapi & Siap Diambil!
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Silakan ambil pakaian Anda di outlet *{settings.shopName}* dengan menunjukkan nomor nota ini.
                </p>
              </div>
            </div>
          )}

          {/* Stepper Timeline */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" /> Alur Pengerjaan Cucian
            </h3>

            <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {STAGES_LIST.map((stageKey: LaundryStage) => {
                const config = STAGE_CONFIG[stageKey];
                const currentIndex = getStageIndex(selectedOrder.stage);
                const stepIndex = getStageIndex(stageKey);

                const isPassed = stepIndex < currentIndex;
                const isCurrent = stepIndex === currentIndex;

                const event = selectedOrder.timeline.find((t) => t.stage === stageKey);

                return (
                  <div key={stageKey} className="relative group">
                    {/* Bullet marker */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isCurrent
                          ? 'bg-sky-600 text-white ring-4 ring-sky-100 scale-110'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-300'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : config.stepNumber}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <div>
                        <span
                          className={`text-sm font-bold block ${
                            isCurrent
                              ? 'text-sky-700'
                              : isPassed
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {config.label}
                          {isCurrent && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800">
                              Tahap Saat Ini
                            </span>
                          )}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
                        {event?.note && (
                          <p className="text-xs text-indigo-600 font-medium mt-1 bg-indigo-50/60 inline-block px-2 py-0.5 rounded-md">
                            Catatan: {event.note}
                          </p>
                        )}
                      </div>

                      {event?.timestamp && (
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {formatDateIndo(event.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Item Cucian
              </span>
              <div className="space-y-1.5">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700 font-medium">
                    <span>
                      {item.serviceName} ({item.quantity} {item.unit})
                    </span>
                    <span className="text-slate-900">{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Total Biaya:</span>
                <span>{formatRupiah(selectedOrder.total)}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Informasi Tambahan
              </span>
              <div className="space-y-1 text-slate-600">
                <p>
                  <strong>Aroma Parfum:</strong> {selectedOrder.perfume}
                </p>
                <p>
                  <strong>Estimasi Selesai:</strong> {formatDateIndo(selectedOrder.estimatedCompletion)}
                </p>
                <p>
                  <strong>Status Pembayaran:</strong>{' '}
                  <span
                    className={`font-semibold ${
                      selectedOrder.paymentStatus === 'lunas' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {selectedOrder.paymentStatus === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : searched ? (
        /* State 2: Not Found (Nomor Nota Tidak Ditemukan) */
        <div id="no-order-found" className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Nomor Nota "{query}" Tidak Ditemukan
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Pastikan nomor nota yang Anda masukkan sesuai dengan struk pembayaran yang diberikan oleh kasir (contoh: <strong className="font-mono text-slate-700">LDN-240901</strong>).
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleResetSearch}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Ketik Ulang Nomor Nota
            </button>
          </div>
        </div>
      ) : (
        /* State 3: Panduan Awal (Wajib Masukkan Nomor Nota Terlebih Dahulu) */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mx-auto shadow-xs">
            <Receipt className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              Masukkan Nomor Nota Terlebih Dahulu
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Untuk melihat progres pengerjaan cucian dan nota digital Anda, silakan ketik nomor nota pesanan Anda pada kolom pencarian di atas.
            </p>
          </div>

          {/* 3 Langkah Cek Status Cucian */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2 text-left">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center">
                1
              </span>
              <h4 className="font-bold text-xs text-slate-900">Cek Struk / Nota</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Lihat nomor nota di bagian atas struk kasir Anda (misalnya: <strong className="font-mono text-slate-800">LDN-240901</strong>).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center">
                2
              </span>
              <h4 className="font-bold text-xs text-slate-900">Ketik No. Nota</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Ketikkan nomor nota tersebut ke kolom pencarian di bagian atas halaman.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center">
                3
              </span>
              <h4 className="font-bold text-xs text-slate-900">Lacak Status</h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Tekan tombol "Lacak Sekarang" untuk melihat progres cucian real-time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
