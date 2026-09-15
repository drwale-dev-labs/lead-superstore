"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Trash2, X } from "lucide-react";
import { fetchAccounts, createAccount, deleteAccount } from "@/lib/api/accounts";
import { createClient } from "@/lib/supabase/client";
import { LoadingState, ErrorState } from "@/components/ui/states";

export default function AccountsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const query = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-stone-600">
          Everyone with an account here has full access to the HR portal — there are no
          role tiers. Only create accounts for staff you trust with that access.
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800"
        >
          <Plus className="h-4 w-4" />
          New account
        </button>
      </div>

      {query.isLoading && <LoadingState label="Loading accounts…" />}
      {query.isError && <ErrorState message={query.error.message} />}

      {query.data && (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-left font-medium">Last sign-in</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {query.data.map((account) => {
                const isSelf = account.id === currentUserId;
                return (
                  <tr key={account.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 text-stone-400" />
                        <span className="font-medium text-black">{account.email}</span>
                        {isSelf && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange-700">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">
                      {new Date(account.created_at).toLocaleDateString("en-NG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600">
                      {account.last_sign_in_at
                        ? new Date(account.last_sign_in_at).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Remove access for ${account.email}? They will no longer be able to sign in.`,
                              )
                            ) {
                              deleteMut.mutate(account.id);
                            }
                          }}
                          disabled={deleteMut.isPending}
                          className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteMut.isError && (
        <p className="text-xs text-red-600">{(deleteMut.error as Error).message}</p>
      )}

      {modalOpen && <CreateAccountModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function CreateAccountModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState(false);

  const mutation = useMutation({
    mutationFn: () => createAccount(email, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setCreated(true);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-base font-semibold text-black">New account</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {created ? (
          <div className="space-y-4 p-6">
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              Account created for <strong>{email}</strong>. Share the temporary password
              with them directly — they can sign in immediately and should change it once
              logged in.
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="rounded-md bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <p className="text-xs text-stone-500">
              They&apos;ll have the same full access as any other account — there are no
              role tiers in this portal.
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-600">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-orange-700 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-600">
                Temporary password
              </span>
              <input
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-orange-700 focus:outline-none"
              />
            </label>

            {mutation.isError && (
              <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
            )}

            <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-md bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-50"
              >
                {mutation.isPending ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
