import React, { useState, useMemo } from 'react';
import {
  PayrollItem,
  AppUser,
  LaundrySettings,
  LaundryOrder,
  formatRupiah,
  formatDateIndo,
  SalaryConfig,
  PaymentMethodPayroll,
  PayrollStatus,
} from '../types';
import { PayrollSlipModal } from './PayrollSlipModal';
import { MonthlyPayrollReport } from './MonthlyPayrollReport';
import {
  Banknote,
  Plus,
  Search,
  Filter,
  FileText,
  MessageCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  ShieldAlert,
  Users,
  Building,
  CreditCard,
  Calculator,
  ArrowRight,
  TrendingDown,
  Sparkles,
  AlertCircle,
  Save,
  Calendar,
  Briefcase,
  FileSpreadsheet,
} from 'lucide-react';

interface PayrollManagerProps {
  payrolls: PayrollItem[];
  users: AppUser[];
  orders: LaundryOrder[];
  settings: LaundrySettings;
  currentUser: AppUser | null;
  onAddPayroll: (payroll: Partial<PayrollItem>) => Promise<void>;
  onUpdatePayroll: (id: string, payroll: Partial<PayrollItem>) => Promise<void>;
  onDeletePayroll: (id: string) => Promise<void>;
  onUpdateSalaryConfig: (userId: string, config: SalaryConfig) => Promise<void>;
}

