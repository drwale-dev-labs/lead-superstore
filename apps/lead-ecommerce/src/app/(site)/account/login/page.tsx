"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Mail, KeyRound } from "lucide-react";
import { requestLoginCode, verifyLoginCode } from "@/lib/api/customers";
import { useCustomerAuth } from "@/lib/customer-auth-context";

export default function AccountLoginPage() {
  const router = useRouter();
  const { login } = useCustomerAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const requestMut = useMutation({
    mutationFn: () => requestLoginCode(email.trim()),
    onSuccess: () => setStep("code"),
  });

  const verifyMut = useMutation({
    mutationFn: () => verifyLoginCode(email.trim(), code.trim()),
    onSuccess: (session) => {
      login(session);
      router.push("/account/orders");
    },
  });

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="text-center">
        {step === "email" ? (
          <Mail className="mx-auto h-10 w-10 text-amber-700" />
        ) : (
          <KeyRound className="mx-auto h-10 w-10 text-amber-700" />
        )}
        <h1 className="mt-4 text-xl font-bold text-stone-900">
          {step === "email" ? "Sign in to your account" : "Enter your code"}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {step === "email"
            ? "We'll email you a one-time code — no password needed."
            : `We sent a 6-digit code to ${email}.`}
        </p>
      </div>

      {step === "email" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestMut.mutate();
          }}
          className="mt-8 space-y-4"
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-700 focus:outline-none"
          />
          {requestMut.isError && (
            <p className="text-xs text-red-600">{(requestMut.error as Error).message}</p>
          )}
          <button
            type="submit"
            disabled={requestMut.isPending}
            className="w-full rounded-md bg-amber-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {requestMut.isPending ? "Sending…" : "Send code"}
          </button>
          <p className="text-center text-[11px] text-stone-500">
            You'll only receive a code if this email has an order with us.
          </p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyMut.mutate();
          }}
          className="mt-8 space-y-4"
        >
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-center text-lg tracking-[0.5em] focus:border-amber-700 focus:outline-none"
          />
          {verifyMut.isError && (
            <p className="text-xs text-red-600">{(verifyMut.error as Error).message}</p>
          )}
          <button
            type="submit"
            disabled={verifyMut.isPending || code.length !== 6}
            className="w-full rounded-md bg-amber-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {verifyMut.isPending ? "Verifying…" : "Verify & sign in"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-full text-center text-xs text-stone-500 hover:text-stone-800"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
