import { Commissioning } from '@/components/bms/commissioning';
import { Empty, Filter, Status } from '@/components/bms/controls';
import { AlarmEditor, EquipmentEditor, PreferencesForm, ScheduleEditor, dayNames } from '@/components/bms/editors';
import { Navigation, navItems } from '@/components/bms/navigation';
import { TrendChart } from '@/components/bms/trend-chart';
import { trendWindow } from '@/components/bms/trend-window';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Alarm, type Equipment, type Schedule, type WorkspaceProps, dateTime, number, temperature } from '@/types/bms';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDownRight,
    Bell,
    Building2,
    CalendarDays,
    Check,
    ChevronRight,
    CircleAlert,
    Clock3,
    Download,
    Droplets,
    Fan,
    Gauge,
    Lightbulb,
    type LucideIcon,
    Menu,
    Network,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Thermometer,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const titles = {
    overview: 'Building overview',
    analytics: 'Energy & analytics',
    equipment: 'Equipment',
    alarms: 'Alarm management',
    schedules: 'Operating schedules',
    commissioning: 'Commissioning',
    reports: 'Reports',
    activity: 'Activity log',
    preferences: 'Workspace settings',
    integrations: 'Integrations',
};
const subtitles = {
    overview: 'A clear view of your building, from plant room to rooftop.',
    analytics: 'Understand consumption and indoor conditions across your building.',
    equipment: 'Inspect equipment, point values and operating setpoints.',
    alarms: 'Review conditions, prioritize responses and record operator actions.',
    schedules: 'Plan weekly operating hours for your building systems.',
    commissioning: 'Assign findings, track corrective work and record verification before closeout.',
    reports: 'Take your building measurements with you.',
    activity: 'A record of changes made in this workspace.',
    preferences: 'Configure your workspace, units and display preferences.',
    integrations: 'Manage the path between your workspace and field equipment.',
};
const systemIcons: Record<string, LucideIcon> = { HVAC: Fan, Electrical: Zap, Lighting: Lightbulb, Water: Droplets, 'Life safety': ShieldCheck };
const rangeOptions = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
];
const alarmTabs = ['active', 'unacknowledged', 'returned', 'acknowledged', 'all'];
const alarmPriority = { Critical: 0, Warning: 1, Info: 2 };

function compareAlarmPriority(a: Alarm, b: Alarm) {
    return (
        Number(!!a.returned_at) - Number(!!b.returned_at) ||
        alarmPriority[a.severity] - alarmPriority[b.severity] ||
        Number(!!a.acknowledged_at) - Number(!!b.acknowledged_at) ||
        a.occurred_at.localeCompare(b.occurred_at)
    );
}

function alarmState(value: string | null) {
    return value && alarmTabs.includes(value) ? value : 'active';
}

