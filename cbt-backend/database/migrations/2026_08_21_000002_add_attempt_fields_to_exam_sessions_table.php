<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_sessions', function (Blueprint $table) {
            $table->integer('attempt_number')->default(1)->after('cheat_count')->comment('Nomor percobaan siswa');
            $table->integer('time_extension_minutes')->default(0)->after('attempt_number')->comment('Tambahan waktu dari admin (menit)');
        });
    }

    public function down(): void
    {
        Schema::table('exam_sessions', function (Blueprint $table) {
            $table->dropColumn(['attempt_number', 'time_extension_minutes']);
        });
    }
};
