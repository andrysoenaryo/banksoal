<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class Controller
{
    protected function authorizePermission(Request $request, string $permission): void
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if ($user->hasRole('super-admin')) {
            return;
        }

        $hasPermission = $user->can($permission)
            || $user->getAllPermissions()->contains('name', $permission);

        abort_unless($hasPermission, 403, 'Akses ditolak.');
    }

    protected function paginatedResponse(LengthAwarePaginator $paginator, array $extra = []): JsonResponse
    {
        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            ...$extra,
        ]);
    }

    protected function isSuperAdmin(Request $request): bool
    {
        return (bool) $request->user()?->hasRole('super-admin');
    }

    protected function shouldScopeToCurrentUser(Request $request): bool
    {
        return ! $this->isSuperAdmin($request);
    }
}
