<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chapters', function (Blueprint $table): void {
            if (! Schema::hasColumn('chapters', 'subject_id')) {
                $table->foreignId('subject_id')
                    ->nullable()
                    ->after('parent_id')
                    ->constrained('subjects')
                    ->nullOnDelete();

                $table->index(['subject_id', 'parent_id']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('chapters', function (Blueprint $table): void {
            if (Schema::hasColumn('chapters', 'subject_id')) {
                $table->dropForeign(['subject_id']);
                $table->dropIndex(['subject_id', 'parent_id']);
                $table->dropColumn('subject_id');
            }
        });
    }
};
