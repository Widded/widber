import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatPrice } from '../../lib/appointmentUtils';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  fontSize: 12,
  background: '#FFFFFF',
};

type RevenuePoint = {
  label: string;
  revenue: number;
};

export const RevenueChart = ({ data }: { data: RevenuePoint[] }) => (
  <div className="h-[220px] w-full sm:h-[280px]">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          width={40}
          tickFormatter={(value) =>
            Number(value) >= 1000
              ? `₺${Math.round(Number(value) / 1000)}k`
              : `₺${Number(value)}`
          }
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => formatPrice(Number(value))}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Ciro"
          stroke="#2563EB"
          strokeWidth={2.5}
          fill="url(#reportRevenue)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

type StatusItem = {
  name: string;
  value: number;
  color: string;
};

export const StatusPieChart = ({
  data,
  total,
}: {
  data: StatusItem[];
  total: number;
}) => (
  <>
    <div className="relative h-[180px] sm:h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={82}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
          Toplam
        </span>
        <span className="font-bold text-3xl leading-none text-[#0F172A]">{total}</span>
      </div>
    </div>

    <div className="mt-2 space-y-2.5">
      {data.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-2 text-[11px]">
          <span className="flex items-center gap-2 font-medium text-[#475569]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            {entry.name}
          </span>
          <span className="font-bold text-[#0F172A]">
            {entry.value}
            <span className="ml-1.5 text-[9px] font-medium text-[#94A3B8]">
              %{Math.round((entry.value / total) * 100)}
            </span>
          </span>
        </div>
      ))}
    </div>
  </>
);

type MonthlyPoint = {
  month: string;
  current: number;
  previous: number;
};

export const MonthlyBarChart = ({
  data,
  year,
}: {
  data: MonthlyPoint[];
  year: number;
}) => (
  <div className="h-[220px] w-full sm:h-[260px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#94A3B8' }}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          width={28}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar
          dataKey="current"
          name={String(year)}
          fill="#0F172A"
          radius={[5, 5, 0, 0]}
          maxBarSize={18}
        />
        <Bar
          dataKey="previous"
          name={String(year - 1)}
          fill="#E2E8F0"
          radius={[5, 5, 0, 0]}
          maxBarSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
