<?php

namespace App\Imports;

use App\Models\Chapter;
use App\Models\Question;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class QuestionsDocxImport
{
    private int $imported = 0;

    private int $skipped = 0;

    /** @var list<array{row:int,error:string}> */
    private array $errors = [];

    public function __construct(
        private readonly int $userId,
        private readonly bool $isSuperAdmin = false,
    ) {
    }

    public function import(UploadedFile $file): array
    {
        $blocks = $this->parseDocxBlocks($file->getPathname());

        foreach ($blocks as $index => $block) {
            $rowNumber = $index + 1;

            try {
                $this->processBlock($block);
                $this->imported++;
            } catch (\Throwable $exception) {
                $this->skipped++;
                $this->errors[] = [
                    'row' => $rowNumber,
                    'error' => $exception->getMessage(),
                ];
            }
        }

        return [
            'imported' => $this->imported,
            'skipped' => $this->skipped,
            'errors' => $this->errors,
        ];
    }

    public function preview(UploadedFile $file): array
    {
        $blocks = $this->parseDocxBlocks($file->getPathname());

        $resultBlocks = [];
        $valid = 0;
        $invalid = 0;

        foreach ($blocks as $index => $block) {
            $rowNumber = $index + 1;
            $fields = $this->normalizeFields($block['fields']);

            $entry = [
                'row' => $rowNumber,
                'type' => $fields['type'] ?? '',
                'chapter_id' => $fields['chapter_id'] ?? '',
                'chapter_name' => $fields['chapter_name'] ?? '',
                'question_text' => Str::limit((string) ($fields['question_text'] ?? ''), 120),
                'has_image' => $block['image'] !== null,
                'status' => 'valid',
                'error' => null,
            ];

            try {
                $this->validateBlock($fields);
                $valid++;
            } catch (\Throwable $exception) {
                $entry['status'] = 'invalid';
                $entry['error'] = $exception->getMessage();
                $invalid++;
            }

            $resultBlocks[] = $entry;
        }

        return [
            'total_blocks' => count($blocks),
            'valid_blocks' => $valid,
            'invalid_blocks' => $invalid,
            'blocks' => $resultBlocks,
        ];
    }

    /**
     * @return list<array{fields: array<string,string>, image: array{content:string,ext:string}|null}>
     */
    private function parseDocxBlocks(string $filePath): array
    {
        $zip = new ZipArchive();

        if ($zip->open($filePath) !== true) {
            throw new \RuntimeException('File DOCX tidak dapat dibuka.');
        }

        $documentXml = $zip->getFromName('word/document.xml');
        if ($documentXml === false) {
            $zip->close();
            throw new \RuntimeException('Struktur DOCX tidak valid: word/document.xml tidak ditemukan.');
        }

        $rels = $this->parseDocumentRelationships($zip);

        $dom = new \DOMDocument();
        $dom->loadXML($documentXml);
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
        $xpath->registerNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main');
        $xpath->registerNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships');

        $blocks = [];
        $current = null;

        foreach ($xpath->query('//w:body//w:p') as $paragraph) {
            $line = $this->extractParagraphText($xpath, $paragraph);
            $normalized = Str::upper(trim($line));

            if ($normalized === '[SOAL]') {
                $current = [
                    'fields' => [],
                    'image' => null,
                ];
                continue;
            }

            if ($normalized === '[/SOAL]') {
                if ($current !== null) {
                    $blocks[] = $current;
                    $current = null;
                }
                continue;
            }

            if ($current === null) {
                continue;
            }

            if ($current['image'] === null) {
                $imagePayload = $this->extractImageFromParagraph($xpath, $paragraph, $zip, $rels);
                if ($imagePayload !== null) {
                    $current['image'] = $imagePayload;
                }
            }

            if (! str_contains($line, ':')) {
                continue;
            }

            [$rawKey, $rawValue] = explode(':', $line, 2);
            $key = Str::of($rawKey)->trim()->lower()->replace(' ', '_')->value();
            $value = trim($rawValue);

            if ($key !== '') {
                $current['fields'][$key] = $value;
            }
        }

        $zip->close();

        if (empty($blocks)) {
            throw new \RuntimeException('Template DOCX tidak valid: tidak ditemukan blok [SOAL] ... [/SOAL].');
        }

        return $blocks;
    }

    /**
     * @return array<string,string>
     */
    private function parseDocumentRelationships(ZipArchive $zip): array
    {
        $relsXml = $zip->getFromName('word/_rels/document.xml.rels');
        if ($relsXml === false) {
            return [];
        }

        $dom = new \DOMDocument();
        $dom->loadXML($relsXml);
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('rel', 'http://schemas.openxmlformats.org/package/2006/relationships');

        $result = [];

        foreach ($xpath->query('//rel:Relationship') as $relationship) {
            $id = $relationship->attributes?->getNamedItem('Id')?->nodeValue;
            $target = $relationship->attributes?->getNamedItem('Target')?->nodeValue;

            if ($id && $target) {
                $result[$id] = $target;
            }
        }

        return $result;
    }

    private function extractParagraphText(\DOMXPath $xpath, \DOMNode $paragraph): string
    {
        $parts = [];
        foreach ($xpath->query('.//w:t', $paragraph) as $textNode) {
            $parts[] = $textNode->nodeValue;
        }

        return trim(implode('', $parts));
    }

    /**
     * @param array<string,string> $rels
     * @return array{content:string,ext:string}|null
     */
    private function extractImageFromParagraph(\DOMXPath $xpath, \DOMNode $paragraph, ZipArchive $zip, array $rels): ?array
    {
        foreach ($xpath->query('.//a:blip/@r:embed', $paragraph) as $embedNode) {
            $relationshipId = $embedNode->nodeValue;
            $target = $rels[$relationshipId] ?? null;

            if (! $target) {
                continue;
            }

            $zipPath = $this->normalizeDocxTargetPath($target);
            $content = $zip->getFromName($zipPath);

            if ($content === false) {
                continue;
            }

            $extension = strtolower(pathinfo($zipPath, PATHINFO_EXTENSION));
            if ($extension === '') {
                $extension = 'png';
            }

            return [
                'content' => $content,
                'ext' => $extension,
            ];
        }

        return null;
    }

    private function normalizeDocxTargetPath(string $target): string
    {
        $target = str_replace('\\', '/', $target);
        $target = ltrim($target, '/');

        while (str_starts_with($target, '../')) {
            $target = substr($target, 3);
        }

        if (! str_starts_with($target, 'word/')) {
            $target = 'word/'.$target;
        }

        return $target;
    }

    /**
     * @param array{fields: array<string,string>, image: array{content:string,ext:string}|null} $block
     */
    private function processBlock(array $block): void
    {
        $fields = $this->normalizeFields($block['fields']);
        $validated = $this->validateBlock($fields);
        $chapterId = $validated['chapter_id'];
        $type = $validated['type'];
        $questionText = $validated['question_text'];
        $answerKey = $validated['answer_key'];

        $questionImagePath = null;

        try {
            if ($block['image'] !== null) {
                $filename = 'question-images/docx-'.Str::uuid().'.'.$block['image']['ext'];
                Storage::disk('public')->put($filename, $block['image']['content']);
                $questionImagePath = $filename;
            }

            DB::transaction(function () use ($chapterId, $type, $questionText, $answerKey, $fields, $questionImagePath): void {
                $question = Question::query()->create([
                    'chapter_id' => $chapterId,
                    'created_by' => $this->userId,
                    'type' => $type,
                    'question_text' => $questionText,
                    'question_image_path' => $questionImagePath,
                    'answer_key' => $answerKey,
                    'explanation' => trim((string) ($fields['explanation'] ?? '')) ?: null,
                    'points' => max(1, (int) ($fields['points'] ?? 1)),
                    'difficulty_level' => $this->resolveDifficulty($fields['difficulty_level'] ?? null),
                    'metadata' => null,
                ]);

                if ($type !== 'multiple_choice') {
                    return;
                }

                $options = collect(['a', 'b', 'c', 'd', 'e'])
                    ->map(function (string $key) use ($fields): array {
                        return [
                            'option_key' => strtoupper($key),
                            'option_text' => trim((string) ($fields['option_'.$key] ?? '')),
                        ];
                    })
                    ->filter(fn (array $option) => $option['option_text'] !== '')
                    ->values();

                if ($options->count() < 2) {
                    throw new \RuntimeException('Soal multiple_choice minimal memiliki dua opsi.');
                }

                $correctOptionKey = strtoupper(trim((string) ($fields['correct_option_key'] ?? '')));
                if ($correctOptionKey === '' || ! $options->contains(fn (array $option): bool => $option['option_key'] === $correctOptionKey)) {
                    throw new \RuntimeException('Field correct_option_key wajib sesuai opsi yang tersedia.');
                }

                foreach ($options as $index => $option) {
                    $question->options()->create([
                        'option_key' => $option['option_key'],
                        'option_text' => $option['option_text'],
                        'is_correct' => $option['option_key'] === $correctOptionKey,
                        'sort_order' => $index,
                    ]);
                }
            });
        } catch (\Throwable $exception) {
            if ($questionImagePath) {
                Storage::disk('public')->delete($questionImagePath);
            }

            throw $exception;
        }
    }

    /**
     * @param array<string,string> $fields
     * @return array{chapter_id:int,type:string,question_text:string,answer_key:string,correct_option_key:string|null}
     */
    private function validateBlock(array $fields): array
    {
        $type = strtolower(trim((string) ($fields['type'] ?? 'essay')));
        if (! in_array($type, ['multiple_choice', 'essay'], true)) {
            throw new \RuntimeException('Field type harus bernilai multiple_choice atau essay.');
        }

        $chapterId = $this->resolveChapterId($fields);

        $questionText = trim((string) ($fields['question_text'] ?? ''));
        if ($questionText === '') {
            throw new \RuntimeException('Field question_text wajib diisi.');
        }

        $answerKey = trim((string) ($fields['answer_key'] ?? ''));
        if ($answerKey === '') {
            throw new \RuntimeException('Field answer_key wajib diisi.');
        }

        $correctOptionKey = null;

        if ($type === 'multiple_choice') {
            $options = collect(['a', 'b', 'c', 'd', 'e'])
                ->map(fn (string $key): string => trim((string) ($fields['option_'.$key] ?? '')))
                ->filter(fn (string $value): bool => $value !== '')
                ->values();

            if ($options->count() < 2) {
                throw new \RuntimeException('Soal multiple_choice minimal memiliki dua opsi (option_a ... option_e).');
            }

            $correctOptionKey = strtoupper(trim((string) ($fields['correct_option_key'] ?? '')));
            if ($correctOptionKey === '' || ! in_array($correctOptionKey, ['A', 'B', 'C', 'D', 'E'], true)) {
                throw new \RuntimeException('Field correct_option_key wajib diisi A/B/C/D/E.');
            }

            $selectedOption = trim((string) ($fields['option_'.strtolower($correctOptionKey)] ?? ''));
            if ($selectedOption === '') {
                throw new \RuntimeException('correct_option_key tidak sesuai karena opsi jawabannya kosong.');
            }
        }

        return [
            'chapter_id' => $chapterId,
            'type' => $type,
            'question_text' => $questionText,
            'answer_key' => $answerKey,
            'correct_option_key' => $correctOptionKey,
        ];
    }

    /**
     * @param array<string,string> $fields
     * @return array<string,string>
     */
    private function normalizeFields(array $fields): array
    {
        $aliases = [
            'chapter' => 'chapter_name',
            'bab' => 'chapter_name',
            'pertanyaan' => 'question_text',
            'kunci' => 'answer_key',
            'jawaban' => 'answer_key',
            'pembahasan' => 'explanation',
            'kesulitan' => 'difficulty_level',
            'opsi_a' => 'option_a',
            'opsi_b' => 'option_b',
            'opsi_c' => 'option_c',
            'opsi_d' => 'option_d',
            'opsi_e' => 'option_e',
        ];

        $normalized = [];

        foreach ($fields as $key => $value) {
            $mapped = $aliases[$key] ?? $key;
            $normalized[$mapped] = $value;
        }

        return $normalized;
    }

    /**
     * @param array<string,string> $fields
     */
    private function resolveChapterId(array $fields): int
    {
        $chapterId = $fields['chapter_id'] ?? null;
        if (! empty($chapterId)) {
            $query = Chapter::query();
            if (! $this->isSuperAdmin) {
                $query->where('created_by', $this->userId);
            }

            $chapter = $query->find((int) $chapterId);
            if ($chapter) {
                return $chapter->id;
            }
        }

        $chapterName = trim((string) ($fields['chapter_name'] ?? ''));
        if ($chapterName !== '') {
            $query = Chapter::query()->where('name', $chapterName);
            if (! $this->isSuperAdmin) {
                $query->where('created_by', $this->userId);
            }

            $chapter = $query->first();
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
}