<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_banks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('type', ['pg', 'essay'])->default('pg');
            $table->text('question_text');
            $table->string('media_url')->nullable();
            $table->integer('score')->default(1)->comment('Bobot nilai');
            $table->string('topic')->nullable()->comment('Topik/bab soal');
            $table->enum('difficulty', ['easy', 'medium', 'hard'])->default('medium');
            $table->timestamps();

            $table->index(['subject_id', 'type']);
            $table->index(['subject_id', 'difficulty']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_banks');
    }
};
