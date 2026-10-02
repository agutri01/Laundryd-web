import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  DEFAULT_SERVICES,
  DEFAULT_SETTINGS,
  INITIAL_SAMPLE_ORDERS,
  DEFAULT_CUSTOMERS,
  DEFAULT_USERS,
  DEFAULT_PAYROLLS,
  DEFAULT_EXPENSES,
  DEFAULT_ATTENDANCE,
} from './src/data/defaultData.ts';
import {
  AppUser,
  Customer,
  DepositTransaction,
  LaundryOrder,
  LaundryService,
  LaundrySettings,
  LaundryStage,
  PayrollItem,
  SalaryConfig,
  STAGE_CONFIG,
  ExpenseItem,
  AttendanceRecord,
  ServerHealthInfo,
} from './src/types.ts';
import { generatePhpMyAdminSql } from './src/utils/sqlExporter.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.resolve(process.cwd(), 'data', 'db.json');
const SERVER_START_TIME = Date.now();

// Interface for DB storage
interface DatabaseSchema {
  orders: LaundryOrder[];
  customers: Customer[];
  services: LaundryService[];
  settings: LaundrySettings;
  users: AppUser[];
  payrolls: PayrollItem[];
  expenses: ExpenseItem[];
  attendances: AttendanceRecord[];
}

// Ensure DB directory & initial file exist with all relational collections
function initDb(): DatabaseSchema {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      let updated = false;

      // Ensure orders exists
      if (!parsed.orders) {
        parsed.orders = INITIAL_SAMPLE_ORDERS;
        updated = true;
      }
      // Ensure customers exists
      if (!parsed.customers) {
        parsed.customers = DEFAULT_CUSTOMERS;
        updated = true;
      }
      // Ensure services exists
      if (!parsed.services) {
        parsed.services = DEFAULT_SERVICES;
        updated = true;
      }
      // Ensure settings exists
      if (!parsed.settings) {
        parsed.settings = DEFAULT_SETTINGS;
        updated = true;
      }
      // Ensure users exists
      if (!parsed.users || parsed.users.length === 0) {
        parsed.users = DEFAULT_USERS;
        updated = true;
      }
      // Ensure payrolls exists
      if (!parsed.payrolls || parsed.payrolls.length === 0) {
        parsed.payrolls = DEFAULT_PAYROLLS;
        updated = true;
      }
      // Ensure expenses exists
      if (!parsed.expenses || parsed.expenses.length === 0) {
        parsed.expenses = DEFAULT_EXPENSES;
        updated = true;
      }
      // Ensure attendances exists
      if (!parsed.attendances || parsed.attendances.length === 0) {
        parsed.attendances = DEFAULT_ATTENDANCE;
        updated = true;
      }

      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }
      return parsed;
    }
  } catch (err) {
    console.warn('Failed reading db.json, initializing with default data:', err);
  }

  const initialDb: DatabaseSchema = {
    orders: INITIAL_SAMPLE_ORDERS,
    customers: DEFAULT_CUSTOMERS,
    services: DEFAULT_SERVICES,
    settings: DEFAULT_SETTINGS,
    users: DEFAULT_USERS,
    payrolls: DEFAULT_PAYROLLS,
    expenses: DEFAULT_EXPENSES,
    attendances: DEFAULT_ATTENDANCE,
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing initial db.json:', err);
  }

  return initialDb;
}

