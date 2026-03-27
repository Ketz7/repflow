"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { BodyWeightLog } from "@/types";
import { useWeightUnit } from "@/context/WeightUnitContext";

interface WeightChartProps {
  data: BodyWeightLog[];
}

export default function WeightChart({ data }: WeightChartProps) {
  const { unitLabel } = useWeightUnit();
  const chartData = useMemo(() => {
    return data.map((entry, i) => {
      // 7-day moving average
      const window = data.slice(Math.max(0, i - 6), i + 1);
      const avg = window.reduce((sum, e) => sum + e.weight, 0) / window.length;
      return {
        date: new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        weight: entry.weight,
        average: parseFloat(avg.toFixed(1)),
      };
    });
  }, [data]);

  const minWeight = Math.floor(Math.min(...data.map((d) => d.weight)) - 2);
  const maxWeight = Math.ceil(Math.max(...data.map((d) => d.weight)) + 2);

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Body Weight ({unitLabel})</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#94A3B8", fontSize: 10 }}
              axisLine={{ stroke: "#1E2D45" }}
              tickLine={false}
            />
            <YAxis
              domain={[minWeight, maxWeight]}
              tick={{ fill: "#94A3B8", fontSize: 10 }}
              axisLine={{ stroke: "#1E2D45" }}
              tickLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1A2540",
                border: "1px solid #1E2D45",
                borderRadius: "12px",
                fontSize: "12px",
                color: "#E2E8F0",
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#38BDF8"
              strokeWidth={2}
              dot={{ fill: "#38BDF8", r: 3 }}
              activeDot={{ r: 5, fill: "#38BDF8" }}
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#2DD4BF"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-primary rounded-full" />
          <span className="text-xs text-subtext">Daily</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-accent rounded-full border-dashed" />
          <span className="text-xs text-subtext">7-day avg</span>
        </div>
      </div>
    </div>
  );
}
