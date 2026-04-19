<?php

namespace App\Http\Controllers;

use App\Mail\UserPasswordResetConfirmationMail;
use App\Mail\UserPasswordResetMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'Email atau password tidak valid.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => 'Akun tidak aktif.',
            ]);
        }

        $token = $user->createToken('react-spa')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil.',
            'token' => $token,
            'user' => $this->transformUser($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->transformUser($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'different:current_password', 'confirmed'],
        ], [
            'new_password.confirmed' => 'Konfirmasi password baru tidak cocok.',
            'new_password.different' => 'Password baru harus berbeda dari password lama.',
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'Password saat ini tidak sesuai.',
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($data['new_password']),
        ])->save();

        return response()->json([
            'message' => 'Password berhasil diperbarui.',
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => 'Email tidak terdaftar di sistem.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => 'Akun dengan email ini tidak aktif. Hubungi administrator.',
            ]);
        }

        $confirmationToken = Str::random(64);
        $expiresInMinutes = 30;
        Cache::put('password_reset_confirm:'.$confirmationToken, [
            'user_id' => $user->id,
        ], now()->addMinutes($expiresInMinutes));

        $confirmationUrl = url('/api/auth/forgot-password/confirm?token='.$confirmationToken);

        Mail::to($user->email)->send(new UserPasswordResetConfirmationMail(
            targetUserName: $user->name,
            confirmationUrl: $confirmationUrl,
            expiresInMinutes: $expiresInMinutes,
        ));

        return response()->json([
            'message' => 'Email konfirmasi reset password telah dikirim ke '.$user->email.'. Klik link pada email untuk melanjutkan reset password.',
        ]);
    }

    public function confirmForgotPassword(Request $request): RedirectResponse
    {
        $token = $request->query('token');

        if (! is_string($token) || trim($token) === '') {
            return $this->redirectToFrontendLogin('error', 'Link konfirmasi tidak valid atau sudah kedaluwarsa.');
        }

        $cacheKey = 'password_reset_confirm:'.$token;
        $payload = Cache::get($cacheKey);

        if (! is_array($payload) || empty($payload['user_id'])) {
            return $this->redirectToFrontendLogin('error', 'Link konfirmasi tidak valid atau sudah kedaluwarsa.');
        }

        $user = User::query()->find($payload['user_id']);

        if (! $user || ! $user->is_active) {
            Cache::forget($cacheKey);

            return $this->redirectToFrontendLogin('error', 'Akun tidak ditemukan atau tidak aktif.');
        }

        Cache::forget($cacheKey);

        $temporaryPassword = Str::password(12);

        $user->forceFill([
            'password' => Hash::make($temporaryPassword),
        ])->save();

        $user->tokens()->delete();

        Mail::to($user->email)->send(new UserPasswordResetMail(
            targetUserName: $user->name,
            targetUserEmail: $user->email,
            temporaryPassword: $temporaryPassword,
            resetByName: 'Sistem (Konfirmasi Email)',
            audienceLabel: 'user'
        ));

        return $this->redirectToFrontendLogin('success', 'Konfirmasi reset password berhasil, silakan cek email anda.');
    }

    private function redirectToFrontendLogin(string $statusType, string $message): RedirectResponse
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $query = http_build_query([
            'reset_password' => $statusType,
            'reset_message' => $message,
        ]);

        return redirect()->away($frontendUrl.'/?'.$query);
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