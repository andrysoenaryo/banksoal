<?php

namespace App\Http\Controllers;

use App\Models\Chapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ChapterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'chapters.view');
        $userId = (int) $request->user()->id;
        $scopeToCurrentUser = $this->shouldScopeToCurrentUser($request);

        if ($request->boolean('tree')) {
            $query = Chapter::query()
                ->withCount('questions')
                ->with(['subject:id,name', 'childrenRecursive'])
                ->whereNull('parent_id')
                ->orderBy('sort_order')
                ->orderBy('name');

            if ($scopeToCurrentUser) {
                $query->where('created_by', $userId);
            }

            $chapters = $query->get();

            return response()->json($chapters);
        }

        $perPage = max(5, min(100, $request->integer('per_page', 10)));
        $sortBy = in_array($request->string('sort_by')->value(), ['name', 'sort_order', 'created_at'], true)
            ? $request->string('sort_by')->value()
            : 'sort_order';
        $sortDirection = $request->string('sort_direction')->lower()->value() === 'desc' ? 'desc' : 'asc';

        $query = Chapter::query()
            ->with(['parent:id,name', 'subject:id,name'])
            ->withCount('questions')
            ->when($request->filled('search'), function ($builder) use ($request) {
                $search = $request->string('search')->value();

                $builder->where(function ($inner) use ($search): void {
                    $inner->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->when($request->filled('is_active'), fn ($builder) => $builder->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('subject_id'), fn ($builder) => $builder->where('subject_id', $request->integer('subject_id')))
            ->when($request->string('scope')->value() === 'root', fn ($builder) => $builder->whereNull('parent_id'))
            ->when($request->string('scope')->value() === 'sub', fn ($builder) => $builder->whereNotNull('parent_id'))
            ->orderBy($sortBy, $sortDirection)
            ->orderBy('name');

        if ($scopeToCurrentUser) {
            $query->where('created_by', $userId);
        }

        $chapters = $query->paginate($perPage)->withQueryString();

        return $this->paginatedResponse($chapters);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'chapters.create');
        $userId = (int) $request->user()->id;
        $scopeToCurrentUser = $this->shouldScopeToCurrentUser($request);

        $data = $request->validate([
            'subject_id' => [
                'required',
                'integer',
                $scopeToCurrentUser
                    ? Rule::exists('subjects', 'id')->where(fn ($query) => $query->where('created_by', $userId))
                    : Rule::exists('subjects', 'id'),
            ],
            'parent_id' => [
                'nullable',
                'integer',
                $scopeToCurrentUser
                    ? Rule::exists('chapters', 'id')->where(fn ($query) => $query->where('created_by', $userId))
                    : Rule::exists('chapters', 'id'),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (! empty($data['parent_id'])) {
            $parent = Chapter::query()->find((int) $data['parent_id']);

            if (! $parent) {
                throw ValidationException::withMessages([
                    'parent_id' => 'Parent bab tidak ditemukan.',
                ]);
            }

            if ((int) $parent->subject_id !== (int) $data['subject_id']) {
                throw ValidationException::withMessages([
                    'subject_id' => 'Subject sub bab harus sama dengan subject parent.',
                ]);
            }
        }

        $chapter = Chapter::query()->create([
            ...$data,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'created_by' => $userId,
        ]);

        return response()->json($chapter->fresh(), 201);
    }

    public function show(Request $request, Chapter $chapter): JsonResponse
    {
        $this->authorizePermission($request, 'chapters.view');

        if ($this->shouldScopeToCurrentUser($request) && (int) $chapter->created_by !== (int) $request->user()->id) {
            abort(404, 'Bab tidak ditemukan.');
        }

        return response()->json(
            $chapter->load(['parent:id,name', 'subject:id,name', 'childrenRecursive', 'questions.options'])->loadCount('questions')
        );
    }

    public function update(Request $request, Chapter $chapter): JsonResponse
    {
        $this->authorizePermission($request, 'chapters.update');
        $userId = (int) $request->user()->id;
        $scopeToCurrentUser = $this->shouldScopeToCurrentUser($request);

        if ($scopeToCurrentUser && (int) $chapter->created_by !== $userId) {
            abort(404, 'Bab tidak ditemukan.');
        }

        $data = $request->validate([
            'subject_id' => [
                'required',
                'integer',
                $scopeToCurrentUser
                    ? Rule::exists('subjects', 'id')->where(fn ($query) => $query->where('created_by', $userId))
                    : Rule::exists('subjects', 'id'),
            ],
            'parent_id' => [
                'nullable',
                'integer',
                $scopeToCurrentUser
                    ? Rule::exists('chapters', 'id')->where(fn ($query) => $query->where('created_by', $userId))
                    : Rule::exists('chapters', 'id'),
                Rule::notIn([$chapter->id]),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (! empty($data['parent_id'])) {
            $parent = Chapter::query()->find((int) $data['parent_id']);

            if (! $parent) {
                throw ValidationException::withMessages([
                    'parent_id' => 'Parent bab tidak ditemukan.',
                ]);
            }

            if ((int) $parent->subject_id !== (int) $data['subject_id']) {
                throw ValidationException::withMessages([
                    'subject_id' => 'Subject sub bab harus sama dengan subject parent.',
                ]);
            }
        }

        $chapter->update([
            ...$data,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? $chapter->is_active,
        ]);

        return response()->json($chapter->fresh()->loadCount('questions'));
    }

    public function destroy(Request $request, Chapter $chapter): JsonResponse
    {
        $this->authorizePermission($request, 'chapters.delete');

        if ($this->shouldScopeToCurrentUser($request) && (int) $chapter->created_by !== (int) $request->user()->id) {
            abort(404, 'Bab tidak ditemukan.');
        }

        if ($chapter->children()->exists() || $chapter->questions()->exists()) {
            return response()->json([
                'message' => 'Bab/sub bab yang masih memiliki turunan atau soal tidak dapat dihapus.',
            ], 422);
        }

        $chapter->delete();

        return response()->json([
            'message' => 'Bab berhasil dihapus.',
        ]);
    }
}