<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('blocks_master', function (Blueprint $table) {
            $table->string('color', 7)->default('#000000')->after('type')->comment('HEX format color code');
            $table->integer('opacity')->default(100)->after('color')->comment('Opacity percentage (0-100)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('blocks_master', function (Blueprint $table) {
            $table->dropColumn(['color', 'opacity']);
        });
    }
};
