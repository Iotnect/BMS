<?php

namespace Database\Seeders;

use App\Models\Alarm;
use App\Models\Equipment;
use App\Models\OperatingSchedule;
use App\Models\TrendSample;
use Illuminate\Database\Seeder;

class BmsSeeder extends Seeder
{
    public function run(): void
    {
        $devices = [
            ['AHU-01', 'Main air handling unit', 'HVAC', 'Level 01', 'East wing', 'BACnet/IP', 'Alarm', 26.8, '°C', 23],
            ['AHU-02', 'West air handling unit', 'HVAC', 'Level 02', 'West wing', 'BACnet/IP', 'Online', 23.4, '°C', 23],
            ['AHU-03', 'Executive air handling unit', 'HVAC', 'Level 03', 'North wing', 'BACnet/IP', 'Online', 22.6, '°C', 23],
            ['CH-01', 'Chiller plant', 'HVAC', 'Rooftop', 'Plant room', 'BACnet/IP', 'Online', 6.8, '°C', 7],
            ['VAV-01', 'Meeting room VAV', 'HVAC', 'Level 01', 'Meeting rooms', 'BACnet/IP', 'Online', 23.1, '°C', 23],
            ['EM-01', 'Main electricity meter', 'Electrical', 'Ground', 'Switch room', 'Modbus TCP', 'Online', 184.6, 'kW', null],
            ['EM-02', 'Tenant submeter', 'Electrical', 'Level 02', 'Riser room', 'Modbus TCP', 'Offline', null, 'kW', null],
            ['LP-01', 'Lobby lighting panel', 'Lighting', 'Ground', 'Main lobby', 'BACnet/IP', 'Online', 78, '%', null],
            ['LP-02', 'Office lighting panel', 'Lighting', 'Level 03', 'Open office', 'BACnet/IP', 'Online', 65, '%', null],
            ['WP-01', 'Domestic water pump', 'Water', 'Ground', 'Pump room', 'Modbus TCP', 'Online', 3.2, 'bar', null],
            ['WM-01', 'Main water meter', 'Water', 'Ground', 'Service yard', 'Modbus TCP', 'Online', 4.6, 'm³/h', null],
            ['FA-01', 'Fire panel monitor', 'Life safety', 'Ground', 'Security room', 'BACnet/IP', 'Online', 0, 'events', null],
        ];
        foreach ($devices as [$tag, $name, $system, $floor, $location, $protocol, $status, $reading, $unit, $setpoint]) {
            Equipment::firstOrCreate(['tag' => $tag], compact('name', 'system', 'floor', 'location', 'protocol', 'status', 'reading', 'unit', 'setpoint') + ['last_seen_at' => $status === 'Offline' ? now()->subMinutes(27) : now()]);
        }
        $alarms = [
            ['AHU-01', 'Critical', 'Supply air temperature high', 'Inspect the cooling coil, chilled water valve and supply air sensor before adjusting the setpoint.', 12, false],
            ['EM-02', 'Warning', 'Device communication lost', 'Check the submeter power supply and Modbus network connection. The last reading is unavailable.', 27, false],
            ['CH-01', 'Warning', 'Chiller efficiency outside target', 'Review condenser temperature and scheduled maintenance. The plant remains available.', 46, false],
            ['WP-01', 'Info', 'Pump pressure returned to normal', 'Pressure has recovered. Review the event and acknowledge it for the operations log.', 94, true],
        ];
        foreach ($alarms as [$tag, $severity, $message, $instruction, $minutes, $returned]) {
            Alarm::firstOrCreate(['message' => $message], ['equipment_id' => Equipment::where('tag', $tag)->value('id'), 'severity' => $severity, 'instruction' => $instruction, 'occurred_at' => now()->subMinutes($minutes), 'returned_at' => $returned ? now()->subMinutes(40) : null]);
        }
        if (! TrendSample::exists()) {
            $samples = [];
            for ($i = 24 * 30 - 1; $i >= 0; $i--) {
                $time = now()->startOfHour()->subHours($i);
                $hour = $time->copy()->timezone('Asia/Kuala_Lumpur')->hour;
                $occupied = $hour >= 7 && $hour <= 19;
                $load = ($occupied ? 151 : 62) + sin(($hour - 7) / 24 * pi() * 2) * 31 + sin($i * 1.7) * 8;
                $samples[] = ['recorded_at' => $time->toDateTimeString(), 'energy_kwh' => round($load, 2), 'baseline_kwh' => round($load * 1.12 + cos($i) * 6, 2), 'temperature' => round(23.1 + sin($i / 4) * 0.7, 2), 'humidity' => round(53 + cos($i / 7) * 4, 2)];
            }
            TrendSample::insert($samples);
        }
        foreach ([['Weekday comfort', 'HVAC', [1, 2, 3, 4, 5], '07:00', '19:00'], ['Office lighting', 'Lighting', [1, 2, 3, 4, 5], '07:30', '20:00'], ['Weekend ventilation', 'HVAC', [6], '08:00', '13:00']] as [$name, $system, $days, $start, $end]) {
            OperatingSchedule::firstOrCreate(['name' => $name], ['system' => $system, 'days' => $days, 'start_time' => $start, 'end_time' => $end, 'enabled' => true]);
        }
    }
}
