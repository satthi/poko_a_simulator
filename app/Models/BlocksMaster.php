<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class BlocksMaster extends Model
{
    use HasFactory;

    protected $table = 'blocks_master';

    protected $fillable = [
        'name',
        'type',
    ];
}