let db = initDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving db.json:', e);
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d} hari`);
  if (h > 0) parts.push(`${h} jam`);
  if (m > 0) parts.push(`${m} menit`);
  parts.push(`${s} detik`);
  return parts.join(' ');
}

// Core Express Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware for all /api endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API ${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
  }
  next();
});

// Auth Token / User extraction helper
interface AuthenticatedRequest extends Request {
  user?: AppUser;
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const userHeaderId = req.headers['x-user-id'] as string;
  const userHeaderRole = req.headers['x-user-role'] as string;

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Look up user by token (token format: "tok_<userId>_<timestamp>") or fallback to x-user-id header
  let matchedUser: AppUser | undefined;

  if (token && token.startsWith('tok_')) {
    const parts = token.split('_');
    const userId = parts[1];
    matchedUser = db.users.find((u) => u.id === userId && u.isActive);
  }

  if (!matchedUser && userHeaderId) {
    matchedUser = db.users.find((u) => u.id === userHeaderId && u.isActive);
  }

  // If no user found, but dev/header has role
  if (!matchedUser && userHeaderRole) {
    matchedUser = db.users.find((u) => u.role === userHeaderRole && u.isActive);
  }

  req.user = matchedUser;
  next();
};

const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Autentikasi Diperlukan',
      message: 'Silakan login terlebih dahulu untuk mengakses sistem.',
    });
  }
  next();
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Autentikasi Diperlukan',
      message: 'Silakan login terlebih dahulu sebagai Administrator.',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Akses Ditolak',
      message: 'Aksi ini memerlukan Hak Akses Administrator. Akun Pekerja tidak diizinkan.',
    });
  }
  next();
};

app.use('/api', authMiddleware);

// ==========================================
// 1. HEALTH & SYSTEM DIAGNOSTICS APIs
// ==========================================

// Complete server health check
app.get('/api/health', (req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  const mem = process.memoryUsage();

  const healthData: ServerHealthInfo = {
    status: 'healthy',
    uptimeSeconds,
    uptimeFormatted: formatUptime(uptimeSeconds),
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    memoryUsageMB: {
      rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(mem.external / 1024 / 1024 * 100) / 100,
    },
    dbStats: {
      orders: db.orders ? db.orders.length : 0,
      customers: db.customers ? db.customers.length : 0,
      services: db.services ? db.services.length : 0,
      users: db.users ? db.users.length : 0,
      payrolls: db.payrolls ? db.payrolls.length : 0,
      expenses: db.expenses ? db.expenses.length : 0,
      attendances: db.attendances ? db.attendances.length : 0,
    },
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  };

  res.json(healthData);
});

// Detailed system & environment info
app.get('/api/system/info', (req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  res.json({
    appName: 'D laundry POS & Management System',
    backendEngine: 'Node.js & Express REST API',
    nodeVersion: process.version,
    platform: `${process.platform} (${process.arch})`,
    processId: process.pid,
    uptime: formatUptime(uptimeSeconds),
    uptimeSeconds,
    startTime: new Date(SERVER_START_TIME).toISOString(),
    currentTime: new Date().toISOString(),
    databasePath: DB_FILE,
    databaseEngine: 'File-based JSON with MySQL / phpMyAdmin SQL Dump compatibility',
    features: [
      'POS & Transaksi Kasir',
      'Pelacakan Cucian (Order Tracking)',
      'Database phpMyAdmin / MySQL Exporter',
      'Manajemen Pelanggan & Saldo Deposit',
      'Manajemen Karyawan & Hak Akses (RBAC)',
      'Penggajian Karyawan & Slip Gaji (Payroll)',
      'Manajemen Biaya Operasional (Expenses)',
      'Absensi Karyawan & Shift Kerja (Attendance)',
      'Generator Pesan WhatsApp Resmi',
      'Pencadangan & Pemulihan (Backup & Restore)',
    ],
  });
});

// List of all registered backend REST API routes
app.get('/api/system/routes', (req: Request, res: Response) => {
  const routes = [
    { method: 'GET', path: '/api/health', desc: 'Status kesehatan server & memori' },
    { method: 'GET', path: '/api/system/info', desc: 'Informasi runtime Node.js & aplikasi' },
    { method: 'GET', path: '/api/system/routes', desc: 'Daftar rute REST API yang tersedia' },
    { method: 'POST', path: '/api/auth/login', desc: 'Login akun dengan username/password atau PIN' },
    { method: 'GET', path: '/api/auth/me', desc: 'Periksa sesi login saat ini' },
    { method: 'POST', path: '/api/auth/logout', desc: 'Keluar dari sesi' },
    { method: 'GET', path: '/api/users', desc: 'Daftar karyawan & staff' },
    { method: 'POST', path: '/api/users', desc: 'Tambah karyawan baru (Admin only)' },
    { method: 'PUT', path: '/api/users/:id', desc: 'Edit data karyawan (Admin only)' },
    { method: 'DELETE', path: '/api/users/:id', desc: 'Hapus karyawan (Admin only)' },
    { method: 'PUT', path: '/api/users/:id/salary-config', desc: 'Ubah konfigurasi gaji karyawan' },
    { method: 'GET', path: '/api/orders', desc: 'Daftar semua pesanan cucian (bisa filter)' },
    { method: 'GET', path: '/api/orders/:id', desc: 'Detail satu pesanan' },
    { method: 'GET', path: '/api/orders/track/:query', desc: 'Pelacakan publik nota/no HP tanpa login' },
    { method: 'GET', path: '/api/orders/stats/summary', desc: 'Ringkasan statistik keuangan & pengerjaan' },
    { method: 'POST', path: '/api/orders', desc: 'Buat pesanan baru' },
    { method: 'PUT', path: '/api/orders/:id', desc: 'Perbarui seluruh isi pesanan' },
    { method: 'PUT', path: '/api/orders/:id/stage', desc: 'Perbarui tahapan status cucian' },
    { method: 'PUT', path: '/api/orders/:id/payment', desc: 'Perbarui status pembayaran' },
    { method: 'DELETE', path: '/api/orders/:id', desc: 'Hapus pesanan (Admin only)' },
    { method: 'GET', path: '/api/customers', desc: 'Daftar pelanggan' },
    { method: 'GET', path: '/api/customers/:id', desc: 'Detail pelanggan & riwayat deposit' },
    { method: 'POST', path: '/api/customers', desc: 'Tambah pelanggan baru' },
    { method: 'PUT', path: '/api/customers/:id', desc: 'Perbarui data pelanggan' },
    { method: 'DELETE', path: '/api/customers/:id', desc: 'Hapus pelanggan (Admin only)' },
    { method: 'POST', path: '/api/customers/:id/deposit', desc: 'Top up atau pemotongan saldo deposit' },
    { method: 'GET', path: '/api/services', desc: 'Katalog tarif & paket layanan' },
    { method: 'POST', path: '/api/services', desc: 'Tambah layanan baru (Admin only)' },
    { method: 'PUT', path: '/api/services/:id', desc: 'Perbarui satu paket layanan (Admin only)' },
    { method: 'PUT', path: '/api/services', desc: 'Simpan massal daftar layanan (Admin only)' },
    { method: 'DELETE', path: '/api/services/:id', desc: 'Hapus paket layanan (Admin only)' },
    { method: 'GET', path: '/api/payrolls', desc: 'Daftar slip gaji payroll' },
    { method: 'POST', path: '/api/payrolls', desc: 'Buat slip gaji baru (Admin only)' },
    { method: 'PUT', path: '/api/payrolls/:id', desc: 'Perbarui slip gaji (Admin only)' },
    { method: 'DELETE', path: '/api/payrolls/:id', desc: 'Hapus slip gaji (Admin only)' },
    { method: 'GET', path: '/api/expenses', desc: 'Daftar pengeluaran operasional' },
    { method: 'POST', path: '/api/expenses', desc: 'Catat pengeluaran baru' },
    { method: 'PUT', path: '/api/expenses/:id', desc: 'Perbarui catatan pengeluaran' },
    { method: 'DELETE', path: '/api/expenses/:id', desc: 'Hapus catatan pengeluaran' },
    { method: 'GET', path: '/api/attendance', desc: 'Daftar absensi kehadiran karyawan' },
    { method: 'POST', path: '/api/attendance/check-in', desc: 'Check-in absensi masuk kerja' },
    { method: 'POST', path: '/api/attendance/check-out', desc: 'Check-out absensi selesai kerja' },
    { method: 'GET', path: '/api/whatsapp/templates', desc: 'Format pesan otomatis WhatsApp' },
    { method: 'POST', path: '/api/whatsapp/generate', desc: 'Buat tautan & teks pesan WA untuk pesanan' },
    { method: 'GET', path: '/api/settings', desc: 'Pengaturan identitas outlet' },
    { method: 'PUT', path: '/api/settings', desc: 'Simpan pengaturan outlet (Admin only)' },
    { method: 'GET', path: '/api/database/export-sql', desc: 'Unduh file .SQL siap import ke phpMyAdmin' },
    { method: 'GET', path: '/api/database/schema-sql', desc: 'Salin kode mentah SQL MySQL' },
    { method: 'GET', path: '/api/database/stats', desc: 'Statistik tabel & jumlah baris relasional' },
    { method: 'GET', path: '/api/backup', desc: 'Unduh cadangan data lengkap (JSON)' },
    { method: 'POST', path: '/api/backup/restore', desc: 'Pulihkan data sistem dari backup JSON' },
    { method: 'POST', path: '/api/reset', desc: 'Reset sistem ke data sampel bawaan (Admin only)' },
  ];
  res.json({ totalRoutes: routes.length, routes });
});

// ==========================================
// 2. AUTH & USER MANAGEMENT APIs
// ==========================================

// Login with Username/Password or quick PIN
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password, pin } = req.body;

  let user: AppUser | undefined;

  if (pin) {
    // Quick PIN login (common for POS touch terminals)
    user = db.users.find((u) => u.pin === String(pin) && u.isActive);
  } else if (username) {
    user = db.users.find(
      (u) =>
        u.username.toLowerCase() === String(username).toLowerCase() &&
        u.isActive &&
        (!password || u.password === password)
    );
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Kombinasi Username/Password atau PIN tidak valid atau akun dinonaktifkan.',
    });
  }

  const token = `tok_${user.id}_${Date.now()}`;
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      phone: user.phone,
      assignedStation: user.assignedStation,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
    token,
  });
});

// Check current session
app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: req.user,
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Berhasil keluar dari sesi.' });
});

// Get staff list
app.get('/api/users', (req: AuthenticatedRequest, res: Response) => {
  const safeUsers = db.users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    phone: u.phone,
    assignedStation: u.assignedStation,
    isActive: u.isActive,
    hasPin: Boolean(u.pin),
    salaryConfig: u.salaryConfig,
    createdAt: u.createdAt,
  }));
  res.json(safeUsers);
});

// Get single staff by ID
app.get('/api/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Staff tidak ditemukan.' });
  }
  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone,
    assignedStation: user.assignedStation,
    isActive: user.isActive,
    hasPin: Boolean(user.pin),
    salaryConfig: user.salaryConfig,
    createdAt: user.createdAt,
  });
});

// Add new staff/worker (Admin only)
app.post('/api/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { username, name, role, phone, pin, password, assignedStation, salaryConfig } = req.body;

  if (!username || !name) {
    return res.status(400).json({ message: 'Username dan Nama wajib diisi' });
  }

  const existing = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return res.status(400).json({ message: `Username "${username}" sudah digunakan.` });
  }

  const newUser: AppUser = {
    id: `usr-${Date.now()}`,
    username: username.toLowerCase().trim(),
    name: name.trim(),
    role: role === 'admin' ? 'admin' : 'pekerja',
    phone: phone ? phone.trim() : undefined,
    pin: pin ? String(pin).trim() : '1234',
    password: password || 'pekerja123',
    isActive: true,
    assignedStation: assignedStation || 'semua',
    salaryConfig: salaryConfig || {
      baseSalary: 2300000,
      mealAllowance: 350000,
      transportAllowance: 250000,
    },
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDb();

  res.status(201).json({
    success: true,
    user: newUser,
    message: `Pekerja/Staff "${newUser.name}" berhasil didaftarkan.`,
  });
});

// Update staff/worker (Admin only)
app.put('/api/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, role, phone, pin, password, isActive, assignedStation, salaryConfig } = req.body;

  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Staff tidak ditemukan.' });
  }

  // Prevent disabling the last admin
  if (db.users[idx].role === 'admin' && (isActive === false || role === 'pekerja')) {
    const adminCount = db.users.filter((u) => u.role === 'admin' && u.isActive).length;
    if (adminCount <= 1) {
      return res.status(400).json({
        message: 'Tidak dapat menonaktifkan atau mengubah peran Administrator terakhir.',
      });
    }
  }

  db.users[idx] = {
    ...db.users[idx],
    ...(name !== undefined && { name: name.trim() }),
    ...(role !== undefined && { role }),
    ...(phone !== undefined && { phone }),
    ...(pin !== undefined && { pin: String(pin).trim() }),
    ...(password !== undefined && { password }),
    ...(isActive !== undefined && { isActive }),
    ...(assignedStation !== undefined && { assignedStation }),
    ...(salaryConfig !== undefined && { salaryConfig }),
  };

  saveDb();
  res.json({
    success: true,
    user: db.users[idx],
    message: 'Data staff berhasil diperbarui.',
  });
});

// Delete staff/worker (Admin only)
app.delete('/api/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const target = db.users.find((u) => u.id === id);

  if (!target) {
    return res.status(404).json({ message: 'Staff tidak ditemukan.' });
  }

  if (target.role === 'admin') {
    const adminCount = db.users.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'Tidak dapat menghapus Administrator utama.' });
    }
  }

  db.users = db.users.filter((u) => u.id !== id);
  saveDb();
  res.json({ success: true, message: `Staff "${target.name}" berhasil dihapus.` });
});

// Update employee salary config directly (Admin only)
app.put('/api/users/:id/salary-config', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const salaryConfig: SalaryConfig = req.body;

  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Karyawan tidak ditemukan.' });
  }

  db.users[idx].salaryConfig = {
    ...db.users[idx].salaryConfig,
    ...salaryConfig,
  };

  saveDb();
  res.json({
    success: true,
    user: db.users[idx],
    message: `Pengaturan gaji ${db.users[idx].name} berhasil disimpan.`,
  });
});

// ==========================================
// 3. PAYROLL / PENGGAJIAN APIs
// ==========================================

// Get payrolls (Admin: all, Worker: own payrolls only)
app.get('/api/payrolls', (req: AuthenticatedRequest, res: Response) => {
  if (!db.payrolls) db.payrolls = DEFAULT_PAYROLLS;

  if (req.user?.role === 'admin') {
    return res.json(db.payrolls);
  }

  // If worker, only show their own salary slips
  const userPayrolls = db.payrolls.filter(
    (p) => p.userId === req.user?.id || p.userName.toLowerCase().includes(req.user?.username.toLowerCase() || '')
  );
  res.json(userPayrolls);
});

// Get single payroll by ID
app.get('/api/payrolls/:id', (req: AuthenticatedRequest, res: Response) => {
  if (!db.payrolls) db.payrolls = DEFAULT_PAYROLLS;
  const payroll = db.payrolls.find((p) => p.id === req.params.id);
  if (!payroll) {
    return res.status(404).json({ message: 'Data slip penggajian tidak ditemukan.' });
  }
  res.json(payroll);
});

// Create new payroll record (Admin only)
app.post('/api/payrolls', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const payrollData: Partial<PayrollItem> = req.body;

  if (!payrollData.userId || !payrollData.period) {
    return res.status(400).json({ message: 'Pilih karyawan dan tentukan periode penggajian.' });
  }

  const staff = db.users.find((u) => u.id === payrollData.userId);
  const now = new Date();
  const periodCode = (payrollData.period || '2026').replace(/\s+/g, '').slice(0, 6);
  const randomSeq = Math.floor(100 + Math.random() * 900);

  const newPayroll: PayrollItem = {
    id: payrollData.id || `PAY-${periodCode}-${randomSeq}`,
    userId: payrollData.userId,
    userName: payrollData.userName || staff?.name || 'Karyawan Laundry',
    userRole: payrollData.userRole || staff?.role || 'pekerja',
    userStation: payrollData.userStation || staff?.assignedStation || 'semua',
    userPhone: payrollData.userPhone || staff?.phone,
    period: payrollData.period,
    paymentDate: payrollData.paymentDate || now.toISOString().split('T')[0],
    status: payrollData.status || 'draft',
    paymentMethod: payrollData.paymentMethod || 'transfer',

    // Incomes
    baseSalary: Number(payrollData.baseSalary) || 0,
    allowance: Number(payrollData.allowance) || 0,
    allowanceNotes: payrollData.allowanceNotes,
    overtimeHours: Number(payrollData.overtimeHours) || 0,
    overtimePay: Number(payrollData.overtimePay) || 0,
    commissionTotal: Number(payrollData.commissionTotal) || 0,
    commissionNotes: payrollData.commissionNotes,
    bonus: Number(payrollData.bonus) || 0,
    bonusNotes: payrollData.bonusNotes,
    totalIncome: Number(payrollData.totalIncome) || 0,

    // Deductions
    kasbonDeduction: Number(payrollData.kasbonDeduction) || 0,
    absenceDeduction: Number(payrollData.absenceDeduction) || 0,
    otherDeduction: Number(payrollData.otherDeduction) || 0,
    otherDeductionNotes: payrollData.otherDeductionNotes,
    totalDeduction: Number(payrollData.totalDeduction) || 0,

    // Net
    netSalary: Number(payrollData.netSalary) || 0,

    bankName: payrollData.bankName || staff?.salaryConfig?.bankName,
    bankAccount: payrollData.bankAccount || staff?.salaryConfig?.bankAccount,
    notes: payrollData.notes,
    createdAt: new Date().toISOString(),
    paidAt: payrollData.status === 'lunas' ? (payrollData.paidAt || new Date().toISOString()) : undefined,
    paidByAdminName: payrollData.status === 'lunas' ? (req.user?.name || 'Admin') : undefined,
  };

  if (!db.payrolls) db.payrolls = [];
  db.payrolls.unshift(newPayroll);
  saveDb();

  res.status(201).json({
    success: true,
    payroll: newPayroll,
    message: `Slip gaji ${newPayroll.userName} untuk periode ${newPayroll.period} berhasil dibuat.`,
  });
});

// Update payroll record (Admin only)
app.put('/api/payrolls/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData: Partial<PayrollItem> = req.body;

  if (!db.payrolls) db.payrolls = [];
  const idx = db.payrolls.findIndex((p) => p.id === id);

  if (idx === -1) {
    return res.status(404).json({ message: 'Data slip penggajian tidak ditemukan.' });
  }

  const existing = db.payrolls[idx];
  const newStatus = updateData.status !== undefined ? updateData.status : existing.status;

  const updatedPayroll: PayrollItem = {
    ...existing,
    ...updateData,
    status: newStatus,
    paidAt: newStatus === 'lunas' ? (updateData.paidAt || existing.paidAt || new Date().toISOString()) : undefined,
    paidByAdminName: newStatus === 'lunas' ? (existing.paidByAdminName || req.user?.name || 'Admin') : undefined,
  };

  db.payrolls[idx] = updatedPayroll;
  saveDb();

  res.json({
    success: true,
    payroll: updatedPayroll,
    message: `Penggajian ${updatedPayroll.id} berhasil diperbarui.`,
  });
});

// Delete payroll record (Admin only)
app.delete('/api/payrolls/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (!db.payrolls) db.payrolls = [];

  const target = db.payrolls.find((p) => p.id === id);
  if (!target) {
    return res.status(404).json({ message: 'Data slip penggajian tidak ditemukan.' });
  }

  db.payrolls = db.payrolls.filter((p) => p.id !== id);
  saveDb();

  res.json({
    success: true,
    message: `Data slip gaji ${target.id} (${target.userName}) berhasil dihapus.`,
  });
});

// ==========================================
// 4. ORDERS & TRANSACTION APIs
// ==========================================

// Get orders with optional search, stage filter, and paymentStatus filter
app.get('/api/orders', (req: Request, res: Response) => {
  let result = [...db.orders];
  const { stage, paymentStatus, search } = req.query;

  if (stage && typeof stage === 'string') {
    result = result.filter((o) => o.stage === stage);
  }

  if (paymentStatus && typeof paymentStatus === 'string') {
    result = result.filter((o) => o.paymentStatus === paymentStatus);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    result = result.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        o.perfume.toLowerCase().includes(q)
    );
  }

  res.json(result);
});

// Analytics & Dashboard Summary
app.get('/api/orders/stats/summary', (req: Request, res: Response) => {
  const orders = db.orders || [];
  const todayStr = new Date().toISOString().split('T')[0];

  const todayOrders = orders.filter((o) => o.createdAt.startsWith(todayStr));
  const todayRevenue = todayOrders.filter((o) => o.paymentStatus === 'lunas').reduce((acc, o) => acc + o.total, 0);
  const totalRevenue = orders.filter((o) => o.paymentStatus === 'lunas').reduce((acc, o) => acc + o.total, 0);
  const unpaidTotal = orders.filter((o) => o.paymentStatus === 'belum_lunas').reduce((acc, o) => acc + o.total, 0);

  const stageCounts: Record<string, number> = {
    diterima: 0,
    dicuci: 0,
    dikeringkan: 0,
    disetrika: 0,
    siap_ambil: 0,
    selesai: 0,
  };

  orders.forEach((o) => {
    if (stageCounts[o.stage] !== undefined) {
      stageCounts[o.stage]++;
    }
  });

  res.json({
    totalOrdersCount: orders.length,
    todayOrdersCount: todayOrders.length,
    todayRevenue,
    totalRevenue,
    unpaidTotal,
    stageCounts,
    activeOrdersCount: orders.length - (stageCounts['selesai'] || 0),
  });
});

// Public Tracking API (search by Order ID or Customer Phone without requiring login)
app.get('/api/orders/track/:query', (req: Request, res: Response) => {
  const query = req.params.query.trim().toLowerCase();
  const digitsOnly = query.replace(/\D/g, '');

  const matches = db.orders.filter((o) => {
    const idMatch = o.id.toLowerCase() === query || o.id.toLowerCase().replace(/\D/g, '') === digitsOnly;
    const phoneMatch = digitsOnly.length >= 4 && o.customer.phone.replace(/\D/g, '').includes(digitsOnly);
    return idMatch || phoneMatch;
  });

  if (matches.length === 0) {
    return res.status(404).json({
      success: false,
      message: `Tidak ditemukan pesanan dengan No. Nota atau No. HP "${req.params.query}".`,
    });
  }

  // Sanitize for public privacy (mask middle phone digits)
  const safeResults = matches.map((order) => {
    const rawPhone = order.customer.phone || '';
    const maskedPhone =
      rawPhone.length > 7
        ? rawPhone.slice(0, 4) + '****' + rawPhone.slice(-3)
        : rawPhone;

    return {
      id: order.id,
      customerName: order.customer.name,
      customerPhoneMasked: maskedPhone,
      stage: order.stage,
      stageLabel: STAGE_CONFIG[order.stage]?.label || order.stage,
      perfume: order.perfume,
      notes: order.notes,
      total: order.total,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      estimatedCompletion: order.estimatedCompletion,
      completedAt: order.completedAt,
      timeline: order.timeline,
      itemsCount: order.items.length,
      items: order.items.map((i) => ({
        serviceName: i.serviceName,
        quantity: i.quantity,
        unit: i.unit,
      })),
    };
  });

  res.json({
    success: true,
    totalMatches: safeResults.length,
    orders: safeResults,
  });
});

// Get single order by ID
app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
  }
  res.json(order);
});

// Create new order (Admin & Pekerja)
app.post('/api/orders', (req: AuthenticatedRequest, res: Response) => {
  const order: LaundryOrder = req.body;

  if (!order || !order.customer || !order.items || order.items.length === 0) {
    return res.status(400).json({ message: 'Data pesanan tidak lengkap.' });
  }

  // Prepend to orders
  db.orders.unshift(order);

  // Auto add to customers list if new
  const customerPhone = order.customer.phone.replace(/\D/g, '');
  const exists = db.customers.some(
    (c) => c.phone.replace(/\D/g, '') === customerPhone
  );

  if (!exists) {
    const newCust: Customer = {
      id: `cst-${Date.now()}`,
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.customer.address,
      depositBalance: 0,
      createdAt: new Date().toISOString(),
      depositHistory: [],
    };
    db.customers.unshift(newCust);
  }

  saveDb();
  res.status(201).json({ success: true, order });
});

// Update full order details (Admin & Pekerja)
app.put('/api/orders/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData: Partial<LaundryOrder> = req.body;

  const idx = db.orders.findIndex((o) => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
  }

  db.orders[idx] = {
    ...db.orders[idx],
    ...updateData,
  };

  saveDb();
  res.json({ success: true, order: db.orders[idx], message: 'Pesanan berhasil diperbarui.' });
});

// Update order stage (Admin & Pekerja)
app.put('/api/orders/:id/stage', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { stage, note } = req.body as { stage: LaundryStage; note?: string };

  const idx = db.orders.findIndex((o) => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
  }

  const now = new Date().toISOString();
  const stageLabel = STAGE_CONFIG[stage]?.label || stage;

  const timelineEvent = {
    stage,
    timestamp: now,
    note: note || `Status diperbarui menjadi ${stageLabel} oleh ${req.user?.name || 'Kasir/Pekerja'}`,
  };

  const updatedTimeline = [
    ...db.orders[idx].timeline.filter((t) => t.stage !== stage),
    timelineEvent,
  ];

  db.orders[idx] = {
    ...db.orders[idx],
    stage,
    completedAt: stage === 'selesai' ? now : db.orders[idx].completedAt,
    timeline: updatedTimeline,
  };

  saveDb();
  res.json({ success: true, order: db.orders[idx] });
});

// Update order payment status (Admin & Pekerja)
app.put('/api/orders/:id/payment', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { paymentStatus, paymentMethod } = req.body;

  const idx = db.orders.findIndex((o) => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
  }

  const nextStatus = paymentStatus || (db.orders[idx].paymentStatus === 'lunas' ? 'belum_lunas' : 'lunas');
  db.orders[idx].paymentStatus = nextStatus;
  if (paymentMethod) {
    db.orders[idx].paymentMethod = paymentMethod;
  }

  saveDb();
  res.json({ success: true, order: db.orders[idx] });
});

// Delete order (Admin Only - Pekerja tidak boleh hapus)
app.delete('/api/orders/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const initialLength = db.orders.length;
  db.orders = db.orders.filter((o) => o.id !== id);

  if (db.orders.length === initialLength) {
    return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
  }

  saveDb();
  res.json({ success: true, message: `Pesanan ${id} berhasil dihapus oleh Admin.` });
});

// ==========================================
// 5. CUSTOMERS & DEPOSIT APIs
// ==========================================

// Get customers with optional name/phone search
app.get('/api/customers', (req: Request, res: Response) => {
  const { q } = req.query;
  if (q && typeof q === 'string') {
    const search = q.toLowerCase().trim();
    const filtered = db.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        (c.address && c.address.toLowerCase().includes(search))
    );
    return res.json(filtered);
  }
  res.json(db.customers);
});

// Get single customer by ID
app.get('/api/customers/:id', (req: Request, res: Response) => {
  const customer = db.customers.find((c) => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ message: 'Pelanggan tidak ditemukan' });
  }

  // Include customer order history
  const customerPhone = customer.phone.replace(/\D/g, '');
  const orders = db.orders.filter((o) => o.customer.phone.replace(/\D/g, '') === customerPhone);

  res.json({
    ...customer,
    totalOrders: orders.length,
    orders,
  });
});

// Create customer
app.post('/api/customers', (req: AuthenticatedRequest, res: Response) => {
  const customerData: Customer = req.body;
  if (!customerData.name || !customerData.phone) {
    return res.status(400).json({ message: 'Nama dan nomor telepon wajib diisi' });
  }

  const newCustomer: Customer = {
    ...customerData,
    id: customerData.id || `cst-${Date.now()}`,
    depositBalance: customerData.depositBalance || 0,
    depositHistory: customerData.depositHistory || [],
    createdAt: customerData.createdAt || new Date().toISOString(),
  };

  db.customers.unshift(newCustomer);
  saveDb();
  res.status(201).json({ success: true, customer: newCustomer });
});

// Update customer
app.put('/api/customers/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updatedData: Partial<Customer> = req.body;

  const idx = db.customers.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Pelanggan tidak ditemukan' });
  }

  db.customers[idx] = {
    ...db.customers[idx],
    ...updatedData,
  };

  saveDb();
  res.json({ success: true, customer: db.customers[idx] });
});

// Top up or deduct customer deposit
app.post('/api/customers/:id/deposit', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { type, amount, paymentMethod, notes, orderId } = req.body as {
    type: 'topup' | 'usage';
    amount: number;
    paymentMethod?: 'tunai' | 'qris' | 'transfer';
    notes?: string;
    orderId?: string;
  };

  const idx = db.customers.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Pelanggan tidak ditemukan' });
  }

  const customer = db.customers[idx];
  const currentBalance = customer.depositBalance || 0;
  let newBalance = currentBalance;

  if (type === 'topup') {
    newBalance += amount;
  } else if (type === 'usage') {
    if (currentBalance < amount) {
      return res.status(400).json({
        message: `Saldo deposit (${currentBalance}) tidak cukup untuk pembayaran ${amount}.`,
      });
    }
    newBalance -= amount;
  }

  const tx: DepositTransaction = {
    id: `dep-${Date.now()}`,
    type,
    amount,
    date: new Date().toISOString(),
    notes: notes || (type === 'topup' ? `Top Up Saldo via ${paymentMethod?.toUpperCase()}` : `Pembayaran Cucian #${orderId}`),
    paymentMethod,
    orderId,
  };

  const history = [tx, ...(customer.depositHistory || [])];

  db.customers[idx] = {
    ...customer,
    depositBalance: newBalance,
    depositHistory: history,
  };

  saveDb();
  res.json({
    success: true,
    depositBalance: newBalance,
    transaction: tx,
    customer: db.customers[idx],
  });
});

