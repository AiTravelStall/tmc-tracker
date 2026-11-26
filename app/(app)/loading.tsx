export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="animate-pulse">
      <div className="mb-3 h-9 w-64 rounded-control bg-tmc-border/70" />
      <div className="mb-8 h-4 w-96 max-w-full rounded-control bg-tmc-border/50" />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[118px] rounded-panel border border-tmc-border bg-tmc-white" />)}
      </div>
      <div className="h-80 rounded-panel border border-tmc-border bg-tmc-white" />
    </div>
  );
}
