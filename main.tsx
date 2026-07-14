import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

/** 1. CONFIG **/
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://bliaixvdfwaxdlfhayea.supabase.co";
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaWFpeHZkZndheGRsZmhheWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDc5OTQsImV4cCI6MjA5OTU4Mzk5NH0.PcqkFrETAtI0JGYinhRKKcmd2qMb2wh6nNQI4sTIG_8";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    ...(typeof window !== "undefined" ? { storage: window.sessionStorage } : {}),
    storageKey: "buymore-auth-per-tab"
  }
});

/** 2. STYLED COMPONENTS **/
const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = "default", className = "", type = "button", disabled = false, title = "" }: any) => {
  const v: any = { 
    default: "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-100 hover:shadow-blue-200 hover:-translate-y-0.5",
    success: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-0.5",
    danger: "text-red-500 hover:bg-red-50 hover:text-red-700 font-bold"
  };
  return (
    <button type={type} disabled={disabled} title={title} onClick={onClick} className={`px-6 py-2.5 rounded-xl font-bold transition-all duration-300 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${v[variant]} ${className}`}>
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
            .is("deleted_at", null)
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


/** FULL OPERATIONS SUITE - ADDITIVE MODULES **/
type AppRole = "admin" | "supervisor" | "operator" | "qc" | "viewer" | "auditor";
type AppProfile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role: AppRole;
  is_active: boolean;
  language?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MasterItem = {
  id: number | string;
  category: string;
  code: string;
  name: string;
  is_active: boolean;
  metadata?: Record<string, any> | null;
};

type ProductionAdvancedFields = {
  work_order_id: string;
  batch_id: string;
  machine_code: string;
  line_code: string;
  source: string;
};

const DEFAULT_ADVANCED_FIELDS: ProductionAdvancedFields = {
  work_order_id: "",
  batch_id: "",
  machine_code: "",
  line_code: "",
  source: "MANUAL"
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  operator: "Operator",
  qc: "Quality Control",
  viewer: "Viewer",
  auditor: "Auditor"
};

const normalizeText = (value: any) => String(value ?? "").trim();
const upperText = (value: any) => normalizeText(value).toUpperCase();
const numberValue = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const currentUserName = (session: any, profile?: AppProfile | null) =>
  profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email || "UNKNOWN";
const isManagerRole = (role?: AppRole | null) => role === "admin" || role === "supervisor";
const canManageQuality = (role?: AppRole | null) => isManagerRole(role) || role === "qc";
const safeJson = (value: any, fallback: any = {}) => {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(String(value || "")); } catch { return fallback; }
};
const makeUuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const jakartaDateKey = (value = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(value);
    const map: Record<string, string> = {};
    parts.forEach((part) => { map[part.type] = part.value; });
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    return value.toISOString().slice(0, 10);
  }
};
const formatDateTime = (value: any) => value ? new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-";
const errorText = (error: any, fallback = "Terjadi kesalahan.") => error?.message || error?.error_description || fallback;

const INPUT_CLASS = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed";
const SMALL_BUTTON = "px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed";

const FullSuiteSectionTitle = ({ title, subtitle, action }: any) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
    <div>
      <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight">{title}</h3>
      {subtitle && <p className="mt-1 text-xs font-bold text-slate-400 leading-relaxed">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const FullSuiteBadge = ({ children, tone = "slate" }: any) => {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100"
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider ${tones[tone] || tones.slate}`}>{children}</span>;
};

const FullSuiteStat = ({ label, value, hint, tone = "blue" }: any) => {
  const tones: Record<string, string> = {
    blue: "from-blue-600 to-indigo-700",
    green: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    red: "from-rose-500 to-red-600",
    violet: "from-violet-500 to-purple-700",
    slate: "from-slate-600 to-slate-800"
  };
  return (
    <Card className="p-5">
      <div className={`w-9 h-1 rounded-full bg-gradient-to-r ${tones[tone] || tones.blue} mb-4`} />
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900 break-words">{value}</p>
      {hint && <p className="mt-2 text-[10px] font-bold text-slate-400 leading-relaxed">{hint}</p>}
    </Card>
  );
};

const FullSuiteInput = ({ label, className = "", children }: any) => (
  <div className={`space-y-2 ${className}`}>
    <label className="text-[11px] md:text-xs font-black text-slate-700 ml-1">{label}</label>
    {children}
  </div>
);

function FullSuiteModal({ open, title, onClose, children, width = "max-w-3xl" }: any) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-sm p-3 md:p-6 flex items-center justify-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`w-full ${width} max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-white/20`}>
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-5 md:px-7 py-4 flex items-center justify-between gap-4">
          <h3 className="font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 font-black hover:bg-slate-200">✕</button>
        </div>
        <div className="p-5 md:p-7">{children}</div>
      </div>
    </div>
  );
}

class AppErrorBoundary extends React.Component<any, { hasError: boolean; message: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: errorText(error, "Komponen tidak dapat dirender.") };
  }
  componentDidCatch(error: any, info: any) {
    console.error("Application error boundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] p-6 flex items-center justify-center">
          <Card className="max-w-xl p-7 border-l-8 border-l-red-500">
            <h2 className="text-lg font-black text-slate-900">Tampilan mengalami gangguan</h2>
            <p className="mt-2 text-sm font-bold text-slate-500 leading-relaxed">{this.state.message}</p>
            <button onClick={() => { this.setState({ hasError: false, message: "" }); window.location.reload(); }} className="mt-5 px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-black">Muat Ulang Aman</button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return online;
}

function PresenceIndicator({ session }: any) {
  const [count, setCount] = useState(1);
  const [status, setStatus] = useState("CONNECTING");
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase.channel("production-presence", { config: { presence: { key: session.user.id } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state || {}).length || 1);
      })
      .subscribe(async (nextStatus) => {
        setStatus(nextStatus);
        if (nextStatus === "SUBSCRIBED") {
          await channel.track({ user_id: session.user.id, email: session.user.email, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);
  return (
    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-500" title={`Realtime: ${status}`}>
      <span className={`w-2 h-2 rounded-full ${status === "SUBSCRIBED" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
      {count} Online
    </div>
  );
}

function SavedFiltersControl({ session, pageKey, filters, onApply }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const load = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from("saved_filters").select("*").eq("user_id", session.user.id).eq("page_key", pageKey).order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [session?.user?.id, pageKey]);
  const save = async () => {
    const name = window.prompt("Nama filter tersimpan:");
    if (!name?.trim()) return;
    const { error } = await supabase.from("saved_filters").insert({ user_id: session.user.id, page_key: pageKey, name: name.trim(), filters });
    if (error) return alert(error.message);
    await load();
  };
  const remove = async () => {
    if (!selected || !window.confirm("Hapus filter tersimpan ini?")) return;
    await supabase.from("saved_filters").delete().eq("id", selected).eq("user_id", session.user.id);
    setSelected("");
    await load();
  };
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <select value={selected} onChange={(event) => {
        const value = event.target.value;
        setSelected(value);
        const target = items.find((item) => String(item.id) === value);
        if (target) onApply(safeJson(target.filters));
      }} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black outline-none min-w-[150px]">
        <option value="">Filter Tersimpan</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <button className={SMALL_BUTTON} onClick={save}>Simpan Filter</button>
      <button className={SMALL_BUTTON} disabled={!selected} onClick={remove}>Hapus</button>
    </div>
  );
}

function AttachmentManager({ session, profile, entityType, entityId, compact = false }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const canDelete = isManagerRole(profile?.role);
  const load = async () => {
    if (!entityType || !entityId) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await supabase.from("attachments").select("*").eq("entity_type", entityType).eq("entity_id", String(entityId)).order("created_at", { ascending: false });
    if (!error) setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [entityType, entityId, session?.user?.id]);
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !session?.user?.id || !entityType || !entityId) return;
    if (file.size > 10 * 1024 * 1024) return alert("Ukuran maksimal file 10 MB.");
    setUploading(true);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const storagePath = `${session.user.id}/${entityType}/${entityId}/${makeUuid()}-${cleanName}`;
      const { error: uploadError } = await supabase.storage.from("production-files").upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("attachments").insert({
        entity_type: entityType,
        entity_id: String(entityId),
        bucket_id: "production-files",
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: session.user.id
      });
      if (dbError) {
        await supabase.storage.from("production-files").remove([storagePath]);
        throw dbError;
      }
      await load();
    } catch (error) {
      alert(errorText(error, "Upload gagal."));
    } finally {
      setUploading(false);
    }
  };
  const openFile = async (item: any) => {
    const { data, error } = await supabase.storage.from(item.bucket_id || "production-files").createSignedUrl(item.storage_path, 120);
    if (error || !data?.signedUrl) return alert(error?.message || "File tidak dapat dibuka.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const remove = async (item: any) => {
    if (!window.confirm(`Hapus lampiran ${item.file_name}?`)) return;
    const { error: storageError } = await supabase.storage.from(item.bucket_id || "production-files").remove([item.storage_path]);
    if (storageError) return alert(storageError.message);
    const { error } = await supabase.from("attachments").delete().eq("id", item.id);
    if (error) return alert(error.message);
    await load();
  };
  return (
    <div className={compact ? "space-y-3" : "rounded-2xl border border-slate-200 p-4 md:p-5 bg-slate-50/60"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {!compact && <p className="text-xs font-black text-slate-800">Foto & Lampiran</p>}
          <p className="text-[10px] font-bold text-slate-400">{loading ? "Memuat..." : `${items.length} file`} • Maks. 10 MB</p>
        </div>
        <label className={`${SMALL_BUTTON} cursor-pointer text-center ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          {uploading ? "Mengunggah..." : "Tambah Lampiran"}
          <input type="file" className="hidden" accept="image/*,.pdf,.xlsx,.xls,.doc,.docx,.txt" onChange={upload} />
        </label>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2.5">
            <button onClick={() => openFile(item)} className="min-w-0 text-left">
              <p className="text-[11px] font-black text-blue-700 truncate">{item.file_name}</p>
              <p className="text-[9px] font-bold text-slate-400">{Math.max(1, Math.round(numberValue(item.size_bytes) / 1024))} KB • {formatDateTime(item.created_at)}</p>
            </button>
            {(canDelete || item.uploaded_by === session?.user?.id) && <button onClick={() => remove(item)} className="text-[10px] font-black text-red-500">Hapus</button>}
          </div>
        ))}
        {!loading && !items.length && <p className="py-3 text-center text-[10px] font-bold text-slate-400">Belum ada lampiran.</p>}
      </div>
    </div>
  );
}

const CODE128_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

const code128Geometry = (rawValue: any) => {
  const text = normalizeText(rawValue).replace(/[^\x20-\x7E]/g, "?").slice(0, 64) || "-";
  const values = Array.from(text).map((character) => character.charCodeAt(0) - 32);
  const checksum = (104 + values.reduce((sum, code, index) => sum + code * (index + 1), 0)) % 103;
  const codes = [104, ...values, checksum, 106];
  const bars: Array<{ x: number; width: number }> = [];
  let x = 10;
  codes.forEach((code) => {
    const pattern = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
    Array.from(pattern).forEach((moduleWidth, index) => {
      const width = Number(moduleWidth);
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    });
  });
  return { text, bars, width: x + 10 };
};

function Code128Barcode({ value, title = "" }: any) {
  const geometry = React.useMemo(() => code128Geometry(value), [value]);
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center overflow-hidden">
      {title && <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>}
      <svg viewBox={`0 0 ${geometry.width} 82`} className="w-full h-24" role="img" aria-label={`Barcode ${geometry.text}`} preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={geometry.width} height="82" fill="#ffffff" />
        {geometry.bars.map((bar, index) => <rect key={`${bar.x}-${index}`} x={bar.x} y="4" width={bar.width} height="58" fill="#000000" />)}
        <text x={geometry.width / 2} y="77" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#0f172a">{geometry.text}</text>
      </svg>
    </div>
  );
}

const escapeHtmlText = (value: any) => normalizeText(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const printBarcodeLabel = (title: string, value: string, subtitle = "") => {
  const geometry = code128Geometry(value);
  const rects = geometry.bars.map((bar) => `<rect x="${bar.x}" y="8" width="${bar.width}" height="72" fill="#000"/>`).join("");
  const popup = window.open("", "_blank", "noopener,noreferrer,width=760,height=560");
  if (!popup) return alert("Popup diblokir browser. Izinkan popup untuk mencetak label.");
  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtmlText(title)}</title><style>@page{size:100mm 55mm;margin:4mm}body{font-family:Arial,sans-serif;margin:0;display:flex;align-items:center;justify-content:center}.label{width:92mm;text-align:center}.title{font-size:18px;font-weight:900;margin:0 0 4px}.sub{font-size:10px;color:#475569;margin:0 0 8px}.value{font:700 11px monospace;margin-top:4px;word-break:break-all}svg{width:100%;height:28mm}</style></head><body><div class="label"><p class="title">${escapeHtmlText(title)}</p>${subtitle ? `<p class="sub">${escapeHtmlText(subtitle)}</p>` : ""}<svg viewBox="0 0 ${geometry.width} 92" preserveAspectRatio="xMidYMid meet"><rect width="${geometry.width}" height="92" fill="#fff"/>${rects}</svg><p class="value">${escapeHtmlText(geometry.text)}</p></div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script></body></html>`);
  popup.document.close();
};

function QrBarcodeScanner({ open, onClose, onDetected }: any) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMessage("");
    const start = async () => {
      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        if (!BarcodeDetectorClass) {
          setMessage("Browser ini belum mendukung BarcodeDetector. Gunakan input manual.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new BarcodeDetectorClass({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8"] });
        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const rawValue = results?.[0]?.rawValue;
            if (rawValue) {
              onDetected(rawValue);
              onClose();
              return;
            }
          } catch { /* scan frame berikutnya */ }
          timerRef.current = window.setTimeout(scan, 350);
        };
        scan();
      } catch (error) {
        setMessage(errorText(error, "Kamera tidak dapat diakses. Gunakan input manual."));
      }
    };
    start();
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);
  return (
    <FullSuiteModal open={open} title="Scan QR / Barcode" onClose={onClose} width="max-w-xl">
      <div className="space-y-4">
        <div className="aspect-video rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        </div>
        {message && <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">{message}</p>}
        <div className="flex gap-2">
          <input value={manual} onChange={(event) => setManual(event.target.value)} placeholder='Contoh: WO:WO-001 atau BATCH:B-01' className={INPUT_CLASS} />
          <button onClick={() => { if (manual.trim()) { onDetected(manual.trim()); onClose(); } }} className="px-5 rounded-xl bg-slate-900 text-white text-xs font-black">Gunakan</button>
        </div>
      </div>
    </FullSuiteModal>
  );
}

