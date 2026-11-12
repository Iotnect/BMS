<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->string('tag')->unique();
            $table->string('name');
            $table->string('system');
            $table->string('floor');
            $table->string('location');
            $table->string('protocol');
            $table->string('status');
            $table->string('mode')->default('Auto');
            $table->decimal('reading', 10, 2)->nullable();
            $table->string('unit');
            $table->decimal('setpoint', 6, 1)->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });
        Schema::create('alarms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipment');
            $table->string('severity');
            $table->string('message');
            $table->text('instruction');
            $table->timestamp('occurred_at');
            $table->timestamp('returned_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->foreignId('acknowledged_by')->nullable()->constrained('users');
            $table->text('note')->nullable();
            $table->timestamps();
        });
        Schema::create('trend_samples', function (Blueprint $table) {
            $table->id();
            $table->timestamp('recorded_at')->unique();
            $table->decimal('energy_kwh', 10, 2);
            $table->decimal('baseline_kwh', 10, 2);
            $table->decimal('temperature', 5, 2);
            $table->decimal('humidity', 5, 2);
        });
        Schema::create('operating_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('system');
            $table->json('days');
            $table->string('start_time', 5);
            $table->string('end_time', 5);
            $table->boolean('enabled')->default(true);
            $table->timestamps();
        });
        Schema::create('bms_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('preferences');
            $table->timestamps();
        });
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->string('subject');
            $table->json('details')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        foreach (['activity_logs', 'bms_settings', 'operating_schedules', 'trend_samples', 'alarms', 'equipment'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
