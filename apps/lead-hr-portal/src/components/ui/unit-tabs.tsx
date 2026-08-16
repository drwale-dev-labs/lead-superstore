"use client";

type Props = {
  units: readonly string[];
  selected: string;
  onSelect: (unit: string) => void;
  counts?: Record<string, number>;
};

export function UnitTabs({ units, selected, onSelect, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {units.map((unit) => {
        const isActive = selected === unit;
        const count = counts?.[unit];
        return (
          <button
            key={unit}
            onClick={() => onSelect(unit)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-orange-700 bg-orange-700 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-black"
            }`}
          >
            {unit}
            {count !== undefined && (
              <span className={`ml-1.5 ${isActive ? "text-orange-100" : "text-stone-400"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}