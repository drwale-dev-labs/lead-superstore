export default function StaffPage() {
    return <Placeholder title="Employees" next="Step 13" />;
  }
  
  function Placeholder({ title, next }: { title: string; next: string }) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-dashed border-stone-300 bg-white px-8 py-12 text-center">
          <div className="text-base font-medium text-stone-800">{title}</div>
          <div className="mt-1 text-sm text-stone-500">Coming in {next}</div>
        </div>
      </div>
    );
  }