<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommissioningIssue extends Model
{
    public const STATUSES = ['Open', 'In progress', 'Resolved'];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['resolved_at' => 'datetime', 'revision' => 'integer'];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
