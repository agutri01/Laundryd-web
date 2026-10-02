import React, { useState } from 'react';
import { LaundryService, ServiceCategory, AppUser } from '../types';
import { formatRupiah, DEFAULT_SERVICES } from '../data/defaultData';
import { Plus, Edit2, Trash2, RotateCcw, Check, X, Tag, Clock, Lock, Shield, ShieldAlert, KeyRound } from 'lucide-react';

interface ServiceManagerProps {
  services: LaundryService[];
  onSaveServices: (updated: LaundryService[]) => void;
  currentUser?: AppUser | null;
  onOpenLoginModal?: () => void;
}

export const ServiceManager: React.FC<ServiceManagerProps> = ({
  services,
  onSaveServices,
  currentUser,
  onOpenLoginModal,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for new service
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('kiloan');
  const [price, setPrice] = useState<number>(8000);
  const [unit, setUnit] = useState<'kg' | 'pcs' | 'meter'>('kg');
  const [estimatedHours, setEstimatedHours] = useState<number>(48);
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');

  // Editing state
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editHours, setEditHours] = useState<number>(0);

  // If user is Pekerja (not admin), show locked permission screen
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
          Tarif Layanan & Harga Terkunci
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          Anda saat ini masuk sebagai <strong>{currentUser?.name || 'Pekerja / Operator'}</strong> (Role: Pekerja).
          Sesuai kebijakan hak akses sistem, pengaturan daftar tarif layanan dan harga cuci hanya dapat diakses dan diubah oleh Administrator / Pemilik.
        </p>

        {onOpenLoginModal && (
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Beralih ke Akun Administrator</span>
          </button>
        )}
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newService: LaundryService = {
      id: `srv-${Date.now()}`,
      name: name.trim(),
      category,
      price: Number(price) || 0,
      unit,
      estimatedHours: Number(estimatedHours) || 24,
      description: description.trim() || 'Layanan laundry higienis.',
      badge: badge.trim() || undefined,
    };

    onSaveServices([...services, newService]);
    setShowAddModal(false);
    // Reset
    setName('');
    setDescription('');
    setBadge('');
    setPrice(8000);
  };

  const handleStartEdit = (service: LaundryService) => {
    setEditingId(service.id);
    setEditPrice(service.price);
    setEditHours(service.estimatedHours);
  };

  const handleSaveEdit = (serviceId: string) => {
    const updated = services.map((s) => {
      if (s.id !== serviceId) return s;
      return {
        ...s,
        price: editPrice,
        estimatedHours: editHours,
      };
    });
    onSaveServices(updated);
    setEditingId(null);
  };

  const handleDelete = (serviceId: string) => {
    if (confirm('Hapus layanan ini dari daftar tarif?')) {
      onSaveServices(services.filter((s) => s.id !== serviceId));
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan semua layanan ke tarif default awal?')) {
      onSaveServices(DEFAULT_SERVICES);
    }
  };

  return (
    <div id="service-manager-view" className="space-y-6 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-sky-600" /> Manajemen Layanan & Daftar Tarif
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur jenis layanan cuci kiloan, satuan, harga per unit, dan estimasi waktu selesai.
          </p>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" /> Tambah Layanan Baru
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Katalog Resmi Outlet</span>
          </div>
        )}
      </div>

      {/* Services List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Nama Layanan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Tarif / Harga</th>
                <th className="py-3 px-4">Estimasi Pengerjaan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((service) => {
                const isEditing = editingId === service.id;

                return (
                  <tr key={service.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name & Desc */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{service.name}</span>
                        {service.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                            {service.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">
                        {service.description}
                      </p>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          service.category === 'kiloan'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {service.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isEditing && isAdmin ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(Number(e.target.value))}
                            className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                          />
                          <span className="text-slate-500 font-medium">/{service.unit}</span>
                        </div>
                      ) : (
                        <span className="font-mono font-extrabold text-slate-900">
                          {formatRupiah(service.price)}{' '}
                          <span className="text-slate-500 font-normal">/{service.unit}</span>
                        </span>
                      )}
                    </td>

                    {/* Turnaround */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isEditing && isAdmin ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editHours}
                            onChange={(e) => setEditHours(Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                          />
                          <span className="text-slate-500">Jam</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {service.estimatedHours} Jam ({Math.round(service.estimatedHours / 24)} hari)
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isAdmin ? (
                        isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(service.id)}
                              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Simpan"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
                              title="Batal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(service)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                              title="Edit Tarif"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(service.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus Layanan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Tetap</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Service Modal */}
      {showAddModal && (
        <div
          id="add-service-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowAddModal(false)}
        >
          <div
            id="add-service-modal"
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Tambah Layanan Laundry Baru</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Layanan *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Cuci Karpet Tebal / Cuci Helm"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const val = e.target.value as ServiceCategory;
                      setCategory(val);
                      if (val === 'kiloan') setUnit('kg');
                      else setUnit('pcs');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="kiloan">Kiloan</option>
                    <option value="satuan">Satuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan Hitung</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="pcs">pcs (Buah / Lembar)</option>
                    <option value="meter">meter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga (Rp) *</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="500"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Estimasi (Jam)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Layanan</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan proses pengerjaan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Label Promo/Badge (Opsional)
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Contoh: Populer / Kilat"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700"
                >
                  Simpan Layanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
