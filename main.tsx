import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

/** 1. CONFIG **/
const SUPABASE_URL = "https://bliaixvdfwaxdlfhayea.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaWFpeHZkZndheGRsZmhheWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDc5OTQsImV4cCI6MjA5OTU4Mzk5NH0.PcqkFrETAtI0JGYinhRKKcmd2qMb2wh6nNQI4sTIG_8";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** 2. STYLED COMPONENTS **/
const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = "default", className = "" }: any) => {
  const v: any = { 
    default: "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-100 hover:shadow-blue-200 hover:-translate-y-0.5",
    success: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-0.5",
    danger: "text-red-500 hover:bg-red-50 hover:text-red-700 font-bold"
  };
  return (
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl font-bold transition-all duration-300 active:scale-95 shadow-lg ${v[variant]} ${className}`}>
      {children}
    </button>
  );
};

/** ANALYTICS PAGE - ISOLATED STATE, QUERY, AND DATA PROCESSING **/
type AnalyticsRecord = {
  id: string | number;
  date?: string | null;
  time?: string | null;
  color?: string | null;
  shift?: string | null;
  product?: string | null;
  quantity?: number | string | null;
  note?: string | null;
  created_by?: string | null;
};

type AnalyticsSeriesItem = { label: string; value: number };

const ANALYTICS_BATCH_SIZE = 500;

const analyticsNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const analyticsNormalize = (value: any) => String(value || "").trim();

const analyticsDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const analyticsGroupByQuantity = (rows: AnalyticsRecord[], field: "product" | "created_by" | "color" | "shift") => {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const label = analyticsNormalize(row[field]) || "-";
    grouped.set(label, (grouped.get(label) || 0) + analyticsNumber(row.quantity));
  });
  return Array.from(grouped.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
};

const AnalyticsStatCard = ({ title, value, subtitle, badge, animationKey }: any) => (
  <Card className="p-5 md:p-6 analytics-stat-card" key={`${title}-${animationKey}`}>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.16em] text-slate-400 truncate">{title}</p>
        <p className="mt-3 text-2xl md:text-3xl font-black tracking-tight text-slate-900 break-words">{value}</p>
        <p className="mt-2 text-[10px] md:text-xs font-bold text-slate-400 leading-relaxed">{subtitle}</p>
      </div>
      <span className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-black shrink-0 border border-blue-100">{badge}</span>
    </div>
  </Card>
);

const AnalyticsChartCard = ({ title, subtitle, children }: any) => (
  <Card className="p-5 md:p-7 analytics-print-section">
    <div className="mb-5">
      <h3 className="font-black text-slate-900 text-sm md:text-base tracking-tight">{title}</h3>
      <p className="mt-1 text-[10px] md:text-xs font-bold text-slate-400">{subtitle}</p>
    </div>
    {children}
  </Card>
);

const AnalyticsEmptyChart = ({ label }: any) => (
  <div className="h-64 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 flex items-center justify-center px-6 text-center text-xs font-bold text-slate-400">
    {label}
  </div>
);

const AnalyticsVerticalBarChart = ({ data, emptyLabel, animationKey, tone = "blue" }: any) => {
  if (!data.length) return <AnalyticsEmptyChart label={emptyLabel} />;
  const maxValue = Math.max(...data.map((item: AnalyticsSeriesItem) => item.value), 1);
  const barClass = tone === "indigo"
    ? "bg-gradient-to-t from-indigo-700 to-violet-400"
    : "bg-gradient-to-t from-blue-700 to-cyan-400";

  return (
    <div key={animationKey} className="h-64 flex items-stretch gap-2 md:gap-3 pt-2 overflow-hidden">
      {data.map((item: AnalyticsSeriesItem, index: number) => {
        const barHeight = Math.max((item.value / maxValue) * 100, 4);
        return (
          <div key={`${item.label}-${index}`} className="flex-1 min-w-0 flex flex-col">
            <div className="h-52 flex flex-col justify-end min-w-0">
              <span className="text-[9px] md:text-[10px] font-black text-slate-500 text-center truncate mb-1" title={item.value.toLocaleString("id-ID")}>{item.value.toLocaleString("id-ID")}</span>
              <div className={`w-full rounded-t-xl shadow-sm analytics-grow-bar ${barClass}`} style={{ height: `${barHeight}%`, animationDelay: `${index * 55}ms` }} title={`${item.label}: ${item.value.toLocaleString("id-ID")}`} />
            </div>
            <span className="mt-2 text-[9px] md:text-[10px] font-black text-slate-500 uppercase text-center truncate" title={item.label}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const AnalyticsHorizontalBarChart = ({ data, emptyLabel, animationKey }: any) => {
  if (!data.length) return <AnalyticsEmptyChart label={emptyLabel} />;
  const maxValue = Math.max(...data.map((item: AnalyticsSeriesItem) => item.value), 1);

  return (
    <div key={animationKey} className="space-y-4 min-h-64 flex flex-col justify-center">
      {data.map((item: AnalyticsSeriesItem, index: number) => (
        <div key={`${item.label}-${index}`}>
          <div className="flex items-center justify-between gap-4 mb-1.5">
            <span className="text-[10px] md:text-xs font-black text-slate-600 uppercase truncate" title={item.label}>{item.label}</span>
            <span className="text-[10px] md:text-xs font-black text-slate-900 shrink-0">{item.value.toLocaleString("id-ID")}</span>
          </div>
          <div className="h-3.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/70">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 analytics-grow-horizontal" style={{ width: `${Math.max((item.value / maxValue) * 100, 3)}%`, animationDelay: `${index * 60}ms` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const AnalyticsLineChart = ({ data, emptyLabel, animationKey }: any) => {
  if (!data.length) return <AnalyticsEmptyChart label={emptyLabel} />;

  const width = 760;
  const height = 250;
  const left = 58;
  const right = 22;
  const top = 20;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(...data.map((item: AnalyticsSeriesItem) => item.value), 1);
  const points = data.map((item: AnalyticsSeriesItem, index: number) => {
    const x = left + (index / Math.max(data.length - 1, 1)) * plotWidth;
    const y = top + plotHeight - (item.value / maxValue) * plotHeight;
    return { ...item, x, y };
  });
  const linePath = points.map((point: any, index: number) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(top + plotHeight).toFixed(2)} L ${points[0].x.toFixed(2)} ${(top + plotHeight).toFixed(2)} Z`;
  const gradientId = `analytics-line-gradient-${animationKey}`;
  const labelIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));

  return (
    <div key={animationKey} className="w-full h-64 overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label="Tren produksi">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = top + plotHeight - ratio * plotHeight;
          return (
            <g key={ratio}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={left - 9} y={y + 4} textAnchor="end" fontSize="10" fontWeight="700" fill="#94a3b8">{Math.round(maxValue * ratio).toLocaleString("id-ID")}</text>
            </g>
          );
        })}
        <path d={areaPath} fill={`url(#${gradientId})`} className="analytics-area-fade" />
        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="analytics-line-draw" />
        {points.map((point: any, index: number) => (
          <circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r="4" fill="#ffffff" stroke="#1d4ed8" strokeWidth="3" className="analytics-point-fade" style={{ animationDelay: `${300 + index * 24}ms` }}>
            <title>{`${point.label}: ${point.value.toLocaleString("id-ID")}`}</title>
          </circle>
        ))}
        {labelIndexes.map((index) => (
          <text key={index} x={points[index].x} y={height - 13} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} fontSize="10" fontWeight="700" fill="#64748b">
            {points[index].label}
          </text>
        ))}
      </svg>
    </div>
  );
};

