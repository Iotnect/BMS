import { type Sample, number } from '@/types/bms';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Empty } from './controls';

export function TrendChart({
    samples,
    range,
    metric = 'energy',
    unit = 'C',
}: {
    samples: Sample[];
    range: string;
    metric?: 'energy' | 'temperature' | 'humidity';
    unit?: 'C' | 'F';
}) {
    if (!samples.length) return <Empty title="No trend samples available">Collect or seed measurements to display a trend.</Empty>;
    const grouped = new Map<string, { label: string; actual: number; baseline: number; count: number }>();
    samples.forEach((sample) => {
        const time = new Date(sample.recorded_at);
        const key = range === '24h' ? sample.recorded_at : time.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        const label = time.toLocaleString('en-MY', {
            timeZone: 'Asia/Kuala_Lumpur',
            ...(range === '24h' ? { hour: '2-digit', minute: '2-digit', hour12: false } : { day: '2-digit', month: 'short' }),
        });
        const value =
            metric === 'energy'
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
            baseline: (previous?.baseline ?? 0) + sample.baseline_kwh,
            count: (previous?.count ?? 0) + 1,
        });
    });
    const data = [...grouped.values()].map((point) => ({
        ...point,
        actual: Math.round((metric === 'energy' ? point.actual : point.actual / point.count) * 10) / 10,
        baseline: Math.round(point.baseline),
    }));
    const suffix = metric === 'energy' ? 'kWh' : metric === 'humidity' ? '%' : `°${unit}`;
    return (
        <div
            className="chart-wrap"
            role="img"
            aria-label={`${metric} trend with ${data.length} ${range === '24h' ? 'hourly' : 'daily'} samples. ${metric === 'energy' ? `Total ${number(samples.reduce((sum, sample) => sum + sample.energy_kwh, 0))} kilowatt hours.` : `Values range from ${number(Math.min(...data.map((p) => p.actual)), 1)} to ${number(Math.max(...data.map((p) => p.actual)), 1)} ${suffix}.`} Use the Reports page to download data.`}
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
                            dot={false}
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
                        dot={false}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
