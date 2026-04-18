<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuestionPackageGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_package_can_be_generated_by_quantity_rule(): void
    {
        $this->seed();

        $user = User::query()->where('email', 'admin@appsoal.local')->firstOrFail();
        $chapter = Chapter::query()->create([
            'name' => 'Bab 1',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        Question::factory()->count(5)->create([
            'chapter_id' => $chapter->id,
            'created_by' => $user->id,
            'type' => 'essay',
            'answer_key' => 'Jawaban contoh',
        ]);

        Sanctum::actingAs($user);

        $response = $this
            ->postJson('/api/question-packages/generate', [
                'title' => 'Paket Bab 1',
                'total_questions' => 3,
                'rules' => [
                    [
                        'chapter_id' => $chapter->id,
                        'composition_type' => 'quantity',
                        'composition_value' => 3,
                        'type' => 'essay',
                    ],
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('total_questions', 3)
            ->assertJsonCount(3, 'items');
    }
}