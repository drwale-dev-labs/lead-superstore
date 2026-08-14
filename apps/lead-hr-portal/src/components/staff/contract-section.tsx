"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileSignature,
  Send,
  Pencil,
  Check,
  Upload,
  Eye,
  History,
} from "lucide-react";
import {
  fetchContracts,
  generateContract,
  updateContract,
  sendContract,
  uploadSignedContract,
  getContractSignedUrl,
} from "@/lib/api/contracts";
import { LoadingState, ErrorState } from "@/components/ui/states";
import type { Contract } from "@/lib/types";

export function ContractSection({ staffId }: { staffId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const query = useQuery({
    queryKey: ["contracts", staffId],
    queryFn: () => fetchContracts(staffId),
  });

  const generateMut = useMutation({
    mutationFn: () => generateContract(staffId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts", staffId] });
      setEditing(true);
    },
  });

  if (query.isLoading) return <LoadingState label="Loading contract…" />;
  if (query.isError) return <ErrorState message={query.error.message} />;

  const contracts = query.data ?? [];
  const current = contracts[0] ?? null;
  const history = contracts.slice(1);

  return (
    <div className="space-y-4">
      {!current && (
        <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-center">
          <p className="text-sm text-stone-600">No contract generated yet</p>
          <p className="mt-1 text-xs text-stone-500">
            Generates a draft from this employee's role, salary, and (if applicable) training
            bond terms — you can edit it before sending.
          </p>
          <button
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            <FileSignature className="h-3.5 w-3.5" />
            {generateMut.isPending ? "Generating…" : "Generate contract"}
          </button>
          {generateMut.isError && (
            <p className="mt-2 text-xs text-red-600">
              {(generateMut.error as Error).message}
            </p>
          )}
        </div>
      )}

      {current && (
        <CurrentContract
          key={current.id}
          staffId={staffId}
          contract={current}
          editing={editing}
          setEditing={setEditing}
        />
      )}

      {history.length > 0 && (
        <div className="border-t border-stone-100 pt-4">
          <h3 className="mb-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            <History className="h-3 w-3" />
            Prior contracts
          </h3>
          <ul className="space-y-2 text-xs">
            {history.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between border-b border-stone-50 pb-2 last:border-0 last:pb-0"
              >
                <span className="capitalize text-stone-700">{c.status}</span>
                <span className="text-stone-500">{formatDate(c.generated_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CurrentContract({
  staffId,
  contract,
  editing,
  setEditing,
}: {
  staffId: string;
  contract: Contract;
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveMut = useMutation({
    mutationFn: (html: string) => updateContract(staffId, contract.id, html),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts", staffId] });
      setEditing(false);
    },
  });

  const sendMut = useMutation({
    mutationFn: () => sendContract(staffId, contract.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts", staffId] }),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadSignedContract(staffId, contract.id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts", staffId] }),
  });

  async function handleView(path: string) {
    const url = await getContractSignedUrl(path);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="rounded-md border border-stone-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <StatusPill status={contract.status} />
        <div className="flex items-center gap-2">
          {contract.status === "draft" && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
          {contract.status === "draft" && editing && (
            <button
              onClick={() =>
                saveMut.mutate(editorRef.current?.innerHTML ?? contract.content_html)
              }
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              {saveMut.isPending ? "Saving…" : "Save"}
            </button>
          )}
          {contract.status === "draft" && (
            <button
              onClick={() => sendMut.mutate()}
              disabled={sendMut.isPending || editing}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {sendMut.isPending ? "Sending…" : "Send to employee"}
            </button>
          )}
          {contract.pdf_path && (
            <button
              onClick={() => handleView(contract.pdf_path!)}
              className="inline-flex items-center gap-1 text-xs text-stone-600 hover:underline"
            >
              <Eye className="h-3 w-3" />
              View PDF
            </button>
          )}
        </div>
      </div>

      {saveMut.isError && (
        <p className="mb-2 text-xs text-red-600">{(saveMut.error as Error).message}</p>
      )}
      {sendMut.isError && (
        <p className="mb-2 text-xs text-red-600">{(sendMut.error as Error).message}</p>
      )}

      {editing ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="prose prose-sm max-w-none rounded-md border border-amber-300 bg-amber-50/30 p-4 text-sm focus:outline-none"
          dangerouslySetInnerHTML={{ __html: contract.content_html }}
        />
      ) : (
        <div
          className="prose prose-sm max-w-none rounded-md bg-stone-50 p-4 text-sm text-stone-700"
          dangerouslySetInnerHTML={{ __html: contract.content_html }}
        />
      )}

      {(contract.status === "sent" || contract.status === "signed") && (
        <div className="mt-4 border-t border-stone-100 pt-4">
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
            Signed copy
          </h4>
          {contract.status === "signed" && contract.signed_copy_path ? (
            <button
              onClick={() => handleView(contract.signed_copy_path!)}
              className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100"
            >
              <Eye className="h-3.5 w-3.5" />
              View signed contract
            </button>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMut.mutate(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadMut.isPending ? "Uploading…" : "Upload signed copy"}
              </button>
              {uploadMut.isError && (
                <p className="mt-2 text-xs text-red-600">
                  {(uploadMut.error as Error).message}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Contract["status"] }) {
  const styles: Record<Contract["status"], string> = {
    draft: "bg-stone-100 text-stone-700",
    sent: "bg-blue-100 text-blue-700",
    signed: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