export const PayrollManager: React.FC<PayrollManagerProps> = ({
  payrolls,
  users,
  orders,
  settings,
  currentUser,
  onAddPayroll,
  onUpdatePayroll,
  onDeletePayroll,
  onUpdateSalaryConfig,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // Tabs
  const [activeTab, setActiveTab] = useState<'laporan' | 'list' | 'create' | 'config'>(
    isAdmin ? 'laporan' : 'list'
  );

  // Slip modal state
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollItem | null>(null);
  const [isSlipOpen, setIsSlipOpen] = useState(false);

  // Filters for list
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('semua');
  const [selectedStatus, setSelectedStatus] = useState<string>('semua');

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for creating new payroll
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const worker = users.find((u) => u.role === 'pekerja') || users[0];
    return worker ? worker.id : '';
  });

  const [periodInput, setPeriodInput] = useState<string>(() => {
    const date = new Date();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  });

  const [paymentDate, setPaymentDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodPayroll>('transfer');
  const [payrollStatus, setPayrollStatus] = useState<PayrollStatus>('lunas');

  // Financial inputs
  const [baseSalary, setBaseSalary] = useState<number>(2300000);
  const [allowance, setAllowance] = useState<number>(600000);
  const [allowanceNotes, setAllowanceNotes] = useState<string>('Uang makan & transport');
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [overtimePay, setOvertimePay] = useState<number>(0);
  const [commissionTotal, setCommissionTotal] = useState<number>(0);
  const [commissionNotes, setCommissionNotes] = useState<string>('');
  const [bonus, setBonus] = useState<number>(0);
  const [bonusNotes, setBonusNotes] = useState<string>('');

  // Deductions
  const [kasbonDeduction, setKasbonDeduction] = useState<number>(0);
  const [absenceDeduction, setAbsenceDeduction] = useState<number>(0);
  const [otherDeduction, setOtherDeduction] = useState<number>(0);
  const [otherDeductionNotes, setOtherDeductionNotes] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Salary Config Edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<SalaryConfig>({
    baseSalary: 2300000,
    mealAllowance: 350000,
    transportAllowance: 250000,
    commissionPerKg: 200,
    commissionPerOrder: 500,
    bankName: 'BCA',
    bankAccount: '',
    accountHolder: '',
  });

  // Unique periods available
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    payrolls.forEach((p) => {
      if (p.period) set.add(p.period);
    });
    return Array.from(set);
  }, [payrolls]);

  // Filtered payrolls list
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((p) => {
      // If worker, only show their own
      if (!isAdmin && p.userId !== currentUser?.id) {
        return false;
      }
      if (selectedPeriod !== 'semua' && p.period !== selectedPeriod) {
        return false;
      }
      if (selectedStatus !== 'semua' && p.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.userName.toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        const matchPeriod = p.period.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchPeriod) return false;
      }
      return true;
    });
  }, [payrolls, isAdmin, currentUser, selectedPeriod, selectedStatus, searchQuery]);

  // Overall metrics
  const metrics = useMemo(() => {
    const currentMonthPayrolls = payrolls.filter((p) => {
      if (selectedPeriod !== 'semua') return p.period === selectedPeriod;
      return true;
    });

    const totalNetPaid = currentMonthPayrolls
      .filter((p) => p.status === 'lunas')
      .reduce((sum, p) => sum + p.netSalary, 0);

    const totalNetPending = currentMonthPayrolls
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.netSalary, 0);

    const totalKasbon = currentMonthPayrolls.reduce((sum, p) => sum + p.kasbonDeduction, 0);

    return {
      totalNetPaid,
      totalNetPending,
      totalKasbon,
      countPaid: currentMonthPayrolls.filter((p) => p.status === 'lunas').length,
      countPending: currentMonthPayrolls.filter((p) => p.status === 'pending').length,
      totalSlips: currentMonthPayrolls.length,
    };
  }, [payrolls, selectedPeriod]);

  // Auto load salary config when selecting user in Form
  const handleUserSelect = (uId: string) => {
    setSelectedUserId(uId);
    const targetUser = users.find((u) => u.id === uId);
    if (!targetUser) return;

    if (targetUser.salaryConfig) {
      const cfg = targetUser.salaryConfig;
      setBaseSalary(cfg.baseSalary || 2300000);
      const totalAllowance = (cfg.mealAllowance || 0) + (cfg.transportAllowance || 0);
      setAllowance(totalAllowance);
      setAllowanceNotes(`Uang makan (Rp ${cfg.mealAllowance || 0}) & Transport (Rp ${cfg.transportAllowance || 0})`);
      
      // Auto calculate commission approximation from completed orders
      if (cfg.commissionPerKg) {
        const estKg = 600; // estimation benchmark
        const estCommission = estKg * cfg.commissionPerKg;
        setCommissionTotal(estCommission);
        setCommissionNotes(`Estimasi insentif cuci: ${estKg} Kg x ${formatRupiah(cfg.commissionPerKg)}`);
      } else if (cfg.commissionPerOrder) {
        const estOrders = 250;
        const estCommission = estOrders * cfg.commissionPerOrder;
        setCommissionTotal(estCommission);
        setCommissionNotes(`Estimasi insentif kasir: ${estOrders} Nota x ${formatRupiah(cfg.commissionPerOrder)}`);
      } else {
        setCommissionTotal(0);
        setCommissionNotes('');
      }
    }
  };

  // Calculations for Form
  const calculatedTotalIncome =
    Number(baseSalary) +
    Number(allowance) +
    Number(overtimePay) +
    Number(commissionTotal) +
    Number(bonus);

  const calculatedTotalDeduction =
    Number(kasbonDeduction) +
    Number(absenceDeduction) +
    Number(otherDeduction);

  const calculatedNetSalary = Math.max(0, calculatedTotalIncome - calculatedTotalDeduction);

  // Submit New Payroll
  const handleCreatePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) {
      alert('Pilih karyawan terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<PayrollItem> = {
        userId: targetUser.id,
        userName: targetUser.name,
        userRole: targetUser.role,
        userStation: targetUser.assignedStation,
        userPhone: targetUser.phone,
        period: periodInput.trim(),
        paymentDate,
        status: payrollStatus,
        paymentMethod,
        baseSalary: Number(baseSalary),
        allowance: Number(allowance),
        allowanceNotes: allowanceNotes.trim() || undefined,
        overtimeHours: Number(overtimeHours),
        overtimePay: Number(overtimePay),
        commissionTotal: Number(commissionTotal),
        commissionNotes: commissionNotes.trim() || undefined,
        bonus: Number(bonus),
        bonusNotes: bonusNotes.trim() || undefined,
        totalIncome: calculatedTotalIncome,
        kasbonDeduction: Number(kasbonDeduction),
        absenceDeduction: Number(absenceDeduction),
        otherDeduction: Number(otherDeduction),
        otherDeductionNotes: otherDeductionNotes.trim() || undefined,
        totalDeduction: calculatedTotalDeduction,
        netSalary: calculatedNetSalary,
        bankName: targetUser.salaryConfig?.bankName,
        bankAccount: targetUser.salaryConfig?.bankAccount,
        notes: notes.trim() || undefined,
      };

      await onAddPayroll(payload);
      setActiveTab('list');
    } catch (err: any) {
      alert(err.message || 'Gagal membuat penggajian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Mark Paid
  const handleQuickMarkPaid = async (payrollId: string) => {
    if (!isAdmin) return;
    try {
      await onUpdatePayroll(payrollId, { status: 'lunas' });
      if (selectedPayroll && selectedPayroll.id === payrollId) {
        setSelectedPayroll((prev) => prev ? { ...prev, status: 'lunas' } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status');
    }
  };

  // Open config modal
  const handleOpenConfigModal = (user: AppUser) => {
    setEditingUserId(user.id);
    setConfigForm({
      baseSalary: user.salaryConfig?.baseSalary || 2300000,
      mealAllowance: user.salaryConfig?.mealAllowance || 350000,
      transportAllowance: user.salaryConfig?.transportAllowance || 250000,
      commissionPerKg: user.salaryConfig?.commissionPerKg || 200,
      commissionPerOrder: user.salaryConfig?.commissionPerOrder || 500,
      bankName: user.salaryConfig?.bankName || 'BCA',
      bankAccount: user.salaryConfig?.bankAccount || '',
      accountHolder: user.salaryConfig?.accountHolder || user.name,
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setIsSubmitting(true);
    try {
      await onUpdateSalaryConfig(editingUserId, configForm);
      setEditingUserId(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan konfigurasi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Banknote className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {isAdmin ? 'Manajemen Penggajian Karyawan (Payroll)' : 'Slip Gaji Karyawan'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'Hitung gaji pokok, tunjangan, insentif cucian, potongan kasbon, dan rincian slip gaji resmi.'
                  : `Menampilkan riwayat dan slip gaji untuk akun ${currentUser?.name}.`}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-start md:self-auto overflow-x-auto max-w-full">
          {/* Tab Laporan Bulanan */}
          <button
            id="tab-laporan-bulanan-btn"
            type="button"
            onClick={() => setActiveTab('laporan')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'laporan'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Laporan Bulanan</span>
          </button>

          <button
            id="tab-daftar-slip-btn"
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'list'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Semua Slip Gaji' : 'Slip Gaji Saya'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {filteredPayrolls.length}
            </span>
          </button>

          {isAdmin && (
            <>
              <button
                id="tab-buat-penggajian-btn"
                type="button"
                onClick={() => {
                  setActiveTab('create');
                  handleUserSelect(selectedUserId || users[0]?.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'create'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Penggajian</span>
              </button>

              <button
                id="tab-atur-tarif-btn"
                type="button"
                onClick={() => setActiveTab('config')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'config'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Atur Tarif Staff</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB LAPORAN BULANAN */}
      {activeTab === 'laporan' && (
        <MonthlyPayrollReport
          payrolls={payrolls}
          users={users}
          orders={orders}
          settings={settings}
          currentUser={currentUser}
          onOpenSlip={(p) => {
            setSelectedPayroll(p);
            setIsSlipOpen(true);
          }}
          onMarkPaid={handleQuickMarkPaid}
        />
      )}

      {/* METRICS CARDS (Only on List view) */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              {isAdmin ? 'Total Gaji Dibayarkan' : 'Total Gaji Diterima'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono tracking-tight block">
              {formatRupiah(metrics.totalNetPaid)}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{metrics.countPaid} slip telah lunas</span>
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Menunggu Otorisasi / Pending
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono tracking-tight block">
              {formatRupiah(metrics.totalNetPending)}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>{metrics.countPending} slip belum cair</span>
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Potongan Kasbon
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono tracking-tight block">
              {formatRupiah(metrics.totalKasbon)}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-rose-500" />
              <span>Dipotong dari gaji periode ini</span>
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Rekap Slip
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono tracking-tight block">
              {metrics.totalSlips} Slip
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-sky-500" />
              <span>{users.length} karyawan aktif</span>
            </span>
          </div>
        </div>
      )}

      {/* TAB 1: DAFTAR SLIP GAJI */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filter & Search Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama karyawan, no. slip (PAY-...), atau periode..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Periode filter */}
              <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="semua">Semua Periode</option>
                  {availablePeriods.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="semua">Semua Status</option>
                  <option value="lunas">Lunas / Dibayar</option>
                  <option value="pending">Menunggu / Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* List or Table */}
          {filteredPayrolls.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-500 text-2xl">
                📄
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                Tidak ada data slip penggajian
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isAdmin
                  ? 'Belum ada slip gaji yang dibuat untuk kriteria pencarian ini. Klik tombol "Buat Penggajian" untuk menambahkan.'
                  : 'Belum ada slip gaji yang diterbitkan untuk akun Anda pada periode ini.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">No. Slip & Periode</th>
                    <th className="py-3 px-4">Karyawan / Posisi</th>
                    <th className="py-3 px-4 text-right">Gaji Bruto</th>
                    <th className="py-3 px-4 text-right">Potongan</th>
                    <th className="py-3 px-4 text-right">Gaji Bersih (THP)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayrolls.map((payroll) => {
                    const isLunas = payroll.status === 'lunas';
                    return (
                      <tr key={payroll.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-slate-900 block">{payroll.id}</span>
                          <span className="text-[11px] text-indigo-600 font-sans font-medium">
                            {payroll.period}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">{payroll.userName}</div>
                          <div className="text-[10px] text-slate-500 capitalize flex items-center gap-1">
                            <span>{payroll.userRole === 'admin' ? '👑 Admin' : `👔 ${payroll.userStation || 'Pekerja'}`}</span>
                            {payroll.bankName && (
                              <span>&bull; {payroll.bankName}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          {formatRupiah(payroll.totalIncome)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-rose-600 font-semibold">
                          {payroll.totalDeduction > 0 ? `-${formatRupiah(payroll.totalDeduction)}` : 'Rp 0'}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-slate-900">
                          {formatRupiah(payroll.netSalary)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              isLunas
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isLunas ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Lunas</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>Pending</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {/* View Slip */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayroll(payroll);
                                setIsSlipOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Lihat Slip Gaji"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Slip</span>
                            </button>

                            {/* Mark Paid (Admin only if pending) */}
                            {isAdmin && !isLunas && (
                              <button
                                type="button"
                                onClick={() => handleQuickMarkPaid(payroll.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Tandai Sudah Dibayar"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Bayar</span>
                              </button>
                            )}

                            {/* Delete (Admin only) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Yakin ingin menghapus slip gaji ${payroll.id} (${payroll.userName})?`)) {
                                    onDeletePayroll(payroll.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Hapus Slip"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BUAT PENGGAJIAN BARU (ADMIN ONLY) */}
      {isAdmin && activeTab === 'create' && (
        <form onSubmit={handleCreatePayrollSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-8">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Formulir Penggajian & Penerbitan Slip Gaji</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Kalkulator Otomatis
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Pilih karyawan, tentukan periode penggajian, rincian penerimaan, dan potongan kasbon. Sistem otomatis menghitung total Take Home Pay.
            </p>
          </div>

          {/* Section 1: Profil Karyawan & Periode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pilih Karyawan
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => handleUserSelect(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'admin' ? 'Admin' : u.assignedStation || 'Pekerja'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Periode Gaji
              </label>
              <input
                type="text"
                value={periodInput}
                onChange={(e) => setPeriodInput(e.target.value)}
                placeholder="Contoh: September 2026"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tanggal Pembayaran
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Section 2: Incomes vs Deductions Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* A. PENERIMAAN / INCOMES */}
            <div className="border border-emerald-200 rounded-2xl p-5 bg-emerald-50/20 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>A. Rincian Penerimaan (Incomes)</span>
                </h4>
                <span className="text-xs font-bold text-emerald-700">Bertambah (+)</span>
              </div>

              {/* Gaji Pokok */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gaji Pokok (Rp)
                </label>
                <input
                  type="number"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                  min="0"
                />
              </div>

              {/* Tunjangan Makan & Transport */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tunjangan Total (Rp)
                  </label>
                  <input
                    type="number"
                    value={allowance}
                    onChange={(e) => setAllowance(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Tunjangan
                  </label>
                  <input
                    type="text"
                    value={allowanceNotes}
                    onChange={(e) => setAllowanceNotes(e.target.value)}
                    placeholder="Makan & Transport"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Lembur */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Lembur
                  </label>
                  <input
                    type="number"
                    value={overtimeHours}
                    onChange={(e) => {
                      const h = Number(e.target.value);
                      setOvertimeHours(h);
                      setOvertimePay(h * 20000); // default Rp 20.000/jam
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upah Lembur (Rp)
                  </label>
                  <input
                    type="number"
                    value={overtimePay}
                    onChange={(e) => setOvertimePay(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                    min="0"
                  />
                </div>
              </div>

              {/* Insentif Cucian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Insentif Kinerja / Cucian (Rp)
                  </label>
                  <input
                    type="number"
                    value={commissionTotal}
                    onChange={(e) => setCommissionTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Insentif
                  </label>
                  <input
                    type="text"
                    value={commissionNotes}
                    onChange={(e) => setCommissionNotes(e.target.value)}
                    placeholder="Contoh: 300 Nota x Rp 500"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Bonus Tambahan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bonus Kerajinan / Tambahan (Rp)
                  </label>
                  <input
                    type="number"
                    value={bonus}
                    onChange={(e) => setBonus(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Bonus
                  </label>
                  <input
                    type="text"
                    value={bonusNotes}
                    onChange={(e) => setBonusNotes(e.target.value)}
                    placeholder="Contoh: Reward ketelitian packing"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Subtotal Incomes */}
              <div className="pt-3 border-t border-emerald-200 flex justify-between items-center text-xs font-black text-slate-900">
                <span>Subtotal Penerimaan:</span>
                <span className="text-emerald-700 font-mono text-sm">{formatRupiah(calculatedTotalIncome)}</span>
              </div>
            </div>

            {/* B. POTONGAN / DEDUCTIONS */}
            <div className="border border-rose-200 rounded-2xl p-5 bg-rose-50/20 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>B. Rincian Potongan (Deductions)</span>
                </h4>
                <span className="text-xs font-bold text-rose-700">Berkurang (-)</span>
              </div>

              {/* Potongan Kasbon */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Potongan Kasbon / Pinjaman Karyawan (Rp)
                </label>
                <input
                  type="number"
                  value={kasbonDeduction}
                  onChange={(e) => setKasbonDeduction(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 font-mono"
                  min="0"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Cicilan pinjaman atau kasbon yang telah diambil sebelumnya oleh karyawan.
                </span>
              </div>

              {/* Potongan Keterlambatan / Izin */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Potongan Keterlambatan / Izin Alpha (Rp)
                </label>
                <input
                  type="number"
                  value={absenceDeduction}
                  onChange={(e) => setAbsenceDeduction(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 font-mono"
                  min="0"
                />
              </div>

              {/* Potongan Lainnya */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Potongan Lainnya (Rp)
                  </label>
                  <input
                    type="number"
                    value={otherDeduction}
                    onChange={(e) => setOtherDeduction(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500 font-mono"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alasan Potongan Lain
                  </label>
                  <input
                    type="text"
                    value={otherDeductionNotes}
                    onChange={(e) => setOtherDeductionNotes(e.target.value)}
                    placeholder="Keterangan ganti rugi/lainnya"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Subtotal Deductions */}
              <div className="pt-3 border-t border-rose-200 flex justify-between items-center text-xs font-black text-slate-900">
                <span>Subtotal Potongan:</span>
                <span className="text-rose-700 font-mono text-sm">-{formatRupiah(calculatedTotalDeduction)}</span>
              </div>
            </div>

          </div>

          {/* Section 3: Payment Method, Status, & Grand Total THP */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodPayroll)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="transfer">Transfer Bank (BCA / Mandiri / BRI)</option>
                  <option value="tunai">Tunai Langsung (Cash)</option>
                  <option value="gopay">GoPay</option>
                  <option value="ovo">OVO</option>
                  <option value="dana">DANA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Status Pembayaran
                </label>
                <select
                  value={payrollStatus}
                  onChange={(e) => setPayrollStatus(e.target.value as PayrollStatus)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="lunas">Lunas (Sudah Ditransfer / Diberikan)</option>
                  <option value="pending">Pending (Menunggu Otorisasi Akhir Bulan)</option>
                  <option value="draft">Draft (Konsep Sementara)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Catatan Tambahan untuk Karyawan
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan pada slip gaji..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Total Take Home Pay Display */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 block">
                  TOTAL GAJI BERSIH (TAKE HOME PAY)
                </span>
                <p className="text-xs text-slate-400">
                  Total Penerimaan ({formatRupiah(calculatedTotalIncome)}) dikurangi Total Potongan ({formatRupiah(calculatedTotalDeduction)})
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
                  {formatRupiah(calculatedNetSalary)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan & Terbitkan Slip Gaji</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: ATUR TARIF GAJI POKOK STAFF (ADMIN ONLY) */}
      {isAdmin && activeTab === 'config' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Konfigurasi Gaji Pokok & Rekening Karyawan</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Data Master Staf
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Atur standar gaji pokok bulanan, tunjangan makan & transport, serta nomor rekening bank masing-masing karyawan agar otomatis terisi saat pembuatan slip gaji.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((staff) => {
              const cfg = staff.salaryConfig || {
                baseSalary: 2300000,
                mealAllowance: 350000,
                transportAllowance: 250000,
              };

              return (
                <div
                  key={staff.id}
                  className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-400 transition-all bg-slate-50/50 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{staff.name}</h4>
                        <span className="text-[11px] text-slate-500 capitalize">
                          {staff.role === 'admin' ? '👑 Administrator' : `👔 Stasiun: ${staff.assignedStation || 'Semua'}`}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenConfigModal(staff)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-indigo-500 text-indigo-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Ubah Tarif</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Gaji Pokok:</span>
                      <strong className="text-slate-800 font-mono">{formatRupiah(cfg.baseSalary)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Tunjangan Makan:</span>
                      <strong className="text-slate-800 font-mono">{formatRupiah(cfg.mealAllowance)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Tunjangan Transport:</span>
                      <strong className="text-slate-800 font-mono">{formatRupiah(cfg.transportAllowance)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Insentif Kinerja:</span>
                      <strong className="text-indigo-700 font-mono">
                        {cfg.commissionPerKg ? `${formatRupiah(cfg.commissionPerKg)}/Kg` : (cfg.commissionPerOrder ? `${formatRupiah(cfg.commissionPerOrder)}/Nota` : '-')}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cfg.bankName || 'Bank Transfer'}:</span>
                    </span>
                    <strong className="text-slate-900 font-mono">
                      {cfg.bankAccount ? `${cfg.bankAccount} (a.n ${cfg.accountHolder || staff.name})` : 'Belum diatur'}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: EDIT SALARY CONFIG PER STAFF */}
      {editingUserId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Edit Konfigurasi Gaji: {users.find((u) => u.id === editingUserId)?.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUserId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gaji Pokok Standar (Rp)
                </label>
                <input
                  type="number"
                  value={configForm.baseSalary}
                  onChange={(e) => setConfigForm({ ...configForm, baseSalary: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Uang Makan (Rp)
                  </label>
                  <input
                    type="number"
                    value={configForm.mealAllowance}
                    onChange={(e) => setConfigForm({ ...configForm, mealAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Uang Transport (Rp)
                  </label>
                  <input
                    type="number"
                    value={configForm.transportAllowance}
                    onChange={(e) => setConfigForm({ ...configForm, transportAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Insentif per Kg Cuci (Rp)
                  </label>
                  <input
                    type="number"
                    value={configForm.commissionPerKg || 0}
                    onChange={(e) => setConfigForm({ ...configForm, commissionPerKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Insentif per Nota Kasir (Rp)
                  </label>
                  <input
                    type="number"
                    value={configForm.commissionPerOrder || 0}
                    onChange={(e) => setConfigForm({ ...configForm, commissionPerOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Bank / E-Wallet
                  </label>
                  <input
                    type="text"
                    value={configForm.bankName || ''}
                    onChange={(e) => setConfigForm({ ...configForm, bankName: e.target.value })}
                    placeholder="BCA / Mandiri / BRI / DANA"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    value={configForm.bankAccount || ''}
                    onChange={(e) => setConfigForm({ ...configForm, bankAccount: e.target.value })}
                    placeholder="Nomor Rekening"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUserId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIP MODAL */}
      <PayrollSlipModal
        payroll={selectedPayroll}
        settings={settings}
        isOpen={isSlipOpen}
        onClose={() => {
          setIsSlipOpen(false);
          setSelectedPayroll(null);
        }}
        onMarkPaid={isAdmin ? handleQuickMarkPaid : undefined}
        users={users}
        adminName={users.find((u) => u.role === 'admin')?.name || currentUser?.name}
      />
    </div>
  );
};
