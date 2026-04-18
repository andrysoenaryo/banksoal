<?php

namespace App\Services;

use App\Models\Chapter;
use App\Models\Question;
use App\Models\QuestionPackage;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuestionPackageGeneratorService
{
    public function generate(User $user, array $payload): QuestionPackage
    {
        $isSuperAdmin = $user->hasRole('super-admin');

        $chaptersQuery = Chapter::query()->select('id', 'parent_id');
        if (! $isSuperAdmin) {
            $chaptersQuery->where('created_by', $user->id);
        }

        $chapters = $chaptersQuery->get();
        $totalQuestions = (int) $payload['total_questions'];
        $rules = $this->resolveRules($payload['rules'], $totalQuestions, $chapters);

        $selectedQuestions = collect();
        $selectedIds = [];

        foreach ($rules as $index => &$rule) {
            $query = Question::query()
                ->with(['options', 'chapter'])
                ->whereIn('chapter_id', $rule['scope_ids'])
                ->whereNotIn('id', $selectedIds);

            if (! $isSuperAdmin) {
                $query->where('created_by', $user->id);
            }

            if (! empty($rule['type'])) {
                $query->where('type', $rule['type']);
            }

            $questions = $query->inRandomOrder()->limit($rule['target_count'])->get();

            if ($questions->count() < $rule['target_count']) {
                throw ValidationException::withMessages([
                    "rules.$index.chapter_id" => 'Jumlah soal pada cakupan bab/sub bab tidak mencukupi komposisi yang diminta.',
                ]);
            }

            $rule['generated_question_count'] = $questions->count();
            $selectedQuestions = $selectedQuestions->concat($questions);
            $selectedIds = $selectedQuestions->pluck('id')->all();
        }

        if ($selectedQuestions->count() !== $totalQuestions) {
            throw ValidationException::withMessages([
                'total_questions' => 'Komposisi soal tidak menghasilkan jumlah akhir yang sesuai.',
            ]);
        }

        return DB::transaction(function () use ($user, $payload, $rules, $selectedQuestions): QuestionPackage {
            $package = QuestionPackage::query()->create([
                'title' => $payload['title'],
                'description' => $payload['description'] ?? null,
                'total_questions' => $payload['total_questions'],
                'generated_by' => $user->id,
                'generated_at' => now(),
            ]);

            foreach ($rules as $rule) {
                $package->rules()->create([
                    'chapter_id' => $rule['chapter_id'],
                    'composition_type' => $rule['composition_type'],
                    'composition_value' => $rule['composition_value'],
                    'generated_question_count' => $rule['generated_question_count'],
                ]);
            }

            foreach ($selectedQuestions->values() as $index => $question) {
                $package->items()->create([
                    'question_id' => $question->id,
                    'position' => $index + 1,
                ]);
            }

            return $package->load([
                'creator:id,name,email',
                'rules.chapter:id,parent_id,name',
                'items.question.chapter:id,parent_id,name',
                'items.question.options',
            ]);
        });
    }

    /**
     * @param  array<int, array<string, mixed>>  $inputRules
     */
    private function resolveRules(array $inputRules, int $totalQuestions, Collection $chapters): array
    {
        $childrenByParent = $chapters->groupBy('parent_id');
        $rules = collect($inputRules)->values()->map(function (array $rule) use ($childrenByParent, $totalQuestions): array {
            $targetCount = $rule['composition_type'] === 'percentage'
                ? (int) round(($totalQuestions * (int) $rule['composition_value']) / 100)
                : (int) $rule['composition_value'];

            return [
                'chapter_id' => (int) $rule['chapter_id'],
                'composition_type' => $rule['composition_type'],
                'composition_value' => (int) $rule['composition_value'],
                'type' => $rule['type'] ?? null,
                'target_count' => $targetCount,
                'generated_question_count' => 0,
                'scope_ids' => $this->descendantAndSelfIds((int) $rule['chapter_id'], $childrenByParent),
            ];
        })->all();

        $difference = $totalQuestions - collect($rules)->sum('target_count');

        if ($difference !== 0 && isset($rules[array_key_last($rules)])) {
            $rules[array_key_last($rules)]['target_count'] += $difference;
        }

        foreach ($rules as $index => $rule) {
            if ($rule['target_count'] <= 0) {
                throw ValidationException::withMessages([
                    "rules.$index.composition_value" => 'Komposisi menghasilkan jumlah soal nol atau negatif.',
                ]);
            }
        }

        return $rules;
    }

    /**
     * @param  Collection<int|string|null, Collection<int, Chapter>>  $childrenByParent
     * @return list<int>
     */
    private function descendantAndSelfIds(int $chapterId, Collection $childrenByParent): array
    {
        $resolved = [$chapterId];
        $stack = [$chapterId];

        while (! empty($stack)) {
            $current = array_pop($stack);
            $children = $childrenByParent->get($current, collect());

            foreach ($children as $child) {
                $resolved[] = $child->id;
                $stack[] = $child->id;
            }
        }

        return array_values(array_unique($resolved));
    }
}