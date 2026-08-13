<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_answers', function (Blueprint $table) {
            $table->unique(['exam_session_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::table('exam_answers', function (Blueprint $table) {
            $table->dropUnique(['exam_session_id', 'question_id']);
        });
    }
};
