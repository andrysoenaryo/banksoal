<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuestionPackageItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'question_package_id',
        'question_id',
        'position',
    ];

    public function package(): BelongsTo
    {
        return $this->belongsTo(QuestionPackage::class, 'question_package_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}