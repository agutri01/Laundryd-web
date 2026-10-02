import React, { useState } from 'react';
import { AppUser, UserRole } from '../types.ts';
import {
  Shield,
  Briefcase,
  KeyRound,
  User,
  Lock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  users: AppUser[];
  currentUser: AppUser | null;
  onLogin: (credentials: { username?: string; password?: string; pin?: string }) => Promise<void>;
  onClose?: () => void;
  canClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  users,
  currentUser,
  onLogin,
  onClose,
  canClose = true,
}) => {
  const [activeTab, setActiveTab] = useState<'pin' | 'credentials'>('pin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Masukkan username');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await onLogin({ username: username.trim(), password });
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Kombinasi username atau password salah.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg('Masukkan PIN');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await onLogin({ pin: pin.trim() });
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'PIN kasir tidak cocok.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">Masuk Sistem & Hak Akses</h3>
              <p className="text-[11px] text-slate-300">Pilih akun peran Administrator atau Pekerja</p>
            </div>
          </div>
          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'pin'
                ? 'border-sky-600 text-sky-700 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🔢 Masuk PIN Kasir
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'credentials'
                ? 'border-sky-600 text-sky-700 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🔑 Username & Password
          </button>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick PIN Tab */}
          {activeTab === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                Ketik 4-digit PIN staff/admin Anda untuk masuk ke sistem:
              </p>

              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full py-4 text-center text-3xl font-mono tracking-widest bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 font-bold"
                />
                <span className="block text-[11px] text-slate-400 text-center mt-1.5">
                  Contoh PIN: 1234 (Admin), 1111 (Siti/Kasir), 2222 (Agus/Cuci)
                </span>
              </div>

              {/* Number pad buttons for tablet/pos usage */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'C') {
                        setPin('');
                      } else if (key === 'OK') {
                        if (pin) handlePinSubmit({ preventDefault: () => {} } as any);
                      } else {
                        if (pin.length < 6) setPin((prev) => prev + key);
                      }
                    }}
                    className={`py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
                      key === 'OK'
                        ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-md shadow-sky-600/20'
                        : key === 'C'
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || !pin}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Memverifikasi...' : 'Masuk dengan PIN'}
              </button>
            </form>
          )}

          {/* Credentials Tab */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin atau siti"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <span className="block text-[10px] text-slate-400 mt-1">
                  Default password: <code className="bg-slate-100 px-1 rounded">admin</code> untuk admin atau <code className="bg-slate-100 px-1 rounded">pekerja</code> untuk pekerja.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all disabled:opacity-60"
                >
                  {isLoading ? 'Memproses...' : 'Masuk Sekarang'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
