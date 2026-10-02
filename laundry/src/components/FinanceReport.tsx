import React, { useState, useEffect } from 'react';
import { LaundryOrder, LaundrySettings, formatRupiah, formatDateIndo, AppUser, PayrollItem, ExpenseItem } from '../types';
import {
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  Download,
  Store,
  CheckCircle,
  Save,
  RotateCcw,
  ShieldAlert,
  Lock,
  KeyRound,
  Banknote,
  ArrowUpRight,
  Wallet,
  ShoppingCart,
} from 'lucide-react';
import { DEFAULT_SETTINGS, INITIAL_SAMPLE_ORDERS } from '../data/defaultData';

interface FinanceReportProps {
  orders: LaundryOrder[];
  settings: LaundrySettings;
  onUpdateSettings: (newSettings: LaundrySettings) => void;
  onResetOrders: () => void;
  currentUser?: AppUser | null;
  users?: AppUser[];
  onOpenLoginModal?: () => void;
  payrolls?: PayrollItem[];
  onNavigatePayroll?: () => void;
  expenses?: ExpenseItem[];
  onNavigateBahan?: () => void;
}

export const FinanceReport: React.FC<FinanceReportProps> = ({
  orders,
  settings,
  onUpdateSettings,
  onResetOrders,
  currentUser,
  users = [],
  onOpenLoginModal,
  payrolls = [],
  onNavigatePayroll,
  expenses = [],
  onNavigateBahan,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Store settings form state
  const [shopName, setShopName] = useState(settings.shopName);
  const [shopPhone, setShopPhone] = useState(settings.shopPhone);
  const [shopAddress, setShopAddress] = useState(settings.shopAddress);
  const [footerMessage, setFooterMessage] = useState(settings.footerMessage);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  useEffect(() => {
    setShopName(settings.shopName);
    setShopPhone(settings.shopPhone);
    setShopAddress(settings.shopAddress);
    setFooterMessage(settings.footerMessage);
  }, [settings]);

  // If user is Pekerja (not admin), show friendly permission screen
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm my-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Khusus Administrator</span>
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">
          Laporan Keuangan & Omset Terkunci
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          Anda saat ini masuk sebagai <strong>{currentUser?.name || 'Pekerja / Operator'}</strong> (Role: Pekerja).
          Sesuai kebijakan hak akses sistem, laporan omset keuangan, laba, ekspor CSV, dan pengaturan toko hanya dapat diakses oleh Administrator/Pemilik.
        </p>

        {onOpenLoginModal && (
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
          >
            <KeyRound className="w-4 h-4" />
            <span>Beralih ke Akun Administrator</span>
          </button>
        )}
      </div>
    );
  }

  // Financial calculations
  const totalOmset = orders.reduce((sum, o) => sum + o.total, 0);
  const totalLunas = orders
    .filter((o) => o.paymentStatus === 'lunas')
    .reduce((sum, o) => sum + o.total, 0);
  const totalBelumLunas = orders
    .filter((o) => o.paymentStatus === 'belum_lunas')
    .reduce((sum, o) => sum + o.total, 0);

  // Volume calculations
  let totalKg = 0;
  let totalPcs = 0;
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (item.unit === 'kg') {
        totalKg += item.quantity;
      } else {
        totalPcs += item.quantity;
      }
    });
  });

  const activeOrdersCount = orders.filter((o) => o.stage !== 'selesai').length;
  const completedOrdersCount = orders.filter((o) => o.stage === 'selesai').length;

  // Breakdown by payment method
  const paymentBreakdown = {
    tunai: orders
      .filter((o) => o.paymentMethod === 'tunai')
      .reduce((sum, o) => sum + o.total, 0),
    qris: orders
      .filter((o) => o.paymentMethod === 'qris')
      .reduce((sum, o) => sum + o.total, 0),
    transfer: orders
      .filter((o) => o.paymentMethod === 'transfer')
      .reduce((sum, o) => sum + o.total, 0),
  };

  // Current month payroll calculations
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const currentMonthPayrolls = payrolls.filter((p) => {
    if (p.paymentDate && p.paymentDate.startsWith(currentMonthPrefix)) return true;
    const periodLower = (p.period || '').toLowerCase();
    const currentYear = new Date().getFullYear();
    if (periodLower.includes(String(currentYear))) return true;
    if (p.createdAt && p.createdAt.startsWith(currentMonthPrefix)) return true;
    return false;
  });

  const totalGajiBulanIni = currentMonthPayrolls.reduce(
    (sum, p) => sum + (p.netSalary || 0),
    0
  );
  const totalGajiLunas = currentMonthPayrolls
    .filter((p) => p.status === 'lunas')
    .reduce((sum, p) => sum + (p.netSalary || 0), 0);

  // Belanja bahan & pengeluaran operasional bulan ini
  const currentMonthExpenses = expenses.filter((e) => e.date && e.date.startsWith(currentMonthPrefix));
  const totalBahanBulanIni = currentMonthExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  const labaBersihEstimasi = totalLunas - totalGajiBulanIni - totalBahanBulanIni;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      shopName,
      shopPhone,
      shopAddress,
      footerMessage,
    });
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 3000);
  };

  const handleExportCsv = () => {
    const headers = [
      'No Nota',
      'Tanggal',
      'Nama Pelanggan',
      'No Telepon',
      'Rincian Item',
      'Status Cucian',
      'Status Bayar',
      'Metode Bayar',
      'Total Biaya (Rp)',
    ];

    const rows = orders.map((o) => [
      `"${o.id}"`,
      `"${formatDateIndo(o.createdAt)}"`,
      `"${o.customer.name}"`,
      `"${o.customer.phone}"`,
      `"${o.items.map((i) => `${i.quantity}${i.unit} ${i.serviceName}`).join('; ')}"`,
      `"${o.stage}"`,
      `"${o.paymentStatus}"`,
      `"${o.paymentMethod}"`,
      o.total,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap-laundry-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="finance-report-view" className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Ringkasan Bisnis & Laporan Keuangan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau performa omset, status pembayaran pelanggan, dan volume pengerjaan cucian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Ekspor CSV
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Muat ulang data sampel pesanan demo?')) {
                onResetOrders();
              }
            }}
            className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Reset Contoh Data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omset */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Omset</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black font-mono text-slate-900">
              {formatRupiah(totalOmset)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Dari {orders.length} pesanan masuk</p>
          </div>
        </div>

        {/* Sudah Lunas */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sudah Lunas (Kas Masuk)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black font-mono text-emerald-600">
              {formatRupiah(totalLunas)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {Math.round((totalLunas / (totalOmset || 1)) * 100)}% dari total omset
            </p>
          </div>
        </div>

        {/* Belum Lunas (Piutang) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Piutang (Belum Bayar)</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black font-mono text-rose-600">
              {formatRupiah(totalBelumLunas)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Tagihan saat ambil cucian</p>
          </div>
        </div>

        {/* Volume Cucian */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Volume Dicuci</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900">
              {totalKg.toFixed(1)} <span className="text-xs font-semibold text-slate-500">Kg</span>{' '}
              • {totalPcs} <span className="text-xs font-semibold text-slate-500">Pcs</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeOrdersCount} antrean aktif / {completedOrdersCount} selesai
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Payroll & Net Profit Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 border border-slate-800">
        <div className="space-y-1.5 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rekap Beban Penggajian Karyawan Bulanan</span>
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
            Analisis Biaya SDM & Estimasi Laba Bersih
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Biaya operasional bulan ini: Gaji Staff{' '}
            <strong className="text-emerald-400 font-mono">{formatRupiah(totalGajiBulanIni)}</strong> ({currentMonthPayrolls.length} slip) & Belanja Bahan Laundry{' '}
            <strong className="text-sky-300 font-mono">{formatRupiah(totalBahanBulanIni)}</strong> ({currentMonthExpenses.length} pembelian).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold block">
              Estimasi Laba Bersih Operasional
            </span>
            <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              labaBersihEstimasi >= 0 ? 'text-emerald-300' : 'text-rose-400'
            }`}>
              {formatRupiah(labaBersihEstimasi)}
            </div>
            <span className="text-[10px] text-slate-300">
              Kas Masuk ({formatRupiah(totalLunas)}) - [Gaji ({formatRupiah(totalGajiBulanIni)}) + Bahan ({formatRupiah(totalBahanBulanIni)})]
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {onNavigateBahan && (
              <button
                type="button"
                onClick={onNavigateBahan}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>Bahan Laundry</span>
              </button>
            )}

            {onNavigatePayroll && (
              <button
                type="button"
                onClick={onNavigatePayroll}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs inline-flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <span>Laporan Gaji</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Channels */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Metode Pembayaran
          </h3>

          <div className="space-y-3">
            {[
              {
                label: 'Pembayaran Tunai (Cash)',
                val: paymentBreakdown.tunai,
                color: 'bg-emerald-500',
              },
              {
                label: 'QRIS (Gopay, OVO, ShopeePay, BCA)',
                val: paymentBreakdown.qris,
                color: 'bg-sky-500',
              },
              {
                label: 'Transfer Bank Mandiri/BCA/BRI',
                val: paymentBreakdown.transfer,
                color: 'bg-indigo-500',
              },
            ].map((item) => {
              const pct = Math.round((item.val / (totalOmset || 1)) * 100);
              return (
                <div key={item.label} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah(item.val)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outlet & Settings Config */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" /> Pengaturan Data Outlet (Nota)
            </h3>
            {savedSettingsNotice && (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                <CheckCircle className="w-3.5 h-3.5" /> Tersimpan!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Nama Usaha Laundry</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                No. WhatsApp Resmi Toko
              </label>
              <input
                type="text"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Alamat Outlet</label>
              <input
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Pesan Footer Nota Struk
              </label>
              <input
                type="text"
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Simpan Perubahan Outlet
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