export default function Workspace(props: WorkspaceProps) {
    const { view, equipment, alarms, samples, preferences, schedules, range, activity } = props;
    const { url } = usePage();
    const query = new URLSearchParams(url.split('?')[1]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [alarm, setAlarm] = useState<Alarm | null>(null);
    const [device, setDevice] = useState<Equipment | null>(null);
    const [scheduleEditor, setScheduleEditor] = useState<{ schedule: Schedule | null } | null>(null);
    const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [refreshError, setRefreshError] = useState('');
    const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('search') ?? '');
    const [globalSearch, setGlobalSearch] = useState('');
    const [system, setSystem] = useState(() => new URLSearchParams(window.location.search).get('system') ?? 'all');
    const [floor, setFloor] = useState(() => new URLSearchParams(window.location.search).get('floor') ?? 'all');
    const [status, setStatus] = useState('all');
    const [severity, setSeverity] = useState('all');
    const [alarmTab, setAlarmTab] = useState(() => alarmState(query.get('state')));
    const [alarmSort, setAlarmSort] = useState('priority');
    const [activitySearch, setActivitySearch] = useState('');
    useEffect(() => {
        document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
        localStorage.setItem('appearance', preferences.theme);
    }, [preferences.theme]);
    useEffect(() => {
        setNotice(props.flash.success ?? '');
    }, [props.flash]);
    useEffect(() => {
        const params = new URLSearchParams(url.split('?')[1]);
        setSearch(params.get('search') ?? '');
        setFloor(params.get('floor') ?? 'all');
        setSystem(params.get('system') ?? 'all');
        setAlarmTab(alarmState(params.get('state')));
        setStatus('all');
    }, [url]);
    useEffect(() => {
        const showError = (message: string) => {
            setBusy(false);
            setAlarm(null);
            setDevice(null);
            setScheduleEditor(null);
            setDeletingSchedule(null);
            setRefreshError(message);
        };
        const removeExceptionListener = router.on('exception', (event) => {
            event.preventDefault();
            showError('The server could not be reached. Check your connection, then retry the refresh.');
        });
        const removeInvalidListener = router.on('invalid', (event) => {
            if (event.detail.response.status >= 400) {
                event.preventDefault();
                showError('The operation could not be completed. Refresh the workspace to get its current state and try again.');
            }
        });
        return () => {
            removeExceptionListener();
            removeInvalidListener();
        };
    }, []);
    const activeAlarms = alarms.filter((item) => !item.returned_at);
    const unacknowledged = alarms.filter((item) => !item.acknowledged_at);
    const online = equipment.filter((item) => item.status !== 'Offline').length;
    const consumed = samples.reduce((sum, item) => sum + item.energy_kwh, 0);
    const baseline = samples.reduce((sum, item) => sum + item.baseline_kwh, 0);
    const trend = trendWindow(samples, props.snapshotAt, range);
    const saving = trend.complete && baseline > 0 ? ((baseline - consumed) / baseline) * 100 : null;
    const comparisonText =
        saving === null
            ? trend.complete
                ? 'No baseline comparison available'
                : 'Comparison needs complete hourly data'
            : saving === 0
              ? 'At baseline'
              : `${number(Math.abs(saving), 1)}% ${saving > 0 ? 'below' : 'above'} baseline`;
    const coverage = (
        <div className="panel-foot trend-coverage">
            <Clock3 size={15} aria-hidden="true" />
            <span>
                <strong>
                    {trend.matched} of {trend.expected} expected hourly readings
                </strong>
                {trend.missing > 0 && ` · ${trend.missing} missing`}
                {trend.offCadence > 0 && ` · ${trend.offCadence} off the hourly cadence`}
                {!trend.complete && samples.length > 0 && ' · Totals reflect recorded data only.'}
            </span>
        </div>
    );
    const lastSample = samples.at(-1);
    const floors = ['Ground', 'Level 01', 'Level 02', 'Level 03', 'Rooftop'].filter((value) => equipment.some((item) => item.floor === value));
    const visibleEquipment = equipment.filter(
        (item) =>
            (system === 'all' || item.system === system) &&
            (floor === 'all' || item.floor === floor) &&
            (status === 'all' || item.status === status) &&
            `${item.tag} ${item.name} ${item.location} ${item.floor}`.toLowerCase().includes(search.toLowerCase()),
    );
    const visibleAlarms = alarms
        .filter(
            (item) =>
                (severity === 'all' || item.severity === severity) &&
                (floor === 'all' || item.equipment.floor === floor) &&
                (alarmTab === 'all' ||
                    (alarmTab === 'active' && !item.returned_at) ||
                    (alarmTab === 'unacknowledged' && !item.acknowledged_at) ||
                    (alarmTab === 'returned' && item.returned_at) ||
                    (alarmTab === 'acknowledged' && item.acknowledged_at)) &&
                `${item.message} ${item.equipment.tag}`.toLowerCase().includes(search.toLowerCase()),
        )
        .sort(alarmSort === 'newest' ? (a, b) => b.occurred_at.localeCompare(a.occurred_at) : compareAlarmPriority);
    const href = navItems.find((item) => item.view === view)?.href ?? '/dashboard';
    const changeRange = (value: string) => router.get(href, { range: value }, { preserveScroll: true, preserveState: true });
    const refresh = () => {
        setRefreshError('');
        router.reload({
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onError: () => setRefreshError('Unable to refresh. Try again when the server is available.'),
        });
    };
    const navigation = (
        <Navigation
            view={view}
            siteName={preferences.siteName}
            alarmCount={unacknowledged.length}
            user={props.auth.user.name}
            onNavigate={() => setMenuOpen(false)}
        />
    );
    const rangeFilter = <Filter id="time-range" label="Reporting period" value={range} onChange={changeRange} options={rangeOptions} />;

    const alarmTable = (items: Alarm[], compact = false) => (
        <div className="table-scroll">
            <table className="data-table alarm-table">
                <caption className="sr-only">{compact ? 'Alarms awaiting acknowledgment' : 'Filtered alarm list'}</caption>
                <thead>
                    <tr>
                        <th>Priority / condition</th>
                        <th>Source</th>
                        {!compact && (
                            <>
                                <th>Occurred (MYT)</th>
                                <th>State</th>
                            </>
                        )}
                        <th>
                            <span className="sr-only">Action</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td>
                                <Status value={item.severity} />
                                <strong>{item.message}</strong>
                                {compact && (
                                    <span className="muted small">
                                        {item.returned_at ? 'Returned' : 'Active'} · {dateTime(item.occurred_at)}
                                    </span>
                                )}
                            </td>
                            <td>
                                <span className="equipment-tag">{item.equipment.tag}</span>
                                <span className="muted small">{item.equipment.floor}</span>
                            </td>
                            {!compact && (
                                <>
                                    <td>{dateTime(item.occurred_at)}</td>
                                    <td>
                                        <Status value={item.returned_at ? 'Returned' : 'Active'} />
                                        <span className="muted small">{item.acknowledged_at ? 'Acknowledged' : 'Unacknowledged'}</span>
                                    </td>
                                </>
                            )}
                            <td>
                                <Button variant="ghost" size="sm" onClick={() => setAlarm(item)} aria-label={`Review ${item.message}`}>
                                    Review
                                    <ChevronRight aria-hidden="true" />
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!items.length && <Empty title="No alarms in this view">There are no alarms matching the selected state and filters.</Empty>}
        </div>
    );

    const systemPanel = (
        <section className="panel system-panel">
            <div className="panel-heading">
                <h2>System status</h2>
                <span className="small muted">{equipment.length} assets</span>
            </div>
            <div className="system-list">
                {Object.entries(systemIcons).map(([name, Icon]) => {
                    const devices = equipment.filter((item) => item.system === name);
                    const faults = devices.filter((item) => item.status !== 'Online').length;
                    return (
                        <Link href={`/equipment?system=${encodeURIComponent(name)}`} className="system-row" key={name}>
                            <span className="system-icon">
                                <Icon size={19} aria-hidden="true" />
                            </span>
                            <div>
                                <strong>{name}</strong>
                                <span>{devices.length} equipment</span>
                            </div>
                            <Status value={!devices.length ? 'No assets' : faults ? `${faults} attention` : 'Online'} />
                            <ChevronRight size={14} aria-hidden="true" />
                        </Link>
                    );
                })}
            </div>
            <div className="panel-foot">
                <Network size={15} aria-hidden="true" />
                <span>Simulated points · field network disconnected</span>
            </div>
        </section>
    );

    const energyPanel = (
        <section className="panel energy-panel">
            <div className="panel-heading">
                <div>
                    <h2>Energy consumption</h2>
                    <p className="muted small">{range === '24h' ? 'Hourly' : 'Daily'} consumption · whole building · kWh</p>
                </div>
                <div className="chart-legend">
                    <span>
                        <i className="legend-actual" />
                        Consumption
                    </span>
                    <span>
                        <i className="legend-baseline" />
                        Baseline
                    </span>
                </div>
            </div>
            <div className="energy-summary">
                <strong>
                    {samples.length ? number(consumed) : '—'}
                    <span> kWh</span>
                </strong>
                <span className={`comparison ${saving !== null && saving < 0 ? 'negative' : ''}`}>
                    {saving !== null && saving > 0 && <ArrowDownRight size={15} aria-hidden="true" />}
                    {comparisonText}
                </span>
            </div>
            <TrendChart window={trend} range={range} />
            {coverage}
            <div className="chart-caption">
                {range === '24h'
                    ? 'Gaps mark missing hourly readings.'
                    : 'Gaps mark days with missing readings. The first and last day may cover part of a day.'}
                <Link href="/analytics">
                    View analytics
                    <ChevronRight size={13} aria-hidden="true" />
                </Link>
            </div>
        </section>
    );

    return (
        <div className={`bms-app ${preferences.compact ? 'compact' : ''}`}>
            <Head title={titles[view]} />
            <a className="skip-link" href="#main-content">
                Skip to content
            </a>
            <aside className="desktop-sidebar">{navigation}</aside>
            <div className="workspace">
                <header className="topbar">
                    <div className="topbar-context">
                        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="mobile-menu">
                                    <Menu aria-hidden="true" />
                                    Menu
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="mobile-sidebar">
                                <SheetTitle className="sr-only">Building navigation</SheetTitle>
                                <SheetDescription className="sr-only">Monitoring, operations and workspace administration.</SheetDescription>
                                {navigation}
                            </SheetContent>
                        </Sheet>
                        <span className="breadcrumb-building">
                            Workspace<span>/</span>
                        </span>
                        <strong>{navItems.find((item) => item.view === view)?.label}</strong>
                    </div>
                    <div className="topbar-actions">
                        <form
                            className="global-search"
                            onSubmit={(e) => {
                                e.preventDefault();
                                setSearch(globalSearch);
                                router.get('/equipment', { search: globalSearch });
                            }}
                        >
                            <Label htmlFor="global-search" className="sr-only">
                                Search equipment
                            </Label>
                            <Search size={16} aria-hidden="true" />
                            <Input
                                id="global-search"
                                placeholder="Search equipment…"
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                            />
                            <Button type="submit" variant="ghost" size="icon" aria-label="Submit equipment search">
                                <ChevronRight size={16} />
                            </Button>
                        </form>
                        <span className="demo-label">Demo workspace</span>
                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label={`${unacknowledged.length} unacknowledged alarms`}
                            className="notification-button"
                        >
                            <Link href="/alarms?state=unacknowledged">
                                <Bell size={19} />
                                <span aria-hidden="true">{unacknowledged.length}</span>
                            </Link>
                        </Button>
                    </div>
                </header>
                <main id="main-content" tabIndex={-1} className="main-content">
                    <div className="page-heading">
                        <div>
                            <div className="site-kicker">
                                <Building2 size={14} aria-hidden="true" />
                                {preferences.siteName}
                                <span>•</span>Kuala Lumpur
                            </div>
                            <h1>{titles[view]}</h1>
                            <p>{subtitles[view]}</p>
                        </div>
                        <div className="page-actions">
                            {['overview', 'analytics', 'reports'].includes(view) && rangeFilter}
                            {view === 'schedules' ? (
                                <Button onClick={() => setScheduleEditor({ schedule: null })}>
                                    <Plus aria-hidden="true" />
                                    Add schedule
                                </Button>
                            ) : (
                                <Button variant="outline" disabled={busy} onClick={refresh}>
                                    <RefreshCw size={15} className={busy ? 'spin' : ''} aria-hidden="true" />
                                    {busy ? 'Refreshing…' : 'Refresh'}
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="snapshot-note">
                        <span>
                            <span className="sample-dot" />
                            Demonstration data
                        </span>
                        <span>Sample snapshot: {dateTime(props.snapshotAt)} MYT</span>
                        <span>No field controllers connected</span>
                    </div>
                    <div role="status" aria-live="polite">
                        {notice && (
                            <div className="notice">
                                <Check size={17} aria-hidden="true" />
                                <span>{notice}</span>
                                <Button variant="ghost" size="icon" onClick={() => setNotice('')} aria-label="Dismiss notification">
                                    <X size={16} />
                                </Button>
                            </div>
                        )}
                        {busy && <span className="sr-only">Loading the latest saved snapshot.</span>}
                    </div>
                    {refreshError && (
                        <div role="alert" className="form-errors">
                            {refreshError}
                            <Button variant="outline" onClick={refresh}>
                                Retry
                            </Button>
                        </div>
                    )}

                    {view === 'overview' && (
                        <>
                            <section className="metrics" aria-label="Building summary">
                                <article className="metric">
                                    <div className="metric-label">
                                        Energy used
                                        <Zap size={17} aria-hidden="true" />
                                    </div>
                                    <div className="metric-value">
                                        {samples.length ? number(consumed) : '—'}
                                        <span>kWh</span>
                                    </div>
                                    <div className="metric-foot">
                                        <span>{comparisonText}</span>
                                        <span>{rangeOptions.find((item) => item.value === range)?.label}</span>
                                    </div>
                                </article>
                                <article className="metric">
                                    <div className="metric-label">
                                        Indoor temperature
                                        <Thermometer size={17} aria-hidden="true" />
                                    </div>
                                    <div className="metric-value">
                                        {lastSample ? temperature(lastSample.temperature, preferences.temperatureUnit) : '—'}
                                    </div>
                                    <div className="metric-foot">
                                        <span>Latest indoor sample</span>
                                        <span>{lastSample ? `${number(lastSample.humidity)}% RH` : 'No sample'}</span>
                                    </div>
                                </article>
                                <article className="metric">
                                    <div className="metric-label">
                                        Equipment available
                                        <Gauge size={17} aria-hidden="true" />
                                    </div>
                                    <div className="metric-value">
                                        {online}
                                        <span>/ {equipment.length}</span>
                                    </div>
                                    <div className="metric-foot">
                                        <span>{equipment.filter((item) => item.status === 'Offline').length} offline</span>
                                        <Link href="/equipment">View equipment</Link>
                                    </div>
                                </article>
                                <article className="metric alarm-metric">
                                    <div className="metric-label">
                                        Active alarms
                                        <Bell size={17} aria-hidden="true" />
                                    </div>
                                    <div className="metric-value">
                                        {activeAlarms.length}
                                        <span>open conditions</span>
                                    </div>
                                    <div className="metric-foot">
                                        <span className="danger-text">
                                            {activeAlarms.filter((item) => item.severity === 'Critical').length} critical
                                        </span>
                                        <Link href="/alarms?state=unacknowledged">{unacknowledged.length} unacknowledged</Link>
                                    </div>
                                </article>
                            </section>
                            <div className="overview-grid">
                                {energyPanel}
                                {systemPanel}
                                <section className="panel attention-panel">
                                    <div className="panel-heading">
                                        <div>
                                            <h2>
                                                Needs your attention <span className="count-square">{unacknowledged.length}</span>
                                            </h2>
                                            <p className="muted small">Unacknowledged events, active conditions first</p>
                                        </div>
                                        <Link className="text-link" href="/alarms">
                                            All alarms
                                            <ChevronRight size={14} aria-hidden="true" />
                                        </Link>
                                    </div>
                                    {alarmTable(unacknowledged.sort(compareAlarmPriority).slice(0, 3), true)}
                                </section>
                                <section className="panel floor-panel">
                                    <div className="panel-heading">
                                        <div>
                                            <h2>Building at a glance</h2>
                                            <p className="muted small">Equipment availability by floor</p>
                                        </div>
                                        <Building2 size={20} className="muted" aria-hidden="true" />
                                    </div>
                                    <div className="floor-list">
                                        {[...floors].reverse().map((name) => {
                                            const devices = equipment.filter((item) => item.floor === name);
                                            const available = devices.filter((item) => item.status !== 'Offline').length;
                                            return (
                                                <button
                                                    key={name}
                                                    className="floor-row"
                                                    onClick={() => {
                                                        setFloor(name);
                                                        router.get('/equipment', { floor: name });
                                                    }}
                                                >
                                                    <span>{name}</span>
                                                    <span className="floor-bar">
                                                        <span style={{ width: `${(available / devices.length) * 100}%` }} />
                                                    </span>
                                                    <strong>
                                                        {available}/{devices.length}
                                                    </strong>
                                                    <ChevronRight size={13} aria-hidden="true" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="panel-foot">
                                        <Clock3 size={14} aria-hidden="true" />
                                        Saved snapshot · Asia/Kuala_Lumpur
                                    </div>
                                </section>
                            </div>
                            <div className="overview-bottom">
                                <CalendarDays size={18} aria-hidden="true" />
                                <span>
                                    <strong>{schedules.filter((item) => item.enabled).length} enabled operating schedules</strong> · Programs stored
                                    locally for controller commissioning.
                                </span>
                                <Link href="/schedules">
                                    Manage schedules
                                    <ChevronRight size={14} aria-hidden="true" />
                                </Link>
                            </div>
                        </>
                    )}

                    {view === 'analytics' && (
                        <>
                            <div className="analytics-summary">
                                <div>
                                    <span className="muted">{trend.complete ? 'Period consumption' : 'Recorded consumption'}</span>
                                    <strong>
                                        {samples.length ? number(consumed) : '—'} <small>kWh</small>
                                    </strong>
                                </div>
                                <div>
                                    <span className="muted">Baseline consumption</span>
                                    <strong>
                                        {trend.complete ? number(baseline) : '—'} <small>kWh</small>
                                    </strong>
                                </div>
                                <div>
                                    <span className="muted">Difference to baseline</span>
                                    <strong className="positive">
                                        {saving !== null ? number(baseline - consumed) : '—'} <small>kWh</small>
                                    </strong>
                                </div>
                                <div>
                                    <span className="muted">Peak recorded energy</span>
                                    <strong>
                                        {samples.length ? number(Math.max(...samples.map((item) => item.energy_kwh)), 1) : '—'} <small>kWh</small>
                                    </strong>
                                </div>
                            </div>
                            {energyPanel}
                            <div className="two-columns">
                                <section className="panel">
                                    <div className="panel-heading">
                                        <div>
                                            <h2>Indoor temperature</h2>
                                            <p className="muted small">
                                                {range === '24h' ? 'Hourly values' : 'Daily average'} · °{preferences.temperatureUnit}
                                            </p>
                                        </div>
                                        <Thermometer size={19} aria-hidden="true" />
                                    </div>
                                    <TrendChart window={trend} range={range} metric="temperature" unit={preferences.temperatureUnit} />
                                </section>
                                <section className="panel">
                                    <div className="panel-heading">
                                        <div>
                                            <h2>Relative humidity</h2>
                                            <p className="muted small">{range === '24h' ? 'Hourly values' : 'Daily average'} · % RH</p>
                                        </div>
                                        <Droplets size={19} aria-hidden="true" />
                                    </div>
                                    <TrendChart window={trend} range={range} metric="humidity" />
                                </section>
                            </div>
                            <section className="panel target-panel">
                                <div>
                                    <h2>Energy target</h2>
                                    <p className="muted">
                                        {number(preferences.dailyTarget)} kWh per 24 hours.{' '}
                                        {range === '24h'
                                            ? trend.complete
                                                ? `${number((consumed / preferences.dailyTarget) * 100)}% of target used in this period.`
                                                : 'Target comparison needs complete hourly data.'
                                            : 'Select Last 24 hours to compare consumption against this target.'}
                                    </p>
                                </div>
                                <Button asChild variant="outline">
                                    <Link href="/preferences">Adjust target</Link>
                                </Button>
                            </section>
                        </>
                    )}

                    {view === 'equipment' && (
                        <section className="panel">
                            <div className="filter-toolbar">
                                <div className="search-filter">
                                    <Label htmlFor="equipment-search">Find equipment</Label>
                                    <div className="input-icon">
                                        <Search size={16} aria-hidden="true" />
                                        <Input
                                            id="equipment-search"
                                            placeholder="Tag, name, location or floor…"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Filter
                                    id="equipment-system"
                                    label="System"
                                    value={system}
                                    onChange={setSystem}
                                    options={[
                                        { value: 'all', label: 'All systems' },
                                        ...Object.keys(systemIcons).map((value) => ({ value, label: value })),
                                    ]}
                                />
                                <Filter
                                    id="equipment-floor"
                                    label="Floor"
                                    value={floor}
                                    onChange={setFloor}
                                    options={[{ value: 'all', label: 'All floors' }, ...floors.map((value) => ({ value, label: value }))]}
                                />
                                <Filter
                                    id="equipment-status"
                                    label="Status"
                                    value={status}
                                    onChange={setStatus}
                                    options={[
                                        { value: 'all', label: 'All states' },
                                        ...['Online', 'Offline', 'Alarm'].map((value) => ({ value, label: value })),
                                    ]}
                                />
                            </div>
                            <div className="table-meta">
                                <span>
                                    {visibleEquipment.length} of {equipment.length} equipment
                                </span>
                                <span>All point values are simulated</span>
                            </div>
                            <div className="table-scroll">
                                <table className="data-table">
                                    <caption className="sr-only">Building equipment inventory</caption>
                                    <thead>
                                        <tr>
                                            <th>Equipment</th>
                                            <th>Location</th>
                                            <th>System</th>
                                            <th>Status</th>
                                            <th>Reading</th>
                                            <th>Setpoint</th>
                                            <th>Mode</th>
                                            <th>
                                                <span className="sr-only">Details</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleEquipment.map((item) => (
                                            <tr key={item.id}>
                                                <td>
                                                    <span className="equipment-tag">{item.tag}</span>
                                                    <span className="muted small">{item.name}</span>
                                                </td>
                                                <td>
                                                    {item.floor}
                                                    <span className="muted small">{item.location}</span>
                                                </td>
                                                <td>{item.system}</td>
                                                <td>
                                                    <Status value={item.status} />
                                                </td>
                                                <td className="numeric">
                                                    {item.reading === null
                                                        ? 'Unavailable'
                                                        : item.unit === '°C'
                                                          ? temperature(item.reading, preferences.temperatureUnit)
                                                          : `${number(item.reading, 1)} ${item.unit}`}
                                                </td>
                                                <td className="numeric">
                                                    {item.setpoint === null ? '—' : temperature(item.setpoint, preferences.temperatureUnit)}
                                                </td>
                                                <td>{item.mode}</td>
                                                <td>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setDevice(item)}
                                                        aria-label={`Inspect ${item.tag}`}
                                                    >
                                                        Inspect
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {!visibleEquipment.length && <Empty />}
                        </section>
                    )}

                    {view === 'alarms' && (
                        <>
                            <div className="alarm-summary">
                                <div>
                                    <CircleAlert size={20} aria-hidden="true" />
                                    <strong>{activeAlarms.filter((item) => item.severity === 'Critical').length}</strong>
                                    <span>Critical active</span>
                                </div>
                                <div>
                                    <Bell size={20} aria-hidden="true" />
                                    <strong>{activeAlarms.filter((item) => item.severity === 'Warning').length}</strong>
                                    <span>Warning active</span>
                                </div>
                                <div>
                                    <Clock3 size={20} aria-hidden="true" />
                                    <strong>{unacknowledged.length}</strong>
                                    <span>Need acknowledgment</span>
                                </div>
                            </div>
                            <section className="panel">
                                <Tabs value={alarmTab} onValueChange={setAlarmTab}>
                                    <div className="alarm-tabs">
                                        <TabsList>
                                            <TabsTrigger value="active">Active ({activeAlarms.length})</TabsTrigger>
                                            <TabsTrigger value="unacknowledged">Unacknowledged</TabsTrigger>
                                            <TabsTrigger value="returned">Returned</TabsTrigger>
                                            <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
                                            <TabsTrigger value="all">All events</TabsTrigger>
                                        </TabsList>
                                    </div>
                                    <div className="filter-toolbar">
                                        <div className="search-filter">
                                            <Label htmlFor="alarm-search">Find alarm</Label>
                                            <Input
                                                id="alarm-search"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Condition or equipment tag…"
                                            />
                                        </div>
                                        <Filter
                                            id="alarm-priority"
                                            label="Priority"
                                            value={severity}
                                            onChange={setSeverity}
                                            options={[
                                                { value: 'all', label: 'All priorities' },
                                                ...['Critical', 'Warning', 'Info'].map((value) => ({ value, label: value })),
                                            ]}
                                        />
                                        <Filter
                                            id="alarm-floor"
                                            label="Floor"
                                            value={floor}
                                            onChange={setFloor}
                                            options={[{ value: 'all', label: 'All floors' }, ...floors.map((value) => ({ value, label: value }))]}
                                        />
                                        <Filter
                                            id="alarm-sort"
                                            label="Sort"
                                            value={alarmSort}
                                            onChange={setAlarmSort}
                                            options={[
                                                { value: 'priority', label: 'Active first, then priority' },
                                                { value: 'newest', label: 'Newest first' },
                                            ]}
                                        />
                                    </div>
                                    {alarmTabs.map((tab) => (
                                        <TabsContent key={tab} value={tab}>
                                            {alarmTable(visibleAlarms)}
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </section>
                        </>
                    )}

                    {view === 'schedules' && (
                        <>
                            <div className="info-banner">
                                <CalendarDays size={19} aria-hidden="true" />
                                <p>
                                    Weekly programs use <strong>Malaysia time (MYT)</strong>. These programs are saved locally; field execution and
                                    holiday exceptions are not connected.
                                </p>
                            </div>
                            <section className="panel">
                                <div className="panel-heading">
                                    <h2>Weekly programs</h2>
                                    <span className="muted small">{schedules.length} configured</span>
                                </div>
                                <div className="table-scroll">
                                    <table className="data-table schedule-table">
                                        <caption className="sr-only">Configured weekly operating programs</caption>
                                        <thead>
                                            <tr>
                                                <th>Program</th>
                                                <th>Operating days</th>
                                                <th>Time (MYT)</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schedules.map((item) => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <strong>{item.name}</strong>
                                                        <span className="muted small">{item.system}</span>
                                                    </td>
                                                    <td>
                                                        <div className="week-days">
                                                            {dayNames.map((day, index) => (
                                                                <span key={day} className={item.days.includes(index + 1) ? 'enabled' : ''}>
                                                                    {day}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="numeric">
                                                        {item.start_time} – {item.end_time}
                                                    </td>
                                                    <td>
                                                        <Status value={item.enabled ? 'Enabled' : 'Paused'} />
                                                    </td>
                                                    <td>
                                                        <div className="row-actions">
                                                            <Button variant="outline" size="sm" onClick={() => setScheduleEditor({ schedule: item })}>
                                                                Edit
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => setDeletingSchedule(item)}>
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {!schedules.length && (
                                    <Empty title="No programs configured">Add an operating schedule to define a weekly program.</Empty>
                                )}
                            </section>
                        </>
                    )}

                    {view === 'commissioning' && (
                        <Commissioning
                            issues={props.commissioningIssues}
                            equipment={equipment}
                            alarms={alarms}
                            source={alarms.find((item) => String(item.id) === query.get('alarm'))}
                            siteDate={props.siteDate}
                        />
                    )}

                    {view === 'reports' && (
                        <>
                            <section className="panel report-intro">
                                <div className="report-icon">
                                    <Download size={30} aria-hidden="true" />
                                </div>
                                <div>
                                    <h2>Energy & indoor environment</h2>
                                    <p className="muted">
                                        Export hourly energy consumption, baseline, temperature and humidity for the selected period. Includes units
                                        and MYT timestamps.
                                    </p>
                                    <span className="small muted">CSV format · {samples.length} hourly records · demonstration data</span>
                                </div>
                                {samples.length ? (
                                    <Button asChild>
                                        <a href={`/reports/energy.csv?range=${range}`}>
                                            <Download aria-hidden="true" />
                                            Download CSV
                                        </a>
                                    </Button>
                                ) : (
                                    <Button disabled>
                                        <Download aria-hidden="true" />
                                        Download CSV
                                    </Button>
                                )}
                            </section>
                            <section className="panel">
                                <div className="panel-heading">
                                    <h2>Data preview</h2>
                                    <span className="small muted">Most recent 10 samples</span>
                                </div>
                                {coverage}
                                <div className="table-scroll">
                                    <table className="data-table">
                                        <caption className="sr-only">Export preview, most recent hourly samples</caption>
                                        <thead>
                                            <tr>
                                                <th>Sample time (MYT)</th>
                                                <th>Energy (kWh)</th>
                                                <th>Baseline (kWh)</th>
                                                <th>Temperature (°C)</th>
                                                <th>Humidity (%)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {samples
                                                .slice(-10)
                                                .reverse()
                                                .map((item) => (
                                                    <tr key={item.recorded_at}>
                                                        <td>{dateTime(item.recorded_at)}</td>
                                                        <td className="numeric">{number(item.energy_kwh, 2)}</td>
                                                        <td className="numeric">{number(item.baseline_kwh, 2)}</td>
                                                        <td className="numeric">{number(item.temperature, 2)}</td>
                                                        <td className="numeric">{number(item.humidity, 2)}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                                {!samples.length && (
                                    <Empty title="No report data available">No measurements have been collected for this period.</Empty>
                                )}
                            </section>
                        </>
                    )}

                    {view === 'activity' && (
                        <section className="panel">
                            <div className="filter-toolbar">
                                <div className="search-filter">
                                    <Label htmlFor="activity-search">Find an action</Label>
                                    <Input
                                        id="activity-search"
                                        placeholder="Action, equipment or operator…"
                                        value={activitySearch}
                                        onChange={(e) => setActivitySearch(e.target.value)}
                                    />
                                </div>
                                <span className="muted small">Most recent 50 changes · MYT</span>
                            </div>
                            <div className="table-scroll">
                                <table className="data-table">
                                    <caption className="sr-only">Operator activity and saved changes</caption>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Action</th>
                                            <th>Subject</th>
                                            <th>Operator</th>
                                            <th>Change details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activity
                                            .filter((item) =>
                                                `${item.action} ${item.subject} ${item.operator}`
                                                    .toLowerCase()
                                                    .includes(activitySearch.toLowerCase()),
                                            )
                                            .map((item) => (
                                                <tr key={item.id}>
                                                    <td>{dateTime(item.created_at)}</td>
                                                    <td>
                                                        <strong>{item.action}</strong>
                                                    </td>
                                                    <td>{item.subject}</td>
                                                    <td>{item.operator ?? 'Deleted operator'}</td>
                                                    <td>
                                                        <details>
                                                            <summary>View changes</summary>
                                                            <pre className="change-details">
                                                                {JSON.stringify(JSON.parse(item.details ?? '{}'), null, 2)}
                                                            </pre>
                                                        </details>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                            {!activity.filter((item) =>
                                `${item.action} ${item.subject} ${item.operator}`.toLowerCase().includes(activitySearch.toLowerCase()),
                            ).length && (
                                <Empty title={activity.length ? 'No matching activity' : 'No operator changes yet'}>
                                    Acknowledgments, setpoint changes, schedules and preferences will appear here.
                                </Empty>
                            )}
                        </section>
                    )}
                    {view === 'preferences' && <PreferencesForm preferences={preferences} />}
                    {view === 'integrations' && (
                        <>
                            <section className="integration-header panel">
                                <span className="connection-symbol">
                                    <Network size={32} aria-hidden="true" />
                                </span>
                                <div>
                                    <h2>Field connections are not configured</h2>
                                    <p className="muted">
                                        This workspace uses a local demonstration database. No Schneider server or field controller is connected.
                                    </p>
                                </div>
                                <Status value="Disconnected" />
                            </section>
                            <div className="two-columns">
                                {[
                                    {
                                        title: 'BACnet/IP',
                                        detail: 'Typical source for air handling units, chillers, room controllers and lighting points.',
                                        needs: 'Gateway or service endpoint, device instances, object identifiers, units and quality mapping.',
                                    },
                                    {
                                        title: 'Modbus TCP',
                                        detail: 'Typical source for power meters, water meters and pump instrumentation.',
                                        needs: 'Gateway endpoint, unit IDs, register map, scaling, data types and polling interval.',
                                    },
                                ].map((item) => (
                                    <section className="panel integration-card" key={item.title}>
                                        <div className="panel-heading">
                                            <h2>{item.title}</h2>
                                            <Status value="Disconnected" />
                                        </div>
                                        <p>{item.detail}</p>
                                        <div className="instruction">
                                            <strong>Required for commissioning</strong>
                                            <p>{item.needs}</p>
                                        </div>
                                    </section>
                                ))}
                            </div>
                            <section className="panel commissioning">
                                <h2>Connecting to the client’s EcoStruxure system</h2>
                                <ol>
                                    <li>Confirm the installed Schneider product, version and supported integration interface.</li>
                                    <li>Obtain a read-only account, approved network access and the building point list.</li>
                                    <li>Map equipment, engineering units, timestamps and alarm states.</li>
                                    <li>Validate readings against WebStation before enabling controlled writes.</li>
                                </ol>
                                <div className="row-actions">
                                    <Button asChild variant="outline">
                                        <a
                                            href="https://ecostruxure-building-help.se.com/bms/topics/show?id=8792&locale=en-US&productversion=7.0"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Schneider WebStation documentation
                                        </a>
                                    </Button>
                                    <Button asChild variant="ghost">
                                        <Link href="/equipment">View demo equipment</Link>
                                    </Button>
                                </div>
                            </section>
                        </>
                    )}
                    <footer className="workspace-footer">
                        <span>
                            Meridian BMS <span> / </span> Development workspace
                        </span>
                        <span>Simulated data · Asia/Kuala_Lumpur</span>
                    </footer>
                </main>
            </div>
            {alarm && <AlarmEditor key={alarm.id} alarm={alarm} close={() => setAlarm(null)} />}
            {device && (
                <EquipmentEditor
                    key={device.id}
                    equipment={device}
                    unit={preferences.temperatureUnit}
                    demo={props.demo}
                    close={() => setDevice(null)}
                />
            )}
            {scheduleEditor && <ScheduleEditor schedule={scheduleEditor.schedule} close={() => setScheduleEditor(null)} />}
            <Dialog open={!!deletingSchedule} onOpenChange={(open) => !open && setDeletingSchedule(null)}>
                <DialogContent className="bms-dialog">
                    <DialogHeader>
                        <DialogTitle>Delete operating schedule?</DialogTitle>
                        <DialogDescription>
                            Remove “{deletingSchedule?.name}” from the local schedule configuration. This change is recorded in the activity log.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="dialog-actions">
                        <Button variant="outline" onClick={() => setDeletingSchedule(null)}>
                            Keep schedule
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={busy}
                            onClick={() => {
                                if (deletingSchedule)
                                    router.delete(`/schedules/${deletingSchedule.id}`, {
                                        onStart: () => setBusy(true),
                                        onFinish: () => setBusy(false),
                                        onSuccess: () => setDeletingSchedule(null),
                                    });
                            }}
                        >
                            {busy ? 'Deleting…' : 'Delete schedule'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
