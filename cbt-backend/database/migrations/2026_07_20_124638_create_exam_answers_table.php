<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('exam_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->foreignId('option_id')->nullable()->constrained()->cascadeOnDelete();
            $table->text('essay_text')->nullable();
            $table->boolean('is_correct')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('exam_answers');
    }
};
