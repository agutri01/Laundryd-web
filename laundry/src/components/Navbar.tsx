import React from 'react';
import {
  WashingMachine,
  Plus,
  ShoppingBag,
  Clock,
  Search,
  Tag,
  TrendingUp,
  Users,
  Shield,
  Briefcase,
  Lock,
  ChevronDown,
  UserCheck,
  LogOut,
  Banknote,
  Package,
} from 'lucide-react';
import { AppUser, LaundrySettings } from '../types.ts';

export type NavTab =
  | 'kasir'
  | 'antrean'
  | 'pelanggan'
  | 'lacak'
  | 'layanan'
  | 'laporan'
  | 'karyawan'
  | 'penggajian'
  | 'bahan';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeOrdersCount: number;
  customersCount?: number;
  settings: LaundrySettings;
  currentUser: AppUser | null;
  onOpenLoginModal: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  activeOrdersCount,
  customersCount = 0,
  settings,
  currentUser,
  onOpenLoginModal,
  onLogout,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => onTabChange('antrean')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <WashingMachine className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                  {settings.shopName}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Buka
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
                Sistem Kasir & Operasional Laundry Modern
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50">
            <button
              id="nav-kasir-btn"
              type="button"
              onClick={() => onTabChange('kasir')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentTab === 'kasir'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Kasir POS
            </button>

            <button
              id="nav-antrean-btn"
              type="button"
              onClick={() => onTabChange('antrean')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentTab === 'antrean'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Antrean
              {activeOrdersCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    currentTab === 'antrean'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {activeOrdersCount}
                </span>
              )}
            </button>

            <button
              id="nav-pelanggan-btn"
              type="button"
              onClick={() => onTabChange('pelanggan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentTab === 'pelanggan'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Pelanggan
              {customersCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    currentTab === 'pelanggan'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {customersCount}
                </span>
              )}
            </button>

            <button
              id="nav-lacak-btn"
              type="button"
              onClick={() => onTabChange('lacak')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentTab === 'lacak'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> Lacak
            </button>

            {/* Tarif Layanan (Admin Only) */}
            {isAdmin && (
              <button
                id="nav-layanan-btn"
                type="button"
                onClick={() => onTabChange('layanan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentTab === 'layanan'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Kelola Tarif & Harga Layanan Cuci (Khusus Admin)"
              >
                <Tag className="w-3.5 h-3.5" /> Tarif
              </button>
            )}

            {/* Omset / Laporan Keuangan (Admin Only) */}
            {isAdmin && (
              <button
                id="nav-laporan-btn"
                type="button"
                onClick={() => onTabChange('laporan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentTab === 'laporan'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Laporan Omset & Keuangan (Khusus Admin)"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Omset
              </button>
            )}

            {/* Karyawan / Akses Staff (Admin Only) */}
            {isAdmin && (
              <button
                id="nav-karyawan-btn"
                type="button"
                onClick={() => onTabChange('karyawan')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentTab === 'karyawan'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-700 hover:text-indigo-900 bg-indigo-50/70'
                }`}
                title="Kelola Akun & Hak Akses Staff (Khusus Admin)"
              >
                <Shield className="w-3.5 h-3.5" /> Akses Staff
              </button>
            )}

            {/* Penggajian / Gaji (Admin: Penggajian, Worker: Slip Gaji) */}
            <button
              id="nav-penggajian-btn"
              type="button"
              onClick={() => onTabChange('penggajian')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentTab === 'penggajian'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50/70'
              }`}
              title={isAdmin ? 'Kelola Penggajian & Slip Gaji Karyawan' : 'Lihat Slip Gaji Saya'}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Penggajian' : 'Slip Gaji'}</span>
            </button>

            {/* Pembelian Bahan Laundry */}
            <button
              id="nav-bahan-btn"
              type="button"
              onClick={() => onTabChange('bahan')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentTab === 'bahan'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 hover:text-indigo-900 bg-indigo-50/70'
              }`}
              title="Form Pembelian Bahan & Inventori Laundry"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Bahan Laundry</span>
            </button>
          </nav>

          {/* Right Header: Role Profile Badge + Shift Switcher + New Order */}
          <div className="flex items-center gap-2">
            {/* User Profile / Role Switcher Button */}
            <button
              type="button"
              onClick={onOpenLoginModal}
              className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-all cursor-pointer ${
                isAdmin
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100'
                  : 'bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100'
              }`}
              title="Klik untuk beralih akun atau ganti shift"
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] text-white shrink-0 ${
                  isAdmin ? 'bg-indigo-600' : 'bg-sky-600'
                }`}
              >
                {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
              </div>

              <div className="text-left hidden sm:block">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none">
                  {isAdmin ? '👑 Admin' : '👔 Pekerja'}
                </span>
                <span className="font-bold text-xs truncate max-w-[120px] block leading-tight">
                  {currentUser?.name || 'Pilih Akun'}
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Logout / Keluar Button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 transition-colors cursor-pointer"
                title="Keluar / Ganti Shift (Kembali ke Halaman Login)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Quick Action: New Order */}
            <button
              id="quick-new-order-btn"
              type="button"
              onClick={() => onTabChange('kasir')}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-sky-600/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Pesanan Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden border-t border-slate-200 bg-white/95 px-2 py-2 flex justify-around text-xs">
        <button
          type="button"
          onClick={() => onTabChange('kasir')}
          className={`flex flex-col items-center gap-1 py-1 px-1 rounded-lg font-bold text-[10px] ${
            currentTab === 'kasir' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Kasir</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('antrean')}
          className={`flex flex-col items-center gap-1 py-1 px-1 rounded-lg font-bold text-[10px] relative ${
            currentTab === 'antrean' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Antrean</span>
          {activeOrdersCount > 0 && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-sky-600 text-white text-[8px] flex items-center justify-center font-bold">
              {activeOrdersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('pelanggan')}
          className={`flex flex-col items-center gap-1 py-1 px-1 rounded-lg font-bold text-[10px] ${
            currentTab === 'pelanggan' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pelanggan</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('lacak')}
          className={`flex flex-col items-center gap-1 py-1 px-1 rounded-lg font-bold text-[10px] ${
            currentTab === 'lacak' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Lacak</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => onTabChange('layanan')}
            className={`flex flex-col items-center gap-1 py-1 px-1 rounded-lg font-bold text-[10px] ${
              currentTab === 'layanan' ? 'text-sky-600' : 'text-slate-500'
            }`}
            title="Tarif Layanan"
          >
            <Tag className="w-4 h-4" />
            <span>Tarif</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => onTabChange('laporan')}
            className={`flex flex-col items-center gap-1 py-1 px-1 rounded-lg font-bold text-[10px] ${
              currentTab === 'laporan' ? 'text-sky-600' : 'text-slate-500'
            }`}
            title="Laporan Omset"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Omset</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => onTabChange('karyawan')}
            className={`flex flex-col items-center gap-1 py-1 px-1 rounded-lg font-bold text-[10px] ${
              currentTab === 'karyawan' ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Staff</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onTabChange('penggajian')}
          className={`flex flex-col items-center gap-1 py-1 px-1 rounded-lg font-bold text-[10px] ${
            currentTab === 'penggajian' ? 'text-emerald-600' : 'text-slate-500'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>{isAdmin ? 'Gaji' : 'Slip'}</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('bahan')}
          className={`flex flex-col items-center gap-1 py-1 px-1 rounded-lg font-bold text-[10px] ${
            currentTab === 'bahan' ? 'text-indigo-600 font-black' : 'text-slate-500'
          }`}
          title="Bahan Laundry"
        >
          <Package className="w-4 h-4" />
          <span>Bahan</span>
        </button>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex flex-col items-center gap-1 py-1 px-1 rounded-lg font-bold text-[10px] text-rose-500 hover:text-rose-700"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        )}
      </div>
    </header>
  );
};
