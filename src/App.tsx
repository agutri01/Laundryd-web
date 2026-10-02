/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { PosCashier } from './components/PosCashier';
import { OrderList } from './components/OrderList';
import { CustomerManager } from './components/CustomerManager';
import { PublicTracking } from './components/PublicTracking';
import { ServiceManager } from './components/ServiceManager';
import { FinanceReport } from './components/FinanceReport';
import { UserManager } from './components/UserManager';
import { PayrollManager } from './components/PayrollManager';
import { SupplyPurchaseManager } from './components/SupplyPurchaseManager';
import { LoginModal } from './components/LoginModal';
import { LoginScreen } from './components/LoginScreen';
import { ReceiptModal } from './components/ReceiptModal';
import {
  LaundryOrder,
  LaundryService,
  LaundrySettings,
  LaundryStage,
  Customer,
  DepositTransaction,
  AppUser,
  PayrollItem,
  SalaryConfig,
  ExpenseItem,
} from './types';
import {
  DEFAULT_SERVICES,
  DEFAULT_SETTINGS,
  INITIAL_SAMPLE_ORDERS,
  DEFAULT_CUSTOMERS,
  DEFAULT_USERS,
  DEFAULT_PAYROLLS,
  DEFAULT_EXPENSES,
} from './data/defaultData';
import { api, getStoredAuth, setStoredAuth } from './utils/api';
import { CheckCircle2, Shield, Briefcase, KeyRound, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Current Authenticated User (Admin or Pekerja)
  // Initially null to show the Login Screen, or restore if active session
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const sessionActive = sessionStorage.getItem('laundry_session_active');
      if (sessionActive === 'true') {
        const stored = getStoredAuth();
        return stored.user || null;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Guest Tracking Mode (Customer checking laundry without staff login)
  const [isGuestTracking, setIsGuestTracking] = useState(false);

  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('laundry_users');
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  // Login / Switch Account Modal
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Persistent Settings
  const [settings, setSettings] = useState<LaundrySettings>(() => {
    try {
      const saved = localStorage.getItem('laundry_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.shopName || parsed.shopName === 'FreshClean Laundry & Care') {
          parsed.shopName = 'D laundry';
        }
        if (!parsed.shopAddress || parsed.shopAddress.includes('Kebayoran Baru') || parsed.shopAddress.includes('Jl. Merdeka No. 45')) {
          parsed.shopAddress = 'Jl. Tanjung Jaya GG. Jaya No. 11 Pekanbaru Riau';
          localStorage.setItem('laundry_settings', JSON.stringify(parsed));
        }
        return parsed;
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Persistent Services
  const [services, setServices] = useState<LaundryService[]>(() => {
    try {
      const saved = localStorage.getItem('laundry_services');
      return saved ? JSON.parse(saved) : DEFAULT_SERVICES;
    } catch {
      return DEFAULT_SERVICES;
    }
  });

  // Persistent Customers & Deposits
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('laundry_customers');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOMERS;
    } catch {
      return DEFAULT_CUSTOMERS;
    }
  });

  // Persistent Orders
  const [orders, setOrders] = useState<LaundryOrder[]>(() => {
    try {
      const saved = localStorage.getItem('laundry_orders');
      return saved ? JSON.parse(saved) : INITIAL_SAMPLE_ORDERS;
    } catch {
      return INITIAL_SAMPLE_ORDERS;
    }
  });

  // Persistent Payrolls
  const [payrolls, setPayrolls] = useState<PayrollItem[]>(() => {
    try {
      const saved = localStorage.getItem('laundry_payrolls');
      return saved ? JSON.parse(saved) : DEFAULT_PAYROLLS;
    } catch {
      return DEFAULT_PAYROLLS;
    }
  });

  // Persistent Expenses & Supplies
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem('laundry_expenses');
      return saved ? JSON.parse(saved) : DEFAULT_EXPENSES;
    } catch {
      return DEFAULT_EXPENSES;
    }
  });

  // Active Navigation Tab
  const [currentTab, setCurrentTab] = useState<NavTab>('antrean');

  // Selected customer to pre-fill in PosCashier
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState<Customer | null>(null);

  // Receipt Modal State
  const [receiptOrder, setReceiptOrder] = useState<LaundryOrder | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Fetch initial data from backend API
  const fetchBackendData = useCallback(async () => {
    try {
      const [apiOrders, apiCusts, apiServs, apiSett, apiUsers, apiPayrolls, apiExpenses] = await Promise.allSettled([
        api.getOrders(),
        api.getCustomers(),
        api.getServices(),
        api.getSettings(),
        api.getUsers(),
        api.getPayrolls(),
        api.getExpenses(),
      ]);

      if (apiOrders.status === 'fulfilled' && apiOrders.value) {
        setOrders(apiOrders.value);
        localStorage.setItem('laundry_orders', JSON.stringify(apiOrders.value));
      }
      if (apiCusts.status === 'fulfilled' && apiCusts.value) {
        setCustomers(apiCusts.value);
        localStorage.setItem('laundry_customers', JSON.stringify(apiCusts.value));
      }
      if (apiServs.status === 'fulfilled' && apiServs.value) {
        setServices(apiServs.value);
        localStorage.setItem('laundry_services', JSON.stringify(apiServs.value));
      }
      if (apiSett.status === 'fulfilled' && apiSett.value) {
        setSettings(apiSett.value);
        localStorage.setItem('laundry_settings', JSON.stringify(apiSett.value));
      }
      if (apiUsers.status === 'fulfilled' && apiUsers.value) {
        setUsers(apiUsers.value);
        localStorage.setItem('laundry_users', JSON.stringify(apiUsers.value));
      }
      if (apiPayrolls.status === 'fulfilled' && apiPayrolls.value) {
        setPayrolls(apiPayrolls.value);
        localStorage.setItem('laundry_payrolls', JSON.stringify(apiPayrolls.value));
      }
      if (apiExpenses.status === 'fulfilled' && apiExpenses.value) {
        setExpenses(apiExpenses.value);
        localStorage.setItem('laundry_expenses', JSON.stringify(apiExpenses.value));
      }
    } catch (err) {
      console.warn('Backend sync note: operating with cached storage', err);
    }
  }, []);

  useEffect(() => {
    fetchBackendData();
  }, [fetchBackendData]);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('laundry_settings', JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('laundry_services', JSON.stringify(services));
    } catch (e) {
      console.error(e);
    }
  }, [services]);

  useEffect(() => {
    try {
      localStorage.setItem('laundry_orders', JSON.stringify(orders));
    } catch (e) {
      console.error(e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('laundry_customers', JSON.stringify(customers));
    } catch (e) {
      console.error(e);
    }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem('laundry_users', JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('laundry_payrolls', JSON.stringify(payrolls));
    } catch (e) {
      console.error(e);
    }
  }, [payrolls]);

  useEffect(() => {
    try {
      localStorage.setItem('laundry_expenses', JSON.stringify(expenses));
    } catch (e) {
      console.error(e);
    }
  }, [expenses]);

  // Security guard: Only Admin can access 'laporan' (omset), 'karyawan' (staff), and 'layanan' (tarif)
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      if (currentTab === 'laporan' || currentTab === 'karyawan' || currentTab === 'layanan') {
        setCurrentTab('antrean');
      }
    }
  }, [currentUser, currentTab]);

  // Handlers for Expenses / Laundry Supplies
  const handleAddExpense = async (expense: Partial<ExpenseItem>): Promise<boolean> => {
    try {
      const res = await api.createExpense(expense);
      if (res.success && res.expense) {
        setExpenses((prev) => [res.expense, ...prev]);
        showToast(res.message || 'Pembelian bahan laundry berhasil dicatat!');
        return true;
      }
    } catch (err: any) {
      console.warn('API expense error, falling back locally', err);
      const localExpense: ExpenseItem = {
        id: `exp-${Date.now()}`,
        category: expense.category || 'deterjen_pewangi',
        title: expense.title || 'Pembelian Bahan Laundry',
        amount: expense.amount || 0,
        date: expense.date || new Date().toISOString().split('T')[0],
        notes: expense.notes,
        recordedBy: expense.recordedBy || currentUser?.name || 'Staff Outlet',
        createdAt: new Date().toISOString(),
        ...expense,
      };
      setExpenses((prev) => [localExpense, ...prev]);
      showToast('Pembelian bahan dicatat (tersimpan lokal).');
      return true;
    }
    return false;
  };

  const handleUpdateExpense = async (id: string, expense: Partial<ExpenseItem>): Promise<boolean> => {
    try {
      const res = await api.updateExpense(id, expense);
      if (res.success && res.expense) {
        setExpenses((prev) => prev.map((e) => (e.id === id ? res.expense : e)));
        showToast('Data pembelian bahan berhasil diperbarui.');
        return true;
      }
    } catch (err) {
      console.warn('API update expense error, falling back locally', err);
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...expense } : e)));
      showToast('Data pembelian bahan diperbarui.');
      return true;
    }
    return false;
  };

  const handleDeleteExpense = async (id: string): Promise<boolean> => {
    try {
      const res = await api.deleteExpense(id);
      if (res.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        showToast('Catatan pembelian bahan berhasil dihapus.');
        return true;
      }
    } catch (err) {
      console.warn('API delete expense error, falling back locally', err);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      showToast('Catatan pembelian bahan dihapus.');
      return true;
    }
    return false;
  };

  // Auth & Role Handlers
  const handleLogin = async (credentials: { username?: string; password?: string; pin?: string }) => {
    try {
      const res = await api.login(credentials);
      setCurrentUser(res.user);
      sessionStorage.setItem('laundry_session_active', 'true');
      setIsGuestTracking(false);
      setIsLoginModalOpen(false);
      if (res.user.role !== 'admin' && (currentTab === 'laporan' || currentTab === 'karyawan' || currentTab === 'layanan')) {
        setCurrentTab('antrean');
      }
      showToast(
        `Berhasil masuk sebagai ${res.user.name} (${res.user.role === 'admin' ? '👑 Administrator' : '👔 Pekerja'})`
      );
    } catch (err: any) {
      // Local fallback lookup if offline
      const matched = users.find(
        (u) =>
          u.isActive &&
          ((credentials.pin && u.pin === credentials.pin) ||
            (credentials.username && u.username.toLowerCase() === credentials.username.toLowerCase()))
      );

      if (matched) {
        setCurrentUser(matched);
        setStoredAuth(matched, `tok_${matched.id}_${Date.now()}`);
        sessionStorage.setItem('laundry_session_active', 'true');
        setIsGuestTracking(false);
        setIsLoginModalOpen(false);
        if (matched.role !== 'admin' && (currentTab === 'laporan' || currentTab === 'karyawan' || currentTab === 'layanan')) {
          setCurrentTab('antrean');
        }
        showToast(
          `Berhasil masuk sebagai ${matched.name} (${matched.role === 'admin' ? '👑 Administrator' : '👔 Pekerja'})`
        );
      } else {
        throw new Error(err.message || 'Login gagal.');
      }
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    sessionStorage.removeItem('laundry_session_active');
    setIsGuestTracking(false);
    showToast('Sesi kerja diakhiri. Silakan login kembali.');
  };

  // Staff Management Handlers (Admin Only)
  const handleAddUser = async (userData: Partial<AppUser>) => {
    try {
      const res = await api.createUser(userData);
      setUsers((prev) => [...prev, res.user]);
      showToast(`Karyawan baru "${res.user.name}" berhasil didaftarkan.`);
    } catch (err: any) {
      // Fallback
      const newUser: AppUser = {
        id: `usr-${Date.now()}`,
        username: userData.username || 'staff',
        name: userData.name || 'Staff Laundry',
        role: userData.role || 'pekerja',
        phone: userData.phone,
        pin: userData.pin || '1234',
        password: userData.password || 'pekerja123',
        isActive: true,
        assignedStation: userData.assignedStation || 'kasir',
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUser]);
      showToast(`Karyawan baru "${newUser.name}" berhasil disimpan.`);
    }
  };

  const handleUpdateUser = async (id: string, userData: Partial<AppUser>) => {
    try {
      const res = await api.updateUser(id, userData);
      setUsers((prev) => prev.map((u) => (u.id === id ? res.user : u)));
      if (currentUser?.id === id) {
        setCurrentUser(res.user);
      }
      showToast('Data karyawan berhasil diperbarui.');
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...userData } : u))
      );
      if (currentUser?.id === id) {
        setCurrentUser((prev) => (prev ? { ...prev, ...userData } : null));
      }
      showToast('Data karyawan berhasil diupdate.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('Karyawan berhasil dihapus dari sistem.');
    } catch (err: any) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('Karyawan berhasil dihapus.');
    }
  };

  // Payroll Handlers
  const handleAddPayroll = async (payrollData: Partial<PayrollItem>) => {
    try {
      const res = await api.createPayroll(payrollData);
      setPayrolls((prev) => [res.payroll, ...prev]);
      showToast(res.message || 'Slip gaji berhasil dibuat.');
    } catch (err: any) {
      const randomSeq = Math.floor(100 + Math.random() * 900);
      const newP: PayrollItem = {
        id: payrollData.id || `PAY-${Date.now().toString().slice(-4)}-${randomSeq}`,
        userId: payrollData.userId || '',
        userName: payrollData.userName || '',
        userRole: payrollData.userRole || 'pekerja',
        userStation: payrollData.userStation,
        userPhone: payrollData.userPhone,
        period: payrollData.period || '',
        paymentDate: payrollData.paymentDate || new Date().toISOString().split('T')[0],
        status: payrollData.status || 'draft',
        paymentMethod: payrollData.paymentMethod || 'transfer',
        baseSalary: Number(payrollData.baseSalary) || 0,
        allowance: Number(payrollData.allowance) || 0,
        allowanceNotes: payrollData.allowanceNotes,
        overtimeHours: payrollData.overtimeHours,
        overtimePay: payrollData.overtimePay,
        commissionTotal: payrollData.commissionTotal,
        commissionNotes: payrollData.commissionNotes,
        bonus: Number(payrollData.bonus) || 0,
        bonusNotes: payrollData.bonusNotes,
        totalIncome: Number(payrollData.totalIncome) || 0,
        kasbonDeduction: Number(payrollData.kasbonDeduction) || 0,
        absenceDeduction: Number(payrollData.absenceDeduction) || 0,
        otherDeduction: Number(payrollData.otherDeduction) || 0,
        otherDeductionNotes: payrollData.otherDeductionNotes,
        totalDeduction: Number(payrollData.totalDeduction) || 0,
        netSalary: Number(payrollData.netSalary) || 0,
        bankName: payrollData.bankName,
        bankAccount: payrollData.bankAccount,
        notes: payrollData.notes,
        createdAt: new Date().toISOString(),
        paidAt: payrollData.status === 'lunas' ? new Date().toISOString() : undefined,
        paidByAdminName: payrollData.status === 'lunas' ? (currentUser?.name || users.find((u) => u.role === 'admin')?.name || 'Admin') : undefined,
      };
      setPayrolls((prev) => [newP, ...prev]);
      showToast(`Slip gaji ${newP.userName} berhasil dibuat.`);
    }
  };

  const handleUpdatePayroll = async (id: string, payrollData: Partial<PayrollItem>) => {
    try {
      const res = await api.updatePayroll(id, payrollData);
      setPayrolls((prev) => prev.map((p) => (p.id === id ? res.payroll : p)));
      showToast(res.message || 'Status slip gaji diperbarui.');
    } catch (err: any) {
      setPayrolls((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const newStatus = payrollData.status || p.status;
          return {
            ...p,
            ...payrollData,
            status: newStatus,
            paidAt: newStatus === 'lunas' ? (p.paidAt || new Date().toISOString()) : undefined,
            paidByAdminName: newStatus === 'lunas' ? (p.paidByAdminName || currentUser?.name || users.find((u) => u.role === 'admin')?.name || 'Admin') : undefined,
          };
        })
      );
      showToast('Status slip gaji diperbarui.');
    }
  };

  const handleDeletePayroll = async (id: string) => {
    try {
      const res = await api.deletePayroll(id);
      setPayrolls((prev) => prev.filter((p) => p.id !== id));
      showToast(res.message || 'Slip gaji berhasil dihapus.');
    } catch (err: any) {
      setPayrolls((prev) => prev.filter((p) => p.id !== id));
      showToast('Slip gaji telah dihapus.');
    }
  };

  const handleUpdateSalaryConfig = async (userId: string, config: SalaryConfig) => {
    try {
      const res = await api.updateSalaryConfig(userId, config);
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
      showToast(res.message || 'Konfigurasi gaji berhasil disimpan.');
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, salaryConfig: config } : u))
      );
      showToast('Konfigurasi gaji berhasil disimpan.');
    }
  };

  // Customer & Deposit Handlers
  const handleSaveCustomer = async (updatedOrNew: Customer) => {
    try {
      const res = await api.saveCustomer(updatedOrNew);
      setCustomers((prev) => {
        const idx = prev.findIndex((c) => c.id === res.customer.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = res.customer;
          return next;
        } else {
          return [res.customer, ...prev];
        }
      });
      showToast(`Data pelanggan "${res.customer.name}" berhasil disimpan.`);
    } catch {
      // Local fallback
      setCustomers((prev) => {
        const idx = prev.findIndex((c) => c.id === updatedOrNew.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = updatedOrNew;
          return next;
        } else {
          return [updatedOrNew, ...prev];
        }
      });
      showToast(`Data pelanggan "${updatedOrNew.name}" berhasil disimpan.`);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await api.deleteCustomer(customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      showToast('Data pelanggan telah dihapus oleh Admin.');
    } catch {
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      showToast('Data pelanggan telah dihapus.');
    }
  };

  const handleTopUpDeposit = async (
    customerId: string,
    amount: number,
    method: 'tunai' | 'qris' | 'transfer',
    notes: string
  ) => {
    try {
      const res = await api.topUpDeposit(customerId, amount, method, notes);
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? res.customer : c))
      );
      showToast(`Top up deposit Rp ${amount.toLocaleString('id-ID')} berhasil!`);
    } catch {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== customerId) return c;
          const currentBalance = c.depositBalance || 0;
          const newBalance = currentBalance + amount;
          const newTx: DepositTransaction = {
            id: `dep-${Date.now()}`,
            type: 'topup',
            amount,
            date: new Date().toISOString(),
            notes: notes || `Top Up Saldo via ${method.toUpperCase()}`,
            paymentMethod: method,
          };
          const updatedHistory = [newTx, ...(c.depositHistory || [])];
          return {
            ...c,
            depositBalance: newBalance,
            depositHistory: updatedHistory,
          };
        })
      );
      showToast(`Top up deposit Rp ${amount.toLocaleString('id-ID')} berhasil!`);
    }
  };

  const handleDeductDeposit = async (customerId: string, amount: number, orderId: string) => {
    try {
      const res = await api.deductDeposit(customerId, amount, orderId);
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? res.customer : c))
      );
    } catch {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== customerId) return c;
          const currentBalance = c.depositBalance || 0;
          const newBalance = Math.max(0, currentBalance - amount);
          const newTx: DepositTransaction = {
            id: `dep-${Date.now()}`,
            type: 'usage',
            amount,
            date: new Date().toISOString(),
            notes: `Pembayaran Cucian #${orderId}`,
            orderId,
          };
          const updatedHistory = [newTx, ...(c.depositHistory || [])];
          return {
            ...c,
            depositBalance: newBalance,
            depositHistory: updatedHistory,
          };
        })
      );
    }
  };

  // Order Handlers
  const handleOrderCreated = async (newOrder: LaundryOrder) => {
    try {
      const res = await api.createOrder(newOrder);
      setOrders((prev) => [res.order, ...prev]);
    } catch {
      setOrders((prev) => [newOrder, ...prev]);
    }

    // Auto register customer if new
    const phoneClean = newOrder.customer.phone.replace(/\D/g, '');
    const exists = customers.some(
      (c) => c.phone.replace(/\D/g, '') === phoneClean
    );

    if (!exists) {
      const newCust: Customer = {
        id: `cst-${Date.now()}`,
        name: newOrder.customer.name,
        phone: newOrder.customer.phone,
        address: newOrder.customer.address,
        depositBalance: 0,
        createdAt: new Date().toISOString(),
        depositHistory: [],
      };
      setCustomers((prev) => [newCust, ...prev]);
    }

    setReceiptOrder(newOrder);
    setIsReceiptOpen(true);
    showToast(`Pesanan ${newOrder.id} berhasil dicatat!`);
  };

  const handleUpdateStage = async (orderId: string, nextStage: LaundryStage, note?: string) => {
    try {
      const res = await api.updateOrderStage(orderId, nextStage, note);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? res.order : order))
      );
    } catch {
      const now = new Date().toISOString();
      const timelineEvent = {
        stage: nextStage,
        timestamp: now,
        note: note || `Status diperbarui oleh ${currentUser?.name || 'Kasir/Pekerja'}`,
      };

      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          const updatedTimeline = [
            ...order.timeline.filter((t) => t.stage !== nextStage),
            timelineEvent,
          ];
          return {
            ...order,
            stage: nextStage,
            completedAt: nextStage === 'selesai' ? now : order.completedAt,
            timeline: updatedTimeline,
          };
        })
      );
    }
    showToast(`Status #${orderId} diperbarui.`);
  };

  const handleTogglePayment = async (orderId: string) => {
    try {
      const res = await api.updateOrderPayment(orderId);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? res.order : order))
      );
      showToast(`Status pembayaran pesanan #${orderId} telah diubah.`);
    } catch {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          const nextStatus = order.paymentStatus === 'lunas' ? 'belum_lunas' : 'lunas';
          return { ...order, paymentStatus: nextStatus };
        })
      );
      showToast(`Status pembayaran pesanan #${orderId} telah diubah.`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await api.deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast(`Pesanan #${orderId} berhasil dihapus oleh Admin.`);
    } catch {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast(`Pesanan #${orderId} telah dihapus.`);
    }
  };

  const handleSaveServices = async (updated: LaundryService[]) => {
    try {
      const res = await api.saveServices(updated);
      setServices(res.services);
      showToast('Katalog tarif berhasil diperbarui oleh Admin.');
    } catch {
      setServices(updated);
      showToast('Katalog tarif berhasil diperbarui.');
    }
  };

  const handleUpdateSettings = async (newSettings: LaundrySettings) => {
    try {
      const res = await api.saveSettings(newSettings);
      setSettings(res.settings);
      showToast('Pengaturan outlet berhasil disimpan oleh Admin.');
    } catch {
      setSettings(newSettings);
      showToast('Pengaturan outlet berhasil disimpan.');
    }
  };

  const handleResetOrders = async () => {
    try {
      await api.resetAll();
      fetchBackendData();
      showToast('Semua data berhasil direset ke data sampel awal.');
    } catch {
      setOrders(INITIAL_SAMPLE_ORDERS);
      setCustomers(DEFAULT_CUSTOMERS);
      setServices(DEFAULT_SERVICES);
      setSettings(DEFAULT_SETTINGS);
      showToast('Data antrean pesanan direset ke data sampel.');
    }
  };

  const handleViewReceipt = (order: LaundryOrder) => {
    setReceiptOrder(order);
    setIsReceiptOpen(true);
  };

  const activeOrdersCount = orders.filter((o) => o.stage !== 'selesai').length;
  const isAdmin = currentUser?.role === 'admin';

  // 1. If Guest Tracking mode is active (Customers tracking orders without staff credentials)
  if (!currentUser && isGuestTracking) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsGuestTracking(false)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-sky-600" />
              <span>Kembali ke Portal Login Staf</span>
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="font-extrabold text-sm text-slate-900 hidden sm:inline">
              {settings.shopName} &bull; Lacak Status Cucian Pelanggan
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Hotline: <strong className="text-slate-900">{settings.shopPhone}</strong>
          </div>
        </header>

        <main className="max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 flex-1 no-print">
          <PublicTracking
            orders={orders}
            settings={settings}
            onViewReceipt={handleViewReceipt}
          />
        </main>

        <ReceiptModal
          order={receiptOrder}
          settings={settings}
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          onTogglePaymentStatus={handleTogglePayment}
          adminName={users.find((u) => u.role === 'admin')?.name}
          cashierName={users.find((u) => u.role === 'admin')?.name}
        />
      </div>
    );
  }

  // 2. Initial Login Screen when no active authenticated user
  if (!currentUser) {
    return (
      <>
        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <LoginScreen
          users={users}
          settings={settings}
          onLogin={handleLogin}
          onGuestTrack={() => setIsGuestTracking(true)}
        />
      </>
    );
  }

  // 3. Authenticated App Dashboard (Admin & Pekerja)
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        activeOrdersCount={activeOrdersCount}
        customersCount={customers.length}
        settings={settings}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Role Notice & Shift Banner for Workers */}
      {!isAdmin && (
        <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-800 text-white px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-300 shrink-0" />
              <span>
                <strong>Mode Akses Pekerja / Shift:</strong> Masuk sebagai{' '}
                <span className="font-bold underline decoration-sky-300">{currentUser?.name}</span>{' '}
                (Stasiun: <span className="capitalize">{currentUser?.assignedStation || 'Kasir'}</span>). Fitur laporan omset & ubah tarif dibatasi.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="text-[11px] font-bold text-sky-200 hover:text-white underline shrink-0 flex items-center gap-1"
            >
              <span>Ganti Akun / Shift</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-10 no-print">
        <AnimatePresence mode="wait">
          {currentTab === 'kasir' && (
            <motion.div
              key="kasir"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="mb-4">
                <h2 className="text-xl font-black text-slate-900">Kasir & Penerimaan Pesanan</h2>
                <p className="text-xs text-slate-500">
                  Input pakaian kiloan atau satuan, pilih dari database pelanggan, gunakan saldo deposit, dan buat nota digital otomatis.
                </p>
              </div>
              <PosCashier
                services={services}
                customers={customers}
                onOrderCreated={handleOrderCreated}
                onDeductDeposit={handleDeductDeposit}
                initialCustomer={selectedCustomerForOrder}
                onClearInitialCustomer={() => setSelectedCustomerForOrder(null)}
              />
            </motion.div>
          )}

          {currentTab === 'antrean' && (
            <motion.div
              key="antrean"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Antrean & Alur Pengerjaan Cucian
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pantau tahapan cuci, update status ke tahap berikutnya, dan kirim notifikasi WhatsApp.
                  </p>
                </div>
              </div>
              <OrderList
                orders={orders}
                settings={settings}
                onUpdateStage={handleUpdateStage}
                onTogglePayment={handleTogglePayment}
                onDeleteOrder={handleDeleteOrder}
                onViewReceipt={handleViewReceipt}
                currentUser={currentUser}
              />
            </motion.div>
          )}

          {currentTab === 'pelanggan' && (
            <motion.div
              key="pelanggan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <CustomerManager
                customers={customers}
                orders={orders}
                settings={settings}
                onSaveCustomer={handleSaveCustomer}
                onDeleteCustomer={handleDeleteCustomer}
                onTopUpDeposit={handleTopUpDeposit}
                onSelectCustomerForNewOrder={(customer) => {
                  setSelectedCustomerForOrder(customer);
                  setCurrentTab('kasir');
                }}
                currentUser={currentUser}
              />
            </motion.div>
          )}

          {currentTab === 'lacak' && (
            <motion.div
              key="lacak"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <PublicTracking
                orders={orders}
                settings={settings}
                onViewReceipt={handleViewReceipt}
              />
            </motion.div>
          )}

          {currentTab === 'layanan' && (
            <motion.div
              key="layanan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <ServiceManager
                services={services}
                onSaveServices={handleSaveServices}
                currentUser={currentUser}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
              />
            </motion.div>
          )}

          {currentTab === 'laporan' && (
            <motion.div
              key="laporan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <FinanceReport
                orders={orders}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onResetOrders={handleResetOrders}
                currentUser={currentUser}
                users={users}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
                payrolls={payrolls}
                onNavigatePayroll={() => setCurrentTab('penggajian')}
                expenses={expenses}
                onNavigateBahan={() => setCurrentTab('bahan')}
              />
            </motion.div>
          )}

          {currentTab === 'karyawan' && (
            <motion.div
              key="karyawan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <UserManager
                users={users}
                currentUser={currentUser}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
              />
            </motion.div>
          )}

          {currentTab === 'penggajian' && (
            <motion.div
              key="penggajian"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <PayrollManager
                payrolls={payrolls}
                users={users}
                orders={orders}
                settings={settings}
                currentUser={currentUser}
                onAddPayroll={handleAddPayroll}
                onUpdatePayroll={handleUpdatePayroll}
                onDeletePayroll={handleDeletePayroll}
                onUpdateSalaryConfig={handleUpdateSalaryConfig}
              />
            </motion.div>
          )}

          {currentTab === 'bahan' && (
            <motion.div
              key="bahan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <SupplyPurchaseManager
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
                currentUser={currentUser}
                shopName={settings.shopName}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Printable Digital Receipt Modal */}
      <ReceiptModal
        order={receiptOrder}
        settings={settings}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        onTogglePaymentStatus={handleTogglePayment}
        adminName={users.find((u) => u.role === 'admin')?.name}
        cashierName={currentUser?.name || users.find((u) => u.role === 'admin')?.name}
      />

      {/* Login & Role Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        users={users}
        currentUser={currentUser}
        onLogin={handleLogin}
        onClose={() => setIsLoginModalOpen(false)}
        canClose={true}
      />
    </div>
  );
}
