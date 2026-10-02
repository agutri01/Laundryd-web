import {
  LaundryOrder,
  Customer,
  LaundryService,
  LaundrySettings,
  AppUser,
  PayrollItem,
  ExpenseItem,
  AttendanceRecord,
} from '../types';

/**
 * Escapes strings for MySQL INSERT statements to avoid syntax errors and SQL injection.
 */
function escapeSqlString(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? '0' : val.toString();
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  const str = String(val);
  return `'${str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case '\0':
        return '\\0';
      case '\x08':
        return '\\b';
      case '\x09':
        return '\\t';
      case '\x1a':
        return '\\z';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '"':
      case "'":
      case '\\':
      case '%':
        return '\\' + char;
      default:
        return char;
    }
  })}'`;
}

/**
 * Converts ISO 8601 dates to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
 */
function toSqlDatetime(isoStr: string | undefined): string {
  if (!isoStr) return 'NULL';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'NULL';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `'${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}'`;
  } catch {
    return 'NULL';
  }
}

export interface DatabaseDumpData {
  orders: LaundryOrder[];
  customers: Customer[];
  services: LaundryService[];
  settings: LaundrySettings;
  users: AppUser[];
  payrolls: PayrollItem[];
  expenses?: ExpenseItem[];
  attendances?: AttendanceRecord[];
}

/**
 * Generates a complete, ready-to-import MySQL script for phpMyAdmin.
 */
