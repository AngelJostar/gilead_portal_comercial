<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScreeningState extends Model
{
    protected $table = 'screening_states';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'revision' => 'integer',
        ];
    }
}
