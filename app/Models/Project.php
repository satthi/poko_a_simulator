<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'size_x',
        'size_y',
        'size_z',
        'block_data',
    ];

    protected $casts = [
        'block_data' => 'json',
        'size_x' => 'integer',
        'size_y' => 'integer',
        'size_z' => 'integer',
    ];
}