// Delete customer (Admin Only)
app.delete('/api/customers/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  db.customers = db.customers.filter((c) => c.id !== id);
  saveDb();
  res.json({ success: true, message: 'Pelanggan berhasil dihapus oleh Admin.' });
});

// ==========================================
// 6. SERVICES & SETTINGS APIs
// ==========================================

// Get services catalog
app.get('/api/services', (req: Request, res: Response) => {
  res.json(db.services);
});

// Get single service by ID
app.get('/api/services/:id', (req: Request, res: Response) => {
  const service = db.services.find((s) => s.id === req.params.id);
  if (!service) {
    return res.status(404).json({ message: 'Layanan tidak ditemukan' });
  }
  res.json(service);
});

// Add new service item (Admin Only)
app.post('/api/services', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const item: LaundryService = req.body;
  if (!item.name || !item.price || !item.unit) {
    return res.status(400).json({ message: 'Nama layanan, harga, dan satuan wajib diisi.' });
  }

  const newService: LaundryService = {
    ...item,
    id: item.id || `srv-${Date.now()}`,
    estimatedHours: item.estimatedHours || 24,
  };

  db.services.push(newService);
  saveDb();
  res.status(201).json({ success: true, service: newService, message: 'Layanan baru berhasil ditambahkan.' });
});

