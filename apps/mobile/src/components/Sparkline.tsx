// Sparkline 100% RN, sem SVG. Renderiza pontos como Views absolutas
// conectadas por linhas finas (Views rotacionadas). Equivalente ao
// componente web `_components/sparkline.tsx` em comportamento — cor
// segue a tendência (verde subindo, dourado caindo).

import { useMemo } from "react";
import { View } from "react-native";

interface Props {
  series: number[];
  width?: number;
  height?: number;
  /** override automático da cor por tendência */
  color?: string;
}

export function Sparkline({ series, width = 96, height = 28, color }: Props) {
  const segments = useMemo(() => {
    if (series.length < 2) return [];
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const stepX = width / (series.length - 1);

    // Coordenadas (0..1) inverse Y (linha sobe se valor sobe).
    const points = series.map((v, i) => ({
      x: i * stepX,
      y: height - ((v - min) / range) * height,
    }));

    return points.slice(0, -1).map((p, i) => {
      const next = points[i + 1]!;
      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const length = Math.hypot(dx, dy);
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI;
      return {
        key: `seg-${i}`,
        x: p.x,
        y: p.y,
        length,
        angleDeg,
      };
    });
  }, [series, width, height]);

  if (series.length < 2) {
    return <View style={{ width, height }} />;
  }

  const first = series[0]!;
  const last = series[series.length - 1]!;
  const trendUp = last >= first;
  const lineColor = color ?? (trendUp ? "#22c55e" : "#C9A961");

  return (
    <View style={{ width, height, position: "relative" }}>
      {segments.map((s) => (
        <View
          key={s.key}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y - 1,
            width: s.length,
            height: 2,
            backgroundColor: lineColor,
            borderRadius: 1,
            transform: [
              { translateX: 0 },
              { translateY: 0 },
              { rotateZ: `${s.angleDeg}deg` },
            ],
            transformOrigin: "0% 50%",
          }}
        />
      ))}
    </View>
  );
}
