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
  ExpenseItem,
  AttendanceRecord,
  ServerHealthInfo,
} from '../types.ts';

const TOKEN_KEY = 'laundry_auth_token';
const USER_KEY = 'laundry_auth_user';

export const getStoredAuth = (): { user: AppUser | null; token: string | null } => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
};

export const setStoredAuth = (user: AppUser | null, token: string | null) => {
  try {
    if (user && token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch (e) {
    console.error('Failed setting stored auth:', e);
  }
};

const getHeaders = () => {
  const { user, token } = getStoredAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (user?.id) {
    headers['x-user-id'] = user.id;
    headers['x-user-role'] = user.role;
  }
  return headers;
};

// API Services
export const api = {
  // Auth
  async login(credentials: { username?: string; password?: string; pin?: string }): Promise<{
    success: boolean;
    user: AppUser;
    token: string;
    message?: string;
  }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Gagal login');
    }
    setStoredAuth(data.user, data.token);
    return data;
  },

  async logout(): Promise<void> {
    setStoredAuth(null, null);
  },

  async getMe(): Promise<{ authenticated: boolean; user?: AppUser }> {
    const res = await fetch('/api/auth/me', { headers: getHeaders() });
    if (!res.ok) return { authenticated: false };
    return res.json();
  },

  // Staff / Users (Admin only)
  async getUsers(): Promise<AppUser[]> {
    const res = await fetch('/api/users', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal mengambil daftar staff');
    return res.json();
  },

  async createUser(user: Partial<AppUser>): Promise<{ success: boolean; user: AppUser; message?: string }> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menambah staff');
    return data;
  },

  async updateUser(id: string, user: Partial<AppUser>): Promise<{ success: boolean; user: AppUser; message?: string }> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mengupdate staff');
    return data;
  },

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menghapus staff');
    return data;
  },

  // Orders
  async getOrders(): Promise<LaundryOrder[]> {
    const res = await fetch('/api/orders', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat data pesanan');
    return res.json();
  },

  async createOrder(order: LaundryOrder): Promise<{ success: boolean; order: LaundryOrder }> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(order),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal membuat pesanan');
    return data;
  },

  async updateOrderStage(id: string, stage: LaundryStage, note?: string): Promise<{ success: boolean; order: LaundryOrder }> {
    const res = await fetch(`/api/orders/${id}/stage`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ stage, note }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memperbarui status');
    return data;
  },

  async updateOrderPayment(id: string, paymentStatus?: 'lunas' | 'belum_lunas'): Promise<{ success: boolean; order: LaundryOrder }> {
    const res = await fetch(`/api/orders/${id}/payment`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ paymentStatus }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mengubah status pembayaran');
    return data;
  },

  async deleteOrder(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menghapus pesanan');
    return data;
  },

  // Customers & Deposits
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch('/api/customers', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat pelanggan');
    return res.json();
  },

  async saveCustomer(customer: Customer): Promise<{ success: boolean; customer: Customer }> {
    const isNew = !customer.id || customer.id.startsWith('cst-temp');
    const url = isNew ? '/api/customers' : `/api/customers/${customer.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(customer),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menyimpan data pelanggan');
    return data;
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menghapus pelanggan');
    return data;
  },

  async topUpDeposit(
    id: string,
    amount: number,
    paymentMethod: 'tunai' | 'qris' | 'transfer',
    notes: string
  ): Promise<{ success: boolean; depositBalance: number; customer: Customer }> {
    const res = await fetch(`/api/customers/${id}/deposit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ type: 'topup', amount, paymentMethod, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal top up saldo');
    return data;
  },

  async deductDeposit(
    id: string,
    amount: number,
    orderId: string
  ): Promise<{ success: boolean; depositBalance: number; customer: Customer }> {
    const res = await fetch(`/api/customers/${id}/deposit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ type: 'usage', amount, orderId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memotong saldo deposit');
    return data;
  },

  // Services
  async getServices(): Promise<LaundryService[]> {
    const res = await fetch('/api/services', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat katalog layanan');
    return res.json();
  },

  async saveServices(services: LaundryService[]): Promise<{ success: boolean; services: LaundryService[] }> {
    const res = await fetch('/api/services', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(services),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menyimpan katalog tarif');
    return data;
  },

  // Settings
  async getSettings(): Promise<LaundrySettings> {
    const res = await fetch('/api/settings', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat pengaturan outlet');
    return res.json();
  },

  async saveSettings(settings: LaundrySettings): Promise<{ success: boolean; settings: LaundrySettings }> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menyimpan pengaturan');
    return data;
  },

  // Payroll / Penggajian
  async getPayrolls(): Promise<PayrollItem[]> {
    const res = await fetch('/api/payrolls', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat data slip penggajian');
    return res.json();
  },

  async createPayroll(payroll: Partial<PayrollItem>): Promise<{ success: boolean; payroll: PayrollItem; message?: string }> {
    const res = await fetch('/api/payrolls', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payroll),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal membuat slip penggajian');
    return data;
  },

  async updatePayroll(id: string, payroll: Partial<PayrollItem>): Promise<{ success: boolean; payroll: PayrollItem; message?: string }> {
    const res = await fetch(`/api/payrolls/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payroll),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memperbarui data penggajian');
    return data;
  },

  async deletePayroll(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/payrolls/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menghapus slip gaji');
    return data;
  },

  async updateSalaryConfig(userId: string, config: SalaryConfig): Promise<{ success: boolean; user: AppUser; message?: string }> {
    const res = await fetch(`/api/users/${userId}/salary-config`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menyimpan konfigurasi gaji');
    return data;
  },

  // Health & System
  async getHealth(): Promise<ServerHealthInfo> {
    const res = await fetch('/api/health', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memeriksa status server');
    return res.json();
  },

  async getSystemInfo(): Promise<any> {
    const res = await fetch('/api/system/info', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat info sistem');
    return res.json();
  },

  async getSystemRoutes(): Promise<{ totalRoutes: number; routes: Array<{ method: string; path: string; desc: string }> }> {
    const res = await fetch('/api/system/routes', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat daftar rute API');
    return res.json();
  },

  // Orders Extensions
  async getOrderById(id: string): Promise<LaundryOrder> {
    const res = await fetch(`/api/orders/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Pesanan tidak ditemukan');
    return res.json();
  },

  async updateOrder(id: string, orderData: Partial<LaundryOrder>): Promise<{ success: boolean; order: LaundryOrder }> {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(orderData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal memperbarui pesanan');
    return data;
  },

  async trackOrder(query: string): Promise<{ success: boolean; totalMatches: number; orders: any[] }> {
    const res = await fetch(`/api/orders/track/${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Pesanan tidak ditemukan');
    return data;
  },

  async getOrderStats(): Promise<any> {
    const res = await fetch('/api/orders/stats/summary', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat ringkasan transaksi');
    return res.json();
  },

  // Operational Expenses (Pengeluaran)
  async getExpenses(): Promise<ExpenseItem[]> {
    const res = await fetch('/api/expenses', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat daftar pengeluaran');
    return res.json();
  },

  async getExpensesSummary(): Promise<{ totalExpense: number; count: number; byCategory: Record<string, number> }> {
    const res = await fetch('/api/expenses/summary', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat ringkasan pengeluaran');
    return res.json();
  },

  async createExpense(expense: Partial<ExpenseItem>): Promise<{ success: boolean; expense: ExpenseItem; message?: string }> {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mencatat pengeluaran');
    return data;
  },

  async updateExpense(id: string, expense: Partial<ExpenseItem>): Promise<{ success: boolean; expense: ExpenseItem; message?: string }> {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mengubah pengeluaran');
    return data;
  },

  async deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menghapus pengeluaran');
    return data;
  },

  // Worker Attendance
  async getAttendance(): Promise<AttendanceRecord[]> {
    const res = await fetch('/api/attendance', { headers: getHeaders() });
    if (!res.ok) throw new Error('Gagal memuat data absensi');
    return res.json();
  },

  async checkInAttendance(data: { station?: string; notes?: string; userId?: string; userName?: string }): Promise<{ success: boolean; attendance: AttendanceRecord; message: string }> {
    const res = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Gagal melakukan check-in');
    return resData;
  },

  async checkOutAttendance(data?: { attendanceId?: string; userId?: string; notes?: string }): Promise<{ success: boolean; attendance: AttendanceRecord; message: string }> {
    const res = await fetch('/api/attendance/check-out', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data || {}),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Gagal melakukan check-out');
    return resData;
  },

  async deleteAttendance(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/attendance/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal menghapus absensi');
    return data;
  },

  // WhatsApp Automation
  async getWhatsAppTemplates(): Promise<Record<string, string>> {
    const res = await fetch('/api/whatsapp/templates');
    if (!res.ok) throw new Error('Gagal memuat template WhatsApp');
    return res.json();
  },

  async generateWhatsApp(orderId: string, type: 'created' | 'ready' | 'reminder' = 'created'): Promise<{
    success: boolean;
    orderId: string;
    phone: string;
    text: string;
    waUrl: string;
  }> {
    const res = await fetch('/api/whatsapp/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal membuat pesan WhatsApp');
    return data;
  },

  // Database phpMyAdmin & Backup
  async getDatabaseStats(): Promise<any> {
    const res = await fetch('/api/database/stats');
    if (!res.ok) throw new Error('Gagal memuat statistik database');
    return res.json();
  },

  async importDatabaseJson(data: any): Promise<{ success: boolean; message: string; stats: any }> {
    const res = await fetch('/api/database/import-json', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Gagal mengimpor database');
    return resData;
  },

  // Reset
  async resetAll(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal mereset data');
    return data;
  },
};
