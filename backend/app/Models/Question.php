<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'chapter_id',
        'created_by',
        'type',
        'question_text',
        'question_image_path',
        'answer_key',
        'explanation',
        'points',
        'difficulty_level',
        'metadata',
    ];

    protected $appends = [
        'question_image_url',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(Chapter::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function options(): HasMany
    {
        return $this->hasMany(QuestionOption::class)->orderBy('sort_order')->orderBy('id');
    }

    public function getQuestionImageUrlAttribute(): ?string
    {
        if (! $this->question_image_path) {
            return null;
        }

        return Storage::disk('public')->url($this->question_image_path);
    }
}