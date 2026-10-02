import React, { useState, useMemo } from 'react';
import {
  PayrollItem,
  AppUser,
  LaundrySettings,
  LaundryOrder,
  formatRupiah,
  formatDateIndo,
} from '../types';
import {
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Wallet,
  Building,
  ArrowUpRight,
  Percent,
} from 'lucide-react';

interface MonthlyPayrollReportProps {
  payrolls: PayrollItem[];
  users: AppUser[];
  orders: LaundryOrder[];
  settings: LaundrySettings;
  currentUser: AppUser | null;
  onOpenSlip: (payroll: PayrollItem) => void;
  onMarkPaid?: (payrollId: string) => Promise<void>;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const MonthlyPayrollReport: React.FC<MonthlyPayrollReportProps> = ({
  payrolls,
  users,
  orders,
  settings,
  currentUser,
  onOpenSlip,
  onMarkPaid,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Current year & month state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentDate.getMonth()); // 0 - 11

  // Target period string e.g. "September 2026"
  const currentPeriodString = `${MONTH_NAMES[selectedMonthIndex]} ${selectedYear}`;

  // Available years derived from payrolls + current year
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1]);
    payrolls.forEach((p) => {
      if (p.paymentDate) {
        const y = new Date(p.paymentDate).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
      // Also check period string if it contains 4-digit year
      const match = p.period.match(/\d{4}/);
      if (match) {
        const parsedYear = parseInt(match[0], 10);
        if (!isNaN(parsedYear)) years.add(parsedYear);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [payrolls]);

  // Navigate to previous or next month
  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonthIndex((prev) => prev + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedYear(currentDate.getFullYear());
    setSelectedMonthIndex(currentDate.getMonth());
  };

  // Filter payrolls for this month
  const monthlyPayrolls = useMemo(() => {
    const targetMonthName = MONTH_NAMES[selectedMonthIndex].toLowerCase();
    const targetYearStr = String(selectedYear);
    const targetMonthNumberStr = String(selectedMonthIndex + 1).padStart(2, '0');
    const targetIsoPrefix = `${targetYearStr}-${targetMonthNumberStr}`;

    return payrolls.filter((p) => {
      // 1. Check exact period name match (e.g. "September 2026")
      const periodLower = (p.period || '').toLowerCase();
      if (periodLower.includes(targetMonthName) && periodLower.includes(targetYearStr)) {
        return true;
      }
      // 2. Check paymentDate match
      if (p.paymentDate && p.paymentDate.startsWith(targetIsoPrefix)) {
        return true;
      }
      // 3. Check createdAt match if period is empty
      if (!p.period && p.createdAt && p.createdAt.startsWith(targetIsoPrefix)) {
        return true;
      }
      return false;
    });
  }, [payrolls, selectedMonthIndex, selectedYear]);

  // Filter orders for this month to calculate Payroll-to-Revenue Ratio
  const monthlyRevenue = useMemo(() => {
    const targetYearStr = String(selectedYear);
    const targetMonthNumberStr = String(selectedMonthIndex + 1).padStart(2, '0');
    const targetIsoPrefix = `${targetYearStr}-${targetMonthNumberStr}`;

    return orders
      .filter((o) => o.createdAt && o.createdAt.startsWith(targetIsoPrefix))
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [orders, selectedMonthIndex, selectedYear]);

  // Accumulate totals
  const totals = useMemo(() => {
    let totalBaseSalary = 0;
    let totalAllowance = 0;
    let totalOvertimePay = 0;
    let totalCommission = 0;
    let totalBonus = 0;
    let totalIncome = 0;
    let totalKasbon = 0;
    let totalAbsence = 0;
    let totalOtherDeduction = 0;
    let totalDeduction = 0;
    let totalNetSalary = 0;

    let paidCount = 0;
    let pendingCount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    monthlyPayrolls.forEach((p) => {
      totalBaseSalary += p.baseSalary || 0;
      totalAllowance += p.allowance || 0;
      totalOvertimePay += p.overtimePay || 0;
      totalCommission += p.commissionTotal || 0;
      totalBonus += p.bonus || 0;
      totalIncome += p.totalIncome || 0;
      totalKasbon += p.kasbonDeduction || 0;
      totalAbsence += p.absenceDeduction || 0;
      totalOtherDeduction += p.otherDeduction || 0;
      totalDeduction += p.totalDeduction || 0;
      totalNetSalary += p.netSalary || 0;

      if (p.status === 'lunas') {
        paidCount++;
        paidAmount += p.netSalary || 0;
      } else {
        pendingCount++;
        pendingAmount += p.netSalary || 0;
      }
    });

    const fixedCost = totalBaseSalary + totalAllowance;
    const variableCost = totalOvertimePay + totalCommission + totalBonus;

    return {
      totalBaseSalary,
      totalAllowance,
      totalOvertimePay,
      totalCommission,
      totalBonus,
      totalIncome,
      totalKasbon,
      totalAbsence,
      totalOtherDeduction,
      totalDeduction,
      totalNetSalary,
      fixedCost,
      variableCost,
      paidCount,
      pendingCount,
      paidAmount,
      pendingAmount,
      totalStaffCount: monthlyPayrolls.length,
    };
  }, [monthlyPayrolls]);

  // Payroll-to-Revenue Ratio percentage
  const payrollToRevenueRatio = useMemo(() => {
    if (monthlyRevenue <= 0) return 0;
    return Math.round((totals.totalNetSalary / monthlyRevenue) * 100);
  }, [totals.totalNetSalary, monthlyRevenue]);

  // Export CSV Report
  const handleExportCsv = () => {
    const headers = [
      'No',
      'ID Slip',
      'Nama Karyawan',
      'Stasiun / Posisi',
      'No Telepon',
      'Periode',
      'Gaji Pokok (Rp)',
      'Tunjangan (Rp)',
      'Lembur (Rp)',
      'Komisi Cucian (Rp)',
      'Bonus (Rp)',
      'Total Bruto (Rp)',
      'Potongan Kasbon (Rp)',
      'Potongan Lain (Rp)',
      'Total Potongan (Rp)',
      'Gaji Bersih / THP (Rp)',
      'Status',
      'Metode Bayar',
      'Bank / Rekening',
      'Tgl Pembayaran',
      'Catatan',
    ];

    const rows = monthlyPayrolls.map((p, idx) => [
      idx + 1,
      `"${p.id}"`,
      `"${p.userName}"`,
      `"${p.userStation || '-'}"`,
      `"${p.userPhone || '-'}"`,
      `"${p.period}"`,
      p.baseSalary,
      p.allowance,
      p.overtimePay || 0,
      p.commissionTotal || 0,
      p.bonus || 0,
      p.totalIncome,
      p.kasbonDeduction || 0,
      (p.absenceDeduction || 0) + (p.otherDeduction || 0),
      p.totalDeduction,
      p.netSalary,
      `"${p.status.toUpperCase()}"`,
      `"${p.paymentMethod}"`,
      `"${p.bankName ? `${p.bankName} - ${p.bankAccount}` : '-'}"`,
      `"${p.paymentDate || '-'}"`,
      `"${p.notes || ''}"`,
    ]);

    // Grand Total Row
    rows.push([
      'TOTAL',
      `"${monthlyPayrolls.length} Karyawan"`,
      '""',
      '""',
      '""',
      '""',
      totals.totalBaseSalary,
      totals.totalAllowance,
      totals.totalOvertimePay,
      totals.totalCommission,
      totals.totalBonus,
      totals.totalIncome,
      totals.totalKasbon,
      totals.totalAbsence + totals.totalOtherDeduction,
      totals.totalDeduction,
      totals.totalNetSalary,
      '""',
      '""',
      '""',
      '""',
      '""',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan-Gaji-${settings.shopName.replace(/\s+/g, '-')}-${MONTH_NAMES[selectedMonthIndex]}-${selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Screen Interface */}
      <div className="space-y-6">
      {/* 1. Header & Period Selector Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Laporan Gaji Karyawan Per Bulan
              </h3>
              <p className="text-xs text-slate-500">
                Rekapitulasi beban payroll, take home pay, potongan kasbon, dan status pencairan gaji {settings.shopName}.
              </p>
            </div>
          </div>
        </div>

        {/* Period Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Previous Month */}
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Month Selector */}
          <select
            value={selectedMonthIndex}
            onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Next Month */}
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Reset to current month button */}
          <button
            type="button"
            onClick={handleResetToCurrentMonth}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Bulan Ini
          </button>

          {/* Export & Print */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={monthlyPayrolls.length === 0}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              title="Unduh format Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Monthly Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Net Payroll */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-15 pointer-events-none">
            <DollarSign className="w-24 h-24" />
          </div>
          <p className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" /> Total Gaji Bersih (THP)
          </p>
          <h4 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight font-mono">
            {formatRupiah(totals.totalNetSalary)}
          </h4>
          <div className="mt-2 text-[11px] text-emerald-100 flex items-center justify-between">
            <span>Periode: {currentPeriodString}</span>
            <span className="font-bold bg-white/20 px-2 py-0.5 rounded-md">
              {totals.totalStaffCount} Karyawan
            </span>
          </div>
        </div>

        {/* Fixed Salary Cost (Pokok + Tunjangan) */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-indigo-500" /> Biaya Gaji Pokok & Tunjangan
          </p>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 tracking-tight font-mono">
            {formatRupiah(totals.fixedCost)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Pokok: {formatRupiah(totals.totalBaseSalary)} &bull; Tunj: {formatRupiah(totals.totalAllowance)}
          </p>
        </div>

        {/* Variable Incentive Cost (Lembur + Komisi + Bonus) */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-sky-500" /> Insentif, Lembur & Bonus
          </p>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 tracking-tight font-mono">
            {formatRupiah(totals.variableCost)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Lembur: {formatRupiah(totals.totalOvertimePay)} &bull; Komisi: {formatRupiah(totals.totalCommission)}
          </p>
        </div>

        {/* Kasbon Deduction / Recovery */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Kasbon Terpotong (Kembali)
          </p>
          <h4 className="text-xl sm:text-2xl font-black text-amber-700 mt-1.5 tracking-tight font-mono">
            {formatRupiah(totals.totalKasbon)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Total Potongan Keseluruhan: {formatRupiah(totals.totalDeduction)}
          </p>
        </div>
      </div>

      {/* 3. Disbursement Status & Payroll-to-Revenue Insight Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Pencairan Gaji */}
        <div className="md:col-span-2 bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Status Realisasi Pembayaran Gaji
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelunasan transfer / pembayaran gaji karyawan bulan {currentPeriodString}
              </p>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                totals.pendingCount === 0 && totals.totalStaffCount > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {totals.pendingCount === 0 && totals.totalStaffCount > 0
                ? 'Semua Lunas'
                : `${totals.paidCount} / ${totals.totalStaffCount} Lunas`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${
                    totals.totalStaffCount > 0 ? (totals.paidCount / totals.totalStaffCount) * 100 : 0
                  }%`,
                }}
                title={`Sudah Dibayar: ${formatRupiah(totals.paidAmount)}`}
              />
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{
                  width: `${
                    totals.totalStaffCount > 0
                      ? (totals.pendingCount / totals.totalStaffCount) * 100
                      : 0
                  }%`,
                }}
                title={`Menunggu Pembayaran: ${formatRupiah(totals.pendingAmount)}`}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Sudah Ditransfer / Lunas: <strong>{formatRupiah(totals.paidAmount)}</strong> ({totals.paidCount} staf)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                Pending / Belum Bayar: <strong>{formatRupiah(totals.pendingAmount)}</strong> ({totals.pendingCount} staf)
              </span>
            </div>
          </div>
        </div>

        {/* Payroll-to-Revenue Ratio Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-emerald-400" /> Rasio Beban Gaji
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  payrollToRevenueRatio > 0 && payrollToRevenueRatio <= 35
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : payrollToRevenueRatio === 0
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {payrollToRevenueRatio > 0 && payrollToRevenueRatio <= 35
                  ? 'Kategori Sehat (20-35%)'
                  : payrollToRevenueRatio === 0
                  ? 'Belum ada omset'
                  : 'Perlu Efisiensi'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-mono text-white">
                {monthlyRevenue > 0 ? `${payrollToRevenueRatio}%` : 'N/A'}
              </span>
              <span className="text-xs text-slate-400">dari omset cucian</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Omset Cucian Bulan Ini:</span>
              <span className="font-semibold text-slate-200 font-mono">
                {formatRupiah(monthlyRevenue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Estimasi Sisa Kas Operasional:</span>
              <span className="font-semibold text-emerald-400 font-mono">
                {formatRupiah(Math.max(0, monthlyRevenue - totals.totalNetSalary))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Table of Monthly Payrolls */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" /> Rekapitulasi Rincian Gaji Per Karyawan
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Periode <strong>{currentPeriodString}</strong> &bull; Outlet: <strong>{settings.shopName}</strong>
            </p>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Total Karyawan: <strong>{monthlyPayrolls.length} Orang</strong>
          </div>
        </div>

        {monthlyPayrolls.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h5 className="text-sm font-bold text-slate-800">
              Tidak Ada Data Gaji untuk Bulan {currentPeriodString}
            </h5>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Belum ada slip gaji yang dibuat untuk periode ini. Silakan buat penggajian baru pada tab "Buat Penggajian".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5 text-center">No</th>
                  <th className="py-3 px-4">Karyawan</th>
                  <th className="py-3 px-3 text-right">Gaji Pokok</th>
                  <th className="py-3 px-3 text-right">Tunjangan</th>
                  <th className="py-3 px-3 text-right">Lembur</th>
                  <th className="py-3 px-3 text-right">Komisi</th>
                  <th className="py-3 px-3 text-right">Bonus</th>
                  <th className="py-3 px-3.5 text-right font-bold text-slate-900">Total Bruto</th>
                  <th className="py-3 px-3 text-right text-amber-700">Pot. Kasbon</th>
                  <th className="py-3 px-3 text-right text-rose-700">Pot. Lain</th>
                  <th className="py-3 px-3.5 text-right font-bold text-emerald-800 bg-emerald-50/50">Gaji Bersih (THP)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Metode / Bank</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyPayrolls.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-3.5 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{p.userName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="capitalize font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px]">
                          {p.userStation || p.userRole}
                        </span>
                        <span>&bull; {p.userPhone || '-'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono">
                      {formatRupiah(p.baseSalary)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                      {formatRupiah(p.allowance)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                      {p.overtimePay ? formatRupiah(p.overtimePay) : '-'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                      {p.commissionTotal ? formatRupiah(p.commissionTotal) : '-'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                      {p.bonus ? formatRupiah(p.bonus) : '-'}
                    </td>

                    <td className="py-3.5 px-3.5 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(p.totalIncome)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-amber-700">
                      {p.kasbonDeduction ? `-${formatRupiah(p.kasbonDeduction)}` : '-'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-rose-700">
                      {(p.absenceDeduction || 0) + (p.otherDeduction || 0) > 0
                        ? `-${formatRupiah((p.absenceDeduction || 0) + (p.otherDeduction || 0))}`
                        : '-'}
                    </td>

                    <td className="py-3.5 px-3.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/40">
                      {formatRupiah(p.netSalary)}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'lunas'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status === 'lunas' ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" /> Lunas
                          </>
                        ) : (
                          <>
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="font-semibold text-slate-800 uppercase text-[10px]">
                        {p.paymentMethod}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-[110px] mx-auto">
                        {p.bankName ? `${p.bankName} ${p.bankAccount}` : '-'}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenSlip(p)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] transition-colors inline-flex items-center gap-1"
                          title="Lihat Slip Gaji"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Slip</span>
                        </button>

                        {isAdmin && p.status !== 'lunas' && onMarkPaid && (
                          <button
                            type="button"
                            onClick={() => onMarkPaid(p.id)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors"
                            title="Tandai Sudah Lunas"
                          >
                            Lunas
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Grand Total Footer Row */}
              <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="py-3.5 px-4 text-center uppercase tracking-wider text-xs">
                    TOTAL KESELURUHAN ({monthlyPayrolls.length} Karyawan)
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    {formatRupiah(totals.totalBaseSalary)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    {formatRupiah(totals.totalAllowance)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    {formatRupiah(totals.totalOvertimePay)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    {formatRupiah(totals.totalCommission)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono">
                    {formatRupiah(totals.totalBonus)}
                  </td>
                  <td className="py-3.5 px-3.5 text-right font-mono text-slate-900">
                    {formatRupiah(totals.totalIncome)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-amber-800">
                    -{formatRupiah(totals.totalKasbon)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-rose-800">
                    -{formatRupiah(totals.totalAbsence + totals.totalOtherDeduction)}
                  </td>
                  <td className="py-3.5 px-3.5 text-right font-mono text-base font-black text-emerald-800 bg-emerald-100/60">
                    {formatRupiah(totals.totalNetSalary)}
                  </td>
                  <td colSpan={3} className="py-3.5 px-3 text-center text-[11px] text-slate-600">
                    Lunas: {totals.paidCount} &bull; Pending: {totals.pendingCount}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
