<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OperatingSchedule extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['days' => 'array', 'enabled' => 'boolean'];
    }
}
