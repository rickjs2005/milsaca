type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  /** cor da linha; aceita classes Tailwind via prop string crua */
  color?: string;
  className?: string;
};

/**
 * Mini-gráfico SVG sem libs. Plota polyline + último ponto destacado.
 * Se a série tiver < 2 pontos, renderiza um traço plano.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  color = "#0F3D2E",
  className,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        aria-hidden="true"
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = values.map((v, i) => {
    const x =
      padding +
      (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
    const y = padding + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1]!;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r={2.2} fill={color} />
    </svg>
  );
}
