import { Button } from '@/components/ui/button';
import { type View } from '@/types/bms';
import { Link, router } from '@inertiajs/react';
import {
    Activity,
    Bell,
    Building2,
    CalendarClock,
    ChartNoAxesCombined,
    ChevronRight,
    CircleHelp,
    ClipboardCheck,
    FileChartColumn,
    LayoutDashboard,
    LogOut,
    Network,
    Settings2,
    SlidersHorizontal,
    type LucideIcon,
} from 'lucide-react';

export const navItems: { view: View; label: string; icon: LucideIcon; group: string; href: string }[] = [
    { view: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'MONITOR', href: '/dashboard' },
    { view: 'analytics', label: 'Energy & analytics', icon: ChartNoAxesCombined, group: 'MONITOR', href: '/analytics' },
    { view: 'equipment', label: 'Equipment', icon: SlidersHorizontal, group: 'OPERATE', href: '/equipment' },
    { view: 'alarms', label: 'Alarms', icon: Bell, group: 'OPERATE', href: '/alarms' },
    { view: 'schedules', label: 'Schedules', icon: CalendarClock, group: 'OPERATE', href: '/schedules' },
    { view: 'commissioning', label: 'Commissioning', icon: ClipboardCheck, group: 'OPERATE', href: '/commissioning' },
    { view: 'reports', label: 'Reports', icon: FileChartColumn, group: 'OPERATE', href: '/reports' },
    { view: 'activity', label: 'Activity log', icon: Activity, group: 'MANAGE', href: '/activity' },
    { view: 'integrations', label: 'Integrations', icon: Network, group: 'MANAGE', href: '/integrations' },
    { view: 'preferences', label: 'Settings', icon: Settings2, group: 'MANAGE', href: '/preferences' },
];

export function Navigation({
    view,
    siteName,
    alarmCount,
    user,
    onNavigate,
}: {
    view: View;
    siteName: string;
    alarmCount: number;
    user: string;
    onNavigate?: () => void;
}) {
    return (
        <div className="navigation-inner">
            <Link href="/dashboard" className="brand" onClick={onNavigate}>
                <span className="brand-name">
                    Iotnect BMS
                    <span className="brand-square" />
                </span>
                <span className="brand-caption">BUILDING MANAGEMENT</span>
            </Link>
            <div className="site-identity">
                <Building2 size={22} aria-hidden="true" />
                <div>
                    <strong>{siteName}</strong>
                    <span>Demonstration building</span>
                </div>
            </div>
            <nav aria-label="Main navigation">
                {['MONITOR', 'OPERATE', 'MANAGE'].map((group) => (
                    <div className="nav-group" key={group}>
                        <p className="nav-label">{group}</p>
                        {navItems
                            .filter((item) => item.group === group)
                            .map((item) => (
                                <Link
                                    key={item.view}
                                    href={item.href}
                                    aria-current={view === item.view ? 'page' : undefined}
                                    className={`nav-link ${view === item.view ? 'selected' : ''}`}
                                    onClick={onNavigate}
                                >
                                    <item.icon size={18} strokeWidth={1.7} aria-hidden="true" />
                                    <span>{item.label}</span>
                                    {item.view === 'alarms' && alarmCount > 0 ? (
                                        <span className="nav-count">{alarmCount}</span>
                                    ) : view === item.view ? (
                                        <ChevronRight size={14} aria-hidden="true" />
                                    ) : null}
                                </Link>
                            ))}
                    </div>
                ))}
            </nav>
            <div className="nav-bottom">
                <Link href="/integrations" className="help-link" onClick={onNavigate}>
                    <CircleHelp size={17} aria-hidden="true" />
                    System & connection info
                </Link>
                <div className="operator">
                    <span className="operator-initial" aria-hidden="true">
                        {user.charAt(0)}
                    </span>
                    <div>
                        <strong>{user}</strong>
                        <span>Local workspace</span>
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={() => router.post('/logout')}>
                        <LogOut size={17} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
