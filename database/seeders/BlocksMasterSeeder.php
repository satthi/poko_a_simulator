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
            ['name' => 'Stone', 'type' => 'block', 'color' => '#808080', 'opacity' => 100, 'is_decoration' => false],
            ['name' => 'Wood', 'type' => 'block', 'color' => '#8B4513', 'opacity' => 100, 'is_decoration' => false],
            ['name' => 'Dirt', 'type' => 'block', 'color' => '#654321', 'opacity' => 100, 'is_decoration' => false],
            ['name' => 'Sand', 'type' => 'block', 'color' => '#C2B280', 'opacity' => 100, 'is_decoration' => false],
            ['name' => 'Glass', 'type' => 'block', 'color' => '#87CEEB', 'opacity' => 50, 'is_decoration' => false],
            // 装飾マスター
            ['name' => 'Concrete Edge - Mini', 'type' => 'block', 'color' => '#696969', 'opacity' => 100, 'is_decoration' => true],
            ['name' => 'Concrete Edge - Straight', 'type' => 'block', 'color' => '#696969', 'opacity' => 100, 'is_decoration' => true],
            ['name' => 'Concrete Edge - Corner', 'type' => 'block', 'color' => '#696969', 'opacity' => 100, 'is_decoration' => true],
        ];

        foreach ($blocks as $block) {
            BlocksMaster::create($block);
        }
    }
}
