export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 h-8 w-64 rounded-xl bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-surface-2" />)}
      </div>
      <div className="mt-4 h-80 rounded-2xl bg-surface-2" />
    </div>
  );
}
