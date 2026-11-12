<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrendSample extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['recorded_at' => 'datetime', 'energy_kwh' => 'float', 'baseline_kwh' => 'float', 'temperature' => 'float', 'humidity' => 'float'];
    }
}