const AnalyticsDonutChart = ({ data, emptyLabel, animationKey }: any) => {
  if (!data.length) return <AnalyticsEmptyChart label={emptyLabel} />;

  const colors = ["#2563eb", "#7c3aed", "#0d9488", "#ea580c", "#db2777", "#64748b", "#16a34a"];
  const total = data.reduce((sum: number, item: AnalyticsSeriesItem) => sum + item.value, 0);
  if (total <= 0) return <AnalyticsEmptyChart label={emptyLabel} />;
  let offset = 0;

  return (
    <div key={animationKey} className="min-h-64 grid grid-cols-1 sm:grid-cols-[210px_1fr] items-center gap-5">
      <div className="relative w-52 h-52 mx-auto analytics-donut-in">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90" role="img" aria-label="Distribusi warna">
          <circle cx="90" cy="90" r="62" fill="none" stroke="#e2e8f0" strokeWidth="24" />
          {data.map((item: AnalyticsSeriesItem, index: number) => {
            const percentage = (item.value / total) * 100;
            const currentOffset = offset;
            offset += percentage;
            return (
              <circle
                key={`${item.label}-${index}`}
                cx="90"
                cy="90"
                r="62"
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth="24"
                pathLength={100}
                strokeDasharray={`${percentage} ${100 - percentage}`}
                strokeDashoffset={-currentOffset}
              >
                <title>{`${item.label}: ${item.value.toLocaleString("id-ID")} (${percentage.toFixed(1)}%)`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-slate-900">{total.toLocaleString("id-ID")}</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Qty</span>
        </div>
      </div>
      <div className="space-y-2.5 min-w-0">
        {data.map((item: AnalyticsSeriesItem, index: number) => (
          <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="text-[10px] md:text-xs font-black text-slate-600 uppercase truncate" title={item.label}>{item.label}</span>
            </div>
            <span className="text-[10px] md:text-xs font-black text-slate-900 shrink-0">{((item.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function AnalyticsPage({ session, language }: any) {
  const isChinese = language === "cn";
  const copy = isChinese ? {
    title: "数据分析",
    subtitle: "独立查询、筛选与统计，不影响生产页面。",
    startDate: "开始日期", endDate: "结束日期", shift: "班次", operator: "操作员", product: "产品", color: "颜色",
    search: "搜索", sorting: "排序", reset: "重置筛选", exportPdf: "导出 PDF", all: "全部",
    searchPlaceholder: "产品、颜色、备注、操作员...", updating: "正在更新分析数据...", noData: "筛选条件下没有数据。",
    invalidRange: "开始日期不能晚于结束日期。", queryError: "无法加载分析数据。",
    newest: "最新记录", oldest: "最早记录", qtyHigh: "数量从高到低", qtyLow: "数量从低到高", productAZ: "产品 A-Z", operatorAZ: "操作员 A-Z",
    totalProduction: "总产量", totalQuantity: "总数量", totalRecord: "总记录", totalOperator: "操作员总数", totalProduct: "产品总数", totalColor: "颜色总数",
    today: "今日产量", week: "本周产量", month: "本月产量", bestOperator: "最佳操作员", topProduct: "最多产品", topColor: "最多颜色", dailyAverage: "日均产量",
    outputAccumulation: "筛选结果的累计产出", quantityAccumulation: "Quantity 字段累计", recordsMatched: "符合条件的记录", uniqueOperator: "唯一操作员", uniqueProduct: "唯一产品", uniqueColor: "唯一颜色",
    todayHint: "当前日期范围内", weekHint: "本周（周一开始）", monthHint: "本月", byQuantity: "按数量计算", perActiveDay: "每个有记录日期的平均值",
    productChart: "各产品产量", productChartSub: "按 Quantity 汇总的主要产品", operatorChart: "操作员贡献", operatorChartSub: "按操作员汇总的产量", trendChart: "生产趋势", trendChartSub: "按日期汇总的生产走势",
    colorChart: "颜色分布", colorChartSub: "各颜色的生产占比", shiftChart: "班次分布", shiftChartSub: "白班与夜班的产量", top10Chart: "前 10 产品", top10ChartSub: "数量最高的十个产品",
    filteredData: "筛选数据", filteredDataSub: "屏幕显示前 50 条，PDF 报告包含全部筛选数据。", date: "日期", qty: "数量", note: "备注", showing: "显示", of: "共",
    reportTitle: "BUYMORE 生产分析报告", period: "报告期间", generated: "打印时间", footer: "BUYMORE ANALYTICS • 由系统自动生成", preparedBy: "制表", approvedBy: "审核", signature: "签名",
    allData: "全部日期", chartEmpty: "没有可用于图表的数据。"
  } : {
    title: "Analisis",
    subtitle: "",
    startDate: "Tanggal Mulai", endDate: "Tanggal Akhir", shift: "Shift", operator: "Operator", product: "Produk", color: "Warna",
    search: "Search", sorting: "Sorting", reset: "Reset Filter", exportPdf: "Export PDF", all: "Semua",
    searchPlaceholder: "Produk, warna, catatan, operator...", updating: "Memperbarui data analisis...", noData: "Tidak ada data untuk filter Analisis.",
    invalidRange: "Tanggal mulai tidak boleh melewati tanggal akhir.", queryError: "Data Analisis tidak dapat dimuat.",
    newest: "Data terbaru", oldest: "Data terlama", qtyHigh: "Quantity terbesar", qtyLow: "Quantity terkecil", productAZ: "Produk A-Z", operatorAZ: "Operator A-Z",
    totalProduction: "Total Produksi", totalQuantity: "Total Quantity", totalRecord: "Total Record", totalOperator: "Total Operator", totalProduct: "Total Produk", totalColor: "Total Warna",
    today: "Produksi Hari Ini", week: "Produksi Minggu Ini", month: "Produksi Bulan Ini", bestOperator: "Operator Terbaik", topProduct: "Produk Terbanyak", topColor: "Warna Terbanyak", dailyAverage: "Rata-rata Produksi Harian",
    outputAccumulation: "Akumulasi output sesuai filter", quantityAccumulation: "Akumulasi field Quantity", recordsMatched: "Record yang sesuai filter", uniqueOperator: "Operator unik", uniqueProduct: "Produk unik", uniqueColor: "Warna unik",
    todayHint: "Dalam hasil filter aktif", weekHint: "Minggu berjalan (mulai Senin)", monthHint: "Bulan berjalan", byQuantity: "Berdasarkan total quantity", perActiveDay: "Rata-rata per tanggal yang memiliki record",
    productChart: "Produksi per Produk", productChartSub: "Produk utama berdasarkan akumulasi Quantity", operatorChart: "Kontribusi Operator", operatorChartSub: "Akumulasi produksi masing-masing operator", trendChart: "Tren Produksi", trendChartSub: "Pergerakan total produksi berdasarkan tanggal",
    colorChart: "Distribusi Warna", colorChartSub: "Proporsi produksi untuk setiap warna", shiftChart: "Distribusi Shift", shiftChartSub: "Perbandingan akumulasi produksi per shift", top10Chart: "Top 10 Produk", top10ChartSub: "Sepuluh produk dengan Quantity tertinggi",
    filteredData: "Data Terfilter", filteredDataSub: "Tampilan layar memuat 50 record pertama; laporan PDF memuat seluruh data terfilter.", date: "Tanggal", qty: "Qty", note: "Catatan", showing: "Menampilkan", of: "dari",
    reportTitle: "LAPORAN ANALISIS PRODUKSI BUYMORE", period: "Periode Laporan", generated: "Waktu Cetak", footer: "BUYMORE ANALYTICS • Dokumen dibuat otomatis oleh sistem", preparedBy: "Dibuat oleh", approvedBy: "Disetujui oleh", signature: "Tanda Tangan",
    allData: "Semua tanggal", chartEmpty: "Belum ada data yang dapat divisualisasikan."
  };

  const [analyticsRecords, setAnalyticsRecords] = useState<AnalyticsRecord[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsStartDate, setAnalyticsStartDate] = useState("");
  const [analyticsEndDate, setAnalyticsEndDate] = useState("");
  const [analyticsShift, setAnalyticsShift] = useState("Semua");
  const [analyticsOperator, setAnalyticsOperator] = useState("Semua");
  const [analyticsProduct, setAnalyticsProduct] = useState("Semua");
  const [analyticsColor, setAnalyticsColor] = useState("Semua");
  const [analyticsSearchInput, setAnalyticsSearchInput] = useState("");
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [analyticsSort, setAnalyticsSort] = useState("newest");
  const [analyticsRefreshVersion, setAnalyticsRefreshVersion] = useState(0);
  const [analyticsAnimationKey, setAnalyticsAnimationKey] = useState(0);
  const [analyticsPrintMode, setAnalyticsPrintMode] = useState(false);
  const [analyticsOptions, setAnalyticsOptions] = useState({ operators: [] as string[], products: [] as string[], colors: [] as string[] });

  useEffect(() => {
    const timeout = window.setTimeout(() => setAnalyticsSearch(analyticsSearchInput.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [analyticsSearchInput]);

  useEffect(() => {
    setAnalyticsAnimationKey((previous) => previous + 1);
  }, [analyticsSearch, analyticsSort]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const loadAnalytics = async () => {
      if (analyticsStartDate && analyticsEndDate && analyticsStartDate > analyticsEndDate) {
        setAnalyticsError(copy.invalidRange);
        setAnalyticsRecords([]);
        setAnalyticsAnimationKey((previous) => previous + 1);
        setAnalyticsLoading(false);
        return;
      }

      setAnalyticsLoading(true);
      setAnalyticsError("");

      try {
        const collected: AnalyticsRecord[] = [];
        let lastId: string | number | null = null;

        while (!cancelled) {
          let query = supabase
            .from("production_data")
            .select("id,date,time,color,shift,product,quantity,note,created_by")
            .order("id", { ascending: false })
            .limit(ANALYTICS_BATCH_SIZE);

          if (lastId !== null) query = query.lt("id", lastId);
          if (analyticsStartDate) query = query.gte("date", analyticsStartDate);
          if (analyticsEndDate) query = query.lte("date", analyticsEndDate);
          if (analyticsShift !== "Semua") query = query.eq("shift", analyticsShift);
          if (analyticsOperator !== "Semua") query = query.eq("created_by", analyticsOperator);
          if (analyticsProduct !== "Semua") query = query.eq("product", analyticsProduct);
          if (analyticsColor !== "Semua") query = query.eq("color", analyticsColor);

          const { data, error } = await query;
          if (error) throw error;

          const batch = (data || []) as AnalyticsRecord[];
          collected.push(...batch);
          if (batch.length < ANALYTICS_BATCH_SIZE) break;
          const nextLastId = batch[batch.length - 1]?.id;
          if (nextLastId === undefined || nextLastId === null || nextLastId === lastId) break;
          lastId = nextLastId;
        }

        if (!cancelled) {
          setAnalyticsRecords(collected);
          setAnalyticsOptions((previous) => {
            const operators = Array.from(new Set([...previous.operators, ...collected.map((row) => analyticsNormalize(row.created_by)).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
            const products = Array.from(new Set([...previous.products, ...collected.map((row) => analyticsNormalize(row.product)).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
            const colors = Array.from(new Set([...previous.colors, ...collected.map((row) => analyticsNormalize(row.color)).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
            return { operators, products, colors };
          });
          setAnalyticsAnimationKey((previous) => previous + 1);
        }
      } catch (error: any) {
        if (!cancelled) setAnalyticsError(error?.message ? `${copy.queryError} ${error.message}` : copy.queryError);
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
    return () => { cancelled = true; };
  }, [session, analyticsStartDate, analyticsEndDate, analyticsShift, analyticsOperator, analyticsProduct, analyticsColor, analyticsRefreshVersion, copy.invalidRange, copy.queryError]);

  useEffect(() => {
    if (!session) return;
    let refreshTimer: number | undefined;
    const channel = supabase
      .channel(`realtime-analytics-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "production_data" }, (payload: any) => {
        const changedRow = (payload.new && Object.keys(payload.new).length ? payload.new : payload.old) as AnalyticsRecord;
        if (changedRow) {
          setAnalyticsOptions((previous) => ({
            operators: Array.from(new Set([...previous.operators, analyticsNormalize(changedRow.created_by)].filter(Boolean))).sort((a, b) => a.localeCompare(b)),
            products: Array.from(new Set([...previous.products, analyticsNormalize(changedRow.product)].filter(Boolean))).sort((a, b) => a.localeCompare(b)),
            colors: Array.from(new Set([...previous.colors, analyticsNormalize(changedRow.color)].filter(Boolean))).sort((a, b) => a.localeCompare(b))
          }));
        }
        if (refreshTimer) window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => setAnalyticsRefreshVersion((previous) => previous + 1), 250);
      })
      .subscribe();

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [session]);

  const processedRecords = React.useMemo(() => {
    const search = analyticsSearch.toUpperCase();
    const filtered = analyticsRecords.filter((row) => {
      if (!search) return true;
      return [row.date, row.time, row.shift, row.product, row.color, row.note, row.created_by]
        .map((value) => analyticsNormalize(value).toUpperCase())
        .some((value) => value.includes(search));
    });

    return [...filtered].sort((a, b) => {
      const aQty = analyticsNumber(a.quantity);
      const bQty = analyticsNumber(b.quantity);
      const aDateTime = `${analyticsNormalize(a.date)} ${analyticsNormalize(a.time)}`;
      const bDateTime = `${analyticsNormalize(b.date)} ${analyticsNormalize(b.time)}`;
      if (analyticsSort === "oldest") return aDateTime.localeCompare(bDateTime) || String(a.id).localeCompare(String(b.id));
      if (analyticsSort === "qty_desc") return bQty - aQty;
      if (analyticsSort === "qty_asc") return aQty - bQty;
      if (analyticsSort === "product_asc") return analyticsNormalize(a.product).localeCompare(analyticsNormalize(b.product));
      if (analyticsSort === "operator_asc") return analyticsNormalize(a.created_by).localeCompare(analyticsNormalize(b.created_by));
      return bDateTime.localeCompare(aDateTime) || String(b.id).localeCompare(String(a.id));
    });
  }, [analyticsRecords, analyticsSearch, analyticsSort]);

  const analyticsData = React.useMemo(() => {
    const totalQuantity = processedRecords.reduce((sum, row) => sum + analyticsNumber(row.quantity), 0);
    const uniqueDates = new Set(processedRecords.map((row) => analyticsNormalize(row.date)).filter(Boolean));
    const operators = new Set(processedRecords.map((row) => analyticsNormalize(row.created_by)).filter(Boolean));
    const products = new Set(processedRecords.map((row) => analyticsNormalize(row.product)).filter(Boolean));
    const colors = new Set(processedRecords.map((row) => analyticsNormalize(row.color)).filter(Boolean));

    const now = new Date();
    const todayKey = analyticsDateKey(now);
    const weekStart = new Date(now);
    const dayFromMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - dayFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartKey = analyticsDateKey(weekStart);
    const monthStartKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const productionToday = processedRecords.filter((row) => row.date === todayKey).reduce((sum, row) => sum + analyticsNumber(row.quantity), 0);
    const productionWeek = processedRecords.filter((row) => {
      const date = analyticsNormalize(row.date);
      return date >= weekStartKey && date <= todayKey;
    }).reduce((sum, row) => sum + analyticsNumber(row.quantity), 0);
    const productionMonth = processedRecords.filter((row) => {
      const date = analyticsNormalize(row.date);
      return date >= monthStartKey && date <= todayKey;
    }).reduce((sum, row) => sum + analyticsNumber(row.quantity), 0);

    const productSeries = analyticsGroupByQuantity(processedRecords, "product");
    const operatorSeries = analyticsGroupByQuantity(processedRecords, "created_by");
    const colorSeriesRaw = analyticsGroupByQuantity(processedRecords, "color");
    const shiftSeries = analyticsGroupByQuantity(processedRecords, "shift");
    const trendMap = new Map<string, number>();
    processedRecords.forEach((row) => {
      const date = analyticsNormalize(row.date) || "-";
      trendMap.set(date, (trendMap.get(date) || 0) + analyticsNumber(row.quantity));
    });
    const trendSeries = Array.from(trendMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const colorSeries = colorSeriesRaw.length > 6
      ? [...colorSeriesRaw.slice(0, 6), { label: isChinese ? "其他" : "LAINNYA", value: colorSeriesRaw.slice(6).reduce((sum, item) => sum + item.value, 0) }]
      : colorSeriesRaw;

    return {
      totalQuantity,
      totalRecord: processedRecords.length,
      totalOperator: operators.size,
      totalProduct: products.size,
      totalColor: colors.size,
      productionToday,
      productionWeek,
      productionMonth,
      bestOperator: operatorSeries[0]?.label || "-",
      topProduct: productSeries[0]?.label || "-",
      topColor: colorSeriesRaw[0]?.label || "-",
      dailyAverage: uniqueDates.size ? totalQuantity / uniqueDates.size : 0,
      productSeries: productSeries.slice(0, 8),
      operatorSeries: operatorSeries.slice(0, 8),
      colorSeries,
      shiftSeries,
      trendSeries,
      topTenProducts: productSeries.slice(0, 10)
    };
  }, [processedRecords, isChinese]);

  const resetAnalyticsFilters = () => {
    setAnalyticsStartDate("");
    setAnalyticsEndDate("");
    setAnalyticsShift("Semua");
    setAnalyticsOperator("Semua");
    setAnalyticsProduct("Semua");
    setAnalyticsColor("Semua");
    setAnalyticsSearchInput("");
    setAnalyticsSearch("");
    setAnalyticsSort("newest");
    setAnalyticsError("");
  };

  const handleAnalyticsPrint = () => {
    if (analyticsLoading || analyticsError || processedRecords.length === 0) {
      alert(analyticsError || (analyticsLoading ? copy.updating : copy.noData));
      return;
    }

    setAnalyticsPrintMode(true);
    const previousTitle = document.title;
    const periodLabel = analyticsStartDate || analyticsEndDate ? `${analyticsStartDate || "..."}_${analyticsEndDate || "..."}` : "semua-tanggal";
    document.title = `Laporan-Analisis-${periodLabel}`;
    const restorePrintState = () => {
      document.title = previousTitle;
      setAnalyticsPrintMode(false);
      window.removeEventListener("afterprint", restorePrintState);
    };
    window.addEventListener("afterprint", restorePrintState);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  };

  const periodText = analyticsStartDate || analyticsEndDate
    ? `${analyticsStartDate || "..."} — ${analyticsEndDate || "..."}`
    : copy.allData;

  const statisticCards = [
    { title: copy.totalProduction, value: `${analyticsData.totalQuantity.toLocaleString("id-ID")} Pcs`, subtitle: copy.outputAccumulation, badge: "Σ" },
    { title: copy.totalQuantity, value: analyticsData.totalQuantity.toLocaleString("id-ID"), subtitle: copy.quantityAccumulation, badge: "QTY" },
    { title: copy.totalRecord, value: analyticsData.totalRecord.toLocaleString("id-ID"), subtitle: copy.recordsMatched, badge: "#" },
    { title: copy.totalOperator, value: analyticsData.totalOperator.toLocaleString("id-ID"), subtitle: copy.uniqueOperator, badge: "OP" },
    { title: copy.totalProduct, value: analyticsData.totalProduct.toLocaleString("id-ID"), subtitle: copy.uniqueProduct, badge: "SKU" },
    { title: copy.totalColor, value: analyticsData.totalColor.toLocaleString("id-ID"), subtitle: copy.uniqueColor, badge: "CLR" },
    { title: copy.today, value: `${analyticsData.productionToday.toLocaleString("id-ID")} Pcs`, subtitle: copy.todayHint, badge: "D" },
    { title: copy.week, value: `${analyticsData.productionWeek.toLocaleString("id-ID")} Pcs`, subtitle: copy.weekHint, badge: "W" },
    { title: copy.month, value: `${analyticsData.productionMonth.toLocaleString("id-ID")} Pcs`, subtitle: copy.monthHint, badge: "M" },
    { title: copy.bestOperator, value: analyticsData.bestOperator, subtitle: copy.byQuantity, badge: "★" },
    { title: copy.topProduct, value: analyticsData.topProduct, subtitle: copy.byQuantity, badge: "P" },
    { title: copy.topColor, value: analyticsData.topColor, subtitle: copy.byQuantity, badge: "C" },
    { title: copy.dailyAverage, value: `${analyticsData.dailyAverage.toLocaleString("id-ID", { maximumFractionDigits: 2 })} Pcs`, subtitle: copy.perActiveDay, badge: "Ø" }
  ];

  return (
    <div id="analytics-print-root" className="space-y-6 md:space-y-8 overflow-x-hidden">
      <style>{`
        .analytics-print-only { display: none; }
        @keyframes analyticsCardEnter { from { opacity: .45; transform: translateY(7px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes analyticsGrowY { from { transform: scaleY(.02); opacity: .2; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes analyticsGrowX { from { transform: scaleX(.02); opacity: .2; } to { transform: scaleX(1); opacity: 1; } }
        @keyframes analyticsLineDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes analyticsFade { from { opacity: 0; transform: scale(.97); } to { opacity: 1; transform: scale(1); } }
        .analytics-stat-card { animation: analyticsCardEnter .38s ease-out both; }
        .analytics-grow-bar { transform-origin: bottom; animation: analyticsGrowY .68s cubic-bezier(.22,.75,.22,1) both; }
        .analytics-grow-horizontal { transform-origin: left; animation: analyticsGrowX .68s cubic-bezier(.22,.75,.22,1) both; }
        .analytics-line-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: analyticsLineDraw .95s ease-out forwards; }
        .analytics-area-fade, .analytics-donut-in { animation: analyticsFade .6s ease-out both; transform-origin: center; }
        .analytics-point-fade { opacity: 0; animation: analyticsFade .32s ease-out forwards; transform-origin: center; transform-box: fill-box; }
        @media (prefers-reduced-motion: reduce) {
          .analytics-stat-card, .analytics-grow-bar, .analytics-grow-horizontal, .analytics-line-draw, .analytics-area-fade, .analytics-donut-in, .analytics-point-fade { animation: none !important; opacity: 1 !important; transform: none !important; stroke-dashoffset: 0 !important; }
        }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          html, body { background: #ffffff !important; }
          body * { visibility: hidden !important; }
          #analytics-print-root, #analytics-print-root * { visibility: visible !important; }
          #analytics-print-root { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
          .analytics-no-print { display: none !important; }
          .analytics-print-only { display: block !important; }
          .analytics-print-cards { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 8px !important; }
          .analytics-print-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; }
          .analytics-print-section, .analytics-stat-card { break-inside: avoid; box-shadow: none !important; border: 1px solid #cbd5e1 !important; }
          .analytics-stat-card { padding: 12px !important; }
          .analytics-stat-card p { margin-top: 4px !important; }
          .analytics-grow-bar, .analytics-grow-horizontal, .analytics-line-draw, .analytics-area-fade, .analytics-donut-in, .analytics-point-fade { animation: none !important; opacity: 1 !important; transform: none !important; stroke-dashoffset: 0 !important; }
          .analytics-report-table { width: 100% !important; border-collapse: collapse !important; font-size: 9px !important; }
          .analytics-report-table th, .analytics-report-table td { border: 1px solid #cbd5e1 !important; padding: 5px 6px !important; vertical-align: top !important; }
          .analytics-report-table thead { display: table-header-group; }
          .analytics-signature { break-inside: avoid; page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="analytics-print-only border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex items-start justify-between gap-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{copy.reportTitle}</h1>
            <p className="mt-2 text-xs font-bold text-slate-600">{copy.period}: {periodText}</p>
            <p className="mt-1 text-[10px] font-bold text-slate-500">{copy.shift}: {analyticsShift === "Semua" ? copy.all : analyticsShift} • {copy.operator}: {analyticsOperator === "Semua" ? copy.all : analyticsOperator} • {copy.product}: {analyticsProduct === "Semua" ? copy.all : analyticsProduct} • {copy.color}: {analyticsColor === "Semua" ? copy.all : analyticsColor}{analyticsSearch ? ` • ${copy.search}: ${analyticsSearch}` : ""}</p>
          </div>
          <div className="text-right text-[10px] font-bold text-slate-500">
            <p>{copy.generated}</p>
            <p className="mt-1 text-slate-900">{new Date().toLocaleString("id-ID")}</p>
          </div>
        </div>
      </div>

      <Card className="p-5 md:p-7 border-l-8 border-l-indigo-600 analytics-no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">{copy.title}</h2>
            </div>
            <p className="mt-2 text-xs md:text-sm font-medium text-slate-500 max-w-3xl leading-relaxed">{copy.subtitle}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
            <button onClick={resetAnalyticsFilters} className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">{copy.reset}</button>
            <button disabled={analyticsLoading || analyticsPrintMode || Boolean(analyticsError) || processedRecords.length === 0} onClick={handleAnalyticsPrint} className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white text-xs font-black shadow-lg shadow-red-100 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">{copy.exportPdf}</button>
          </div>
        </div>
      </Card>

      <Card className="p-5 md:p-7 analytics-no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2"><label className="text-xs font-black text-slate-700 ml-1">{copy.startDate}</label><input type="date" value={analyticsStartDate} onChange={(event) => setAnalyticsStartDate(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all" /></div>
          <div className="space-y-2"><label className="text-xs font-black text-slate-700 ml-1">{copy.endDate}</label><input type="date" value={analyticsEndDate} onChange={(event) => setAnalyticsEndDate(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all" /></div>
          <div className="space-y-2"><label className="text-xs font-black text-slate-700 ml-1">{copy.shift}</label><select value={analyticsShift} onChange={(event) => setAnalyticsShift(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"><option value="Semua">{copy.all}</option><option value="Siang">{isChinese ? "白班" : "Siang"}</option><option value="Malam">{isChinese ? "夜班" : "Malam"}</option></select></div>
          <div className="space-y-2"><label className="text-xs font-black text-slate-700 ml-1">{copy.operator}</label><select value={analyticsOperator} onChange={(event) => setAnalyticsOperator(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"><option value="Semua">{copy.all}</option>{analyticsOptions.operators.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
          <div className="space-y-2"><label className="text-xs font-black text-slate-700 ml-1">{copy.product}</label><select value={analyticsProduct} onChange={(event) => setAnalyticsProduct(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"><option value="Semua">{copy.all}</option>{analyticsOptions.products.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
          <div className="space-y-2"><label className="text-xs font-black text-slate-700 ml-1">{copy.color}</label><select value={analyticsColor} onChange={(event) => setAnalyticsColor(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"><option value="Semua">{copy.all}</option>{analyticsOptions.colors.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
          <div className="space-y-2"><label className="text-xs font-black text-slate-700 ml-1">{copy.search}</label><div className="relative"><input type="text" value={analyticsSearchInput} onChange={(event) => setAnalyticsSearchInput(event.target.value)} placeholder={copy.searchPlaceholder} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all" />{analyticsSearchInput && <button onClick={() => setAnalyticsSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-black">✕</button>}</div></div>
          <div className="space-y-2"><label className="text-xs font-black text-slate-700 ml-1">{copy.sorting}</label><select value={analyticsSort} onChange={(event) => setAnalyticsSort(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"><option value="newest">{copy.newest}</option><option value="oldest">{copy.oldest}</option><option value="qty_desc">{copy.qtyHigh}</option><option value="qty_asc">{copy.qtyLow}</option><option value="product_asc">{copy.productAZ}</option><option value="operator_asc">{copy.operatorAZ}</option></select></div>
        </div>
        <div className="mt-4 min-h-[20px] flex flex-wrap items-center gap-3">
          {analyticsLoading && <span className="text-[10px] md:text-xs font-black text-indigo-600 animate-pulse">{copy.updating}</span>}
          {analyticsError && <span className="text-[10px] md:text-xs font-black text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">{analyticsError}</span>}
          {!analyticsLoading && !analyticsError && processedRecords.length === 0 && <span className="text-[10px] md:text-xs font-black text-slate-400">{copy.noData}</span>}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 analytics-print-cards">
        {statisticCards.map((card, index) => <AnalyticsStatCard key={`${card.title}-${index}-${analyticsAnimationKey}`} {...card} animationKey={analyticsAnimationKey} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-6 analytics-print-grid">
        <AnalyticsChartCard title={copy.productChart} subtitle={copy.productChartSub}><AnalyticsVerticalBarChart key={`product-${analyticsAnimationKey}`} data={analyticsData.productSeries} emptyLabel={copy.chartEmpty} animationKey={analyticsAnimationKey} /></AnalyticsChartCard>
        <AnalyticsChartCard title={copy.operatorChart} subtitle={copy.operatorChartSub}><AnalyticsVerticalBarChart key={`operator-${analyticsAnimationKey}`} data={analyticsData.operatorSeries} emptyLabel={copy.chartEmpty} animationKey={analyticsAnimationKey} tone="indigo" /></AnalyticsChartCard>
        <AnalyticsChartCard title={copy.trendChart} subtitle={copy.trendChartSub}><AnalyticsLineChart key={`trend-${analyticsAnimationKey}`} data={analyticsData.trendSeries} emptyLabel={copy.chartEmpty} animationKey={analyticsAnimationKey} /></AnalyticsChartCard>
        <AnalyticsChartCard title={copy.colorChart} subtitle={copy.colorChartSub}><AnalyticsDonutChart key={`color-${analyticsAnimationKey}`} data={analyticsData.colorSeries} emptyLabel={copy.chartEmpty} animationKey={analyticsAnimationKey} /></AnalyticsChartCard>
        <AnalyticsChartCard title={copy.shiftChart} subtitle={copy.shiftChartSub}><AnalyticsHorizontalBarChart key={`shift-${analyticsAnimationKey}`} data={analyticsData.shiftSeries} emptyLabel={copy.chartEmpty} animationKey={analyticsAnimationKey} /></AnalyticsChartCard>
        <AnalyticsChartCard title={copy.top10Chart} subtitle={copy.top10ChartSub}><AnalyticsHorizontalBarChart key={`top10-${analyticsAnimationKey}`} data={analyticsData.topTenProducts} emptyLabel={copy.chartEmpty} animationKey={analyticsAnimationKey} /></AnalyticsChartCard>
      </div>

      <Card className="analytics-no-print">
        <div className="px-5 md:px-7 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div><h3 className="font-black text-slate-900 text-sm md:text-base">{copy.filteredData}</h3><p className="mt-1 text-[10px] md:text-xs font-bold text-slate-400">{copy.filteredDataSub}</p></div>
          <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">{copy.showing} {Math.min(processedRecords.length, 50).toLocaleString("id-ID")} {copy.of} {processedRecords.length.toLocaleString("id-ID")}</span>
        </div>

        <div className="md:hidden divide-y divide-slate-100 px-5">
          {processedRecords.slice(0, 50).map((row) => (
            <div key={row.id} className="py-4 space-y-2">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-black text-slate-900 truncate">{row.product || "-"}</p><p className="text-[10px] font-bold text-slate-400 mt-1">{row.date || "-"} • {row.shift || "-"} • {row.color || "-"}</p></div><span className="text-sm font-black text-blue-700 shrink-0">{analyticsNumber(row.quantity).toLocaleString("id-ID")}</span></div>
              <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-slate-500"><span className="truncate">{row.created_by || "-"}</span><span className="truncate text-right">{row.note || "-"}</span></div>
            </div>
          ))}
          {!processedRecords.length && <div className="py-12 text-center text-xs font-bold text-slate-400">{copy.noData}</div>}
        </div>

        <div className="hidden md:block overflow-hidden">
          <table className="w-full text-xs text-left border-collapse table-fixed">
            <thead><tr className="bg-white border-b border-slate-100 text-slate-600 font-black"><th className="px-6 py-4 w-[13%]">{copy.date}</th><th className="px-5 py-4 w-[10%]">{copy.shift}</th><th className="px-5 py-4 w-[19%]">{copy.product}</th><th className="px-5 py-4 w-[13%]">{copy.color}</th><th className="px-5 py-4 text-right w-[10%]">{copy.qty}</th><th className="px-5 py-4 w-[18%]">{copy.operator}</th><th className="px-5 py-4 w-[17%]">{copy.note}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {processedRecords.slice(0, 50).map((row, index) => <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}><td className="px-6 py-3.5 font-bold text-slate-700 truncate">{row.date || "-"}</td><td className="px-5 py-3.5 font-bold text-slate-600 truncate">{row.shift || "-"}</td><td className="px-5 py-3.5 font-black text-slate-900 truncate" title={row.product || "-"}>{row.product || "-"}</td><td className="px-5 py-3.5 font-bold text-slate-600 truncate">{row.color || "-"}</td><td className="px-5 py-3.5 text-right font-black text-blue-700">{analyticsNumber(row.quantity).toLocaleString("id-ID")}</td><td className="px-5 py-3.5 font-bold text-slate-600 truncate" title={row.created_by || "-"}>{row.created_by || "-"}</td><td className="px-5 py-3.5 font-bold text-slate-500 truncate" title={row.note || "-"}>{row.note || "-"}</td></tr>)}
              {!processedRecords.length && <tr><td colSpan={7} className="px-6 py-12 text-center text-xs font-bold text-slate-400">{copy.noData}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {analyticsPrintMode && (
        <div className="analytics-print-only mt-6">
          <h2 className="text-sm font-black text-slate-900 mb-3">{copy.filteredData} ({processedRecords.length.toLocaleString("id-ID")} record)</h2>
          <table className="analytics-report-table">
            <thead><tr><th>{copy.date}</th><th>{copy.shift}</th><th>{copy.product}</th><th>{copy.color}</th><th>{copy.qty}</th><th>{copy.operator}</th><th>{copy.note}</th></tr></thead>
            <tbody>{processedRecords.map((row) => <tr key={`print-${row.id}`}><td>{row.date || "-"} {row.time || ""}</td><td>{row.shift || "-"}</td><td>{row.product || "-"}</td><td>{row.color || "-"}</td><td className="text-right">{analyticsNumber(row.quantity).toLocaleString("id-ID")}</td><td>{row.created_by || "-"}</td><td>{row.note || "-"}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={4} className="text-right font-black">{copy.totalProduction}</td><td className="text-right font-black">{analyticsData.totalQuantity.toLocaleString("id-ID")}</td><td colSpan={2}></td></tr></tfoot>
          </table>

          <div className="analytics-signature mt-8 grid grid-cols-2 gap-20 text-center text-[10px] font-bold text-slate-700">
            <div><p>{copy.preparedBy}</p><div className="h-16"></div><div className="border-t border-slate-700 pt-2">{copy.signature}</div></div>
            <div><p>{copy.approvedBy}</p><div className="h-16"></div><div className="border-t border-slate-700 pt-2">{copy.signature}</div></div>
          </div>
          <div className="mt-8 pt-3 border-t border-slate-300 flex justify-between text-[9px] font-bold text-slate-500"><span>{copy.footer}</span><span>{copy.period}: {periodText}</span></div>
        </div>
      )}
    </div>
  );
}

/** 3. APP UTAMA **/
function ProductionSystem() {
  // --- AUTH STATES ---
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState(""); 
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState(false);

  // --- ORIGINAL STATES ---
  const [language, setLanguage] = useState(() => localStorage.getItem("app_lang") || "id");
  const [activeTab, setActiveTab] = useState("production"); 
  
  // Inisialisasi records langsung dari localStorage jika data cache lokal tersedia
  const [records, setRecords] = useState<any[]>(() => {
    try {
      const savedRecords = localStorage.getItem("cached_production_records");
      return savedRecords ? JSON.parse(savedRecords) : [];
    } catch (e) {
      return [];
    }
  });
  
  // Jika cache data lokal ditemukan, set loading ke false agar data langsung tampil tanpa layar berkedip kosong
  const [loading, setLoading] = useState(() => {
    return localStorage.getItem("cached_production_records") ? false : true;
  });

  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], color: "", shift: "Siang", product: "", quantity: "", note: "" });
  const [filterDate, setFilterDate] = useState("");
  const [filterShift, setFilterShift] = useState("Semua"); 
  const [searchQuery, setSearchQuery] = useState(""); 
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");
  const [newEntryAlert, setNewEntryAlert] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);

  // --- TAMBAHAN BARU: LOG STATES ---
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(0);
  const [logsLimit] = useState(30);
  const noteUpdateInFlightRef = React.useRef<Set<any>>(new Set());

  const text = {
    id: { 
      title: "PRODUCTION BUYMORE", subtitle: "Terhubung Cloud", add: "Input Produksi", logTitle: "Hasil Produksi",
      date: "Tanggal", time: "Waktu", color: "Warna", shift: "Shift", product: "Produk", qty: "Qty", note: "Catatan",
      save: "Simpan Data", export: "Export Excel", action: "Aksi", delete: "Hapus", 
      total: "TOTAL", day: "Siang", night: "Malam", allShift: "Semua Shift", loading: "Sinkronisasi Cloud...", empty: "Tidak ada data di Cloud.",
      confirmDelete: "Hapus data ini?", alertIncomplete: "Data tidak lengkap!", noData: "Tidak ada data untuk kriteria ini!",
      notifTitle: "Data Baru Masuk!", show: "Tampilkan", logout: "Log Out", enter: "Masuk Sistem",
      grandTotal: "TOTAL PRODUKSI",
      user: "Pengguna",
      navProd: "Produksi", navAnalytics: "Analisis", navLogs: "Log Aktivitas", logTime: "Waktu Sistem", logAction: "Tipe", logDesc: "Deskripsi", logEmpty: "Belum ada riwayat aktivitas log." 
    },
    cn: { 
      title: "BUYMORE 生产中心", subtitle: "已连接云端", add: "生产输入", logTitle: "生产结果",
      date: "日期", time: "时间", color: "颜色", shift: "班次", product: "产品", qty: "数量", note: "备注",
      save: "保存数据", export: "导出 Excel", action: "操作", delete: "删除", 
      total: "总计", day: "白班", night: "夜班", allShift: "所有班次", loading: "同步中...", empty: "云端没有 data 。",
      confirmDelete: "删除此 data?", alertIncomplete: "数据不完整!", noData: "该条件没有 data ！",
      notifTitle: "新数据已输入!", show: "显示", logout: "登出", enter: "进入系统",
      grandTotal: "总生产量",
      user: "记录员",
      navProd: "生产看板", navAnalytics: "数据分析", navLogs: "操作日志", logTime: "系统时间", logAction: "类型", logDesc: "详细说明", logEmpty: "暂无操作日志记录。"
    }
  };
  const t = text[language as keyof typeof text];

  // --- AUTH LOGIC ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoginError(false);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput, 
      password: passcode
    });
    if (error) {
      setLoginError(true);
      setPasscode("");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("cached_production_records");
    setRecords([]);
    await supabase.auth.signOut();
  };

  // --- ORIGINAL LOGIC (FETCHNIG & REALTIME) ---
  const fetchData = async () => {
    if (!session) return;
    
    // PERBAIKAN: Hanya aktifkan loading utama jika records/cache lokal kosong agar tidak flicker (Silent Sync)
    if (records.length === 0) {
      setLoading(true);
    }
    
    const from = currentPage * displayLimit;
    const to = from + displayLimit - 1;

    let query = supabase
      .from("production_data")
      .select("*")
      .order("id", { ascending: false });

    if (filterDate) {
      query = query.eq("date", filterDate);
    } else {
      query = query.range(from, to);
    }

    const { data, error } = await query;

    // PERBAIKAN: Validasi data agar cache lokal tidak ditimpa array kosong saat server belum selesai merespon
    if (!error && data && data.length > 0) {
      setRecords(data);
      localStorage.setItem("cached_production_records", JSON.stringify(data));
    }
    setLoading(false);
  };

  // --- TAMBAHAN BARU: FUNGSI AMBIL LOG AKTIVITAS (CLOUD SINKRONISASI) ---
  const fetchLogs = async () => {
    if (!session) return;
    setLogsLoading(true);
    const from = logsPage * logsLimit;
    const to = from + logsLimit - 1;

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("id", { ascending: false })
      .range(from, to);

    if (!error) setLogs(data || []);
    setLogsLoading(false);
  };

  useEffect(() => {
    if (session) {
      if (activeTab === "production") {
        fetchData();
      } else if (activeTab === "logs") {
        fetchLogs();
      }
    }
  }, [activeTab, currentPage, logsPage, session, filterDate, displayLimit]);

  useEffect(() => {
    if (session) {
      localStorage.setItem("app_lang", language);
      if ("Notification" in window) Notification.requestPermission();

      const channel = supabase.channel('realtime-production')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'production_data' }, (payload) => {
          if (currentPage === 0) {
            setRecords((prev) => {
              const updated = [payload.new, ...prev].slice(0, displayLimit);
              localStorage.setItem("cached_production_records", JSON.stringify(updated));
              return updated;
            });
          }
          setNewEntryAlert(`${payload.new.product} - ${payload.new.quantity} Pcs`);
          new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3').play().catch(() => {});
          if (document.hidden && Notification.permission === "granted") {
             new Notification(t.notifTitle, { body: `${payload.new.product} - ${payload.new.quantity} Pcs` });
          }
          setTimeout(() => setNewEntryAlert(null), 15000);
        }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [language, displayLimit, currentPage, session]);

  // --- FUNGSI HELPER LOG AKTIVITAS (BACKGROUND PROCESS) ---
  const logActivity = async (activityType: string, description: string) => {
    try {
      const currentUser = session?.user?.user_metadata?.full_name || session?.user?.email || "UNKNOWN";
      const { error } = await supabase.from("activity_logs").insert([
        { user_name: currentUser, activity_type: activityType, description: description }
      ]);
      if (error) console.error("Gagal mencatat audit log:", error.message);
    } catch (e) {
      // Gagal mencatat log tidak boleh membatalkan operasi utama
      console.error("Gagal mencatat audit log:", e);
    }
  };

  // --- ORIGINAL FUNCTIONS ---
  const handleSubmit = async () => {
    if (!form.date || !form.product || !form.quantity) return alert(t.alertIncomplete);
    const currentTime = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    const currentUser = session?.user?.user_metadata?.full_name || session?.user?.email || "UNKNOWN";

    const formattedData = { 
      ...form, 
      time: currentTime, 
      quantity: parseInt(form.quantity), 
      color: form.color.toUpperCase(), 
      product: form.product.toUpperCase(), 
      note: form.note.toUpperCase(),
      created_by: currentUser
    };
    
    const { error } = await supabase.from("production_data").insert([formattedData]);
    if (error) alert(error.message);
    else {
      const auditLogPromise = logActivity("INSERT", `Menambah data produksi baru: ${form.product.toUpperCase()} sebanyak ${form.quantity} Pcs (Warna: ${form.color.toUpperCase()})`);
      setForm({ ...form, color: "", product: "", quantity: "", note: "" });
      await auditLogPromise;
    }
  };

  const handleDelete = async (id: any) => {
    if(confirm(t.confirmDelete)) {
      const targetRecord = records.find(r => r.id === id);
      const recordDesc = targetRecord ? `${targetRecord.product} - ${targetRecord.quantity} Pcs` : `ID ${id}`;
      
      const { error } = await supabase.from("production_data").delete().eq("id", id);
      if (!error) {
        const auditLogPromise = logActivity("DELETE", `Menghapus data produksi: ${recordDesc} (ID Data: ${id})`);
        setRecords(prev => {
          const updated = prev.filter(r => r.id !== id);
          localStorage.setItem("cached_production_records", JSON.stringify(updated));
          return updated;
        });
        await auditLogPromise;
      }
    }
  };

  const handleUpdateNote = async (id: any) => {
    if (noteUpdateInFlightRef.current.has(id)) return;
    noteUpdateInFlightRef.current.add(id);

    try {
      const capitalizedNote = tempNote.toUpperCase();
      const targetRecord = records.find(r => r.id === id);
      const oldNote = targetRecord?.note || "-";
      const productName = targetRecord?.product || "UNKNOWN";

      const { error } = await supabase.from("production_data").update({ note: capitalizedNote }).eq("id", id);
      if (!error) {
        setEditingId(null);
        const auditLogPromise = logActivity("UPDATE", `Mengubah catatan produk ${productName} dari "${oldNote}" menjadi "${capitalizedNote}" (ID Data: ${id})`);
        setRecords(prev => {
          const updated = prev.map(r => r.id === id ? {...r, note: capitalizedNote} : r);
          localStorage.setItem("cached_production_records", JSON.stringify(updated));
          return updated;
        });
        await auditLogPromise;
      }
    } finally {
      noteUpdateInFlightRef.current.delete(id);
    }
  };

  const getFilteredRecords = () => {
    return records.filter(r => {
      const matchDate = filterDate ? r.date === filterDate : true;
      const matchShift = filterShift === "Semua" ? true : r.shift === filterShift;
      
      const matchesSearch = searchQuery 
        ? (r.product?.toUpperCase().includes(searchQuery.toUpperCase()) || 
           r.note?.toUpperCase().includes(searchQuery.toUpperCase()) ||
           r.created_by?.toUpperCase().includes(searchQuery.toUpperCase())) 
        : true;

      return matchDate && matchShift && matchesSearch;
    });
  };

  const handleExport = () => {
    const filteredForExport = getFilteredRecords();
    if (filteredForExport.length === 0) return alert(t.noData);
    const totalQty = filteredForExport.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const dataExcel = filteredForExport.map(r => ({
      [t.date]: r.date, [t.time]: r.time, [t.color]: r.color, [t.shift]: r.shift === "Siang" ? t.day : t.night, [t.product]: r.product, [t.qty]: r.quantity, [t.note]: r.note,
      [t.user]: r.created_by || "-" 
    }));
    dataExcel.push({ [t.product]: t.total, [t.qty]: totalQty });
    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produksi"); 
    XLSX.writeFile(wb, `每日生产报告_${filterDate || "_"}.xlsx`);
  };

  // --- RENDER LOGIN SCREEN (MEWAH & RESPONSIVE) ---
  if (authLoading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 bg-slate-50">SYNCING...</div>;

  if (!session) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden p-4">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] md:w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] md:w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-2xl overflow-hidden relative">
            <div className="text-center mb-8 md:mb-10">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-4 md:mb-6 transform hover:rotate-12 transition-transform duration-500">
                <span className="text-white font-black text-3xl md:text-4xl italic">B</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase">{t.title}</h1>
              <p className="text-[9px] md:text-[10px] font-bold text-blue-400 tracking-[0.3em] uppercase mt-2 opacity-80">Private Production Cloud</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-300 ml-1 uppercase tracking-widest opacity-60">Registered Email</label>
                <input 
                  type="email" 
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@buymore.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 md:px-6 py-3.5 md:py-4 text-white text-sm outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all placeholder:text-white/20 font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-300 ml-1 uppercase tracking-widest opacity-60">Security Passcode</label>
                <input 
                  type="password" 
                  autoFocus
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 md:px-6 py-3.5 md:py-4 text-white text-sm outline-none focus:bg-white/10 focus:border-blue-500/50 transition-all placeholder:text-white/20 text-center tracking-[0.3em]"
                />
                {loginError && <p className="text-center text-red-400 text-[10px] font-black uppercase animate-bounce mt-2">Access Denied - Invalid Credentials</p>}
              </div>
              <Button type="submit" className="w-full py-4 md:py-5 text-xs md:text-sm tracking-widest shadow-2xl shadow-blue-500/20 mt-2">{t.enter}</Button>
            </form>

            <div className="mt-8 md:mt-10 flex justify-center gap-4 border-t border-white/5 pt-6 md:pt-8">
              <button onClick={() => setLanguage("id")} className="text-[10px] font-black text-white/20 transition-all hover:text-white/60">INDONESIA</button>
              <button onClick={() => setLanguage("cn")} className="text-[10px] font-black text-white/20 transition-all hover:text-white/60">CHINESE</button>
            </div>
          </div>
          <p className="text-center mt-6 md:mt-8 text-[9px] md:text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">© 2024 Buymore Industrial</p>
        </div>
      </div>
    );
  }

  // --- RENDER DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#E3E1E1] pb-12 font-sans text-slate-800 antialiased relative">
      {newEntryAlert && (
        <div className="fixed top-24 right-4 md:right-6 z-[9999] animate-bounce max-w-[calc(100vw-32px)]">
          <div className="bg-blue-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex flex-col border-2 border-white">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{t.notifTitle}</span>
            <span className="font-bold text-xs md:text-sm truncate">{newEntryAlert}</span>
          </div>
        </div>
      )}

      {/* HEADER WITH LOGOUT & NAVIGATION */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-0 md:h-20 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 md:gap-4 truncate w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3 truncate">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-black rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 shrink-0">
                <span className="text-white font-black text-xl md:text-2xl italic">B</span>
              </div>
              <div className="truncate">
                <h1 className="text-sm md:text-xl font-black tracking-tight text-slate-900 truncate uppercase">{t.title}</h1>
                <p className="text-[9px] md:text-[10px] font-bold text-blue-500 tracking-widest uppercase truncate">
                  {session?.user?.user_metadata?.full_name || session?.user?.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:hidden shrink-0">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-2 py-1.5 text-xs font-bold outline-none cursor-pointer">
                <option value="id">🇮🇩 ID</option>
                <option value="cn">🇨🇳 CN</option>
              </select>
              <button onClick={handleLogout} className="text-[9px] font-black text-red-500 bg-red-50/50 px-2 py-1.5 rounded-lg transition-all uppercase">
                ✕
              </button>
            </div>
          </div>

          {/* TAB NAVIGATION MENU */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] md:text-xs font-bold w-full md:w-auto shadow-sm">
            <button 
              onClick={() => setActiveTab("production")} 
              className={`flex-1 md:flex-none text-center px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "production" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {t.navProd}
            </button>
            <button 
              onClick={() => setActiveTab("analytics")} 
              className={`flex-1 md:flex-none text-center px-3 md:px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "analytics" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {t.navAnalytics}
            </button>
            <button 
              onClick={() => setActiveTab("logs")} 
              className={`flex-1 md:flex-none text-center px-4 py-2 rounded-lg transition-all duration-200 ${activeTab === "logs" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {t.navLogs}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 text-sm font-bold outline-none cursor-pointer">
              <option value="id">🇮🇩 ID</option>
              <option value="cn">🇨🇳 CN</option>
            </select>
            <button onClick={handleLogout} className="text-[10px] font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all uppercase border-l pl-4 border-slate-100 ml-2">
              {t.logout}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6 md:mt-10">
        {activeTab === "production" ? (
          /* TAB 1: RENDER DASHBOARD PRODUKSI */
          <div className="space-y-6 md:space-y-10">
            <Card className="p-5 md:p-8 border-l-8 border-l-blue-600">
              <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-6 md:mb-8 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span> {t.add}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="space-y-1.5 md:space-y-2"><label className="text-xs md:text-sm font-bold text-slate-800 ml-1">{t.date}</label><input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 md:py-3 text-sm focus:bg-white outline-none transition-all font-medium" /></div>
                <div className="space-y-1.5 md:space-y-2"><label className="text-xs md:text-sm font-bold text-slate-800 ml-1">{t.color}</label><input placeholder="..." value={form.color} onChange={(e) => setForm({...form, color: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 md:py-3 text-sm focus:bg-white outline-none transition-all font-medium uppercase" /></div>
                <div className="space-y-1.5 md:space-y-2"><label className="text-xs md:text-sm font-bold text-slate-800 ml-1">{t.shift}</label><select value={form.shift} onChange={(e) => setForm({...form, shift: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 md:py-3 text-sm focus:bg-white outline-none transition-all font-bold"><option value="Siang">{t.day}</option><option value="Malam">{t.night}</option></select></div>
                <div className="space-y-1.5 md:space-y-2"><label className="text-xs md:text-sm font-bold text-slate-800 ml-1">{t.product}</label><input placeholder="..." value={form.product} onChange={(e) => setForm({...form, product: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 md:py-3 text-sm focus:bg-white outline-none transition-all font-medium uppercase" /></div>
                <div className="space-y-1.5 md:space-y-2"><label className="text-xs md:text-sm font-bold text-slate-800 ml-1">{t.qty}</label><input type="number" placeholder="0" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 md:py-3 text-sm focus:bg-white outline-none transition-all font-black text-blue-700" /></div>
                <div className="space-y-1.5 md:space-y-2 lg:col-span-1"><label className="text-xs md:text-sm font-bold text-slate-800 ml-1">{t.note}</label><input placeholder="..." value={form.note} onChange={(e) => setForm({...form, note: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 md:py-3 text-sm focus:bg-white outline-none transition-all font-medium uppercase" /></div>
                <div className="flex items-end pt-2 md:pt-0"><Button onClick={handleSubmit} className="w-full h-11 md:h-[50px]">{t.save}</Button></div>
              </div>
            </Card>

            <Card>
              <div className="px-5 md:px-8 py-5 md:py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/40">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-1.5 bg-blue-600 rounded-full"></div>
                  <h3 className="font-bold text-slate-800 tracking-tight text-base md:text-lg">{t.logTitle}</h3>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <input 
                      type="text" 
                      placeholder={language === "id" ? "Cari Kode Tas..." : "搜索包包编号..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white border border-slate-200 rounded-2xl px-4 py-2 md:py-2.5 text-xs font-bold outline-none shadow-sm w-full md:w-40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all uppercase"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
                    )}
                  </div>
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-white border border-slate-200 rounded-2xl px-4 py-2 md:py-2.5 text-xs font-bold outline-none shadow-sm flex-1 sm:w-auto" />
                  <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)} className="bg-white border border-slate-200 rounded-2xl px-4 py-2 md:py-2.5 text-xs font-bold outline-none shadow-sm cursor-pointer flex-1 sm:w-auto">
                    <option value="Semua">{t.allShift}</option>
                    <option value="Siang">{t.day}</option>
                    <option value="Malam">{t.night}</option>
                  </select>
                  <Button onClick={handleExport} variant="success" className="text-xs py-2 md:py-2.5">{t.export}</Button>
                </div>
              </div>

              <div className="overflow-x-auto w-full scrollbar-thin current-fill">
                <table className="w-full text-sm text-left border-collapse min-w-[700px] md:min-w-full">
                  <thead>
                    <tr className="text-slate-800 text-sm font-bold bg-white border-b border-slate-100">
                      <th className="px-5 md:px-8 py-4 md:py-6 border-r border-slate-100">{t.date}</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 border-r border-slate-100">{t.time}</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 border-r border-slate-100">{t.shift}</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 border-r border-slate-100">{t.product}</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 text-right border-r border-slate-100">{t.qty}</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 border-r border-slate-100">{t.note}</th>
                      <th className="px-4 md:px-6 py-4 md:py-6 border-r border-slate-100">{t.user}</th>
                      <th className="px-5 md:px-8 py-4 md:py-6 text-center w-24 md:w-28"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading && records.length === 0 ? (
                      <tr><td colSpan={8} className="px-5 md:px-8 py-24 text-center text-slate-800 font-bold text-sm animate-pulse">{t.loading}</td></tr>
                    ) : getFilteredRecords().map((r, index) => (
                      <tr key={r.id} className={`group transition-all duration-300 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-blue-50/80`}>
                        <td className="px-5 md:px-8 py-4 md:py-5 font-bold text-slate-800 border-l-4 border-l-transparent group-hover:border-l-blue-600 transition-all border-r border-slate-100 whitespace-nowrap">{r.date}</td>
                        <td className="px-4 md:px-6 py-4 md:py-5 text-slate-800 font-bold text-xs md:text-sm border-r border-slate-100 whitespace-nowrap">{r.time}</td>
                        <td className="px-4 md:px-6 py-4 md:py-5 border-r border-slate-100"><span className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap ${r.shift === "Siang" ? "bg-amber-100 text-amber-700 shadow-sm shadow-amber-900/5" : "bg-slate-800 text-white shadow-lg shadow-black/10"}`}>{r.shift === "Siang" ? t.day : t.night}</span></td>
                        <td className="px-4 md:px-6 py-4 md:py-5 border-r border-slate-100"><span className="font-bold text-slate-800 block text-sm leading-tight uppercase">{r.product}</span><span className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider">{r.color}</span></td>
                        <td className="px-4 md:px-6 py-4 md:py-5 text-right font-bold text-sm md:text-base text-blue-700 border-r border-slate-100">{r.quantity}</td>
                        <td className="px-4 md:px-6 py-4 md:py-5 border-r border-slate-100">
                          {editingId === r.id ? (
                            <input autoFocus className="bg-white border-2 border-blue-500 rounded-lg px-2.5 py-1 text-xs md:text-sm font-bold text-slate-800 outline-none w-full shadow-[0_0_15px_rgba(59,130,246,0.2)] uppercase" value={tempNote} onChange={(e) => setTempNote(e.target.value)} onBlur={() => handleUpdateNote(r.id)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateNote(r.id)} />
                          ) : (
                            <div onClick={() => { setEditingId(r.id); setTempNote(r.note || ""); }} className="group/note cursor-pointer flex items-center gap-2 min-h-[28px]">
                              <span className="text-slate-800 font-bold text-xs md:text-sm uppercase whitespace-nowrap">{r.note || "-"}</span>
                              <svg className="w-3.5 h-3.5 text-blue-400 opacity-100 md:opacity-0 group-hover/note:opacity-100 transition-all transform translate-x-0 md:translate-x-[-5px] group-hover/note:translate-x-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 border-r border-slate-100 text-slate-800 font-bold text-xs md:text-sm truncate max-w-[120px]">{r.created_by || "-"}</td>
                        <td className="px-5 md:px-8 py-4 md:py-5 text-center whitespace-nowrap"><button onClick={() => handleDelete(r.id)} className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-all text-red-500 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-500 hover:text-white">{t.delete}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-5 md:px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-2 order-2 md:order-1">
                    <button disabled={currentPage === 0 || loading} onClick={() => setCurrentPage(prev => prev - 1)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">&lt;</button>
                    <div className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200">{currentPage + 1}</div>
                    <button disabled={records.length < displayLimit || loading} onClick={() => setCurrentPage(prev => prev + 1)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">&gt;</button>
                 </div>
                 
                 <div className="flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/70 px-5 py-2 rounded-2xl shadow-inner shadow-blue-900/5 w-full md:w-auto order-1 md:order-2">
                    <span className="text-xs font-bold text-indigo-900 tracking-wider uppercase mr-3 opacity-70">{t.grandTotal}</span>
                    <span className="font-bold text-base md:text-xl bg-gradient-to-br from-blue-700 to-indigo-800 bg-clip-text text-transparent">{getFilteredRecords().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0).toLocaleString("id-ID")} Pcs</span>
                 </div>
                 
                 <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto order-3">
                    <span className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-widest">{t.show}</span>
                    <select value={displayLimit} onChange={(e) => { setDisplayLimit(Number(e.target.value)); setCurrentPage(0); }} className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs md:text-sm font-bold text-blue-700 outline-none shadow-sm cursor-pointer">
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                      <option value={300}>300</option>
                    </select>
                 </div>
              </div>
            </Card>
          </div>
        ) : activeTab === "analytics" ? (
          /* TAB 2: RENDER HALAMAN ANALISIS TERISOLASI */
          <AnalyticsPage session={session} language={language} />
        ) : (
          /* TAB 3: RENDER HALAMAN KHUSUS AUDIT LOG AKTIVITAS */
          <Card>
            <div className="px-5 md:px-8 py-5 md:py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
              <div className="flex items-center gap-4">
                <div className="h-10 w-1.5 bg-indigo-600 rounded-full"></div>
                <h3 className="font-bold text-slate-800 tracking-tight text-base md:text-lg">{t.navLogs}</h3>
              </div>
            </div>

            <div className="block md:hidden divide-y divide-slate-100 max-h-[60vh] overflow-y-auto px-5">
              {logsLoading && logs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold text-sm animate-pulse">{t.loading}</div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold text-sm">{t.logEmpty}</div>
              ) : logs.map((log) => (
                <div key={log.id} className="py-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[140px]">{log.user_name}</span>
                    <span className="text-slate-400 font-medium">{new Date(log.created_at).toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${log.activity_type === "INSERT" ? "bg-emerald-100 text-emerald-700" : log.activity_type === "DELETE" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{log.activity_type}</span>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{log.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="text-slate-800 text-sm font-bold bg-white border-b border-slate-100">
                    <th className="px-8 py-5 border-r border-slate-100">{t.logTime}</th>
                    <th className="px-6 py-5 border-r border-slate-100">{t.user}</th>
                    <th className="px-6 py-5 border-r border-slate-100">{t.logAction}</th>
                    <th className="px-6 py-5">{t.logDesc}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logsLoading && logs.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-24 text-center text-slate-800 font-bold text-sm animate-pulse">{t.loading}</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold text-sm">{t.logEmpty}</td></tr>
                  ) : logs.map((log, index) => (
                    <tr key={log.id} className={`transition-all duration-300 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-slate-100/80`}>
                      <td className="px-8 py-4 text-slate-500 font-bold text-xs border-r border-slate-100">{new Date(log.created_at).toLocaleString("id-ID")}</td>
                      <td className="px-6 py-4 font-bold text-slate-700 border-r border-slate-100">{log.user_name}</td>
                      <td className="px-6 py-4 border-r border-slate-100">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${log.activity_type === "INSERT" ? "bg-emerald-100 text-emerald-700" : log.activity_type === "DELETE" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{log.activity_type}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium leading-relaxed">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 md:px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                <button disabled={logsPage === 0 || logsLoading} onClick={() => setLogsPage(prev => prev - 1)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">&lt;</button>
                <div className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200">{logsPage + 1}</div>
                <button disabled={logs.length < logsLimit || logsLoading} onClick={() => setLogsPage(prev => prev + 1)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">&gt;</button>
              </div>
              <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest text-center sm:text-right">BUYMORE AUDIT LOG SYSTEM</div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<ProductionSystem />);
