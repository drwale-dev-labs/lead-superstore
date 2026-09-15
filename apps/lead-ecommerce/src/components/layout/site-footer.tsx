import Link from "next/link";

export function SiteFooter() {
    return (
      <footer className="mt-16 border-t border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-stone-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>© 2026 Lead Superstore. All rights reserved.</span>
            <span>Osogbo · Ilesa · Osun State, Nigeria</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link href="/privacy" className="hover:text-orange-700 hover:underline">
              Privacy Policy
            </Link>
            <span className="text-stone-300">·</span>
            <Link href="/terms" className="hover:text-orange-700 hover:underline">
              Terms of Service
            </Link>
          </div>
          <div className="mt-4 border-t border-stone-200 pt-4 text-center text-[11px] text-stone-400">
            Developed by Bloomstone Technologies — Engineered with Intelligence
          </div>
        </div>
      </footer>
    );
  }