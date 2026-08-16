"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { verifyPayment } from "@/lib/api/payments";

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const query = useQuery({
    queryKey: ["verify-payment", reference],
    queryFn: () => verifyPayment(reference as string),
    enabled: !!reference,
    retry: false,
  });

  if (!reference) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm text-red-600">No payment reference found.</p>
        <Link href="/shop" className="mt-4 inline-block text-sm text-orange-700 hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-orange-700" />
        <p className="mt-4 text-sm text-stone-600">Confirming your payment...</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <XCircle className="mx-auto h-14 w-14 text-red-600" />
        <h1 className="mt-4 text-xl font-semibold text-black">
          We could not confirm this payment
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {(query.error as Error)?.message ?? "Please contact us if you were charged."}
        </p>
        <Link href="/shop" className="mt-6 inline-block text-sm text-orange-700 hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  const result = query.data;

  if (result.status === "success") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h1 className="mt-4 text-xl font-semibold text-black">Payment successful</h1>
        <p className="mt-2 text-sm text-stone-600">
          Order <strong>{result.order_number}</strong> is paid. Thank you.
        </p>
        <Link
          href={`/order-confirmation/${result.order_id}`}
          className="mt-6 inline-block rounded-md bg-orange-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-800"
        >
          View order
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <XCircle className="mx-auto h-14 w-14 text-red-600" />
      <h1 className="mt-4 text-xl font-semibold text-black">
        Payment was not completed
      </h1>
      <p className="mt-2 text-sm text-stone-600">
        Order <strong>{result.order_number}</strong> is still awaiting payment.
      </p>
      <Link
        href={`/order-confirmation/${result.order_id}`}
        className="mt-6 inline-block rounded-md bg-orange-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-800"
      >
        Back to order
      </Link>
    </div>
  );
}