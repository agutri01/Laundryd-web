import React, { useState, useEffect } from 'react';
import { AppUser, LaundrySettings } from '../types';
import {
  Sparkles,
  Shield,
  Briefcase,
  KeyRound,
  User,
  Lock,
  ArrowRight,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  EyeOff,
  Store,
  MapPin,
  Phone,
  AlertCircle,
  Delete,
} from 'lucide-react';

interface LoginScreenProps {
  users: AppUser[];
  settings: LaundrySettings;
  onLogin: (credentials: { username?: string; password?: string; pin?: string }) => Promise<void>;
  onGuestTrack: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  settings,
  onLogin,
  onGuestTrack,
}) => {
  const [loginMode, setLoginMode] = useState<'pin' | 'password'>('pin');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateClock = (d: Date) => {
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTimeClock = (d: Date) => {
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Trigger error shake
  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  // Handle PIN input
  const handlePinDigit = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    // Auto submit when 4 digits match an active user
    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handlePinClear = () => {
    setPin('');
    setError(null);
  };

  const submitPin = async (pinToSubmit: string) => {
    if (!pinToSubmit) {
      triggerError('Masukkan 4 digit PIN Anda');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onLogin({ pin: pinToSubmit });
    } catch (err: any) {
      triggerError(err.message || 'PIN salah. Silakan coba lagi.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Form Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      triggerError('Masukkan username');
      return;
    }
    if (!password.trim()) {
      triggerError('Masukkan kata sandi');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onLogin({ username, password });
    } catch (err: any) {
      triggerError(err.message || 'Username atau password salah.');
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard support for PIN entry
  useEffect(() => {
    if (loginMode !== 'pin') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an input element
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Escape') {
        handlePinClear();
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          submitPin(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginMode, pin]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-sky-600/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none translate-y-1/3" />

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-sky-600/30">
            🧺
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
              <span>{settings.shopName}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                Online POS
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span className="truncate max-w-[280px] sm:max-w-md">{settings.shopAddress}</span>
            </p>
          </div>
        </div>

        {/* Live Clock & Shift indicator */}
        <div className="hidden sm:flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>{formatTimeClock(currentTime)} WIB</span>
          </div>
          <span className="text-[11px] text-slate-400">{formatDateClock(currentTime)}</span>
        </div>
      </header>

      {/* Main Content: Center Portal */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 py-6 sm:py-10 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Brand, Info, & Quick Profile Selector */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sistem Operasional & Kasir Laundry</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Portal Masuk Staf & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
                  Manajemen Outlet
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
                Silakan masukkan PIN kasir atau login menggunakan akun staf untuk mengoperasikan kasir POS, antrean cucian, dan pengelolaan laundry.
              </p>
            </div>

            {/* Operational & Security Highlights */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Akses Kasir Cepat dengan PIN</span>
                  <span className="text-slate-400 text-[11px]">Gunakan PIN kasir 4-6 digit untuk login shift cepat tanpa mengetik password panjang.</span>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-xs text-slate-300 border-t border-slate-800/60 pt-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Keamanan Akun & Hak Akses Bertingkat</span>
                  <span className="text-slate-400 text-[11px]">Akses kasir POS dan antrean cucian terbuka untuk staf shift. Fitur rekap omset dan penggajian dilindungi akun Administrator.</span>
                </div>
              </div>
            </div>

            {/* Public Customer Tracking Banner */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <Search className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  Pelanggan ingin cek status cucian tanpa login?
                </span>
              </div>
              <button
                type="button"
                onClick={onGuestTrack}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-300 hover:text-white transition-colors shrink-0"
              >
                Lacak Pesanan
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Login Box (PIN / Password) */}
          <div className="lg:col-span-6 flex justify-center">
            <div
              className={`w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative ${
                shake ? 'animate-bounce' : ''
              }`}
            >
              {/* Login Mode Toggle Tabs */}
              <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('pin');
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    loginMode === 'pin'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" /> PIN Kasir Cepat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('password');
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    loginMode === 'password'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" /> Username & Password
                </button>
              </div>

              {/* Error Alert Box */}
              {error && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* TAB 1: PIN NUMPAD MODE */}
              {loginMode === 'pin' && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-xs text-slate-400">
                      Ketik 4-6 digit PIN Kasir atau klik tombol angka di bawah:
                    </p>

                    {/* PIN Dots Display */}
                    <div className="flex items-center justify-center gap-3 py-3">
                      {[0, 1, 2, 3].map((index) => (
                        <div
                          key={index}
                          className={`w-4 h-4 rounded-full transition-all duration-200 ${
                            pin.length > index
                              ? 'bg-sky-400 scale-125 shadow-lg shadow-sky-400/50'
                              : 'bg-slate-800 border border-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="h-4">
                      {pin.length > 0 && (
                        <span className="font-mono text-xs text-slate-500 tracking-widest">
                          {pin.replace(/./g, '● ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Virtual Numpad Grid */}
                  <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handlePinDigit(digit)}
                        disabled={isLoading}
                        className="h-14 rounded-2xl bg-slate-950 hover:bg-slate-800 active:scale-95 border border-slate-800 hover:border-slate-700 text-white font-mono text-xl font-bold transition-all flex items-center justify-center cursor-pointer select-none"
                      >
                        {digit}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={handlePinClear}
                      disabled={isLoading || pin.length === 0}
                      className="h-14 rounded-2xl bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold transition-all flex items-center justify-center cursor-pointer select-none"
                      title="Hapus Semua"
                    >
                      C
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePinDigit('0')}
                      disabled={isLoading}
                      className="h-14 rounded-2xl bg-slate-950 hover:bg-slate-800 active:scale-95 border border-slate-800 hover:border-slate-700 text-white font-mono text-xl font-bold transition-all flex items-center justify-center cursor-pointer select-none"
                    >
                      0
                    </button>

                    <button
                      type="button"
                      onClick={handlePinBackspace}
                      disabled={isLoading || pin.length === 0}
                      className="h-14 rounded-2xl bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs font-bold transition-all flex items-center justify-center cursor-pointer select-none"
                      title="Hapus 1 Digit"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={() => submitPin(pin)}
                    disabled={isLoading || pin.length === 0}
                    className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Memverifikasi PIN...
                      </span>
                    ) : (
                      <>
                        <span>Masuk ke Kasir</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-slate-500">
                    💡 Tips: Anda juga bisa mengetikkan angka langsung dari keyboard laptop / PC.
                  </p>
                </div>
              )}

              {/* TAB 2: USERNAME & PASSWORD MODE */}
              {loginMode === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Contoh: admin atau siti"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-sky-500 transition-colors"
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Kata Sandi
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan password Anda"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-sky-500 transition-colors"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 mt-2"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Memproses...
                      </span>
                    ) : (
                      <>
                        <span>Masuk dengan Akun</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-[11px] text-slate-500 text-center space-y-1">
                    <p>Default akun Admin: <code>admin</code> / <code>admin</code></p>
                    <p>Default akun Pekerja: <code>siti</code> / <code>pekerja</code></p>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Footer Information */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {settings.shopName} &copy; {new Date().getFullYear()} &bull; Aplikasi Kasir & Pelacak Laundry
          </span>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-sky-400" /> {settings.shopPhone}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Store className="w-3 h-3 text-indigo-400" /> Cabang Utama
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
