<?php

namespace App\Http\Controllers;

use App\Exports\QuestionPackageExport;
use App\Models\Chapter;
use App\Models\Question;
use App\Models\QuestionPackage;
use App\Services\QuestionPackageGeneratorService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpWord\PhpWord;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Illuminate\Validation\Rule;

class QuestionPackageController extends Controller
{
    public function __construct(private readonly QuestionPackageGeneratorService $generator)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'packages.view');
        $userId = (int) $request->user()->id;
        $scopeToCurrentUser = $this->shouldScopeToCurrentUser($request);

        $perPage = max(5, min(100, $request->integer('per_page', 10)));
        $sortBy = in_array($request->string('sort_by')->value(), ['title', 'generated_at', 'total_questions'], true)
            ? $request->string('sort_by')->value()
            : 'generated_at';
        $sortDir = $request->string('sort_direction')->lower()->value() === 'asc' ? 'asc' : 'desc';

        $packages = QuestionPackage::query()
            ->with(['creator:id,name', 'rules.chapter:id,parent_id,name'])
            ->withCount('items')
            ->when($scopeToCurrentUser, fn ($query) => $query->where('generated_by', $userId))
            ->when($request->filled('search'), fn ($query) => $query->where('title', 'like', '%'.$request->string('search').'%'))
            ->when($request->filled('generated_by'), fn ($query) => $query->where('generated_by', $request->integer('generated_by')))
            ->when($request->filled('from_date'), fn ($query) => $query->whereDate('generated_at', '>=', $request->date('from_date')))
            ->when($request->filled('to_date'), fn ($query) => $query->whereDate('generated_at', '<=', $request->date('to_date')))
            ->when($request->filled('min_questions'), fn ($query) => $query->where('total_questions', '>=', $request->integer('min_questions')))
            ->when($request->filled('max_questions'), fn ($query) => $query->where('total_questions', '<=', $request->integer('max_questions')))
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->withQueryString();

        return $this->paginatedResponse($packages);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'packages.generate');
        $userId = (int) $request->user()->id;
        $scopeToCurrentUser = $this->shouldScopeToCurrentUser($request);

        $payload = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'total_questions' => ['required', 'integer', 'min:1'],
            'rules' => ['required', 'array', 'min:1'],
            'rules.*.chapter_id' => [
                'required',
                'integer',
                $scopeToCurrentUser
                    ? Rule::exists('chapters', 'id')->where(fn ($query) => $query->where('created_by', $userId))
                    : Rule::exists('chapters', 'id'),
            ],
            'rules.*.composition_type' => ['required', Rule::in(['percentage', 'quantity'])],
            'rules.*.composition_value' => ['required', 'integer', 'min:1'],
            'rules.*.type' => ['nullable', Rule::in(['multiple_choice', 'essay'])],
        ]);

        $package = $this->generator->generate($request->user(), $payload);

        return response()->json($package, 201);
    }

    public function show(Request $request, QuestionPackage $questionPackage): JsonResponse
    {
        $this->authorizePermission($request, 'packages.view');

        if ($this->shouldScopeToCurrentUser($request) && (int) $questionPackage->generated_by !== (int) $request->user()->id) {
            abort(404, 'Paket soal tidak ditemukan.');
        }

        return response()->json(
            $questionPackage->load([
                'creator:id,name,email',
                'rules.chapter:id,parent_id,name',
                'items.question.chapter:id,parent_id,name',
                'items.question.options',
            ])
        );
    }

    public function update(Request $request, QuestionPackage $questionPackage): JsonResponse
    {
        $this->authorizePermission($request, 'packages.update');

        if ($this->shouldScopeToCurrentUser($request) && (int) $questionPackage->generated_by !== (int) $request->user()->id) {
            abort(404, 'Paket soal tidak ditemukan.');
        }

        $payload = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $questionPackage->update([
            'title' => $payload['title'],
            'description' => $payload['description'] ?? null,
        ]);

        return response()->json(
            $questionPackage->fresh()->load([
                'creator:id,name,email',
                'rules.chapter:id,parent_id,name',
                'items.question.chapter:id,parent_id,name',
                'items.question.options',
            ])
        );
    }

    public function destroy(Request $request, QuestionPackage $questionPackage): JsonResponse
    {
        $this->authorizePermission($request, 'packages.delete');

        if ($this->shouldScopeToCurrentUser($request) && (int) $questionPackage->generated_by !== (int) $request->user()->id) {
            abort(404, 'Paket soal tidak ditemukan.');
        }

        $questionPackage->delete();

        return response()->json([
            'message' => 'Paket soal berhasil dihapus.',
        ]);
    }

    public function ruleQuestionEditor(Request $request, QuestionPackage $questionPackage): JsonResponse
    {
        $this->authorizePermission($request, 'packages.update');

        if ($this->shouldScopeToCurrentUser($request) && (int) $questionPackage->generated_by !== (int) $request->user()->id) {
            abort(404, 'Paket soal tidak ditemukan.');
        }

        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super-admin');
        $userId = (int) $user->id;

        $rules = $questionPackage->rules()
            ->with('chapter:id,parent_id,subject_id,name')
            ->orderBy('id')
            ->get();

        $chaptersQuery = Chapter::query()->select('id', 'parent_id');
        if (! $isSuperAdmin) {
            $chaptersQuery->where('created_by', $userId);
        }

        $childrenByParent = $chaptersQuery->get()->groupBy('parent_id');
        $ruleScopes = [];

        foreach ($rules as $rule) {
            $ruleScopes[$rule->id] = $this->descendantAndSelfIds((int) $rule->chapter_id, $childrenByParent);
        }

        $selectedByRule = $rules->mapWithKeys(fn ($rule) => [$rule->id => []])->all();
        $items = $questionPackage->items()
            ->with('question:id,chapter_id')
            ->orderBy('position')
            ->get();

        foreach ($items as $item) {
            $question = $item->question;

            if (! $question) {
                continue;
            }

            foreach ($rules as $rule) {
                if (in_array((int) $question->chapter_id, $ruleScopes[$rule->id] ?? [], true)) {
                    $selectedByRule[$rule->id][] = (int) $question->id;
                    break;
                }
            }
        }

        $responseRules = $rules->map(function ($rule) use ($isSuperAdmin, $userId, $ruleScopes, $selectedByRule) {
            $query = Question::query()
                ->with(['options', 'chapter:id,name'])
                ->whereIn('chapter_id', $ruleScopes[$rule->id] ?? []);

            if (! $isSuperAdmin) {
                $query->where('created_by', $userId);
            }

            $availableQuestions = $query
                ->orderByDesc('id')
                ->get()
                ->map(function (Question $question): array {
                    return [
                        'id' => (int) $question->id,
                        'chapter_id' => (int) $question->chapter_id,
                        'chapter_name' => $question->chapter?->name,
                        'type' => $question->type,
                        'question_text' => $question->question_text,
                        'question_image_url' => $question->question_image_url,
                        'answer_key' => $question->answer_key,
                        'explanation' => $question->explanation,
                        'options' => $question->options->map(fn ($option) => [
                            'id' => (int) $option->id,
                            'option_key' => $option->option_key,
                            'option_text' => $option->option_text,
                        ])->values()->all(),
                    ];
                })
                ->values();

            return [
                'id' => (int) $rule->id,
                'chapter_id' => (int) $rule->chapter_id,
                'chapter_name' => $rule->chapter?->name,
                'chapter_subject_id' => $rule->chapter?->subject_id ? (int) $rule->chapter->subject_id : null,
                'composition_type' => $rule->composition_type,
                'composition_value' => (int) $rule->composition_value,
                'generated_question_count' => (int) $rule->generated_question_count,
                'selected_question_ids' => $selectedByRule[$rule->id] ?? [],
                'available_questions' => $availableQuestions,
            ];
        })->values();

        return response()->json([
            'rules' => $responseRules,
            'total_selected' => collect($selectedByRule)->flatten()->count(),
        ]);
    }

    public function updateItems(Request $request, QuestionPackage $questionPackage): JsonResponse
    {
        $this->authorizePermission($request, 'packages.update');

        if ($this->shouldScopeToCurrentUser($request) && (int) $questionPackage->generated_by !== (int) $request->user()->id) {
            abort(404, 'Paket soal tidak ditemukan.');
        }

        $payload = $request->validate([
            'rules' => ['required', 'array', 'min:1'],
            'rules.*.rule_id' => ['required', 'integer'],
            'rules.*.question_ids' => ['required', 'array'],
            'rules.*.question_ids.*' => ['integer', 'distinct'],
        ]);

        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super-admin');
        $userId = (int) $user->id;

        $packageRules = $questionPackage->rules()->orderBy('id')->get();
        $packageRuleIds = $packageRules->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        $submittedRules = collect($payload['rules']);
        $submittedRuleIds = $submittedRules->pluck('rule_id')->map(fn ($id) => (int) $id)->values()->all();
        $uniqueSubmittedRuleIds = array_values(array_unique($submittedRuleIds));

        if (count($uniqueSubmittedRuleIds) !== count($submittedRuleIds)) {
            throw ValidationException::withMessages([
                'rules' => 'Setiap rule hanya boleh dikirim satu kali.',
            ]);
        }

        sort($packageRuleIds);
        $comparisonIds = $uniqueSubmittedRuleIds;
        sort($comparisonIds);

        if ($comparisonIds !== $packageRuleIds) {
            throw ValidationException::withMessages([
                'rules' => 'Data rule tidak lengkap atau tidak sesuai dengan paket soal ini.',
            ]);
        }

        $chaptersQuery = Chapter::query()->select('id', 'parent_id');
        if (! $isSuperAdmin) {
            $chaptersQuery->where('created_by', $userId);
        }

        $childrenByParent = $chaptersQuery->get()->groupBy('parent_id');
        $submittedByRule = $submittedRules->keyBy(fn ($rule) => (int) $rule['rule_id']);
        $selectedQuestionIds = [];
        $questionIdsByRule = [];

        foreach ($packageRules as $rule) {
            $scopeIds = $this->descendantAndSelfIds((int) $rule->chapter_id, $childrenByParent);
            $questionIds = collect($submittedByRule->get((int) $rule->id)['question_ids'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->values();

            foreach ($questionIds as $questionId) {
                if (in_array($questionId, $selectedQuestionIds, true)) {
                    throw ValidationException::withMessages([
                        'rules' => 'Satu soal tidak boleh dipilih di lebih dari satu rule.',
                    ]);
                }

                $selectedQuestionIds[] = $questionId;
            }

            if ($questionIds->isNotEmpty()) {
                $query = Question::query()
                    ->whereIn('id', $questionIds->all())
                    ->whereIn('chapter_id', $scopeIds);

                if (! $isSuperAdmin) {
                    $query->where('created_by', $userId);
                }

                $validIds = $query->pluck('id')->map(fn ($id) => (int) $id)->all();

                if (count($validIds) !== $questionIds->count()) {
                    throw ValidationException::withMessages([
                        'rules' => 'Terdapat soal yang tidak sesuai dengan bab/sub bab pada salah satu rule.',
                    ]);
                }
            }

            $questionIdsByRule[(int) $rule->id] = $questionIds->all();
        }

        DB::transaction(function () use ($questionPackage, $packageRules, $questionIdsByRule): void {
            $questionPackage->items()->delete();

            $position = 1;
            foreach ($packageRules as $rule) {
                $ids = $questionIdsByRule[(int) $rule->id] ?? [];

                foreach ($ids as $questionId) {
                    $questionPackage->items()->create([
                        'question_id' => $questionId,
                        'position' => $position,
                    ]);

                    $position++;
                }

                $count = count($ids);
                $updateData = [
                    'generated_question_count' => $count,
                ];

                if ($rule->composition_type === 'quantity') {
                    $updateData['composition_value'] = $count;
                }

                $rule->update($updateData);
            }

            $totalQuestions = max(0, $position - 1);

            foreach ($packageRules as $rule) {
                if ($rule->composition_type !== 'percentage') {
                    continue;
                }

                $count = count($questionIdsByRule[(int) $rule->id] ?? []);
                $percentage = $totalQuestions > 0
                    ? (int) round(($count / $totalQuestions) * 100)
                    : 0;

                $rule->update([
                    'composition_value' => $percentage,
                ]);
            }

            $questionPackage->update([
                'total_questions' => $totalQuestions,
            ]);
        });

        return response()->json(
            $questionPackage->fresh()->load([
                'creator:id,name,email',
                'rules.chapter:id,parent_id,name',
                'items.question.chapter:id,parent_id,name',
                'items.question.options',
            ])
        );
    }

    public function addRule(Request $request, QuestionPackage $questionPackage): JsonResponse
    {
        $this->authorizePermission($request, 'packages.update');

        if ($this->shouldScopeToCurrentUser($request) && (int) $questionPackage->generated_by !== (int) $request->user()->id) {
            abort(404, 'Paket soal tidak ditemukan.');
        }

        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super-admin');
        $userId = (int) $user->id;

        $chapterRule = $isSuperAdmin
            ? Rule::exists('chapters', 'id')
            : Rule::exists('chapters', 'id')->where(fn ($query) => $query->where('created_by', $userId));

        $payload = $request->validate([
            'chapter_id' => ['required', 'integer', $chapterRule],
            'composition_type' => ['nullable', Rule::in(['percentage', 'quantity'])],
        ]);

        $chapterId = (int) $payload['chapter_id'];
        $alreadyExists = $questionPackage->rules()->where('chapter_id', $chapterId)->exists();

        if ($alreadyExists) {
            throw ValidationException::withMessages([
                'chapter_id' => 'Rule untuk bab ini sudah ada di paket soal.',
            ]);
        }

        $existingSubjectId = $questionPackage->rules()
            ->reorder()
            ->join('chapters', 'chapters.id', '=', 'question_package_rules.chapter_id')
            ->value('chapters.subject_id');

        if ($existingSubjectId) {
            $selectedSubjectId = Chapter::query()->where('id', $chapterId)->value('subject_id');

            if ((int) $selectedSubjectId !== (int) $existingSubjectId) {
                throw ValidationException::withMessages([
                    'chapter_id' => 'Bab yang dipilih harus berasal dari subject paket soal yang sama.',
                ]);
            }
        }

        $compositionType = $payload['composition_type'] ?? 'quantity';
        $questionPackage->rules()->create([
            'chapter_id' => $chapterId,
            'composition_type' => $compositionType,
            'composition_value' => 0,
            'generated_question_count' => 0,
        ]);

        return response()->json(
            $questionPackage->fresh()->load([
                'creator:id,name,email',
                'rules.chapter:id,parent_id,name',
                'items.question.chapter:id,parent_id,name',
                'items.question.options',
            ])
        );
    }

    public function exportPdf(Request $request, QuestionPackage $questionPackage)
    {
        $this->authorizePermission($request, 'packages.export');
        $includeAnswerKey = $request->boolean('include_answer_key');

        if ($this->shouldScopeToCurrentUser($request) && (int) $questionPackage->generated_by !== (int) $request->user()->id) {
            abort(404, 'Paket soal tidak ditemukan.');
        }

        $questionPackage->load([
            'creator:id,name,email',
            'rules.chapter:id,parent_id,name',
            'items.question.chapter:id,parent_id,name',
            'items.question.options',
        ]);

        $filename = 'paket-soal-'.$questionPackage->id.($includeAnswerKey ? '-dengan-kunci' : '').'.pdf';
        $pdf = Pdf::loadView('exports.question-package-pdf', [
            'package' => $questionPackage,
            'includeAnswerKey' => $includeAnswerKey,
        ])->setPaper('a4');

        return $pdf->download($filename);
    }

    public function exportExcel(Request $request, QuestionPackage $questionPackage): BinaryFileResponse
    {
        $this->authorizePermission($request, 'packages.export');

        if ($this->shouldScopeToCurrentUser($request) && (int) $questionPackage->generated_by !== (int) $request->user()->id) {
            abort(404, 'Paket soal tidak ditemukan.');
        }

        $questionPackage->load([
            'creator:id,name,email',
            'rules.chapter:id,parent_id,name',
            'items.question.chapter:id,parent_id,name',
            'items.question.options',
        ]);

        $filename = 'paket-soal-'.$questionPackage->id.'.xlsx';

        return Excel::download(new QuestionPackageExport($questionPackage), $filename);
    }

    public function exportWord(Request $request, QuestionPackage $questionPackage): BinaryFileResponse
    {
        $this->authorizePermission($request, 'packages.export');
        $includeAnswerKey = $request->boolean('include_answer_key');

        if ($this->shouldScopeToCurrentUser($request) && (int) $questionPackage->generated_by !== (int) $request->user()->id) {
            abort(404, 'Paket soal tidak ditemukan.');
        }

        $questionPackage->load([
            'creator:id,name,email',
            'rules.chapter:id,parent_id,name',
            'items.question.chapter:id,parent_id,name',
            'items.question.options',
        ]);

        $phpWord = new PhpWord();
        $section = $phpWord->addSection();

        $titleStyle = ['bold' => true, 'size' => 14];
        $descriptionStyle = ['size' => 10];
        $questionStyle = ['bold' => true, 'size' => 10];
        $optionStyle = ['size' => 10];
        $answerStyle = ['italic' => true, 'size' => 10];

        $section->addText($questionPackage->title, $titleStyle);

        if (! empty($questionPackage->description)) {
            $section->addText('Deskripsi: '.$questionPackage->description, $descriptionStyle);
        }

        $section->addTextBreak(1);

        foreach ($questionPackage->items as $index => $item) {
            $question = $item->question;
            if (! $question) {
                continue;
            }

            $section->addText(($index + 1).'. '.$question->question_text, $questionStyle);

            if ($question->question_image_path && Storage::disk('public')->exists($question->question_image_path)) {
                $section->addImage(
                    storage_path('app/public/'.$question->question_image_path),
                    ['width' => 220]
                );
            }

            if ($question->type === 'multiple_choice' && $question->options->isNotEmpty()) {
                foreach ($question->options as $option) {
                    $section->addText($option->option_key.'. '.$option->option_text, $optionStyle);
                }
            }

            if ($includeAnswerKey && ! empty($question->answer_key)) {
                $section->addText('Kunci Jawaban: '.$question->answer_key, $answerStyle);
            }

            $section->addTextBreak(1);
        }

        $directory = storage_path('app/temp');
        if (! is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        $filename = 'paket-soal-'.$questionPackage->id.($includeAnswerKey ? '-dengan-kunci' : '').'.docx';
        $filePath = $directory.DIRECTORY_SEPARATOR.$filename;

        $writer = WordIOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($filePath);

        return response()->download($filePath, $filename)->deleteFileAfterSend(true);
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
                $resolved[] = (int) $child->id;
                $stack[] = (int) $child->id;
            }
        }

        return array_values(array_unique($resolved));
    }
}