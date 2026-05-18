<?php

namespace Database\Seeders;

use App\Models\BlocksMaster;
use Illuminate\Database\Seeder;

class BlocksMasterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $blocks = [
            ['name' => 'Stone', 'type' => 'solid'],
            ['name' => 'Wood', 'type' => 'solid'],
            ['name' => 'Dirt', 'type' => 'solid'],
            ['name' => 'Sand', 'type' => 'solid'],
            ['name' => 'Glass', 'type' => 'transparent'],
        ];

        foreach ($blocks as $block) {
            BlocksMaster::create($block);
        }
    }
}
