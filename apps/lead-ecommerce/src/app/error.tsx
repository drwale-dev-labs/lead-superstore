"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-600" />
      <h1 className="mt-4 text-2xl font-bold text-black">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-stone-600">
        We hit an unexpected error. Please try again — if it keeps happening, contact us
        and we&apos;ll sort it out.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-orange-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-800"
      >
        Try again
      </button>
    </div>
  );
}
