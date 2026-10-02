import React, { useState } from 'react';
import { Customer, LaundryOrder, LaundrySettings, DepositTransaction, formatRupiah, formatDateIndo } from '../types';
import {
  Users,
  Wallet,
  Plus,
  Search,
  Phone,
  MapPin,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  FileText,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { generateWhatsAppDepositUrl } from '../utils/whatsapp';

interface CustomerManagerProps {
  customers: Customer[];
  orders: LaundryOrder[];
  settings: LaundrySettings;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onTopUpDeposit: (customerId: string, amount: number, method: 'tunai' | 'qris' | 'transfer', notes: string) => void;
  onSelectCustomerForNewOrder?: (customer: Customer) => void;
  currentUser?: import('../types').AppUser | null;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers,
  orders,
  settings,
  onSaveCustomer,
  onDeleteCustomer,
  onTopUpDeposit,
  onSelectCustomerForNewOrder,
  currentUser,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'has_balance' | 'zero_balance'>('all');

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [topUpCustomer, setTopUpCustomer] = useState<Customer | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(100000);
  const [topUpMethod, setTopUpMethod] = useState<'tunai' | 'qris' | 'transfer'>('tunai');
  const [topUpNotes, setTopUpNotes] = useState('');

  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formInitialDeposit, setFormInitialDeposit] = useState<number>(0);

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchText =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.address && c.address.toLowerCase().includes(q));

    const balance = c.depositBalance || 0;
    const matchBalance =
      balanceFilter === 'all' ||
      (balanceFilter === 'has_balance' && balance > 0) ||
      (balanceFilter === 'zero_balance' && balance <= 0);

    return matchText && matchBalance;
  });

  // Analytics
  const totalDepositHeld = customers.reduce((sum, c) => sum + (c.depositBalance || 0), 0);
  const customersWithBalanceCount = customers.filter((c) => (c.depositBalance || 0) > 0).length;

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormNotes('');
    setFormInitialDeposit(0);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormAddress(customer.address || '');
    setFormNotes(customer.notes || '');
    setFormInitialDeposit(0);
    setShowAddEditModal(true);
  };

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      alert('Nama dan No. WhatsApp wajib diisi');
      return;
    }

    if (editingCustomer) {
      // Edit existing
      const updated: Customer = {
        ...editingCustomer,
        name: formName.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };
      onSaveCustomer(updated);
    } else {
      // Create new customer
      const newId = `cst-${Date.now()}`;
      const now = new Date().toISOString();
      const initialHistory: DepositTransaction[] =
        formInitialDeposit > 0
          ? [
              {
                id: `dep-${Date.now()}`,
                type: 'topup',
                amount: formInitialDeposit,
                date: now,
                notes: 'Deposit awal pendaftaran pelanggan',
                paymentMethod: 'tunai',
              },
            ]
          : [];

      const newCustomer: Customer = {
        id: newId,
        name: formName.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
        depositBalance: formInitialDeposit,
        createdAt: now,
        depositHistory: initialHistory,
      };
      onSaveCustomer(newCustomer);
    }

    setShowAddEditModal(false);
  };

  const handleOpenTopUp = (customer: Customer) => {
    setTopUpCustomer(customer);
    setTopUpAmount(100000);
    setTopUpMethod('tunai');
    setTopUpNotes('');
  };

  const handleConfirmTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpCustomer || !topUpCustomer.id) return;
    if (topUpAmount <= 0) {
      alert('Nominal top up harus lebih besar dari 0');
      return;
    }

    onTopUpDeposit(topUpCustomer.id, topUpAmount, topUpMethod, topUpNotes || 'Top up saldo deposit');

    const customerUpdatedBalance = (topUpCustomer.depositBalance || 0) + topUpAmount;
    const sendWa = confirm(
      `Top up saldo sebesar ${formatRupiah(topUpAmount)} berhasil!\n\nKirim konfirmasi saldo baru (${formatRupiah(
        customerUpdatedBalance
      )}) ke WhatsApp pelanggan sekarang?`
    );

    if (sendWa) {
      const url = generateWhatsAppDepositUrl(
        topUpCustomer.phone,
        topUpCustomer.name,
        customerUpdatedBalance,
        settings,
        `Top Up +${formatRupiah(topUpAmount)} (${topUpMethod.toUpperCase()})`
      );
      window.open(url, '_blank');
    }

    setTopUpCustomer(null);
  };

  const getCustomerOrders = (phone: string, name: string) => {
    return orders.filter(
      (o) =>
        o.customer.phone.replace(/\D/g, '') === phone.replace(/\D/g, '') ||
        o.customer.name.toLowerCase() === name.toLowerCase()
    );
  };

  return (
    <div id="customer-manager-view" className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Pelanggan */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Pelanggan Terdaftar</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{customers.length}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Database langganan aktif</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Saldo Mengendap */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Saldo Deposit Pelanggan</span>
            <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
              {formatRupiah(totalDepositHeld)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dana titipan & paket kuota laundry
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Member Aktif Deposit */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Pelanggan Bersaldo Aktif</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {customersWithBalanceCount}{' '}
              <span className="text-xs font-normal text-slate-500">
                ({Math.round((customersWithBalanceCount / (customers.length || 1)) * 100)}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Dapat langsung dipotong saat kasir</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action and Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-customer-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pelanggan, nomor WhatsApp, atau alamat..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
          />
        </div>

        {/* Filters and CTA */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setBalanceFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                balanceFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter('has_balance')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                balanceFilter === 'has_balance'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ada Saldo ({customersWithBalanceCount})
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter('zero_balance')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                balanceFilter === 'zero_balance'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saldo Nol
            </button>
          </div>

          <button
            id="add-customer-btn"
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pelanggan Baru</span>
          </button>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">No. WhatsApp</th>
                <th className="py-3 px-4">Saldo Deposit</th>
                <th className="py-3 px-4">Alamat & Catatan</th>
                <th className="py-3 px-4">Histori Cucian</th>
                <th className="py-3 px-4 text-right">Aksi & Top Up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <AlertCircle className="w-6 h-6 text-slate-300" />
                      <span className="font-semibold text-xs text-slate-600">
                        Tidak ada pelanggan ditemukan
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Coba sesuaikan kata kunci pencarian atau tambah pelanggan baru.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const balance = customer.depositBalance || 0;
                  const customerOrders = getCustomerOrders(customer.phone, customer.name);

                  return (
                    <tr
                      key={customer.id || customer.phone}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 font-black text-xs flex items-center justify-center">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-slate-900">{customer.name}</span>
                            {customer.createdAt && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                Terdaftar {formatDateIndo(customer.createdAt).split(',')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone / WA */}
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <a
                          href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-600 transition-colors"
                          title="Chat WhatsApp"
                        >
                          <Phone className="w-3 h-3 text-emerald-500" />
                          <span>{customer.phone}</span>
                        </a>
                      </td>

                      {/* Deposit Balance Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono font-black text-xs border ${
                              balance > 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            {formatRupiah(balance)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenTopUp(customer)}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-0.5 shadow-2xs"
                            title="Top Up Saldo Deposit"
                          >
                            <Plus className="w-3 h-3" /> Top Up
                          </button>
                        </div>
                      </td>

                      {/* Address & Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {customer.address ? (
                          <div className="flex items-start gap-1 text-slate-600 text-[11px] line-clamp-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                        {customer.notes && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            Catatan: {customer.notes}
                          </p>
                        )}
                      </td>

                      {/* Order Count */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDetailCustomer(customer)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{customerOrders.length} Pesanan</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send WhatsApp Balance Notice */}
                          <a
                            href={generateWhatsAppDepositUrl(
                              customer.phone,
                              customer.name,
                              balance,
                              settings
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Kirim Info Saldo ke WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </a>

                          {/* View Detail / History */}
                          <button
                            type="button"
                            onClick={() => setDetailCustomer(customer)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Riwayat Deposit & Transaksi"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Edit Customer */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(customer)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            title="Edit Data Pelanggan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete (Admin only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Hapus pelanggan ${customer.name}? Sisa saldo deposit: ${formatRupiah(
                                      balance
                                    )}`
                                  )
                                ) {
                                  if (customer.id) onDeleteCustomer(customer.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Pelanggan (Admin Only)"
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

      {/* MODAL 1: Top Up Saldo Deposit */}
      {topUpCustomer && (
        <div
          id="topup-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setTopUpCustomer(null)}
        >
          <div
            id="topup-modal-content"
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Top Up Saldo Deposit</h3>
                  <p className="text-xs text-slate-500">{topUpCustomer.name} ({topUpCustomer.phone})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTopUpCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600">Saldo Saat Ini:</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {formatRupiah(topUpCustomer.depositBalance || 0)}
              </span>
            </div>

            <form onSubmit={handleConfirmTopUp} className="space-y-4 text-xs">
              {/* Preset nominal buttons */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Pilih Nominal Cepat (Rp)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[50000, 100000, 200000, 500000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => setTopUpAmount(nominal)}
                      className={`py-2 px-3 rounded-xl font-bold font-mono text-xs border transition-all ${
                        topUpAmount === nominal
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      +{formatRupiah(nominal)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Atau Masukkan Nominal Sendiri (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="5000"
                  step="5000"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Metode Pembayaran Top Up
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['tunai', 'qris', 'transfer'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTopUpMethod(m)}
                      className={`py-2 px-2 rounded-xl font-bold text-xs uppercase border transition-all text-center ${
                        topUpMethod === m
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={topUpNotes}
                  onChange={(e) => setTopUpNotes(e.target.value)}
                  placeholder="Contoh: Paket promo mingguan / transfer BCA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Summary projection */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-900">Saldo Baru Setelah Top Up:</span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {formatRupiah((topUpCustomer.depositBalance || 0) + topUpAmount)}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTopUpCustomer(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle className="w-4 h-4" /> Konfirmasi Top Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Tambah / Edit Pelanggan */}
      {showAddEditModal && (
        <div
          id="customer-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowAddEditModal(false)}
        >
          <div
            id="customer-modal-content"
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Pelanggan *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp / Telepon *
                </label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Lengkap (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Contoh: Jl. Merpati No. 12, Kost Graha Asri"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Khusus Pelanggan
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Suka parfum lavender, pakaian jangan dicampur luntur"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {!editingCustomer && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Saldo Deposit Awal (Opsional)</span>
                    <span className="text-[11px] text-emerald-600 font-normal">Bisa diisi nanti</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={formInitialDeposit || ''}
                    onChange={(e) => setFormInitialDeposit(Number(e.target.value) || 0)}
                    placeholder="Rp 0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/20"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Detail Pelanggan & Riwayat Mutasi Deposit */}
      {detailCustomer && (
        <div
          id="detail-customer-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setDetailCustomer(null)}
        >
          <div
            id="detail-customer-modal-content"
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">{detailCustomer.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
                    Saldo: {formatRupiah(detailCustomer.depositBalance || 0)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                  <span className="font-mono">📱 {detailCustomer.phone}</span>
                  {detailCustomer.address && <span>📍 {detailCustomer.address}</span>}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  handleOpenTopUp(detailCustomer);
                  setDetailCustomer(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Top Up Saldo Deposit
              </button>
              <a
                href={generateWhatsAppDepositUrl(
                  detailCustomer.phone,
                  detailCustomer.name,
                  detailCustomer.depositBalance || 0,
                  settings
                )}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100"
              >
                <Share2 className="w-3.5 h-3.5" /> Kirim Info Saldo ke WA
              </a>
            </div>

            {/* Section: Mutasi Saldo Deposit */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Riwayat Mutasi Saldo Deposit
              </h4>

              {(!detailCustomer.depositHistory || detailCustomer.depositHistory.length === 0) ? (
                <div className="p-4 rounded-2xl bg-slate-50 text-slate-400 text-xs text-center">
                  Belum ada catatan mutasi deposit untuk pelanggan ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {detailCustomer.depositHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            item.type === 'topup'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.type === 'topup' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-snug">
                            {item.notes || (item.type === 'topup' ? 'Top Up Saldo' : 'Penggunaan Cucian')}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDateIndo(item.date)}
                            {item.paymentMethod && ` • Via ${item.paymentMethod.toUpperCase()}`}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`font-mono font-bold text-xs ${
                          item.type === 'topup' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.type === 'topup' ? '+' : '-'}
                        {formatRupiah(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Pesanan Laundry Pelanggan Ini */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-sky-600" /> Riwayat Cucian Pelanggan
              </h4>

              {(() => {
                const customerOrders = getCustomerOrders(detailCustomer.phone, detailCustomer.name);
                if (customerOrders.length === 0) {
                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 text-slate-400 text-xs text-center">
                      Belum ada pesanan cucian tercatat untuk pelanggan ini.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {customerOrders.map((o) => (
                      <div
                        key={o.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{o.id}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 font-semibold text-slate-700">
                              {o.stage.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {o.items.map((i) => `${i.quantity}${i.unit} ${i.serviceName}`).join(', ')}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 block">
                            {formatRupiah(o.total)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              o.paymentStatus === 'lunas' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {o.paymentStatus.toUpperCase()} ({o.paymentMethod.toUpperCase()})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
