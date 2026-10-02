import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Store,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Trash2,
  Edit3,
  Sparkles,
  ShoppingBag,
  Flame,
  Shirt,
  Tag,
  Check,
  ChevronDown,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { ExpenseItem, ExpenseCategory, AppUser, formatRupiah, formatDateIndo } from '../types';

interface SupplyPurchaseManagerProps {
  expenses: ExpenseItem[];
  onAddExpense: (expense: Partial<ExpenseItem>) => Promise<boolean>;
  onUpdateExpense: (id: string, expense: Partial<ExpenseItem>) => Promise<boolean>;
  onDeleteExpense: (id: string) => Promise<boolean>;
  currentUser?: AppUser | null;
  shopName?: string;
}

// Preset template for common laundry supplies in Indonesia
interface SupplyPreset {
  name: string;
  category: ExpenseCategory;
  defaultUnit: string;
  defaultPrice: number;
  icon: string;
  badge: string;
}

const COMMON_SUPPLY_PRESETS: SupplyPreset[] = [
  {
    name: 'Deterjen Liquid Konsentrat Matic (Jerigen 20L)',
    category: 'deterjen_pewangi',
    defaultUnit: 'Jerigen 20L',
    defaultPrice: 220000,
    icon: '🧴',
    badge: 'Deterjen',
  },
  {
    name: 'Deterjen Bubuk Oxy Clean (Sak 25 Kg)',
    category: 'deterjen_pewangi',
    defaultUnit: 'Sak 25 Kg',
    defaultPrice: 275000,
    icon: '🫧',
    badge: 'Deterjen',
  },
  {
    name: 'Parfum Laundry Aroma Akasia (Jerigen 5L)',
    category: 'deterjen_pewangi',
    defaultUnit: 'Jerigen 5L',
    defaultPrice: 140000,
    icon: '🌸',
    badge: 'Parfum Top',
  },
  {
    name: 'Parfum Laundry Aroma Sakura Blossom (Jerigen 5L)',
    category: 'deterjen_pewangi',
    defaultUnit: 'Jerigen 5L',
    defaultPrice: 140000,
    icon: '🌺',
    badge: 'Parfum',
  },
  {
    name: 'Softener Pelembut Pakaian Pink (Jerigen 5L)',
    category: 'pelembut_pelicin',
    defaultUnit: 'Jerigen 5L',
    defaultPrice: 75000,
    icon: '✨',
    badge: 'Softener',
  },
  {
    name: 'Pelicin & Pewangi Setrika Trika (Jerigen 5L)',
    category: 'pelembut_pelicin',
    defaultUnit: 'Jerigen 5L',
    defaultPrice: 65000,
    icon: '💨',
    badge: 'Pelicin',
  },
  {
    name: 'Chemical Anti Noda Darah & Karat (Botol 1L)',
    category: 'anti_noda_kimia',
    defaultUnit: 'Botol 1L',
    defaultPrice: 65000,
    icon: '🧪',
    badge: 'Anti Noda',
  },
  {
    name: 'Plastik Jinjing Laundry 35x50 cm (Roll 1 Kg)',
    category: 'plastik_packing',
    defaultUnit: 'Roll 1 Kg',
    defaultPrice: 35000,
    icon: '🛍️',
    badge: 'Plastik',
  },
  {
    name: 'Plastik Jinjing Laundry 40x60 cm (Roll 1 Kg)',
    category: 'plastik_packing',
    defaultUnit: 'Roll 1 Kg',
    defaultPrice: 38000,
    icon: '🛍️',
    badge: 'Plastik',
  },
  {
    name: 'Plastik Klip Khusus Bed Cover 50x75 cm (Pack 50 Pcs)',
    category: 'plastik_packing',
    defaultUnit: 'Pack 50 Pcs',
    defaultPrice: 48000,
    icon: '📦',
    badge: 'Bed Cover',
  },
  {
    name: 'Hanger Kawat Putih Anti Karat (Pack 10 Lusin)',
    category: 'hanger_label',
    defaultUnit: 'Pack (120 Pcs)',
    defaultPrice: 110000,
    icon: '👔',
    badge: 'Hanger',
  },
  {
    name: 'Pita Tag Label & Tag Pin Penanda (1 Box)',
    category: 'hanger_label',
    defaultUnit: 'Box',
    defaultPrice: 45000,
    icon: '🏷️',
    badge: 'Label Tag',
  },
  {
    name: 'Refill Tabung Gas LPG 12kg Dryer Pengering',
    category: 'listrik_air_gas',
    defaultUnit: 'Tabung 12kg',
    defaultPrice: 160000,
    icon: '⛽',
    badge: 'Gas Dryer',
  },
  {
    name: 'Refill Tabung Gas LPG 3kg Melon',
    category: 'listrik_air_gas',
    defaultUnit: 'Tabung 3kg',
    defaultPrice: 22000,
    icon: '🟢',
    badge: 'Gas 3kg',
  },
];

