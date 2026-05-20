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
            ['name' => 'Stone', 'type' => 'block', 'color' => '#808080', 'opacity' => 100],
            ['name' => 'Wood', 'type' => 'block', 'color' => '#8B4513', 'opacity' => 100],
            ['name' => 'Dirt', 'type' => 'block', 'color' => '#654321', 'opacity' => 100],
            ['name' => 'Sand', 'type' => 'block', 'color' => '#C2B280', 'opacity' => 100],
            ['name' => 'Glass', 'type' => 'block', 'color' => '#87CEEB', 'opacity' => 50],
        ];

        foreach ($blocks as $block) {
            BlocksMaster::create($block);
        }
    }
}
