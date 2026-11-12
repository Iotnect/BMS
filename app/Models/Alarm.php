<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alarm extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['occurred_at' => 'datetime', 'returned_at' => 'datetime', 'acknowledged_at' => 'datetime'];
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }
}
