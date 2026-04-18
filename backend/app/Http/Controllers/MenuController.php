<?php

namespace App\Http\Controllers;

use App\Models\Menu;
use Illuminate\Support\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;

class MenuController extends Controller
{
    public function tree(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $menus = Menu::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $this->buildTree($menus),
        ]);
    }

    public function navigation(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $isSuperAdmin = $this->isSuperAdmin($request);
        $permissions = $user->getAllPermissions()->pluck('name');

        $menus = Menu::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        if (! $isSuperAdmin) {
            $visibleIds = $menus
                ->filter(function (Menu $menu) use ($permissions): bool {
                    if (! $menu->permission) {
                        return true;
                    }

                    return $permissions->contains($menu->permission);
                })
                ->pluck('id')
                ->all();

            $menusById = $menus->keyBy('id');
            $queue = $visibleIds;

            while (! empty($queue)) {
                $currentId = array_pop($queue);
                $current = $menusById->get($currentId);

                if (! $current || ! $current->parent_id) {
                    continue;
                }

                if (! in_array($current->parent_id, $visibleIds, true)) {
                    $visibleIds[] = $current->parent_id;
                    $queue[] = $current->parent_id;
                }
            }

            $menus = $menus->whereIn('id', $visibleIds)->values();
        }

        $tree = $this->buildTree($menus);

        return response()->json([
            'data' => $tree,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $perPage = max(5, min(100, $request->integer('per_page', 10)));
        $sortBy = in_array($request->string('sort_by')->value(), ['key', 'label', 'sort_order', 'created_at'], true)
            ? $request->string('sort_by')->value()
            : 'sort_order';
        $sortDir = $request->string('sort_direction')->lower()->value() === 'desc' ? 'desc' : 'asc';

        $menus = Menu::query()
            ->with('parent:id,key,label')
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = $request->string('search')->value();
                $query->where(function ($inner) use ($search): void {
                    $inner->where('key', 'like', '%'.$search.'%')
                        ->orWhere('label', 'like', '%'.$search.'%')
                        ->orWhere('permission', 'like', '%'.$search.'%');
                });
            })
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderBy($sortBy, $sortDir)
            ->orderBy('id')
            ->paginate($perPage)
            ->withQueryString();

        return $this->paginatedResponse($menus, [
            'available_permissions' => Permission::query()->where('guard_name', 'web')->orderBy('name')->pluck('name')->values(),
            'available_parent_menus' => Menu::query()->orderBy('label')->get(['id', 'key', 'label']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $data = $this->validatePayload($request);

        $menu = Menu::query()->create($data);

        return response()->json($menu, 201);
    }

    public function update(Request $request, Menu $menu): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $data = $this->validatePayload($request, $menu);

        if ($menu->key === 'dashboard' && ($data['key'] ?? 'dashboard') !== 'dashboard') {
            return response()->json([
                'message' => 'Key menu dashboard tidak boleh diubah.',
            ], 422);
        }

        $menu->update($data);

        return response()->json($menu->fresh());
    }

    public function destroy(Request $request, Menu $menu): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        if ($menu->key === 'dashboard') {
            return response()->json([
                'message' => 'Menu dashboard tidak boleh dihapus.',
            ], 422);
        }

        if ($menu->children()->exists()) {
            return response()->json([
                'message' => 'Menu memiliki child menu. Hapus atau pindahkan child menu terlebih dahulu.',
            ], 422);
        }

        $menu->delete();

        return response()->json([
            'message' => 'Menu berhasil dihapus.',
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $payload = $request->validate([
            'tree' => ['required', 'array', 'min:1'],
        ]);

        $tree = $payload['tree'];
        $menuIds = Menu::query()->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $incomingIds = $this->flattenTreeIds($tree);

        if (count($incomingIds) !== count(array_unique($incomingIds))) {
            return response()->json([
                'message' => 'Payload reorder tidak valid: terdapat menu duplikat.',
            ], 422);
        }

        sort($menuIds);
        sort($incomingIds);

        if ($incomingIds !== $menuIds) {
            return response()->json([
                'message' => 'Payload reorder tidak valid: beberapa menu belum tercakup.',
            ], 422);
        }

        DB::transaction(function () use ($tree): void {
            $this->applyTreeOrder($tree, null);
        });

        return response()->json([
            'message' => 'Urutan menu berhasil diperbarui.',
        ]);
    }

    private function validatePayload(Request $request, ?Menu $menu = null): array
    {
        $data = $request->validate([
            'key' => [
                'required',
                'string',
                'max:100',
                Rule::unique('menus', 'key')->ignore($menu?->id),
            ],
            'parent_id' => ['nullable', 'integer', Rule::exists('menus', 'id')],
            'label' => ['required', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:50'],
            'permission' => ['nullable', 'string', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($menu && (int) ($data['parent_id'] ?? 0) === (int) $menu->id) {
            abort(422, 'Menu tidak boleh menjadi parent untuk dirinya sendiri.');
        }

        if ($menu && ! empty($data['parent_id'])) {
            $descendantIds = $this->descendantIds((int) $menu->id);
            if (in_array((int) $data['parent_id'], $descendantIds, true)) {
                abort(422, 'Parent menu tidak valid karena menyebabkan siklus hierarchy.');
            }
        }

        return [
            ...$data,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ];
    }

    private function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($this->isSuperAdmin($request), 403, 'Akses hanya untuk super-admin.');
    }

    private function flattenTreeIds(array $nodes): array
    {
        $ids = [];

        foreach ($nodes as $node) {
            if (! is_array($node) || ! isset($node['id'])) {
                continue;
            }

            $ids[] = (int) $node['id'];

            if (isset($node['children']) && is_array($node['children'])) {
                $ids = [...$ids, ...$this->flattenTreeIds($node['children'])];
            }
        }

        return $ids;
    }

    private function applyTreeOrder(array $nodes, ?int $parentId): void
    {
        foreach (array_values($nodes) as $index => $node) {
            if (! is_array($node) || ! isset($node['id'])) {
                continue;
            }

            Menu::query()->where('id', (int) $node['id'])->update([
                'parent_id' => $parentId,
                'sort_order' => ($index + 1) * 10,
            ]);

            $children = isset($node['children']) && is_array($node['children']) ? $node['children'] : [];

            $this->applyTreeOrder($children, (int) $node['id']);
        }
    }

    private function buildTree(Collection $menus, ?int $parentId = null): array
    {
        return $menus
            ->where('parent_id', $parentId)
            ->sortBy(fn (Menu $menu) => sprintf('%010d-%010d', (int) $menu->sort_order, (int) $menu->id))
            ->values()
            ->map(function (Menu $menu) use ($menus): array {
                return [
                    'id' => $menu->id,
                    'key' => $menu->key,
                    'parent_id' => $menu->parent_id,
                    'label' => $menu->label,
                    'icon' => $menu->icon,
                    'permission' => $menu->permission,
                    'sort_order' => $menu->sort_order,
                    'is_active' => $menu->is_active,
                    'children' => $this->buildTree($menus, (int) $menu->id),
                ];
            })
            ->all();
    }

    private function descendantIds(int $menuId): array
    {
        $menus = Menu::query()->get(['id', 'parent_id']);
        $childrenByParent = $menus->groupBy('parent_id');

        $resolved = [];
        $stack = [$menuId];

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
