import type { Role } from "@/lib/types";

export function RoleDetail({ role }: { role: Role }) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-6">
      <header className="border-b border-stone-100 pb-4">
        <div className="text-xs uppercase tracking-wider text-stone-500">{role.unit} unit</div>
        <h2 className="mt-1 text-xl font-semibold text-stone-900">{role.name}</h2>
        {role.description && (
          <p className="mt-3 text-sm leading-relaxed text-stone-600">{role.description}</p>
        )}
      </header>

      {role.responsibilities && role.responsibilities.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            Key responsibilities
          </h3>
          <ul className="space-y-3">
            {role.responsibilities.map(([title, detail], idx) => (
              <li key={idx} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-700" />
                <div className="text-sm leading-relaxed">
                  <span className="font-medium text-stone-800">{title}: </span>
                  <span className="text-stone-600">{detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {role.requirements && role.requirements.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
            Requirements
          </h3>
          <ul className="space-y-2">
            {role.requirements.map((req, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-stone-400" />
                <span className="text-sm leading-relaxed text-stone-600">{req}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}