const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  deterjen_pewangi: {
    label: 'Deterjen & Pewangi',
    icon: '🧴',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  pelembut_pelicin: {
    label: 'Softener & Pelicin Setrika',
    icon: '🌸',
    color: 'text-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
  },
  anti_noda_kimia: {
    label: 'Anti Noda & Kimia Laundry',
    icon: '🧪',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  plastik_packing: {
    label: 'Plastik Packing & Kemasan',
    icon: '🛍️',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  hanger_label: {
    label: 'Hanger & Tag Label',
    icon: '🏷️',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  listrik_air_gas: {
    label: 'Gas LPG & Energi Dryer',
    icon: '⛽',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  perawatan_mesin: {
    label: 'Perawatan / Suku Cadang Mesin',
    icon: '⚙️',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  operasional: {
    label: 'Operasional Outlet',
    icon: '🏢',
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
  gaji_bonus: {
    label: 'Gaji & Bonus',
    icon: '💵',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  lainnya: {
    label: 'Perlengkapan Lainnya',
    icon: '📦',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
};

const UNIT_OPTIONS = [
  'Liter',
  'Jerigen 5L',
  'Jerigen 20L',
  'Kg',
  'Sak (25 Kg)',
  'Roll',
  'Pack',
  'Box',
  'Lusin',
  'Pcs',
  'Tabung 12kg',
  'Tabung 3kg',
  'Botol',
];

export const SupplyPurchaseManager: React.FC<SupplyPurchaseManagerProps> = ({
  expenses = [],
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  currentUser,
  shopName = 'D laundry',
}) => {
  // Navigation / View state
  const [activeView, setActiveView] = useState<'form' | 'history'>('form');

  // Form inputs state
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('deterjen_pewangi');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unit, setUnit] = useState('Jerigen 5L');
  const [unitPrice, setUnitPrice] = useState<number | string>('');
  const [totalCost, setTotalCost] = useState<number | string>('');
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'transfer' | 'qris' | 'tempo'>('tunai');
  const [paymentStatus, setPaymentStatus] = useState<'lunas' | 'tempo'>('lunas');
  const [recordedBy, setRecordedBy] = useState(currentUser?.name || 'Admin Budi');
  const [notes, setNotes] = useState('');

  // Processing & Feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History filtering & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Recalculate total cost when qty or unit price changes
  const handleQtyChange = (val: string) => {
    setQuantity(val);
    const numQty = parseFloat(val);
    const numPrice = typeof unitPrice === 'number' ? unitPrice : parseFloat(unitPrice);
    if (!isNaN(numQty) && !isNaN(numPrice) && numQty > 0) {
      setTotalCost(Math.round(numQty * numPrice));
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const numPrice = parseFloat(val);
    const numQty = typeof quantity === 'number' ? quantity : parseFloat(quantity);
    if (!isNaN(numQty) && !isNaN(numPrice) && numQty > 0) {
      setTotalCost(Math.round(numQty * numPrice));
    }
  };

  // Quick fill from preset
  const handleApplyPreset = (preset: SupplyPreset) => {
    setItemName(preset.name);
    setCategory(preset.category);
    setUnit(preset.defaultUnit);
    setQuantity(1);
    setUnitPrice(preset.defaultPrice);
    setTotalCost(preset.defaultPrice);
  };

  // Form Submit Handler
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nameToSave = itemName.trim();
    const finalAmount =
      typeof totalCost === 'number'
        ? totalCost
        : parseFloat(totalCost) ||
          (parseFloat(String(quantity)) * parseFloat(String(unitPrice)));

    if (!nameToSave) {
      setErrorMessage('Nama bahan / barang laundry wajib diisi.');
      return;
    }

    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMessage('Nominal total biaya pembelian harus lebih dari Rp 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const expensePayload: Partial<ExpenseItem> = {
        title: `Pembelian ${nameToSave}`,
        itemName: nameToSave,
        category,
        amount: finalAmount,
        quantity: quantity ? parseFloat(String(quantity)) : 1,
        unit,
        unitPrice: unitPrice ? parseFloat(String(unitPrice)) : finalAmount,
        supplier: supplier.trim() || undefined,
        date: purchaseDate,
        paymentMethod,
        paymentStatus,
        recordedBy: recordedBy.trim() || currentUser?.name || 'Staff Outlet',
        notes: notes.trim() || undefined,
      };

      const success = await onAddExpense(expensePayload);
      if (success) {
        setSuccessToast(`Pembelian ${nameToSave} (${formatRupiah(finalAmount)}) berhasil dicatat!`);
        // Reset form
        setItemName('');
        setQuantity(1);
        setUnitPrice('');
        setTotalCost('');
        setSupplier('');
        setNotes('');
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        setErrorMessage('Gagal menyimpan ke server database. Silakan coba lagi.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan pembelian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered expenses list
  const supplyExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Check category
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      // Check status
      if (filterStatus !== 'all' && (e.paymentStatus || 'lunas') !== filterStatus) return false;
      // Check query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (e.title || '').toLowerCase().includes(q);
        const matchItem = (e.itemName || '').toLowerCase().includes(q);
        const matchSupplier = (e.supplier || '').toLowerCase().includes(q);
        const matchNotes = (e.notes || '').toLowerCase().includes(q);
        const matchRecorder = (e.recordedBy || '').toLowerCase().includes(q);
        if (!matchTitle && !matchItem && !matchSupplier && !matchNotes && !matchRecorder) {
          return false;
        }
      }
      return true;
    });
  }, [expenses, filterCategory, filterStatus, searchQuery]);

  // Statistics
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthPurchases = expenses.filter((e) => e.date && e.date.startsWith(currentMonth));
  const totalBulanIni = currentMonthPurchases.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalLunasBulanIni = currentMonthPurchases
    .filter((e) => (e.paymentStatus || 'lunas') === 'lunas')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalTempoBulanIni = currentMonthPurchases
    .filter((e) => e.paymentStatus === 'tempo')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Toggle Tempo to Lunas
  const handleToggleStatus = async (item: ExpenseItem) => {
    const nextStatus = item.paymentStatus === 'tempo' ? 'lunas' : 'tempo';
    await onUpdateExpense(item.id, { paymentStatus: nextStatus });
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Tanggal',
      'Nama Bahan',
      'Kategori',
      'Jumlah',
      'Satuan',
      'Harga Satuan (Rp)',
      'Total Biaya (Rp)',
      'Supplier / Toko',
      'Metode Bayar',
      'Status Bayar',
      'Petugas',
      'Catatan',
    ];

    const rows = supplyExpenses.map((e) => [
      `"${e.id}"`,
      `"${e.date}"`,
      `"${e.itemName || e.title}"`,
      `"${CATEGORY_META[e.category]?.label || e.category}"`,
      e.quantity || 1,
      `"${e.unit || '-'}"`,
      e.unitPrice || e.amount,
      e.amount,
      `"${e.supplier || '-'}"`,
      `"${e.paymentMethod || 'tunai'}"`,
      `"${e.paymentStatus || 'lunas'}"`,
      `"${e.recordedBy || '-'}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Pembelian-Bahan-Laundry-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header & Navigation Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Package className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Pembelian Bahan-Bahan Laundry
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan belanja deterjen, parfum, softener, anti noda, plastik packing, gas LPG, dan inventori outlet {shopName}.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveView('form')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'form'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Form Pembelian Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeView === 'history'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Riwayat & Rekap ({expenses.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Bulan Ini */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Belanja Bahan Bulan Ini</span>
            <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-2 tracking-tight">
            {formatRupiah(totalBulanIni)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {currentMonthPurchases.length} nota transaksi tercatat pada bulan ini
          </p>
        </div>

        {/* Card 2: Lunas Terbayar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Kas Keluar (Lunas)</span>
            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 mt-2 tracking-tight">
            {formatRupiah(totalLunasBulanIni)}
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-1 font-medium">
            Telah dibayar tunai / transfer ke supplier
          </p>
        </div>

        {/* Card 3: Tempo / Hutang Supplier */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Hutang Bahan (Tempo)</span>
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono mt-2 tracking-tight ${
            totalTempoBulanIni > 0 ? 'text-amber-600' : 'text-slate-700'
          }`}>
            {formatRupiah(totalTempoBulanIni)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalTempoBulanIni > 0
              ? 'Tagihan supplier yang perlu dilunasi'
              : 'Semua tagihan bahan telah lunas!'}
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('history')}
            className="underline hover:text-emerald-950 font-bold ml-2 cursor-pointer"
          >
            Lihat Riwayat &rarr;
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3. TAB 1: FORM PEMBELIAN BAHAN */}
      {activeView === 'form' && (
        <div className="space-y-6">
          {/* Quick Presets Section */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Pilih Cepat Bahan Laundry Populer (1-Klik Isi Form)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Klik salah satu untuk mengisi form otomatis
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {COMMON_SUPPLY_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-3 text-left rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200 group-hover:text-indigo-700">
                      {preset.badge}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs line-clamp-2 group-hover:text-indigo-900 leading-snug">
                      {preset.name}
                    </h4>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500 font-mono">{preset.defaultUnit}</span>
                      <span className="font-bold font-mono text-indigo-700">
                        {formatRupiah(preset.defaultPrice)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Purchase Form */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-xs">
            <div className="pb-4 mb-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  Formulir Pembelian Bahan & Perlengkapan Laundry
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isi rincian barang, jumlah, harga per satuan, dan toko supplier pembelian.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitPurchase} className="space-y-5">
              {/* Row 1: Nama Bahan & Kategori */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Bahan / Barang Laundry <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Deterjen Liquid Jerigen 20L, Parfum Akasia 5L..."
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kategori Bahan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="deterjen_pewangi">🧴 Deterjen & Pewangi Laundry</option>
                    <option value="pelembut_pelicin">🌸 Softener & Pelicin Setrika</option>
                    <option value="anti_noda_kimia">🧪 Pemutih & Kimia Anti Noda</option>
                    <option value="plastik_packing">🛍️ Plastik Packing & Lakban</option>
                    <option value="hanger_label">🏷️ Hanger & Pita Tag Label</option>
                    <option value="listrik_air_gas">⛽ Gas LPG Tabung Mesin Dryer</option>
                    <option value="perawatan_mesin">⚙️ Perawatan / Suku Cadang Mesin</option>
                    <option value="operasional">🏢 Operasional Toko Umum</option>
                    <option value="lainnya">📦 Perlengkapan Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Qty, Satuan, Harga Satuan, Total Biaya */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Jumlah (Qty) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={quantity}
                    onChange={(e) => handleQtyChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Satuan Barang
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Harga Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 140000"
                    value={unitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-indigo-700 mb-1">
                    Total Biaya (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    className="w-full px-3 py-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs font-mono font-black text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {totalCost ? (
                    <span className="text-[10px] text-indigo-600 font-bold mt-1 block">
                      = {formatRupiah(Number(totalCost) || 0)}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Row 3: Supplier, Tanggal, Metode Pembayaran, Status Pembayaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Toko / Supplier
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: CV Kimia Bersih, Toko Plastik..."
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tanggal Pembelian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Metode Bayar
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="tunai">💵 Tunai (Kas Outlet)</option>
                    <option value="transfer">🏦 Transfer Bank</option>
                    <option value="qris">📱 QRIS / E-Wallet</option>
                    <option value="tempo">⏳ Tempo / Tagihan Belakangan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Status Pembayaran
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      paymentStatus === 'lunas'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <option value="lunas">✅ LUNAS</option>
                    <option value="tempo">⏳ TEMPO (Hutang)</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Petugas & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Petugas yang Membeli / Mencatat
                  </label>
                  <input
                    type="text"
                    value={recordedBy}
                    onChange={(e) => setRecordedBy(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Catatan Tambahan / No. Faktur Toko
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: No. Nota INV-9921, Pembelian grosir dapat bonus..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Data pembelian akan otomatis terhubung ke laporan laba rugi bulanan.
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Pembelian...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Pembelian Bahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. TAB 2: RIWAYAT & DAFTAR PEMBELIAN BAHAN */}
      {activeView === 'history' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama bahan, supplier, atau nomor nota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Kategori</option>
                <option value="deterjen_pewangi">Deterjen & Pewangi</option>
                <option value="pelembut_pelicin">Softener & Pelicin</option>
                <option value="anti_noda_kimia">Anti Noda</option>
                <option value="plastik_packing">Plastik Packing</option>
                <option value="hanger_label">Hanger & Label</option>
                <option value="listrik_air_gas">Gas LPG</option>
                <option value="perawatan_mesin">Perawatan Mesin</option>
                <option value="operasional">Operasional</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Status</option>
                <option value="lunas">Lunas</option>
                <option value="tempo">Tempo (Hutang)</option>
              </select>

              {/* Export CSV */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Unduh Data Riwayat Pembelian CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh CSV</span>
              </button>

              {/* Add New Button shortcut */}
              <button
                type="button"
                onClick={() => setActiveView('form')}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baru</span>
              </button>
            </div>
          </div>

          {/* Table of Purchases */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-3.5">Tanggal</th>
                  <th className="py-3 px-3.5">Nama Bahan / Barang</th>
                  <th className="py-3 px-3.5">Kategori</th>
                  <th className="py-3 px-3.5 text-right">Jumlah</th>
                  <th className="py-3 px-3.5 text-right">Harga Satuan</th>
                  <th className="py-3 px-3.5 text-right">Total Biaya</th>
                  <th className="py-3 px-3.5">Supplier / Toko</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supplyExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold">Belum ada data pembelian bahan yang sesuai.</p>
                      <button
                        type="button"
                        onClick={() => setActiveView('form')}
                        className="mt-2 text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        + Catat Pembelian Pertama
                      </button>
                    </td>
                  </tr>
                ) : (
                  supplyExpenses.map((item) => {
                    const meta = CATEGORY_META[item.category] || CATEGORY_META.lainnya;
                    const isTempo = item.paymentStatus === 'tempo';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">
                            {item.itemName || item.title}
                          </div>
                          {item.notes && (
                            <div className="text-[11px] text-slate-400 italic line-clamp-1">
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${meta.bg} ${meta.color} border ${meta.border}`}
                          >
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-700 whitespace-nowrap">
                          {item.quantity ? `${item.quantity} ${item.unit || ''}` : '-'}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                          {item.unitPrice ? formatRupiah(item.unitPrice) : '-'}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(item.amount)}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                          {item.supplier || '-'}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              isTempo
                                ? 'bg-amber-100 text-amber-800 hover:bg-emerald-100 hover:text-emerald-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                            title="Klik untuk ubah status lunas/tempo"
                          >
                            {isTempo ? 'Tempo' : 'Lunas'}
                          </button>
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingExpense(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit Catatan"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Hapus catatan pembelian "${item.itemName || item.title}"?`)) {
                                  onDeleteExpense(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Catatan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* Edit Modal (if editing item) */}
      {editingExpense && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingExpense(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Edit Catatan Pembelian Bahan
              </h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama Bahan</label>
                <input
                  type="text"
                  value={editingExpense.itemName || editingExpense.title}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      itemName: e.target.value,
                      title: `Pembelian ${e.target.value}`,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Jumlah</label>
                  <input
                    type="number"
                    value={editingExpense.quantity || 1}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        quantity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Total Biaya (Rp)</label>
                  <input
                    type="number"
                    value={editingExpense.amount}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Supplier / Toko</label>
                  <input
                    type="text"
                    value={editingExpense.supplier || ''}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        supplier: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status Bayar</label>
                  <select
                    value={editingExpense.paymentStatus || 'lunas'}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        paymentStatus: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="lunas">LUNAS</option>
                    <option value="tempo">TEMPO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={editingExpense.notes || ''}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (editingExpense) {
                    await onUpdateExpense(editingExpense.id, editingExpense);
                    setEditingExpense(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