// Update specific service item (Admin Only)
app.put('/api/services/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData: Partial<LaundryService> = req.body;

  const idx = db.services.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Layanan tidak ditemukan' });
  }

  db.services[idx] = {
    ...db.services[idx],
    ...updateData,
  };

  saveDb();
  res.json({ success: true, service: db.services[idx], message: 'Layanan berhasil diperbarui.' });
});

// Bulk Save services catalog (Admin Only)
app.put('/api/services', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const services: LaundryService[] = req.body;
  if (!Array.isArray(services)) {
    return res.status(400).json({ message: 'Format data katalog layanan tidak valid.' });
  }

  db.services = services;
  saveDb();
  res.json({ success: true, services: db.services, message: 'Katalog tarif berhasil disimpan oleh Admin.' });
});

// Delete service item (Admin Only)
app.delete('/api/services/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const initialCount = db.services.length;
  db.services = db.services.filter((s) => s.id !== id);

  if (db.services.length === initialCount) {
    return res.status(404).json({ message: 'Layanan tidak ditemukan' });
  }

  saveDb();
  res.json({ success: true, message: 'Layanan berhasil dihapus.' });
});

// Get settings
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(db.settings);
});

// Update settings (Admin Only)
app.put('/api/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const newSettings: LaundrySettings = req.body;
  db.settings = { ...db.settings, ...newSettings };
  saveDb();
  res.json({ success: true, settings: db.settings, message: 'Pengaturan outlet berhasil diperbarui.' });
});

