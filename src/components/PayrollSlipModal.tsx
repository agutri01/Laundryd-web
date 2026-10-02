import React, { useState, useMemo } from 'react';
import { PayrollItem, LaundrySettings, AppUser, formatRupiah, formatDateIndo } from '../types';
import {
  FileText,
  X,
  CheckCircle2,
  MessageCircle,
  Check,
  Copy,
  Printer,
  Bluetooth,
} from 'lucide-react';
import {
  PaperSize,
  triggerPrintWithPaperSize,
  printBytesViaBluetooth,
  isWebBluetoothSupported,
  buildPayrollEscPosBytes,
} from '../utils/printer';

interface PayrollSlipModalProps {
  payroll: PayrollItem | null;
  settings: LaundrySettings;
  isOpen: boolean;
  onClose: () => void;
  onMarkPaid?: (id: string) => void;
  users?: AppUser[];
  adminName?: string;
}

export const PayrollSlipModal: React.FC<PayrollSlipModalProps> = ({
  payroll,
  settings,
  isOpen,
  onClose,
  onMarkPaid,
  users = [],
  adminName,
}) => {
  if (!isOpen || !payroll) return null;

  // Resolve Owner / Admin Name directly from admin user data in database
  const adminUser = users.find((u) => u.role === 'admin');
  const ownerAdminName =
    adminUser?.name ||
    adminName ||
    payroll.paidByAdminName ||
    'Owner & Admin';

  const ownerAdminShort =
    ownerAdminName.replace(/\s*\([^)]*\)/g, '').trim() || ownerAdminName;

  // Default to 58mm thermal roll (Mini Market Cashier standard)
  const [paperSize, setPaperSize] = useState<PaperSize>('thermal-58');
  const [copied, setCopied] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<string>('');
  const [isPrintingBluetooth, setIsPrintingBluetooth] = useState(false);

  // Generate authentic barcode stripes based on payroll id
  const barcodeBars = useMemo(() => {
    const seed = payroll.id.replace(/\D/g, '') + '739102';
    const bars: number[] = [];
    for (let i = 0; i < 48; i++) {
      const code = seed.charCodeAt(i % seed.length);
      const width = ((code + i * 5) % 3) + 1; // 1px, 2px, or 3px
      bars.push(width);
    }
    return bars;
  }, [payroll.id]);

  const handlePrint = () => {
    triggerPrintWithPaperSize(paperSize, 'payroll-slip-printable');
  };

  const handleBluetoothPrint = async () => {
    setIsPrintingBluetooth(true);
    setBluetoothStatus('Mencari printer thermal Bluetooth...');
    try {
      const cols = paperSize === 'thermal-80' ? 48 : 32;
      const bytes = buildPayrollEscPosBytes(payroll, settings, cols, ownerAdminShort);
      const res = await printBytesViaBluetooth(bytes, (msg) => setBluetoothStatus(msg));
      if (res.success) {
        setBluetoothStatus('Slip gaji berhasil dicetak!');
        setTimeout(() => setBluetoothStatus(''), 3000);
      } else {
        setBluetoothStatus(res.message);
        setTimeout(() => setBluetoothStatus(''), 4000);
      }
    } catch (err: any) {
      setBluetoothStatus(err.message || 'Gagal menghubungkan printer Bluetooth.');
      setTimeout(() => setBluetoothStatus(''), 4000);
    } finally {
      setIsPrintingBluetooth(false);
    }
  };

  const handleCopyText = () => {
    const textLines = [
      `*FAKTUR SLIP GAJI KARYAWAN - ${settings.shopName.toUpperCase()}*`,
      `Periode: ${payroll.period}`,
      `No. Slip: ${payroll.id}`,
      `Karyawan: ${payroll.userName} (${payroll.userStation || payroll.userRole})`,
      `================================`,
      `Gaji Pokok: ${formatRupiah(payroll.baseSalary)}`,
      ...(payroll.allowance > 0 ? [`Tunjangan: ${formatRupiah(payroll.allowance)}`] : []),
      ...(payroll.overtimePay && payroll.overtimePay > 0
        ? [`Lembur (${payroll.overtimeHours || 0} Jam): ${formatRupiah(payroll.overtimePay)}`]
        : []),
      ...(payroll.commissionTotal && payroll.commissionTotal > 0
        ? [`Komisi Cucian: ${formatRupiah(payroll.commissionTotal)}`]
        : []),
      ...(payroll.bonus && payroll.bonus > 0 ? [`Bonus Prestasi: ${formatRupiah(payroll.bonus)}`] : []),
      `--------------------------------`,
      `Total Bruto: ${formatRupiah(payroll.totalIncome)}`,
      ...(payroll.kasbonDeduction > 0 ? [`Pot. Kasbon: -${formatRupiah(payroll.kasbonDeduction)}`] : []),
      ...(payroll.absenceDeduction && payroll.absenceDeduction > 0
        ? [`Pot. Izin/Alpha: -${formatRupiah(payroll.absenceDeduction)}`]
        : []),
      ...(payroll.otherDeduction && payroll.otherDeduction > 0
        ? [`Pot. Lain: -${formatRupiah(payroll.otherDeduction)}`]
        : []),
      ...(payroll.totalDeduction > 0 ? [`Total Potongan: -${formatRupiah(payroll.totalDeduction)}`] : []),
      `================================`,
      `GAJI BERSIH (THP): ${formatRupiah(payroll.netSalary)}`,
      `Status: ${payroll.status.toUpperCase()} (${payroll.paymentMethod.toUpperCase()})`,
      `Tgl Bayar: ${formatDateIndo(payroll.paymentDate)}`,
      `Pimpinan & Owner: ${ownerAdminShort}`,
    ];
    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!payroll.userPhone) {
      alert('Nomor WhatsApp karyawan belum tercatat.');
      return;
    }

    const cleanPhone = payroll.userPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

    const message =
      `Halo Kak *${payroll.userName}*,\n` +
      `Berikut adalah rincian *Faktur Slip Gaji* Anda di *${settings.shopName}*:\n\n` +
      `📄 *No. Slip:* ${payroll.id}\n` +
      `📅 *Periode:* ${payroll.period}\n` +
      `👔 *Posisi:* ${payroll.userStation ? payroll.userStation.toUpperCase() : 'STAFF'}\n\n` +
      `💰 *RINCIAN PENERIMAAN:*\n` +
      `• Gaji Pokok: ${formatRupiah(payroll.baseSalary)}\n` +
      (payroll.allowance > 0 ? `• Tunjangan: ${formatRupiah(payroll.allowance)}\n` : '') +
      (payroll.overtimePay && payroll.overtimePay > 0
        ? `• Lembur (${payroll.overtimeHours || 0} Jam): ${formatRupiah(payroll.overtimePay)}\n`
        : '') +
      (payroll.commissionTotal && payroll.commissionTotal > 0
        ? `• Insentif/Komisi: ${formatRupiah(payroll.commissionTotal)}\n`
        : '') +
      (payroll.bonus > 0 ? `• Bonus: ${formatRupiah(payroll.bonus)}\n` : '') +
      `*Total Penerimaan: ${formatRupiah(payroll.totalIncome)}*\n\n` +
      `🔻 *RINCIAN POTONGAN:*\n` +
      (payroll.kasbonDeduction > 0 ? `• Potongan Kasbon: ${formatRupiah(payroll.kasbonDeduction)}\n` : '') +
      (payroll.absenceDeduction && payroll.absenceDeduction > 0 ? `• Potongan Izin/Alpha: ${formatRupiah(payroll.absenceDeduction)}\n` : '') +
      (payroll.otherDeduction && payroll.otherDeduction > 0 ? `• Potongan Lain: ${formatRupiah(payroll.otherDeduction)}\n` : '') +
      `*Total Potongan: ${formatRupiah(payroll.totalDeduction)}*\n\n` +
      `💵 *GAJI BERSIH DITERIMA (TAKE HOME PAY):*\n` +
      `*${formatRupiah(payroll.netSalary)}*\n\n` +
      `Status: *${payroll.status === 'lunas' ? 'LUNAS / TELAH DIBAYAR' : 'MENUNGGU PENCAIRAN'}*\n` +
      `Metode: ${payroll.paymentMethod.toUpperCase()} ${
        payroll.bankName ? `(${payroll.bankName} - ${payroll.bankAccount || ''})` : ''
      }\n\n` +
      `Terima kasih atas dedikasi dan kerja keras Kakak di ${settings.shopName}! 🙏✨\n` +
      `- Manajemen & Owner: *${ownerAdminShort}*`;

    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Generate itemized components for this specific payroll transaction
  const payrollItems: {
    name: string;
    category: string;
    type: 'income' | 'deduction';
    notes: string;
    amount: number;
  }[] = [];

  // Gaji Pokok
  if (payroll.baseSalary > 0) {
    payrollItems.push({
      name: 'Gaji Pokok Karyawan',
      category: 'Pendapatan Pokok',
      type: 'income',
      notes: `Gaji pokok bulanan staf (${payroll.userStation ? `Stasiun ${payroll.userStation}` : payroll.userRole})`,
      amount: payroll.baseSalary,
    });
  }

  // Tunjangan Operasional
  if (payroll.allowance > 0) {
    payrollItems.push({
      name: 'Tunjangan Operasional',
      category: 'Tunjangan Tetap',
      type: 'income',
      notes: payroll.allowanceNotes || 'Tunjangan makan & uang transport operasional staf',
      amount: payroll.allowance,
    });
  }

  // Uang Lembur
  if (payroll.overtimePay && payroll.overtimePay > 0) {
    payrollItems.push({
      name: `Upah Lembur Tambahan (${payroll.overtimeHours || 0} Jam)`,
      category: 'Insentif Variabel',
      type: 'income',
      notes: `Upah kerja lembur operasional ${payroll.overtimeHours || 0} jam tambahan`,
      amount: payroll.overtimePay,
    });
  }

  // Komisi Cucian
  if (payroll.commissionTotal && payroll.commissionTotal > 0) {
    payrollItems.push({
      name: 'Insentif / Komisi Cucian',
      category: 'Insentif Kinerja',
      type: 'income',
      notes: payroll.commissionNotes || 'Insentif pengerjaan cucian per kg/order shift',
      amount: payroll.commissionTotal,
    });
  }

  // Bonus Kinerja
  if (payroll.bonus && payroll.bonus > 0) {
    payrollItems.push({
      name: 'Bonus Prestasi & Apresiasi',
      category: 'Bonus / THR',
      type: 'income',
      notes: payroll.bonusNotes || 'Bonus apresiasi kedisiplinan dan target outlet',
      amount: payroll.bonus,
    });
  }

  // Potongan Kasbon
  if (payroll.kasbonDeduction > 0) {
    payrollItems.push({
      name: 'Potongan Kasbon / Pinjaman',
      category: 'Potongan Gaji',
      type: 'deduction',
      notes: 'Pembayaran cicilan pinjaman kasbon karyawan',
      amount: payroll.kasbonDeduction,
    });
  }

  // Potongan Izin / Alpha
  if (payroll.absenceDeduction && payroll.absenceDeduction > 0) {
    payrollItems.push({
      name: 'Potongan Izin / Ketidakhadiran',
      category: 'Potongan Gaji',
      type: 'deduction',
      notes: 'Pemotongan atas ketidakhadiran atau izin kerja',
      amount: payroll.absenceDeduction,
    });
  }

  // Potongan Lainnya
  if (payroll.otherDeduction && payroll.otherDeduction > 0) {
    payrollItems.push({
      name: 'Potongan Operasional Lain',
      category: 'Potongan Gaji',
      type: 'deduction',
      notes: payroll.otherDeductionNotes || 'Potongan penggantian atau biaya operasional lain',
      amount: payroll.otherDeduction,
    });
  }

  const getContainerWidthClass = () => {
    switch (paperSize) {
      case 'thermal-58':
        return 'max-w-[340px] paper-thermal-58';
      case 'thermal-80':
        return 'max-w-[420px] paper-thermal-80';
      case 'faktur-a4':
        return 'max-w-3xl paper-faktur-a4';
    }
  };

  return (
    <div
      id="payroll-slip-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="payroll-slip-modal-content"
        className={`bg-slate-900 rounded-3xl w-full shadow-2xl overflow-hidden flex flex-col my-4 sm:my-auto border border-slate-700 transition-all ${
          paperSize === 'faktur-a4' ? 'max-w-3xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Actions */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-xs uppercase tracking-wider text-amber-400 leading-tight">
                  Faktur Slip Gaji Karyawan
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300">
                  {paperSize === 'thermal-58' ? '58mm' : paperSize === 'thermal-80' ? '80mm' : 'A4'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {payroll.id} &bull; {payroll.userName} &bull; {payroll.period}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Slip"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Format Selector Toolbar */}
        <div className="bg-slate-800/90 px-4 sm:px-5 py-2.5 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-300 text-[11px]">Format Cetak:</span>
            <div className="inline-flex rounded-xl bg-slate-950/80 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setPaperSize('thermal-58')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  paperSize === 'thermal-58'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Ukuran Faktur Slip Gaji Thermal 58mm Kasir Mini Market"
              >
                Faktur Slip 58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('thermal-80')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  paperSize === 'thermal-80'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Ukuran Slip POS Lebar 80mm"
              >
                Slip 80mm (POS)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('faktur-a4')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  paperSize === 'faktur-a4'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Format Dokumen Faktur Resmi A4"
              >
                Faktur A4 (Dokumen)
              </button>
            </div>
          </div>

          <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
            {paperSize === 'thermal-58'
              ? 'Ukuran Thermal 58mm Sesuai Transaksi'
              : paperSize === 'thermal-80'
              ? 'Ukuran Thermal Desktop POS 80mm'
              : 'Format Lembar Dokumen A4'}
          </span>
        </div>

        {/* Bluetooth Status Notification */}
        {bluetoothStatus && (
          <div className="bg-sky-950/90 border-b border-sky-800 text-sky-200 px-4 py-1.5 text-xs flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Bluetooth className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>{bluetoothStatus}</span>
            </span>
            <button
              onClick={() => setBluetoothStatus('')}
              className="text-sky-400 hover:text-white text-xs cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Scrollable Document Preview Area */}
        <div className="p-4 sm:p-6 bg-slate-950 flex items-center justify-center overflow-y-auto max-h-[65vh]">
          {/* Slip Gaji Content Container */}
          <div
            id="payroll-slip-printable"
            className={`w-full bg-white text-slate-900 shadow-2xl relative transition-all ${getContainerWidthClass()}`}
          >
            {paperSize === 'faktur-a4' ? (
              /* ===== FAKTUR SLIP GAJI RESMI A4 ===== */
              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 font-sans text-xs">
                {/* 1. Kop Surat Dokumen Resmi */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🧺</span>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                          {settings.shopName}
                        </h2>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Sistem Kasir & Operasional Laundry Modern
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 max-w-sm mt-1">{settings.shopAddress}</p>
                    <p className="text-xs text-slate-700 font-mono font-bold">
                      WhatsApp / Telp: {settings.shopPhone}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="inline-block px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-black tracking-widest uppercase">
                      FAKTUR SLIP GAJI
                    </span>
                    <p className="text-sm font-mono font-black text-slate-900 mt-1">{payroll.id}</p>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Periode: <strong className="text-slate-800">{payroll.period}</strong>
                    </p>
                    <p className="text-[11px] text-indigo-700 font-semibold">
                      Tgl Pembayaran: {formatDateIndo(payroll.paymentDate)}
                    </p>
                  </div>
                </div>

                {/* 2. Info Karyawan & Status Pencairan */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Informasi Karyawan
                    </span>
                    <p className="font-extrabold text-sm text-slate-900 mt-0.5">{payroll.userName}</p>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      Telp / WA: {payroll.userPhone || '-'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-600 font-medium">Posisi / Stasiun:</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-sky-100 text-sky-800 border border-sky-200">
                        {payroll.userStation ? `Stasiun ${payroll.userStation}` : payroll.userRole}
                      </span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Metode & Rekening Pencairan
                      </span>
                      <p className="font-bold text-indigo-700 text-xs mt-0.5 uppercase">
                        Pembayaran: {payroll.paymentMethod}
                      </p>
                      {payroll.bankName && (
                        <p className="text-[11px] font-mono text-slate-700 mt-0.5">
                          {payroll.bankName} - {payroll.bankAccount || ''}
                        </p>
                      )}
                      {payroll.notes && (
                        <p className="text-[11px] italic text-slate-600 mt-0.5 max-w-xs ml-auto">
                          Catatan: "{payroll.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Tabel Rincian Komponen Gaji */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3">Komponen Gaji & Insentif</th>
                        <th className="py-2.5 px-3">Kategori & Keterangan</th>
                        <th className="py-2.5 px-3 text-center">Tipe</th>
                        <th className="py-2.5 px-3 text-right">Jumlah (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {payrollItems.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            <span className="font-semibold text-slate-800">{item.category}</span>
                            {item.notes && <span className="text-slate-500"> &bull; {item.notes}</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.type === 'income'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {item.type === 'income' ? '+ Pendapatan' : '- Potongan'}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold ${
                              item.type === 'income' ? 'text-slate-900' : 'text-rose-600'
                            }`}
                          >
                            {item.type === 'income' ? formatRupiah(item.amount) : `-${formatRupiah(item.amount)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 4. Ringkasan & Total Take Home Pay */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Status Pencairan:</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            payroll.status === 'lunas'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {payroll.status === 'lunas' ? 'LUNAS / DIBAYARKAN' : 'MENUNGGU PENCAIRAN'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Metode Bayar:</span>
                        <span className="font-bold uppercase text-slate-800">{payroll.paymentMethod}</span>
                      </div>
                      {payroll.paidAt && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Waktu Cair:</span>
                          <span className="font-mono text-slate-700">{formatDateIndo(payroll.paidAt).slice(0, 16)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-500 space-y-0.5 border-l-2 border-slate-300 pl-2">
                      <p className="font-bold text-slate-700">Ketentuan & Kebijakan Penggajian:</p>
                      <p>&bull; Slip gaji ini diterbitkan resmi sebagai bukti tanda terima gaji karyawan.</p>
                      <p>&bull; Konfirmasi atau pertanyaan terkait rincian gaji dapat disampaikan ke Manajemen.</p>
                      <p>&bull; Harap jaga kerahasiaan informasi penggajian masing-masing staf.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gaji Pokok & Tunjangan Tetap</span>
                      <span className="font-mono">{formatRupiah(payroll.baseSalary + payroll.allowance)}</span>
                    </div>
                    {(payroll.overtimePay || 0) + (payroll.commissionTotal || 0) + (payroll.bonus || 0) > 0 && (
                      <div className="flex justify-between text-indigo-700 font-semibold">
                        <span>Lembur, Komisi & Bonus</span>
                        <span className="font-mono">
                          +{formatRupiah((payroll.overtimePay || 0) + (payroll.commissionTotal || 0) + (payroll.bonus || 0))}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1">
                      <span>Total Pendapatan Bruto</span>
                      <span className="font-mono">{formatRupiah(payroll.totalIncome)}</span>
                    </div>
                    {payroll.totalDeduction > 0 && (
                      <div className="flex justify-between text-rose-600 font-semibold">
                        <span>Total Potongan Gaji</span>
                        <span className="font-mono">-{formatRupiah(payroll.totalDeduction)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t-2 border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                      <span className="uppercase text-xs sm:text-sm">GAJI BERSIH (TAKE HOME PAY)</span>
                      <span className="text-base sm:text-lg text-emerald-700 font-mono font-black">
                        {formatRupiah(payroll.netSalary)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Area Tanda Tangan */}
                <div className="pt-4 border-t border-slate-300 grid grid-cols-2 text-center text-xs gap-6 mt-4">
                  <div className="space-y-12">
                    <p className="text-slate-600 font-medium">Karyawan Penerima,</p>
                    <div>
                      <p className="font-bold text-slate-900 underline">{payroll.userName}</p>
                      <p className="text-[10px] text-slate-500">
                        Staf {payroll.userStation ? `Stasiun ${payroll.userStation}` : payroll.userRole}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="text-slate-600 font-medium">Owner & Pimpinan,</p>
                    <div>
                      <p className="font-bold text-slate-900 underline">
                        {ownerAdminName}
                      </p>
                      <p className="text-[10px] text-slate-500">Pimpinan & Manajemen {settings.shopName}</p>
                    </div>
                  </div>
                </div>

                {/* 6. Footer Dokumen */}
                <div className="text-center pt-2 text-[10px] text-slate-400 italic">
                  "Terima kasih atas kerja keras, kejujuran, dan dedikasi Anda bersama {settings.shopName}." &bull; Dokumen resmi & sah diterbitkan oleh sistem payroll.
                </div>
              </div>
            ) : (
              /* ===== FAKTUR SLIP GAJI 58mm / 80mm (AUTHENTIC THERMAL ROLL KASIR) ===== */
              <div className="p-4 sm:p-5 font-mono text-slate-900 select-text">
                {/* 1. Header Toko & Judul Faktur Slip Gaji */}
                <div className="text-center space-y-0.5 pb-1">
                  <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-black">
                    {settings.shopName}
                  </h2>
                  <p className="text-[10px] font-black tracking-tight text-black uppercase">
                    FAKTUR SLIP GAJI KARYAWAN
                  </p>
                  <p className="text-[9.5px] leading-tight text-slate-700 max-w-[280px] mx-auto">
                    {settings.shopAddress}
                  </p>
                  <p className="text-[10px] font-bold text-slate-900">
                    TELP/WA: {settings.shopPhone}
                  </p>
                </div>

                {/* Double Dash Line Header */}
                <div className="text-center font-bold text-slate-800 text-[10px] select-none py-0.5 leading-none overflow-hidden">
                  ================================
                </div>

                {/* 2. Informasi Transaksi Penggajian */}
                <div className="text-[10px] space-y-0.5 py-1 text-slate-800">
                  <div className="flex justify-between">
                    <span>NO. SLIP</span>
                    <span className="font-bold text-black">{payroll.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PERIODE</span>
                    <span className="font-bold text-black">{payroll.period}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TGL BAYAR</span>
                    <span>{formatDateIndo(payroll.paymentDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>KARYAWAN</span>
                    <span className="font-bold uppercase text-black truncate max-w-[160px]">
                      {payroll.userName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>POSISI</span>
                    <span className="uppercase font-semibold">
                      {(payroll.userStation ? `Stasiun ${payroll.userStation}` : payroll.userRole).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>NO. HP</span>
                    <span>{payroll.userPhone || '-'}</span>
                  </div>
                </div>

                {/* Dashed Separator */}
                <div className="text-center font-bold text-slate-600 text-[10px] select-none py-0.5 leading-none overflow-hidden">
                  --------------------------------
                </div>

                {/* Header Kolom Slip Kasir */}
                <div className="flex justify-between text-[9.5px] font-black uppercase text-slate-700 py-0.5 border-b border-dashed border-slate-300">
                  <span>KOMPONEN GAJI</span>
                  <span>JUMLAH (RP)</span>
                </div>

                {/* 3. Daftar Komponen Pendapatan Bruto */}
                <div className="py-1 text-[10.5px] space-y-1">
                  <div className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                    [ RINCIAN PENERIMAAN ]
                  </div>
                  <div className="flex justify-between text-slate-800">
                    <span>Gaji Pokok</span>
                    <span className="font-bold text-black">{formatRupiah(payroll.baseSalary)}</span>
                  </div>
                  {payroll.allowance > 0 && (
                    <div className="flex justify-between text-slate-800">
                      <span>Tunjangan Operasional</span>
                      <span>{formatRupiah(payroll.allowance)}</span>
                    </div>
                  )}
                  {payroll.overtimePay && payroll.overtimePay > 0 && (
                    <div className="flex justify-between text-slate-800">
                      <span>Lembur ({payroll.overtimeHours || 0} Jam)</span>
                      <span>{formatRupiah(payroll.overtimePay)}</span>
                    </div>
                  )}
                  {payroll.commissionTotal && payroll.commissionTotal > 0 && (
                    <div className="flex justify-between text-slate-800">
                      <span>Insentif/Komisi Cucian</span>
                      <span>{formatRupiah(payroll.commissionTotal)}</span>
                    </div>
                  )}
                  {payroll.bonus && payroll.bonus > 0 && (
                    <div className="flex justify-between text-slate-800">
                      <span>Bonus Prestasi / THR</span>
                      <span>{formatRupiah(payroll.bonus)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 border-t border-dashed border-slate-200 pt-0.5">
                    <span>TOTAL BRUTO</span>
                    <span>{formatRupiah(payroll.totalIncome)}</span>
                  </div>
                </div>

                {/* 4. Daftar Komponen Potongan (jika ada) */}
                {payroll.totalDeduction > 0 && (
                  <div className="border-t border-dashed border-slate-300 pt-1 mt-1 text-[10.5px] space-y-1">
                    <div className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                      [ RINCIAN POTONGAN ]
                    </div>
                    {payroll.kasbonDeduction > 0 && (
                      <div className="flex justify-between text-slate-800">
                        <span>Potongan Kasbon</span>
                        <span>-{formatRupiah(payroll.kasbonDeduction)}</span>
                      </div>
                    )}
                    {payroll.absenceDeduction && payroll.absenceDeduction > 0 && (
                      <div className="flex justify-between text-slate-800">
                        <span>Potongan Izin / Alpha</span>
                        <span>-{formatRupiah(payroll.absenceDeduction)}</span>
                      </div>
                    )}
                    {payroll.otherDeduction && payroll.otherDeduction > 0 && (
                      <div className="flex justify-between text-slate-800">
                        <span>Potongan Operasional Lain</span>
                        <span>-{formatRupiah(payroll.otherDeduction)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-900 border-t border-dashed border-slate-200 pt-0.5">
                      <span>TOTAL POTONGAN</span>
                      <span>-{formatRupiah(payroll.totalDeduction)}</span>
                    </div>
                  </div>
                )}

                {/* Double Dash Line Divider */}
                <div className="text-center font-bold text-slate-800 text-[10px] select-none py-0.5 leading-none overflow-hidden my-1">
                  ================================
                </div>

                {/* 5. Gaji Bersih Diterima (Take Home Pay) */}
                <div className="text-[10.5px] space-y-0.5 py-0.5 text-slate-800">
                  <div className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                    GAJI BERSIH (TAKE HOME PAY)
                  </div>
                  <div className="flex justify-between items-center text-sm sm:text-base font-black text-black pt-0.5 pb-1">
                    <span>TOTAL DITERIMA</span>
                    <span>{formatRupiah(payroll.netSalary)}</span>
                  </div>

                  {/* Dashed Separator */}
                  <div className="text-center text-slate-400 text-[10px] select-none leading-none py-0.5">
                    --------------------------------
                  </div>

                  <div className="flex justify-between text-[10px] pt-0.5">
                    <span>METODE BAYAR</span>
                    <span className="font-bold uppercase">{payroll.paymentMethod}</span>
                  </div>
                  {payroll.bankName && (
                    <div className="flex justify-between text-[10px]">
                      <span>REKENING</span>
                      <span className="font-mono text-black font-semibold">
                        {payroll.bankName} - {payroll.bankAccount || ''}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>STATUS</span>
                    <span
                      className={`font-black uppercase ${
                        payroll.status === 'lunas' ? 'text-black' : 'text-slate-800'
                      }`}
                    >
                      {payroll.status === 'lunas' ? 'LUNAS / TELAH DIBAYAR' : 'MENUNGGU PENCAIRAN'}
                    </span>
                  </div>
                  {payroll.paidAt && (
                    <div className="flex justify-between text-[9.5px] text-slate-600">
                      <span>WAKTU CAIR</span>
                      <span>{formatDateIndo(payroll.paidAt).slice(0, 16)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[9.5px] text-slate-700 pt-0.5">
                    <span>OTORISASI</span>
                    <span className="font-bold text-black uppercase">{ownerAdminShort}</span>
                  </div>
                  {payroll.notes && (
                    <div className="text-[9px] italic text-slate-600 pt-0.5 leading-tight">
                      Ket: "{payroll.notes}"
                    </div>
                  )}
                </div>

                {/* 6. Simulasi Barcode Struk Kasir */}
                <div className="py-2 text-center border-t border-dashed border-slate-300 mt-1">
                  <div className="flex justify-center items-center gap-[1.5px] h-7 my-1 px-4 overflow-hidden">
                    {barcodeBars.map((b, i) => (
                      <div
                        key={i}
                        className="bg-black h-full shrink-0"
                        style={{ width: `${b}px` }}
                      />
                    ))}
                  </div>
                  <div className="text-[9px] font-mono font-bold tracking-[3px] text-center text-slate-800">
                    *{payroll.id}*
                  </div>
                </div>

                {/* 7. Footer Penutup Khas Faktur Slip Kasir */}
                <div className="text-center text-[9.5px] space-y-0.5 pt-1 text-slate-700 leading-tight">
                  <p className="font-black text-black uppercase">
                    *** DOKUMEN SLIP RESMI & SAH ***
                  </p>
                  <p className="italic">
                    "Terima kasih atas kerja keras, kejujuran, dan dedikasi Anda!"
                  </p>
                  <p className="text-[8.5px] text-slate-600 pt-0.5">
                    Harap simpan bukti slip gaji ini dengan baik.
                  </p>
                  <p className="text-[9px] font-bold text-black pt-0.5">
                    Pimpinan & Manajemen {settings.shopName}
                  </p>
                </div>

                {/* Bottom Cut Line */}
                <div className="text-center font-bold text-slate-800 text-[10px] select-none pt-1 leading-none overflow-hidden">
                  ================================
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {payroll.status === 'pending' && onMarkPaid ? (
            <button
              id="mark-paid-payroll-btn"
              type="button"
              onClick={() => onMarkPaid(payroll.id)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tandai Lunas</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2 justify-end">
            {/* Direct Bluetooth Print (for Android/Chrome Bluetooth POS printers) */}
            {isWebBluetoothSupported() && (
              <button
                type="button"
                onClick={handleBluetoothPrint}
                disabled={isPrintingBluetooth}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                title="Cetak langsung ke Thermal Printer Bluetooth"
              >
                <Bluetooth className={`w-3.5 h-3.5 ${isPrintingBluetooth ? 'animate-spin' : ''}`} />
                <span>Bluetooth</span>
              </button>
            )}

            {/* Copy Slip Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shadow-xs"
              title="Salin Rincian Slip ke Clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>

            {/* Send WhatsApp */}
            {payroll.userPhone && (
              <button
                id="wa-payroll-slip-btn"
                type="button"
                onClick={handleSendWhatsApp}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs cursor-pointer"
                title="Kirim ke WhatsApp Karyawan"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}

            {/* PRIMARY ACTION: CETAK FAKTUR SLIP GAJI */}
            <button
              id="print-payroll-slip-btn"
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-black rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 transition-all shadow-md shadow-amber-400/20 cursor-pointer"
              title={`Cetak ${paperSize === 'thermal-58' ? 'Faktur Slip Gaji (58mm)' : paperSize === 'thermal-80' ? 'Slip POS (80mm)' : 'Faktur A4'}`}
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>
                Cetak Faktur Slip {paperSize === 'thermal-58' ? '(58mm)' : paperSize === 'thermal-80' ? '(80mm)' : '(A4)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
