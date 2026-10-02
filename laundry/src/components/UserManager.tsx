import React, { useState } from 'react';
import {
  AppUser,
  UserRole,
  WorkerStation,
} from '../types.ts';
import {
  Users,
  UserCheck,
  Shield,
  ShieldAlert,
  KeyRound,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Phone,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';

interface UserManagerProps {
  users: AppUser[];
  currentUser: AppUser | null;
  onAddUser: (userData: Partial<AppUser>) => Promise<void>;
  onUpdateUser: (id: string, userData: Partial<AppUser>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onOpenLoginModal?: () => void;
}

export const UserManager: React.FC<UserManagerProps> = ({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onOpenLoginModal,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('pekerja');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [assignedStation, setAssignedStation] = useState<WorkerStation>('kasir');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

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
          Manajemen Staff & Karyawan Terkunci
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          Anda saat ini masuk sebagai <strong>{currentUser?.name || 'Pekerja / Operator'}</strong> (Role: Pekerja).
          Sesuai kebijakan hak akses sistem, pengelolaan data akun karyawan, password, PIN, dan pembagian hak akses hanya dapat diakses oleh Administrator / Pemilik.
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

  const openAddModal = () => {
    setEditingUser(null);
    setUsername('');
    setName('');
    setRole('pekerja');
    setPhone('');
    setPin('1234');
    setPassword('pekerja123');
    setAssignedStation('kasir');
    setIsActive(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setUsername(user.username);
    setName(user.name);
    setRole(user.role);
    setPhone(user.phone || '');
    setPin(user.pin || '');
    setPassword(user.password || '');
    setAssignedStation(user.assignedStation || 'semua');
    setIsActive(user.isActive);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, {
          name,
          role,
          phone,
          pin,
          password,
          assignedStation,
          isActive,
        });
      } else {
        await onAddUser({
          username,
          name,
          role,
          phone,
          pin,
          password,
          assignedStation,
          isActive,
        });
      }
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan data staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const adminUsers = users.filter((u) => u.role === 'admin');
  const workerUsers = users.filter((u) => u.role === 'pekerja');

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Manajemen Akses & Karyawan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Hak Akses Administrator & Pekerja
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Atur pembagian wewenang antara Pemilik (Admin) dan Operator (Pekerja). Lindungi laporan omset sensitif dan kontrol tarif layanan.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Karyawan Baru</span>
          </button>
        )}
      </div>

      {/* Role Permissions Comparison Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Admin Card */}
        <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full pointer-events-none -mr-4 -mt-4" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm">Hak Akses: Administrator</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  Full Access
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Pemilik Outlet & Penanggung Jawab Laundry</p>
            </div>
          </div>

          <ul className="space-y-1.5 text-xs text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Melihat & menganalisis omset, profit harian & bulanan</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Mengubah daftar harga & tarif kiloan/satuan</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Kelola akun pekerja, buat akun kasir & atur PIN</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Menghapus pesanan atau mereset database</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Ubah pengaturan nama outlet, alamat & nomor telepon</span>
            </li>
          </ul>
        </div>

        {/* Worker Card */}
        <div className="bg-white rounded-2xl border border-sky-100 p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full pointer-events-none -mr-4 -mt-4" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black shadow-md shadow-sky-600/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm">Hak Akses: Pekerja / Staff</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                  Operasional
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Kasir Depan, Operator Cuci, Setrika & Packing</p>
            </div>
          </div>

          <ul className="space-y-1.5 text-xs text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Melayani Kasir POS (input cucian kiloan & satuan)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Update tahap proses (Diterima ➜ Cuci ➜ Setrika ➜ Selesai)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Kirim update status & nota otomatis ke WhatsApp pelanggan</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Tandai pembayaran lunas saat pelanggan mengambil pakaian</span>
            </li>
            <li className="flex items-center gap-2 text-rose-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>TIDAK BISA melihat omset keuangan & mengubah tarif</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Staff & Accounts List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">Daftar Akun Pengguna ({users.length})</h3>
          </div>
          <div className="text-[11px] text-slate-500">
            <span>{adminUsers.length} Admin</span> • <span>{workerUsers.length} Pekerja</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-3 px-4">Nama & Username</th>
                <th className="py-3 px-4">Peran (Role)</th>
                <th className="py-3 px-4">Penugasan / Stasiun</th>
                <th className="py-3 px-4">Kontak / WhatsApp</th>
                <th className="py-3 px-4">PIN Masuk</th>
                <th className="py-3 px-4">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isCurrent = user.id === currentUser?.id;
                const isSuperAdmin = user.role === 'admin';

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                            isSuperAdmin
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <span>{user.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                                Anda
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">@{user.username}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isSuperAdmin
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {isSuperAdmin ? (
                          <>
                            <Shield className="w-3 h-3 text-indigo-600" /> Administrator
                          </>
                        ) : (
                          <>
                            <Briefcase className="w-3 h-3 text-sky-600" /> Pekerja
                          </>
                        )}
                      </span>
                    </td>

                    {/* Station */}
                    <td className="py-3.5 px-4 font-medium text-slate-600 capitalize">
                      {user.assignedStation ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px]">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {user.assignedStation === 'semua'
                            ? 'Semua Stasiun'
                            : `Stasiun ${user.assignedStation}`}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {user.phone || '-'}
                    </td>

                    {/* PIN */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold tracking-widest">
                        {user.pin || '••••'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <CheckCircle className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Actions (Admin Only) */}
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            title="Edit Staff"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete staff button (protected if last admin or current user) */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Yakin ingin menghapus akun staff "${user.name}" (@${user.username})?`
                                  )
                                ) {
                                  onDeleteUser(user.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Hapus Staff"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
                <h4 className="font-black text-slate-900 text-sm">
                  {editingUser ? 'Edit Akun Staff' : 'Tambah Staff / Pekerja Baru'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Lengkap Karyawan *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rina Kusuma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                    placeholder="Contoh: rina"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Peran (Role)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="pekerja">Pekerja / Operator</option>
                    <option value="admin">Administrator (Owner)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Stasiun Kerja
                  </label>
                  <select
                    value={assignedStation}
                    onChange={(e) => setAssignedStation(e.target.value as WorkerStation)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 capitalize"
                  >
                    <option value="kasir">Kasir POS</option>
                    <option value="cuci">Operator Cuci</option>
                    <option value="setrika">Operator Setrika</option>
                    <option value="packing">Packing</option>
                    <option value="semua">Semua Stasiun</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    PIN Cepat Masuk (4 Angka)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500 text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    No. WhatsApp (Opsional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Password Login
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {editingUser && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Akun Karyawan Aktif
                    </span>
                  </label>
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 disabled:opacity-60"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