// ==========================================
// 7. OPERATIONAL EXPENSES (PENGELUARAN) APIs
// ==========================================

// Get all operational expenses
app.get('/api/expenses', (req: Request, res: Response) => {
  if (!db.expenses) db.expenses = DEFAULT_EXPENSES;
  res.json(db.expenses);
});

// Get expenses summary by category & period
app.get('/api/expenses/summary', (req: Request, res: Response) => {
  if (!db.expenses) db.expenses = DEFAULT_EXPENSES;

  const totalExpense = db.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const byCategory: Record<string, number> = {};

  db.expenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0);
  });

  res.json({
    totalExpense,
    count: db.expenses.length,
    byCategory,
  });
});

// Create new operational expense / laundry supplies purchase
app.post('/api/expenses', (req: AuthenticatedRequest, res: Response) => {
  const {
    category,
    title,
    amount,
    date,
    notes,
    itemName,
    quantity,
    unit,
    unitPrice,
    supplier,
    paymentMethod,
    paymentStatus,
    recordedBy,
  } = req.body;

  const displayTitle = title?.trim() || (itemName ? `Pembelian ${itemName}` : 'Pembelian Bahan Laundry');
  const totalAmount = Number(amount) || (Number(quantity) && Number(unitPrice) ? Number(quantity) * Number(unitPrice) : 0);

  if (!displayTitle || !totalAmount) {
    return res.status(400).json({ message: 'Nama bahan/pengeluaran dan jumlah nominal wajib diisi.' });
  }

  const newExpense: ExpenseItem = {
    id: `exp-${Date.now()}`,
    category: category || 'deterjen_pewangi',
    title: displayTitle,
    amount: totalAmount,
    date: date || new Date().toISOString().split('T')[0],
    notes,
    recordedBy: req.user?.name || recordedBy || 'Staff Outlet',
    createdAt: new Date().toISOString(),
    itemName: itemName?.trim() || displayTitle,
    quantity: quantity !== undefined ? Number(quantity) : undefined,
    unit: unit ? String(unit).trim() : undefined,
    unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
    supplier: supplier ? String(supplier).trim() : undefined,
    paymentMethod: paymentMethod || 'tunai',
    paymentStatus: paymentStatus || 'lunas',
  };

  if (!db.expenses) db.expenses = [];
  db.expenses.unshift(newExpense);
  saveDb();

  res.status(201).json({
    success: true,
    expense: newExpense,
    message: 'Pembelian bahan/pengeluaran berhasil dicatat.',
  });
});

