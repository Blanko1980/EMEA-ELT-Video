import React from "react";
import land from "../generated/land-dots.json";
import { theme } from "../theme";
import { personal } from "../lib/data";
import { progress } from "../lib/time";

const LON0 = -170;
const LON1 = 180;
const LAT0 = 75;
const LAT1 = -56;

type Props = {
  width: number;
  cities: string[];
  newCity?: string;
  // seconds since the map appeared
  local: number;
};

// Minimal dot-matrix world map strip; cities light up as accent dots with a ring pulse.
export const WorldMap: React.FC<Props> = ({ width, cities, newCity, local }) => {
  const height = (width * (LAT0 - LAT1)) / (LON1 - LON0);
  const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * width;
  const py = (lat: number) => ((LAT0 - lat) / (LAT0 - LAT1)) * height;
  const r = (land.step / (LON1 - LON0)) * width * 0.32;
  const reveal = progress(local, 0, 0.5);

  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      {(land.dots as [number, number][]).map(([lon, lat], i) => (
        <circle key={i} cx={px(lon)} cy={py(lat)} r={r} fill={theme.brandLight} opacity={0.22 * (px(lon) / width < reveal * 1.2 ? 1 : 0)} />
      ))}
      {cities.map((name, i) => {
        const c = personal.places[name];
        if (!c) return null;
        const at = name === newCity ? 0.55 : 0.25 + i * 0.25;
        const p = progress(local, at, at + 0.3);
        const pulse = progress(local, at, at + 1.1);
        return (
          <g key={name} opacity={p}>
            <circle cx={px(c.lon)} cy={py(c.lat)} r={r * 2 + pulse * r * 10} fill="none" stroke={theme.brandAccent} strokeWidth={2} opacity={1 - pulse} />
            <circle cx={px(c.lon)} cy={py(c.lat)} r={r * 2.4} fill={theme.brandAccent} />
            <text
              x={px(c.lon) + (name === "London" ? -10 : 12)}
              y={py(c.lat) + (name === "London" ? -12 : name === "Germany" ? 22 : 5)}
              textAnchor={name === "London" ? "end" : "start"}
              fontFamily={theme.fontText}
              fontSize={17}
              fontWeight={600}
              fill={theme.brandLight}
            >
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
