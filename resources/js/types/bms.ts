export type View = 'overview' | 'analytics' | 'equipment' | 'alarms' | 'schedules' | 'reports' | 'activity' | 'preferences' | 'integrations';
export interface Equipment {
    id: number;
    tag: string;
    name: string;
    system: string;
    floor: string;
    location: string;
    protocol: string;
    status: 'Online' | 'Offline' | 'Alarm';
    mode: 'Auto' | 'Manual';
    reading: number | null;
    unit: string;
    setpoint: number | null;
    last_seen_at: string | null;
}
export interface Alarm {
    id: number;
    severity: 'Critical' | 'Warning' | 'Info';
    message: string;
    instruction: string;
    occurred_at: string;
    returned_at: string | null;
    acknowledged_at: string | null;
    note: string | null;
    equipment: Equipment;
    operator: { name: string } | null;
}
export interface Sample {
    recorded_at: string;
    energy_kwh: number;
    baseline_kwh: number;
    temperature: number;
    humidity: number;
}
export interface Schedule {
    id: number;
    name: string;
    system: string;
    days: number[];
    start_time: string;
    end_time: string;
    enabled: boolean;
}
export interface Preferences {
    siteName: string;
    theme: 'light' | 'dark';
    temperatureUnit: 'C' | 'F';
    dailyTarget: number;
    compact: boolean;
}
export interface Activity {
    id: number;
    action: string;
    subject: string;
    operator: string;
    created_at: string;
    details: string;
}
export interface WorkspaceProps {
    view: View;
    range: '24h' | '7d' | '30d';
    demo: boolean;
    equipment: Equipment[];
    alarms: Alarm[];
    samples: Sample[];
    schedules: Schedule[];
    preferences: Preferences;
    activity: Activity[];
    snapshotAt: string | null;
    flash: { success?: string };
    auth: { user: { name: string; email: string } };
}
export const number = (value: number, digits = 0) => new Intl.NumberFormat('en-MY', { maximumFractionDigits: digits }).format(value);
export const dateTime = (value: string | null) =>
    value
        ? new Date(value.endsWith('Z') || /[+]\d\d:\d\d$/.test(value) ? value : value.replace(' ', 'T') + 'Z').toLocaleString('en-MY', {
              timeZone: 'Asia/Kuala_Lumpur',
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
          })
        : 'Unavailable';
export const temperature = (value: number, unit: 'C' | 'F') => `${number(unit === 'F' ? (value * 9) / 5 + 32 : value, 1)}°${unit}`;
