<?php

namespace App\Exports;

use App\Models\QuestionPackage;
use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;

class QuestionPackageExport implements FromView
{
    public function __construct(private readonly QuestionPackage $questionPackage)
    {
    }

    public function view(): View
    {
        return view('exports.question-package-excel', [
            'package' => $this->questionPackage,
        ]);
    }
}