export function generatePhpMyAdminSql(data: DatabaseDumpData): string {
  const timestamp = new Date().toISOString();
  const shopNameEscaped = data.settings.shopName.replace(/[^a-zA-Z0-9_-]/g, '_');

  let sql = `-- ========================================================
-- DATABASE EXPORT UNTUK phpMyAdmin / MySQL
-- Aplikasi: D laundry Management System
-- Tanggal Ekspor: ${timestamp}
-- Kompatibel dengan: phpMyAdmin 4.x / 5.x, MySQL 5.7 / 8.0, MariaDB 10.x
-- ========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 1. Buat Database dan Gunakan Database
--
CREATE DATABASE IF NOT EXISTS \`dlaundry\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`dlaundry\`;

-- --------------------------------------------------------
-- 2. Struktur Tabel \`settings\` (Pengaturan Toko & Nota)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`settings\`;
CREATE TABLE \`settings\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`shop_name\` varchar(255) NOT NULL,
  \`shop_phone\` varchar(50) NOT NULL,
  \`shop_address\` text NOT NULL,
  \`footer_message\` text NOT NULL,
  \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO \`settings\` (\`id\`, \`shop_name\`, \`shop_phone\`, \`shop_address\`, \`footer_message\`, \`updated_at\`) VALUES
(1, ${escapeSqlString(data.settings.shopName)}, ${escapeSqlString(data.settings.shopPhone)}, ${escapeSqlString(data.settings.shopAddress)}, ${escapeSqlString(data.settings.footerMessage)}, NOW());

-- --------------------------------------------------------
-- 3. Struktur Tabel \`users\` (Akun Staf & Karyawan)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` varchar(64) NOT NULL,
  \`username\` varchar(64) NOT NULL,
  \`name\` varchar(128) NOT NULL,
  \`role\` enum('admin','pekerja') NOT NULL DEFAULT 'pekerja',
  \`station\` varchar(64) DEFAULT NULL,
  \`phone\` varchar(32) DEFAULT NULL,
  \`bank_name\` varchar(64) DEFAULT NULL,
  \`bank_account\` varchar(64) DEFAULT NULL,
  \`salary_config_json\` text DEFAULT NULL,
  \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
  \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`username_unique\` (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  if (data.users.length > 0) {
    sql += `\nINSERT INTO \`users\` (\`id\`, \`username\`, \`name\`, \`role\`, \`station\`, \`phone\`, \`bank_name\`, \`bank_account\`, \`salary_config_json\`, \`is_active\`, \`created_at\`) VALUES\n`;
    const userValues = data.users.map((u) => {
      const station = u.assignedStation || '';
      const bankName = u.salaryConfig?.bankName || '';
      const bankAccount = u.salaryConfig?.bankAccount || '';
      return `(${escapeSqlString(u.id)}, ${escapeSqlString(u.username)}, ${escapeSqlString(u.name)}, ${escapeSqlString(u.role)}, ${escapeSqlString(station)}, ${escapeSqlString(u.phone)}, ${escapeSqlString(bankName)}, ${escapeSqlString(bankAccount)}, ${escapeSqlString(u.salaryConfig)}, ${u.isActive ? 1 : 0}, ${toSqlDatetime(u.createdAt)})`;
    });
    sql += userValues.join(',\n') + ';\n';
  }

  sql += `
-- --------------------------------------------------------
-- 4. Struktur Tabel \`customers\` (Data Pelanggan & Saldo Deposit)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`customers\`;
CREATE TABLE \`customers\` (
  \`id\` varchar(64) NOT NULL,
  \`name\` varchar(128) NOT NULL,
  \`phone\` varchar(32) NOT NULL,
  \`address\` text DEFAULT NULL,
  \`deposit_balance\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`notes\` text DEFAULT NULL,
  \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_cust_phone\` (\`phone\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  if (data.customers.length > 0) {
    sql += `\nINSERT INTO \`customers\` (\`id\`, \`name\`, \`phone\`, \`address\`, \`deposit_balance\`, \`notes\`, \`created_at\`) VALUES\n`;
    const custValues = data.customers.map((c) => {
      return `(${escapeSqlString(c.id || `cst-${Date.now()}`)}, ${escapeSqlString(c.name)}, ${escapeSqlString(c.phone)}, ${escapeSqlString(c.address)}, ${c.depositBalance || 0}, ${escapeSqlString(c.notes)}, ${toSqlDatetime(c.createdAt)})`;
    });
    sql += custValues.join(',\n') + ';\n';
  }

  sql += `
-- --------------------------------------------------------
-- 5. Struktur Tabel \`services\` (Katalog Paket & Tarif Cucian)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`services\`;
CREATE TABLE \`services\` (
  \`id\` varchar(64) NOT NULL,
  \`name\` varchar(128) NOT NULL,
  \`category\` varchar(64) NOT NULL,
  \`price\` decimal(12,2) NOT NULL,
  \`unit\` varchar(16) NOT NULL DEFAULT 'kg',
  \`estimated_hours\` int(11) NOT NULL DEFAULT 24,
  \`description\` text DEFAULT NULL,
  \`badge\` varchar(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  if (data.services.length > 0) {
    sql += `\nINSERT INTO \`services\` (\`id\`, \`name\`, \`category\`, \`price\`, \`unit\`, \`estimated_hours\`, \`description\`, \`badge\`) VALUES\n`;
    const srvValues = data.services.map((s) => {
      return `(${escapeSqlString(s.id)}, ${escapeSqlString(s.name)}, ${escapeSqlString(s.category)}, ${s.price}, ${escapeSqlString(s.unit)}, ${s.estimatedHours || 24}, ${escapeSqlString(s.description)}, ${escapeSqlString(s.badge)})`;
    });
    sql += srvValues.join(',\n') + ';\n';
  }

  sql += `
-- --------------------------------------------------------
-- 6. Struktur Tabel \`orders\` (Faktur Transaksi Cucian)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`orders\`;
CREATE TABLE \`orders\` (
  \`id\` varchar(64) NOT NULL,
  \`customer_name\` varchar(128) NOT NULL,
  \`customer_phone\` varchar(32) NOT NULL,
  \`customer_address\` text DEFAULT NULL,
  \`perfume\` varchar(64) DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  \`stage\` varchar(32) NOT NULL DEFAULT 'antrian',
  \`payment_status\` enum('lunas','belum_lunas') NOT NULL DEFAULT 'belum_lunas',
  \`payment_method\` varchar(32) NOT NULL DEFAULT 'tunai',
  \`subtotal\` decimal(12,2) NOT NULL,
  \`discount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`delivery_fee\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`total\` decimal(12,2) NOT NULL,
  \`created_at\` datetime NOT NULL,
  \`estimated_completion\` datetime NOT NULL,
  \`completed_at\` datetime DEFAULT NULL,
  \`timeline_json\` text DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_order_phone\` (\`customer_phone\`),
  KEY \`idx_order_stage\` (\`stage\`),
  KEY \`idx_order_payment\` (\`payment_status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  if (data.orders.length > 0) {
    sql += `\nINSERT INTO \`orders\` (\`id\`, \`customer_name\`, \`customer_phone\`, \`customer_address\`, \`perfume\`, \`notes\`, \`stage\`, \`payment_status\`, \`payment_method\`, \`subtotal\`, \`discount\`, \`delivery_fee\`, \`total\`, \`created_at\`, \`estimated_completion\`, \`completed_at\`, \`timeline_json\`) VALUES\n`;
    const orderValues = data.orders.map((o) => {
      return `(${escapeSqlString(o.id)}, ${escapeSqlString(o.customer.name)}, ${escapeSqlString(o.customer.phone)}, ${escapeSqlString(o.customer.address)}, ${escapeSqlString(o.perfume)}, ${escapeSqlString(o.notes)}, ${escapeSqlString(o.stage)}, ${escapeSqlString(o.paymentStatus)}, ${escapeSqlString(o.paymentMethod)}, ${o.subtotal}, ${o.discount || 0}, ${o.deliveryFee || 0}, ${o.total}, ${toSqlDatetime(o.createdAt)}, ${toSqlDatetime(o.estimatedCompletion)}, ${toSqlDatetime(o.completedAt)}, ${escapeSqlString(o.timeline)})`;
    });
    sql += orderValues.join(',\n') + ';\n';
  }

  sql += `
-- --------------------------------------------------------
-- 7. Struktur Tabel \`order_items\` (Rincian Item Tiap Faktur)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`order_items\`;
CREATE TABLE \`order_items\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`order_id\` varchar(64) NOT NULL,
  \`service_id\` varchar(64) DEFAULT NULL,
  \`service_name\` varchar(128) NOT NULL,
  \`price\` decimal(12,2) NOT NULL,
  \`unit\` varchar(16) NOT NULL,
  \`quantity\` decimal(8,2) NOT NULL,
  \`subtotal\` decimal(12,2) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_item_order_id\` (\`order_id\`),
  CONSTRAINT \`fk_order_items_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  const allItems: { orderId: string; item: any }[] = [];
  data.orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      allItems.push({ orderId: o.id, item: it });
    });
  });

  if (allItems.length > 0) {
    sql += `\nINSERT INTO \`order_items\` (\`order_id\`, \`service_id\`, \`service_name\`, \`price\`, \`unit\`, \`quantity\`, \`subtotal\`) VALUES\n`;
    const itemValues = allItems.map(({ orderId, item }) => {
      return `(${escapeSqlString(orderId)}, ${escapeSqlString(item.serviceId)}, ${escapeSqlString(item.serviceName)}, ${item.price}, ${escapeSqlString(item.unit)}, ${item.quantity}, ${item.subtotal || item.price * item.quantity})`;
    });
    sql += itemValues.join(',\n') + ';\n';
  }

  sql += `
-- --------------------------------------------------------
-- 8. Struktur Tabel \`payrolls\` (Slip Gaji & Payroll Karyawan)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`payrolls\`;
CREATE TABLE \`payrolls\` (
  \`id\` varchar(64) NOT NULL,
  \`user_id\` varchar(64) NOT NULL,
  \`user_name\` varchar(128) NOT NULL,
  \`user_role\` varchar(32) NOT NULL,
  \`user_station\` varchar(64) DEFAULT NULL,
  \`user_phone\` varchar(32) DEFAULT NULL,
  \`period\` varchar(32) NOT NULL,
  \`base_salary\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`allowance\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`allowance_notes\` text DEFAULT NULL,
  \`overtime_hours\` decimal(6,2) DEFAULT 0.00,
  \`overtime_pay\` decimal(12,2) DEFAULT 0.00,
  \`commission_total\` decimal(12,2) DEFAULT 0.00,
  \`commission_notes\` text DEFAULT NULL,
  \`bonus\` decimal(12,2) DEFAULT 0.00,
  \`bonus_notes\` text DEFAULT NULL,
  \`total_income\` decimal(12,2) NOT NULL,
  \`kasbon_deduction\` decimal(12,2) DEFAULT 0.00,
  \`absence_deduction\` decimal(12,2) DEFAULT 0.00,
  \`other_deduction\` decimal(12,2) DEFAULT 0.00,
  \`other_deduction_notes\` text DEFAULT NULL,
  \`total_deduction\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`net_salary\` decimal(12,2) NOT NULL,
  \`status\` enum('lunas','pending') NOT NULL DEFAULT 'pending',
  \`payment_method\` varchar(32) NOT NULL DEFAULT 'transfer',
  \`bank_name\` varchar(64) DEFAULT NULL,
  \`bank_account\` varchar(64) DEFAULT NULL,
  \`payment_date\` datetime NOT NULL,
  \`paid_at\` datetime DEFAULT NULL,
  \`paid_by_admin_name\` varchar(128) DEFAULT NULL,
  \`notes\` text DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_payroll_user\` (\`user_id\`),
  KEY \`idx_payroll_period\` (\`period\`),
  KEY \`idx_payroll_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  if (data.payrolls.length > 0) {
    sql += `\nINSERT INTO \`payrolls\` (\`id\`, \`user_id\`, \`user_name\`, \`user_role\`, \`user_station\`, \`user_phone\`, \`period\`, \`base_salary\`, \`allowance\`, \`allowance_notes\`, \`overtime_hours\`, \`overtime_pay\`, \`commission_total\`, \`commission_notes\`, \`bonus\`, \`bonus_notes\`, \`total_income\`, \`kasbon_deduction\`, \`absence_deduction\`, \`other_deduction\`, \`other_deduction_notes\`, \`total_deduction\`, \`net_salary\`, \`status\`, \`payment_method\`, \`bank_name\`, \`bank_account\`, \`payment_date\`, \`paid_at\`, \`paid_by_admin_name\`, \`notes\`) VALUES\n`;
    const payrollValues = data.payrolls.map((p) => {
      return `(${escapeSqlString(p.id)}, ${escapeSqlString(p.userId)}, ${escapeSqlString(p.userName)}, ${escapeSqlString(p.userRole)}, ${escapeSqlString(p.userStation)}, ${escapeSqlString(p.userPhone)}, ${escapeSqlString(p.period)}, ${p.baseSalary || 0}, ${p.allowance || 0}, ${escapeSqlString(p.allowanceNotes)}, ${p.overtimeHours || 0}, ${p.overtimePay || 0}, ${p.commissionTotal || 0}, ${escapeSqlString(p.commissionNotes)}, ${p.bonus || 0}, ${escapeSqlString(p.bonusNotes)}, ${p.totalIncome || 0}, ${p.kasbonDeduction || 0}, ${p.absenceDeduction || 0}, ${p.otherDeduction || 0}, ${escapeSqlString(p.otherDeductionNotes)}, ${p.totalDeduction || 0}, ${p.netSalary || 0}, ${escapeSqlString(p.status)}, ${escapeSqlString(p.paymentMethod)}, ${escapeSqlString(p.bankName)}, ${escapeSqlString(p.bankAccount)}, ${toSqlDatetime(p.paymentDate)}, ${toSqlDatetime(p.paidAt)}, ${escapeSqlString(p.paidByAdminName)}, ${escapeSqlString(p.notes)})`;
    });
    sql += payrollValues.join(',\n') + ';\n';
  }

  // 9. Struktur Tabel expenses (Pengeluaran Operasional & Pembelian Bahan)
  sql += `
-- --------------------------------------------------------
-- 9. Struktur Tabel \`expenses\` (Pengeluaran Operasional & Pembelian Bahan)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`expenses\`;
CREATE TABLE \`expenses\` (
  \`id\` varchar(64) NOT NULL,
  \`category\` varchar(64) NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`item_name\` varchar(255) DEFAULT NULL,
  \`quantity\` decimal(8,2) DEFAULT NULL,
  \`unit\` varchar(64) DEFAULT NULL,
  \`unit_price\` decimal(12,2) DEFAULT NULL,
  \`amount\` decimal(12,2) NOT NULL DEFAULT 0.00,
  \`supplier\` varchar(128) DEFAULT NULL,
  \`payment_method\` varchar(32) DEFAULT 'tunai',
  \`payment_status\` enum('lunas','tempo') DEFAULT 'lunas',
  \`date\` date NOT NULL,
  \`notes\` text DEFAULT NULL,
  \`recorded_by\` varchar(128) DEFAULT NULL,
  \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_expense_category\` (\`category\`),
  KEY \`idx_expense_date\` (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  if (data.expenses && data.expenses.length > 0) {
    sql += `\nINSERT INTO \`expenses\` (\`id\`, \`category\`, \`title\`, \`item_name\`, \`quantity\`, \`unit\`, \`unit_price\`, \`amount\`, \`supplier\`, \`payment_method\`, \`payment_status\`, \`date\`, \`notes\`, \`recorded_by\`, \`created_at\`) VALUES\n`;
    const expValues = data.expenses.map((e) => {
      return `(${escapeSqlString(e.id)}, ${escapeSqlString(e.category)}, ${escapeSqlString(e.title)}, ${escapeSqlString(e.itemName)}, ${e.quantity || 'NULL'}, ${escapeSqlString(e.unit)}, ${e.unitPrice || 'NULL'}, ${e.amount || 0}, ${escapeSqlString(e.supplier)}, ${escapeSqlString(e.paymentMethod || 'tunai')}, ${escapeSqlString(e.paymentStatus || 'lunas')}, ${escapeSqlString(e.date)}, ${escapeSqlString(e.notes)}, ${escapeSqlString(e.recordedBy)}, ${toSqlDatetime(e.createdAt)})`;
    });
    sql += expValues.join(',\n') + ';\n';
  }

  // 10. Struktur Tabel attendance (Absensi & Jam Kerja Karyawan)
  sql += `
-- --------------------------------------------------------
-- 10. Struktur Tabel \`attendance\` (Absensi & Jam Kerja Karyawan)
-- --------------------------------------------------------
DROP TABLE IF EXISTS \`attendance\`;
CREATE TABLE \`attendance\` (
  \`id\` varchar(64) NOT NULL,
  \`user_id\` varchar(64) NOT NULL,
  \`user_name\` varchar(128) NOT NULL,
  \`date\` date NOT NULL,
  \`check_in_time\` datetime NOT NULL,
  \`check_out_time\` datetime DEFAULT NULL,
  \`station\` varchar(64) NOT NULL DEFAULT 'semua',
  \`status\` enum('hadir','izin','sakit','alpha') NOT NULL DEFAULT 'hadir',
  \`notes\` text DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_att_user\` (\`user_id\`),
  KEY \`idx_att_date\` (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  if (data.attendances && data.attendances.length > 0) {
    sql += `\nINSERT INTO \`attendance\` (\`id\`, \`user_id\`, \`user_name\`, \`date\`, \`check_in_time\`, \`check_out_time\`, \`station\`, \`status\`, \`notes\`) VALUES\n`;
    const attValues = data.attendances.map((a) => {
      return `(${escapeSqlString(a.id)}, ${escapeSqlString(a.userId)}, ${escapeSqlString(a.userName)}, ${escapeSqlString(a.date)}, ${toSqlDatetime(a.checkInTime)}, ${toSqlDatetime(a.checkOutTime)}, ${escapeSqlString(a.station)}, ${escapeSqlString(a.status)}, ${escapeSqlString(a.notes)})`;
    });
    sql += attValues.join(',\n') + ';\n';
  }

  sql += `
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- ========================================================
-- Ekspor Selesai! File ini siap di-Import di phpMyAdmin.
-- ========================================================
`;

  return sql;
}

/**
 * Triggers a browser download of the generated SQL file.
 */
export function downloadPhpMyAdminSqlFile(data: DatabaseDumpData, filename: string = 'dlaundry_database.sql') {
  const sqlContent = generatePhpMyAdminSql(data);
  const blob = new Blob([sqlContent], { type: 'application/sql;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
