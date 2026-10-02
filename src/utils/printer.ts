import { LaundryOrder, LaundrySettings, PayrollItem, formatRupiah, formatDateIndo } from '../types';

export type PaperSize = 'thermal-58' | 'thermal-80' | 'faktur-a4';

/**
 * Injects dynamic @page size style and strict element isolation for printing from PC or mobile device.
 * Ensures thermal receipts do not get letter/A4 huge margins, and eliminates screen/modal artifacts.
 */
export const triggerPrintWithPaperSize = (
  paperSize: PaperSize,
  targetElementId?: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
) => {
  const existingStyle = document.getElementById('dynamic-print-page-style');
  if (existingStyle) {
    existingStyle.remove();
  }

  const styleEl = document.createElement('style');
  styleEl.id = 'dynamic-print-page-style';

  const selector = targetElementId
    ? `#${targetElementId}`
    : '#printable-receipt, #payroll-slip-printable, #printable-monthly-payroll, #printable-finance-report';

  let pageMargin = '0mm';
  let pageSize = '58mm auto';
  let elementWidth = '48mm';
  let elementMaxWidth = '48mm';
  let elementPadding = '0 0.5mm';
  let elementFontSize = '9px';

  if (paperSize === 'thermal-80') {
    pageSize = '80mm auto';
    elementWidth = '72mm';
    elementMaxWidth = '74mm';
    elementPadding = '0 1mm';
    elementFontSize = '10.5px';
  } else if (paperSize === 'faktur-a4') {
    pageSize = orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
    pageMargin = '6mm';
    elementWidth = '100%';
    elementMaxWidth = orientation === 'landscape' ? '280mm' : '200mm';
    elementPadding = '4mm 6mm';
    elementFontSize = '11.5px';
  }

  styleEl.innerHTML = `
    @page {
      size: ${pageSize};
      margin: ${pageMargin} !important;
    }
    @media print {
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body * {
        visibility: hidden !important;
      }
      nav, header, aside, footer, button, input, select, textarea, .no-print, .no-print * {
        display: none !important;
        visibility: hidden !important;
      }
      #root, #root > div, main, main > div, #receipt-modal-backdrop, #receipt-modal-content, #receipt-modal-content > div, #receipt-modal-content div, #payroll-slip-backdrop, #payroll-slip-modal-content, #payroll-slip-modal-content > div, #payroll-slip-modal-content div, [role="dialog"], [role="dialog"] > div {
        display: block !important;
        position: static !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        overflow: visible !important;
        transform: none !important;
        filter: none !important;
      }
      ${selector},
      ${selector} * {
        visibility: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      ${selector} {
        display: block !important;
        position: relative !important;
        margin: 0 auto !important;
        width: ${elementWidth} !important;
        max-width: ${elementMaxWidth} !important;
        padding: ${elementPadding} !important;
        font-size: ${elementFontSize} !important;
        font-family: 'Courier New', Courier, monospace !important;
        line-height: 1.25 !important;
        letter-spacing: -0.2px !important;
        color: #000000 !important;
        box-shadow: none !important;
        border: none !important;
        background: #ffffff !important;
        page-break-inside: auto !important;
        box-sizing: border-box !important;
      }
      ${selector} > div, ${selector} .p-4, ${selector} .sm\\:p-5 {
        padding: 0 0.5mm !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      ${selector} .bg-black {
        background-color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;

  document.head.appendChild(styleEl);

  // Small timeout to allow DOM/style calculation before native print dialog opens
  setTimeout(() => {
    window.print();
  }, 100);
};

/**
 * Checks if Web Bluetooth API is supported by the current browser.
 * Works natively on Google Chrome (Android, Windows, macOS, Linux, ChromeOS) and Edge.
 */
export const isWebBluetoothSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

/**
 * Helper to pad strings for fixed-width thermal printer rows.
 */
const padRow = (left: string, right: string, width: number): string => {
  const spaceNeeded = width - (left.length + right.length);
  if (spaceNeeded <= 0) {
    return left.slice(0, width - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(spaceNeeded) + right;
};

/**
 * Builds ESC/POS binary command buffer for Laundry Invoice / Nota Kasir.
 */
export const buildOrderEscPosBytes = (
  order: LaundryOrder,
  settings: LaundrySettings,
  cols: number = 32 // 32 for 58mm, 48 for 80mm
): Uint8Array => {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const add = (bytes: number[] | Uint8Array) => {
    chunks.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  };

  const addText = (text: string) => {
    add(enc.encode(text + '\n'));
  };

  // 1. ESC @ : Initialize
  add([0x1b, 0x40]);

  // 2. Center Align
  add([0x1b, 0x61, 0x01]);

  // Double width & height for Shop Name
  add([0x1b, 0x21, 0x30]);
  addText(settings.shopName);

  // Normal text
  add([0x1b, 0x21, 0x00]);
  addText(settings.shopAddress);
  addText(`Telp/WA: ${settings.shopPhone}`);
  addText('='.repeat(cols));

  // Double height for NOTA TITLE
  add([0x1b, 0x21, 0x10]);
  addText('FAKTUR / NOTA CUCIAN');
  add([0x1b, 0x21, 0x00]);

  // 3. Left Align for Order Info
  add([0x1b, 0x61, 0x00]);
  addText(padRow('No. Nota :', order.id, cols));
  addText(padRow('Tgl Masuk:', formatDateIndo(order.createdAt).slice(0, 16), cols));
  addText(padRow('Pelanggan:', order.customer.name, cols));
  addText(padRow('No. HP   :', order.customer.phone, cols));
  if (order.perfume) {
    addText(padRow('Parfum   :', order.perfume, cols));
  }
  if (order.notes) {
    addText(`Catatan  : ${order.notes}`);
  }
  addText('-'.repeat(cols));

  // Item List Header
  addText(padRow('ITEM / LAYANAN', 'HARGA', cols));
  addText('-'.repeat(cols));

  order.items.forEach((item) => {
    const qtyStr = `${item.quantity} ${item.unit}`;
    const priceStr = formatRupiah(item.subtotal || item.price * item.quantity);
    addText(item.serviceName);
    addText(padRow(`  ${qtyStr} x ${formatRupiah(item.price)}`, priceStr, cols));
  });

  addText('-'.repeat(cols));

  // Financial Summary
  if (order.subtotal !== order.total) {
    addText(padRow('Subtotal      :', formatRupiah(order.subtotal), cols));
    if (order.discount > 0) {
      addText(padRow('Diskon        :', `-${formatRupiah(order.discount)}`, cols));
    }
    if (order.deliveryFee > 0) {
      addText(padRow('Ongkos Antar  :', formatRupiah(order.deliveryFee), cols));
    }
  }
  addText(padRow('TOTAL TAGIHAN :', formatRupiah(order.total), cols));
  addText(padRow('Status Bayar  :', order.paymentStatus === 'lunas' ? 'LUNAS' : 'BELUM LUNAS', cols));
  addText(padRow('Metode Bayar  :', order.paymentMethod.toUpperCase(), cols));
  addText(padRow('Status Cucian :', order.stage.toUpperCase(), cols));

  addText('='.repeat(cols));

  // Footer / Notes
  add([0x1b, 0x61, 0x01]); // Center align
  addText(`Estimasi Selesai:`);
  addText(formatDateIndo(order.estimatedCompletion));
  addText('');
  addText(`"${settings.footerMessage}"`);
  addText('Simpan nota ini sbg bukti sah');
  addText('pengambilan pakaian.');

  // Feed & Cut Paper (GS V 66 3)
  add([0x1d, 0x56, 0x42, 0x03]);

  // Combine chunks into single Uint8Array
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

/**
 * Builds ESC/POS binary command buffer for Payroll Slip.
 */
export const buildPayrollEscPosBytes = (
  payroll: PayrollItem,
  settings: LaundrySettings,
  cols: number = 32,
  adminName?: string
): Uint8Array => {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const add = (bytes: number[] | Uint8Array) => {
    chunks.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  };

  const addText = (text: string) => {
    add(enc.encode(text + '\n'));
  };

  // Initialize
  add([0x1b, 0x40]);
  add([0x1b, 0x61, 0x01]); // Center

  // Shop Header
  add([0x1b, 0x21, 0x30]);
  addText(settings.shopName);
  add([0x1b, 0x21, 0x00]);
  addText(settings.shopAddress);
  addText(`WA: ${settings.shopPhone}`);
  addText('='.repeat(cols));

  // Slip Title
  add([0x1b, 0x21, 0x10]);
  addText('SLIP GAJI KARYAWAN');
  add([0x1b, 0x21, 0x00]);
  addText(`Periode: ${payroll.period}`);
  addText('-'.repeat(cols));

  // Employee Info
  add([0x1b, 0x61, 0x00]); // Left
  addText(padRow('No. Slip :', payroll.id, cols));
  addText(padRow('Karyawan :', payroll.userName, cols));
  addText(padRow('Posisi   :', (payroll.userStation || payroll.userRole).toUpperCase(), cols));
  addText(padRow('Status   :', payroll.status.toUpperCase(), cols));
  addText('-'.repeat(cols));

  // Income Components
  addText('RINCIAN PENERIMAAN:');
  addText(padRow(' Gaji Pokok', formatRupiah(payroll.baseSalary), cols));
  if (payroll.allowance > 0) {
    addText(padRow(' Tunjangan', formatRupiah(payroll.allowance), cols));
  }
  if (payroll.overtimePay && payroll.overtimePay > 0) {
    addText(padRow(` Lembur (${payroll.overtimeHours || 0} Jam)`, formatRupiah(payroll.overtimePay), cols));
  }
  if (payroll.commissionTotal && payroll.commissionTotal > 0) {
    addText(padRow(' Insentif/Komisi', formatRupiah(payroll.commissionTotal), cols));
  }
  if (payroll.bonus && payroll.bonus > 0) {
    addText(padRow(' Bonus Prestasi', formatRupiah(payroll.bonus), cols));
  }
  addText(padRow('TOTAL BRUTO', formatRupiah(payroll.totalIncome), cols));
  addText('-'.repeat(cols));

  // Deductions
  if (payroll.totalDeduction > 0) {
    addText('RINCIAN POTONGAN:');
    if (payroll.kasbonDeduction > 0) {
      addText(padRow(' Potongan Kasbon', `-${formatRupiah(payroll.kasbonDeduction)}`, cols));
    }
    if ((payroll.absenceDeduction || 0) + (payroll.otherDeduction || 0) > 0) {
      addText(padRow(' Potongan Lain', `-${formatRupiah((payroll.absenceDeduction || 0) + (payroll.otherDeduction || 0))}`, cols));
    }
    addText(padRow('TOTAL POTONGAN', `-${formatRupiah(payroll.totalDeduction)}`, cols));
    addText('-'.repeat(cols));
  }

  // Net THP (Double height)
  add([0x1b, 0x21, 0x10]);
  addText(padRow('GAJI BERSIH (THP):', '', cols));
  addText(padRow('', formatRupiah(payroll.netSalary), cols));
  add([0x1b, 0x21, 0x00]);

  addText('='.repeat(cols));

  // Payment Details
  add([0x1b, 0x61, 0x01]); // Center
  addText(`Metode: ${payroll.paymentMethod.toUpperCase()}`);
  if (payroll.bankName) {
    addText(`${payroll.bankName} - ${payroll.bankAccount}`);
  }
  addText(`Tgl Bayar: ${formatDateIndo(payroll.paymentDate)}`);
  addText('');
  addText('Dokumen ini dicetak otomatis');
  addText(`oleh sistem payroll ${settings.shopName}`);
  const ownerLabel = (adminName || payroll.paidByAdminName || 'Owner & Admin').replace(/\s*\([^)]*\)/g, '').trim() || 'Owner';
  addText(`Owner: ${ownerLabel}`);

  // Cut
  add([0x1d, 0x56, 0x42, 0x03]);

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

/**
 * Common Bluetooth Thermal Printer Service and Characteristic UUIDs.
 */
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Bluetooth service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
];

/**
 * Connects and sends ESC/POS bytes directly to a Bluetooth Thermal Printer via Web Bluetooth API.
 * Works seamlessly on Android phones (Chrome) and PC/Laptop with Bluetooth.
 */
export const printBytesViaBluetooth = async (
  bytes: Uint8Array,
  onStatusUpdate?: (status: string) => void
): Promise<{ success: boolean; message: string }> => {
  if (!isWebBluetoothSupported()) {
    return {
      success: false,
      message: 'Browser tidak mendukung Web Bluetooth. Gunakan Google Chrome pada HP Android atau Komputer, atau gunakan tombol Cetak Sistem.',
    };
  }

  try {
    onStatusUpdate?.('Mencari printer Bluetooth thermal di sekitar...');
    // Request device: either with filter or acceptAllDevices
    // Note: TypeScript navigator doesn't have bluetooth by default in standard lib, so we cast to any
    const navAny = navigator as any;

    const device = await navAny.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_PRINTER_SERVICES,
    });

    if (!device) {
      return { success: false, message: 'Pencarian printer dibatalkan.' };
    }

    onStatusUpdate?.(`Menghubungkan ke ${device.name || 'Printer Bluetooth'}...`);
    const server = await device.gatt.connect();

    // Find printer service
    let writeChar: any = null;

    for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
        if (writeChar) break;
      } catch {
        // Continue to check other services
      }
    }

    // Fallback: try getting all primary services if none found in known list
    if (!writeChar) {
      try {
        const services = await server.getPrimaryServices();
        for (const s of services) {
          const chars = await s.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writeChar = c;
              break;
            }
          }
          if (writeChar) break;
        }
      } catch (err) {
        console.warn('Could not enumerate all services:', err);
      }
    }

    if (!writeChar) {
      throw new Error('Karakteristik write printer tidak ditemukan pada perangkat Bluetooth ini.');
    }

    onStatusUpdate?.('Mengirim data cetak struk...');

    // Bluetooth Low Energy MTU is typically 20 to 100 bytes, send in chunks
    const CHUNK_SIZE = 64;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      if (writeChar.writeValueWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValue(chunk);
      }
      // Small pause between chunks
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    onStatusUpdate?.('Pencetakan berhasil!');
    return {
      success: true,
      message: `Berhasil mencetak ke ${device.name || 'Printer Bluetooth'}!`,
    };
  } catch (error: any) {
    console.error('Bluetooth print error:', error);
    if (error.name === 'NotFoundError') {
      return { success: false, message: 'Tidak ada printer yang dipilih.' };
    }
    return {
      success: false,
      message: error.message || 'Gagal menghubungkan printer Bluetooth.',
    };
  }
};
