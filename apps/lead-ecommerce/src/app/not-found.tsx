import Link from "next/link";
import { PackageX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-6 text-center">
      <PackageX className="h-12 w-12 text-orange-700" />
      <h1 className="mt-4 text-2xl font-bold text-black">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-stone-600">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-orange-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-800"
      >
        Back to home
      </Link>
    </div>
  );
}
