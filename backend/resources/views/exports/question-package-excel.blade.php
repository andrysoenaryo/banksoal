<table>
    <thead>
        <tr>
            <th colspan="9">{{ $package->title }}</th>
        </tr>
        <tr>
            <th>Total Soal</th>
            <th>{{ $package->total_questions }}</th>
            <th>Generator</th>
            <th>{{ $package->creator?->name ?: '-' }}</th>
            <th>Tanggal</th>
            <th>{{ optional($package->generated_at)->format('d-m-Y H:i') }}</th>
            <th>Deskripsi</th>
            <th>{{ $package->description ?: '-' }}</th>
        </tr>
        <tr>
            <th>No</th>
            <th>Bab/Sub Bab</th>
            <th>Tipe</th>
            <th>Pertanyaan</th>
            <th>URL Gambar</th>
            <th>Opsi</th>
            <th>Kunci Jawaban</th>
            <th>Pembahasan</th>
            <th>Poin</th>
        </tr>
    </thead>
    <tbody>
        @foreach($package->items as $index => $item)
            @php $question = $item->question; @endphp
            @if($question)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $question->chapter?->name ?: '-' }}</td>
                    <td>{{ $question->type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay' }}</td>
                    <td>{{ $question->question_text }}</td>
                    <td>{{ $question->question_image_url ?: '-' }}</td>
                    <td>
                        @if($question->type === 'multiple_choice' && $question->options->isNotEmpty())
                            @foreach($question->options as $option)
                                {{ $option->option_key }}. {{ $option->option_text }}@if($option->is_correct) (Benar)@endif
                                @if(!$loop->last)
                                    ;
                                @endif
                            @endforeach
                        @else
                            -
                        @endif
                    </td>
                    <td>{{ $question->answer_key }}</td>
                    <td>{{ $question->explanation ?: '-' }}</td>
                    <td>{{ $question->points }}</td>
                </tr>
            @endif
        @endforeach
    </tbody>
</table>
