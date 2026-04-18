<?php

namespace Database\Factories;

use App\Models\Chapter;
use App\Models\Question;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Question>
 */
class QuestionFactory extends Factory
{
    protected $model = Question::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'chapter_id' => Chapter::factory(),
            'created_by' => User::factory(),
            'type' => 'essay',
            'question_text' => $this->faker->paragraph(),
            'answer_key' => $this->faker->sentence(),
            'explanation' => $this->faker->optional()->paragraph(),
            'points' => 1,
            'difficulty_level' => 'sedang',
            'metadata' => null,
        ];
    }
}