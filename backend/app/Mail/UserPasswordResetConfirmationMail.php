<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserPasswordResetConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $targetUserName,
        public string $confirmationUrl,
        public int $expiresInMinutes = 30
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Konfirmasi Reset Password App Soal',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.user-password-reset-confirmation',
        );
    }
}
