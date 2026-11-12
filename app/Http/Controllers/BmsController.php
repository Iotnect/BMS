<?php

namespace App\Http\Controllers;

use App\Models\Alarm;
use App\Models\CommissioningIssue;
use App\Models\Equipment;
use App\Models\OperatingSchedule;
use App\Models\TrendSample;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BmsController extends Controller
{
    private const RANGE_HOURS = ['24h' => 24, '7d' => 168, '30d' => 720];

    public function index(Request $request, string $view = 'overview'): Response
    {
        $range = $request->validate(['range' => ['nullable', Rule::in(array_keys(self::RANGE_HOURS))]])['range'] ?? '24h';
        $latest = TrendSample::max('recorded_at');
        $samples = $this->trendQuery($range, $latest)->get();
        $settings = DB::table('bms_settings')->where('user_id', $request->user()->id)->value('preferences');

        return Inertia::render('bms/workspace', [
            'view' => $view,
            'range' => $range,
            'demo' => (bool) config('bms.demo'),
            'equipment' => Equipment::orderBy('tag')->get(),
            'alarms' => Alarm::with(['equipment', 'operator:id,name'])->orderByDesc('occurred_at')->get(),
            'samples' => $samples,
            'commissioningIssues' => fn () => $view === 'commissioning'
                ? CommissioningIssue::with(['reporter:id,name', 'verifier:id,name'])->latest('id')->get()
                : [],
            'schedules' => OperatingSchedule::orderBy('id')->get(),
            'preferences' => array_merge(['siteName' => 'Meridian Tower', 'theme' => 'light', 'temperatureUnit' => 'C', 'dailyTarget' => 4000, 'compact' => false], $settings ? json_decode($settings, true) : []),
            'activity' => DB::table('activity_logs')->leftJoin('users', 'activity_logs.user_id', '=', 'users.id')->select('activity_logs.*', 'users.name as operator')->orderByDesc('activity_logs.id')->limit(50)->get(),
            'snapshotAt' => $latest ? Carbon::parse($latest)->toISOString() : null,
            'siteDate' => now('Asia/Kuala_Lumpur')->toDateString(),
            'flash' => ['success' => $request->session()->get('success')],
        ]);
    }

    public function demoLogin(Request $request): RedirectResponse
    {
        abort_unless(config('bms.demo') && (app()->environment('local') || config('bms.hosted_demo')), 404);
        $user = User::firstOrCreate(['email' => 'demo@bms.local'], ['name' => 'Demo Operator', 'password' => Str::random(64)]);
        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }

    public function acknowledge(Request $request, Alarm $alarm): RedirectResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'min:5', 'max:1000']]);
        DB::transaction(function () use ($request, $alarm, $data) {
            $locked = Alarm::lockForUpdate()->findOrFail($alarm->id);
            abort_if($locked->acknowledged_at !== null, 409, 'This alarm has already been acknowledged. Refresh to see its current state.');
            $locked->update(['acknowledged_at' => now(), 'acknowledged_by' => $request->user()->id, 'note' => $data['note']]);
            $this->log($request, 'Alarm acknowledged', $locked->message, ['note' => $data['note'], 'alarm_id' => $alarm->id]);
        });

        return back()->with('success', 'Alarm acknowledged. The underlying condition is unchanged.');
    }

    public function equipment(Request $request, Equipment $equipment): RedirectResponse
    {
        abort_unless(config('bms.demo'), 409, 'Controller writes are not configured.');
        abort_if($equipment->setpoint === null || $equipment->status === 'Offline', 422, 'This equipment does not have an available writable setpoint.');
        $data = $request->validate(['setpoint' => ['required', 'numeric', 'min:5', 'max:30', 'multiple_of:0.5'], 'mode' => ['required', Rule::in(['Auto', 'Manual'])]]);
        DB::transaction(function () use ($request, $equipment, $data) {
            $before = $equipment->only(['setpoint', 'mode']);
            $equipment->update($data);
            $this->log($request, 'Demo setpoint changed', $equipment->tag, ['before' => $before, 'after' => $data]);
        });

        return back()->with('success', 'Demo setpoint saved. No command was sent to field equipment.');
    }

    public function saveSchedule(Request $request, ?OperatingSchedule $schedule = null): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'system' => ['required', Rule::in(['HVAC', 'Lighting', 'Water'])],
            'days' => ['required', 'array', 'min:1', 'max:7'],
            'days.*' => ['required', 'integer', 'between:1,7', 'distinct'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'enabled' => ['required', 'boolean'],
        ]);
        DB::transaction(function () use ($request, $schedule, $data) {
            $before = $schedule?->toArray();
            $saved = $schedule ?? new OperatingSchedule;
            $saved->fill($data)->save();
            $this->log($request, $before ? 'Schedule updated' : 'Schedule created', $saved->name, ['before' => $before, 'after' => $data]);
        });

        return back()->with('success', 'Schedule saved locally. Controller execution is not connected.');
    }

    public function deleteSchedule(Request $request, OperatingSchedule $schedule): RedirectResponse
    {
        DB::transaction(function () use ($request, $schedule) {
            $this->log($request, 'Schedule deleted', $schedule->name, $schedule->toArray());
            $schedule->delete();
        });

        return back()->with('success', 'Schedule deleted.');
    }

    public function saveIssue(Request $request, ?CommissioningIssue $issue = null): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'description' => ['required', 'string', 'max:3000'],
            'responsible_party' => ['required', 'string', 'max:120'],
            'equipment_id' => ['nullable', 'integer', 'exists:equipment,id'],
            'alarm_id' => [$issue ? 'prohibited' : 'sometimes', 'nullable', 'integer', 'exists:alarms,id'],
            'due_on' => ['nullable', 'date_format:Y-m-d'],
            'status' => ['required', Rule::in(CommissioningIssue::STATUSES)],
            'verification' => ['required_if:status,Resolved', 'nullable', 'string', 'max:3000'],
            'revision' => [$issue ? 'required' : 'prohibited', 'nullable', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($request, $issue, $data) {
            $fields = collect($data)->except(['alarm_id', 'revision'])->all();
            $alarm = Alarm::find($issue?->alarm_id ?? $data['alarm_id'] ?? null);
            if ($alarm) {
                $fields['equipment_id'] = $alarm->equipment_id;
            }

            if ($data['status'] !== 'Resolved') {
                $fields['verification'] = null;
                $fields['resolved_at'] = null;
                $fields['resolved_by'] = null;
            } elseif ($issue?->status !== 'Resolved' || $issue->verification !== $data['verification']) {
                $fields['resolved_at'] = now();
                $fields['resolved_by'] = $request->user()->id;
            }

            if ($issue) {
                $updated = $issue->revision === (int) $data['revision']
                    && CommissioningIssue::whereKey($issue->id)->where('revision', $issue->revision)
                        ->update($fields + ['revision' => $issue->revision + 1]);
                if (! $updated) {
                    throw ValidationException::withMessages(['revision' => 'This issue changed while you were editing. Close and reopen it to review the latest version.']);
                }
                $saved = $issue->fresh();
            } else {
                $saved = CommissioningIssue::create($fields + [
                    'alarm_id' => $alarm?->id,
                    'reported_by' => $request->user()->id,
                ]);
            }

            $auditFields = ['title', 'description', 'responsible_party', 'equipment_id', 'alarm_id', 'due_on', 'status', 'verification', 'resolved_at', 'resolved_by'];
            $this->log($request, $issue ? 'Commissioning issue updated' : 'Commissioning issue logged', 'CX-'.$saved->id, [
                'before' => $issue?->only($auditFields),
                'after' => $saved->only($auditFields),
            ]);
        });

        return redirect()->route('bms.commissioning')->with('success', $issue ? 'Commissioning issue updated.' : 'Commissioning issue logged.');
    }

    public function settings(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'siteName' => ['required', 'string', 'max:60'],
            'theme' => ['required', Rule::in(['light', 'dark'])],
            'temperatureUnit' => ['required', Rule::in(['C', 'F'])],
            'dailyTarget' => ['required', 'integer', 'min:100', 'max:1000000'],
            'compact' => ['required', 'boolean'],
        ]);
        DB::transaction(function () use ($request, $data) {
            DB::table('bms_settings')->updateOrInsert(['user_id' => $request->user()->id], ['preferences' => json_encode($data), 'created_at' => now(), 'updated_at' => now()]);
            $this->log($request, 'Workspace preferences saved', 'Personal settings', $data);
        });

        return back()->with('success', 'Workspace preferences saved.');
    }

    public function export(Request $request): StreamedResponse
    {
        $range = $request->validate(['range' => ['nullable', Rule::in(array_keys(self::RANGE_HOURS))]])['range'] ?? '24h';
        $query = $this->trendQuery($range, TrendSample::max('recorded_at'));

        return response()->streamDownload(function () use ($query) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Sample data', 'Recorded at (Asia/Kuala_Lumpur)', 'Energy (kWh)', 'Baseline (kWh)', 'Temperature (C)', 'Humidity (%)'], escape: '');
            foreach ($query->cursor() as $sample) {
                fputcsv($file, ['DEMONSTRATION', $sample->recorded_at->timezone('Asia/Kuala_Lumpur')->format('Y-m-d H:i'), $sample->energy_kwh, $sample->baseline_kwh, $sample->temperature, $sample->humidity], escape: '');
            }
            fclose($file);
        }, 'bms-energy-'.$range.'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function trendQuery(string $range, ?string $latest): Builder
    {
        if ($latest === null) {
            return TrendSample::whereNull('recorded_at');
        }

        return TrendSample::orderBy('recorded_at')
            ->where('recorded_at', '<=', $latest)
            ->where('recorded_at', '>', Carbon::parse($latest)->startOfHour()->subHours(self::RANGE_HOURS[$range]));
    }

    private function log(Request $request, string $action, string $subject, array $details): void
    {
        DB::table('activity_logs')->insert(['user_id' => $request->user()->id, 'action' => $action, 'subject' => $subject, 'details' => json_encode($details), 'created_at' => now()]);
    }
}
