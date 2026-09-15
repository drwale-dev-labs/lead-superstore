import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-black">Terms of Service</h1>
      <p className="mt-2 text-xs text-stone-500">Last updated: August 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-stone-700">
        <section>
          <h2 className="text-base font-semibold text-black">1. Orders</h2>
          <p className="mt-2">
            All orders placed through this site are subject to product availability at
            your selected outlet. We reserve the right to cancel or adjust an order if an
            item becomes unavailable after purchase, in which case we will contact you and
            issue a refund for the affected item.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black">2. Pricing and payment</h2>
          <p className="mt-2">
            Prices are shown in Naira (₦) and may change without notice. Payment is
            processed securely through Paystack at checkout. An order is only confirmed
            once payment has been successfully received.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black">3. Delivery and pickup</h2>
          <p className="mt-2">
            Delivery is available within our service areas in Osogbo and Ilesa; a delivery
            fee applies where relevant. Pickup orders must be collected from the selected
            outlet. Restaurant items are made to order and coordinated directly via
            WhatsApp rather than through online checkout.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black">4. Returns and refunds</h2>
          <p className="mt-2">
            If an item you received is faulty, incorrect, or damaged, please contact us
            within 24 hours of delivery or pickup so we can arrange a replacement or
            refund.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black">5. Careers and applications</h2>
          <p className="mt-2">
            By submitting a job application through this site, you confirm that the
            information and documents provided are accurate. We review every application
            and will contact you if your profile matches a role we are hiring for.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black">6. Changes to these terms</h2>
          <p className="mt-2">
            We may update these terms from time to time. Continued use of this site after
            changes are posted constitutes acceptance of the updated terms.
          </p>
        </section>
      </div>
    </div>
  );
}
