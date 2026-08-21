<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->string('topic')->nullable()->after('score')->comment('Topik/bab soal');
            $table->enum('difficulty', ['easy', 'medium', 'hard'])->default('medium')->after('topic')->comment('Tingkat kesulitan');
            $table->boolean('is_bank')->default(false)->after('difficulty')->comment('Apakah soal ini dari bank soal reusable');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn(['topic', 'difficulty', 'is_bank']);
        });
    }
};
