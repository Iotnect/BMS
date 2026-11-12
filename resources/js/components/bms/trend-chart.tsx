import { number } from '@/types/bms';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Empty } from './controls';
import { type TrendWindow } from './trend-window';

export function TrendChart({
    window,
    range,
    metric = 'energy',
    unit = 'C',
}: {
    window: TrendWindow;
    range: string;
    metric?: 'energy' | 'temperature' | 'humidity';
    unit?: 'C' | 'F';
}) {
    if (!window.matched) return <Empty title="No trend samples available">No hourly measurements are available for this window.</Empty>;
    const grouped = new Map<string, { label: string; actual: number; baseline: number; count: number; expected: number }>();
    window.slots.forEach(({ timestamp, sample }) => {
        const time = new Date(timestamp);
        const key = range === '24h' ? time.toISOString() : time.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        const label = time.toLocaleString('en-MY', {
            timeZone: 'Asia/Kuala_Lumpur',
            ...(range === '24h' ? { hour: '2-digit', minute: '2-digit', hour12: false } : { day: '2-digit', month: 'short' }),
        });
        const value = !sample
            ? 0
            : metric === 'energy'
              ? sample.energy_kwh
              : metric === 'humidity'
                ? sample.humidity
                : unit === 'F'
                  ? (sample.temperature * 9) / 5 + 32
                  : sample.temperature;
        const previous = grouped.get(key);
        grouped.set(key, {
            label,
            actual: (previous?.actual ?? 0) + value,
            baseline: (previous?.baseline ?? 0) + (sample?.baseline_kwh ?? 0),
            count: (previous?.count ?? 0) + (sample ? 1 : 0),
            expected: (previous?.expected ?? 0) + 1,
        });
    });
    const data = [...grouped.values()].map((point) => ({
        ...point,
        actual: point.count === point.expected ? Math.round((metric === 'energy' ? point.actual : point.actual / point.count) * 10) / 10 : null,
        baseline: point.count === point.expected ? Math.round(point.baseline) : null,
    }));
    const plotted = data.flatMap((point) => (point.actual === null ? [] : [point.actual]));
    if (!plotted.length)
        return <Empty title="No complete daily buckets">Choose a shorter period or use Reports to inspect the available hourly records.</Empty>;
    const gaps = data.length - plotted.length;
    const suffix = metric === 'energy' ? 'kWh' : metric === 'humidity' ? '%' : `°${unit}`;
    return (
        <div
            className="chart-wrap"
            role="img"
            aria-label={`${metric} trend with ${plotted.length} plotted ${range === '24h' ? 'hours' : 'daily buckets'} and ${gaps} ${gaps === 1 ? 'gap' : 'gaps'}. Values range from ${number(Math.min(...plotted), 1)} to ${number(Math.max(...plotted), 1)} ${suffix}. Use the Reports page to download data.`}
        >
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }} accessibilityLayer>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
                    <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        minTickGap={40}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                        dy={9}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                        domain={metric === 'energy' ? [0, 'auto'] : ['auto', 'auto']}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'var(--card)',
                            border: '1px solid var(--input)',
                            borderRadius: 6,
                            color: 'var(--foreground)',
                            fontSize: 12,
                        }}
                        formatter={(value) => [`${number(Number(value), 1)} ${suffix}`]}
                    />
                    {metric === 'energy' && (
                        <Line
                            type="monotone"
                            dataKey="baseline"
                            name="Baseline"
                            stroke="var(--chart-baseline)"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 2 }}
                            connectNulls={false}
                            isAnimationActive={false}
                        />
                    )}
                    <Area
                        type="monotone"
                        dataKey="actual"
                        name={metric === 'energy' ? 'Consumption' : metric === 'temperature' ? 'Temperature' : 'Humidity'}
                        stroke="var(--chart-actual)"
                        fill="var(--chart-fill)"
                        strokeWidth={2.5}
                        dot={{ r: 2 }}
                        connectNulls={false}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
