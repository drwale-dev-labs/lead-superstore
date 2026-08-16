"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, MapPin, ArrowRight } from "lucide-react";
import { fetchPublicJobs } from "@/lib/api/careers";

export default function CareersPage() {
  const query = useQuery({
    queryKey: ["public-jobs"],
    queryFn: fetchPublicJobs,
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-100 via-orange-50 to-stone-50">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-orange-300/30 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #000000 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-16 text-center sm:py-20">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-orange-700 ring-1 ring-orange-200">
            We have it all — including your next role
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-black sm:text-4xl">
            Build your career with Lead Superstore
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-black/80">
            We&apos;re hiring across our supermarket, bakery, restaurant, and
            warehouse teams in Osogbo and Ilesa. Find a role that fits and apply
            today — we review every application.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Loading / error / empty */}
      {query.isLoading && (
        <p className="text-center text-sm text-stone-500">Loading roles…</p>
      )}
      {query.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {query.error.message}
        </div>
      )}
      {query.data && query.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white px-8 py-16 text-center">
          <p className="text-base font-medium text-stone-700">
            No open roles at the moment
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Check back soon — we&apos;re always growing.
          </p>
        </div>
      )}

      {/* Job list */}
      {query.data && query.data.length > 0 && (
        <div className="space-y-4">
          {query.data.map((job) => (
            <Link
              key={job.id}
              href={`/careers/${job.id}`}
              className="block rounded-lg border border-stone-200 bg-white p-6 shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500">
                    <Briefcase className="h-3.5 w-3.5" />
                    {job.roles?.unit ?? "—"}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-black">
                    {job.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {job.outlets?.name ?? "—"}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span>{job.employment_type}</span>
                    {job.closes_at && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span className="text-orange-700">
                          Closes {new Date(job.closes_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ArrowRight className="mt-2 h-5 w-5 flex-shrink-0 text-stone-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}