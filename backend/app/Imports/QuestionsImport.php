<?php

namespace App\Imports;

use App\Models\Chapter;
use App\Models\Question;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class QuestionsImport implements ToCollection, WithHeadingRow
{
    private int $imported = 0;

    private int $skipped = 0;

    /** @var list<array{row:int,error:string}> */
    private array $errors = [];

    public function __construct(
        private readonly int $userId,
        private readonly bool $isSuperAdmin = false,
    )
    {
    }

    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;

            try {
                $this->processRow($row);
                $this->imported++;
            } catch (\Throwable $exception) {
                $this->skipped++;
                $this->errors[] = [
                    'row' => $rowNumber,
                    'error' => $exception->getMessage(),
                ];
            }
        }
    }

    public function summary(): array
    {
        return [
            'imported' => $this->imported,
            'skipped' => $this->skipped,
            'errors' => $this->errors,
        ];
    }

    private function processRow(Collection $row): void
    {
        $type = strtolower(trim((string) ($row->get('type') ?? 'essay')));
        if (! in_array($type, ['multiple_choice', 'essay'], true)) {
            throw new \RuntimeException('Kolom type harus bernilai multiple_choice atau essay.');
        }

        $chapterId = $this->resolveChapterId($row);
        $questionText = trim((string) ($row->get('question_text') ?? ''));
        $answerKey = trim((string) ($row->get('answer_key') ?? ''));

        if ($questionText === '' || $answerKey === '') {
            throw new \RuntimeException('Kolom question_text dan answer_key wajib diisi.');
        }

        $question = Question::query()->create([
            'chapter_id' => $chapterId,
            'created_by' => $this->userId,
            'type' => $type,
            'question_text' => $questionText,
            'answer_key' => $answerKey,
            'explanation' => trim((string) ($row->get('explanation') ?? '')) ?: null,
            'points' => max(1, (int) ($row->get('points') ?? 1)),
            'difficulty_level' => $this->resolveDifficulty($row->get('difficulty_level')),
            'metadata' => null,
        ]);

        if ($type === 'multiple_choice') {
            $this->attachOptions($question, $row);
        }
    }

    private function resolveChapterId(Collection $row): int
    {
        $chapterId = $row->get('chapter_id');
        if (! empty($chapterId)) {
            $chapterQuery = Chapter::query();
            if (! $this->isSuperAdmin) {
                $chapterQuery->where('created_by', $this->userId);
            }

            $chapter = $chapterQuery->find((int) $chapterId);
            if ($chapter) {
                return $chapter->id;
            }
        }

        $chapterName = trim((string) ($row->get('chapter_name') ?? ''));
        if ($chapterName !== '') {
            $chapterQuery = Chapter::query()->where('name', $chapterName);
            if (! $this->isSuperAdmin) {
                $chapterQuery->where('created_by', $this->userId);
            }

            $chapter = $chapterQuery->first();
            if ($chapter) {
                return $chapter->id;
            }
        }

        throw new \RuntimeException('chapter_id/chapter_name tidak ditemukan.');
    }

    private function resolveDifficulty(mixed $value): string
    {
        $difficulty = strtolower(trim((string) $value));

        return in_array($difficulty, ['mudah', 'sedang', 'sulit'], true)
            ? $difficulty
            : 'sedang';
    }

    private function attachOptions(Question $question, Collection $row): void
    {
        $options = collect(['a', 'b', 'c', 'd', 'e'])
            ->map(function (string $key) use ($row): array {
                return [
                    'option_key' => strtoupper($key),
                    'option_text' => trim((string) ($row->get('option_'.$key) ?? '')),
                ];
            })
            ->filter(fn (array $option) => $option['option_text'] !== '')
            ->values();

        if ($options->count() < 2) {
            throw new \RuntimeException('Soal multiple_choice minimal memiliki dua opsi.');
        }

        $correctOptionKey = strtoupper(trim((string) ($row->get('correct_option_key') ?? '')));
        if ($correctOptionKey === '' || ! $options->contains(fn (array $option): bool => $option['option_key'] === $correctOptionKey)) {
            throw new \RuntimeException('correct_option_key wajib sesuai opsi yang tersedia.');
        }

        foreach ($options as $index => $option) {
            $question->options()->create([
                'option_key' => $option['option_key'],
                'option_text' => $option['option_text'],
                'is_correct' => Str::upper($option['option_key']) === $correctOptionKey,
                'sort_order' => $index,
            ]);
        }
    }
}