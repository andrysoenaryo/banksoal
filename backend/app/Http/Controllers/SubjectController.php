<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'subjects.view');

        $userId = (int) $request->user()->id;
        $scopeToCurrentUser = $this->shouldScopeToCurrentUser($request);

        $perPage = max(5, min(100, $request->integer('per_page', 10)));
        $sortBy = in_array($request->string('sort_by')->value(), ['name', 'sort_order', 'created_at'], true)
            ? $request->string('sort_by')->value()
            : 'sort_order';
        $sortDir = $request->string('sort_direction')->lower()->value() === 'desc' ? 'desc' : 'asc';

        $subjects = Subject::query()
            ->withCount('chapters')
            ->when($scopeToCurrentUser, fn ($query) => $query->where('created_by', $userId))
            ->when($request->filled('search'), fn ($query) => $query->where('name', 'like', '%'.$request->string('search').'%'))
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderBy($sortBy, $sortDir)
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return $this->paginatedResponse($subjects);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'subjects.create');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $subject = Subject::query()->create([
            ...$data,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($subject->fresh()->loadCount('chapters'), 201);
    }

    public function show(Request $request, Subject $subject): JsonResponse
    {
        $this->authorizePermission($request, 'subjects.view');

        if ($this->shouldScopeToCurrentUser($request) && (int) $subject->created_by !== (int) $request->user()->id) {
            abort(404, 'Subject tidak ditemukan.');
        }

        return response()->json($subject->loadCount('chapters'));
    }

    public function update(Request $request, Subject $subject): JsonResponse
    {
        $this->authorizePermission($request, 'subjects.update');

        if ($this->shouldScopeToCurrentUser($request) && (int) $subject->created_by !== (int) $request->user()->id) {
            abort(404, 'Subject tidak ditemukan.');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $subject->update([
            ...$data,
            'sort_order' => $data['sort_order'] ?? $subject->sort_order,
            'is_active' => $data['is_active'] ?? $subject->is_active,
        ]);

        return response()->json($subject->fresh()->loadCount('chapters'));
    }

    public function destroy(Request $request, Subject $subject): JsonResponse
    {
        $this->authorizePermission($request, 'subjects.delete');

        if ($this->shouldScopeToCurrentUser($request) && (int) $subject->created_by !== (int) $request->user()->id) {
            abort(404, 'Subject tidak ditemukan.');
        }

        if ($subject->chapters()->exists()) {
            return response()->json([
                'message' => 'Subject tidak dapat dihapus karena masih memiliki bab/sub bab.',
            ], 422);
        }

        $subject->delete();

        return response()->json([
            'message' => 'Subject berhasil dihapus.',
        ]);
    }
}
