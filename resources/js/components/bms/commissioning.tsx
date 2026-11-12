import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { dateTime, issueStatuses, type Alarm, type CommissioningIssue, type Equipment } from '@/types/bms';
import { Link, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Empty, Filter, FormErrors, Status } from './controls';

export function Commissioning({
    issues,
    equipment,
    alarms,
    source,
    siteDate,
}: {
    issues: CommissioningIssue[];
    equipment: Equipment[];
    alarms: Alarm[];
    source?: Alarm;
    siteDate: string;
}) {
    const [editor, setEditor] = useState<{ issue?: CommissioningIssue; alarm?: Alarm } | null>(source ? { alarm: source } : null);
    const [filter, setFilter] = useState('outstanding');
    const [search, setSearch] = useState('');
    const isOverdue = (issue: CommissioningIssue) => issue.status !== 'Resolved' && !!issue.due_on && issue.due_on < siteDate;
    const devices = new Map(equipment.map((item) => [item.id, item]));
    const visible = issues.filter((issue) => {
        const tag = issue.equipment_id ? devices.get(issue.equipment_id)?.tag : '';
        const matchesSearch = `CX-${issue.id} ${issue.title} ${issue.responsible_party} ${tag ?? ''}`
            .toLowerCase()
            .includes(search.trim().toLowerCase());
        return (
            matchesSearch &&
            (filter === 'all' ||
                filter === issue.status ||
                (filter === 'outstanding' && issue.status !== 'Resolved') ||
                (filter === 'overdue' && isOverdue(issue)))
        );
    });
    return (
        <section className="panel">
            <div className="panel-heading">
                <div>
                    <h2>Issues & resolutions</h2>
                    <p className="muted small">
                        {issues.filter((issue) => issue.status !== 'Resolved').length} outstanding · {issues.filter(isOverdue).length} overdue
                    </p>
                </div>
                <Button onClick={() => setEditor({})}>
                    <Plus aria-hidden="true" />
                    Log issue
                </Button>
            </div>
            <div className="filter-toolbar">
                <div className="search-filter">
                    <Label htmlFor="issue-search">Find issue</Label>
                    <Input
                        id="issue-search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Issue, equipment tag or responsible party…"
                    />
                </div>
                <Filter
                    id="issue-filter"
                    label="Show"
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: 'outstanding', label: 'Outstanding' },
                        { value: 'overdue', label: 'Overdue' },
                        { value: 'all', label: 'All issues' },
                        ...issueStatuses.map((value) => ({ value, label: value })),
                    ]}
                />
            </div>
            {visible.length ? (
                <div className="table-scroll" role="region" aria-label="Commissioning register table" tabIndex={0}>
                    <table className="data-table commissioning-table">
                        <caption className="sr-only">Commissioning issues</caption>
                        <thead>
                            <tr>
                                <th>Issue</th>
                                <th>Equipment</th>
                                <th>Responsible party</th>
                                <th>Due date (MYT)</th>
                                <th>Status</th>
                                <th>
                                    <span className="sr-only">Action</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((issue) => (
                                <tr key={issue.id}>
                                    <td>
                                        <span className="equipment-tag">CX-{issue.id}</span>
                                        <strong>{issue.title}</strong>
                                    </td>
                                    <td>{issue.equipment_id ? (devices.get(issue.equipment_id)?.tag ?? '—') : '—'}</td>
                                    <td>{issue.responsible_party}</td>
                                    <td>
                                        {issue.due_on ?? '—'}
                                        {isOverdue(issue) && (
                                            <div>
                                                <Status value="Overdue" />
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <Status value={issue.status} />
                                    </td>
                                    <td>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            aria-label={`Review issue CX-${issue.id}`}
                                            onClick={() => setEditor({ issue, alarm: alarms.find((alarm) => alarm.id === issue.alarm_id) })}
                                        >
                                            Review
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <Empty title={issues.length ? 'No issues match the filters' : 'No commissioning issues yet'}>
                    {issues.length
                        ? 'Change the status filter or search terms.'
                        : 'Log a finding from a functional test, site inspection or alarm review.'}
                </Empty>
            )}
            {editor && (
                <IssueEditor
                    {...editor}
                    equipment={equipment}
                    close={() => setEditor(null)}
                    onSaved={() => {
                        setEditor(null);
                        setFilter('all');
                        setSearch('');
                    }}
                />
            )}
        </section>
    );
}

function IssueEditor({
    issue,
    alarm,
    equipment,
    close,
    onSaved,
}: {
    issue?: CommissioningIssue;
    alarm?: Alarm;
    equipment: Equipment[];
    close: () => void;
    onSaved: () => void;
}) {
    const form = useForm({
        title: issue?.title ?? alarm?.message ?? '',
        description: issue?.description ?? '',
        responsible_party: issue?.responsible_party ?? '',
        due_on: issue?.due_on ?? '',
        status: issue?.status ?? 'Open',
        verification: issue?.verification ?? '',
        equipment_id: issue?.equipment_id ?? alarm?.equipment.id ?? null,
        alarm_id: issue ? null : (alarm?.id ?? null),
        revision: issue?.revision ?? null,
    });
    return (
        <Dialog open onOpenChange={(open) => !open && close()}>
            <DialogContent className="bms-dialog">
                <DialogHeader>
                    <DialogTitle>{issue ? `Commissioning issue CX-${issue.id}` : 'Log commissioning issue'}</DialogTitle>
                    <DialogDescription>
                        {issue
                            ? `Reported by ${issue.reporter?.name ?? 'Former user'} · ${dateTime(issue.created_at)} MYT`
                            : 'Describe the finding and assign the party responsible for correction.'}
                    </DialogDescription>
                </DialogHeader>
                {alarm && (
                    <div className="instruction">
                        <strong>
                            Source alarm {alarm.id} · {alarm.equipment.tag}
                        </strong>
                        <p>
                            {alarm.message} · {dateTime(alarm.occurred_at)} MYT
                        </p>
                    </div>
                )}
                {issue?.resolved_at && (
                    <p className="muted small">
                        Verified by {issue.verifier?.name ?? 'Former user'} · {dateTime(issue.resolved_at)} MYT
                    </p>
                )}
                <form
                    className="editor-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (issue) {
                            form.put(`/commissioning/${issue.id}`, { onSuccess: onSaved, preserveScroll: true });
                        } else {
                            form.post('/commissioning', { onSuccess: onSaved, preserveScroll: true });
                        }
                    }}
                >
                    <div className="field">
                        <Label htmlFor="issue-title">Issue title</Label>
                        <Input
                            id="issue-title"
                            required
                            maxLength={120}
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <Label htmlFor="issue-description">Finding</Label>
                        <Textarea
                            id="issue-description"
                            required
                            maxLength={3000}
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                        />
                    </div>
                    {!alarm && (
                        <Filter
                            id="issue-equipment"
                            label="Equipment"
                            value={form.data.equipment_id?.toString() ?? 'none'}
                            onChange={(value) => form.setData('equipment_id', value === 'none' ? null : Number(value))}
                            options={[
                                { value: 'none', label: 'Building-wide' },
                                ...equipment.map((item) => ({ value: String(item.id), label: item.tag })),
                            ]}
                        />
                    )}
                    <div className="field">
                        <Label htmlFor="issue-party">Responsible party</Label>
                        <Input
                            id="issue-party"
                            required
                            maxLength={120}
                            value={form.data.responsible_party}
                            onChange={(e) => form.setData('responsible_party', e.target.value)}
                        />
                    </div>
                    <div className="form-pair">
                        <div className="field">
                            <Label htmlFor="issue-due">Due date (optional)</Label>
                            <Input id="issue-due" type="date" value={form.data.due_on} onChange={(e) => form.setData('due_on', e.target.value)} />
                        </div>
                        <Filter
                            id="issue-status"
                            label="Status"
                            value={form.data.status}
                            onChange={(value) => form.setData('status', value as CommissioningIssue['status'])}
                            options={issueStatuses.map((value) => ({ value, label: value }))}
                        />
                    </div>
                    {form.data.status === 'Resolved' && (
                        <div className="field">
                            <Label htmlFor="issue-verification">Correction and verification evidence</Label>
                            <Textarea
                                id="issue-verification"
                                required
                                maxLength={3000}
                                value={form.data.verification}
                                onChange={(e) => form.setData('verification', e.target.value)}
                                placeholder="Record the correction, retest result and any reference number."
                            />
                        </div>
                    )}
                    <FormErrors errors={form.errors} />
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving…' : 'Save issue'}
                    </Button>
                </form>
                {alarm && (
                    <Button asChild variant="ghost">
                        <Link href={`/alarms?state=all&search=${encodeURIComponent(alarm.message)}`} onClick={close}>
                            View source alarm
                        </Link>
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
}
