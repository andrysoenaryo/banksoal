<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $package->title }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1e293b; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        h2 { font-size: 13px; margin-top: 16px; margin-bottom: 7px; }
        .meta p { margin: 0 0 4px; }
        .question { border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px; margin-bottom: 9px; }
        .question-title { font-weight: 700; margin-bottom: 6px; }
        ul { margin: 5px 0 5px 16px; }
    </style>
</head>
<body>
    <h1>{{ $package->title }}</h1>
    <div class="meta">
        @if(!empty($package->description))
            <p><strong>Deskripsi:</strong> {{ $package->description }}</p>
        @endif
    </div>

    <h2>Daftar Soal</h2>
    @foreach($package->items as $index => $item)
        @php $question = $item->question; @endphp
        @if($question)
            <div class="question">
                <div class="question-title">{{ $index + 1 }}. {{ $question->question_text }}</div>

                @if(!empty($question->question_image_path))
                    @php
                        $imageAbsolutePath = storage_path('app/public/'.$question->question_image_path);
                    @endphp
                    @if(file_exists($imageAbsolutePath))
                        <p><strong>Gambar Soal:</strong></p>
                        <p>
                            <img
                                src="data:image/{{ pathinfo($imageAbsolutePath, PATHINFO_EXTENSION) }};base64,{{ base64_encode(file_get_contents($imageAbsolutePath)) }}"
                                alt="Gambar soal"
                                style="max-width: 260px; max-height: 160px; border: 1px solid #cbd5e1; border-radius: 4px;"
                            >
                        </p>
                    @endif
                @endif

                @if($question->type === 'multiple_choice' && $question->options->isNotEmpty())
                    <ul>
                        @foreach($question->options as $option)
                            <li>{{ $option->option_key }}. {{ $option->option_text }}</li>
                        @endforeach
                    </ul>
                @endif

                @if(!empty($includeAnswerKey) && !empty($question->answer_key))
                    <p><strong>Kunci Jawaban:</strong> {{ $question->answer_key }}</p>
                @endif
            </div>
        @endif
    @endforeach
</body>
</html>