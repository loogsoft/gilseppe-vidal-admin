import { useEffect, useMemo, useState, type JSX } from "react";
import styles from "./Dashboard.module.css";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  FiAlertTriangle,
  FiAward,
  FiBox,
  FiDollarSign,
  FiShoppingCart,
} from "react-icons/fi";
import { useTheme } from "../../contexts/useTheme";
import StatCard from "../../components/StatCard/StatCard";
import { ProductService } from "../../service/Product.service";
import { StockMovementService } from "../../service/Stock-movement.service";
import type { StockMovementResponseDto } from "../../dtos/response/stock-movement-response.dto";
import type { StockOperationResponseDto } from "../../dtos/response/stock-operation-response.dto";
import { getLowStockEntries } from "../../utils/productStock";
import { StockOperationsTable } from "../../components/StockOperationsTable/StockOperationsTable";

type MetricCard = {
  label: string;
  value: string;
  badge: string;
  icon: "money" | "discountStock" | "ticket" | "top";
  sub?: string;
  badgeTone?: "success" | "neutral";
};

type Period = "day" | "week" | "month";

type SalesChartPoint = {
  name: string;
  fullLabel: string;
  revenue: number;
  sales: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number | string;
    payload?: SalesChartPoint;
  }>;
  label?: string;
};

const METRIC_ICONS: Record<MetricCard["icon"], JSX.Element> = {
  money: <FiDollarSign />,
  discountStock: <FiShoppingCart />,
  ticket: <FiBox />,
  top: <FiAward />,
};

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

function toNumber(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatCompactBRL(value: number) {
  const abs = Math.abs(value);

  if (abs >= 1000000) {
    return (
      "R$ " +
      (value / 1000000).toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      }) +
      " mi"
    );
  }

  if (abs >= 1000) {
    return (
      "R$ " +
      (value / 1000).toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      }) +
      " mil"
    );
  }

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function getMovementRevenue(movement: StockMovementResponseDto) {
  const storedPrice = toNumber(movement.price);

  if (storedPrice > 0) {
    return storedPrice;
  }

  return toNumber(movement.variation?.price) * Number(movement.quantity || 0);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getPeriodRange(period: Period, reference = new Date()) {
  if (period === "day") {
    return {
      start: startOfDay(reference),
      end: endOfDay(reference),
    };
  }

  if (period === "week") {
    const start = startOfDay(reference);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);

    const end = endOfDay(start);
    end.setDate(start.getDate() + 6);

    return { start, end };
  }

  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = endOfDay(
    new Date(reference.getFullYear(), reference.getMonth() + 1, 0),
  );

  return { start, end };
}

function formatChartDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(value);
}

