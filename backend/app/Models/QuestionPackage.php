<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuestionPackage extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'total_questions',
        'generated_by',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function rules(): HasMany
    {
        return $this->hasMany(QuestionPackageRule::class)->orderBy('id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuestionPackageItem::class)->orderBy('position');
    }
}