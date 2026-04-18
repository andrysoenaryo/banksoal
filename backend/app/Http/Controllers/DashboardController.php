<?php

namespace App\Http\Controllers;

use App\Models\Chapter;
use App\Models\Question;
use App\Models\QuestionPackage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'dashboard.view');
        $userId = (int) $request->user()->id;
        $scopeToCurrentUser = $this->shouldScopeToCurrentUser($request);

        $recentQuestionsQuery = Question::query()
            ->with(['chapter:id,name', 'creator:id,name'])
            ->latest()
            ->limit(5);

        if ($scopeToCurrentUser) {
            $recentQuestionsQuery->where('created_by', $userId);
        }

        $recentQuestions = $recentQuestionsQuery->get()
            ->map(fn (Question $question): array => [
                'id' => $question->id,
                'title' => $question->question_text,
                'type' => $question->type,
                'chapter' => $question->chapter?->name,
                'actor' => $question->creator?->name,
                'created_at' => $question->created_at?->toIso8601String(),
            ]);

        $recentPackagesQuery = QuestionPackage::query()
            ->with(['creator:id,name'])
            ->latest('generated_at')
            ->limit(5);

        if ($scopeToCurrentUser) {
            $recentPackagesQuery->where('generated_by', $userId);
        }

        $recentPackages = $recentPackagesQuery->get()
            ->map(fn (QuestionPackage $package): array => [
                'id' => $package->id,
                'title' => $package->title,
                'total_questions' => $package->total_questions,
                'actor' => $package->creator?->name,
                'generated_at' => $package->generated_at?->toIso8601String(),
            ]);

        $recentUsers = User::query()
            ->latest()
            ->limit(5)
            ->get(['id', 'name', 'email', 'is_active', 'created_at'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        $recentChaptersQuery = Chapter::query()
            ->withCount('questions')
            ->latest()
            ->limit(5)
            ->select(['id', 'name', 'parent_id', 'created_at']);

        if ($scopeToCurrentUser) {
            $recentChaptersQuery->where('created_by', $userId);
        }

        $recentChapters = $recentChaptersQuery->get()
            ->map(fn (Chapter $chapter): array => [
                'id' => $chapter->id,
                'name' => $chapter->name,
                'scope' => $chapter->parent_id ? 'Sub Bab' : 'Bab Utama',
                'questions_count' => $chapter->questions_count,
                'created_at' => $chapter->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'summary' => [
                'chapters' => Chapter::query()
                    ->when($scopeToCurrentUser, fn ($query) => $query->where('created_by', $userId))
                    ->whereNull('parent_id')
                    ->count(),
                'sub_chapters' => Chapter::query()
                    ->when($scopeToCurrentUser, fn ($query) => $query->where('created_by', $userId))
                    ->whereNotNull('parent_id')
                    ->count(),
                'multiple_choice_questions' => Question::query()
                    ->when($scopeToCurrentUser, fn ($query) => $query->where('created_by', $userId))
                    ->where('type', 'multiple_choice')
                    ->count(),
                'essay_questions' => Question::query()
                    ->when($scopeToCurrentUser, fn ($query) => $query->where('created_by', $userId))
                    ->where('type', 'essay')
                    ->count(),
                'question_packages' => QuestionPackage::query()
                    ->when($scopeToCurrentUser, fn ($query) => $query->where('generated_by', $userId))
                    ->count(),
                'users' => User::query()->count(),
            ],
            'recent' => [
                'questions' => $recentQuestions,
                'packages' => $recentPackages,
                'users' => $recentUsers,
                'chapters' => $recentChapters,
            ],
        ]);
    }
}