import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ReactNode } from 'react';

export function Filter({
    id,
    label,
    value,
    onChange,
    options,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="filter">
            <Label htmlFor={id}>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id={id}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export function Status({ value }: { value: string }) {
    const tone = ['Critical', 'Alarm'].includes(value)
        ? 'danger'
        : ['Warning', 'Offline', 'Paused', 'Disconnected', 'Overdue'].includes(value) || value.includes('attention')
          ? 'warning'
          : ['Online', 'Enabled', 'Acknowledged', 'Returned', 'Resolved'].includes(value)
            ? 'good'
            : 'neutral';
    return (
        <span className={`status ${tone}`}>
            <span aria-hidden="true" className="status-dot" />
            {value}
        </span>
    );
}

export function Empty({ title = 'No matching results', children }: { title?: string; children?: ReactNode }) {
    return (
        <div className="empty-state">
            <strong>{title}</strong>
            <p>{children ?? 'Try changing your search or filters.'}</p>
        </div>
    );
}

export function FormErrors({ errors }: { errors: Record<string, string> }) {
    return Object.keys(errors).length > 0 ? (
        <div role="alert" className="form-errors">
            {Object.entries(errors).map(([key, message]) => (
                <p key={key}>{message}</p>
            ))}
        </div>
    ) : null;
}
