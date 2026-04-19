<?php

namespace App\Http\Controllers;

use App\Mail\UserPasswordResetMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'users.view');

        $perPage = max(5, min(100, $request->integer('per_page', 10)));
        $sortBy = in_array($request->string('sort_by')->value(), ['name', 'email', 'created_at'], true)
            ? $request->string('sort_by')->value()
            : 'name';
        $sortDir = $request->string('sort_direction')->lower()->value() === 'desc' ? 'desc' : 'asc';

        $users = User::query()
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->value();
                $query->where(function ($inner) use ($search): void {
                    $inner->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%');
                });
            })
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('role'), function ($query) use ($request) {
                $query->role($request->string('role')->value());
            })
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage)
            ->withQueryString();

        return $this->paginatedResponse($users->through(fn (User $user): array => $this->transformUser($user)), [
            'available_roles' => Role::query()->orderBy('name')->pluck('name')->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'users.create');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'is_active' => $data['is_active'] ?? true,
        ]);

        $user->syncRoles([$data['role']]);

        return response()->json($this->transformUser($user->fresh()), 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorizePermission($request, 'users.view');

        return response()->json($this->transformUser($user));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorizePermission($request, 'users.update');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
            'is_active' => $data['is_active'] ?? $user->is_active,
        ];

        if (! empty($data['password'])) {
            $payload['password'] = Hash::make($data['password']);
        }

        $user->update($payload);
        $user->syncRoles([$data['role']]);

        return response()->json($this->transformUser($user->fresh()));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizePermission($request, 'users.delete');

        if ($request->user()->is($user)) {
            return response()->json([
                'message' => 'User yang sedang login tidak bisa menghapus akunnya sendiri.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'User berhasil dihapus.',
        ]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();

        if (! $actor) {
            abort(401, 'Unauthenticated.');
        }

        abort_unless($actor->hasRole('super-admin'), 403, 'Akses ditolak. Hanya super-admin yang dapat reset password user.');

        if (! filled($user->email)) {
            return response()->json([
                'message' => 'Email user kosong, reset password tidak dapat dikirim.',
            ], 422);
        }

        $temporaryPassword = Str::password(12, true, true, false, false);

        $user->forceFill([
            'password' => Hash::make($temporaryPassword),
        ])->save();

        // Invalidate all previous tokens so user must login with the new password.
        $user->tokens()->delete();

        $adminEmails = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($query) => $query->whereIn('name', ['super-admin', 'admin-bank-soal']))
            ->pluck('email')
            ->filter(fn ($email) => filled($email))
            ->unique()
            ->values()
            ->all();

        Mail::to($user->email)->send(new UserPasswordResetMail(
            targetUserName: $user->name,
            targetUserEmail: $user->email,
            temporaryPassword: $temporaryPassword,
            resetByName: $actor->name,
            audienceLabel: 'user'
        ));

        if (! empty($adminEmails)) {
            Mail::to($adminEmails)->send(new UserPasswordResetMail(
                targetUserName: $user->name,
                targetUserEmail: $user->email,
                temporaryPassword: $temporaryPassword,
                resetByName: $actor->name,
                audienceLabel: 'admin'
            ));
        }

        return response()->json([
            'message' => 'Password user langsung di-reset saat ini dan notifikasi email telah dikirim.',
        ]);
    }

    private function transformUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => $user->is_active,
            'roles' => $user->getRoleNames()->values()->all(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
        ];
    }
}