export type LaundryStage =
  | 'diterima'
  | 'dicuci'
  | 'dikeringkan'
  | 'disetrika'
  | 'siap_ambil'
  | 'selesai';

export type PaymentStatus = 'lunas' | 'belum_lunas';

export type PaymentMethod = 'tunai' | 'qris' | 'transfer' | 'deposit';

export type ServiceCategory = 'kiloan' | 'satuan';

export interface LaundryService {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number; // in IDR
  unit: 'kg' | 'pcs' | 'meter';
  estimatedHours: number;
  description: string;
  badge?: string;
}

export interface OrderItem {
  serviceId: string;
  serviceName: string;
  price: number;
  unit: string;
  quantity: number;
  subtotal: number;
}

export interface DepositTransaction {
  id: string;
  type: 'topup' | 'usage';
  amount: number;
  date: string;
  notes?: string;
  orderId?: string;
  paymentMethod?: 'tunai' | 'qris' | 'transfer';
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  address?: string;
  depositBalance?: number;
  notes?: string;
  createdAt?: string;
  depositHistory?: DepositTransaction[];
}

export interface TimelineEvent {
  stage: LaundryStage;
  timestamp: string;
  note?: string;
}

export interface LaundryOrder {
  id: string; // e.g. "LDN-0924-001"
  customer: Customer;
  items: OrderItem[];
  perfume: string;
  notes?: string;
  stage: LaundryStage;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  estimatedCompletion: string;
  completedAt?: string;
  timeline: TimelineEvent[];
}

export interface LaundrySettings {
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  footerMessage: string;
}

export type UserRole = 'admin' | 'pekerja';

export type WorkerStation = 'semua' | 'kasir' | 'cuci' | 'setrika' | 'packing';

export interface SalaryConfig {
  baseSalary: number; // Gaji Pokok
  mealAllowance: number; // Uang Makan
  transportAllowance: number; // Uang Transport
  commissionPerKg?: number; // Insentif per Kg cucian
  commissionPerOrder?: number; // Insentif per Nota
  bankName?: string; // BCA / Mandiri / BRI / Tunai
  bankAccount?: string; // No Rekening / No E-Wallet
  accountHolder?: string; // Nama Pemilik Rekening
}

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  pin?: string;
  password?: string;
  avatar?: string;
  isActive: boolean;
  assignedStation?: WorkerStation;
  salaryConfig?: SalaryConfig;
  createdAt: string;
}

export type PayrollStatus = 'draft' | 'lunas' | 'pending';
export type PaymentMethodPayroll = 'tunai' | 'transfer' | 'gopay' | 'ovo' | 'dana';

export interface PayrollItem {
  id: string; // e.g. "PAY-202609-001"
  userId: string;
  userName: string;
  userRole: UserRole;
  userStation?: WorkerStation;
  userPhone?: string;
  period: string; // e.g. "September 2026"
  paymentDate: string; // YYYY-MM-DD
  status: PayrollStatus;
  paymentMethod: PaymentMethodPayroll;

  // Penerimaan / Incomes
  baseSalary: number;
  allowance: number; // Total tunjangan (makan + transport)
  allowanceNotes?: string;
  overtimeHours?: number;
  overtimePay?: number;
  commissionTotal?: number; // Insentif kinerja (per kg / order)
  commissionNotes?: string;
  bonus: number; // Bonus tambahan / THR
  bonusNotes?: string;
  totalIncome: number;

  // Potongan / Deductions
  kasbonDeduction: number; // Potongan Kasbon / Pinjaman Karyawan
  absenceDeduction: number; // Potongan Alpha / Izin
  otherDeduction: number; // Potongan Lainnya
  otherDeductionNotes?: string;
  totalDeduction: number;

  // Total Bersih / Take Home Pay
  netSalary: number;

  bankName?: string;
  bankAccount?: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
  paidByAdminName?: string;
}

export interface AuthSession {
  user: AppUser;
  token: string;
}

export type ExpenseCategory =
  | 'operasional'
  | 'deterjen_pewangi'
  | 'pelembut_pelicin'
  | 'anti_noda_kimia'
  | 'plastik_packing'
  | 'hanger_label'
  | 'listrik_air_gas'
  | 'perawatan_mesin'
  | 'gaji_bonus'
  | 'lainnya';

export interface ExpenseItem {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  recordedBy?: string;
  createdAt: string;
  // Extended fields for supply/materials purchase:
  itemName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  supplier?: string;
  paymentMethod?: 'tunai' | 'transfer' | 'qris' | 'tempo';
  paymentStatus?: 'lunas' | 'tempo';
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO
  checkOutTime?: string; // ISO
  station: WorkerStation;
  status: 'hadir' | 'izin' | 'sakit' | 'alpha';
  notes?: string;
}

export interface ServerHealthInfo {
  status: 'healthy' | 'warning' | 'error';
  uptimeSeconds: number;
  uptimeFormatted: string;
  nodeVersion: string;
  platform: string;
  pid: number;
  memoryUsageMB: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  dbStats: {
    orders: number;
    customers: number;
    services: number;
    users: number;
    payrolls: number;
    expenses: number;
    attendances: number;
  };
  serverTime: string;
  environment: string;
}

export {
  STAGE_CONFIG,
  STAGES_LIST,
  formatRupiah,
  formatDateIndo,
} from './data/defaultData';
