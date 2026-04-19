<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserPasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $targetUserName,
        public string $targetUserEmail,
        public string $temporaryPassword,
        public string $resetByName,
        public string $audienceLabel = 'user'
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset Password Akun App Soal: '.$this->targetUserName,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.user-password-reset',
        );
    }
}
