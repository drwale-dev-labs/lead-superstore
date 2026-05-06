import { AlertCircle, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <div className="font-medium">Something went wrong</div>
        <div className="mt-1 text-xs text-red-600">{message}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white px-8 py-12 text-center">
      <div className="text-sm font-medium text-stone-700">{title}</div>
      {description && <div className="mt-1 text-xs text-stone-500">{description}</div>}
    </div>
  );
}