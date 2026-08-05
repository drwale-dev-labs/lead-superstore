// Fallback number — used if an outlet has no whatsapp_number set yet.
// Set NEXT_PUBLIC_WHATSAPP_NUMBER in .env.local. This is the "skeleton" default
// during rollout, before every outlet has its own number configured.
const DEFAULT_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "2348000000000";

export function resolveWhatsAppNumber(outletNumber?: string | null): string {
  return outletNumber && outletNumber.trim().length > 0
    ? outletNumber.trim()
    : DEFAULT_WHATSAPP_NUMBER;
}

export type RestaurantBasketLine = {
  productName: string;
  price: number;
  quantity: number;
  note?: string;
};

/**
 * Build a single WhatsApp deep link for an entire restaurant basket
 * (multiple items in one order), routed to the correct outlet's number.
 */
export function buildWhatsAppBasketLink(params: {
  items: RestaurantBasketLine[];
  outletName?: string;
  outletNumber?: string | null;
}): string {
  const { items, outletName, outletNumber } = params;
  const number = resolveWhatsAppNumber(outletNumber);

  const itemLines = items.map((i) => {
    const lineTotal = i.price * i.quantity;
    const noteText = i.note ? ` (${i.note})` : "";
    return `• ${i.quantity} × ${i.productName}${noteText} — ₦${lineTotal.toLocaleString("en-NG")}`;
  });

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const lines = [
    `Hi Lead Superstore, I'd like to order:`,
    ``,
    ...itemLines,
    ``,
    `Estimated total: ₦${total.toLocaleString("en-NG")}`,
    outletName ? `Outlet: ${outletName}` : null,
    ``,
    `Please confirm availability, final price, and delivery/pickup details.`,
  ].filter(Boolean);

  const message = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${number}?text=${message}`;
}

/**
 * Single-item variant, kept for any place that still wants a quick one-tap
 * order link without going through the basket.
 */
export function buildWhatsAppOrderLink(params: {
  productName: string;
  price: number;
  outletName?: string;
  outletNumber?: string | null;
}): string {
  return buildWhatsAppBasketLink({
    items: [{ productName: params.productName, price: params.price, quantity: 1 }],
    outletName: params.outletName,
    outletNumber: params.outletNumber,
  });
}