export default function DashboardLoading() {
  return (
    <div
      className="space-y-6 animate-pulse"
      aria-busy="true"
      aria-label="Memuat halaman"
    >
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-md bg-primary/10" />
        <div className="h-4 w-80 max-w-full rounded-md bg-primary/5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-white border border-primary/10"
          />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white border border-primary/10" />
    </div>
  );
}
