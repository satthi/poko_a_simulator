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
            ['name' => 'シンプルなゆか', 'type' => 'block', 'color' => '#FFFFFF', 'opacity' => 100, 'is_decoration' => false],
            ['name' => 'しばふなゆか', 'type' => 'block', 'color' => '#83D668', 'opacity' => 100, 'is_decoration' => false],
            ['name' => 'たがやしたつち', 'type' => 'block', 'color' => '#800000', 'opacity' => 100, 'is_decoration' => false],
            ['name' => 'シンプルなゆか（緑）', 'type' => 'block', 'color' => '#00FF00', 'opacity' => 100, 'is_decoration' => false],
            ['name' => 'ガラス', 'type' => 'block', 'color' => '#87CEEB', 'opacity' => 50, 'is_decoration' => false],
            // 装飾マスター
            ['name' => 'コンクリートのふち', 'type' => 'block', 'color' => '#FFFFFF', 'opacity' => 100, 'is_decoration' => true],
        ];

        foreach ($blocks as $block) {
            BlocksMaster::create($block);
        }
    }
}
