<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Konfirmasi Reset Password App Soal</title>
</head>
<body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
    <h2 style="margin-bottom: 0.5rem;">Konfirmasi Reset Password</h2>

    <p>Halo {{ $targetUserName }},</p>
    <p>Kami menerima permintaan reset password untuk akun Anda di App Soal.</p>
    <p>Password tidak akan diubah sampai Anda mengonfirmasi permintaan ini.</p>

    <p style="margin: 1rem 0;">
        <a href="{{ $confirmationUrl }}" style="display: inline-block; padding: 10px 14px; background: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Konfirmasi Reset Password
        </a>
    </p>

    <p>Link ini berlaku selama {{ $expiresInMinutes }} menit.</p>
    <p>Jika Anda tidak merasa melakukan permintaan reset, abaikan email ini dan tidak ada perubahan pada akun Anda.</p>

    <p style="margin-top: 1rem;">Email ini dikirim otomatis oleh sistem App Soal.</p>
</body>
</html>
