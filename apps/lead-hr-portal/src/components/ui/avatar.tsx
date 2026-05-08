"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStaffPhotoUrl } from "@/lib/api/verification";

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-2xl",
} as const;

type Size = keyof typeof SIZE_CLASSES;

type Props = {
  staffId: string;
  hasPhoto: boolean;
  firstName: string;
  lastName: string;
  size?: Size;
};

export function Avatar({ staffId, hasPhoto, firstName, lastName, size = "md" }: Props) {
  const photoQuery = useQuery({
    queryKey: ["staff-photo-url", staffId],
    queryFn: () => fetchStaffPhotoUrl(staffId),
    enabled: hasPhoto,
    staleTime: 50 * 60_000, // signed URL is good for ~1h, cache for 50min
  });

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const bg = colourFromName(`${firstName} ${lastName}`);

  const sizeCls = SIZE_CLASSES[size];

  if (hasPhoto && photoQuery.data) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoQuery.data}
        alt={`${firstName} ${lastName}`}
        className={`${sizeCls} rounded-full object-cover ring-1 ring-stone-200`}
      />
    );
  }

  return (
    <div
      className={`${sizeCls} flex items-center justify-center rounded-full font-semibold text-white ring-1 ring-stone-200`}
      style={{ backgroundColor: bg }}
      aria-label={`${firstName} ${lastName}`}
    >
      {initials || "?"}
    </div>
  );
}

// Deterministic warm-palette colour from a name. Same name → same colour.
function colourFromName(name: string): string {
  const palette = [
    "#B85C2A", // amber-700-ish (brand)
    "#92400E", // amber-800
    "#A16207", // yellow-700
    "#7C2D12", // orange-900
    "#9A3412", // orange-800
    "#3F6212", // lime-800
    "#166534", // green-800
    "#0F766E", // teal-700
    "#1E3A8A", // blue-900
    "#5B21B6", // violet-800
    "#86198F", // fuchsia-800
    "#9F1239", // rose-800
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}