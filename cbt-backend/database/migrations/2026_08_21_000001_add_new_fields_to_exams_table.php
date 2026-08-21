<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->string('exam_pin', 10)->nullable()->after('status')->comment('PIN/token untuk memulai ujian');
            $table->text('instructions')->nullable()->after('exam_pin')->comment('Instruksi khusus ujian');
            $table->integer('max_attempts')->default(1)->after('instructions')->comment('Jumlah maksimal percobaan');
            $table->boolean('allow_late_entry')->default(false)->after('max_attempts')->comment('Izinkan siswa masuk setelah waktu mulai');
        });
    }

    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->dropColumn(['exam_pin', 'instructions', 'max_attempts', 'allow_late_entry']);
        });
    }
};