function getPeriodLabel(period: Period) {
  if (period === "day") return "Hoje";
  if (period === "week") return "Esta semana";
  return "Este mês";
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const revenue = Number(
    payload.find((item) => item.dataKey === "revenue")?.value ?? 0,
  );
  const sales = Number(
    payload.find((item) => item.dataKey === "sales")?.value ?? 0,
  );

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{point?.fullLabel ?? label}</div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipDot} />
        <span>Faturamento</span>
        <strong>{formatBRL(revenue)}</strong>
      </div>
      <div className={styles.tooltipRow}>
        <span className={`${styles.tooltipDot} ${styles.tooltipDotLine}`} />
        <span>Vendas</span>
        <strong>{sales.toLocaleString("pt-BR")} un.</strong>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [period, setPeriod] = useState<Period>("week");
  const { theme } = useTheme();
  const [stockiten, setStockIten] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [recentMovements, setRecentMovements] = useState<
    StockMovementResponseDto[]
  >([]);
  const [recentOperations, setRecentOperations] = useState<
    StockOperationResponseDto[]
  >([]);
  const periodRange = useMemo(() => getPeriodRange(period), [period]);
  const periodMovements = useMemo(() => {
    return recentMovements.filter((m) => {
      const d = new Date(m.createdAt);
      return d >= periodRange.start && d <= periodRange.end;
    });
  }, [recentMovements, periodRange]);

  const salesMovements = useMemo(
    () => periodMovements.filter((m) => m.type === "OUT"),
    [periodMovements],
  );

  const totalVendas = useMemo(
    () =>
      salesMovements.reduce((acc, movement) => acc + movement.quantity, 0),
    [salesMovements],
  );

  const totalFaturamento = useMemo(
    () =>
      salesMovements.reduce(
        (acc, movement) => acc + getMovementRevenue(movement),
        0,
      ),
    [salesMovements],
  );
  const periodLabel = getPeriodLabel(period);
  const chartColors = {
    revenue: "var(--highlight-primary)",
    revenueEnd: "var(--highlight-secondary)",
    sales: "#2563eb",
    muted: "var(--text-muted)",
    grid: "var(--border-default)",
  };

  const chartData = useMemo<SalesChartPoint[]>(() => {
    const buckets: SalesChartPoint[] = [];

    if (period === "day") {
      for (let hour = 0; hour < 24; hour += 1) {
        const hourLabel = String(hour).padStart(2, "0") + "h";
        buckets.push({
          name: hourLabel,
          fullLabel: hourLabel + " às " + String(hour).padStart(2, "0") + ":59",
          revenue: 0,
          sales: 0,
        });
      }
    }

    if (period === "week") {
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const date = new Date(periodRange.start);
        date.setDate(periodRange.start.getDate() + dayIndex);
        buckets.push({
          name: WEEK_DAYS[dayIndex],
          fullLabel: WEEK_DAYS[dayIndex] + ", " + formatChartDate(date),
          revenue: 0,
          sales: 0,
        });
      }
    }

    if (period === "month") {
      const totalDays = new Date(
        periodRange.start.getFullYear(),
        periodRange.start.getMonth() + 1,
        0,
      ).getDate();

      for (let day = 1; day <= totalDays; day += 1) {
        const date = new Date(
          periodRange.start.getFullYear(),
          periodRange.start.getMonth(),
          day,
        );
        buckets.push({
          name: String(day).padStart(2, "0"),
          fullLabel: formatChartDate(date),
          revenue: 0,
          sales: 0,
        });
      }
    }

    salesMovements.forEach((movement) => {
      const date = new Date(movement.createdAt);
      let index = -1;

      if (period === "day") {
        index = date.getHours();
      }

      if (period === "week") {
        index = Math.floor(
          (startOfDay(date).getTime() - periodRange.start.getTime()) /
            86400000,
        );
      }

      if (period === "month") {
        index = date.getDate() - 1;
      }

      const bucket = buckets[index];
      if (!bucket) return;

      bucket.sales += movement.quantity;
      bucket.revenue += getMovementRevenue(movement);
    });

    return buckets;
  }, [period, periodRange, salesMovements]);
  const chartHasData = chartData.some(
    (item) => item.revenue > 0 || item.sales > 0,
  );
  useEffect(() => {
    const totalProduct = async () => {
      try {
        const data = await ProductService.findAll();
        setStockIten(data.length);

        const low = data.filter(
          (product) => getLowStockEntries(product).length > 0,
        );
        setLowStock(low.length);
      } catch (error) {
        console.error(error);
      }
    };

    void totalProduct();
  }, []);

  useEffect(() => {
    StockMovementService.findAllOperations()
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setRecentOperations(sorted);
        setRecentMovements(
          sorted.flatMap((operation) => operation.movements ?? []),
        );
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Dashboard Executivo</h1>
          <p className={styles.subtitle}>
            Bem-vindo de volta. Veja o desempenho do periodo selecionado.
          </p>
        </div>

        <div className={styles.actions}>
          <div className={styles.periodTabs}>
            <button
              className={`${styles.periodTab} ${
                period === "day" ? styles.periodTabActive : ""
              }`}
              type="button"
              onClick={() => setPeriod("day")}
            >
              Dia
            </button>
            <button
              className={`${styles.periodTab} ${
                period === "week" ? styles.periodTabActive : ""
              }`}
              type="button"
              onClick={() => setPeriod("week")}
            >
              Semana
            </button>
            <button
              className={`${styles.periodTab} ${
                period === "month" ? styles.periodTabActive : ""
              }`}
              type="button"
              onClick={() => setPeriod("month")}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      <div className={styles.metrics}>
        <StatCard
          label="VENDAS TOTAIS"
          value={totalVendas.toLocaleString("pt-BR")}
          icon={METRIC_ICONS["discountStock"]}
          badgeTone="success"
          iconColor="#EFF6FF"
          iconBackgroundColor="#3B82F6"
          valueColor="#3B82F6"
        />
        <StatCard
          label="FATURAMENTO"
          value={totalFaturamento.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          icon={METRIC_ICONS["money"]}
          badgeTone="success"
          iconColor="#ECFDF5"
          iconBackgroundColor="#059669"
          valueColor="#059669"
        />
        <StatCard
          key={1}
          label={"ITENS EM ESTOQUE"}
          icon={METRIC_ICONS["ticket"]}
          value={stockiten.toString()}
          badgeTone={"success"}
          iconColor="#FFFBEB"
          iconBackgroundColor="#F59E0B"
          valueColor="#F59E0B"
        />
        <StatCard
          label="ESTOQUE BAIXO"
          value={lowStock}
          icon={<FiAlertTriangle />}
          iconColor="#FFFBEB"
          iconBackgroundColor="#f50b0bd7"
          valueColor="#f50b0bd7"
        />
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.panelTitle}>Performance de Vendas</div>
            <div className={styles.panelSub}>
              {periodLabel} com faturamento e quantidade vendida
            </div>
          </div>

          <div className={styles.chartSummary}>
            <div className={styles.chartSummaryItem}>
              <span>Faturamento</span>
              <strong>{formatBRL(totalFaturamento)}</strong>
            </div>
            <div className={styles.chartSummaryItem}>
              <span>Vendas</span>
              <strong>{totalVendas.toLocaleString("pt-BR")} un.</strong>
            </div>
          </div>
        </div>

        <div className={styles.chartLegend}>
          <span className={styles.chartLegendItem}>Faturamento</span>
          <span
            className={`${styles.chartLegendItem} ${styles.chartLegendLine}`}
          >
            Vendas
          </span>
        </div>

        <div className={styles.chartWrap}>
          {chartHasData ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                key={theme + period}
                data={chartData}
                margin={{ top: 16, right: 18, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueBarFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={chartColors.revenue}
                      stopOpacity={0.92}
                    />
                    <stop
                      offset="100%"
                      stopColor={chartColors.revenueEnd}
                      stopOpacity={0.72}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={chartColors.grid}
                  strokeDasharray="4 8"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  interval={period === "month" ? 2 : period === "day" ? 2 : 0}
                  tick={{ fill: chartColors.muted, fontSize: 11 }}
                  tickMargin={12}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="revenue"
                  tickFormatter={formatCompactBRL}
                  tick={{ fill: chartColors.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <YAxis yAxisId="sales" orientation="right" hide />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  name="Faturamento"
                  fill="url(#revenueBarFill)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={period === "month" ? 18 : 42}
                />
                <Line
                  yAxisId="sales"
                  type="monotone"
                  dataKey="sales"
                  name="Vendas"
                  stroke={chartColors.sales}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 5,
                    stroke: "var(--surface)",
                    strokeWidth: 3,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.chartEmpty}>
              <FiShoppingCart />
              <span>Sem vendas no período selecionado</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.tablePanel}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Movimentações Recentes</div>
        </div>
        <StockOperationsTable operations={recentOperations} />
      </div>
    </div>
  );
}
