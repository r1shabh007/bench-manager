export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-park-muted">
      <LegendItem className="bg-bench-available" label="Available" />
      <LegendItem className="bg-bench-unavailable" label="Unavailable" />
      <LegendItem className="bg-bench-selected" label="Selected" />
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
