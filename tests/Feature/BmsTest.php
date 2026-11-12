<?php

namespace Tests\Feature;

use App\Models\Alarm;
use App\Models\Equipment;
use App\Models\OperatingSchedule;
use App\Models\User;
use Database\Seeders\BmsSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BmsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(BmsSeeder::class);
    }

    public function test_workspace_pages_require_authentication(): void
    {
        foreach (['dashboard', 'analytics', 'equipment', 'alarms', 'schedules', 'reports', 'activity', 'preferences', 'integrations', 'reports/energy.csv'] as $page) {
            $this->get('/'.$page)->assertRedirect('/login');
        }
        $this->post('/alarms/1/acknowledge', ['note' => 'Inspecting coil'])->assertRedirect('/login');
        $this->assertDatabaseCount('activity_logs', 0);
    }

    public function test_reporting_period_filters_samples_for_all_pages(): void
    {
        $this->actingAs(User::factory()->create());
        foreach (['24h' => 24, '7d' => 168, '30d' => 720] as $range => $count) {
            $this->get('/analytics?range='.$range)->assertInertia(fn (Assert $page) => $page->component('bms/workspace')->where('view', 'analytics')->has('equipment', 12)->has('samples', $count));
        }
        $this->get('/analytics?range=invalid')->assertSessionHasErrors('range');
    }

    public function test_acknowledging_an_alarm_preserves_its_condition_and_logs_the_operator(): void
    {
        $user = User::factory()->create();
        $alarm = Alarm::whereNull('returned_at')->firstOrFail();
        $this->actingAs($user)->post('/alarms/'.$alarm->id.'/acknowledge', ['note' => 'Inspecting the chilled water valve.'])->assertRedirect();
        $alarm->refresh();
        $this->assertNotNull($alarm->acknowledged_at);
        $this->assertSame($user->id, $alarm->acknowledged_by);
        $this->assertNull($alarm->returned_at);
        $this->assertDatabaseHas('activity_logs', ['user_id' => $user->id, 'action' => 'Alarm acknowledged']);
        $this->post('/alarms/'.$alarm->id.'/acknowledge', ['note' => 'A second acknowledgment.'])->assertStatus(409);
        $this->assertDatabaseCount('activity_logs', 1);
    }

    public function test_acknowledgment_requires_a_meaningful_note(): void
    {
        $this->actingAs(User::factory()->create())->post('/alarms/1/acknowledge', ['note' => ''])->assertSessionHasErrors('note');
        $this->assertNull(Alarm::findOrFail(1)->acknowledged_at);
    }

    public function test_demo_setpoints_are_bounded_and_read_only_points_cannot_be_changed(): void
    {
        $this->actingAs(User::factory()->create());
        $ahu = Equipment::where('tag', 'AHU-01')->firstOrFail();
        $this->patch('/equipment/'.$ahu->id, ['setpoint' => 24.5, 'mode' => 'Manual'])->assertRedirect();
        $this->assertDatabaseHas('equipment', ['id' => $ahu->id, 'setpoint' => 24.5, 'mode' => 'Manual']);
        $this->patch('/equipment/'.$ahu->id, ['setpoint' => 31, 'mode' => 'Manual'])->assertSessionHasErrors('setpoint');
        $this->patch('/equipment/'.$ahu->id, ['setpoint' => 23.1, 'mode' => 'Auto'])->assertSessionHasErrors('setpoint');
        $meter = Equipment::where('tag', 'EM-01')->firstOrFail();
        $this->patch('/equipment/'.$meter->id, ['setpoint' => 24, 'mode' => 'Auto'])->assertStatus(422);
        config(['bms.demo' => false]);
        $this->patch('/equipment/'.$ahu->id, ['setpoint' => 24, 'mode' => 'Auto'])->assertStatus(409);
    }

    public function test_weekly_schedules_validate_days_and_time_order_and_support_crud(): void
    {
        $this->actingAs(User::factory()->create());
        $data = ['name' => 'Test ventilation', 'system' => 'HVAC', 'days' => [1, 3, 5], 'start_time' => '08:00', 'end_time' => '17:00', 'enabled' => true];
        $this->post('/schedules', [...$data, 'end_time' => '07:00'])->assertSessionHasErrors('end_time');
        $this->post('/schedules', [...$data, 'days' => [8]])->assertSessionHasErrors('days.0');
        $this->post('/schedules', $data)->assertRedirect();
        $schedule = OperatingSchedule::where('name', $data['name'])->firstOrFail();
        $this->put('/schedules/'.$schedule->id, [...$data, 'enabled' => false])->assertRedirect();
        $this->assertFalse($schedule->fresh()->enabled);
        $this->delete('/schedules/'.$schedule->id)->assertRedirect();
        $this->assertDatabaseMissing('operating_schedules', ['id' => $schedule->id]);
        $this->assertDatabaseCount('activity_logs', 3);
    }

    public function test_preferences_are_saved_per_user_and_validated(): void
    {
        $user = User::factory()->create();
        $data = ['siteName' => 'Client building', 'theme' => 'dark', 'temperatureUnit' => 'F', 'dailyTarget' => 5000, 'compact' => true];
        $this->actingAs($user)->put('/preferences', $data)->assertRedirect();
        $this->get('/preferences')->assertInertia(fn (Assert $page) => $page->where('preferences.theme', 'dark')->where('preferences.temperatureUnit', 'F'));
        $this->actingAs(User::factory()->create())->get('/preferences')->assertInertia(fn (Assert $page) => $page->where('preferences.theme', 'light'));
        $this->put('/preferences', [...$data, 'dailyTarget' => -1])->assertSessionHasErrors('dailyTarget');
    }

    public function test_csv_contains_the_selected_period_units_and_demo_label(): void
    {
        $response = $this->actingAs(User::factory()->create())->get('/reports/energy.csv?range=24h');
        $response->assertOk()->assertDownload('bms-energy-24h.csv');
        $csv = $response->streamedContent();
        $this->assertStringContainsString('Asia/Kuala_Lumpur', $csv);
        $this->assertStringContainsString('DEMONSTRATION', $csv);
        $this->assertCount(25, explode("\n", trim($csv)));
    }

    public function test_demo_login_is_unavailable_outside_local_environment(): void
    {
        $this->post('/demo-login')->assertNotFound();
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->app['env'] = 'local';
        $this->post('/demo-login')->assertRedirect('/dashboard');
        $this->assertAuthenticated();
        $this->assertSame('demo@bms.local', auth()->user()->email);
    }
}
