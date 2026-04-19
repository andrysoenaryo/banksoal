import { useState } from 'react';
import AppDataTable from '../../components/AppDataTable';
import SearchableSelect from '../../components/SearchableSelect';
import { DIFFICULTY_LEVELS, QUESTION_TYPES } from '../../config/constants';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { createQuestionForm, normalizeMultipleChoiceOptions } from '../../utils/factories';
import { resolveMediaUrl } from '../../utils/helpers';

export default function QuestionList({
    filters,
    setFilters,
    setPage,
    flatChapters,
    questions,
    setForm,
    removeQuestion,
    bulkRemoveQuestions,
    canEdit,
    canDelete,
    meta,
    setPerPage,
    sort,
    setSort,
    loading,
}) {
    const [selectedRows, setSelectedRows] = useState([]);
    const [toggleClear, setToggleClear] = useState(false);

    function handleSort(column, direction) {
        setSort({ sortBy: column.sortField ?? '', sortDir: direction });
        setPage(1);
    }

    async function handleBulkDelete() {
        if (!selectedRows.length) return;

        const shouldDelete = window.confirm(`Yakin ingin menghapus ${selectedRows.length} soal terpilih?`);
        if (!shouldDelete) return;

        await bulkRemoveQuestions(selectedRows.map((row) => row.id));
        setSelectedRows([]);
        setToggleClear((prev) => !prev);
    }

    async function handleDeleteOne(questionId) {
        const shouldDelete = window.confirm('Yakin ingin menghapus soal ini?');
        if (!shouldDelete) return;

        await removeQuestion(questionId);
    }

    const columns = [
        {
            name: 'Pertanyaan',
            grow: 2.5,
            cell: (question) => (
                <div>
                    {resolveMediaUrl(question.question_image_url) ? <img src={resolveMediaUrl(question.question_image_url)} alt="Gambar soal" className="question-image-thumb" /> : null}
                    <strong>{question.question_text}</strong>
                    <p className="table-note">Kunci: {question.answer_key}</p>
                    {question.options?.length ? (
                        <ul className="option-preview compact-preview">
                            {question.options.map((option) => (
                                <li key={option.id}>{option.option_key}. {option.option_text}{option.is_correct ? ' (benar)' : ''}</li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ),
        },
        {
            name: 'Bab',
            selector: (question) => question.chapter?.name ?? '-',
            grow: 1.2,
        },
        {
            name: 'Tipe',
            cell: (question) => <span className="badge">{question.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'}</span>,
            width: '150px',
        },
        {
            name: 'Kesulitan',
            selector: (question) => question.difficulty_level,
            sortable: true,
            sortField: 'difficulty_level',
            width: '130px',
        },
        {
            name: 'Poin',
            selector: (question) => question.points,
            sortable: true,
            sortField: 'points',
            width: '90px',
        },
        {
            name: 'Aksi',
            width: '220px',
            cell: (question) => (
                <div className="button-row compact table-actions">
                    <button type="button" className="ghost-button" disabled={!canEdit} onClick={() => {
                        const baseForm = createQuestionForm();

                        setForm({
                            ...baseForm,
                        id: question.id,
                        chapter_id: String(question.chapter_id),
                        type: question.type,
                        question_text: question.question_text,
                        question_image: null,
                        question_image_url: question.question_image_url ?? null,
                        question_image_meta: null,
                        remove_question_image: false,
                        answer_key: question.answer_key,
                        explanation: question.explanation ?? '',
                        difficulty_level: question.difficulty_level,
                        points: question.points,
                        options: normalizeMultipleChoiceOptions(question.options),
                        });
                    }}><FiEdit2 /><span>Edit</span></button>
                            <button type="button" className="danger-button" disabled={!canDelete} onClick={() => handleDeleteOne(question.id)}><FiTrash2 /><span>Hapus</span></button>
                </div>
            ),
        },
    ];

    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Bank Soal</p>
                    <h2>Filter detail + pagination</h2>
                </div>
            </div>

            <div className="form-grid filter-bar">
                <label className="filter-field filter-field-search">
                    <span>Cari</span>
                    <input value={filters.search} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })); }} placeholder="Pertanyaan, kunci, pembahasan" />
                </label>
                <label className="filter-field">
                    <span>Bab</span>
                    <SearchableSelect
                        value={filters.chapter_id}
                        onChange={(value) => { setPage(1); setFilters((current) => ({ ...current, chapter_id: value })); }}
                        options={[{ value: '', label: 'Semua' }, ...flatChapters.map((chapter) => ({ value: String(chapter.id), label: chapter.name }))]}
                        placeholder="Semua"
                        searchPlaceholder="Cari bab..."
                    />
                </label>
                <label className="filter-field">
                    <span>Tipe</span>
                    <SearchableSelect
                        value={filters.type}
                        onChange={(value) => { setPage(1); setFilters((current) => ({ ...current, type: value })); }}
                        options={[{ value: '', label: 'Semua' }, ...QUESTION_TYPES.map((item) => ({ value: item.value, label: item.label }))]}
                        placeholder="Semua"
                    />
                </label>
                <label className="filter-field">
                    <span>Kesulitan</span>
                    <SearchableSelect
                        value={filters.difficulty_level}
                        onChange={(value) => { setPage(1); setFilters((current) => ({ ...current, difficulty_level: value })); }}
                        options={[{ value: '', label: 'Semua' }, ...DIFFICULTY_LEVELS.map((item) => ({ value: item.value, label: item.label }))]}
                        placeholder="Semua"
                    />
                </label>
            </div>

            {selectedRows.length > 0 && (
                <div className="bulk-action-bar">
                    <span>{selectedRows.length} soal dipilih</span>
                    <button type="button" className="danger-button" onClick={handleBulkDelete} disabled={!canDelete}>
                        <FiTrash2 /><span>Hapus ({selectedRows.length})</span>
                    </button>
                </div>
            )}
            <AppDataTable
                columns={columns}
                data={questions}
                meta={meta}
                onPageChange={setPage}
                onPerPageChange={(nextPerPage) => {
                    setPerPage(nextPerPage);
                    setPage(1);
                }}
                noDataText="Belum ada data soal."
                sortServer
                onSort={handleSort}
                selectableRows
                onSelectedRowsChange={({ selectedRows: rows }) => setSelectedRows(rows)}
                clearSelectedRows={toggleClear}
                progressPending={loading}
            />
        </article>
    );
}
