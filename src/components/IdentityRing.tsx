import React from "react";
import { random } from "remotion";

// The We. Identity Rings: a gallery of ring styles that embrace the circle theme.
export type RingVariant = "solid" | "dots" | "dashes" | "ticks" | "scatter" | "double" | "segments" | "fine";

type Props = {
  r: number;
  variant: RingVariant;
  color: string;
  width?: number;
  rotate?: number;
  // 0..1: how much of the ring is drawn (clockwise from 12 o'clock)
  draw?: number;
  opacity?: number;
  seed?: string;
};

export const IdentityRing: React.FC<Props> = ({ r, variant, color, width = 3, rotate = 0, draw = 1, opacity = 1, seed = "ring" }) => {
  const size = r * 2 + 40;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const els: React.ReactNode[] = [];

  const pointAt = (a: number, rr = r) => [c + rr * Math.sin(a), c - rr * Math.cos(a)];

  if (variant === "solid" || variant === "double") {
    const rings = variant === "double" ? [r, r - width * 2.6] : [r];
    rings.forEach((rr, i) =>
      els.push(
        <circle
          key={i}
          cx={c}
          cy={c}
          r={rr}
          fill="none"
          stroke={color}
          strokeWidth={i === 0 ? width : width * 0.6}
          strokeDasharray={`${2 * Math.PI * rr * draw} ${2 * Math.PI * rr}`}
          transform={`rotate(-90 ${c} ${c})`}
        />,
      ),
    );
  } else if (variant === "dashes" || variant === "segments") {
    const n = variant === "dashes" ? Math.round(circ / (width * 5)) : 14;
    const dash = variant === "dashes" ? circ / n / 2 : (circ / n) * 0.82;
    const gap = circ / n - dash;
    els.push(
      <circle
        key="d"
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={`${dash} ${gap}`}
        transform={`rotate(-90 ${c} ${c})`}
      />,
    );
  } else if (variant === "dots") {
    const n = Math.round(circ / (width * 4.2));
    for (let i = 0; i < n * draw; i++) {
      const [x, y] = pointAt((i / n) * Math.PI * 2);
      els.push(<circle key={i} cx={x} cy={y} r={width * 0.9} fill={color} />);
    }
  } else if (variant === "ticks" || variant === "fine") {
    const n = Math.round(circ / (variant === "ticks" ? width * 3.2 : width * 2));
    const len = variant === "ticks" ? width * 6 : width * 3;
    for (let i = 0; i < n * draw; i++) {
      const a = (i / n) * Math.PI * 2;
      const [x1, y1] = pointAt(a, r - len / 2);
      const [x2, y2] = pointAt(a, r + len / 2);
      els.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width * 0.7} />);
    }
  } else if (variant === "scatter") {
    const n = Math.round(circ / (width * 1.6));
    for (let i = 0; i < n * draw; i++) {
      const a = (i / n) * Math.PI * 2 + random(`${seed}-a-${i}`) * 0.05;
      const [x, y] = pointAt(a, r + (random(`${seed}-r-${i}`) - 0.5) * width * 5);
      els.push(<circle key={i} cx={x} cy={y} r={width * (0.3 + random(`${seed}-s-${i}`) * 0.5)} fill={color} />);
    }
  }

  return (
    <svg
      width={size}
      height={size}
      style={{
        position: "absolute",
        left: -c,
        top: -c,
        transform: `rotate(${rotate}deg)`,
        opacity,
        overflow: "visible",
      }}
    >
      {variant === "dashes" || variant === "segments" ? (
        <g>
          <defs>
            <mask id={`m-${seed}`}>
              <circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke="#fff"
                strokeWidth={width * 4}
                strokeDasharray={`${circ * draw} ${circ}`}
                transform={`rotate(-90 ${c} ${c})`}
              />
            </mask>
          </defs>
          <g mask={`url(#m-${seed})`}>{els}</g>
        </g>
      ) : (
        els
      )}
    </svg>
  );
};

// Positions a ring centred on (x, y).
export const RingAt: React.FC<Props & { x: number; y: number }> = ({ x, y, ...rest }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0 }}>
    <IdentityRing {...rest} />
  </div>
);