function NotificationBell({ session, onOpenCenter }: any) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const load = React.useCallback(async () => {
    if (!session?.user?.id) return;
    const [notificationResult, readResult] = await Promise.all([
      supabase.from("app_notifications").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("notification_reads").select("notification_id").eq("user_id", session.user.id)
    ]);
    setNotifications(notificationResult.data || []);
    setReadIds(new Set((readResult.data || []).map((item: any) => String(item.notification_id))));
  }, [session?.user?.id]);
  useEffect(() => {
    load();
    if (!session?.user?.id) return;
    const channel = supabase.channel(`notification-bell-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_notifications" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_reads", filter: `user_id=eq.${session.user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, load]);
  const markRead = async (id: any) => {
    await supabase.from("notification_reads").upsert({ notification_id: id, user_id: session.user.id, read_at: new Date().toISOString() }, { onConflict: "notification_id,user_id" });
    setReadIds((previous) => new Set([...Array.from(previous), String(id)]));
  };
  const markAllRead = async () => {
    const rows = notifications.map((item) => ({ notification_id: item.id, user_id: session.user.id, read_at: new Date().toISOString() }));
    if (rows.length) await supabase.from("notification_reads").upsert(rows, { onConflict: "notification_id,user_id" });
    setReadIds(new Set(notifications.map((item) => String(item.id))));
  };
  const unread = notifications.filter((item) => !readIds.has(String(item.id))).length;
  return (
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} className="relative w-10 h-10 rounded-xl bg-slate-100 text-lg flex items-center justify-center" aria-label="Notifikasi">🔔{unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">{Math.min(unread, 99)}</span>}</button>
      {open && <div className="absolute right-0 top-12 w-[min(360px,calc(100vw-24px))] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-[1000]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between"><div><p className="text-xs font-black text-slate-900">Pusat Notifikasi</p><p className="text-[9px] font-bold text-slate-400">{unread} belum dibaca</p></div><button onClick={markAllRead} className="text-[9px] font-black text-blue-600">Tandai semua</button></div>
        <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">{notifications.slice(0, 12).map((item) => <button key={item.id} onClick={() => markRead(item.id)} className={`w-full p-4 text-left hover:bg-slate-50 ${readIds.has(String(item.id)) ? "opacity-60" : "bg-blue-50/30"}`}><div className="flex items-start gap-3"><span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${item.severity === "CRITICAL" ? "bg-red-500" : item.severity === "WARNING" ? "bg-amber-500" : item.severity === "SUCCESS" ? "bg-emerald-500" : "bg-blue-500"}`} /><div className="min-w-0"><p className="text-[11px] font-black text-slate-800">{item.title}</p><p className="mt-1 text-[10px] font-bold text-slate-500 leading-relaxed">{item.message}</p><p className="mt-2 text-[9px] font-bold text-slate-400">{formatDateTime(item.created_at)}</p></div></div></button>)}{!notifications.length && <p className="p-8 text-center text-xs font-bold text-slate-400">Belum ada notifikasi.</p>}</div>
        <button onClick={() => { setOpen(false); onOpenCenter(); }} className="w-full px-4 py-3 border-t border-slate-100 text-[10px] font-black text-blue-600 bg-slate-50">Buka semua notifikasi</button>
      </div>}
    </div>
  );
}

function MfaManagement({ session }: any) {
  const [factors, setFactors] = useState<any[]>([]);
  const [aal, setAal] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const [factorResult, aalResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    ]);
    setFactors([...(factorResult.data?.totp || []), ...(factorResult.data?.phone || [])]);
    setAal(aalResult.data || null);
  };
  useEffect(() => { load(); }, [session?.user?.id]);
  const enroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `BUYMORE-${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error) return alert(error.message);
    setEnrollment(data);
  };
  const verify = async () => {
    if (!enrollment?.id || !code.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.id, code: code.trim() });
    setBusy(false);
    if (error) return alert(error.message);
    setEnrollment(null);
    setCode("");
    await supabase.auth.refreshSession();
    await load();
    alert("MFA berhasil diaktifkan.");
  };
  const remove = async (factorId: string) => {
    if (!window.confirm("Nonaktifkan faktor MFA ini?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return alert(error.message);
    await load();
  };
  return (
    <Card className="p-5 md:p-7">
      <FullSuiteSectionTitle title="Multi-Factor Authentication" subtitle="TOTP melalui aplikasi authenticator. Direkomendasikan untuk Admin dan Supervisor." action={<FullSuiteBadge tone={aal?.currentLevel === "aal2" ? "green" : "amber"}>{aal?.currentLevel || "aal1"}</FullSuiteBadge>} />
      <div className="space-y-3">
        {factors.map((factor) => <div key={factor.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"><div><p className="text-xs font-black text-slate-800">{factor.friendly_name || factor.factor_type}</p><p className="text-[9px] font-bold text-slate-400">{factor.status} • {factor.factor_type}</p></div><button onClick={() => remove(factor.id)} className="text-[10px] font-black text-red-500">Hapus</button></div>)}
        {!factors.length && <p className="text-xs font-bold text-slate-400">Belum ada faktor MFA terverifikasi.</p>}
        {!enrollment ? <button disabled={busy} onClick={enroll} className={SMALL_BUTTON}>Tambah TOTP</button> : <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-4"><p className="text-xs font-black text-blue-900">Pindai QR dengan Google Authenticator, Microsoft Authenticator, 1Password, atau aplikasi TOTP lain.</p>{enrollment.totp?.qr_code && <img src={enrollment.totp.qr_code} alt="QR MFA" className="w-48 h-48 bg-white p-2 rounded-xl mx-auto" />}<p className="text-[9px] font-mono break-all text-slate-500">{enrollment.totp?.secret}</p><div className="flex gap-2"><input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={8} placeholder="Kode 6 digit" className={INPUT_CLASS} /><button disabled={busy} onClick={verify} className="px-5 rounded-xl bg-blue-600 text-white text-xs font-black">Verifikasi</button></div></div>}
      </div>
    </Card>
  );
}

function RecordDetailModal({ open, record, onClose, session, profile }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    if (!open || !record?.id) return;
    supabase.from("activity_logs").select("*").eq("table_name", "production_data").eq("record_id", String(record.id)).order("created_at", { ascending: false }).limit(100).then(({ data }) => setLogs(data || []));
  }, [open, record?.id]);
  return (
    <FullSuiteModal open={open} title={`Detail Produksi #${record?.id || ""}`} onClose={onClose} width="max-w-5xl">
      {record && <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[
          ["Tanggal", record.date], ["Waktu", record.time], ["Shift", record.shift], ["Produk", record.product],
          ["Warna", record.color], ["Quantity", record.quantity], ["Operator", record.created_by], ["Versi", record.version || 1],
          ["Mesin", record.machine_code], ["Line", record.line_code], ["Work Order", record.work_order_id], ["Batch", record.batch_id]
        ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-[9px] font-black text-slate-400 uppercase">{label}</p><p className="mt-1 text-xs font-black text-slate-800 break-words">{String(value ?? "-")}</p></div>)}</div>
        <div className="rounded-xl border border-slate-200 p-4"><p className="text-[9px] font-black text-slate-400 uppercase">Catatan</p><p className="mt-2 text-sm font-bold text-slate-800">{record.note || "-"}</p></div>
        <AttachmentManager session={session} profile={profile} entityType="production" entityId={record.id} />
        <div><p className="text-xs font-black text-slate-900 mb-3">Riwayat Perubahan</p><div className="space-y-2 max-h-72 overflow-y-auto">{logs.map((log) => <div key={log.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-3"><FullSuiteBadge tone={log.activity_type === "DELETE" ? "red" : log.activity_type === "INSERT" ? "green" : "blue"}>{log.metadata?.event_subtype || log.activity_type}</FullSuiteBadge><span className="text-[9px] font-bold text-slate-400">{formatDateTime(log.created_at)}</span></div><p className="mt-2 text-[11px] font-bold text-slate-600">{log.description}</p><p className="mt-1 text-[9px] font-bold text-slate-400">{log.user_name}</p></div>)}{!logs.length && <p className="text-xs font-bold text-slate-400">Belum ada riwayat.</p>}</div></div>
      </div>}
    </FullSuiteModal>
  );
}

function ProductionTargetsPage({ session, profile }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ target_date: jakartaDateKey(), shift: "Siang", product: "", target_quantity: "", work_order_id: "", note: "" });
  const [filterDate, setFilterDate] = useState(jakartaDateKey());
  const manager = isManagerRole(profile?.role);

  const load = async () => {
    setLoading(true);
    const [targetResult, woResult] = await Promise.all([
      supabase.from("v_production_target_progress").select("*").order("target_date", { ascending: false }).order("created_at", { ascending: false }).limit(500),
      supabase.from("work_orders").select("id,code,product,status").in("status", ["PLANNED", "IN_PROGRESS", "PAUSED"]).order("code")
    ]);
    if (targetResult.error) alert(errorText(targetResult.error));
    setRows(targetResult.data || []);
    setWorkOrders(woResult.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const quantity = Math.floor(numberValue(form.target_quantity));
    if (!form.target_date || !form.product.trim() || quantity <= 0) return alert("Tanggal, produk, dan target quantity wajib diisi.");
    const { error } = await supabase.from("production_targets").insert({
      target_date: form.target_date,
      shift: form.shift,
      product: upperText(form.product),
      target_quantity: quantity,
      work_order_id: form.work_order_id || null,
      note: upperText(form.note) || null,
      created_by: session.user.id
    });
    if (error) return alert(errorText(error));
    setForm((previous) => ({ ...previous, product: "", target_quantity: "", note: "" }));
    await load();
  };

  const remove = async (id: any) => {
    if (!manager || !window.confirm("Hapus target ini?")) return;
    const { error } = await supabase.from("production_targets").delete().eq("id", id);
    if (error) return alert(errorText(error));
    await load();
  };

  const filtered = rows.filter((row) => !filterDate || row.target_date === filterDate);
  const summary = filtered.reduce((acc, row) => {
    acc.target += numberValue(row.target_quantity);
    acc.actual += numberValue(row.actual_quantity);
    if (numberValue(row.actual_quantity) >= numberValue(row.target_quantity)) acc.reached += 1;
    return acc;
  }, { target: 0, actual: 0, reached: 0 });
  const achievement = summary.target ? (summary.actual / summary.target) * 100 : 0;
  const statusFor = (row: any) => {
    const target = numberValue(row.target_quantity);
    const actual = numberValue(row.actual_quantity);
    if (actual >= target && target > 0) return ["TERCAPAI", "green"];
    if (actual <= 0) return ["BELUM MULAI", "slate"];
    if (actual / Math.max(target, 1) >= 0.75) return ["ON TRACK", "blue"];
    return ["TERTINGGAL", "amber"];
  };
  const estimateFor = (row: any) => {
    const target = numberValue(row.target_quantity);
    const actual = numberValue(row.actual_quantity);
    if (target > 0 && actual >= target) return "Selesai";
    if (row.target_date !== jakartaDateKey() || actual <= 0 || !row.first_production_at) return "Belum cukup data";
    const first = new Date(row.first_production_at).getTime();
    const elapsedHours = Math.max((Date.now() - first) / 3_600_000, 0.25);
    const hourlyRate = actual / elapsedHours;
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return "Belum cukup data";
    const remainingHours = Math.max((target - actual) / hourlyRate, 0);
    const estimated = new Date(Date.now() + remainingHours * 3_600_000);
    return `± ${estimated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB`;
  };
  const shiftComparison = ["Siang", "Malam"].map((shift) => {
    const shiftRows = filtered.filter((row) => row.shift === shift);
    const target = shiftRows.reduce((sum, row) => sum + numberValue(row.target_quantity), 0);
    const actual = shiftRows.reduce((sum, row) => sum + numberValue(row.actual_quantity), 0);
    return { shift, target, actual, achievement: target ? actual / target * 100 : 0 };
  });

  return <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <FullSuiteStat label="Target" value={`${summary.target.toLocaleString("id-ID")} Pcs`} hint={filterDate || "Semua tanggal"} tone="violet" />
      <FullSuiteStat label="Aktual" value={`${summary.actual.toLocaleString("id-ID")} Pcs`} hint="Dihitung dari production_data" tone="blue" />
      <FullSuiteStat label="Pencapaian" value={`${achievement.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`} hint={`Selisih ${(summary.actual - summary.target).toLocaleString("id-ID")} Pcs`} tone={achievement >= 100 ? "green" : "amber"} />
      <FullSuiteStat label="Target Tercapai" value={summary.reached.toLocaleString("id-ID")} hint={`${filtered.length} target aktif`} tone="green" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {shiftComparison.map((item) => <Card key={item.shift} className="p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shift {item.shift}</p><p className="mt-2 text-xl font-black text-slate-900">{item.actual.toLocaleString("id-ID")} / {item.target.toLocaleString("id-ID")} Pcs</p><p className="mt-1 text-[10px] font-bold text-slate-400">Aktual / Target</p></div><FullSuiteBadge tone={item.achievement >= 100 ? "green" : item.achievement >= 75 ? "blue" : "amber"}>{item.achievement.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</FullSuiteBadge></div></Card>)}
    </div>

    <Card className="p-5 md:p-7">
      <FullSuiteSectionTitle title="Target Produksi vs Aktual" subtitle="Target disimpan terpisah dan aktual dihitung langsung dari data produksi." action={<div className="flex gap-2"><input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} className={INPUT_CLASS} /><button onClick={load} className={SMALL_BUTTON}>Refresh</button></div>} />
      {manager && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 mb-6 rounded-2xl bg-slate-50 border border-slate-100 p-4">
        <FullSuiteInput label="Tanggal"><input type="date" value={form.target_date} onChange={(event) => setForm({ ...form, target_date: event.target.value })} className={INPUT_CLASS} /></FullSuiteInput>
        <FullSuiteInput label="Shift"><select value={form.shift} onChange={(event) => setForm({ ...form, shift: event.target.value })} className={INPUT_CLASS}><option>Siang</option><option>Malam</option></select></FullSuiteInput>
        <FullSuiteInput label="Produk"><input value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} className={INPUT_CLASS} placeholder="Kode produk" /></FullSuiteInput>
        <FullSuiteInput label="Target Qty"><input type="number" min="1" value={form.target_quantity} onChange={(event) => setForm({ ...form, target_quantity: event.target.value })} className={INPUT_CLASS} /></FullSuiteInput>
        <FullSuiteInput label="Work Order"><select value={form.work_order_id} onChange={(event) => setForm({ ...form, work_order_id: event.target.value })} className={INPUT_CLASS}><option value="">Tanpa WO</option>{workOrders.map((item) => <option key={item.id} value={item.id}>{item.code} • {item.product}</option>)}</select></FullSuiteInput>
        <div className="flex items-end"><button onClick={save} className="w-full px-4 py-3 rounded-xl bg-violet-600 text-white text-xs font-black">Tambah Target</button></div>
        <FullSuiteInput label="Catatan" className="sm:col-span-2 xl:col-span-6"><input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className={INPUT_CLASS} placeholder="Catatan target" /></FullSuiteInput>
      </div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-xs"><thead><tr className="text-left border-b border-slate-200 text-slate-500"><th className="p-3">Tanggal</th><th className="p-3">Shift</th><th className="p-3">Produk</th><th className="p-3">WO</th><th className="p-3 text-right">Target</th><th className="p-3 text-right">Aktual</th><th className="p-3 text-right">Gap</th><th className="p-3">Status</th><th className="p-3">Estimasi</th><th className="p-3"></th></tr></thead><tbody className="divide-y divide-slate-100">
          {filtered.map((row) => { const status = statusFor(row); return <tr key={row.id} className="hover:bg-slate-50"><td className="p-3 font-bold">{row.target_date}</td><td className="p-3">{row.shift}</td><td className="p-3 font-black">{row.product}</td><td className="p-3">{row.work_order_code || "-"}</td><td className="p-3 text-right font-black">{numberValue(row.target_quantity).toLocaleString("id-ID")}</td><td className="p-3 text-right font-black text-blue-700">{numberValue(row.actual_quantity).toLocaleString("id-ID")}</td><td className="p-3 text-right font-black">{numberValue(row.gap_quantity).toLocaleString("id-ID")}</td><td className="p-3"><FullSuiteBadge tone={status[1]}>{status[0]}</FullSuiteBadge></td><td className="p-3 text-[10px] font-black text-slate-500">{estimateFor(row)}</td><td className="p-3 text-right">{manager && <button onClick={() => remove(row.id)} className="text-red-500 font-black">Hapus</button>}</td></tr>; })}
          {!loading && !filtered.length && <tr><td colSpan={10} className="p-12 text-center font-bold text-slate-400">Belum ada target.</td></tr>}
        </tbody></table>
      </div>
    </Card>
  </div>;
}

function QualityControlPage({ session, profile }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [defects, setDefects] = useState<MasterItem[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ production_id: "", inspection_date: jakartaDateKey(), shift: "Siang", product: "", inspected_quantity: "", good_quantity: "", reject_quantity: "0", rework_quantity: "0", defect_type: "", defect_cause: "", corrective_action: "", note: "" });
  const canWrite = canManageQuality(profile?.role);
  const load = async () => {
    const [qcResult, defectResult] = await Promise.all([
      supabase.from("production_quality").select("*").order("inspection_date", { ascending: false }).order("created_at", { ascending: false }).limit(500),
      supabase.from("master_items").select("*").eq("category", "DEFECT_TYPE").eq("is_active", true).order("name")
    ]);
    if (qcResult.error) alert(errorText(qcResult.error));
    setRows(qcResult.data || []);
    setDefects((defectResult.data || []) as MasterItem[]);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    const inspected = Math.floor(numberValue(form.inspected_quantity));
    const good = Math.floor(numberValue(form.good_quantity));
    const reject = Math.floor(numberValue(form.reject_quantity));
    const rework = Math.floor(numberValue(form.rework_quantity));
    if (!form.inspection_date || !form.product.trim() || inspected <= 0) return alert("Tanggal, produk, dan inspected quantity wajib diisi.");
    if (good + reject + rework !== inspected) return alert("Good + Reject + Rework harus sama dengan Inspected Quantity.");
    const { data, error } = await supabase.from("production_quality").insert({
      production_id: form.production_id ? Number(form.production_id) : null,
      inspection_date: form.inspection_date,
      shift: form.shift,
      product: upperText(form.product),
      inspected_quantity: inspected,
      good_quantity: good,
      reject_quantity: reject,
      rework_quantity: rework,
      defect_type: upperText(form.defect_type) || null,
      defect_cause: upperText(form.defect_cause) || null,
      corrective_action: upperText(form.corrective_action) || null,
      note: upperText(form.note) || null,
      status: "OPEN",
      created_by: session.user.id
    }).select().single();
    if (error) return alert(errorText(error));
    setForm((previous) => ({ ...previous, production_id: "", product: "", inspected_quantity: "", good_quantity: "", reject_quantity: "0", rework_quantity: "0", defect_type: "", defect_cause: "", corrective_action: "", note: "" }));
    setSelected(data);
    await load();
  };
  const updateStatus = async (id: any, status: string) => {
    const { error } = await supabase.from("production_quality").update({ status, resolved_at: status === "CLOSED" ? new Date().toISOString() : null, resolved_by: status === "CLOSED" ? session.user.id : null }).eq("id", id);
    if (error) return alert(errorText(error));
    await load();
  };
  const totals = rows.reduce((acc, row) => ({ inspected: acc.inspected + numberValue(row.inspected_quantity), good: acc.good + numberValue(row.good_quantity), reject: acc.reject + numberValue(row.reject_quantity), rework: acc.rework + numberValue(row.rework_quantity) }), { inspected: 0, good: 0, reject: 0, rework: 0 });
  const rate = (value: number) => totals.inspected ? (value / totals.inspected) * 100 : 0;
  return <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><FullSuiteStat label="Yield Rate" value={`${rate(totals.good).toFixed(2)}%`} hint={`${totals.good.toLocaleString("id-ID")} good`} tone="green" /><FullSuiteStat label="Reject Rate" value={`${rate(totals.reject).toFixed(2)}%`} hint={`${totals.reject.toLocaleString("id-ID")} reject`} tone="red" /><FullSuiteStat label="Rework Rate" value={`${rate(totals.rework).toFixed(2)}%`} hint={`${totals.rework.toLocaleString("id-ID")} rework`} tone="amber" /><FullSuiteStat label="Inspected" value={totals.inspected.toLocaleString("id-ID")} hint={`${rows.length} pemeriksaan`} tone="blue" /></div>
    {canWrite && <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Input Quality Control" subtitle="Jumlah good, reject, dan rework harus menutup seluruh quantity yang diperiksa." /><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <FullSuiteInput label="Tanggal"><input type="date" value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Shift"><select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} className={INPUT_CLASS}><option>Siang</option><option>Malam</option></select></FullSuiteInput><FullSuiteInput label="Produk"><input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="ID Produksi (opsional)"><input type="number" value={form.production_id} onChange={(e) => setForm({ ...form, production_id: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Inspected"><input type="number" min="1" value={form.inspected_quantity} onChange={(e) => setForm({ ...form, inspected_quantity: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput>
      <FullSuiteInput label="Good"><input type="number" min="0" value={form.good_quantity} onChange={(e) => setForm({ ...form, good_quantity: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Reject"><input type="number" min="0" value={form.reject_quantity} onChange={(e) => setForm({ ...form, reject_quantity: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Rework"><input type="number" min="0" value={form.rework_quantity} onChange={(e) => setForm({ ...form, rework_quantity: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Jenis Cacat"><input list="defect-types" value={form.defect_type} onChange={(e) => setForm({ ...form, defect_type: e.target.value })} className={INPUT_CLASS} /><datalist id="defect-types">{defects.map((item) => <option key={item.id} value={item.name} />)}</datalist></FullSuiteInput><FullSuiteInput label="Penyebab"><input value={form.defect_cause} onChange={(e) => setForm({ ...form, defect_cause: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput>
      <FullSuiteInput label="Tindakan Perbaikan" className="sm:col-span-2"><input value={form.corrective_action} onChange={(e) => setForm({ ...form, corrective_action: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Catatan" className="sm:col-span-2"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><div className="flex items-end"><button onClick={save} className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black">Simpan QC</button></div>
    </div></Card>}
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Riwayat Kualitas" subtitle="Klik lampiran untuk menyimpan foto reject atau bukti pemeriksaan." action={<button onClick={load} className={SMALL_BUTTON}>Refresh</button>} /><div className="space-y-3">{rows.map((row) => <div key={row.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="flex flex-wrap gap-2 items-center"><p className="font-black text-slate-900">{row.product}</p><FullSuiteBadge tone={row.status === "CLOSED" ? "green" : "amber"}>{row.status}</FullSuiteBadge><FullSuiteBadge tone={numberValue(row.reject_quantity) > 0 ? "red" : "green"}>Reject {row.reject_quantity}</FullSuiteBadge></div><p className="mt-1 text-[10px] font-bold text-slate-400">{row.inspection_date} • {row.shift} • Inspected {row.inspected_quantity} • Good {row.good_quantity} • Rework {row.rework_quantity}</p><p className="mt-2 text-xs font-bold text-slate-600">{row.defect_type || "Tanpa defect"} — {row.defect_cause || "-"}</p></div><div className="flex flex-wrap gap-2">{canWrite && row.status !== "CLOSED" && <button onClick={() => updateStatus(row.id, "CLOSED")} className={SMALL_BUTTON}>Tutup</button>}<button onClick={() => setSelected(row)} className={SMALL_BUTTON}>Lampiran & Detail</button></div></div></div>)}{!rows.length && <p className="py-10 text-center text-xs font-bold text-slate-400">Belum ada data QC.</p>}</div></Card>
    <FullSuiteModal open={Boolean(selected)} title={`Detail QC ${selected?.product || ""}`} onClose={() => setSelected(null)}>{selected && <div className="space-y-4"><div className="grid grid-cols-2 gap-3">{Object.entries(selected).filter(([key]) => !["metadata"].includes(key)).slice(0, 18).map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase text-slate-400">{key.replaceAll("_", " ")}</p><p className="mt-1 text-xs font-bold text-slate-700 break-words">{String(value ?? "-")}</p></div>)}</div><AttachmentManager session={session} profile={profile} entityType="quality" entityId={selected.id} /></div>}</FullSuiteModal>
  </div>;
}

function WorkOrdersPage({ session, profile }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [actualByOrder, setActualByOrder] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<any>(null);
  const [orderForm, setOrderForm] = useState({ code: "", product: "", color: "", target_quantity: "", planned_start: jakartaDateKey(), planned_end: jakartaDateKey(), customer: "", line_code: "", machine_code: "", note: "" });
  const [batchForm, setBatchForm] = useState({ work_order_id: "", batch_code: "", product: "", color: "", planned_quantity: "", note: "" });
  const manager = isManagerRole(profile?.role);
  const load = async () => {
    const [orderResult, batchResult, productionResult] = await Promise.all([
      supabase.from("work_orders").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("production_batches").select("*,work_orders(code)").order("created_at", { ascending: false }).limit(500),
      supabase.from("production_data").select("work_order_id,quantity").not("work_order_id", "is", null).is("deleted_at", null).limit(10000)
    ]);
    if (orderResult.error) alert(errorText(orderResult.error));
    setOrders(orderResult.data || []);
    setBatches(batchResult.data || []);
    const grouped: Record<string, number> = {};
    (productionResult.data || []).forEach((row: any) => { grouped[String(row.work_order_id)] = (grouped[String(row.work_order_id)] || 0) + numberValue(row.quantity); });
    setActualByOrder(grouped);
  };
  useEffect(() => { load(); }, []);
  const saveOrder = async () => {
    if (!orderForm.code.trim() || !orderForm.product.trim()) return alert("Kode dan produk wajib diisi.");
    const { error } = await supabase.from("work_orders").insert({ ...orderForm, code: upperText(orderForm.code), product: upperText(orderForm.product), color: upperText(orderForm.color) || null, target_quantity: Math.floor(numberValue(orderForm.target_quantity)), customer: upperText(orderForm.customer) || null, line_code: upperText(orderForm.line_code) || null, machine_code: upperText(orderForm.machine_code) || null, note: upperText(orderForm.note) || null, status: "PLANNED", created_by: session.user.id });
    if (error) return alert(errorText(error));
    setOrderForm((previous) => ({ ...previous, code: "", product: "", color: "", target_quantity: "", customer: "", note: "" }));
    await load();
  };
  const saveBatch = async () => {
    if (!batchForm.batch_code.trim() || !batchForm.product.trim()) return alert("Kode batch dan produk wajib diisi.");
    const { error } = await supabase.from("production_batches").insert({ ...batchForm, batch_code: upperText(batchForm.batch_code), product: upperText(batchForm.product), color: upperText(batchForm.color) || null, planned_quantity: Math.floor(numberValue(batchForm.planned_quantity)), work_order_id: batchForm.work_order_id || null, note: upperText(batchForm.note) || null, status: "OPEN", created_by: session.user.id });
    if (error) return alert(errorText(error));
    setBatchForm({ work_order_id: "", batch_code: "", product: "", color: "", planned_quantity: "", note: "" });
    await load();
  };
  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("work_orders").update({ status, completed_at: status === "COMPLETED" ? new Date().toISOString() : null }).eq("id", id);
    if (error) return alert(errorText(error));
    await load();
  };
  return <div className="space-y-6">
    {manager && <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Buat Work Order" subtitle="Menjadi referensi target, batch, barcode, dan traceability produksi." /><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><FullSuiteInput label="Kode"><input value={orderForm.code} onChange={(e) => setOrderForm({ ...orderForm, code: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Produk"><input value={orderForm.product} onChange={(e) => setOrderForm({ ...orderForm, product: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Warna"><input value={orderForm.color} onChange={(e) => setOrderForm({ ...orderForm, color: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Target"><input type="number" value={orderForm.target_quantity} onChange={(e) => setOrderForm({ ...orderForm, target_quantity: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Mulai"><input type="date" value={orderForm.planned_start} onChange={(e) => setOrderForm({ ...orderForm, planned_start: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Selesai"><input type="date" value={orderForm.planned_end} onChange={(e) => setOrderForm({ ...orderForm, planned_end: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Customer"><input value={orderForm.customer} onChange={(e) => setOrderForm({ ...orderForm, customer: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Line / Mesin"><div className="grid grid-cols-2 gap-2"><input placeholder="Line" value={orderForm.line_code} onChange={(e) => setOrderForm({ ...orderForm, line_code: e.target.value })} className={INPUT_CLASS} /><input placeholder="Mesin" value={orderForm.machine_code} onChange={(e) => setOrderForm({ ...orderForm, machine_code: e.target.value })} className={INPUT_CLASS} /></div></FullSuiteInput><button onClick={saveOrder} className="sm:col-span-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-black">Simpan Work Order</button></div></Card>
      <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Buat Batch" subtitle="Batch dapat dipindai dan otomatis mengisi produk, warna, serta work order." /><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><FullSuiteInput label="Work Order"><select value={batchForm.work_order_id} onChange={(e) => { const order = orders.find((item) => item.id === e.target.value); setBatchForm({ ...batchForm, work_order_id: e.target.value, product: order?.product || batchForm.product, color: order?.color || batchForm.color }); }} className={INPUT_CLASS}><option value="">Tanpa WO</option>{orders.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></FullSuiteInput><FullSuiteInput label="Kode Batch"><input value={batchForm.batch_code} onChange={(e) => setBatchForm({ ...batchForm, batch_code: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Produk"><input value={batchForm.product} onChange={(e) => setBatchForm({ ...batchForm, product: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Warna"><input value={batchForm.color} onChange={(e) => setBatchForm({ ...batchForm, color: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Planned Qty"><input type="number" value={batchForm.planned_quantity} onChange={(e) => setBatchForm({ ...batchForm, planned_quantity: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Catatan"><input value={batchForm.note} onChange={(e) => setBatchForm({ ...batchForm, note: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><button onClick={saveBatch} className="sm:col-span-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-xs font-black">Simpan Batch</button></div></Card>
    </div>}
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Work Order" subtitle="Progres aktual diakumulasi dari production_data yang merujuk work order." action={<button onClick={load} className={SMALL_BUTTON}>Refresh</button>} /><div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{orders.map((order) => { const actual = actualByOrder[String(order.id)] || 0; const target = numberValue(order.target_quantity); const percent = target ? Math.min((actual / target) * 100, 100) : 0; return <div key={order.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2 items-center"><p className="font-black text-slate-900">{order.code}</p><FullSuiteBadge tone={order.status === "COMPLETED" ? "green" : order.status === "PAUSED" ? "amber" : "blue"}>{order.status}</FullSuiteBadge></div><p className="mt-1 text-xs font-bold text-slate-500">{order.product} • {order.color || "-"} • {order.customer || "-"}</p></div><div className="flex gap-1"><button onClick={() => printBarcodeLabel(`WO:${order.code}`, `WORK ORDER ${order.code}`, `${order.product} • ${order.color || "-"}`)} className={SMALL_BUTTON}>Barcode</button><button onClick={() => setSelected({ type: "work_order", data: order })} className={SMALL_BUTTON}>Detail</button></div></div><div className="mt-4"><div className="flex justify-between text-[10px] font-black text-slate-500"><span>{actual.toLocaleString("id-ID")} / {target.toLocaleString("id-ID")}</span><span>{percent.toFixed(1)}%</span></div><div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: `${percent}%` }} /></div></div>{manager && <div className="mt-4 flex flex-wrap gap-2">{["PLANNED", "IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELLED"].map((status) => <button key={status} disabled={order.status === status} onClick={() => updateOrderStatus(order.id, status)} className={SMALL_BUTTON}>{status}</button>)}</div>}</div>; })}{!orders.length && <p className="col-span-full py-10 text-center text-xs font-bold text-slate-400">Belum ada work order.</p>}</div></Card>
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Batch Produksi" subtitle="Cetak barcode batch untuk pemindaian cepat pada form produksi." /><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-xs"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Batch</th><th className="p-3">Work Order</th><th className="p-3">Produk</th><th className="p-3">Warna</th><th className="p-3 text-right">Planned</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody className="divide-y">{batches.map((batch) => <tr key={batch.id}><td className="p-3 font-black">{batch.batch_code}</td><td className="p-3">{batch.work_orders?.code || "-"}</td><td className="p-3">{batch.product}</td><td className="p-3">{batch.color || "-"}</td><td className="p-3 text-right font-black">{numberValue(batch.planned_quantity).toLocaleString("id-ID")}</td><td className="p-3"><FullSuiteBadge>{batch.status}</FullSuiteBadge></td><td className="p-3 text-right"><button onClick={() => printBarcodeLabel(`BATCH:${batch.batch_code}`, `BATCH ${batch.batch_code}`, `${batch.product} • ${batch.color || "-"}`)} className={SMALL_BUTTON}>Barcode</button><button onClick={() => setSelected({ type: "batch", data: batch })} className={`${SMALL_BUTTON} ml-2`}>Detail</button></td></tr>)}</tbody></table></div></Card>
    <FullSuiteModal open={Boolean(selected)} title={selected?.type === "batch" ? `Batch ${selected?.data?.batch_code}` : `Work Order ${selected?.data?.code}`} onClose={() => setSelected(null)}>{selected && <div className="space-y-4"><pre className="rounded-xl bg-slate-950 text-slate-100 p-4 text-[10px] overflow-x-auto">{JSON.stringify(selected.data, null, 2)}</pre><AttachmentManager session={session} profile={profile} entityType={selected.type} entityId={selected.data.id} /></div>}</FullSuiteModal>
  </div>;
}

function ShiftClosingPage({ session, profile }: any) {
  const [date, setDate] = useState(jakartaDateKey());
  const [shift, setShift] = useState("Siang");
  const [summary, setSummary] = useState({ actual: 0, target: 0, reject: 0, rework: 0, records: 0 });
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ issues: "", handover_note: "", supervisor_note: "" });
  const [loading, setLoading] = useState(false);
  const manager = isManagerRole(profile?.role);
  const load = async () => {
    setLoading(true);
    const [productionResult, targetResult, qualityResult, closureResult] = await Promise.all([
      supabase.from("production_data").select("quantity").eq("date", date).eq("shift", shift).is("deleted_at", null),
      supabase.from("production_targets").select("target_quantity").eq("target_date", date).eq("shift", shift),
      supabase.from("production_quality").select("reject_quantity,rework_quantity").eq("inspection_date", date).eq("shift", shift),
      supabase.from("shift_closures").select("*").order("shift_date", { ascending: false }).order("created_at", { ascending: false }).limit(250)
    ]);
    if (productionResult.error) alert(errorText(productionResult.error));
    setSummary({
      actual: (productionResult.data || []).reduce((sum, row) => sum + numberValue(row.quantity), 0),
      target: (targetResult.data || []).reduce((sum, row) => sum + numberValue(row.target_quantity), 0),
      reject: (qualityResult.data || []).reduce((sum, row) => sum + numberValue(row.reject_quantity), 0),
      rework: (qualityResult.data || []).reduce((sum, row) => sum + numberValue(row.rework_quantity), 0),
      records: (productionResult.data || []).length
    });
    setRows(closureResult.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [date, shift]);
  const submit = async () => {
    const { error } = await supabase.rpc("submit_shift_closure", {
      p_shift_date: date,
      p_shift: shift,
      p_total_quantity: summary.actual,
      p_target_quantity: summary.target,
      p_reject_quantity: summary.reject,
      p_rework_quantity: summary.rework,
      p_issues: upperText(form.issues) || null,
      p_handover_note: upperText(form.handover_note) || null,
      p_supervisor_note: upperText(form.supervisor_note) || null
    });
    if (error) return alert(errorText(error));
    setForm({ issues: "", handover_note: "", supervisor_note: "" });
    await load();
  };
  const setStatus = async (id: string, status: string) => {
    const note = window.prompt(`Catatan untuk status ${status}:`, "") || "";
    const { error } = await supabase.rpc("set_shift_closure_status", { p_closure_id: id, p_status: status, p_note: note });
    if (error) return alert(errorText(error));
    await load();
  };
  const achievement = summary.target ? (summary.actual / summary.target) * 100 : 0;
  return <div className="space-y-6">
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Shift Closing & Serah Terima" subtitle="Ringkasan resmi per shift dengan alur OPEN → SUBMITTED → REVIEWED → CLOSED." action={<div className="flex flex-col sm:flex-row gap-2"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLASS} /><select value={shift} onChange={(e) => setShift(e.target.value)} className={INPUT_CLASS}><option>Siang</option><option>Malam</option></select></div>} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5"><FullSuiteStat label="Aktual" value={summary.actual.toLocaleString("id-ID")} tone="blue" /><FullSuiteStat label="Target" value={summary.target.toLocaleString("id-ID")} tone="violet" /><FullSuiteStat label="Pencapaian" value={`${achievement.toFixed(1)}%`} tone={achievement >= 100 ? "green" : "amber"} /><FullSuiteStat label="Reject" value={summary.reject.toLocaleString("id-ID")} tone="red" /><FullSuiteStat label="Record" value={summary.records.toLocaleString("id-ID")} tone="slate" /></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><FullSuiteInput label="Kendala"><textarea value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} className={`${INPUT_CLASS} min-h-28`} /></FullSuiteInput><FullSuiteInput label="Catatan Serah Terima"><textarea value={form.handover_note} onChange={(e) => setForm({ ...form, handover_note: e.target.value })} className={`${INPUT_CLASS} min-h-28`} /></FullSuiteInput><FullSuiteInput label="Catatan Supervisor"><textarea disabled={!manager} value={form.supervisor_note} onChange={(e) => setForm({ ...form, supervisor_note: e.target.value })} className={`${INPUT_CLASS} min-h-28`} /></FullSuiteInput></div>
      <button disabled={loading} onClick={submit} className="mt-4 px-5 py-3 rounded-xl bg-indigo-600 text-white text-xs font-black">Kirim Ringkasan Shift</button>
    </Card>
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Riwayat Shift" subtitle="Supervisor dapat review, menutup, atau membuka kembali shift." action={<button onClick={load} className={SMALL_BUTTON}>Refresh</button>} /><div className="space-y-3">{rows.map((row) => <div key={row.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2 items-center"><p className="font-black text-slate-900">{row.shift_date} • {row.shift}</p><FullSuiteBadge tone={row.status === "CLOSED" ? "green" : row.status === "REOPENED" ? "red" : row.status === "REVIEWED" ? "blue" : "amber"}>{row.status}</FullSuiteBadge></div><p className="mt-2 text-xs font-bold text-slate-500">Aktual {numberValue(row.total_quantity).toLocaleString("id-ID")} • Target {numberValue(row.target_quantity).toLocaleString("id-ID")} • Reject {numberValue(row.reject_quantity).toLocaleString("id-ID")} • Rework {numberValue(row.rework_quantity).toLocaleString("id-ID")}</p><p className="mt-2 text-[11px] font-bold text-slate-600">Kendala: {row.issues || "-"}</p><p className="mt-1 text-[11px] font-bold text-slate-600">Serah terima: {row.handover_note || "-"}</p></div>{manager && <div className="flex flex-wrap gap-2">{["REVIEWED", "CLOSED", "REOPENED"].map((status) => <button key={status} disabled={row.status === status} onClick={() => setStatus(row.id, status)} className={SMALL_BUTTON}>{status}</button>)}</div>}</div><div className="mt-4"><AttachmentManager compact session={session} profile={profile} entityType="shift_closure" entityId={row.id} /></div></div>)}{!rows.length && <p className="py-10 text-center text-xs font-bold text-slate-400">Belum ada shift closing.</p>}</div></Card>
  </div>;
}

function ApprovalsAndTrashPage({ session, profile }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [trash, setTrash] = useState<any[]>([]);
  const [mode, setMode] = useState<"approval" | "trash">("approval");
  const [loading, setLoading] = useState(false);
  const manager = isManagerRole(profile?.role);
  const load = async () => {
    setLoading(true);
    const [requestResult, trashResult] = await Promise.all([
      supabase.from("change_requests").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("production_data").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(500)
    ]);
    if (requestResult.error) alert(errorText(requestResult.error));
    setRequests(requestResult.data || []);
    setTrash(trashResult.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const review = async (id: string, decision: "APPROVED" | "REJECTED") => {
    if (!manager) return;
    const note = window.prompt(`Catatan keputusan ${decision}:`, "") || "";
    const { error } = await supabase.rpc("review_change_request", { p_request_id: id, p_decision: decision, p_review_note: note });
    if (error) return alert(errorText(error));
    await load();
  };
  const restore = async (id: any) => {
    if (!manager || !window.confirm("Pulihkan record ini?")) return;
    const { error } = await supabase.rpc("restore_production_record", { p_production_id: Number(id) });
    if (error) return alert(errorText(error));
    await load();
  };
  const purge = async (id: any) => {
    if (profile?.role !== "admin") return;
    const confirmation = window.prompt(`Ketik PURGE-${id} untuk menghapus permanen:`);
    if (confirmation !== `PURGE-${id}`) return;
    const { error } = await supabase.rpc("purge_production_record", { p_production_id: Number(id) });
    if (error) return alert(errorText(error));
    await load();
  };
  return <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Persetujuan & Trash" subtitle="Perubahan sensitif diproses melalui permintaan; penghapusan menggunakan soft delete sebelum purge permanen." action={<div className="flex gap-2"><button onClick={() => setMode("approval")} className={`${SMALL_BUTTON} ${mode === "approval" ? "!bg-indigo-600 !text-white" : ""}`}>Permintaan ({requests.filter((item) => item.status === "PENDING").length})</button><button onClick={() => setMode("trash")} className={`${SMALL_BUTTON} ${mode === "trash" ? "!bg-red-600 !text-white" : ""}`}>Trash ({trash.length})</button><button onClick={load} className={SMALL_BUTTON}>Refresh</button></div>} />
    {mode === "approval" ? <div className="space-y-3">{requests.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><FullSuiteBadge tone={item.request_type === "DELETE" ? "red" : "blue"}>{item.request_type}</FullSuiteBadge><FullSuiteBadge tone={item.status === "APPROVED" ? "green" : item.status === "REJECTED" ? "red" : "amber"}>{item.status}</FullSuiteBadge><span className="text-[10px] font-black text-slate-400">Produksi #{item.production_id}</span></div><p className="mt-3 text-xs font-bold text-slate-700">{item.reason || "Tanpa alasan"}</p><p className="mt-2 text-[10px] font-bold text-slate-400">Diajukan {formatDateTime(item.created_at)}</p>{item.requested_changes && <pre className="mt-3 max-w-2xl overflow-x-auto rounded-xl bg-slate-950 p-3 text-[9px] text-slate-100">{JSON.stringify(item.requested_changes, null, 2)}</pre>}</div>{manager && item.status === "PENDING" && <div className="flex gap-2"><button onClick={() => review(item.id, "APPROVED")} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black">Setujui</button><button onClick={() => review(item.id, "REJECTED")} className="px-4 py-2 rounded-xl bg-red-600 text-white text-[10px] font-black">Tolak</button></div>}</div></div>)}{!requests.length && <p className="py-12 text-center text-xs font-bold text-slate-400">Belum ada permintaan perubahan.</p>}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">ID</th><th className="p-3">Dihapus</th><th className="p-3">Tanggal</th><th className="p-3">Produk</th><th className="p-3">Warna</th><th className="p-3 text-right">Qty</th><th className="p-3">Operator</th><th className="p-3"></th></tr></thead><tbody className="divide-y">{trash.map((row) => <tr key={row.id}><td className="p-3 font-black">#{row.id}</td><td className="p-3">{formatDateTime(row.deleted_at)}</td><td className="p-3">{row.date}</td><td className="p-3 font-black">{row.product}</td><td className="p-3">{row.color}</td><td className="p-3 text-right font-black">{row.quantity}</td><td className="p-3">{row.created_by}</td><td className="p-3 text-right"><button disabled={!manager} onClick={() => restore(row.id)} className={SMALL_BUTTON}>Restore</button>{profile?.role === "admin" && <button onClick={() => purge(row.id)} className={`${SMALL_BUTTON} ml-2 !text-red-600`}>Purge</button>}</td></tr>)}</tbody></table>{!trash.length && <p className="py-12 text-center text-xs font-bold text-slate-400">Trash kosong.</p>}</div>}
  </Card>;
}

const MASTER_CATEGORIES = ["PRODUCT", "COLOR", "SHIFT", "OPERATOR", "MACHINE", "LINE", "DEFECT_TYPE", "CUSTOMER"];
function MasterDataPage({ session, profile }: any) {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [category, setCategory] = useState("PRODUCT");
  const [form, setForm] = useState({ code: "", name: "", metadata: "{}" });
  const manager = isManagerRole(profile?.role);
  const load = async () => {
    const [itemResult, settingResult] = await Promise.all([
      supabase.from("master_items").select("*").order("category").order("name"),
      supabase.from("app_settings").select("*").order("key")
    ]);
    if (itemResult.error) alert(errorText(itemResult.error));
    setItems((itemResult.data || []) as MasterItem[]);
    setSettings(settingResult.data || []);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) return alert("Kode dan nama wajib diisi.");
    let metadata: any = {};
    try { metadata = JSON.parse(form.metadata || "{}"); } catch { return alert("Metadata harus berupa JSON valid."); }
    const { error } = await supabase.from("master_items").insert({ category, code: upperText(form.code), name: upperText(form.name), metadata, is_active: true, created_by: session.user.id });
    if (error) return alert(errorText(error));
    setForm({ code: "", name: "", metadata: "{}" });
    await load();
  };
  const toggle = async (id: any, value: boolean) => {
    const { error } = await supabase.from("master_items").update({ is_active: value }).eq("id", id);
    if (error) return alert(errorText(error));
    await load();
  };
  const updateSetting = async (key: string, value: any) => {
    if (!manager) return;
    const { error } = await supabase.from("app_settings").update({ value, updated_by: session.user.id }).eq("key", key);
    if (error) return alert(errorText(error));
    await load();
  };
  const categoryItems = items.filter((item) => item.category === category);
  return <div className="space-y-6">
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Master Data" subtitle="Standarisasi produk, warna, mesin, line, operator, customer, dan jenis cacat." action={<button onClick={load} className={SMALL_BUTTON}>Refresh</button>} /><div className="flex gap-2 overflow-x-auto pb-2 mb-5">{MASTER_CATEGORIES.map((item) => <button key={item} onClick={() => setCategory(item)} className={`${SMALL_BUTTON} shrink-0 ${category === item ? "!bg-slate-900 !text-white" : ""}`}>{item}</button>)}</div>{manager && <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl bg-slate-50 border border-slate-100 p-4 mb-5"><FullSuiteInput label="Kode"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Nama"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Metadata JSON"><input value={form.metadata} onChange={(e) => setForm({ ...form, metadata: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><div className="flex items-end"><button onClick={save} className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-black">Tambah {category}</button></div></div>}<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{categoryItems.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-black text-slate-900 truncate">{item.name}</p><FullSuiteBadge tone={item.is_active ? "green" : "red"}>{item.is_active ? "Aktif" : "Nonaktif"}</FullSuiteBadge></div><p className="mt-1 text-[10px] font-bold text-slate-400">{item.code}</p></div>{manager && <button onClick={() => toggle(item.id, !item.is_active)} className={SMALL_BUTTON}>{item.is_active ? "Nonaktifkan" : "Aktifkan"}</button>}</div>)}{!categoryItems.length && <p className="col-span-full py-10 text-center text-xs font-bold text-slate-400">Belum ada master {category}.</p>}</div></Card>
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Pengaturan Aplikasi" subtitle="Nilai ini dibaca oleh React dan fungsi database. Ubah hanya setelah memahami dampaknya." /><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{settings.map((setting) => { const value = safeJson(setting.value, setting.value); const isBoolean = typeof value === "boolean"; return <div key={setting.key} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black text-slate-900">{setting.key}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{setting.description || "-"}</p></div>{isBoolean ? <button disabled={!manager} onClick={() => updateSetting(setting.key, !value)} className={`${SMALL_BUTTON} ${value ? "!bg-emerald-600 !text-white" : ""}`}>{value ? "ON" : "OFF"}</button> : <button disabled={!manager} onClick={() => { const next = window.prompt(`Nilai JSON untuk ${setting.key}:`, JSON.stringify(value)); if (next === null) return; try { updateSetting(setting.key, JSON.parse(next)); } catch { alert("JSON tidak valid."); } }} className={SMALL_BUTTON}>{JSON.stringify(value)}</button>}</div></div>; })}</div></Card>
  </div>;
}

function NotificationsCenterPage({ session, profile }: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("ALL");
  const [form, setForm] = useState({ title: "", message: "", severity: "INFO", target_role: "" });
  const manager = isManagerRole(profile?.role);
  const load = async () => {
    const [notificationResult, readResult] = await Promise.all([
      supabase.from("app_notifications").select("*").or(`target_user_id.is.null,target_user_id.eq.${session.user.id}`).order("created_at", { ascending: false }).limit(500),
      supabase.from("notification_reads").select("notification_id").eq("user_id", session.user.id)
    ]);
    if (notificationResult.error) alert(errorText(notificationResult.error));
    setNotifications(notificationResult.data || []);
    setReadIds(new Set((readResult.data || []).map((row: any) => String(row.notification_id))));
  };
  useEffect(() => {
    load();
    const channel = supabase.channel(`notification-center-${session.user.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "app_notifications" }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session.user.id]);
  const markRead = async (id: string) => {
    const { error } = await supabase.from("notification_reads").upsert({ notification_id: id, user_id: session.user.id, read_at: new Date().toISOString() }, { onConflict: "notification_id,user_id" });
    if (error) return alert(errorText(error));
    setReadIds((previous) => new Set([...previous, String(id)]));
  };
  const markAll = async () => {
    const unread = notifications.filter((item) => !readIds.has(String(item.id)));
    if (!unread.length) return;
    const { error } = await supabase.from("notification_reads").upsert(unread.map((item) => ({ notification_id: item.id, user_id: session.user.id, read_at: new Date().toISOString() })), { onConflict: "notification_id,user_id" });
    if (error) return alert(errorText(error));
    setReadIds(new Set(notifications.map((item) => String(item.id))));
  };
  const broadcast = async () => {
    if (!manager || !form.title.trim() || !form.message.trim()) return alert("Judul dan pesan wajib diisi.");
    const { error } = await supabase.from("app_notifications").insert({ title: form.title.trim(), message: form.message.trim(), severity: form.severity, target_role: form.target_role || null, created_by: session.user.id, source_type: "MANUAL" });
    if (error) return alert(errorText(error));
    setForm({ title: "", message: "", severity: "INFO", target_role: "" });
    await load();
  };
  const visible = notifications.filter((item) => filter === "ALL" || (filter === "UNREAD" ? !readIds.has(String(item.id)) : item.severity === filter));
  return <div className="space-y-6">
    {manager && <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Kirim Notifikasi" subtitle="Pesan dapat ditujukan ke seluruh pengguna atau satu role tertentu." /><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><FullSuiteInput label="Judul"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Severity"><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={INPUT_CLASS}>{["INFO", "SUCCESS", "WARNING", "CRITICAL"].map((item) => <option key={item}>{item}</option>)}</select></FullSuiteInput><FullSuiteInput label="Target Role"><select value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })} className={INPUT_CLASS}><option value="">Semua Role</option>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></FullSuiteInput><div className="flex items-end"><button onClick={broadcast} className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-black">Kirim</button></div><FullSuiteInput label="Pesan" className="md:col-span-4"><textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={`${INPUT_CLASS} min-h-24`} /></FullSuiteInput></div></Card>}
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Pusat Notifikasi" subtitle="Notifikasi target, reject, approval, shift, dan sinkronisasi tersimpan hingga dibaca." action={<div className="flex flex-wrap gap-2"><select value={filter} onChange={(e) => setFilter(e.target.value)} className={SMALL_BUTTON}><option>ALL</option><option>UNREAD</option><option>INFO</option><option>SUCCESS</option><option>WARNING</option><option>CRITICAL</option></select><button onClick={markAll} className={SMALL_BUTTON}>Tandai Semua Dibaca</button><button onClick={load} className={SMALL_BUTTON}>Refresh</button></div>} /><div className="space-y-3">{visible.map((item) => { const read = readIds.has(String(item.id)); return <button key={item.id} onClick={() => markRead(item.id)} className={`w-full rounded-2xl border p-4 text-left transition-all ${read ? "border-slate-200 bg-white opacity-65" : "border-blue-200 bg-blue-50/40"}`}><div className="flex items-start gap-3"><span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${item.severity === "CRITICAL" ? "bg-red-500" : item.severity === "WARNING" ? "bg-amber-500" : item.severity === "SUCCESS" ? "bg-emerald-500" : "bg-blue-500"}`} /><div><div className="flex flex-wrap gap-2 items-center"><p className="text-xs font-black text-slate-900">{item.title}</p><FullSuiteBadge tone={item.severity === "CRITICAL" ? "red" : item.severity === "WARNING" ? "amber" : item.severity === "SUCCESS" ? "green" : "blue"}>{item.severity}</FullSuiteBadge>{!read && <FullSuiteBadge tone="violet">BARU</FullSuiteBadge>}</div><p className="mt-2 text-xs font-bold text-slate-600 leading-relaxed">{item.message}</p><p className="mt-2 text-[9px] font-bold text-slate-400">{formatDateTime(item.created_at)} • {item.source_type || "SYSTEM"}</p></div></div></button>; })}{!visible.length && <p className="py-12 text-center text-xs font-bold text-slate-400">Tidak ada notifikasi untuk filter ini.</p>}</div></Card>
  </div>;
}

function ScheduledReportsPage({ session, profile }: any) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "Laporan Harian Produksi", frequency: "DAILY", local_time: "17:00", weekday: "1", month_day: "1", channel: "ARCHIVE", recipient: "", webhook_url: "", is_active: true });
  const manager = isManagerRole(profile?.role);
  const load = async () => {
    const [scheduleResult, runResult] = await Promise.all([
      supabase.from("report_schedules").select("*").order("created_at", { ascending: false }),
      supabase.from("report_runs").select("*").order("started_at", { ascending: false }).limit(100)
    ]);
    if (scheduleResult.error) alert(errorText(scheduleResult.error));
    setSchedules(scheduleResult.data || []);
    setRuns(runResult.data || []);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!manager || !form.name.trim()) return;
    const { error } = await supabase.from("report_schedules").insert({
      name: form.name.trim(), frequency: form.frequency, local_time: form.local_time,
      weekday: form.frequency === "WEEKLY" ? Number(form.weekday) : null,
      month_day: form.frequency === "MONTHLY" ? Number(form.month_day) : null,
      timezone: "Asia/Jakarta", channel: form.channel, recipient: form.recipient || null,
      webhook_url: form.webhook_url || null, filters: {}, is_active: form.is_active,
      next_run_at: new Date().toISOString(), created_by: session.user.id
    });
    if (error) return alert(errorText(error));
    await load();
  };
  const toggle = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from("report_schedules").update({ is_active: isActive, next_run_at: isActive ? new Date().toISOString() : null }).eq("id", id);
    if (error) return alert(errorText(error));
    await load();
  };
  const runNow = async (scheduleId?: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("scheduled-production-report", { body: { schedule_id: scheduleId || null, force: true } });
    setBusy(false);
    if (error) return alert(errorText(error));
    alert(`Laporan diproses: ${JSON.stringify(data)}`);
    await load();
  };
  return <div className="space-y-6">
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Laporan Otomatis" subtitle="Cron Supabase memanggil Edge Function; channel dapat berupa arsip, email, atau webhook provider." action={manager ? <button disabled={busy} onClick={() => runNow()} className={SMALL_BUTTON}>Proses Jadwal Due</button> : <FullSuiteBadge>READ ONLY</FullSuiteBadge>} />{manager && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 rounded-2xl bg-slate-50 border border-slate-100 p-4"><FullSuiteInput label="Nama"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Frekuensi"><select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={INPUT_CLASS}><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option></select></FullSuiteInput><FullSuiteInput label="Jam WIB"><input type="time" value={form.local_time} onChange={(e) => setForm({ ...form, local_time: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Channel"><select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className={INPUT_CLASS}><option>ARCHIVE</option><option>EMAIL</option><option>WEBHOOK</option><option>TELEGRAM</option><option>WHATSAPP</option></select></FullSuiteInput>{form.frequency === "WEEKLY" && <FullSuiteInput label="Hari (0 Minggu - 6 Sabtu)"><input type="number" min="0" max="6" value={form.weekday} onChange={(e) => setForm({ ...form, weekday: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput>}{form.frequency === "MONTHLY" && <FullSuiteInput label="Tanggal Bulanan"><input type="number" min="1" max="28" value={form.month_day} onChange={(e) => setForm({ ...form, month_day: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput>}<FullSuiteInput label="Penerima"><input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} className={INPUT_CLASS} placeholder="Email / chat ID" /></FullSuiteInput><FullSuiteInput label="Webhook URL"><input value={form.webhook_url} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} className={INPUT_CLASS} placeholder="Opsional; sebaiknya dikelola server" /></FullSuiteInput><div className="flex items-end"><button onClick={save} className="w-full px-4 py-3 rounded-xl bg-violet-600 text-white text-xs font-black">Tambah Jadwal</button></div></div>}</Card>
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Jadwal" subtitle="Jadwal aktif akan di-claim satu kali secara concurrency-safe oleh database." /><div className="space-y-3">{schedules.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><div className="flex flex-wrap gap-2 items-center"><p className="font-black text-slate-900">{item.name}</p><FullSuiteBadge tone={item.is_active ? "green" : "red"}>{item.is_active ? "AKTIF" : "NONAKTIF"}</FullSuiteBadge><FullSuiteBadge>{item.channel}</FullSuiteBadge></div><p className="mt-2 text-[10px] font-bold text-slate-400">{item.frequency} • {item.local_time} WIB • Next {formatDateTime(item.next_run_at)}</p></div>{manager && <div className="flex gap-2"><button disabled={busy} onClick={() => runNow(item.id)} className={SMALL_BUTTON}>Jalankan</button><button onClick={() => toggle(item.id, !item.is_active)} className={SMALL_BUTTON}>{item.is_active ? "Nonaktifkan" : "Aktifkan"}</button></div>}</div>)}{!schedules.length && <p className="py-10 text-center text-xs font-bold text-slate-400">Belum ada jadwal laporan.</p>}</div></Card>
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Riwayat Eksekusi" subtitle="Payload ringkasan tetap diarsipkan pada report_runs, walaupun channel eksternal gagal." /><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-xs"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Mulai</th><th className="p-3">Jadwal</th><th className="p-3">Status</th><th className="p-3">Channel</th><th className="p-3">Periode</th><th className="p-3">Pesan</th></tr></thead><tbody className="divide-y">{runs.map((item) => <tr key={item.id}><td className="p-3">{formatDateTime(item.started_at)}</td><td className="p-3 font-black">{item.schedule_name || item.schedule_id || "Manual"}</td><td className="p-3"><FullSuiteBadge tone={item.status === "SUCCESS" ? "green" : item.status === "RUNNING" ? "blue" : "red"}>{item.status}</FullSuiteBadge></td><td className="p-3">{item.channel || "-"}</td><td className="p-3">{item.period_start || "-"} — {item.period_end || "-"}</td><td className="p-3 max-w-sm truncate" title={item.error_message || item.delivery_response || ""}>{item.error_message || item.delivery_response || "-"}</td></tr>)}</tbody></table></div></Card>
  </div>;
}

function UsersAndSecurityPage({ session, profile }: any) {
  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({ email: "", full_name: "", role: "operator" as AppRole });
  const [busy, setBusy] = useState(false);
  const admin = profile?.role === "admin";
  const load = async () => {
    const [profileResult, eventResult] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("app_login_events").select("*").order("created_at", { ascending: false }).limit(100)
    ]);
    setProfiles((profileResult.data || []) as AppProfile[]);
    setEvents(eventResult.data || []);
  };
  useEffect(() => { load(); }, []);
  const updateProfile = async (id: string, role: AppRole, isActive: boolean) => {
    const { error } = await supabase.rpc("admin_update_profile", { p_user_id: id, p_role: role, p_is_active: isActive });
    if (error) return alert(errorText(error));
    await load();
  };
  const invokeAdmin = async (action: "invite" | "reset", email: string, fullName?: string, role?: AppRole) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-user-management", { body: { action, email, full_name: fullName, role } });
    setBusy(false);
    if (error) return alert(errorText(error));
    alert(data?.message || "Permintaan berhasil diproses.");
    await load();
  };
  const invite = async () => {
    if (!form.email.trim() || !form.full_name.trim()) return alert("Email dan nama wajib diisi.");
    await invokeAdmin("invite", form.email.trim(), form.full_name.trim(), form.role);
    setForm({ email: "", full_name: "", role: "operator" });
  };
  return <div className="space-y-6"><MfaManagement session={session} />
    {admin && <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Undang Pengguna" subtitle="Undangan dan reset password berjalan melalui Edge Function dengan service-role di server." /><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><FullSuiteInput label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Nama Lengkap"><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput><FullSuiteInput label="Role"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })} className={INPUT_CLASS}>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></FullSuiteInput><div className="flex items-end"><button disabled={busy} onClick={invite} className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-black">Kirim Undangan</button></div></div></Card>}
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Pengguna & Role" subtitle="RLS tetap menjadi penegak akses utama di database." action={<button onClick={load} className={SMALL_BUTTON}>Refresh</button>} /><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Nama</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Terakhir Diubah</th><th className="p-3"></th></tr></thead><tbody className="divide-y">{profiles.map((item) => <tr key={item.id}><td className="p-3 font-black">{item.full_name || "-"}</td><td className="p-3">{item.email || "-"}</td><td className="p-3">{admin ? <select value={item.role} onChange={(e) => updateProfile(item.id, e.target.value as AppRole, item.is_active)} className={SMALL_BUTTON}>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <FullSuiteBadge>{ROLE_LABELS[item.role]}</FullSuiteBadge>}</td><td className="p-3"><FullSuiteBadge tone={item.is_active ? "green" : "red"}>{item.is_active ? "AKTIF" : "NONAKTIF"}</FullSuiteBadge></td><td className="p-3">{formatDateTime(item.updated_at)}</td><td className="p-3 text-right">{admin && <><button onClick={() => updateProfile(item.id, item.role, !item.is_active)} className={SMALL_BUTTON}>{item.is_active ? "Nonaktifkan" : "Aktifkan"}</button><button disabled={busy || !item.email} onClick={() => invokeAdmin("reset", item.email || "")} className={`${SMALL_BUTTON} ml-2`}>Reset Password</button></>}</td></tr>)}</tbody></table></div></Card>
    {(admin || profile?.role === "auditor") && <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Riwayat Login" subtitle="Event login/logout dicatat untuk observabilitas, bukan menggantikan Auth Audit Logs Supabase." /><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-xs"><thead><tr className="border-b text-left text-slate-500"><th className="p-3">Waktu</th><th className="p-3">Pengguna</th><th className="p-3">Event</th><th className="p-3">AAL</th><th className="p-3">User Agent</th></tr></thead><tbody className="divide-y">{events.map((item) => <tr key={item.id}><td className="p-3">{formatDateTime(item.created_at)}</td><td className="p-3 font-black">{item.user_email || item.user_id}</td><td className="p-3"><FullSuiteBadge>{item.event_type}</FullSuiteBadge></td><td className="p-3">{item.aal || "-"}</td><td className="p-3 max-w-md truncate" title={item.user_agent}>{item.user_agent || "-"}</td></tr>)}</tbody></table></div></Card>}
  </div>;
}

function AttachmentsLibraryPage({ session, profile }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("production");
  const [entityId, setEntityId] = useState("");
  const load = async () => {
    const { data, error } = await supabase.from("attachments").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return alert(errorText(error));
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);
  const openFile = async (item: any) => {
    const { data, error } = await supabase.storage.from("production-files").createSignedUrl(item.storage_path, 120);
    if (error) return alert(errorText(error));
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const filtered = items.filter((item) => !search || [item.file_name, item.entity_type, item.entity_id, item.mime_type].join(" ").toUpperCase().includes(search.toUpperCase()));
  return <div className="space-y-6"><Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Tambah Lampiran ke Entitas" subtitle="Bucket private; akses file diberikan melalui signed URL berumur pendek." /><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><FullSuiteInput label="Jenis Entitas"><select value={entityType} onChange={(e) => setEntityType(e.target.value)} className={INPUT_CLASS}>{["production", "quality", "work_order", "batch", "shift_closure", "change_request"].map((item) => <option key={item}>{item}</option>)}</select></FullSuiteInput><FullSuiteInput label="ID Entitas"><input value={entityId} onChange={(e) => setEntityId(e.target.value)} className={INPUT_CLASS} /></FullSuiteInput><div className="flex items-end"><button onClick={load} className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-black">Refresh Library</button></div></div>{entityId && <div className="mt-5"><AttachmentManager session={session} profile={profile} entityType={entityType} entityId={entityId} /></div>}</Card>
    <Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Library Lampiran" subtitle="Cari berdasarkan nama, tipe entitas, ID, atau MIME type." action={<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari lampiran..." className={INPUT_CLASS} />} /><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{filtered.map((item) => <button key={item.id} onClick={() => openFile(item)} className="rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50"><p className="text-xs font-black text-slate-900 truncate">{item.file_name}</p><p className="mt-1 text-[10px] font-bold text-slate-500">{item.entity_type} #{item.entity_id}</p><p className="mt-2 text-[9px] font-bold text-slate-400">{item.mime_type || "file"} • {numberValue(item.size_bytes).toLocaleString("id-ID")} byte</p></button>)}{!filtered.length && <p className="col-span-full py-10 text-center text-xs font-bold text-slate-400">Tidak ada lampiran.</p>}</div></Card></div>;
}

function OperationsOverviewPage({ onOpen, profile }: any) {
  const [stats, setStats] = useState({ today: 0, target: 0, reject: 0, openOrders: 0, pendingApprovals: 0, openShifts: 0 });
  const load = async () => {
    const today = jakartaDateKey();
    const [production, targets, quality, orders, approvals, shifts] = await Promise.all([
      supabase.from("production_data").select("quantity").eq("date", today).is("deleted_at", null),
      supabase.from("production_targets").select("target_quantity").eq("target_date", today),
      supabase.from("production_quality").select("reject_quantity").eq("inspection_date", today),
      supabase.from("work_orders").select("id", { count: "exact", head: true }).in("status", ["PLANNED", "IN_PROGRESS", "PAUSED"]),
      supabase.from("change_requests").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("shift_closures").select("id", { count: "exact", head: true }).not("status", "eq", "CLOSED")
    ]);
    setStats({ today: (production.data || []).reduce((sum, row) => sum + numberValue(row.quantity), 0), target: (targets.data || []).reduce((sum, row) => sum + numberValue(row.target_quantity), 0), reject: (quality.data || []).reduce((sum, row) => sum + numberValue(row.reject_quantity), 0), openOrders: orders.count || 0, pendingApprovals: approvals.count || 0, openShifts: shifts.count || 0 });
  };
  useEffect(() => { load(); }, []);
  const modules = [
    ["targets", "Target vs Aktual", "Tetapkan target per tanggal, shift, produk, dan WO.", "🎯"],
    ["quality", "Quality Control", "Good, reject, rework, defect, dan corrective action.", "✅"],
    ["workorders", "Work Order & Batch", "Traceability, barcode, mesin, line, dan customer.", "🏷️"],
    ["shift", "Shift Closing", "Ringkasan dan serah terima dengan review supervisor.", "🕘"],
    ["approvals", "Approval & Trash", "Persetujuan perubahan, restore, dan purge terkontrol.", "🛡️"],
    ["master", "Master Data", "Standarisasi produk, warna, mesin, line, dan defect.", "🗂️"],
    ["notifications", "Notification Center", "Peringatan operasional yang persisten dan realtime.", "🔔"],
    ["attachments", "Lampiran", "Foto reject, bukti produksi, dokumen WO, dan lainnya.", "📎"],
    ["reports", "Laporan Otomatis", "Arsip, email, webhook, Telegram, atau WhatsApp provider.", "📨"],
    ["users", "Pengguna & Keamanan", "Role, status akun, undangan, login events, dan MFA.", "👥"]
  ].filter(([key]) => key !== "reports" || ["admin", "supervisor", "auditor"].includes(profile?.role));
  return <div className="space-y-6"><div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><FullSuiteStat label="Produksi Hari Ini" value={stats.today.toLocaleString("id-ID")} tone="blue" /><FullSuiteStat label="Target Hari Ini" value={stats.target.toLocaleString("id-ID")} tone="violet" /><FullSuiteStat label="Reject Hari Ini" value={stats.reject.toLocaleString("id-ID")} tone="red" /><FullSuiteStat label="WO Aktif" value={stats.openOrders} tone="green" /><FullSuiteStat label="Approval Pending" value={stats.pendingApprovals} tone="amber" /><FullSuiteStat label="Shift Terbuka" value={stats.openShifts} tone="slate" /></div><Card className="p-5 md:p-7"><FullSuiteSectionTitle title="Operations Suite" subtitle="Semua modul bersifat additive dan memiliki tabel, state, serta RLS tersendiri." action={<button onClick={load} className={SMALL_BUTTON}>Refresh</button>} /><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{modules.map(([key, title, description, icon]) => <button key={key} onClick={() => onOpen(key)} className="rounded-2xl border border-slate-200 p-5 text-left hover:border-blue-300 hover:bg-blue-50/30 transition-all"><span className="text-2xl">{icon}</span><p className="mt-3 text-sm font-black text-slate-900">{title}</p><p className="mt-2 text-[11px] font-bold text-slate-500 leading-relaxed">{description}</p></button>)}</div></Card></div>;
}

function OperationsSuitePage({ session, profile, initialModule = "overview" }: any) {
  const [module, setModule] = useState(initialModule);
  useEffect(() => setModule(initialModule), [initialModule]);
  const allModules = [
    ["overview", "Ringkasan"], ["targets", "Target"], ["quality", "QC"], ["workorders", "WO & Batch"], ["shift", "Shift"], ["approvals", "Approval"], ["master", "Master"], ["notifications", "Notifikasi"], ["attachments", "Lampiran"], ["reports", "Laporan"], ["users", "Pengguna"]
  ];
  const allowed = allModules.filter(([key]) => {
    if (key === "approvals" && profile?.role === "viewer") return false;
    if (key === "reports" && !["admin", "supervisor", "auditor"].includes(profile?.role)) return false;
    if (key === "master" && !["admin", "supervisor", "operator", "qc"].includes(profile?.role)) return false;
    return true;
  });
  return <div className="space-y-5"><div className="overflow-x-auto"><div className="inline-flex min-w-full lg:min-w-0 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">{allowed.map(([key, label]) => <button key={key} onClick={() => setModule(key)} className={`shrink-0 flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black transition-all ${module === key ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-900"}`}>{label}</button>)}</div></div>
    {module === "overview" && <OperationsOverviewPage onOpen={setModule} profile={profile} />}
    {module === "targets" && <ProductionTargetsPage session={session} profile={profile} />}
    {module === "quality" && <QualityControlPage session={session} profile={profile} />}
    {module === "workorders" && <WorkOrdersPage session={session} profile={profile} />}
    {module === "shift" && <ShiftClosingPage session={session} profile={profile} />}
    {module === "approvals" && <ApprovalsAndTrashPage session={session} profile={profile} />}
    {module === "master" && <MasterDataPage session={session} profile={profile} />}
    {module === "notifications" && <NotificationsCenterPage session={session} profile={profile} />}
    {module === "attachments" && <AttachmentsLibraryPage session={session} profile={profile} />}
    {module === "reports" && <ScheduledReportsPage session={session} profile={profile} />}
    {module === "users" && <UsersAndSecurityPage session={session} profile={profile} />}
  </div>;
}

/** MAIN APPLICATION WITH FULL OPERATIONS SUITE **/
function ProductionSystem() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [language, setLanguage] = useState(() => localStorage.getItem("app_lang") || "id");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("buymore_dark_mode") === "true");
  const [activeTab, setActiveTab] = useState("production");
  const [operationsInitial, setOperationsInitial] = useState("overview");
  const online = useOnlineStatus();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productionRefresh, setProductionRefresh] = useState(0);
  const [form, setForm] = useState({ date: jakartaDateKey(), color: "", shift: "Siang", product: "", quantity: "", note: "" });
  const [advanced, setAdvanced] = useState<ProductionAdvancedFields>(DEFAULT_ADVANCED_FIELDS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterShift, setFilterShift] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);
  const [editingId, setEditingId] = useState<any>(null);
  const [tempNote, setTempNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [newEntryAlert, setNewEntryAlert] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(["date", "time", "shift", "product", "qty", "note", "user", "actions"]);
  const noteUpdateInFlightRef = React.useRef<Set<any>>(new Set());
  const realtimeTimerRef = React.useRef<number | null>(null);

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(0);
  const [logsLimit] = useState(30);
  const [logsSnapshotId, setLogsSnapshotId] = useState<any>(null);
  const [logSearch, setLogSearch] = useState("");

  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [productionPresets, setProductionPresets] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<Record<string, any>>({});

  const text = {
    id: {
      title: "PRODUCTION BUYMORE", add: "Input Produksi", result: "Hasil Produksi", date: "Tanggal", time: "Waktu", color: "Warna", shift: "Shift", product: "Produk", qty: "Qty", note: "Catatan", save: "Simpan Data", saveMore: "Simpan & Tambah Lagi", export: "Export Excel", delete: "Hapus", day: "Siang", night: "Malam", allShift: "Semua Shift", loading: "Sinkronisasi Cloud...", empty: "Tidak ada data.", incomplete: "Data belum lengkap.", noData: "Tidak ada data untuk kriteria ini.", notif: "Data Baru Masuk!", show: "Tampilkan", logout: "Log Out", enter: "Masuk Sistem", total: "TOTAL PRODUKSI", user: "Pengguna", navProd: "Produksi", navAnalytics: "Analisis", navOps: "Operasional", navLogs: "Log Aktivitas", logTime: "Waktu Sistem", logAction: "Tipe", logDesc: "Deskripsi", logEmpty: "Belum ada riwayat aktivitas." 
    },
    cn: {
      title: "BUYMORE 生产中心", add: "生产输入", result: "生产结果", date: "日期", time: "时间", color: "颜色", shift: "班次", product: "产品", qty: "数量", note: "备注", save: "保存数据", saveMore: "保存并继续", export: "导出 Excel", delete: "删除", day: "白班", night: "夜班", allShift: "所有班次", loading: "同步中...", empty: "没有数据。", incomplete: "数据不完整。", noData: "该条件没有数据。", notif: "新数据已输入!", show: "显示", logout: "登出", enter: "进入系统", total: "总生产量", user: "记录员", navProd: "生产看板", navAnalytics: "数据分析", navOps: "运营中心", navLogs: "操作日志", logTime: "系统时间", logAction: "类型", logDesc: "详细说明", logEmpty: "暂无操作日志。"
    }
  };
  const t = text[language as keyof typeof text];
  const role = profile?.role || "operator";
  const canWriteProduction = ["admin", "supervisor", "operator"].includes(role);
  const canDeleteProduction = ["admin", "supervisor", "operator"].includes(role);
  const canEditNote = ["admin", "supervisor", "operator"].includes(role);
  const setting = (key: string, fallback: any) => Object.prototype.hasOwnProperty.call(appSettings, key) ? appSettings[key] : fallback;
  const cacheKey = session?.user?.id ? `cached_production_records:${session.user.id}` : "";
  const draftKey = session?.user?.id ? `production_draft:${session.user.id}` : "";
  const queueKey = session?.user?.id ? `production_offline_queue:${session.user.id}` : "";
  const columnsKey = session?.user?.id ? `production_columns:${session.user.id}` : "";

  const loadProfile = async (activeSession: any) => {
    if (!activeSession?.user?.id) { setProfile(null); return; }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", activeSession.user.id).maybeSingle();
    if (error) console.error("Gagal memuat profil:", error);
    const fallback: AppProfile = { id: activeSession.user.id, email: activeSession.user.email, full_name: activeSession.user.user_metadata?.full_name || activeSession.user.email, role: "operator", is_active: true };
    const nextProfile = (data || fallback) as AppProfile;
    if (nextProfile.is_active === false) {
      alert("Akun ini dinonaktifkan administrator.");
      await supabase.auth.signOut();
      return;
    }
    setProfile(nextProfile);
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!active) return;
      setSession(initialSession);
      await loadProfile(initialSession);
      if (active) setAuthLoading(false);
    }).catch((error) => {
      console.error("Session awal tidak dapat dimuat:", error);
      if (active) setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      window.setTimeout(() => {
        if (!active) return;
        void (async () => {
          await loadProfile(nextSession);
          if (nextSession?.user?.id && ["SIGNED_IN", "TOKEN_REFRESHED", "MFA_CHALLENGE_VERIFIED"].includes(event)) {
            const aalResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            await supabase.from("app_login_events").insert({ user_id: nextSession.user.id, user_email: nextSession.user.email, event_type: event, aal: aalResult.data?.currentLevel || null, user_agent: navigator.userAgent });
          }
        })();
      }, 0);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    localStorage.setItem("app_lang", language);
    localStorage.setItem("buymore_dark_mode", String(darkMode));
  }, [language, darkMode]);

  useEffect(() => {
    if (!session?.user?.id) return;
    try {
      const cached = safeJson(localStorage.getItem(cacheKey), []);
      if (Array.isArray(cached) && cached.length) { setRecords(cached); setLoading(false); }
      const draft = safeJson(localStorage.getItem(draftKey), null);
      if (draft?.form) setForm({ ...form, ...draft.form });
      if (draft?.advanced) setAdvanced({ ...DEFAULT_ADVANCED_FIELDS, ...draft.advanced });
      const queued = safeJson(localStorage.getItem(queueKey), []);
      setOfflineQueue(Array.isArray(queued) ? queued : []);
      const storedColumns = safeJson(localStorage.getItem(columnsKey), null);
      if (Array.isArray(storedColumns) && storedColumns.length) setVisibleColumns(storedColumns);
    } catch (error) { console.error("Cache pengguna tidak dapat dibaca:", error); }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!draftKey) return;
    localStorage.setItem(draftKey, JSON.stringify({ form, advanced, saved_at: new Date().toISOString() }));
  }, [form, advanced, draftKey]);
  useEffect(() => { if (columnsKey) localStorage.setItem(columnsKey, JSON.stringify(visibleColumns)); }, [visibleColumns, columnsKey]);

  const loadSupportingData = async () => {
    if (!session) return;
    const [masterResult, orderResult, batchResult, favoriteResult, settingsResult] = await Promise.all([
      supabase.from("master_items").select("*").eq("is_active", true).order("name"),
      supabase.from("work_orders").select("*").in("status", ["PLANNED", "IN_PROGRESS", "PAUSED"]).order("code"),
      supabase.from("production_batches").select("*").eq("status", "OPEN").order("batch_code"),
      supabase.from("user_favorites").select("*").eq("user_id", session.user.id).in("item_type", ["PRODUCT", "PRODUCTION_PRESET"]).order("created_at", { ascending: false }),
      supabase.from("app_settings").select("key,value")
    ]);
    setMasterItems((masterResult.data || []) as MasterItem[]);
    setWorkOrders(orderResult.data || []);
    setBatches(batchResult.data || []);
    const preferenceRows = favoriteResult.data || [];
    setFavorites(preferenceRows.filter((item: any) => item.item_type === "PRODUCT"));
    setProductionPresets(preferenceRows.filter((item: any) => item.item_type === "PRODUCTION_PRESET"));
    const nextSettings: Record<string, any> = {};
    (settingsResult.data || []).forEach((item: any) => { nextSettings[item.key] = safeJson(item.value, item.value); });
    setAppSettings(nextSettings);
  };
  useEffect(() => { loadSupportingData(); }, [session?.user?.id]);

  const persistRecords = (next: any[]) => {
    setRecords(next);
    if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(next));
  };

  const fetchData = async () => {
    if (!session) return;
    if (!records.length) setLoading(true);
    const from = currentPage * displayLimit;
    const to = from + displayLimit - 1;
    let query = supabase.from("production_data").select("*").is("deleted_at", null).order("id", { ascending: false });
    if (filterDate) query = query.eq("date", filterDate);
    else query = query.range(from, to);
    const { data, error } = await query;
    if (error) console.error("Gagal sinkronisasi produksi:", error);
    else if (data) persistRecords(data);
    setLoading(false);
  };

  const fetchLogs = async (resetSnapshot = false) => {
    if (!session) return;
    setLogsLoading(true);
    let snapshot = resetSnapshot ? null : logsSnapshotId;
    if (!snapshot) {
      const { data: newest } = await supabase.from("activity_logs").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
      snapshot = newest?.id || null;
      setLogsSnapshotId(snapshot);
    }
    const from = logsPage * logsLimit;
    const to = from + logsLimit - 1;
    let query = supabase.from("activity_logs").select("*").order("id", { ascending: false }).range(from, to);
    if (snapshot) query = query.lte("id", snapshot);
    const safeSearch = logSearch.trim().replace(/[,%()]/g, " ");
    if (safeSearch) query = query.ilike("description", `%${safeSearch}%`);
    const { data, error } = await query;
    if (error) console.error("Gagal memuat Audit Log:", error);
    else setLogs(data || []);
    setLogsLoading(false);
  };

  useEffect(() => {
    if (!session) return;
    if (activeTab === "production") fetchData();
    if (activeTab === "logs") fetchLogs(false);
  }, [activeTab, currentPage, logsPage, session?.user?.id, filterDate, displayLimit, productionRefresh, logSearch]);

  useEffect(() => {
    if (!session?.user?.id) return;
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    const productionChannel = supabase.channel(`realtime-production-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "production_data" }, (payload: any) => {
        if (realtimeTimerRef.current) window.clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = window.setTimeout(() => setProductionRefresh((value) => value + 1), 180);
        if (payload.eventType === "INSERT" && payload.new?.deleted_at == null) {
          setNewEntryAlert(`${payload.new.product} - ${payload.new.quantity} Pcs`);
          try { new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3").play().catch(() => {}); } catch { /* audio optional */ }
          if (document.hidden && "Notification" in window && Notification.permission === "granted") new Notification(t.notif, { body: `${payload.new.product} - ${payload.new.quantity} Pcs` });
          window.setTimeout(() => setNewEntryAlert(null), 12000);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => {
        if (activeTab === "logs" && logsPage === 0) { setLogsSnapshotId(null); window.setTimeout(() => fetchLogs(true), 100); }
      })
      .subscribe();
    const supportChannel = supabase.channel(`realtime-support-${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "master_items" }, loadSupportingData)
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, loadSupportingData)
      .on("postgres_changes", { event: "*", schema: "public", table: "production_batches" }, loadSupportingData)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, loadSupportingData)
      .subscribe();
    return () => {
      if (realtimeTimerRef.current) window.clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(productionChannel);
      supabase.removeChannel(supportChannel);
    };
  }, [session?.user?.id, language, activeTab, logsPage]);

  const saveQueue = (next: any[]) => {
    setOfflineQueue(next);
    if (queueKey) localStorage.setItem(queueKey, JSON.stringify(next));
  };
  const enqueueOffline = (payload: any) => {
    const next = [...offlineQueue, { id: payload.client_request_id, payload, queued_at: new Date().toISOString(), attempts: 0 }];
    saveQueue(next);
  };
  const flushOfflineQueue = async () => {
    if (!online || !session || !offlineQueue.length) return;
    const remaining: any[] = [];
    for (const item of offlineQueue) {
      const { error } = await supabase.from("production_data").insert(item.payload);
      if (error && error.code !== "23505") remaining.push({ ...item, attempts: numberValue(item.attempts) + 1, last_error: error.message });
    }
    saveQueue(remaining);
    if (remaining.length !== offlineQueue.length) setProductionRefresh((value) => value + 1);
  };
  useEffect(() => { flushOfflineQueue(); }, [online, session?.user?.id, offlineQueue.length]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/production-sw.js").catch((error) => console.warn("Service Worker tidak aktif:", error));
  }, []);

  const handleLogin = async (event: any) => {
    event.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passcode });
    if (error) { setLoginError(error.message); setPasscode(""); }
  };
  const handleLogout = async () => {
    if (session?.user?.id) supabase.from("app_login_events").insert({ user_id: session.user.id, user_email: session.user.email, event_type: "SIGNED_OUT", user_agent: navigator.userAgent }).then(() => {});
    setRecords([]); setProfile(null); setOfflineQueue([]);
    await supabase.auth.signOut();
  };

  const duplicateExists = async (payload: any) => {
    if (!setting("enable_duplicate_check", true)) return false;
    const minutes = Math.max(numberValue(setting("duplicate_window_minutes", 5)), 1);
    const threshold = new Date(Date.now() - minutes * 60_000).toISOString();
    const { data } = await supabase.from("production_data").select("id,created_at,created_by").eq("date", payload.date).eq("shift", payload.shift).eq("product", payload.product).eq("quantity", payload.quantity).is("deleted_at", null).gte("created_at", threshold).limit(1);
    return Boolean(data?.length);
  };

  const buildProductionPayload = () => ({
    date: form.date,
    time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }),
    color: upperText(form.color), shift: form.shift, product: upperText(form.product), quantity: Math.floor(numberValue(form.quantity)), note: upperText(form.note),
    created_by: currentUserName(session, profile), client_request_id: makeUuid(),
    work_order_id: advanced.work_order_id || null, batch_id: advanced.batch_id || null,
    machine_code: upperText(advanced.machine_code) || null, line_code: upperText(advanced.line_code) || null,
    source: advanced.source || "MANUAL", metadata: { language, user_id: session?.user?.id }
  });

  const handleSubmit = async (keepContext = false) => {
    if (submitting) return;
    if (!canWriteProduction) return alert("Role Anda tidak memiliki izin input produksi.");
    if (!form.date || !form.product.trim() || numberValue(form.quantity) <= 0) return alert(t.incomplete);
    const payload = buildProductionPayload();
    setSubmitting(true);
    try {
      if (!online) {
        enqueueOffline(payload);
        alert("Perangkat offline. Data masuk antrean dan akan dikirim otomatis setelah terhubung.");
      } else {
        if (await duplicateExists(payload)) {
          const proceed = window.confirm("Ditemukan data sangat mirip dalam beberapa menit terakhir. Tetap simpan?");
          if (!proceed) return;
        }
        const { error } = await supabase.from("production_data").insert(payload);
        if (error) throw error;
      }
      localStorage.setItem(`last_production_entry:${session.user.id}`, JSON.stringify({ form, advanced }));
      setForm((previous) => keepContext ? { ...previous, quantity: "", note: "" } : { ...previous, color: "", product: "", quantity: "", note: "" });
      if (!keepContext) setAdvanced(DEFAULT_ADVANCED_FIELDS);
      setProductionRefresh((value) => value + 1);
    } catch (error) {
      const message = errorText(error);
      if (!navigator.onLine || /network|fetch/i.test(message)) {
        enqueueOffline(payload);
        alert("Koneksi gagal. Data diamankan ke antrean offline.");
      } else alert(message);
    } finally { setSubmitting(false); }
  };

  const repeatLastEntry = () => {
    const last = safeJson(localStorage.getItem(`last_production_entry:${session?.user?.id}`), null);
    if (!last?.form) return alert("Belum ada entri terakhir.");
    setForm({ ...last.form, date: jakartaDateKey(), quantity: "", note: "" });
    setAdvanced({ ...DEFAULT_ADVANCED_FIELDS, ...(last.advanced || {}) });
  };
  const clearDraft = () => {
    setForm({ date: jakartaDateKey(), color: "", shift: "Siang", product: "", quantity: "", note: "" });
    setAdvanced(DEFAULT_ADVANCED_FIELDS);
    if (draftKey) localStorage.removeItem(draftKey);
  };

  const handleUpdateNote = async (record: any) => {
    if (!canEditNote || noteUpdateInFlightRef.current.has(record.id)) return;
    const nextNote = upperText(tempNote);
    if (nextNote === upperText(record.note)) { setEditingId(null); return; }
    noteUpdateInFlightRef.current.add(record.id);
    try {
      const reason = setting("enforce_change_approval", true) && !isManagerRole(role) ? (window.prompt("Alasan perubahan catatan:", "KOREKSI CATATAN") || "KOREKSI CATATAN") : "DIRECT UPDATE";
      const { data, error } = await supabase.rpc("request_production_note_change", { p_production_id: Number(record.id), p_expected_version: Number(record.version || 1), p_new_note: nextNote, p_reason: reason });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.status === "PENDING") alert("Permintaan perubahan dikirim untuk persetujuan supervisor.");
      else setProductionRefresh((value) => value + 1);
      setEditingId(null);
    } catch (error) { alert(errorText(error)); }
    finally { noteUpdateInFlightRef.current.delete(record.id); }
  };

  const handleDelete = async (record: any) => {
    if (!canDeleteProduction || deletingIds.has(String(record.id))) return;
    const reason = window.prompt(`Alasan menghapus ${record.product} - ${record.quantity} Pcs:`, "SALAH INPUT");
    if (reason === null || !reason.trim()) return;
    setDeletingIds((previous) => new Set([...previous, String(record.id)]));
    try {
      const { data, error } = await supabase.rpc("request_production_delete", { p_production_id: Number(record.id), p_expected_version: Number(record.version || 1), p_reason: reason.trim() });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.status === "PENDING") alert("Permintaan penghapusan dikirim untuk persetujuan supervisor.");
      setProductionRefresh((value) => value + 1);
    } catch (error) { alert(errorText(error)); }
    finally { setDeletingIds((previous) => { const next = new Set(previous); next.delete(String(record.id)); return next; }); }
  };

  const toggleFavorite = async (product: string) => {
    if (!product || !session) return;
    const existing = favorites.find((item) => item.item_value === product);
    if (existing) await supabase.from("user_favorites").delete().eq("id", existing.id);
    else await supabase.from("user_favorites").insert({ user_id: session.user.id, item_type: "PRODUCT", item_value: product });
    await loadSupportingData();
  };

  const saveProductionPreset = async () => {
    if (!session?.user?.id) return;
    const name = window.prompt("Nama preset produksi:", form.product ? `${upperText(form.product)} ${form.shift}` : "PRESET BARU");
    if (!name?.trim()) return;
    const preset = {
      name: name.trim().slice(0, 80),
      form: { color: upperText(form.color), shift: form.shift, product: upperText(form.product), note: upperText(form.note) },
      advanced: { ...advanced }
    };
    const { error } = await supabase.from("user_favorites").insert({
      user_id: session.user.id,
      item_type: "PRODUCTION_PRESET",
      item_value: JSON.stringify(preset)
    });
    if (error) return alert(errorText(error));
    await loadSupportingData();
  };

  const applyProductionPreset = (item: any) => {
    const preset = safeJson(item?.item_value, null);
    if (!preset?.form) return alert("Preset tidak valid.");
    setForm((previous) => ({ ...previous, ...preset.form, date: previous.date || jakartaDateKey(), quantity: "" }));
    setAdvanced({ ...DEFAULT_ADVANCED_FIELDS, ...(preset.advanced || {}) });
  };

  const removeProductionPreset = async (id: any) => {
    if (!window.confirm("Hapus preset ini?")) return;
    const { error } = await supabase.from("user_favorites").delete().eq("id", id).eq("user_id", session.user.id);
    if (error) return alert(errorText(error));
    await loadSupportingData();
  };

  const applyScannedValue = (raw: string) => {
    const value = raw.trim();
    if (value.toUpperCase().startsWith("WO:")) {
      const code = value.slice(3).trim().toUpperCase();
      const order = workOrders.find((item) => upperText(item.code) === code);
      if (!order) return alert(`Work Order ${code} tidak ditemukan atau tidak aktif.`);
      setAdvanced({ work_order_id: order.id, batch_id: "", machine_code: order.machine_code || "", line_code: order.line_code || "", source: "BARCODE" });
      setForm((previous) => ({ ...previous, product: order.product || previous.product, color: order.color || previous.color }));
      return;
    }
    if (value.toUpperCase().startsWith("BATCH:")) {
      const code = value.slice(6).trim().toUpperCase();
      const batch = batches.find((item) => upperText(item.batch_code) === code);
      if (!batch) return alert(`Batch ${code} tidak ditemukan atau tidak aktif.`);
      setAdvanced((previous) => ({ ...previous, batch_id: batch.id, work_order_id: batch.work_order_id || previous.work_order_id, source: "BARCODE" }));
      setForm((previous) => ({ ...previous, product: batch.product || previous.product, color: batch.color || previous.color }));
      return;
    }
    setForm((previous) => ({ ...previous, product: upperText(value) }));
    setAdvanced((previous) => ({ ...previous, source: "BARCODE" }));
  };

  const getFilteredRecords = () => records.filter((row) => {
    const matchDate = filterDate ? row.date === filterDate : true;
    const matchShift = filterShift === "Semua" ? true : row.shift === filterShift;
    const search = searchQuery.toUpperCase();
    const matchSearch = !search || [row.product, row.color, row.note, row.created_by, row.machine_code, row.line_code].some((value) => upperText(value).includes(search));
    return matchDate && matchShift && matchSearch;
  });

  const handleExport = () => {
    if (role === "viewer" && setting("restrict_viewer_export", true)) return alert("Export dibatasi untuk role Viewer.");
    const rows = getFilteredRecords();
    if (!rows.length) return alert(t.noData);
    const total = rows.reduce((sum, row) => sum + numberValue(row.quantity), 0);
    const data = rows.map((row) => ({ Tanggal: row.date, Waktu: row.time, Shift: row.shift, Produk: row.product, Warna: row.color, Quantity: row.quantity, Catatan: row.note, Operator: row.created_by, Work_Order: row.work_order_id || "", Batch: row.batch_id || "", Mesin: row.machine_code || "", Line: row.line_code || "" }));
    data.push({ Produk: "TOTAL", Quantity: total } as any);
    const sheet = XLSX.utils.json_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Produksi");
    XLSX.writeFile(book, `Laporan_Produksi_${filterDate || jakartaDateKey()}.xlsx`);
  };

  const productOptions = masterItems.filter((item) => item.category === "PRODUCT");
  const colorOptions = masterItems.filter((item) => item.category === "COLOR");
  const machineOptions = masterItems.filter((item) => item.category === "MACHINE");
  const lineOptions = masterItems.filter((item) => item.category === "LINE");
  const filteredRecords = getFilteredRecords();
  const totalFiltered = filteredRecords.reduce((sum, item) => sum + numberValue(item.quantity), 0);
  const allColumnOptions = [
    ["date", t.date], ["time", t.time], ["shift", t.shift], ["product", t.product], ["qty", t.qty], ["note", t.note], ["user", t.user], ["work_order", "Work Order"], ["batch", "Batch"], ["machine", "Mesin"], ["line", "Line"], ["actions", "Aksi"]
  ];
  const hasColumn = (key: string) => visibleColumns.includes(key);

  if (authLoading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 bg-slate-50">SYNCING...</div>;
  if (!session) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden p-4">
      <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] bg-blue-600/20 rounded-full blur-[130px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[55%] h-[55%] bg-violet-600/20 rounded-full blur-[130px]" />
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[36px] p-7 md:p-10 shadow-2xl">
          <div className="text-center mb-8"><div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-6"><span className="text-white font-black text-4xl italic">B</span></div><h1 className="text-2xl font-black text-white tracking-tighter uppercase">{t.title}</h1><p className="text-[10px] font-bold text-blue-300 tracking-[0.3em] uppercase mt-2">Private Production Cloud</p></div>
          <form onSubmit={handleLogin} className="space-y-4"><FullSuiteInput label={<span className="text-blue-200">Registered Email</span>}><input type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="name@buymore.com" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:bg-white/10 focus:border-blue-500/50 placeholder:text-white/20" /></FullSuiteInput><FullSuiteInput label={<span className="text-blue-200">Security Passcode</span>}><input type="password" required value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:bg-white/10 focus:border-blue-500/50 placeholder:text-white/20 text-center tracking-[0.3em]" /></FullSuiteInput>{loginError && <p className="text-center text-red-400 text-[10px] font-black">{loginError}</p>}<Button type="submit" className="w-full py-4 tracking-widest">{t.enter}</Button></form>
          <div className="mt-8 flex justify-center gap-4 border-t border-white/10 pt-6"><button onClick={() => setLanguage("id")} className="text-[10px] font-black text-white/50 hover:text-white">INDONESIA</button><button onClick={() => setLanguage("cn")} className="text-[10px] font-black text-white/50 hover:text-white">CHINESE</button></div>
        </div>
      </div>
    </div>
  );

  return (
    <AppErrorBoundary>
      <div className={`min-h-screen pb-12 font-sans text-slate-800 antialiased relative ${darkMode ? "full-suite-dark bg-slate-950" : "bg-[#E3E1E1]"}`}>
        <style>{`
          .full-suite-dark { color: #e2e8f0; }
          .full-suite-dark .bg-white { background-color: #0f172a !important; }
          .full-suite-dark .bg-slate-50, .full-suite-dark .bg-slate-50\/40, .full-suite-dark .bg-slate-50\/50, .full-suite-dark .bg-slate-50\/60 { background-color: #111c31 !important; }
          .full-suite-dark .text-slate-900, .full-suite-dark .text-slate-800, .full-suite-dark .text-slate-700, .full-suite-dark .text-slate-600 { color: #e2e8f0 !important; }
          .full-suite-dark .text-slate-500, .full-suite-dark .text-slate-400 { color: #94a3b8 !important; }
          .full-suite-dark .border-slate-100, .full-suite-dark .border-slate-200 { border-color: #334155 !important; }
          .full-suite-dark input, .full-suite-dark select, .full-suite-dark textarea { color: #e2e8f0; background-color: #111c31 !important; border-color: #334155 !important; }
          .full-suite-dark table tr:hover { background-color: #17233a !important; }
          @media print { .full-suite-app-header, .full-suite-statusbar { display: none !important; } }
        `}</style>

        {newEntryAlert && <div className="fixed top-24 right-4 md:right-6 z-[9999] max-w-[calc(100vw-32px)]"><div className="bg-blue-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-white"><p className="text-[9px] font-black uppercase tracking-widest opacity-80">{t.notif}</p><p className="font-bold text-xs md:text-sm truncate">{newEntryAlert}</p></div></div>}

        <div className="full-suite-app-header sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
          <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-4 xl:h-20 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center justify-between gap-4 w-full xl:w-auto"><div className="flex items-center gap-3 min-w-0"><div className="w-11 h-11 bg-slate-950 rounded-2xl flex items-center justify-center shadow-xl shrink-0"><span className="text-white font-black text-2xl italic">B</span></div><div className="min-w-0"><h1 className="text-sm md:text-lg font-black text-slate-900 truncate uppercase">{t.title}</h1><div className="flex items-center gap-2"><p className="text-[9px] font-bold text-blue-500 uppercase truncate">{currentUserName(session, profile)}</p><FullSuiteBadge tone={role === "admin" ? "red" : role === "supervisor" ? "violet" : role === "qc" ? "green" : "blue"}>{ROLE_LABELS[role]}</FullSuiteBadge></div></div></div><div className="flex xl:hidden items-center gap-1.5"><NotificationBell session={session} onOpenCenter={() => { setOperationsInitial("notifications"); setActiveTab("operations"); }} /><button onClick={() => setDarkMode((value) => !value)} className="w-10 h-10 rounded-xl bg-slate-100" title="Mode tampilan">{darkMode ? "☀️" : "🌙"}</button><select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-10 bg-slate-100 border border-slate-200 rounded-xl px-2 text-[10px] font-black"><option value="id">ID</option><option value="cn">CN</option></select><button onClick={handleLogout} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 text-sm font-black" title={t.logout}>↪</button></div></div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] md:text-xs font-black w-full xl:w-auto overflow-x-auto">
              {[ ["production", t.navProd], ["analytics", t.navAnalytics], ["operations", t.navOps], ["logs", t.navLogs] ].map(([key, label]) => <button key={key} onClick={() => setActiveTab(key)} className={`flex-1 shrink-0 px-4 py-2.5 rounded-lg transition-all ${activeTab === key ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}
            </div>

            <div className="hidden xl:flex items-center gap-3"><PresenceIndicator session={session} /><NotificationBell session={session} onOpenCenter={() => { setOperationsInitial("notifications"); setActiveTab("operations"); }} /><button onClick={() => setDarkMode((value) => !value)} className="w-10 h-10 rounded-xl bg-slate-100">{darkMode ? "☀️" : "🌙"}</button><select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black"><option value="id">🇮🇩 ID</option><option value="cn">🇨🇳 CN</option></select><button onClick={handleLogout} className="text-[10px] font-black text-red-500 px-3 py-2 rounded-xl hover:bg-red-50">{t.logout}</button></div>
          </div>
        </div>

        <div className="full-suite-statusbar max-w-[1500px] mx-auto px-4 md:px-6 mt-4"><div className={`rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-black ${online ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-amber-50 border-amber-100 text-amber-700"}`}><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />{online ? "TERHUBUNG • REALTIME AKTIF" : "OFFLINE • DATA BARU AKAN MASUK ANTREAN"}</div><div className="flex items-center gap-3"><span>{offlineQueue.length} antrean offline</span>{online && offlineQueue.length > 0 && <button onClick={flushOfflineQueue} className="underline">Sinkronkan Sekarang</button>}</div></div></div>

        <main className="max-w-[1500px] mx-auto px-4 md:px-6 mt-6 md:mt-8">
          {activeTab === "production" && <div className="space-y-6 md:space-y-8">
            <Card className="p-5 md:p-8 border-l-8 border-l-blue-600">
              <FullSuiteSectionTitle title={t.add} subtitle="Draft otomatis, autocomplete master data, deteksi duplikat, barcode, work order, batch, dan antrean offline." action={<div className="flex flex-wrap gap-2"><button onClick={repeatLastEntry} className={SMALL_BUTTON}>Ulangi Entri Terakhir</button><button onClick={saveProductionPreset} className={SMALL_BUTTON}>Simpan Preset</button><button onClick={() => setScannerOpen(true)} className={SMALL_BUTTON}>Scan QR/Barcode</button><button onClick={clearDraft} className={SMALL_BUTTON}>Bersihkan Draft</button></div>} />
              {productionPresets.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-2"><span className="text-[9px] font-black text-slate-400 uppercase">Preset:</span>{productionPresets.map((item) => { const preset = safeJson(item.item_value, {}); return <span key={item.id} className="inline-flex items-center rounded-full bg-violet-50 border border-violet-100 overflow-hidden"><button onClick={() => applyProductionPreset(item)} className="px-3 py-1.5 text-violet-700 text-[10px] font-black">⚡ {preset.name || "Preset"}</button><button onClick={() => removeProductionPreset(item.id)} className="px-2 py-1.5 border-l border-violet-100 text-violet-400 hover:text-red-500 text-[10px] font-black" title="Hapus preset">✕</button></span>; })}</div>}
              {favorites.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-2"><span className="text-[9px] font-black text-slate-400 uppercase">Favorit:</span>{favorites.map((item) => <button key={item.id} onClick={() => setForm({ ...form, product: item.item_value })} className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black">★ {item.item_value}</button>)}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                <FullSuiteInput label={t.date}><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={INPUT_CLASS} /></FullSuiteInput>
                <FullSuiteInput label={t.color}><input list="production-colors" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className={`${INPUT_CLASS} uppercase`} /><datalist id="production-colors">{colorOptions.map((item) => <option key={item.id} value={item.name} />)}</datalist></FullSuiteInput>
                <FullSuiteInput label={t.shift}><select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} className={INPUT_CLASS}><option value="Siang">{t.day}</option><option value="Malam">{t.night}</option></select></FullSuiteInput>
                <FullSuiteInput label={t.product}><div className="relative"><input list="production-products" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className={`${INPUT_CLASS} pr-12 uppercase`} /><button type="button" onClick={() => toggleFavorite(upperText(form.product))} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 text-lg" title="Favorit">★</button></div><datalist id="production-products">{productOptions.map((item) => <option key={item.id} value={item.name} />)}</datalist></FullSuiteInput>
                <FullSuiteInput label={t.qty}><input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={`${INPUT_CLASS} font-black text-blue-700`} /></FullSuiteInput>
                <FullSuiteInput label={t.note}><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={`${INPUT_CLASS} uppercase`} /></FullSuiteInput>
                <div className="flex items-end"><Button disabled={submitting} onClick={() => handleSubmit(false)} className="w-full h-[48px]">{submitting ? "Menyimpan..." : t.save}</Button></div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-2"><button onClick={() => setAdvancedOpen((value) => !value)} className={SMALL_BUTTON}>{advancedOpen ? "Tutup Detail Lanjutan" : "Work Order, Batch, Mesin & Line"}</button><button disabled={submitting} onClick={() => handleSubmit(true)} className={`${SMALL_BUTTON} !bg-emerald-600 !text-white`}>{t.saveMore}</button></div>
              {advancedOpen && <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <FullSuiteInput label="Work Order"><select value={advanced.work_order_id} onChange={(e) => { const order = workOrders.find((item) => item.id === e.target.value); setAdvanced({ ...advanced, work_order_id: e.target.value, batch_id: "", machine_code: order?.machine_code || advanced.machine_code, line_code: order?.line_code || advanced.line_code }); if (order) setForm({ ...form, product: order.product || form.product, color: order.color || form.color }); }} className={INPUT_CLASS}><option value="">Tanpa Work Order</option>{workOrders.map((item) => <option key={item.id} value={item.id}>{item.code} • {item.product}</option>)}</select></FullSuiteInput>
                <FullSuiteInput label="Batch"><select value={advanced.batch_id} onChange={(e) => { const batch = batches.find((item) => item.id === e.target.value); setAdvanced({ ...advanced, batch_id: e.target.value, work_order_id: batch?.work_order_id || advanced.work_order_id }); if (batch) setForm({ ...form, product: batch.product || form.product, color: batch.color || form.color }); }} className={INPUT_CLASS}><option value="">Tanpa Batch</option>{batches.filter((item) => !advanced.work_order_id || item.work_order_id === advanced.work_order_id).map((item) => <option key={item.id} value={item.id}>{item.batch_code}</option>)}</select></FullSuiteInput>
                <FullSuiteInput label="Mesin"><input list="production-machines" value={advanced.machine_code} onChange={(e) => setAdvanced({ ...advanced, machine_code: e.target.value })} className={INPUT_CLASS} /><datalist id="production-machines">{machineOptions.map((item) => <option key={item.id} value={item.code} />)}</datalist></FullSuiteInput>
                <FullSuiteInput label="Line"><input list="production-lines" value={advanced.line_code} onChange={(e) => setAdvanced({ ...advanced, line_code: e.target.value })} className={INPUT_CLASS} /><datalist id="production-lines">{lineOptions.map((item) => <option key={item.id} value={item.code} />)}</datalist></FullSuiteInput>
                <FullSuiteInput label="Sumber"><select value={advanced.source} onChange={(e) => setAdvanced({ ...advanced, source: e.target.value })} className={INPUT_CLASS}><option>MANUAL</option><option>BARCODE</option><option>IMPORT</option><option>OFFLINE_SYNC</option></select></FullSuiteInput>
              </div>}
            </Card>

            <Card>
              <div className="px-5 md:px-8 py-5 border-b border-slate-100 bg-slate-50/40"><FullSuiteSectionTitle title={t.result} subtitle="Realtime INSERT/UPDATE/DELETE, detail histori, filter tersimpan, dan kolom yang dapat dipilih." action={<div className="flex flex-wrap gap-2"><SavedFiltersControl session={session} pageKey="production" filters={{ filterDate, filterShift, searchQuery, visibleColumns }} onApply={(value: any) => { setFilterDate(value.filterDate || ""); setFilterShift(value.filterShift || "Semua"); setSearchQuery(value.searchQuery || ""); if (Array.isArray(value.visibleColumns)) setVisibleColumns(value.visibleColumns); setCurrentPage(0); }} /><button onClick={() => setShowColumns((value) => !value)} className={SMALL_BUTTON}>Kolom</button><button onClick={() => { setCurrentPage(0); setProductionRefresh((value) => value + 1); }} className={SMALL_BUTTON}>Refresh</button></div>} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto] gap-2"><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari produk, warna, operator, mesin..." className={INPUT_CLASS} /><input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(0); }} className={INPUT_CLASS} /><select value={filterShift} onChange={(e) => setFilterShift(e.target.value)} className={INPUT_CLASS}><option value="Semua">{t.allShift}</option><option value="Siang">{t.day}</option><option value="Malam">{t.night}</option></select><Button onClick={handleExport} variant="success" className="text-xs">{t.export}</Button></div>
                {showColumns && <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 flex flex-wrap gap-2">{allColumnOptions.map(([key, label]) => <label key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-[10px] font-black"><input type="checkbox" checked={hasColumn(key)} onChange={(e) => setVisibleColumns((previous) => e.target.checked ? [...new Set([...previous, key])] : previous.filter((item) => item !== key))} />{label}</label>)}</div>}
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm text-left border-collapse"><thead><tr className="border-b border-slate-100 text-slate-700 font-black">{hasColumn("date") && <th className="px-5 py-4">{t.date}</th>}{hasColumn("time") && <th className="px-4 py-4">{t.time}</th>}{hasColumn("shift") && <th className="px-4 py-4">{t.shift}</th>}{hasColumn("product") && <th className="px-4 py-4">{t.product}</th>}{hasColumn("qty") && <th className="px-4 py-4 text-right">{t.qty}</th>}{hasColumn("note") && <th className="px-4 py-4">{t.note}</th>}{hasColumn("user") && <th className="px-4 py-4">{t.user}</th>}{hasColumn("work_order") && <th className="px-4 py-4">WO</th>}{hasColumn("batch") && <th className="px-4 py-4">Batch</th>}{hasColumn("machine") && <th className="px-4 py-4">Mesin</th>}{hasColumn("line") && <th className="px-4 py-4">Line</th>}{hasColumn("actions") && <th className="px-4 py-4"></th>}</tr></thead><tbody className="divide-y divide-slate-100">
                {loading && !records.length ? <tr><td colSpan={visibleColumns.length} className="px-5 py-24 text-center font-bold animate-pulse">{t.loading}</td></tr> : filteredRecords.map((row, index) => <tr key={row.id} className={`${index % 2 ? "bg-slate-50/60" : "bg-white"} hover:bg-blue-50/70 group`}>{hasColumn("date") && <td className="px-5 py-4 font-bold whitespace-nowrap">{row.date}</td>}{hasColumn("time") && <td className="px-4 py-4 font-bold whitespace-nowrap">{row.time}</td>}{hasColumn("shift") && <td className="px-4 py-4"><FullSuiteBadge tone={row.shift === "Siang" ? "amber" : "slate"}>{row.shift === "Siang" ? t.day : t.night}</FullSuiteBadge></td>}{hasColumn("product") && <td className="px-4 py-4"><p className="font-black uppercase">{row.product}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{row.color}</p></td>}{hasColumn("qty") && <td className="px-4 py-4 text-right font-black text-blue-700">{numberValue(row.quantity).toLocaleString("id-ID")}</td>}{hasColumn("note") && <td className="px-4 py-4 min-w-[180px]">{editingId === row.id ? <input autoFocus value={tempNote} onChange={(e) => setTempNote(e.target.value)} onBlur={() => handleUpdateNote(row)} onKeyDown={(e) => { if (e.key === "Enter") handleUpdateNote(row); if (e.key === "Escape") setEditingId(null); }} className={INPUT_CLASS} /> : <button disabled={!canEditNote} onClick={() => { setEditingId(row.id); setTempNote(row.note || ""); }} className="text-left text-xs font-bold uppercase disabled:cursor-default">{row.note || "-"} {canEditNote && <span className="text-blue-400">✎</span>}</button>}</td>}{hasColumn("user") && <td className="px-4 py-4 text-xs font-bold max-w-[150px] truncate">{row.created_by || "-"}</td>}{hasColumn("work_order") && <td className="px-4 py-4 text-xs font-bold">{workOrders.find((item) => item.id === row.work_order_id)?.code || row.work_order_id || "-"}</td>}{hasColumn("batch") && <td className="px-4 py-4 text-xs font-bold">{batches.find((item) => item.id === row.batch_id)?.batch_code || row.batch_id || "-"}</td>}{hasColumn("machine") && <td className="px-4 py-4 text-xs font-bold">{row.machine_code || "-"}</td>}{hasColumn("line") && <td className="px-4 py-4 text-xs font-bold">{row.line_code || "-"}</td>}{hasColumn("actions") && <td className="px-4 py-4 text-right whitespace-nowrap"><button onClick={() => setDetailRecord(row)} className={SMALL_BUTTON}>Detail</button>{canDeleteProduction && <button disabled={deletingIds.has(String(row.id))} onClick={() => handleDelete(row)} className={`${SMALL_BUTTON} ml-2 !text-red-600`}>{deletingIds.has(String(row.id)) ? "..." : t.delete}</button>}</td>}</tr>)}
                {!loading && !filteredRecords.length && <tr><td colSpan={visibleColumns.length} className="px-5 py-16 text-center text-xs font-bold text-slate-400">{t.empty}</td></tr>}
              </tbody></table></div>
              <div className="px-5 md:px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4"><div className="flex items-center gap-2"><button disabled={currentPage === 0 || loading} onClick={() => setCurrentPage((value) => value - 1)} className={SMALL_BUTTON}>←</button><span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black">{currentPage + 1}</span><button disabled={records.length < displayLimit || loading || Boolean(filterDate)} onClick={() => setCurrentPage((value) => value + 1)} className={SMALL_BUTTON}>→</button></div><div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-5 py-3"><span className="text-[10px] font-black text-indigo-700 mr-3">{t.total}</span><span className="text-lg font-black text-blue-800">{totalFiltered.toLocaleString("id-ID")} Pcs</span></div><div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-500">{t.show}</span><select value={displayLimit} onChange={(e) => { setDisplayLimit(Number(e.target.value)); setCurrentPage(0); }} className={SMALL_BUTTON}>{[50, 100, 200, 300].map((item) => <option key={item}>{item}</option>)}</select></div></div>
            </Card>
          </div>}

          {activeTab === "analytics" && <AnalyticsPage session={session} language={language} />}
          {activeTab === "operations" && <OperationsSuitePage session={session} profile={profile} initialModule={operationsInitial} />}
          {activeTab === "logs" && <Card>
            <div className="px-5 md:px-8 py-5 border-b border-slate-100 bg-slate-50/40"><FullSuiteSectionTitle title={t.navLogs} subtitle="Append-only Audit Log dari trigger database; pagination memakai snapshot agar stabil saat log baru masuk." action={<div className="flex flex-wrap gap-2"><input value={logSearch} onChange={(e) => { setLogSearch(e.target.value); setLogsPage(0); setLogsSnapshotId(null); }} placeholder="Cari deskripsi..." className={INPUT_CLASS} /><button onClick={() => { setLogsPage(0); setLogsSnapshotId(null); fetchLogs(true); }} className={SMALL_BUTTON}>Snapshot Baru</button></div>} /></div>
            <div className="md:hidden divide-y divide-slate-100 px-5">{logs.map((log) => <div key={log.id} className="py-4"><div className="flex justify-between gap-3"><span className="font-black text-xs">{log.user_name}</span><span className="text-[9px] font-bold text-slate-400">{formatDateTime(log.created_at)}</span></div><div className="mt-2 flex gap-2 items-start"><FullSuiteBadge tone={log.activity_type === "DELETE" ? "red" : log.activity_type === "INSERT" ? "green" : "blue"}>{log.metadata?.event_subtype || log.activity_type}</FullSuiteBadge><p className="text-xs font-bold text-slate-600 leading-relaxed">{log.description}</p></div></div>)}{!logsLoading && !logs.length && <p className="py-12 text-center text-xs font-bold text-slate-400">{t.logEmpty}</p>}</div>
            <div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b text-left"><th className="px-7 py-5">{t.logTime}</th><th className="px-5 py-5">{t.user}</th><th className="px-5 py-5">{t.logAction}</th><th className="px-5 py-5">Tabel / ID</th><th className="px-5 py-5">{t.logDesc}</th></tr></thead><tbody className="divide-y">{logsLoading && !logs.length ? <tr><td colSpan={5} className="p-20 text-center font-bold animate-pulse">{t.loading}</td></tr> : logs.map((log, index) => <tr key={log.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}><td className="px-7 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td><td className="px-5 py-4 font-bold">{log.user_name}</td><td className="px-5 py-4"><FullSuiteBadge tone={log.activity_type === "DELETE" ? "red" : log.activity_type === "INSERT" ? "green" : "blue"}>{log.metadata?.event_subtype || log.activity_type}</FullSuiteBadge></td><td className="px-5 py-4 text-xs font-bold">{log.table_name || "-"} #{log.record_id || "-"}</td><td className="px-5 py-4 text-xs font-bold text-slate-600">{log.description}</td></tr>)}{!logsLoading && !logs.length && <tr><td colSpan={5} className="p-16 text-center text-xs font-bold text-slate-400">{t.logEmpty}</td></tr>}</tbody></table></div>
            <div className="px-5 md:px-8 py-4 bg-slate-50/50 border-t flex items-center justify-between"><div className="flex gap-2"><button disabled={logsPage === 0 || logsLoading} onClick={() => setLogsPage((value) => value - 1)} className={SMALL_BUTTON}>←</button><span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black">{logsPage + 1}</span><button disabled={logs.length < logsLimit || logsLoading} onClick={() => setLogsPage((value) => value + 1)} className={SMALL_BUTTON}>→</button></div><p className="text-[9px] font-black text-slate-400 uppercase">BUYMORE TRANSACTIONAL AUDIT</p></div>
          </Card>}
        </main>

        <QrBarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={applyScannedValue} />
        <RecordDetailModal open={Boolean(detailRecord)} record={detailRecord} onClose={() => setDetailRecord(null)} session={session} profile={profile} />
      </div>
    </AppErrorBoundary>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<ProductionSystem />);
