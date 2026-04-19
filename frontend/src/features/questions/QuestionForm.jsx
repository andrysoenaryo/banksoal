import { DIFFICULTY_LEVELS, QUESTION_IMAGE_UPLOAD, QUESTION_TYPES } from '../../config/constants';
import SearchableSelect from '../../components/SearchableSelect';
import { resolveMediaUrl } from '../../utils/helpers';

export default function QuestionForm({
    form,
    setForm,
    setQuestionImage,
    clearQuestionImage,
    processingImage,
    flatChapters,
    importFile,
    handleImportFileSelect,
    importing,
    previewingDocx,
    docxPreview,
    previewDocxImport,
    importQuestions,
    downloadTemplate,
    downloadTemplateDocx,
    setCorrectOption,
    resetQuestionForm,
    onSubmit,
    canCreate,
    canEdit,
    canImport,
}) {
    const previewImageUrl = resolveMediaUrl(form.question_image_url);

    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Form Soal</p>
                    <h2>Input / import soal</h2>
                </div>
            </div>

            {canImport ? (
                <div className="form-grid full-span">
                    <label className="full-span">
                        <span>Import Excel / Word DOCX</span>
                        <input type="file" accept=".xlsx,.xls,.docx" onChange={(event) => handleImportFileSelect(event.target.files?.[0] ?? null)} />
                        {importFile ? <small className="muted">File: {importFile.name}</small> : null}
                    </label>
                    <div className="button-row full-span">
                        <button type="button" className="ghost-button" onClick={downloadTemplate}>Unduh Template Excel</button>
                        <button type="button" className="ghost-button" onClick={downloadTemplateDocx}>Unduh Template DOCX</button>
                        <button
                            type="button"
                            className="ghost-button"
                            onClick={previewDocxImport}
                            disabled={previewingDocx || !importFile || !importFile.name.toLowerCase().endsWith('.docx')}
                        >
                            {previewingDocx ? 'Previewing...' : 'Preview DOCX'}
                        </button>
                        <button type="button" className="primary-button" onClick={importQuestions} disabled={importing}>{importing ? 'Mengimpor...' : 'Import Soal'}</button>
                    </div>

                    {docxPreview ? (
                        <div className="full-span status-banner subtle">
                            <strong>Preview DOCX</strong>
                            <p className="muted">
                                Total blok: {docxPreview.total_blocks} | Valid: {docxPreview.valid_blocks} | Invalid: {docxPreview.invalid_blocks}
                            </p>
                            {Array.isArray(docxPreview.blocks) && docxPreview.blocks.some((block) => block.status === 'invalid') ? (
                                <div className="muted">
                                    {docxPreview.blocks
                                        .filter((block) => block.status === 'invalid')
                                        .slice(0, 5)
                                        .map((block) => (
                                            <p key={block.row}>Baris {block.row}: {block.error}</p>
                                        ))}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {canCreate || canEdit ? (
                <form className="form-grid" onSubmit={onSubmit}>
                <label>
                    <span>Bab/Sub Bab</span>
                    <SearchableSelect
                        value={form.chapter_id}
                        onChange={(value) => setForm((current) => ({ ...current, chapter_id: value }))}
                        options={flatChapters.map((chapter) => ({ value: String(chapter.id), label: chapter.name }))}
                        placeholder="Pilih bab"
                        searchPlaceholder="Cari bab/sub bab..."
                        required
                    />
                </label>
                <label>
                    <span>Tipe Soal</span>
                    <SearchableSelect
                        value={form.type}
                        onChange={(value) => setForm((current) => ({ ...current, type: value }))}
                        options={QUESTION_TYPES.map((item) => ({ value: item.value, label: item.label }))}
                    />
                </label>
                <label>
                    <span>Tingkat Kesulitan</span>
                    <SearchableSelect
                        value={form.difficulty_level}
                        onChange={(value) => setForm((current) => ({ ...current, difficulty_level: value }))}
                        options={DIFFICULTY_LEVELS.map((item) => ({ value: item.value, label: item.label }))}
                    />
                </label>
                <label>
                    <span>Poin</span>
                    <input type="number" min="1" value={form.points} onChange={(event) => setForm((current) => ({ ...current, points: event.target.value }))} />
                </label>
                <div className="full-span">
                    <span>Gambar Soal (Opsional, maksimal {QUESTION_IMAGE_UPLOAD.maxMb}MB)</span>
                    <small className="muted">Crop/resize otomatis</small>
                    <input
                        type="file"
                        accept="image/*"
                        disabled={processingImage}
                        onChange={(event) => setQuestionImage(event.target.files?.[0] ?? null)}
                    />
                    {processingImage ? <small className="muted">Memproses crop/resize...</small> : null}
                    {previewImageUrl ? (
                        <div className="question-image-field-preview">
                            <img src={previewImageUrl} alt="Preview gambar soal" className="question-image-preview" />
                            {form.question_image_meta ? (
                                <p className="muted image-meta-text">
                                    Ukuran: {Math.round(form.question_image_meta.originalSize / 1024)}KB → {Math.round(form.question_image_meta.processedSize / 1024)}KB
                                    {' | '}
                                    Dimensi: {form.question_image_meta.originalWidth}x{form.question_image_meta.originalHeight} → {form.question_image_meta.outputWidth}x{form.question_image_meta.outputHeight}
                                </p>
                            ) : null}
                            <div className="button-row compact">
                                <button type="button" className="ghost-button" onClick={clearQuestionImage}>Hapus Gambar</button>
                            </div>
                        </div>
                    ) : null}
                </div>
                <label className="full-span">
                    <span>Pertanyaan</span>
                    <textarea rows="4" value={form.question_text} onChange={(event) => setForm((current) => ({ ...current, question_text: event.target.value }))} required />
                </label>
                <label className="full-span">
                    <span>Kunci Jawaban / Rubrik</span>
                    <textarea rows="3" value={form.answer_key} onChange={(event) => setForm((current) => ({ ...current, answer_key: event.target.value }))} required />
                </label>
                <label className="full-span">
                    <span>Pembahasan</span>
                    <textarea rows="3" value={form.explanation} onChange={(event) => setForm((current) => ({ ...current, explanation: event.target.value }))} />
                </label>

                {form.type === 'multiple_choice' ? (
                    <div className="full-span option-grid">
                        {form.options.map((option, index) => (
                            <div key={index} className="option-card">
                                <div className="option-card-top">
                                    <label className="option-label-field">
                                        <span>Opsi Jawaban</span>
                                        <input readOnly value={option.option_key} onChange={(event) => setForm((current) => ({
                                            ...current,
                                            options: current.options.map((item, optionIndex) => optionIndex === index ? { ...item, option_key: event.target.value } : item),
                                        }))} />
                                    </label>
                                    <label className="toggle-row option-correct-field">
                                        <span>Jawaban benar</span>
                                        <input type="radio" checked={option.is_correct} onChange={() => setCorrectOption(index)} />
                                    </label>
                                </div>
                                <label>
                                    <span>Isi opsi</span>
                                    <textarea rows="3" value={option.option_text} onChange={(event) => setForm((current) => ({
                                        ...current,
                                        options: current.options.map((item, optionIndex) => optionIndex === index ? { ...item, option_text: event.target.value } : item),
                                    }))} />
                                </label>
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="button-row full-span">
                    <button type="submit" className="primary-button" disabled={form.id ? !canEdit : !canCreate}>{form.id ? 'Update Soal' : 'Simpan Soal'}</button>
                    <button type="button" className="ghost-button" onClick={resetQuestionForm}>Reset</button>
                </div>
                </form>
            ) : null}
        </article>
    );
}
