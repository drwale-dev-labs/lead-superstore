import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex flex-col">
          <span className="text-base font-semibold text-amber-700">
            Lead Superstore
          </span>
          <span className="text-[10px] uppercase tracking-wider text-stone-400">
            Osun&apos;s favourite store
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-stone-600">
          <Link href="/" className="hover:text-amber-700">
            Shop
          </Link>
          <Link href="/careers" className="hover:text-amber-700">
            Careers
          </Link>
        </nav>
      </div>
    </header>
  );
}