import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-3xl font-bold text-stone-900">
        Lead Superstore Online
      </h1>
      <p className="mt-3 text-base text-stone-600">
        Our storefront is launching soon. In the meantime, check out the careers
        we&apos;re hiring for.
      </p>
      <Link
        href="/careers"
        className="mt-6 inline-block rounded-md bg-amber-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-800"
      >
        See open roles
      </Link>
    </div>
  );
}