<?php

namespace App\Http\Controllers;

use App\Exports\QuestionImportTemplateExport;
use App\Imports\QuestionsDocxImport;
use App\Imports\QuestionsImport;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;

class QuestionController extends Controller
{
    public function image(string $path)
    {
        $normalizedPath = ltrim($path, '/');

        if (str_contains($normalizedPath, '..')) {
            abort(404, 'Gambar tidak ditemukan.');
        }

        $absolutePath = storage_path('app/public/'.$normalizedPath);

        if (! is_file($absolutePath)) {
            abort(404, 'Gambar tidak ditemukan.');
        }

        return response()->file($absolutePath, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'questions.view');
        $userId = (int) $request->user()->id;
        $scopeToCurrentUser = $this->shouldScopeToCurrentUser($request);

        $perPage = max(5, min(100, $request->integer('per_page', 10)));
        $sortBy = in_array($request->string('sort_by')->value(), ['question_text', 'difficulty_level', 'points', 'created_at'], true)
            ? $request->string('sort_by')->value()
            : 'created_at';
        $sortDir = $request->string('sort_direction')->lower()->value() === 'asc' ? 'asc' : 'desc';

        $questions = Question::query()
            ->with(['chapter:id,parent_id,name', 'creator:id,name', 'options'])
            ->when($scopeToCurrentUser, fn ($query) => $query->where('created_by', $userId))
            ->when($request->filled('chapter_id'), fn ($query) => $query->where('chapter_id', $request->integer('chapter_id')))
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->string('type')))
            ->when($request->filled('difficulty_level'), fn ($query) => $query->where('difficulty_level', $request->string('difficulty_level')))
            ->when($request->filled('created_by'), fn ($query) => $query->where('created_by', $request->integer('created_by')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->value();
                $query->where(function ($inner) use ($search): void {
                    $inner->where('question_text', 'like', '%'.$search.'%')
                        ->orWhere('answer_key', 'like', '%'.$search.'%')
                        ->orWhere('explanation', 'like', '%'.$search.'%');
                });
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->withQueryString();

        return $this->paginatedResponse($questions);
    }

    public function import(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'questions.import');

        $payload = $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls'],
        ]);

        $importer = new QuestionsImport(
            $request->user()->id,
            $this->isSuperAdmin($request)
        );
        Excel::import($importer, $payload['file']);

        return response()->json([
            'message' => 'Import selesai diproses.',
            'summary' => $importer->summary(),
        ]);
    }

    public function importDocx(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'questions.import');

        $payload = $request->validate([
            'file' => ['required', 'file', 'mimes:docx'],
        ]);

        $importer = new QuestionsDocxImport(
            (int) $request->user()->id,
            $this->isSuperAdmin($request)
        );

        return response()->json([
            'message' => 'Import DOCX selesai diproses.',
            'summary' => $importer->import($payload['file']),
        ]);
    }

    public function previewImportDocx(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'questions.import');

        $payload = $request->validate([
            'file' => ['required', 'file', 'mimes:docx'],
        ]);

        $importer = new QuestionsDocxImport(
            (int) $request->user()->id,
            $this->isSuperAdmin($request)
        );

        return response()->json([
            'message' => 'Preview DOCX berhasil dibuat.',
            'preview' => $importer->preview($payload['file']),
        ]);
    }

    public function importTemplate(Request $request)
    {
        $this->authorizePermission($request, 'questions.import');

        return Excel::download(new QuestionImportTemplateExport(), 'template-import-soal.xlsx');
    }

    public function importTemplateDocx(Request $request)
    {
        $this->authorizePermission($request, 'questions.import');

        $phpWord = new PhpWord();
        $section = $phpWord->addSection();

        $section->addTitle('Template Import Soal DOCX', 1);
        $section->addText('Gunakan format ini persis agar parser dapat membaca data dengan benar.');
        $section->addText('Gunakan penanda [SOAL] dan [/SOAL] untuk setiap blok soal.');
        $section->addText('Sisipkan gambar soal di dalam blok [SOAL] jika diperlukan.');
        $section->addText('Field wajib: chapter_id/chapter_name, type, question_text, answer_key.');
        $section->addTextBreak(1);

        $section->addText('[SOAL]');
        $section->addText('chapter_id: ');
        $section->addText('chapter_name: Nama Bab Anda');
        $section->addText('type: multiple_choice');
        $section->addText('question_text: Ibu kota Indonesia?');
        $section->addText('answer_key: A');
        $section->addText('explanation: Contoh pembahasan singkat');
        $section->addText('difficulty_level: mudah');
        $section->addText('points: 1');
        $section->addText('option_a: Jakarta');
        $section->addText('option_b: Bandung');
        $section->addText('option_c: Surabaya');
        $section->addText('option_d: Medan');
        $section->addText('option_e: ');
        $section->addText('correct_option_key: A');
        $section->addText('[/SOAL]');
        $section->addTextBreak(1);

        $section->addText('[SOAL]');
        $section->addText('chapter_id: 3');
        $section->addText('chapter_name: ');
        $section->addText('type: essay');
        $section->addText('question_text: Jelaskan fotosintesis.');
        $section->addText('answer_key: Rubrik jawaban singkat');
        $section->addText('explanation: Menjelaskan proses fotosintesis.');
        $section->addText('difficulty_level: sedang');
        $section->addText('points: 2');
        $section->addText('[/SOAL]');

        $tempPath = tempnam(sys_get_temp_dir(), 'template-soal-docx-');
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tempPath);

        return response()->download($tempPath, 'template-import-soal.docx')->deleteFileAfterSend(true);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'questions.create');

        $data = $this->validatePayload($request);
        $questionImage = $data['question_image'] ?? null;
        unset($data['question_image'], $data['remove_question_image']);

        $question = DB::transaction(function () use ($request, $data, $questionImage) {
            if ($questionImage) {
                $data['question_image_path'] = $questionImage->store('question-images', 'public');
            }

            $question = Question::query()->create([
                ...$data,
                'created_by' => $request->user()->id,
                'points' => $data['points'] ?? 1,
                'difficulty_level' => $data['difficulty_level'] ?? 'sedang',
            ]);

            $this->syncOptions($question, $data['options'] ?? []);

            return $question->load(['chapter:id,parent_id,name', 'creator:id,name', 'options']);
        });

        return response()->json($question, 201);
    }

    public function show(Request $request, Question $question): JsonResponse
    {
        $this->authorizePermission($request, 'questions.view');

        if ($this->shouldScopeToCurrentUser($request) && (int) $question->created_by !== (int) $request->user()->id) {
            abort(404, 'Soal tidak ditemukan.');
        }

        return response()->json($question->load(['chapter:id,parent_id,name', 'creator:id,name', 'options']));
    }

    public function update(Request $request, Question $question): JsonResponse
    {
        $this->authorizePermission($request, 'questions.update');

        if ($this->shouldScopeToCurrentUser($request) && (int) $question->created_by !== (int) $request->user()->id) {
            abort(404, 'Soal tidak ditemukan.');
        }

        $data = $this->validatePayload($request);
        $questionImage = $data['question_image'] ?? null;
        $removeQuestionImage = (bool) ($data['remove_question_image'] ?? false);
        unset($data['question_image'], $data['remove_question_image']);

        DB::transaction(function () use ($question, $data, $questionImage, $removeQuestionImage): void {
            $oldImagePath = $question->question_image_path;

            if ($questionImage) {
                $data['question_image_path'] = $questionImage->store('question-images', 'public');

                if ($oldImagePath) {
                    Storage::disk('public')->delete($oldImagePath);
                }
            } elseif ($removeQuestionImage) {
                $data['question_image_path'] = null;

                if ($oldImagePath) {
                    Storage::disk('public')->delete($oldImagePath);
                }
            }

            $question->update([
                ...$data,
                'points' => $data['points'] ?? $question->points,
                'difficulty_level' => $data['difficulty_level'] ?? $question->difficulty_level,
            ]);

            $this->syncOptions($question, $data['options'] ?? []);
        });

        return response()->json($question->fresh()->load(['chapter:id,parent_id,name', 'creator:id,name', 'options']));
    }

    public function destroy(Request $request, Question $question): JsonResponse
    {
        $this->authorizePermission($request, 'questions.delete');

        if ($this->shouldScopeToCurrentUser($request) && (int) $question->created_by !== (int) $request->user()->id) {
            abort(404, 'Soal tidak ditemukan.');
        }

        if ($question->question_image_path) {
            Storage::disk('public')->delete($question->question_image_path);
        }

        $question->delete();

        return response()->json([
            'message' => 'Soal berhasil dihapus.',
        ]);
    }

    private function validatePayload(Request $request): array
    {
        $userId = (int) $request->user()->id;
        $scopeToCurrentUser = $this->shouldScopeToCurrentUser($request);

        $data = $request->validate([
            'chapter_id' => [
                'required',
                'integer',
                $scopeToCurrentUser
                    ? Rule::exists('chapters', 'id')->where(fn ($query) => $query->where('created_by', $userId))
                    : Rule::exists('chapters', 'id'),
            ],
            'type' => ['required', Rule::in(['multiple_choice', 'essay'])],
            'question_text' => ['required', 'string'],
            'question_image' => ['nullable', 'file', 'image', 'max:2048'],
            'remove_question_image' => ['nullable', 'boolean'],
            'answer_key' => ['required', 'string'],
            'explanation' => ['nullable', 'string'],
            'points' => ['nullable', 'integer', 'min:1'],
            'difficulty_level' => ['nullable', Rule::in(['mudah', 'sedang', 'sulit'])],
            'metadata' => ['nullable', 'array'],
            'options' => ['nullable', 'array'],
            'options.*.option_key' => ['required_with:options', 'string', 'max:5'],
            'options.*.option_text' => ['required_with:options', 'string'],
            'options.*.is_correct' => ['required_with:options', 'boolean'],
            'options.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if ($data['type'] === 'multiple_choice') {
            if (empty($data['options']) || count($data['options']) < 2) {
                throw ValidationException::withMessages([
                    'options' => 'Soal pilihan ganda minimal memiliki dua opsi.',
                ]);
            }

            $correctOptions = collect($data['options'])->where('is_correct', true)->count();

            if ($correctOptions !== 1) {
                throw ValidationException::withMessages([
                    'options' => 'Soal pilihan ganda harus memiliki tepat satu jawaban benar.',
                ]);
            }
        }

        if ($data['type'] === 'essay') {
            $data['options'] = [];
        }

        return $data;
    }

    private function syncOptions(Question $question, array $options): void
    {
        $question->options()->delete();

        foreach ($options as $index => $option) {
            $question->options()->create([
                'option_key' => $option['option_key'],
                'option_text' => $option['option_text'],
                'is_correct' => (bool) $option['is_correct'],
                'sort_order' => $option['sort_order'] ?? $index,
            ]);
        }
    }
}