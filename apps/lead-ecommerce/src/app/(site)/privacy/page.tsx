import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-black">Privacy Policy</h1>
      <p className="mt-2 text-xs text-stone-500">Last updated: August 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-stone-700">
        <section>
          <h2 className="text-base font-semibold text-black">1. Information we collect</h2>
          <p className="mt-2">
            When you place an order, apply for a job, or create an account with Lead
            Superstore, we collect information such as your name, email address, phone
            number, delivery address, and order history. If you apply for a role with us,
            we also collect your CV, cover letter, and any certificates you upload.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black">2. How we use your information</h2>
          <p className="mt-2">
            We use your information to process and fulfil orders, communicate order and
            delivery updates via email or SMS, review job applications, and improve our
            products and services. We do not sell your personal information to third
            parties.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black">3. Payment information</h2>
          <p className="mt-2">
            Payments are processed securely by Paystack. We do not store your card details
            on our servers — Paystack handles all payment card data in line with PCI-DSS
            standards.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black">4. Data sharing</h2>
          <p className="mt-2">
            We share order details with our outlet staff to fulfil your order, and payment
            details with Paystack to process payments. We do not share your personal
            information with any other third party except where required by law.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black">5. Your rights</h2>
          <p className="mt-2">
            You can request access to, correction of, or deletion of your personal
            information at any time by contacting us using the details on our careers or
            contact page.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-black">6. Contact us</h2>
          <p className="mt-2">
            If you have questions about this policy or how we handle your data, reach out
            to us through any of our outlets in Osogbo or Ilesa.
          </p>
        </section>
      </div>
    </div>
  );
}
