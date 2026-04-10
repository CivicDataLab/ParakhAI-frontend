"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

type ModuleIssue = {
  id: string;
  module: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  status: "PASSED" | "FAILED";
  issueType: string;
  input: string;
  output: string;
  comments?: string;
};

type MetricEntry = {
  risk_distribution: Record<string, number>;
};

type SeverityBarChartProps = {
  issues: ModuleIssue[];
  metricSummary?: Record<string, MetricEntry>;
};

const SEVERITY_COLORS = {
  Low: "#2563EB",
  Medium: "#D97706",
  High: "#E11D48",
};

const formatMetricName = (name: string): string =>
  name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

export const SeverityBarChart = ({ issues, metricSummary }: SeverityBarChartProps) => {
  const { submodules, lowData, mediumData, highData } = useMemo(() => {
    if (metricSummary && Object.keys(metricSummary).length > 0) {
      const submodules = Object.keys(metricSummary).map(formatMetricName);
      const rawKeys = Object.keys(metricSummary);

      const lowData = rawKeys.map((k) => {
        const dist = metricSummary[k].risk_distribution || {};
        return (dist["LOW_RISK"] ?? 0);
      });
      const mediumData = rawKeys.map((k) => {
        const dist = metricSummary[k].risk_distribution || {};
        return (dist["MEDIUM_RISK"] ?? 0);
      });
      const highData = rawKeys.map((k) => {
        const dist = metricSummary[k].risk_distribution || {};
        return (dist["HIGH_RISK"] ?? 0);
      });

      return { submodules, lowData, mediumData, highData };
    }

    const submoduleMap: Record<string, { low: number; medium: number; high: number }> = {};

    issues.forEach((issue) => {
      const key = issue.issueType || "Unknown";
      if (!submoduleMap[key]) {
        submoduleMap[key] = { low: 0, medium: 0, high: 0 };
      }
      const sev = issue.severity?.toUpperCase();
      if (sev === "LOW") submoduleMap[key].low += 1;
      else if (sev === "MEDIUM") submoduleMap[key].medium += 1;
      else if (sev === "HIGH") submoduleMap[key].high += 1;
    });

    const submodules = Object.keys(submoduleMap);
    const lowData = submodules.map((s) => submoduleMap[s].low);
    const mediumData = submodules.map((s) => submoduleMap[s].medium);
    const highData = submodules.map((s) => submoduleMap[s].high);

    return { submodules, lowData, mediumData, highData };
  }, [issues, metricSummary]);

  if (submodules.length === 0) return null;

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any[]) => {
        const name = params[0]?.axisValue || "";
        const lines = params
          .filter((p) => p.value > 0)
          .map(
            (p) =>
              `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: <strong>${p.value}</strong>`
          )
          .join("<br/>");
        return `<div style="font-size:13px"><strong>${name}</strong><br/>${lines}</div>`;
      },
    },
    legend: {
      data: ["Low", "Medium", "High"],
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 12, color: "#374151" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "14%",
      top: "8%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: submodules,
      axisLabel: {
        fontSize: 12,
        color: "#374151",
        interval: 0,
        overflow: "break",
        width: 120,
      },
      axisTick: { alignWithLabel: true },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { fontSize: 12, color: "#374151" },
      splitLine: { lineStyle: { color: "#F3F4F6" } },
    },
    series: [
      {
        name: "Low",
        type: "bar",
        data: lowData,
        itemStyle: { color: SEVERITY_COLORS.Low, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 40,
      },
      {
        name: "Medium",
        type: "bar",
        data: mediumData,
        itemStyle: { color: SEVERITY_COLORS.Medium, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 40,
      },
      {
        name: "High",
        type: "bar",
        data: highData,
        itemStyle: { color: SEVERITY_COLORS.High, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 40,
      },
    ],
  };

  const chartHeight = Math.max(260, submodules.length * 60 + 80);
  const chartMinWidth = Math.max(520, submodules.length * 120);

  return (
    <div className="mb-6 rounded-[16px] border border-gray-100 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-gray-700">
        Issues by Submodule &amp; Severity
      </p>
      <div className="overflow-x-auto overflow-y-hidden">
        <div style={{ minWidth: chartMinWidth }}>
          <ReactECharts
            option={option}
            style={{ height: chartHeight, width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
    </div>
  );
};
