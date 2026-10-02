import React, { useState } from 'react';
import { LaundryOrder, LaundrySettings, LaundryStage, STAGE_CONFIG, STAGES_LIST, formatDateIndo, formatRupiah, AppUser } from '../types';
import {
  Search,
  CheckCircle,
  Clock,
  Receipt,
  Share2,
  Trash2,
  ArrowRight,
  Filter,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  Phone,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { generateWhatsAppNotificationUrl } from '../utils/whatsapp';

interface OrderListProps {
  orders: LaundryOrder[];
  settings: LaundrySettings;
  onUpdateStage: (orderId: string, nextStage: LaundryStage, note?: string) => void;
  onTogglePayment: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onViewReceipt: (order: LaundryOrder) => void;
  currentUser?: AppUser | null;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  settings,
  onUpdateStage,
  onTogglePayment,
  onDeleteOrder,
  onViewReceipt,
  currentUser,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [search, setSearch] = useState('');
  const [activeStageFilter, setActiveStageFilter] = useState<'all' | LaundryStage>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'lunas' | 'belum_lunas'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Filter logic
  const filteredOrders = orders.filter((order) => {
    // Text search
    const query = search.trim().toLowerCase();
    const matchText =
      !query ||
      order.id.toLowerCase().includes(query) ||
      order.customer.name.toLowerCase().includes(query) ||
      order.customer.phone.includes(query);

    // Stage filter
    const matchStage = activeStageFilter === 'all' || order.stage === activeStageFilter;

    // Payment filter
    const matchPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;

    return matchText && matchStage && matchPayment;
  });

  const getNextStage = (current: LaundryStage): LaundryStage | null => {
    const idx = STAGES_LIST.indexOf(current);
    if (idx < STAGES_LIST.length - 1) {
      return STAGES_LIST[idx + 1];
    }
    return null;
  };

  const getStageCounts = () => {
    const counts: Record<string, number> = { all: orders.length };
    STAGES_LIST.forEach((s: LaundryStage) => {
      counts[s] = 0;
    });
    orders.forEach((o) => {
      counts[o.stage] = (counts[o.stage] || 0) + 1;
    });
    return counts;
  };

  const stageCounts = getStageCounts();

  return (
    <div id="order-list-view" className="space-y-5">
      {/* Top Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="orders-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID Nota, nama pelanggan, atau no. telepon..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
          />
        </div>

        {/* View Switcher & Payment Quick Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment filter */}
          <select
            id="payment-filter-select"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">Semua Status Bayar</option>
            <option value="lunas">Hanya Lunas</option>
            <option value="belum_lunas">Belum Lunas (Piutang)</option>
          </select>

          {/* View Mode Toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
              title="Tampilan Tabel"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
              title="Tampilan Kanban / Papan Alur"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stage Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveStageFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeStageFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Semua Cucian
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/50 text-current">
            {stageCounts.all}
          </span>
        </button>

        {STAGES_LIST.map((stage: LaundryStage) => {
          const cfg = STAGE_CONFIG[stage];
          const isSelected = activeStageFilter === stage;
          const count = stageCounts[stage] || 0;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStageFilter(stage)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{cfg.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main View: Table Mode */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">No. Nota</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Layanan & Berat</th>
                  <th className="py-3 px-4">Total & Status Bayar</th>
                  <th className="py-3 px-4">Status Cucian</th>
                  <th className="py-3 px-4">Estimasi Selesai</th>
                  <th className="py-3 px-4 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <AlertTriangle className="w-6 h-6 text-slate-300" />
                        <span className="font-semibold text-xs text-slate-600">
                          Tidak ada pesanan cucian
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Coba ubah kata kunci pencarian atau filter status.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const nextStage = getNextStage(order.stage);
                    const cfg = STAGE_CONFIG[order.stage];

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Order ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(order)}
                            className="hover:text-sky-600 text-left"
                            title="Klik untuk lihat nota"
                          >
                            {order.id}
                          </button>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 leading-snug">
                            {order.customer.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {order.customer.phone}
                          </div>
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-slate-800 line-clamp-1">
                            {order.items.map((i) => `${i.serviceName} (${i.quantity}${i.unit})`).join(', ')}
                          </div>
                          <div className="text-[11px] text-indigo-600 flex items-center gap-1 mt-0.5">
                            <Sparkles className="w-3 h-3 shrink-0" />
                            <span className="truncate">{order.perfume.split('(')[0]}</span>
                          </div>
                        </td>

                        {/* Total & Payment */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900">
                            {formatRupiah(order.total)}
                          </div>
                          <button
                            type="button"
                            onClick={() => onTogglePayment(order.id)}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border transition-all ${
                              order.paymentStatus === 'lunas'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Klik untuk ubah status pembayaran"
                          >
                            {order.paymentStatus === 'lunas' ? (
                              <>
                                <CheckCircle className="w-3 h-3" /> LUNAS ({order.paymentMethod.toUpperCase()})
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" /> BELUM LUNAS
                              </>
                            )}
                          </button>
                        </td>

                        {/* Stage Dropdown */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={order.stage}
                            onChange={(e) =>
                              onUpdateStage(order.id, e.target.value as LaundryStage)
                            }
                            className={`text-xs font-bold py-1 px-2.5 rounded-xl border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 ${cfg.badgeClass}`}
                          >
                            {STAGES_LIST.map((s: LaundryStage) => (
                              <option key={s} value={s}>
                                {STAGE_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Estimated completion */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                          {formatDateIndo(order.estimatedCompletion)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Next Stage Step button */}
                            {nextStage && (
                              <button
                                type="button"
                                onClick={() => onUpdateStage(order.id, nextStage)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white transition-all flex items-center gap-1"
                                title={`Lanjut ke tahap: ${STAGE_CONFIG[nextStage].label}`}
                              >
                                <span>{STAGE_CONFIG[nextStage].label.split(' ')[0]}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}

                            {/* WhatsApp button */}
                            <a
                              href={generateWhatsAppNotificationUrl(order, settings)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Kirim Pesan WhatsApp ke Pelanggan"
                            >
                              <Share2 className="w-4 h-4" />
                            </a>

                            {/* View digital receipt */}
                            <button
                              type="button"
                              onClick={() => onViewReceipt(order)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                              title="Lihat Nota Digital"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>

                            {/* Delete (Admin only) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Hapus pesanan ${order.id} dari sistem?`)) {
                                    onDeleteOrder(order.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Hapus Pesanan (Admin Only)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
          {STAGES_LIST.map((stage: LaundryStage) => {
            const stageCfg = STAGE_CONFIG[stage];
            const ordersInStage = filteredOrders.filter((o) => o.stage === stage);
            const nextStage = getNextStage(stage);

            return (
              <div
                key={stage}
                className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col min-h-[450px]"
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stageCfg.color }}
                    />
                    <h4 className="text-xs font-bold text-slate-800">{stageCfg.label}</h4>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white text-slate-600 border border-slate-200">
                    {ordersInStage.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                  {ordersInStage.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-400 italic">
                      Kosong
                    </div>
                  ) : (
                    ordersInStage.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:shadow-xs transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-slate-900">
                            {order.id}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              order.paymentStatus === 'lunas'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {order.paymentStatus === 'lunas' ? 'LUNAS' : 'BELUM'}
                          </span>
                        </div>

                        <div>
                          <div className="font-bold text-xs text-slate-800">
                            {order.customer.name}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {order.customer.phone}
                          </p>
                        </div>

                        <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg">
                          {order.items.map((i) => `${i.quantity}${i.unit} ${i.serviceName}`).join(', ')}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                          <span className="font-bold font-mono text-slate-900">
                            {formatRupiah(order.total)}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onViewReceipt(order)}
                              className="p-1 text-slate-400 hover:text-slate-700"
                              title="Lihat Nota Digital"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                            {nextStage && (
                              <button
                                type="button"
                                onClick={() => onUpdateStage(order.id, nextStage)}
                                className="p-1 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white transition-colors"
                                title={`Pindah ke ${STAGE_CONFIG[nextStage].label}`}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