// Update operational expense / supply purchase
app.put('/api/expenses/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!db.expenses) db.expenses = [];
  const idx = db.expenses.findIndex((e) => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: 'Catatan pengeluaran tidak ditemukan.' });
  }

  db.expenses[idx] = {
    ...db.expenses[idx],
    ...updateData,
    amount: updateData.amount !== undefined ? Number(updateData.amount) : db.expenses[idx].amount,
  };

  saveDb();
  res.json({ success: true, expense: db.expenses[idx], message: 'Catatan pembelian/pengeluaran berhasil diperbarui.' });
});

// Delete operational expense (Admin Only)
app.delete('/api/expenses/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (!db.expenses) db.expenses = [];

  const initialCount = db.expenses.length;
  db.expenses = db.expenses.filter((e) => e.id !== id);

  if (db.expenses.length === initialCount) {
    return res.status(404).json({ message: 'Catatan pengeluaran tidak ditemukan.' });
  }

  saveDb();
  res.json({ success: true, message: 'Catatan pengeluaran berhasil dihapus.' });
});

// ==========================================
// 8. ATTENDANCE & SHIFT APIs
// ==========================================

// Get all attendance logs
app.get('/api/attendance', (req: Request, res: Response) => {
  if (!db.attendances) db.attendances = DEFAULT_ATTENDANCE;
  res.json(db.attendances);
});

