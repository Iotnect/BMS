import { type Sample, type WorkspaceProps } from '@/types/bms';

const hoursByRange = { '24h': 24, '7d': 168, '30d': 720 };
const hour = 3_600_000;

export function trendWindow(samples: Sample[], latest: string | null, range: WorkspaceProps['range']) {
    const expected = hoursByRange[range];
    const end = latest ? Math.floor(Date.parse(latest) / hour) * hour : null;
    const byTime = new Map(samples.map((sample) => [Date.parse(sample.recorded_at), sample]));
    const slots =
        end === null
            ? []
            : Array.from({ length: expected }, (_, index) => {
                  const timestamp = end - (expected - 1 - index) * hour;
                  return { timestamp, sample: byTime.get(timestamp) };
              });
    const matched = slots.filter((slot) => slot.sample).length;
    const missing = expected - matched;
    const offCadence = samples.length - matched;
    return { slots, expected, matched, missing, offCadence, complete: missing === 0 && offCadence === 0 };
}

export type TrendWindow = ReturnType<typeof trendWindow>;
