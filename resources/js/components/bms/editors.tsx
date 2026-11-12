import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { type Alarm, type Equipment, type Preferences, type Schedule, dateTime, temperature } from '@/types/bms';
import { useForm } from '@inertiajs/react';
import { Filter, FormErrors, Status } from './controls';

export function AlarmEditor({ alarm, close }: { alarm: Alarm; close: () => void }) {
    const form = useForm({ note: '' });
    return (
        <Dialog open onOpenChange={(open) => !open && close()}>
            <DialogContent className="bms-dialog">
                <DialogHeader>
                    <DialogTitle>Alarm details</DialogTitle>
                    <DialogDescription>
                        {alarm.equipment.tag} · {alarm.equipment.floor} · {alarm.equipment.location}
                    </DialogDescription>
                </DialogHeader>
                <Status value={alarm.severity} />
                <h3 className="detail-heading">{alarm.message}</h3>
                <dl className="detail-grid">
                    <div>
                        <dt>Occurred</dt>
                        <dd>{dateTime(alarm.occurred_at)}</dd>
                    </div>
                    <div>
                        <dt>Condition</dt>
                        <dd>{alarm.returned_at ? 'Returned to normal' : 'Active'}</dd>
                    </div>
                </dl>
                <div className="instruction">
                    <strong>Recommended response</strong>
                    <p>{alarm.instruction}</p>
                </div>
                {alarm.acknowledged_at ? (
                    <div className="instruction">
                        <strong>Acknowledged by {alarm.operator?.name}</strong>
                        <p>{dateTime(alarm.acknowledged_at)}</p>
                        <p>{alarm.note}</p>
                    </div>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post(`/alarms/${alarm.id}/acknowledge`, { onSuccess: close, preserveScroll: true });
                        }}
                        className="editor-form"
                    >
                        <div className="field">
                            <Label htmlFor="ack-note">Operator response</Label>
                            <Textarea
                                id="ack-note"
                                required
                                minLength={5}
                                maxLength={1000}
                                value={form.data.note}
                                onChange={(e) => form.setData('note', e.target.value)}
                                placeholder="Describe the inspection or next action…"
                            />
                        </div>
                        <p className="muted small">Acknowledging records your response. It does not clear the alarm condition.</p>
                        <FormErrors errors={form.errors} />
                        <Button disabled={form.processing} type="submit">
                            {form.processing ? 'Saving…' : 'Acknowledge alarm'}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

export function EquipmentEditor({ equipment, unit, demo, close }: { equipment: Equipment; unit: 'C' | 'F'; demo: boolean; close: () => void }) {
    const form = useForm({ setpoint: equipment.setpoint ?? 23, mode: equipment.mode });
    return (
        <Dialog open onOpenChange={(open) => !open && close()}>
            <DialogContent className="bms-dialog">
                <DialogHeader>
                    <DialogTitle>{equipment.tag}</DialogTitle>
                    <DialogDescription>
                        {equipment.name} · {equipment.floor}, {equipment.location}
                    </DialogDescription>
                </DialogHeader>
                <Status value={equipment.status} />
                <dl className="detail-grid">
                    <div>
                        <dt>Current reading</dt>
                        <dd>
                            {equipment.reading === null
                                ? 'Unavailable'
                                : equipment.unit === '°C'
                                  ? temperature(equipment.reading, unit)
                                  : `${equipment.reading} ${equipment.unit}`}
                        </dd>
                    </div>
                    <div>
                        <dt>Protocol</dt>
                        <dd>{equipment.protocol}</dd>
                    </div>
                    <div>
                        <dt>Last sample</dt>
                        <dd>{dateTime(equipment.last_seen_at)}</dd>
                    </div>
                    <div>
                        <dt>Operating mode</dt>
                        <dd>{equipment.mode}</dd>
                    </div>
                </dl>
                {equipment.setpoint !== null && demo && equipment.status !== 'Offline' ? (
                    <form
                        className="editor-form"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.patch(`/equipment/${equipment.id}`, { onSuccess: close, preserveScroll: true });
                        }}
                    >
                        <div className="instruction">
                            <strong>Demonstration control</strong>
                            <p>This updates the saved setpoint only. No command is sent to a controller.</p>
                        </div>
                        <div className="form-pair">
                            <div className="field">
                                <Label htmlFor="setpoint">Setpoint (°C)</Label>
                                <Input
                                    id="setpoint"
                                    type="number"
                                    min={5}
                                    max={30}
                                    step={0.5}
                                    required
                                    value={form.data.setpoint}
                                    onChange={(e) => form.setData('setpoint', Number(e.target.value))}
                                />
                            </div>
                            <Filter
                                id="mode"
                                label="Mode"
                                value={form.data.mode}
                                onChange={(value) => form.setData('mode', value as 'Auto' | 'Manual')}
                                options={['Auto', 'Manual'].map((value) => ({ value, label: value }))}
                            />
                        </div>
                        <FormErrors errors={form.errors} />
                        <Button disabled={form.processing} type="submit">
                            {form.processing ? 'Saving…' : 'Save demo setpoint'}
                        </Button>
                    </form>
                ) : (
                    <p className="muted">This point is read-only. {equipment.status === 'Offline' && 'Its last value is unavailable.'}</p>
                )}
            </DialogContent>
        </Dialog>
    );
}