// Staff Check-in
app.post('/api/attendance/check-in', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { station, notes, userId, userName } = req.body;

  const targetUserId = user?.id || userId;
  const targetUserName = user?.name || userName || 'Staff Laundry';

  if (!targetUserId) {
    return res.status(400).json({ message: 'ID Karyawan wajib disertakan untuk absensi.' });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (!db.attendances) db.attendances = [];

  // Check if already checked in today
  const existingToday = db.attendances.find(
    (a) => a.userId === targetUserId && a.date === todayStr && !a.checkOutTime
  );

  if (existingToday) {
    return res.status(400).json({
      message: `${targetUserName} sudah melakukan Check-In hari ini pada ${new Date(existingToday.checkInTime).toLocaleTimeString('id-ID')}.`,
    });
  }

  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}`,
    userId: targetUserId,
    userName: targetUserName,
    date: todayStr,
    checkInTime: new Date().toISOString(),
    station: station || user?.assignedStation || 'semua',
    status: 'hadir',
    notes,
  };

  db.attendances.unshift(newRecord);
  saveDb();

  res.status(201).json({
    success: true,
    attendance: newRecord,
    message: `Check-In berhasil untuk ${targetUserName}. Selamat bertugas!`,
  });
});

// Staff Check-out
app.post('/api/attendance/check-out', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { attendanceId, userId, notes } = req.body;

  if (!db.attendances) db.attendances = [];

  let record: AttendanceRecord | undefined;
  if (attendanceId) {
    record = db.attendances.find((a) => a.id === attendanceId);
  } else {
    const targetUserId = user?.id || userId;
    const todayStr = new Date().toISOString().split('T')[0];
    record = db.attendances.find(
      (a) => a.userId === targetUserId && a.date === todayStr && !a.checkOutTime
    );
  }

  if (!record) {
    return res.status(404).json({ message: 'Tidak ditemukan catatan kehadiran aktif untuk di-Check-Out.' });
  }

  record.checkOutTime = new Date().toISOString();
  if (notes) {
    record.notes = (record.notes ? record.notes + ' | ' : '') + notes;
  }

  saveDb();
  res.json({
    success: true,
    attendance: record,
    message: `Check-Out berhasil untuk ${record.userName}. Terima kasih atas kerja keras Anda!`,
  });
});

// Delete attendance record (Admin Only)
app.delete('/api/attendance/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (!db.attendances) db.attendances = [];

  db.attendances = db.attendances.filter((a) => a.id !== id);
  saveDb();
  res.json({ success: true, message: 'Data absensi berhasil dihapus.' });
});

// ==========================================
// 9. WHATSAPP NOTIFICATION HELPER APIs
// ==========================================

// Get standard WhatsApp templates
app.get('/api/whatsapp/templates', (req: Request, res: Response) => {
  const templates = {
    order_created: 'Halo Kak *{{customer_name}}*, cucian Anda telah kami terima di *{{shop_name}}* dengan No. Nota: *#{{order_id}}*. Total tagihan: *Rp {{total}}* ({{payment_status}}). Estimasi selesai: {{estimated_completion}}. Terima kasih!',
    order_ready: 'Kabar gembira! Cucian Kak *{{customer_name}}* dengan No. Nota *#{{order_id}}* sudah *SELESAI & WANGI* siap diambil di *{{shop_name}}*. Total: *Rp {{total}}*. Ditunggu kedatangannya ya Kak!',
    pickup_reminder: 'Halo Kak *{{customer_name}}*, cucian Anda dengan No. Nota *#{{order_id}}* sudah selesai dan siap diambil di *{{shop_name}}*. Silakan mampir ke outlet kami. Terima kasih!',
  };
  res.json(templates);
});

// Generate WhatsApp direct chat link for an order
app.post('/api/whatsapp/generate', (req: Request, res: Response) => {
  const { orderId, type } = req.body as { orderId: string; type?: 'created' | 'ready' | 'reminder' };

  const order = db.orders.find((o) => o.id === orderId);
  if (!order) {
    return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
  }

  const shopName = db.settings.shopName || 'D laundry';
  const customerName = order.customer.name;
  let phone = order.customer.phone.replace(/\D/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1);
  }

  let text = '';
  if (type === 'ready') {
    text = `Halo Kak *${customerName}*,\n\nKabar gembira! Cucian Anda di *${shopName}* dengan No. Nota *#${order.id}* sudah *SELESAI & WANGI* siap diambil/diantar.\n\nTotal: *Rp ${order.total.toLocaleString('id-ID')}* (${order.paymentStatus === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'}).\n\nTerima kasih telah mempercayakan cucian Anda kepada kami!`;
  } else if (type === 'reminder') {
    text = `Halo Kak *${customerName}*,\n\nMengingatkan kembali bahwa cucian Anda dengan No. Nota *#${order.id}* sudah selesai dan siap diambil di outlet *${shopName}*.\n\nTerima kasih!`;
  } else {
    // Default created
    text = `Halo Kak *${customerName}*,\n\nTerima kasih telah mencuci di *${shopName}*!\nNo. Nota: *#${order.id}*\nPilihan Parfum: *${order.perfume}*\nTotal: *Rp ${order.total.toLocaleString('id-ID')}* (${order.paymentStatus === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'})\n\nCucian Anda sedang kami proses dengan standar kebersihan terbaik.`;
  }

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  res.json({
    success: true,
    orderId: order.id,
    phone,
    text,
    waUrl,
  });
});

