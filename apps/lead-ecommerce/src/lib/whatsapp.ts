// Placeholder number — replace with the real Lead Superstore WhatsApp Business
// number in Step 19. Centralised here so there's only one place to update.
const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "2348000000000";

export function buildWhatsAppOrderLink(params: {
  productName: string;
  price: number;
  outletName?: string;
}): string {
  const { productName, price, outletName } = params;
  const lines = [
    `Hi Lead Superstore, I'd like to order:`,
    ``,
    `${productName} — ₦${price.toLocaleString("en-NG")}`,
    outletName ? `Outlet: ${outletName}` : null,
    ``,
    `Please confirm availability and delivery/pickup details.`,
  ].filter(Boolean);

  const message = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
}