<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_answers', function (Blueprint $table) {
            $table->dropForeign(['option_id']);
            $table->foreign('option_id')->references('id')->on('options')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('exam_answers', function (Blueprint $table) {
            $table->dropForeign(['option_id']);
            $table->foreign('option_id')->references('id')->on('options')->cascadeOnDelete();
        });
    }
};
