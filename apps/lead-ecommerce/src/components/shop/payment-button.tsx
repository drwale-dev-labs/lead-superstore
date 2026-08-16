"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CreditCard, Loader2 } from "lucide-react";
import { initializePayment } from "@/lib/api/payments";

export function PaymentButton({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => initializePayment(orderId),
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  return (
    <div>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-50"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to payment...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Pay with bank transfer or card
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-center text-[11px] text-stone-500">
        Secured by Paystack. Delivery fee and service charge are already
        included in the amount above.
      </p>
    </div>
  );
}