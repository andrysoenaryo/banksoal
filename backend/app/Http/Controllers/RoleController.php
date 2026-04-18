<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    private const CORE_PERMISSIONS = [
        'dashboard.view',
        'subjects.view',
        'subjects.create',
        'subjects.update',
        'subjects.delete',
        'chapters.view',
        'chapters.create',
        'chapters.update',
        'chapters.delete',
        'questions.view',
        'questions.create',
        'questions.import',
        'questions.update',
        'questions.delete',
        'packages.view',
        'packages.generate',
        'packages.update',
        'packages.export',
        'packages.delete',
        'users.view',
        'users.create',
        'users.update',
        'users.delete',
        'roles.view',
        'roles.create',
        'roles.update',
        'roles.delete',
        'menus.manage',
    ];

    private const PROTECTED_ROLE_NAMES = [
        'super-admin',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'roles.view');
        $this->ensureCorePermissions();

        $perPage = max(5, min(100, $request->integer('per_page', 10)));
        $sortBy = in_array($request->string('sort_by')->value(), ['name', 'created_at', 'users_count'], true)
            ? $request->string('sort_by')->value()
            : 'name';
        $sortDir = $request->string('sort_direction')->lower()->value() === 'desc' ? 'desc' : 'asc';

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->with('permissions:id,name,guard_name')
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->value();
                $query->where('name', 'like', '%'.$search.'%');
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->withQueryString();

        $userCountMap = $this->getRoleUserCountMap(array_map(
            fn ($role): int => (int) $role->id,
            $roles->items()
        ));

        return $this->paginatedResponse($roles->through(fn (Role $role): array => $this->transformRole(
            $role,
            (int) ($userCountMap[$role->id] ?? 0)
        )), [
            'available_permissions' => Permission::query()
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->pluck('name')
                ->values(),
            'protected_roles' => self::PROTECTED_ROLE_NAMES,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'roles.create');
        $this->ensureCorePermissions();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->where('guard_name', 'web')],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);

        $role = Role::query()->create([
            'name' => $data['name'],
            'guard_name' => 'web',
        ]);

        $role->syncPermissions($data['permissions'] ?? []);

        return response()->json($this->transformRole($role->load('permissions'), 0), 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $this->authorizePermission($request, 'roles.update');
        $this->ensureCorePermissions();

        if ($role->guard_name !== 'web') {
            return response()->json([
                'message' => 'Role tidak valid untuk guard web.',
            ], 422);
        }

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')->where('guard_name', 'web')->ignore($role->id),
            ],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);

        if (
            in_array($role->name, self::PROTECTED_ROLE_NAMES, true)
            && $data['name'] !== $role->name
        ) {
            return response()->json([
                'message' => 'Nama role bawaan tidak boleh diubah.',
            ], 422);
        }

        $role->update([
            'name' => $data['name'],
        ]);

        $role->syncPermissions($data['permissions'] ?? []);

        return response()->json($this->transformRole(
            $role->fresh()->load('permissions'),
            $this->getRoleUserCount((int) $role->id)
        ));
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        $this->authorizePermission($request, 'roles.delete');

        if ($role->guard_name !== 'web') {
            return response()->json([
                'message' => 'Role tidak valid untuk guard web.',
            ], 422);
        }

        if ($role->name === 'super-admin') {
            return response()->json([
                'message' => 'Role super-admin tidak boleh dihapus.',
            ], 422);
        }

        if ($this->getRoleUserCount((int) $role->id) > 0) {
            return response()->json([
                'message' => 'Role masih dipakai user. Pindahkan user ke role lain terlebih dahulu.',
            ], 422);
        }

        $role->delete();

        return response()->json([
            'message' => 'Role berhasil dihapus.',
        ]);
    }

    private function transformRole(Role $role, int $usersCount = 0): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'users_count' => $usersCount,
            'created_at' => $role->created_at,
            'permissions' => $role->permissions->pluck('name')->values()->all(),
            'is_protected' => in_array($role->name, self::PROTECTED_ROLE_NAMES, true),
        ];
    }

    private function getRoleUserCount(int $roleId): int
    {
        $pivotTable = (string) config('permission.table_names.model_has_roles', 'model_has_roles');

        return (int) DB::table($pivotTable)
            ->where('role_id', $roleId)
            ->count();
    }

    private function getRoleUserCountMap(array $roleIds): array
    {
        if (count($roleIds) === 0) {
            return [];
        }

        $pivotTable = (string) config('permission.table_names.model_has_roles', 'model_has_roles');

        return DB::table($pivotTable)
            ->select('role_id', DB::raw('COUNT(*) as total'))
            ->whereIn('role_id', $roleIds)
            ->groupBy('role_id')
            ->pluck('total', 'role_id')
            ->map(fn ($total): int => (int) $total)
            ->all();
    }

    private function ensureCorePermissions(): void
    {
        foreach (self::CORE_PERMISSIONS as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }
    }
}