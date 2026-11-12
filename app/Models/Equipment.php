<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Equipment extends Model
{
    protected $table = 'equipment';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['reading' => 'float', 'setpoint' => 'float', 'last_seen_at' => 'datetime'];
    }
}
