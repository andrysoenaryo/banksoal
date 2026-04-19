<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Reset Password App Soal</title>
</head>
<body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
    <h2 style="margin-bottom: 0.5rem;">Reset Password Akun App Soal</h2>

    @if ($audienceLabel === 'user')
        <p>Password akun Anda telah di-reset oleh administrator.</p>
    @else
        <p>Password user telah di-reset oleh super-admin.</p>
    @endif

    <p style="margin: 0.25rem 0;"><strong>Nama User:</strong> {{ $targetUserName }}</p>
    <p style="margin: 0.25rem 0;"><strong>Email User:</strong> {{ $targetUserEmail }}</p>
    <p style="margin: 0.25rem 0;"><strong>Password Baru:</strong> {{ $temporaryPassword }}</p>
    <p style="margin: 0.25rem 0;"><strong>Di-reset oleh:</strong> {{ $resetByName }}</p>

    @if ($audienceLabel === 'user')
        <p style="margin-top: 1rem;">Silakan login menggunakan password baru tersebut, lalu segera ganti password Anda dari menu akun.</p>
    @endif

    <p style="margin-top: 1rem;">Email ini dikirim otomatis oleh sistem App Soal.</p>
</body>
</html>