// ==========================================
// 10. BACKUP & RESTORE & DATABASE RESET
// ==========================================

// Download full database backup as JSON
app.get('/api/backup', (req: Request, res: Response) => {
  const filename = `dlaundry_backup_${new Date().toISOString().split('T')[0]}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(db, null, 2));
});

// Restore full database from JSON backup (Admin Only)
app.post('/api/backup/restore', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ message: 'Format data backup tidak valid.' });
  }

  if (Array.isArray(data.orders)) db.orders = data.orders;
  if (Array.isArray(data.customers)) db.customers = data.customers;
  if (Array.isArray(data.services)) db.services = data.services;
  if (Array.isArray(data.users)) db.users = data.users;
  if (Array.isArray(data.payrolls)) db.payrolls = data.payrolls;
  if (Array.isArray(data.expenses)) db.expenses = data.expenses;
  if (Array.isArray(data.attendances)) db.attendances = data.attendances;
  if (data.settings && typeof data.settings === 'object') {
    db.settings = { ...db.settings, ...data.settings };
  }

  saveDb();
  res.json({
    success: true,
    message: 'Data sistem berhasil dipulihkan dari cadangan.',
    stats: {
      orders: db.orders.length,
      customers: db.customers.length,
      services: db.services.length,
      users: db.users.length,
      payrolls: db.payrolls.length,
      expenses: db.expenses.length,
      attendances: db.attendances.length,
    },
  });
});

// Reset database to factory default samples (Admin Only)
app.post('/api/reset', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  db = {
    orders: INITIAL_SAMPLE_ORDERS,
    customers: DEFAULT_CUSTOMERS,
    services: DEFAULT_SERVICES,
    settings: DEFAULT_SETTINGS,
    users: DEFAULT_USERS,
    payrolls: DEFAULT_PAYROLLS,
    expenses: DEFAULT_EXPENSES,
    attendances: DEFAULT_ATTENDANCE,
  };
  saveDb();
  res.json({ success: true, message: 'Semua data sistem berhasil direset ke data sampel awal.' });
});

// ==========================================
// 11. phpMyAdmin & MySQL DATABASE APIs
// ==========================================

// Export full database as .SQL file for phpMyAdmin
app.get('/api/database/export-sql', (req: Request, res: Response) => {
  try {
    const sql = generatePhpMyAdminSql(db);
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', 'attachment; filename="dlaundry_database.sql"');
    res.send(sql);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal membuat file export SQL: ' + err.message });
  }
});

// Get raw SQL script preview for phpMyAdmin copy-paste
app.get('/api/database/schema-sql', (req: Request, res: Response) => {
  try {
    const sql = generatePhpMyAdminSql(db);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(sql);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get database statistics (tables and record counts)
app.get('/api/database/stats', (req: Request, res: Response) => {
  const stats = {
    ordersCount: db.orders ? db.orders.length : 0,
    customersCount: db.customers ? db.customers.length : 0,
    servicesCount: db.services ? db.services.length : 0,
    usersCount: db.users ? db.users.length : 0,
    payrollsCount: db.payrolls ? db.payrolls.length : 0,
    expensesCount: db.expenses ? db.expenses.length : 0,
    attendancesCount: db.attendances ? db.attendances.length : 0,
    shopName: db.settings?.shopName || 'D laundry',
    lastUpdated: new Date().toISOString(),
    supportedEngine: 'MySQL / MariaDB (phpMyAdmin)',
  };
  res.json(stats);
});

// Import full JSON or structured backup
app.post('/api/database/import-json', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const importedData = req.body;
  if (!importedData || typeof importedData !== 'object') {
    return res.status(400).json({ message: 'Format data backup tidak valid.' });
  }

  if (Array.isArray(importedData.orders)) db.orders = importedData.orders;
  if (Array.isArray(importedData.customers)) db.customers = importedData.customers;
  if (Array.isArray(importedData.services)) db.services = importedData.services;
  if (Array.isArray(importedData.users)) db.users = importedData.users;
  if (Array.isArray(importedData.payrolls)) db.payrolls = importedData.payrolls;
  if (Array.isArray(importedData.expenses)) db.expenses = importedData.expenses;
  if (Array.isArray(importedData.attendances)) db.attendances = importedData.attendances;
  if (importedData.settings && typeof importedData.settings === 'object') {
    db.settings = { ...db.settings, ...importedData.settings };
  }

  saveDb();
  res.json({
    success: true,
    message: 'Data berhasil diimpor dan disinkronkan ke sistem.',
    stats: {
      orders: db.orders.length,
      customers: db.customers.length,
      users: db.users.length,
      payrolls: db.payrolls.length,
      expenses: db.expenses.length,
      attendances: db.attendances.length,
    },
  });
});

// 404 handler for unrecognized /api routes
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint Tidak Ditemukan',
    message: `Rute API ${req.method} ${req.path} tidak terdaftar di server Node.js.`,
  });
});

// Global Error Handler for Express
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Terjadi kesalahan internal pada server.',
  });
});

// ==========================================
// 12. VITE INTEGRATION & STATIC SERVING
// ==========================================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Laundry App Server running at http://0.0.0.0:${PORT}`);
    console.log(`Backend APIs ready on http://0.0.0.0:${PORT}/api`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
