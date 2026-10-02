import React, { useState, useMemo } from 'react';
import {
  LaundryOrder,
  LaundrySettings,
  STAGE_CONFIG,
  formatRupiah,
  formatDateIndo,
} from '../types';
import {
  Receipt,
  Printer,
  Share2,
  X,
  Check,
  Copy,
  Bluetooth,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { generateWhatsAppNotificationUrl } from '../utils/whatsapp';
import {
  PaperSize,
  triggerPrintWithPaperSize,
  printBytesViaBluetooth,
  isWebBluetoothSupported,
  buildOrderEscPosBytes,
} from '../utils/printer';

interface ReceiptModalProps {
  order: LaundryOrder | null;
  settings: LaundrySettings;
  isOpen: boolean;
  onClose: () => void;
  onTogglePaymentStatus?: (orderId: string) => void;
  adminName?: string;
  cashierName?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  settings,
  isOpen,
  onClose,
  onTogglePaymentStatus,
  adminName,
  cashierName,
}) => {
  if (!isOpen || !order) return null;

  const ownerAdminName = adminName || 'Sams (Owner & Admin)';
  const ownerAdminShort = ownerAdminName.replace(/\s*\([^)]*\)/g, '').trim() || ownerAdminName;
  const cashierDisplayName = cashierName || ownerAdminShort || 'Kasir';

  // Default to 58mm thermal roll (Indomaret/Alfamart Mini Market standard)
  const [paperSize, setPaperSize] = useState<PaperSize>('thermal-58');
  const [copied, setCopied] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<string>('');
  const [isPrintingBluetooth, setIsPrintingBluetooth] = useState(false);

  // Generate authentic mini market barcode stripes based on order id
  const barcodeBars = useMemo(() => {
    const seed = order.id.replace(/\D/g, '') + '849201';
    const bars: number[] = [];
    for (let i = 0; i < 48; i++) {
      const code = seed.charCodeAt(i % seed.length);
      const width = ((code + i * 7) % 3) + 1; // 1px, 2px, or 3px
      bars.push(width);
    }
    return bars;
  }, [order.id]);

  const totalItemCount = useMemo(() => {
    return order.items.reduce((acc, it) => acc + (it.unit === 'kg' ? it.quantity : 1), 0);
  }, [order.items]);

  const handlePrint = () => {
    triggerPrintWithPaperSize(paperSize, 'printable-receipt');
  };

  const handleBluetoothPrint = async () => {
    setIsPrintingBluetooth(true);
    setBluetoothStatus('Mencari printer thermal Bluetooth...');
    try {
      const cols = paperSize === 'thermal-80' ? 48 : 32;
      const bytes = buildOrderEscPosBytes(order, settings, cols);
      const res = await printBytesViaBluetooth(bytes, (msg) => setBluetoothStatus(msg));
      if (res.success) {
        setBluetoothStatus('Struk berhasil dicetak!');
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

  const handleWhatsApp = () => {
    const url = generateWhatsAppNotificationUrl(order, settings);
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const textLines = [
      `*${settings.shopName.toUpperCase()}*`,
      settings.shopAddress,
      `WA: ${settings.shopPhone}`,
      `================================`,
      `No. Nota: ${order.id}`,
      `Pelanggan: ${order.customer.name} (${order.customer.phone})`,
      `Kasir: ${cashierDisplayName}`,
      `Tgl: ${formatDateIndo(order.createdAt).slice(0, 16)}`,
      `--------------------------------`,
      ...order.items.map(
        (it) => `${it.serviceName.toUpperCase()}\n  ${it.quantity} ${it.unit} x ${formatRupiah(it.price)} = ${formatRupiah(it.subtotal || it.price * it.quantity)}`
      ),
      `--------------------------------`,
      `Total Item: ${totalItemCount}`,
      `Subtotal: ${formatRupiah(order.subtotal)}`,
      ...(order.discount > 0 ? [`Diskon: -${formatRupiah(order.discount)}`] : []),
      ...(order.deliveryFee > 0 ? [`Ongkir: +${formatRupiah(order.deliveryFee)}`] : []),
      `TOTAL TAGIHAN: ${formatRupiah(order.total)}`,
      `Metode: ${order.paymentMethod.toUpperCase()}`,
      `Status Bayar: ${order.paymentStatus === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'}`,
      `--------------------------------`,
      `Parfum: ${order.perfume || 'Reguler'}`,
      `Estimasi Selesai: ${formatDateIndo(order.estimatedCompletion).slice(0, 16)}`,
      ...(order.notes ? [`Catatan: ${order.notes}`] : []),
      `================================`,
      `"${settings.footerMessage}"`,
      `Simpan struk ini sbg bukti sah pengambilan cucian.`,
      `Layanan Konsumen WA: ${settings.shopPhone}`,
    ];
    navigator.clipboard.writeText(textLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      id="receipt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="receipt-modal-content"
        className={`bg-slate-900 rounded-3xl shadow-2xl w-full overflow-hidden border border-slate-700 my-4 sm:my-8 flex flex-col transition-all duration-200 ${
          paperSize === 'faktur-a4' ? 'max-w-3xl' : 'max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Receipt className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider uppercase text-amber-400">
                  Faktur Nota Pemesanan (58mm)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300">
                  {paperSize === 'thermal-58' ? '58mm' : paperSize === 'thermal-80' ? '80mm' : 'A4'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                {order.id} &bull; {order.customer.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="close-receipt-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Nota"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
                title="Ukuran Faktur Nota Kasir Standar Mini Market 58mm (Indomaret / Alfamart)"
              >
                Faktur Nota 58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('thermal-80')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  paperSize === 'thermal-80'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Ukuran Struk POS Lebar 80mm"
              >
                Struk 80mm (POS)
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

        {/* Scrollable Receipt Area with Authentic Thermal Roll Backdrop */}
        <div className="p-4 sm:p-6 bg-slate-950 flex items-center justify-center overflow-y-auto max-h-[65vh]">
          {/* Printable Receipt Paper Container */}
          <div
            id="printable-receipt"
            className={`w-full bg-white text-slate-900 shadow-2xl relative transition-all ${getContainerWidthClass()}`}
          >
            {paperSize === 'faktur-a4' ? (
              /* ===== FAKTUR PENJUALAN RESMI A4 ===== */
              <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 font-sans text-xs">
                {/* Kop Faktur */}
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
                      FAKTUR PENJUALAN
                    </span>
                    <p className="text-sm font-mono font-black text-slate-900 mt-1">{order.id}</p>
                    <p className="text-[11px] text-slate-600">Tgl Masuk: {formatDateIndo(order.createdAt).slice(0, 16)}</p>
                    <p className="text-[11px] text-indigo-700 font-semibold">
                      Estimasi Selesai: {formatDateIndo(order.estimatedCompletion).slice(0, 16)}
                    </p>
                  </div>
                </div>

                {/* Info Pelanggan & Catatan */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Informasi Pelanggan
                    </span>
                    <p className="font-extrabold text-sm text-slate-900 mt-0.5">{order.customer.name}</p>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">Telp / WA: {order.customer.phone}</p>
                    {order.customer.address && (
                      <p className="text-[11px] text-slate-500 mt-0.5">Alamat: {order.customer.address}</p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Aroma Parfum & Spesifikasi
                      </span>
                      <p className="font-bold text-indigo-700 text-xs mt-0.5">
                        {order.perfume ? `Aroma Parfum: ${order.perfume}` : 'Aroma Parfum: Reguler'}
                      </p>
                      {order.notes && (
                        <p className="text-[11px] italic text-slate-600 mt-0.5 max-w-xs ml-auto">
                          Catatan: "{order.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabel Rincian Pesanan */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3">Layanan / Item Cucian</th>
                        <th className="py-2.5 px-3 text-center">Qty / Berat</th>
                        <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {order.items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                          <td className="py-2 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {item.serviceName}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            <span className="font-bold text-slate-800">{item.quantity}</span>{' '}
                            <span className="text-slate-500 text-[11px]">{item.unit}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {formatRupiah(item.price)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(item.subtotal || item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Payment Info */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Status Pembayaran:</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            order.paymentStatus === 'lunas'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {order.paymentStatus === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Metode Bayar:</span>
                        <span className="font-bold uppercase text-slate-800">{order.paymentMethod}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 space-y-0.5 border-l-2 border-slate-300 pl-2">
                      <p className="font-bold text-slate-700">Ketentuan & Syarat Layanan:</p>
                      <p>&bull; Pengambilan cucian wajib membawa nomor nota atau menunjukkan faktur ini.</p>
                      <p>&bull; Komplain cucian diterima maksimal 1x24 jam setelah pengambilan barang.</p>
                      <p>&bull; Pakaian luntur/susut karena sifat bahan asli di luar tanggung jawab laundry.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Item</span>
                      <span className="font-mono">{formatRupiah(order.subtotal)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Potongan Diskon</span>
                        <span className="font-mono">-{formatRupiah(order.discount)}</span>
                      </div>
                    )}
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Ongkos Antar / Jemput</span>
                        <span className="font-mono">+{formatRupiah(order.deliveryFee)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t-2 border-slate-300 flex justify-between items-center text-sm font-black text-slate-900">
                      <span>TOTAL TAGIHAN</span>
                      <span className="text-base text-indigo-700 font-mono">{formatRupiah(order.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Area Tanda Tangan */}
                <div className="pt-4 border-t border-slate-300 grid grid-cols-2 text-center text-xs gap-6 mt-4">
                  <div className="space-y-12">
                    <p className="text-slate-600 font-medium">Pelanggan,</p>
                    <div>
                      <p className="font-bold text-slate-900 underline">{order.customer.name}</p>
                      <p className="text-[10px] text-slate-500">Tanda Tangan Pelanggan</p>
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="text-slate-600 font-medium">Owner & Manajemen,</p>
                    <div>
                      <p className="font-bold text-slate-900 underline">{ownerAdminName}</p>
                      <p className="text-[10px] text-slate-500">Authorized Signature & Stempel</p>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2 text-[10px] text-slate-400 italic">
                  "{settings.footerMessage}" &bull; Terima kasih telah mempercayakan pakaian Anda di {settings.shopName}.
                </div>
              </div>
            ) : (
              /* ===== STRUK MINI MARKET (AUTHENTIC THERMAL ROLL KASIR) ===== */
              <div className="p-4 sm:p-5 font-mono text-slate-900 select-text">
                {/* 1. Header Toko & Judul Faktur Nota Pemesanan */}
                <div className="text-center space-y-0.5 pb-1">
                  <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-black">
                    {settings.shopName}
                  </h2>
                  <p className="text-[10px] font-black tracking-tight text-black uppercase">
                    FAKTUR NOTA TRANSAKSI PEMESANAN
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

                {/* 2. Informasi Transaksi & Kasir */}
                <div className="text-[10px] space-y-0.5 py-1 text-slate-800">
                  <div className="flex justify-between">
                    <span>NO. NOTA</span>
                    <span className="font-bold text-black">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TGL/JAM</span>
                    <span>{formatDateIndo(order.createdAt).slice(0, 16)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>KASIR</span>
                    <span className="uppercase font-semibold">{cashierDisplayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PELANGGAN</span>
                    <span className="font-bold uppercase text-black truncate max-w-[160px]">
                      {order.customer.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>NO. HP</span>
                    <span>{order.customer.phone}</span>
                  </div>
                  {order.customer.address && (
                    <div className="flex justify-between text-[9px] text-slate-700">
                      <span>ALAMAT</span>
                      <span className="truncate max-w-[160px]">{order.customer.address}</span>
                    </div>
                  )}
                </div>

                {/* Dashed Separator */}
                <div className="text-center font-bold text-slate-600 text-[10px] select-none py-0.5 leading-none overflow-hidden">
                  --------------------------------
                </div>

                {/* Header Kolom Mini Market */}
                <div className="flex justify-between text-[9.5px] font-black uppercase text-slate-700 py-0.5 border-b border-dashed border-slate-300">
                  <span>ITEM / LAYANAN</span>
                  <span>TOTAL (RP)</span>
                </div>

                {/* 3. Daftar Item / Layanan Cucian (Format 2 Baris Khas Kasir Retail) */}
                <div className="divide-y divide-slate-100 py-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-1 text-[10.5px]">
                      {/* Baris 1: Nama Layanan */}
                      <div className="font-bold text-black uppercase leading-tight">
                        {item.serviceName}
                      </div>
                      {/* Baris 2: Qty x Harga & Subtotal rata kanan */}
                      <div className="flex justify-between text-[10px] text-slate-700 pl-2 pt-0.5">
                        <span>
                          {item.quantity} {item.unit} x {formatRupiah(item.price)}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatRupiah(item.subtotal || item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dashed Separator */}
                <div className="text-center font-bold text-slate-600 text-[10px] select-none py-0.5 leading-none overflow-hidden">
                  --------------------------------
                </div>

                {/* 4. Rincian Perhitungan & Pembayaran */}
                <div className="text-[10.5px] space-y-0.5 py-1 text-slate-800">
                  <div className="flex justify-between text-[10px]">
                    <span>TOTAL ITEM</span>
                    <span className="font-bold">{totalItemCount} Item</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SUBTOTAL</span>
                    <span>{formatRupiah(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-slate-900">
                      <span>DISKON</span>
                      <span>-{formatRupiah(order.discount)}</span>
                    </div>
                  )}
                  {order.deliveryFee > 0 && (
                    <div className="flex justify-between text-slate-900">
                      <span>ONGKOS ANTAR</span>
                      <span>+{formatRupiah(order.deliveryFee)}</span>
                    </div>
                  )}

                  {/* Single Line Divider */}
                  <div className="text-center text-slate-400 text-[10px] select-none leading-none py-0.5">
                    --------------------------------
                  </div>

                  {/* Total Tagihan Besar Tebal */}
                  <div className="flex justify-between text-xs sm:text-sm font-black text-black pt-0.5 pb-0.5">
                    <span>TOTAL AKHIR</span>
                    <span>{formatRupiah(order.total)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] pt-0.5">
                    <span>METODE BAYAR</span>
                    <span className="font-bold uppercase">{order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>STATUS PEMBAYARAN</span>
                    <span
                      className={`font-black uppercase ${
                        order.paymentStatus === 'lunas' ? 'text-black' : 'text-slate-800'
                      }`}
                    >
                      {order.paymentStatus === 'lunas' ? 'LUNAS / DIBAYAR' : 'BELUM LUNAS'}
                    </span>
                  </div>
                </div>

                {/* Dashed Separator */}
                <div className="text-center font-bold text-slate-600 text-[10px] select-none py-0.5 leading-none overflow-hidden">
                  --------------------------------
                </div>

                {/* 5. Spesifikasi Pengerjaan Cucian */}
                <div className="text-[10px] space-y-0.5 py-1 text-slate-800">
                  <div className="flex justify-between">
                    <span>PARFUM</span>
                    <span className="font-bold uppercase">{order.perfume || 'Reguler'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EST. SELESAI</span>
                    <span className="font-bold">{formatDateIndo(order.estimatedCompletion).slice(0, 16)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STATUS CUCIAN</span>
                    <span className="font-bold uppercase">
                      {STAGE_CONFIG[order.stage]?.label || order.stage}
                    </span>
                  </div>
                  {order.notes && (
                    <div className="text-[9px] italic text-slate-700 pt-0.5 leading-tight">
                      Catatan: "{order.notes}"
                    </div>
                  )}
                </div>

                {/* 6. Simulasi Barcode Struk Kasir Mini Market */}
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
                    *{order.id}*
                  </div>
                </div>

                {/* 7. Footer Struk Kasir Khas Mini Market */}
                <div className="text-center text-[9.5px] space-y-0.5 pt-1 text-slate-700 leading-tight">
                  <p className="font-black text-black uppercase">
                    TERIMA KASIH ATAS KUNJUNGAN ANDA
                  </p>
                  <p className="italic">"{settings.footerMessage}"</p>
                  <p className="text-[8.5px] text-slate-600 pt-0.5">
                    Simpan struk ini sbg bukti sah pengambilan pakaian.
                  </p>
                  <p className="text-[8.5px] text-slate-600">
                    Komplain maksimal 1x24 jam setelah cucian diambil.
                  </p>
                  <p className="text-[9px] font-bold text-black pt-1">
                    Layanan Konsumen SMS/WA: {settings.shopPhone}
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
          {onTogglePaymentStatus ? (
            <button
              id="toggle-pay-btn"
              type="button"
              onClick={() => onTogglePaymentStatus(order.id)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer text-left sm:text-center"
            >
              Ubah ke {order.paymentStatus === 'lunas' ? 'Belum Lunas' : 'Lunas'}
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

            {/* Copy Receipt Text */}
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shadow-xs"
              title="Salin Rincian Struk ke Clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>

            {/* WhatsApp Notification */}
            <button
              id="wa-receipt-btn"
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs cursor-pointer"
              title="Kirim Struk via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* PRIMARY ACTION: CETAK FAKTUR NOTA */}
            <button
              id="print-receipt-btn"
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-black rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 transition-all shadow-md shadow-amber-400/20 cursor-pointer"
              title={`Cetak ${paperSize === 'thermal-58' ? 'Faktur Nota (58mm)' : paperSize === 'thermal-80' ? 'Struk POS (80mm)' : 'Faktur A4'}`}
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>
                Cetak Faktur Nota {paperSize === 'thermal-58' ? '(58mm)' : paperSize === 'thermal-80' ? '(80mm)' : '(A4)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