export const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function ScheduleEditor({ schedule, close }: { schedule: Schedule | null; close: () => void }) {
    const form = useForm({
        name: schedule?.name ?? '',
        system: schedule?.system ?? 'HVAC',
        days: schedule?.days ?? [1, 2, 3, 4, 5],
        start_time: schedule?.start_time ?? '07:00',
        end_time: schedule?.end_time ?? '19:00',
        enabled: schedule?.enabled ?? true,
    });
    return (
        <Dialog open onOpenChange={(open) => !open && close()}>
            <DialogContent className="bms-dialog">
                <DialogHeader>
                    <DialogTitle>{schedule ? 'Edit schedule' : 'New operating schedule'}</DialogTitle>
                    <DialogDescription>Configure a weekly program. Controller execution is not connected.</DialogDescription>
                </DialogHeader>
                <form
                    className="editor-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const options = { onSuccess: close, preserveScroll: true };
                        if (schedule) form.put(`/schedules/${schedule.id}`, options);
                        else form.post('/schedules', options);
                    }}
                >
                    <div className="field">
                        <Label htmlFor="schedule-name">Schedule name</Label>
                        <Input
                            id="schedule-name"
                            required
                            maxLength={80}
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                        />
                    </div>
                    <Filter
                        id="schedule-system"
                        label="Building system"
                        value={form.data.system}
                        onChange={(value) => form.setData('system', value)}
                        options={['HVAC', 'Lighting', 'Water'].map((value) => ({ value, label: value }))}
                    />
                    <fieldset>
                        <legend>Operating days</legend>
                        <div className="day-picker">
                            {dayNames.map((name, index) => (
                                <label key={name} className="day-option">
                                    <Checkbox
                                        checked={form.data.days.includes(index + 1)}
                                        onCheckedChange={(checked) =>
                                            form.setData(
                                                'days',
                                                checked ? [...form.data.days, index + 1].sort() : form.data.days.filter((day) => day !== index + 1),
                                            )
                                        }
                                    />
                                    {name}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div className="form-pair">
                        <div className="field">
                            <Label htmlFor="start-time">Start time (MYT)</Label>
                            <Input
                                id="start-time"
                                type="time"
                                required
                                value={form.data.start_time}
                                onChange={(e) => form.setData('start_time', e.target.value)}
                            />
                        </div>
                        <div className="field">
                            <Label htmlFor="end-time">End time (MYT)</Label>
                            <Input
                                id="end-time"
                                type="time"
                                required
                                value={form.data.end_time}
                                onChange={(e) => form.setData('end_time', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="switch-row">
                        <Label htmlFor="schedule-enabled">Enable this program</Label>
                        <Switch id="schedule-enabled" checked={form.data.enabled} onCheckedChange={(value) => form.setData('enabled', value)} />
                    </div>
                    <FormErrors errors={form.errors} />
                    <Button disabled={form.processing} type="submit">
                        {form.processing ? 'Saving…' : 'Save schedule'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function PreferencesForm({ preferences }: { preferences: Preferences }) {
    const form = useForm({ ...preferences });
    return (
        <form
            className="settings-form"
            onSubmit={(e) => {
                e.preventDefault();
                form.put('/preferences', { preserveScroll: true });
            }}
        >
            <section className="panel settings-section">
                <div>
                    <h2>Workspace</h2>
                    <p className="muted">Make this workspace your own. Preferences are saved to your account.</p>
                </div>
                <div className="field">
                    <Label htmlFor="site-name">Building display name</Label>
                    <Input
                        id="site-name"
                        required
                        maxLength={60}
                        value={form.data.siteName}
                        onChange={(e) => form.setData('siteName', e.target.value)}
                    />
                </div>
                <div className="form-pair">
                    <Filter
                        id="theme"
                        label="Appearance"
                        value={form.data.theme}
                        onChange={(value) => form.setData('theme', value as 'light' | 'dark')}
                        options={[
                            { value: 'light', label: 'Light workspace' },
                            { value: 'dark', label: 'Dark workspace' },
                        ]}
                    />
                    <Filter
                        id="temperature-unit"
                        label="Temperature unit"
                        value={form.data.temperatureUnit}
                        onChange={(value) => form.setData('temperatureUnit', value as 'C' | 'F')}
                        options={[
                            { value: 'C', label: 'Celsius (°C)' },
                            { value: 'F', label: 'Fahrenheit (°F)' },
                        ]}
                    />
                </div>
                <div className="switch-row">
                    <div>
                        <Label htmlFor="compact">Compact tables</Label>
                        <p className="muted small">Fit more equipment rows in the workspace.</p>
                    </div>
                    <Switch id="compact" checked={form.data.compact} onCheckedChange={(value) => form.setData('compact', value)} />
                </div>
            </section>
            <section className="panel settings-section">
                <div>
                    <h2>Energy target</h2>
                    <p className="muted">A reference target for the 24-hour consumption summary.</p>
                </div>
                <div className="field">
                    <Label htmlFor="energy-target">24-hour energy target (kWh)</Label>
                    <Input
                        id="energy-target"
                        type="number"
                        required
                        min={100}
                        max={1000000}
                        value={form.data.dailyTarget}
                        onChange={(e) => form.setData('dailyTarget', Number(e.target.value))}
                    />
                </div>
                <p className="muted small">Site timezone: Asia/Kuala_Lumpur (UTC+08:00). Setpoints are entered in Celsius.</p>
            </section>
            <FormErrors errors={form.errors} />
            <Button type="submit" disabled={form.processing}>
                {form.processing ? 'Saving…' : 'Save preferences'}
            </Button>
        </form>
    );
}
