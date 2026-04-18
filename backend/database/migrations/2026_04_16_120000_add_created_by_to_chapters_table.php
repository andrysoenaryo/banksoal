<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chapters', function (Blueprint $table): void {
            if (! Schema::hasColumn('chapters', 'created_by')) {
                $table->foreignId('created_by')
                    ->nullable()
                    ->after('is_active')
                    ->constrained('users')
                    ->nullOnDelete();
                $table->index(['created_by', 'parent_id']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('chapters', function (Blueprint $table): void {
            if (Schema::hasColumn('chapters', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropIndex(['created_by', 'parent_id']);
                $table->dropColumn('created_by');
            }
        });
    }
};
