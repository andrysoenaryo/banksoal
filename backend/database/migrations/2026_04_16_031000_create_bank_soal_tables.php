<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chapters', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('chapters')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('chapter_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['multiple_choice', 'essay']);
            $table->longText('question_text');
            $table->longText('answer_key');
            $table->longText('explanation')->nullable();
            $table->unsignedSmallInteger('points')->default(1);
            $table->enum('difficulty_level', ['mudah', 'sedang', 'sulit'])->default('sedang');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('question_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->string('option_key', 5);
            $table->longText('option_text');
            $table->boolean('is_correct')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('question_packages', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('total_questions');
            $table->foreignId('generated_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('generated_at');
            $table->timestamps();
        });

        Schema::create('question_package_rules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('question_package_id')->constrained()->cascadeOnDelete();
            $table->foreignId('chapter_id')->constrained()->cascadeOnDelete();
            $table->enum('composition_type', ['percentage', 'quantity']);
            $table->unsignedInteger('composition_value');
            $table->unsignedInteger('generated_question_count');
            $table->timestamps();
        });

        Schema::create('question_package_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('question_package_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position');
            $table->timestamps();
            $table->unique(['question_package_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_package_items');
        Schema::dropIfExists('question_package_rules');
        Schema::dropIfExists('question_packages');
        Schema::dropIfExists('question_options');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('chapters');
    }
};