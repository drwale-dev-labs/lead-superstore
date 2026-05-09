"use client";

import { Plus, X } from "lucide-react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export function ListEditor({ value, onChange, placeholder }: Props) {
  function update(idx: number, text: string) {
    const next = [...value];
    next[idx] = text;
    onChange(next);
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...value, ""]);
  }

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-stone-500">No requirements yet.</p>
      )}
      {value.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-700" />
          <input
            value={item}
            onChange={(e) => update(idx, e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-amber-700 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => remove(idx)}
            className="mt-1 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-red-600"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-amber-300 hover:text-amber-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add requirement
      </button>
    </div>
  );
}