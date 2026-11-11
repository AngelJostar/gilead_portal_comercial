<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DistributionState extends Model
{
    protected $table = 'distribution_states';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'revision' => 'integer',
        ];
    }
}
