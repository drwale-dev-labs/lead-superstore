"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles, Wand2, Copy, Check, Download, ArrowRight } from "lucide-react";
import { fetchRoles } from "@/lib/api/roles";
import { fetchOutlets } from "@/lib/api/outlets";
import { generateJobAd } from "@/lib/api/jobs";
import { ErrorState } from "@/components/ui/states";

export default function JobAdsPage() {
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: () => fetchRoles() });
  const outletsQuery = useQuery({ queryKey: ["outlets"], queryFn: fetchOutlets });
  const [roleId, setRoleId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      generateJobAd({
        role_id: roleId,
        outlet_id: outletId,
        employment_type: employmentType,
      }),
  });

  const canGenerate = roleId && outletId && !mutation.isPending;
  const ad = mutation.data?.description;

  function copyAd() {
    if (!ad) return;
    navigator.clipboard.writeText(ad);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadAd() {
    if (!ad || !mutation.data) return;
    const blob = new Blob([ad], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-ad-${mutation.data.role_name.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="text-sm text-stone-600">
        Generate a complete, branded job advertisement using Claude. Pick a role and
        outlet — the ad is tailored to the role&apos;s actual responsibilities and
        Lead Superstore&apos;s tone. Use this for quick drafts or for posts on social
        media; to publish to the careers page,{" "}
        <Link href="/jobs/new" className="text-amber-700 hover:underline">
          create a job posting
        </Link>{" "}
        instead.
      </p>

      {/* Controls */}
      <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Role <span className="text-red-600">*</span>
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={rolesQuery.isLoading}
              className={inputCls}
            >
              <option value="">
                {rolesQuery.isLoading ? "Loading…" : "Select role"}
              </option>
              {rolesQuery.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Outlet <span className="text-red-600">*</span>
            </label>
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              disabled={outletsQuery.isLoading}
              className={inputCls}
            >
              <option value="">
                {outletsQuery.isLoading ? "Loading…" : "Select outlet"}
              </option>
              {outletsQuery.data?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">
              Employment type
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className={inputCls}
            >
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => mutation.mutate()}
            disabled={!canGenerate}
            className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-5 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <>
                <Sparkles className="h-4 w-4 animate-pulse" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Generate ad
              </>
            )}
          </button>
        </div>
      </div>

      {mutation.isError && <ErrorState message={(mutation.error as Error).message} />}

      {/* Output */}
      {ad && (
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-stone-800">
                {mutation.data?.role_name} — {mutation.data?.outlet_name}
              </h2>
              <p className="text-xs text-stone-500">
                {mutation.data?.unit} unit · Generated by Claude
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyAd}
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={downloadAd}
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download .txt
              </button>
              <Link
                href={`/jobs/new`}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
              >
                Create posting
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-700">
            {ad}
          </pre>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none";