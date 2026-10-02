import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LaundryOrder, LaundryService, OrderItem, PaymentMethod, PaymentStatus, Customer } from '../types';
import { PERFUME_OPTIONS, formatRupiah } from '../data/defaultData';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Check,
  Sparkles,
  User,
  Receipt,
  Phone,
  MapPin,
  Tag,
  Wallet,
  Users,
  AlertCircle,
  Search,
  X,
  UserCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface PosCashierProps {
  services: LaundryService[];
  customers?: Customer[];
  onOrderCreated: (newOrder: LaundryOrder) => void;
  onDeductDeposit?: (customerId: string, amount: number, orderId: string) => void;
  initialCustomer?: Customer | null;
  onClearInitialCustomer?: () => void;
}

export const PosCashier: React.FC<PosCashierProps> = ({
  services,
  customers = [],
  onOrderCreated,
  onDeductDeposit,
  initialCustomer,
  onClearInitialCustomer,
}) => {
  // Customer info
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Customer Search Modal & Auto-suggest state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'deposit'>('all');
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

  // Service category filter
  const [serviceFilter, setServiceFilter] = useState<'all' | 'kiloan' | 'satuan'>('all');

  // Cart
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [perfume, setPerfume] = useState(PERFUME_OPTIONS[0]);
  const [notes, setNotes] = useState('');

  // Payment & Fees
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('lunas');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [discount, setDiscount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Turnaround hours (default 48 hours)
  const [turnaroundHours, setTurnaroundHours] = useState<number>(48);

  // Handle outside click for name suggestions dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target as Node)) {
        setShowNameSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 70);
    }
  }, [isSearchModalOpen]);

  // Load initial customer if provided
  useEffect(() => {
    if (initialCustomer) {
      handleSelectCustomer(initialCustomer);
      if (onClearInitialCustomer) {
        onClearInitialCustomer();
      }
    }
  }, [initialCustomer]);

  const filteredServices = services.filter((srv) => {
    if (serviceFilter === 'all') return true;
    return srv.category === serviceFilter;
  });

  const handleAddService = (service: LaundryService) => {
    const existingIndex = cartItems.findIndex((item) => item.serviceId === service.id);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      const defaultIncrement = service.unit === 'kg' ? 1 : 1;
      const newQty = updated[existingIndex].quantity + defaultIncrement;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: parseFloat(newQty.toFixed(2)),
        subtotal: Math.round(newQty * service.price),
      };
      setCartItems(updated);
    } else {
      const initialQty = service.unit === 'kg' ? 3 : 1; // 3kg minimum common or 1 pcs
      setCartItems([
        ...cartItems,
        {
          serviceId: service.id,
          serviceName: service.name,
          price: service.price,
          unit: service.unit,
          quantity: initialQty,
          subtotal: initialQty * service.price,
        },
      ]);
    }

    // Auto adjust turnaround if service is express
    if (service.estimatedHours < turnaroundHours) {
      setTurnaroundHours(service.estimatedHours);
    }
  };

  const handleUpdateQuantity = (serviceId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.serviceId !== serviceId) return item;
          const step = item.unit === 'kg' ? 0.5 : 1;
          const newQty = Math.max(0, parseFloat((item.quantity + delta * step).toFixed(2)));
          if (newQty <= 0) return null;
          return {
            ...item,
            quantity: newQty,
            subtotal: Math.round(newQty * item.price),
          };
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handleManualQuantityChange = (serviceId: string, val: string) => {
    const parsed = parseFloat(val);
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.serviceId !== serviceId) return item;
        const newQty = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        return {
          ...item,
          quantity: newQty,
          subtotal: Math.round(newQty * item.price),
        };
      })
    );
  };

  const handleRemoveItem = (serviceId: string) => {
    setCartItems((prev) => prev.filter((item) => item.serviceId !== serviceId));
  };

  const subtotal = cartItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  const total = Math.max(0, subtotal - discount + deliveryFee);

  // Match selected customer or customer by phone
  const matchedCustomer = customers.find(
    (c) =>
      c.id === selectedCustomerId ||
      (c.phone && customerPhone && c.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, ''))
  );

  const customerDepositBalance = matchedCustomer?.depositBalance || 0;

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id || '');
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || '');
    setShowNameSuggestions(false);
    setIsSearchModalOpen(false);
    if ((c.depositBalance || 0) >= total && total > 0) {
      setPaymentMethod('deposit');
      setPaymentStatus('lunas');
    }
  };

  const handleSelectExistingCustomer = (id: string) => {
    const found = customers.find((c) => c.id === id);
    if (found) {
      handleSelectCustomer(found);
    } else {
      handleResetCustomer();
    }
  };

  const handleResetCustomer = () => {
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setShowNameSuggestions(false);
  };

  const handleOpenSearchModal = (keyword?: string) => {
    setSearchQuery(keyword !== undefined ? keyword : customerName);
    setIsSearchModalOpen(true);
  };

  // Filtered customers for search modal
  const filteredSearchCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, '');
    return customers.filter((c) => {
      if (searchFilter === 'deposit' && (c.depositBalance || 0) <= 0) {
        return false;
      }
      if (!q) return true;
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = (cleanQ && c.phone.replace(/\D/g, '').includes(cleanQ)) || c.phone.toLowerCase().includes(q);
      const matchAddress = c.address ? c.address.toLowerCase().includes(q) : false;
      return matchName || matchPhone || matchAddress;
    });
  }, [customers, searchQuery, searchFilter]);

  // Inline name suggestions when typing into customer name input
  const nameSuggestions = useMemo(() => {
    const q = customerName.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    const cleanQ = q.replace(/\D/g, '');
    return customers
      .filter((c) => {
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = cleanQ ? c.phone.replace(/\D/g, '').includes(cleanQ) : false;
        return matchName || matchPhone;
      })
      .slice(0, 6);
  }, [customers, customerName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Mohon isi nama pelanggan');
      return;
    }
    if (!customerPhone.trim()) {
      alert('Mohon isi nomor telepon / WhatsApp pelanggan');
      return;
    }
    if (cartItems.length === 0) {
      alert('Mohon tambahkan minimal 1 layanan cucian ke keranjang');
      return;
    }

    // Validation for deposit payment
    if (paymentMethod === 'deposit') {
      if (!matchedCustomer || !matchedCustomer.id) {
        alert('Untuk menggunakan metode Saldo Deposit, pelanggan harus terdaftar dalam database pelanggan.');
        return;
      }
      if (customerDepositBalance < total) {
        alert(
          `Saldo deposit pelanggan (${formatRupiah(
            customerDepositBalance
          )}) tidak mencukupi untuk total cucian (${formatRupiah(
            total
          )}). Silakan top-up saldo deposit atau pilih metode bayar lain.`
        );
        return;
      }
    }

    // Generate Order ID: LDN-YYMMDD-XXX
    const now = new Date();
    const dateStr =
      String(now.getFullYear()).slice(-2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderId = `LDN-${dateStr}-${randomSuffix}`;

    const estimatedCompletion = new Date(
      now.getTime() + turnaroundHours * 3600 * 1000
    ).toISOString();

    const finalPaymentStatus: PaymentStatus =
      paymentMethod === 'deposit' ? 'lunas' : paymentStatus;

    const newOrder: LaundryOrder = {
      id: orderId,
      customer: {
        id: matchedCustomer?.id,
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim() || undefined,
        depositBalance:
          paymentMethod === 'deposit'
            ? Math.max(0, customerDepositBalance - total)
            : customerDepositBalance,
      },
      items: cartItems,
      perfume,
      notes: notes.trim() || undefined,
      stage: 'diterima',
      paymentStatus: finalPaymentStatus,
      paymentMethod,
      subtotal,
      discount,
      deliveryFee,
      total,
      createdAt: now.toISOString(),
      estimatedCompletion,
      timeline: [
        {
          stage: 'diterima',
          timestamp: now.toISOString(),
          note: `Pesanan diterima kasir (${cartItems.length} jenis item)${
            paymentMethod === 'deposit' ? ' - Dibayar dengan Saldo Deposit' : ''
          }`,
        },
      ],
    };

    // Deduct deposit if paying via deposit
    if (paymentMethod === 'deposit' && matchedCustomer && matchedCustomer.id && onDeductDeposit) {
      onDeductDeposit(matchedCustomer.id, total, orderId);
    }

    onOrderCreated(newOrder);

    // Reset form for next order
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCartItems([]);
    setNotes('');
    setDiscount(0);
    setDeliveryFee(0);
    setPaymentMethod('tunai');
    setPaymentStatus('lunas');
  };

  return (
    <div id="pos-cashier-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Customer Form & Service Catalog */}
      <div className="lg:col-span-7 space-y-6">
        {/* Customer Data Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <User className="w-4 h-4 text-sky-600" />
              <span>Data Pelanggan</span>
              {matchedCustomer && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  <UserCheck className="w-3 h-3 text-sky-600" /> Terdaftar
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {matchedCustomer && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <Wallet className="w-3 h-3 text-emerald-600" />
                  Saldo: {formatRupiah(customerDepositBalance)}
                </span>
              )}
              {/* Tombol Cari Nama Pelanggan Header */}
              <button
                id="btn-cari-nama-pelanggan-header"
                type="button"
                onClick={() => handleOpenSearchModal()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
                title="Buka dialog pencarian nama pelanggan"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Cari Nama Pelanggan</span>
              </button>
            </div>
          </div>

          {/* Banner Pelanggan Terpilih dari Database */}
          {matchedCustomer && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-sky-50/90 via-sky-50/60 to-emerald-50/70 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {matchedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {matchedCustomer.name}
                    </span>
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded">
                      Member Terverifikasi
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {matchedCustomer.phone}
                    </span>
                    {matchedCustomer.address && (
                      <span className="text-slate-400 text-[10px] truncate max-w-xs">
                        • {matchedCustomer.address}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenSearchModal()}
                  className="px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Search className="w-3 h-3" /> Ganti Pelanggan
                </button>
                <button
                  type="button"
                  onClick={handleResetCustomer}
                  className="px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  Hapus / Reset
                </button>
              </div>
            </div>
          )}

          {/* Quick Select from Registered Customers Dropdown */}
          {customers.length > 0 && (
            <div className="mb-3.5 pb-3 border-b border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  Pilih Cepat dari Database Pelanggan ({customers.length})
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenSearchModal()}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  Cari Nama Pelanggan
                </button>
              </label>
              <select
                id="select-customer-dropdown"
                value={selectedCustomerId}
                onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">-- Pilih pelanggan terdaftar atau gunakan tombol Cari Nama Pelanggan --</option>
                {customers.map((c) => (
                  <option key={c.id || c.phone} value={c.id}>
                    {c.name} ({c.phone}) — Saldo: {formatRupiah(c.depositBalance || 0)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="customer-name-input" className="block text-xs font-semibold text-slate-600">
                  Nama Lengkap Pelanggan *
                </label>
                <button
                  type="button"
                  onClick={() => handleOpenSearchModal(customerName)}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  Cari Nama Pelanggan
                </button>
              </div>

              {/* Input Group with Prominent Search Button */}
              <div className="relative" ref={suggestionBoxRef}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="customer-name-input"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setShowNameSuggestions(true);
                      }}
                      onFocus={() => {
                        if (customerName.trim().length > 0) setShowNameSuggestions(true);
                      }}
                      placeholder="Ketik nama atau cari di database..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Dedicated Tombol Cari Nama Pelanggan */}
                  <button
                    id="btn-cari-nama-pelanggan"
                    type="button"
                    onClick={() => handleOpenSearchModal(customerName)}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-xs hover:shadow cursor-pointer"
                    title="Cari nama pelanggan di database laundry"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Cari Pelanggan</span>
                  </button>
                </div>

                {/* Auto-suggest dropdown when typing name */}
                {showNameSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold px-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-sky-600" />
                        Saran Pelanggan Cocok ({nameSuggestions.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowNameSuggestions(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {nameSuggestions.map((item) => (
                        <button
                          key={item.id || item.phone}
                          type="button"
                          onClick={() => handleSelectCustomer(item)}
                          className="w-full text-left px-3 py-2.5 hover:bg-sky-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                              {item.name}
                              {item.id === selectedCustomerId && (
                                <span className="text-[10px] text-sky-600 font-normal">(Terpilih)</span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {item.phone}
                              {item.address && <span className="truncate max-w-[140px]">• {item.address}</span>}
                            </p>
                          </div>
                          {(item.depositBalance || 0) > 0 ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                              Saldo: {formatRupiah(item.depositBalance || 0)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md shrink-0 font-semibold">
                              Pilih
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNameSuggestions(false);
                        handleOpenSearchModal(customerName);
                      }}
                      className="w-full text-center py-2 bg-slate-50 hover:bg-sky-50 text-[11px] font-bold text-sky-600 border-t border-slate-100 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Search className="w-3 h-3" />
                      Buka Dialog Lengkap Cari Pelanggan →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                No. WhatsApp / Telepon *
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="customer-phone-input"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Alamat / Catatan Lokasi (Opsional)
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <textarea
                  id="customer-address-input"
                  rows={1}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Contoh: Kost Asri No. 4, Pekanbaru (isi bila minta antar-jemput)"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            {/* Deposit Quick Action Banner */}
            {matchedCustomer && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block font-semibold uppercase">
                      Saldo Deposit Pelanggan
                    </span>
                    <span className="text-sm font-mono font-black text-emerald-900">
                      {formatRupiah(customerDepositBalance)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {customerDepositBalance >= total && total > 0 && paymentMethod !== 'deposit' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('deposit');
                        setPaymentStatus('lunas');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Gunakan Saldo
                    </button>
                  )}
                  {paymentMethod === 'deposit' && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Saldo Dipakai
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Service Catalog Picker */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Tag className="w-4 h-4 text-sky-600" />
              <span>Katalog Layanan Laundry</span>
            </div>

            {/* Category Filter Tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setServiceFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  serviceFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setServiceFilter('kiloan')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  serviceFilter === 'kiloan'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🧺 Kiloan
              </button>
              <button
                type="button"
                onClick={() => setServiceFilter('satuan')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  serviceFilter === 'satuan'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👔 Satuan
              </button>
            </div>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredServices.map((service) => {
              const inCart = cartItems.find((i) => i.serviceId === service.id);
              return (
                <div
                  key={service.id}
                  onClick={() => handleAddService(service)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all hover:shadow-sm flex flex-col justify-between group ${
                    inCart
                      ? 'border-sky-500 bg-sky-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                        {service.name}
                      </h4>
                      {service.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                          {service.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900">
                      {formatRupiah(service.price)}
                      <span className="text-[11px] font-normal text-slate-500">
                        /{service.unit}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        inCart
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-sky-600 group-hover:text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {inCart ? `${inCart.quantity} ${inCart.unit}` : 'Tambah'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Order Cart & Checkout Form */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5 sticky top-20">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <ShoppingBag className="w-4 h-4 text-sky-600" />
            <span>Keranjang Cucian</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-mono">
              {cartItems.length}
            </span>
          </div>
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={() => setCartItems([])}
              className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
            >
              Kosongkan
            </button>
          )}
        </div>

        {/* Cart Item List */}
        {cartItems.length === 0 ? (
          <div className="py-10 text-center text-slate-400 space-y-2">
            <ShoppingBag className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-xs font-medium">Belum ada layanan yang dipilih</p>
            <p className="text-[11px] text-slate-400">
              Pilih layanan di samping untuk menghitung otomatis
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {cartItems.map((item) => (
              <div
                key={item.serviceId}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex flex-col gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-slate-800 leading-snug">{item.serviceName}</h5>
                    <span className="text-[11px] text-slate-500">
                      {formatRupiah(item.price)} / {item.unit}
                    </span>
                  </div>
                  <span className="font-extrabold text-slate-900 text-xs font-mono">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>

                {/* Counter controls */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.serviceId, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      step={item.unit === 'kg' ? '0.1' : '1'}
                      min="0.1"
                      value={item.quantity}
                      onChange={(e) => handleManualQuantityChange(item.serviceId, e.target.value)}
                      className="w-16 px-1.5 py-0.5 text-center font-bold text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">{item.unit}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.serviceId, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.serviceId)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Perfume & Order Details */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Pilihan Aroma Parfum
            </label>
            <select
              id="perfume-select"
              value={perfume}
              onChange={(e) => setPerfume(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {PERFUME_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Khusus Cucian
            </label>
            <input
              id="order-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pisahkan luntur, jangan setrika bagian sablon"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Turnaround speed */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { hours: 6, label: 'Kilat 6 Jam' },
              { hours: 24, label: '1 Hari (24 Jam)' },
              { hours: 48, label: 'Reguler (2 Hari)' },
            ].map((speed) => (
              <button
                key={speed.hours}
                type="button"
                onClick={() => setTurnaroundHours(speed.hours)}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-all text-center ${
                  turnaroundHours === speed.hours
                    ? 'bg-sky-50 border-sky-500 text-sky-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {speed.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing & Payment Options */}
        <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Diskon (Rp)
              </label>
              <input
                id="discount-input"
                type="number"
                min="0"
                step="1000"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Biaya Antar-Jemput (Rp)
              </label>
              <input
                id="delivery-input"
                type="number"
                min="0"
                step="1000"
                value={deliveryFee || ''}
                onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900"
              />
            </div>
          </div>

          {/* Payment Status & Method */}
          <div className="space-y-2">
            <span className="block text-[11px] font-semibold text-slate-600">
              Metode & Status Pembayaran
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus('lunas')}
                className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  paymentStatus === 'lunas'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Lunas Sekarang
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('belum_lunas')}
                className={`py-1.5 px-3 rounded-xl font-bold text-xs transition-all ${
                  paymentStatus === 'belum_lunas'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Bayar Saat Ambil
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {(['tunai', 'qris', 'transfer', 'deposit'] as PaymentMethod[]).map((m) => {
                const isDeposit = m === 'deposit';
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m);
                      if (isDeposit) {
                        setPaymentStatus('lunas');
                      }
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all text-center flex items-center justify-center gap-1 ${
                      paymentMethod === m
                        ? isDeposit
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-800 bg-slate-900 text-white'
                        : isDeposit
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isDeposit && <Wallet className="w-3 h-3" />}
                    <span>{isDeposit ? 'Deposit' : m}</span>
                  </button>
                );
              })}
            </div>

            {paymentMethod === 'deposit' && (
              <div
                className={`p-2.5 rounded-xl border text-xs ${
                  customerDepositBalance >= total
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {customerDepositBalance >= total ? (
                  <div className="flex items-center justify-between">
                    <span>
                      Saldo mencukupi: <strong>{formatRupiah(customerDepositBalance)}</strong>
                    </span>
                    <span className="font-mono text-[11px]">
                      Sisa: {formatRupiah(customerDepositBalance - total)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>
                      Saldo deposit ({formatRupiah(customerDepositBalance)}) kurang{' '}
                      <strong>{formatRupiah(total - customerDepositBalance)}</strong>.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calculations */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Subtotal:</span>
              <span className="font-mono">{formatRupiah(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-rose-300">
                <span>Diskon:</span>
                <span className="font-mono">-{formatRupiah(discount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-xs text-slate-300">
                <span>Ongkir:</span>
                <span className="font-mono">+{formatRupiah(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-700 text-sm font-black">
              <span>TOTAL BAYAR:</span>
              <span className="text-xl font-black text-amber-400 font-mono">
                {formatRupiah(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Order Button */}
        <button
          id="submit-order-btn"
          type="button"
          onClick={handleSubmit}
          className="w-full py-3 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Receipt className="w-4 h-4" />
          Simpan Pesanan & Buka Nota
        </button>
      </div>

      {/* MODAL CARI NAMA PELANGGAN */}
      {isSearchModalOpen && (
        <div
          id="modal-cari-nama-pelanggan"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSearchModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-xs">
                  <Search className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      Cari Nama Pelanggan
                    </h3>
                    <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                      {customers.length} Terdaftar
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Cari berdasarkan nama, nomor telepon/WhatsApp, atau alamat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
                title="Tutup pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Box */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  id="modal-customer-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredSearchCustomers.length > 0) {
                      e.preventDefault();
                      handleSelectCustomer(filteredSearchCustomers[0]);
                    } else if (e.key === 'Escape') {
                      setIsSearchModalOpen(false);
                    }
                  }}
                  placeholder="Ketik nama pelanggan, no. telepon, atau alamat..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title="Hapus kata kunci"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 mt-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSearchFilter('all')}
                  className={`px-3 py-1 rounded-xl font-bold transition-all ${
                    searchFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({customers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchFilter('deposit')}
                  className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                    searchFilter === 'deposit'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Punya Saldo Deposit ({customers.filter((c) => (c.depositBalance || 0) > 0).length})
                </button>
                <span className="ml-auto text-[11px] text-slate-400 font-medium">
                  {filteredSearchCustomers.length} pelanggan cocok
                </span>
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[240px] max-h-[420px]">
              {customers.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 mb-1">
                    Database Pelanggan Masih Kosong
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    Belum ada data pelanggan tersimpan. Pelanggan baru akan otomatis tersimpan saat Anda membuat pesanan di kasir ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSearchModalOpen(false)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl"
                  >
                    Kembali & Isi Form Kasir
                  </button>
                </div>
              ) : filteredSearchCustomers.length > 0 ? (
                filteredSearchCustomers.map((c) => {
                  const isSelected = c.id === selectedCustomerId || (c.phone && customerPhone && c.phone === customerPhone);
                  const hasDeposit = (c.depositBalance || 0) > 0;

                  return (
                    <div
                      key={c.id || c.phone}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-sky-50/70 border-sky-300 ring-2 ring-sky-400/30'
                          : 'bg-white border-slate-200/80 hover:border-sky-300 hover:bg-slate-50/60 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-xs ${
                            hasDeposit
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                              : 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white'
                          }`}
                        >
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">
                              {c.name}
                            </h4>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                                Terpilih Sekarang
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {c.phone}
                            </span>
                            {c.address && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[200px]">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {c.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right actions: Deposit Tag & Select Button */}
                      <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                        {hasDeposit ? (
                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-emerald-600 uppercase block">
                              Saldo Deposit
                            </span>
                            <span className="text-xs font-black text-emerald-700 font-mono">
                              {formatRupiah(c.depositBalance || 0)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Saldo: Rp 0</span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white hover:bg-sky-700'
                              : 'bg-slate-900 hover:bg-sky-600 text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSelected ? 'Gunakan Lagi' : 'Pilih'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">
                    Pelanggan Tidak Ditemukan
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    Tidak ada pelanggan terdaftar yang cocok dengan kata kunci{' '}
                    <strong className="text-slate-800 font-semibold">"{searchQuery}"</strong>.
                  </p>
                  {searchQuery.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerName(searchQuery.trim());
                        setSelectedCustomerId('');
                        setIsSearchModalOpen(false);
                      }}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Gunakan "{searchQuery.trim()}" untuk Pesanan Baru
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500">
                Tekan <strong>Enter</strong> untuk memilih pelanggan teratas
              </span>
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
