/** Tiny dependency-free SVG sparkline for the cash trend. */
export function Sparkline({
  data,
  width = 220,
  height = 48,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return <div className="h-12 flex items-center text-sm text-[var(--color-muted-foreground)]">Pas encore de tendance.</div>;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pad = 3;
  const stepX = (width - pad * 2) / (data.length - 1);
  const y = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / range);
  const points = data.map((v, i) => [pad + i * stepX, y(v)] as const);
  const line = points.map(([x, yy], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height - pad} L${pad},${height - pad} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      <path d={area} fill="var(--color-accent)" opacity={0.10} />
      <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={3} fill="var(--color-accent)" />
    </svg>
  );
}
