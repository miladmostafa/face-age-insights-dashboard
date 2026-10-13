"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CountShare } from "@/lib/aggregate";

const tooltipStyle = {
  background: "#fffdf9",
  border: "1px solid #e3dbd0",
  borderRadius: 12,
  color: "#1c1915",
};

export function ProblemChart({ rows }: { rows: CountShare[] }) {
  return (
    <div style={{ height: Math.max(280, rows.length * 36) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#e3dbd0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: "#5f584f", fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={112}
            tick={{ fill: "#1c1915", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [String(value ?? ""), "Scans"]}
          />
          <Bar dataKey="count" fill="#0f6e66" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AgeChart({ rows }: { rows: CountShare[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e3dbd0" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#1c1915", fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#5f584f", fontSize: 12 }} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [String(value ?? ""), "Scans"]}
          />
          <Bar dataKey="count" fill="#c4542b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HealthChart({ rows }: { rows: CountShare[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e3dbd0" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#1c1915", fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#5f584f", fontSize: 12 }} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [String(value ?? ""), "Scans"]}
          />
          <Bar dataKey="count" fill="#1d6b8a" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
