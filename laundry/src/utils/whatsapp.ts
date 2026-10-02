import { LaundryOrder, LaundrySettings, STAGE_CONFIG, formatRupiah, formatDateIndo } from '../types';
import { DEFAULT_SETTINGS } from '../data/defaultData';

export function cleanPhoneNumber(phone: string): string {
  // Replace leading 08 with 628, remove non-numeric
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function generateWhatsAppReceiptMessage(
  order: LaundryOrder,
  settings: LaundrySettings = DEFAULT_SETTINGS
): string {
  const itemsText = order.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.serviceName}*\n   ${item.quantity} ${item.unit} x ${formatRupiah(item.price)} = *${formatRupiah(item.subtotal)}*`
    )
    .join('\n');

  const discountText =
    order.discount > 0 ? `\nDiskon: -${formatRupiah(order.discount)}` : '';
  const deliveryText =
    order.deliveryFee > 0 ? `\nOngkir Antar-Jemput: ${formatRupiah(order.deliveryFee)}` : '';

  const paymentText =
    order.paymentStatus === 'lunas'
      ? `✅ *LUNAS* (${order.paymentMethod.toUpperCase()})`
      : `⚠️ *BELUM LUNAS* (${order.paymentMethod.toUpperCase()})`;

  const message = `Halo Kak *${order.customer.name}*! 👋
Terima kasih telah mempercayakan cucian Anda di *${settings.shopName}*.

Berikut rincian nota digital Anda:
📄 *No. Nota:* ${order.id}
📅 *Tgl Masuk:* ${formatDateIndo(order.createdAt)}
⏰ *Estimasi Selesai:* ${formatDateIndo(order.estimatedCompletion)}
🌸 *Pilihan Parfum:* ${order.perfume}
${order.notes ? `📝 *Catatan:* ${order.notes}\n` : ''}
*Rincian Cucian:*
${itemsText}
${discountText}${deliveryText}
---------------------------------
💰 *TOTAL:* *${formatRupiah(order.total)}*
💳 *Status:* ${paymentText}
🔄 *Status Cucian:* *${STAGE_CONFIG[order.stage].label}*

${
  order.stage === 'siap_ambil'
    ? '✨ Cucian Anda sudah bersih, wangi, dan *SIAP DIAMBIL* di outlet kami!'
    : 'Kami sedang merawat cucian Anda dengan sepenuh hati.'
}

📍 *Alamat:* ${settings.shopAddress}
📞 *Kontak:* ${settings.shopPhone}

_${settings.footerMessage}_`;

  return message;
}

export function generateWhatsAppNotificationUrl(
  order: LaundryOrder,
  settings: LaundrySettings = DEFAULT_SETTINGS
): string {
  const phone = cleanPhoneNumber(order.customer.phone);
  const text = encodeURIComponent(generateWhatsAppReceiptMessage(order, settings));
  return `https://wa.me/${phone}?text=${text}`;
}

export function generateWhatsAppDepositMessage(
  customerName: string,
  balance: number,
  settings: LaundrySettings = DEFAULT_SETTINGS,
  lastTransactionNote?: string
): string {
  return `Halo Kak *${customerName}*! 👋
Informasi Saldo Deposit Laundry Anda di *${settings.shopName}*:

💰 *Sisa Saldo Deposit:* *${formatRupiah(balance)}*
${lastTransactionNote ? `📝 *Mutasi Terakhir:* ${lastTransactionNote}\n` : ''}
Saldo deposit ini dapat langsung digunakan untuk pembayaran cuci kiloan, satuan, maupun express tanpa perlu repot membawa uang tunai.

📍 *Alamat:* ${settings.shopAddress}
📞 *Kontak:* ${settings.shopPhone}

_Terima kasih telah menjadi pelanggan setia kami!_`;
}

export function generateWhatsAppDepositUrl(
  phone: string,
  customerName: string,
  balance: number,
  settings: LaundrySettings = DEFAULT_SETTINGS,
  lastTransactionNote?: string
): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const text = encodeURIComponent(
    generateWhatsAppDepositMessage(customerName, balance, settings, lastTransactionNote)
  );
  return `https://wa.me/${cleanPhone}?text=${text}`;
}
