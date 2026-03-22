"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface GraphConfig {
  xAxis: {
    label: string;
    min: number;
    max: number;
    step: number;
    ticks?: number[]; // custom tick values (e.g. [250, 500, 1000, 2000, 4000, 8000] for audiogram)
  };
  yAxis: {
    label: string;
    min: number;
    max: number;
    step: number;
    inverted?: boolean; // for audiograms where 0 is at top
  };
  series: {
    name: string;
    color: string;
    symbol: "circle" | "cross"; // O for right ear, X for left ear, etc.
  }[];
  showLineOfBestFit?: boolean;
  forPart?: string; // which part this graph replaces
}

export interface GraphData {
  points: { series: number; x: number; y: number }[];
  lineOfBestFit?: { x1: number; y1: number; x2: number; y2: number };
}

interface Props {
  config: GraphConfig;
  value?: string; // JSON GraphData
  onChange: (json: string) => void;
}

const PADDING = { top: 30, right: 30, bottom: 50, left: 65 };

export default function GraphCanvas({ config, value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeSeries, setActiveSeries] = useState(0);
  const [mode, setMode] = useState<"plot" | "line">("plot");
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [data, setData] = useState<GraphData>(() => {
    try {
      return value ? JSON.parse(value) : { points: [] };
    } catch {
      return { points: [] };
    }
  });

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 600, height: 400 };
    // Return CSS dimensions (not 2x retina pixel dimensions)
    return { width: canvas.width / 2, height: canvas.height / 2 };
  }, []);

  // Helper: get x-position fraction (0..1) for a data x value
  const xToFraction = useCallback(
    (dataX: number) => {
      const { xAxis } = config;
      if (xAxis.ticks) {
        // Find nearest tick and interpolate
        const ticks = xAxis.ticks;
        if (dataX <= ticks[0]) return 0;
        if (dataX >= ticks[ticks.length - 1]) return 1;
        for (let i = 0; i < ticks.length - 1; i++) {
          if (dataX >= ticks[i] && dataX <= ticks[i + 1]) {
            const frac = (dataX - ticks[i]) / (ticks[i + 1] - ticks[i]);
            return (i + frac) / (ticks.length - 1);
          }
        }
        return 0;
      }
      return (dataX - xAxis.min) / (xAxis.max - xAxis.min);
    },
    [config]
  );

  // Helper: get data x value from fraction (0..1)
  const fractionToX = useCallback(
    (frac: number) => {
      const { xAxis } = config;
      if (xAxis.ticks) {
        const ticks = xAxis.ticks;
        const idx = frac * (ticks.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        if (lo === hi || hi >= ticks.length) return ticks[Math.min(lo, ticks.length - 1)];
        const t = idx - lo;
        return ticks[lo] + t * (ticks[hi] - ticks[lo]);
      }
      return xAxis.min + frac * (xAxis.max - xAxis.min);
    },
    [config]
  );

  // Convert data coordinates to canvas pixel coordinates
  const toPixel = useCallback(
    (dataX: number, dataY: number) => {
      const { width, height } = getCanvasSize();
      const plotW = width - PADDING.left - PADDING.right;
      const plotH = height - PADDING.top - PADDING.bottom;
      const { yAxis } = config;

      const px = PADDING.left + xToFraction(dataX) * plotW;

      let py: number;
      if (yAxis.inverted) {
        py = PADDING.top + ((dataY - yAxis.min) / (yAxis.max - yAxis.min)) * plotH;
      } else {
        py = PADDING.top + plotH - ((dataY - yAxis.min) / (yAxis.max - yAxis.min)) * plotH;
      }

      return { px, py };
    },
    [config, getCanvasSize, xToFraction]
  );

  // Convert canvas pixel to data coordinates
  const toData = useCallback(
    (px: number, py: number) => {
      const { width, height } = getCanvasSize();
      const plotW = width - PADDING.left - PADDING.right;
      const plotH = height - PADDING.top - PADDING.bottom;
      const { yAxis } = config;

      const frac = (px - PADDING.left) / plotW;
      const dataX = fractionToX(frac);

      let dataY: number;
      if (yAxis.inverted) {
        dataY = yAxis.min + ((py - PADDING.top) / plotH) * (yAxis.max - yAxis.min);
      } else {
        dataY = yAxis.min + ((PADDING.top + plotH - py) / plotH) * (yAxis.max - yAxis.min);
      }

      return { dataX, dataY };
    },
    [config, getCanvasSize, fractionToX]
  );

  // Snap to nearest grid intersection
  const snapToGrid = useCallback(
    (dataX: number, dataY: number) => {
      const { xAxis, yAxis } = config;
      let snappedX: number;
      if (xAxis.ticks) {
        // Snap to nearest tick value
        let closest = xAxis.ticks[0];
        let minDist = Math.abs(dataX - closest);
        for (const t of xAxis.ticks) {
          const dist = Math.abs(dataX - t);
          if (dist < minDist) {
            minDist = dist;
            closest = t;
          }
        }
        snappedX = closest;
      } else {
        snappedX = Math.round(dataX / xAxis.step) * xAxis.step;
        snappedX = Math.max(xAxis.min, Math.min(xAxis.max, snappedX));
      }
      const snappedY = Math.round(dataY / yAxis.step) * yAxis.step;
      return {
        x: snappedX,
        y: Math.max(yAxis.min, Math.min(yAxis.max, snappedY)),
      };
    },
    [config]
  );

  // Draw the graph
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = getCanvasSize();
    const plotW = width - PADDING.left - PADDING.right;
    const plotH = height - PADDING.top - PADDING.bottom;
    const { xAxis, yAxis } = config;

    // Clear
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;

    // Vertical grid lines (x-axis)
    const xTicks = xAxis.ticks || Array.from({ length: Math.floor((xAxis.max - xAxis.min) / xAxis.step) + 1 }, (_, i) => xAxis.min + i * xAxis.step);
    for (const x of xTicks) {
      const { px } = toPixel(x, yAxis.min);
      ctx.beginPath();
      ctx.moveTo(px, PADDING.top);
      ctx.lineTo(px, PADDING.top + plotH);
      ctx.stroke();
    }

    // Horizontal grid lines (y-axis)
    for (let y = yAxis.min; y <= yAxis.max; y += yAxis.step) {
      const { py } = toPixel(xAxis.min, y);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, py);
      ctx.lineTo(PADDING.left + plotW, py);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(PADDING.left, PADDING.top);
    ctx.lineTo(PADDING.left, PADDING.top + plotH);
    ctx.stroke();
    // X-axis
    ctx.beginPath();
    ctx.moveTo(PADDING.left, PADDING.top + plotH);
    ctx.lineTo(PADDING.left + plotW, PADDING.top + plotH);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = "#334155";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";

    // X-axis tick labels
    for (const x of xTicks) {
      const { px } = toPixel(x, yAxis.min);
      ctx.fillText(String(x), px, PADDING.top + plotH + 18);
    }

    // Y-axis tick labels
    ctx.textAlign = "right";
    for (let y = yAxis.min; y <= yAxis.max; y += yAxis.step) {
      const { py } = toPixel(xAxis.min, y);
      ctx.fillText(String(y), PADDING.left - 8, py + 4);
    }

    // Axis titles
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(xAxis.label, PADDING.left + plotW / 2, height - 5);

    // Y-axis title (rotated)
    ctx.save();
    ctx.translate(14, PADDING.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxis.label, 0, 0);
    ctx.restore();

    // Draw line of best fit
    if (data.lineOfBestFit) {
      const lob = data.lineOfBestFit;
      const start = toPixel(lob.x1, lob.y1);
      const end = toPixel(lob.x2, lob.y2);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(start.px, start.py);
      ctx.lineTo(end.px, end.py);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw plotted points
    for (const pt of data.points) {
      const series = config.series[pt.series] || config.series[0];
      const { px, py } = toPixel(pt.x, pt.y);

      ctx.fillStyle = series.color;
      ctx.strokeStyle = series.color;
      ctx.lineWidth = 2;

      if (series.symbol === "cross") {
        const s = 6;
        ctx.beginPath();
        ctx.moveTo(px - s, py - s);
        ctx.lineTo(px + s, py + s);
        ctx.moveTo(px + s, py - s);
        ctx.lineTo(px - s, py + s);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw line start point preview
    if (mode === "line" && lineStart) {
      const { px, py } = toPixel(lineStart.x, lineStart.y);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Connect points in each series with lines (for audiogram-style)
    if (config.series.length > 1) {
      for (let si = 0; si < config.series.length; si++) {
        const seriesPoints = data.points
          .filter((p) => p.series === si)
          .sort((a, b) => a.x - b.x);
        if (seriesPoints.length > 1) {
          const series = config.series[si];
          ctx.strokeStyle = series.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const first = toPixel(seriesPoints[0].x, seriesPoints[0].y);
          ctx.moveTo(first.px, first.py);
          for (let i = 1; i < seriesPoints.length; i++) {
            const p = toPixel(seriesPoints[i].x, seriesPoints[i].y);
            ctx.lineTo(p.px, p.py);
          }
          ctx.stroke();
        }
      }
    }
  }, [config, data, mode, lineStart, toPixel, getCanvasSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const resize = () => {
      const w = container.clientWidth;
      const h = Math.min(450, Math.max(350, w * 0.65));
      canvas.width = w * 2; // 2x for retina
      canvas.height = h * 2;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(2, 2);
      draw();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width / 2;
      const scaleY = canvas.height / rect.height / 2;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      // Check if click is in plot area
      const { width, height } = { width: canvas.width / 2, height: canvas.height / 2 };
      if (
        px < PADDING.left - 5 ||
        px > width - PADDING.right + 5 ||
        py < PADDING.top - 5 ||
        py > height - PADDING.bottom + 5
      ) {
        return;
      }

      const { dataX, dataY } = toData(px, py);
      const snapped = snapToGrid(dataX, dataY);

      if (mode === "line") {
        if (!lineStart) {
          setLineStart(snapped);
        } else {
          const newData: GraphData = {
            ...data,
            lineOfBestFit: {
              x1: lineStart.x,
              y1: lineStart.y,
              x2: snapped.x,
              y2: snapped.y,
            },
          };
          setData(newData);
          onChange(JSON.stringify(newData));
          setLineStart(null);
          setMode("plot");
        }
      } else {
        // Check if clicking near an existing point to remove it
        const existingIdx = data.points.findIndex((pt) => {
          const pp = toPixel(pt.x, pt.y);
          const dist = Math.sqrt((pp.px - px) ** 2 + (pp.py - py) ** 2);
          return dist < 12 && pt.series === activeSeries;
        });

        let newPoints: GraphData["points"];
        if (existingIdx >= 0) {
          newPoints = data.points.filter((_, i) => i !== existingIdx);
        } else {
          newPoints = [...data.points, { series: activeSeries, x: snapped.x, y: snapped.y }];
        }

        const newData: GraphData = { ...data, points: newPoints };
        setData(newData);
        onChange(JSON.stringify(newData));
      }
    },
    [data, mode, activeSeries, lineStart, toData, snapToGrid, toPixel, onChange]
  );

  const clearAll = () => {
    const newData: GraphData = { points: [] };
    setData(newData);
    onChange(JSON.stringify(newData));
    setLineStart(null);
  };

  const clearLine = () => {
    const newData: GraphData = { ...data, lineOfBestFit: undefined };
    setData(newData);
    onChange(JSON.stringify(newData));
    setLineStart(null);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Series selector */}
        {config.series.length > 1 && (
          <div className="flex gap-1">
            {config.series.map((s, i) => (
              <button
                key={i}
                onClick={() => { setActiveSeries(i); setMode("plot"); }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  activeSeries === i && mode === "plot"
                    ? "border-slate-400 bg-slate-100 font-medium"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Mode buttons */}
        {config.showLineOfBestFit && (
          <button
            onClick={() => { setMode(mode === "line" ? "plot" : "line"); setLineStart(null); }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              mode === "line"
                ? "border-red-400 bg-red-50 text-red-700 font-medium"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            {mode === "line" ? (lineStart ? "Click end point..." : "Click start point...") : "Draw Line of Best Fit"}
          </button>
        )}

        <div className="flex gap-1 ml-auto">
          {data.lineOfBestFit && (
            <button onClick={clearLine} className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 hover:border-red-300 text-red-600">
              Remove Line
            </button>
          )}
          <button onClick={clearAll} className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 hover:border-red-300 text-red-600">
            Clear All
          </button>
        </div>
      </div>

      {/* Key/legend */}
      {config.series.length > 1 && (
        <div className="flex gap-4 text-xs text-slate-500">
          {config.series.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.symbol === "cross" ? "X" : "O"} = {s.name}
            </span>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="cursor-crosshair w-full"
        />
      </div>

      {/* Status */}
      <div className="text-xs text-slate-400 flex items-center gap-3">
        <span>{data.points.length} point{data.points.length !== 1 ? "s" : ""} plotted</span>
        {data.lineOfBestFit && <span>Line of best fit drawn</span>}
        <span className="ml-auto">Click to add/remove points</span>
      </div>
    </div>
  );
}
