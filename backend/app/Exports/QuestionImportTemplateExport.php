<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class QuestionImportTemplateExport implements FromArray, WithHeadings
{
    public function headings(): array
    {
        return [
            'chapter_id',
            'chapter_name',
            'type',
            'question_text',
            'answer_key',
            'explanation',
            'difficulty_level',
            'points',
            'option_a',
            'option_b',
            'option_c',
            'option_d',
            'option_e',
            'correct_option_key',
        ];
    }

    public function array(): array
    {
        return [
            [
                '',
                'Nama Bab Anda',
                'multiple_choice',
                'Ibu kota Indonesia?',
                'A',
                '',
                'mudah',
                1,
                'Jakarta',
                'Bandung',
                'Surabaya',
                'Medan',
                '',
                'A',
            ],
            [
                '',
                'Nama Bab Anda',
                'essay',
                'Jelaskan fotosintesis',
                'Rubrik jawaban singkat',
                'Menjelaskan proses fotosintesis',
                'sedang',
                2,
                '',
                '',
                '',
                '',
                '',
                '',
            ],
            [
                3,
                '',
                'multiple_choice',
                'Contoh pakai chapter_id',
                'B',
                'Boleh pakai chapter_id tanpa chapter_name',
                'sedang',
                1,
                'Opsi A',
                'Opsi B',
                'Opsi C',
                '',
                '',
                'B',
            ],
        ];
    }
}