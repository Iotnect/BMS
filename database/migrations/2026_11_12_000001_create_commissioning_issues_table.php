<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commissioning_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->nullable()->constrained('equipment')->nullOnDelete();
            $table->foreignId('alarm_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 120);
            $table->text('description');
            $table->string('responsible_party', 120);
            $table->date('due_on')->nullable();
            $table->string('status')->default('Open');
            $table->text('verification')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->unsignedInteger('revision')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commissioning_issues');
    }
};
