import { useMemo, useState } from 'react';
import ExportAnswerKeyDialog from '../../components/ExportAnswerKeyDialog';
import { formatDateTime, resolveMediaUrl } from '../../utils/helpers';

export default function PackagePreviewPanel({
    selectedPackage,
    previewLoading,
    flatChapters,
    detailForm,
    setDetailForm,
    savingDetail,
    onSaveDetail,
    onClose,
    exportPackage,
    canUpdate,
    canExport,
    ruleQuestionEditor,
    ruleQuestionSelections,
    loadingRuleQuestions,
    savingItems,
    addingRule,
    toggleRuleQuestion,
    addRuleToPackage,
    savePackageItems,
}) {
    const [activeImage, setActiveImage] = useState(null);
    const [openAddByRule, setOpenAddByRule] = useState({});
    const [collapsedByRule, setCollapsedByRule] = useState({});
    const [compactMode, setCompactMode] = useState(false);
    const [exportChoice, setExportChoice] = useState({ open: false, format: null });
    const [newRuleChapterId, setNewRuleChapterId] = useState('');

    const ruleMeta = useMemo(
        () => Array.isArray(ruleQuestionEditor) ? ruleQuestionEditor : [],
        [ruleQuestionEditor]
    );

    const selectedByRule = useMemo(() => {
        if (!ruleMeta.length) {
            return {};
        }

        return Object.fromEntries(
            ruleMeta.map((rule) => [String(rule.id), (ruleQuestionSelections[String(rule.id)] ?? []).map(Number)])
        );
    }, [ruleMeta, ruleQuestionSelections]);

    const packageSubjectId = useMemo(() => {
        const fromRuleEditor = ruleMeta.find((rule) => rule.chapter_subject_id)?.chapter_subject_id;
        if (fromRuleEditor) {
            return Number(fromRuleEditor);
        }

        const fromSelectedPackage = selectedPackage?.rules?.find((rule) => rule.chapter?.subject_id)?.chapter?.subject_id;
        return fromSelectedPackage ? Number(fromSelectedPackage) : null;
    }, [ruleMeta, selectedPackage]);

    const usedChapterIds = useMemo(
        () => new Set(ruleMeta.map((rule) => String(rule.chapter_id))),
        [ruleMeta]
    );

    const chapterOptions = useMemo(() => {
        const allChapters = Array.isArray(flatChapters) ? flatChapters : [];

        return allChapters.filter((chapter) => {
            const matchesSubject = packageSubjectId ? String(chapter.subject_id) === String(packageSubjectId) : true;
            const notSelected = !usedChapterIds.has(String(chapter.id));

            return matchesSubject && notSelected;
        });
    }, [flatChapters, usedChapterIds, packageSubjectId]);

    const hasChapterOptions = chapterOptions.length > 0;

    function getRuleSelectedSet(ruleId) {
        return new Set(selectedByRule[String(ruleId)] ?? []);
    }

    function getReplaceCandidates(rule, currentQuestionId) {
        const selectedSet = getRuleSelectedSet(rule.id);
        return (rule.available_questions ?? []).filter((question) => {
            const questionId = Number(question.id);
            return questionId === Number(currentQuestionId) || !selectedSet.has(questionId);
        });
    }

    function getAddCandidates(rule) {
        const selectedSet = getRuleSelectedSet(rule.id);
        return (rule.available_questions ?? []).filter((question) => !selectedSet.has(Number(question.id)));
    }

    function handleReplaceQuestion(ruleId, currentQuestionId, nextQuestionId) {
        const nextId = Number(nextQuestionId);
        const currentId = Number(currentQuestionId);

        if (!nextId || nextId === currentId) {
            return;
        }

        toggleRuleQuestion(ruleId, currentId, false);
        toggleRuleQuestion(ruleId, nextId, true);
    }

    function handleAddQuestion(ruleId, questionId) {
        const normalizedQuestionId = Number(questionId);
        if (!normalizedQuestionId) {
            return;
        }

        toggleRuleQuestion(ruleId, normalizedQuestionId, true);
        setOpenAddByRule((current) => ({ ...current, [String(ruleId)]: false }));
    }

    function handleRemoveQuestion(ruleId, questionId) {
        const normalizedQuestionId = Number(questionId);
        if (!normalizedQuestionId) {
            return;
        }

        toggleRuleQuestion(ruleId, normalizedQuestionId, false);
    }

    function handleExport(format) {
        if (!selectedPackage) {
            return;
        }

        if (format === 'pdf' || format === 'word') {
            setExportChoice({ open: true, format: format });
            return;
        }

        exportPackage(selectedPackage.id, format);
    }

    function closeExportChoice() {
        setExportChoice({ open: false, format: null });
    }

    function handleSelectExportOption(includeAnswerKey) {
        if (!selectedPackage || !exportChoice.format) {
            closeExportChoice();
            return;
        }

        exportPackage(selectedPackage.id, exportChoice.format, includeAnswerKey);
        closeExportChoice();
    }

    async function handleAddRule() {
        await addRuleToPackage(newRuleChapterId);
        setNewRuleChapterId('');
    }

    if (!selectedPackage && !previewLoading) {
        return null;
    }

    if (!selectedPackage && previewLoading) {
        return (
            <article className="panel full-span package-preview-panel">
                <div className="preview-loading-state">
                    <div className="preview-loading-spinner" aria-hidden="true"></div>
                    <p className="muted">Memuat preview paket soal...</p>
                </div>
            </article>
        );
    }

    return (
        <article className="panel full-span package-preview-panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Preview Hasil Generate</p>
                    <h2>Detail paket soal</h2>
                    <p className="muted">Review hasil, edit detail paket, lalu export ke Excel/Word/PDF.</p>
                </div>
                <div className="button-row compact">
                    <button type="button" className="ghost-button" disabled={!canExport} onClick={() => handleExport('excel')}>Export Excel</button>
                    <button type="button" className="ghost-button" disabled={!canExport} onClick={() => handleExport('word')}>Export Word</button>
                    <button type="button" className="ghost-button" disabled={!canExport} onClick={() => handleExport('pdf')}>Export PDF</button>
                    <button type="button" className="danger-button" onClick={onClose}>Tutup</button>
                </div>
            </div>

            <form className="form-grid" onSubmit={onSaveDetail}>
                <label>
                    <span>Judul Paket</span>
                    <input
                        value={detailForm.title}
                        onChange={(event) => setDetailForm((current) => ({ ...current, title: event.target.value }))}
                        required
                    />
                </label>
                <label>
                    <span>Total Soal</span>
                    <input value={selectedPackage.total_questions} readOnly />
                </label>
                <label>
                    <span>Generator</span>
                    <input value={selectedPackage.creator?.name ?? '-'} readOnly />
                </label>
                <label>
                    <span>Tanggal Dibuat</span>
                    <input value={formatDateTime(selectedPackage.generated_at)} readOnly />
                </label>
                <label className="full-span">
                    <span>Deskripsi</span>
                    <textarea
                        rows="3"
                        value={detailForm.description}
                        onChange={(event) => setDetailForm((current) => ({ ...current, description: event.target.value }))}
                    />
                </label>
                <div className="button-row full-span">
                    <button type="submit" className="primary-button" disabled={savingDetail || !canUpdate}>{savingDetail ? 'Menyimpan...' : 'Simpan Detail Paket'}</button>
                </div>
            </form>

            <div className="chip-row">
                {selectedPackage.rules?.map((rule) => (
                    <span key={rule.id} className="chip">
                        {rule.chapter?.name}: {rule.composition_type === 'percentage' ? `${rule.composition_value}% dari paket` : `${rule.composition_value} soal`}
                    </span>
                ))}
            </div>

            <section className="panel muted-surface full-span">
                <div className="panel-header">
                    <div>
                        <h3>Edit Soal Per Rule</h3>
                        <p className="muted">Setiap kartu soal bisa langsung diganti dari daftar soal rule yang sama. Tambah soal juga tersedia di tiap rule.</p>
                    </div>
                    <div className="button-row compact">
                        <button
                            type="button"
                            className="ghost-button"
                            onClick={() => setCompactMode((current) => !current)}
                        >
                            {compactMode ? 'Normal Mode' : 'Compact Mode'}
                        </button>
                        <button type="button" className="primary-button" disabled={!canUpdate || savingItems || loadingRuleQuestions} onClick={savePackageItems}>
                            {savingItems ? 'Menyimpan Soal...' : 'Simpan Daftar Soal'}
                        </button>
                    </div>
                </div>

                <div className="add-rule-inline">
                    <label className="package-inline-field">
                        <span>Pilih bab untuk rule baru</span>
                        <select
                            value={newRuleChapterId}
                            onChange={(event) => setNewRuleChapterId(event.target.value)}
                            disabled={!canUpdate || loadingRuleQuestions || savingItems || addingRule || !hasChapterOptions}
                        >
                            <option value="">{hasChapterOptions ? 'Pilih bab...' : 'Tidak ada bab tersisa'}</option>
                            {chapterOptions.map((chapter) => (
                                <option key={`chapter-option-${chapter.id}`} value={chapter.id}>{chapter.name}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        className="ghost-button"
                        onClick={handleAddRule}
                        disabled={!canUpdate || !newRuleChapterId || loadingRuleQuestions || savingItems || addingRule}
                    >
                        {addingRule ? 'Menambah Rule...' : 'Tambah Rule'}
                    </button>
                </div>

                {!hasChapterOptions ? (
                    <p className="muted compact-preview">Semua bab pada subject paket ini sudah terpilih sebagai rule.</p>
                ) : null}

                {loadingRuleQuestions ? <p className="muted">Memuat daftar soal per rule...</p> : null}

                {!loadingRuleQuestions && Array.isArray(ruleQuestionEditor) ? (
                    <div className={`rule-editor-stack package-rule-stack ${compactMode ? 'compact-mode' : ''}`}>
                        {ruleQuestionEditor.map((rule, index) => {
                            const ruleKey = String(rule.id);
                            const selectedIds = selectedByRule[String(rule.id)] ?? [];
                            const availableMap = new Map((rule.available_questions ?? []).map((question) => [Number(question.id), question]));
                            const addCandidates = getAddCandidates(rule);
                            const isCollapsed = Boolean(collapsedByRule[ruleKey]);
                            const showAddSelector = !isCollapsed && Boolean(openAddByRule[String(rule.id)]);

                            return (
                                <article key={rule.id} className="data-card package-rule-card">
                                    <div className="package-rule-header">
                                        <div>
                                            <strong>Rule {index + 1} - {rule.chapter_name ?? '-'}</strong>
                                            <p className="muted compact-preview">Terpilih: {selectedIds.length} soal</p>
                                        </div>
                                        <div className="button-row compact">
                                            <button
                                                type="button"
                                                className="ghost-button rule-collapse-button"
                                                onClick={() => setCollapsedByRule((current) => ({ ...current, [ruleKey]: !current[ruleKey] }))}
                                                aria-expanded={!isCollapsed}
                                            >
                                                {isCollapsed ? 'Show' : 'Minimize'}
                                            </button>
                                            <button
                                                type="button"
                                                className="ghost-button"
                                                onClick={() => setOpenAddByRule((current) => ({ ...current, [String(rule.id)]: !current[String(rule.id)] }))}
                                                disabled={!canUpdate || savingItems || !addCandidates.length || isCollapsed}
                                            >
                                                Tambah Soal
                                            </button>
                                            <span className="chip">Terpilih: {selectedIds.length}</span>
                                        </div>
                                    </div>
                                    {!isCollapsed ? (
                                        <>
                                            {showAddSelector ? (
                                                <label className="package-inline-field">
                                                    <span>Pilih soal untuk ditambahkan</span>
                                                    <select
                                                        defaultValue=""
                                                        onChange={(event) => handleAddQuestion(rule.id, event.target.value)}
                                                        disabled={!canUpdate || savingItems}
                                                    >
                                                        <option value="">Pilih soal...</option>
                                                        {addCandidates.map((question) => (
                                                            <option key={`add-${rule.id}-${question.id}`} value={question.id}>
                                                                #{question.id} - {question.question_text}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            ) : null}

                                            {selectedIds.length ? (
                                                <div className="stacked-cards package-rule-question-stack">
                                                    {selectedIds.map((questionId, questionIndex) => {
                                                        const question = availableMap.get(Number(questionId));

                                                        if (!question) {
                                                            return null;
                                                        }

                                                        const normalizedImageUrl = resolveMediaUrl(question.question_image_url);
                                                        const replaceCandidates = getReplaceCandidates(rule, question.id);

                                                        return (
                                                            <article key={`${rule.id}-${question.id}-${questionIndex}`} className={`data-card ${compactMode ? 'compact-question-card' : ''}`}>
                                                                <div className="card-topline">
                                                                    <span className="badge">No {questionIndex + 1}</span>
                                                                    <span className="badge subtle">{question.chapter_name ?? rule.chapter_name ?? '-'}</span>
                                                                </div>

                                                                <label className="package-inline-field">
                                                                    <span>Ganti soal</span>
                                                                    <select
                                                                        defaultValue=""
                                                                        onChange={(event) => handleReplaceQuestion(rule.id, question.id, event.target.value)}
                                                                        disabled={!canUpdate || savingItems || replaceCandidates.length <= 1}
                                                                    >
                                                                        <option value="">Pilih pengganti...</option>
                                                                        {replaceCandidates
                                                                            .filter((candidate) => Number(candidate.id) !== Number(question.id))
                                                                            .map((candidate) => (
                                                                                <option key={`replace-${rule.id}-${question.id}-${candidate.id}`} value={candidate.id}>
                                                                                    #{candidate.id} - {candidate.question_text}
                                                                                </option>
                                                                            ))}
                                                                    </select>
                                                                </label>

                                                                <div className="button-row compact">
                                                                    <button
                                                                        type="button"
                                                                        className="danger-button"
                                                                        onClick={() => handleRemoveQuestion(rule.id, question.id)}
                                                                        disabled={!canUpdate || savingItems}
                                                                    >
                                                                        Hapus Soal
                                                                    </button>
                                                                </div>

                                                                {normalizedImageUrl ? (
                                                                    <button type="button" className="question-image-button" onClick={() => setActiveImage(normalizedImageUrl)}>
                                                                        <img src={normalizedImageUrl} alt={`Gambar soal rule ${index + 1} nomor ${questionIndex + 1}`} className="question-image-preview" />
                                                                        <span className="muted">Klik gambar untuk perbesar</span>
                                                                    </button>
                                                                ) : null}

                                                                <h3>{question.question_text}</h3>
                                                                <p className="muted">Tipe: {question.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'}</p>
                                                                {question.options?.length ? (
                                                                    <ul className="option-preview">
                                                                        {question.options.map((option) => (
                                                                            <li key={option.id}>{option.option_key}. {option.option_text}</li>
                                                                        ))}
                                                                    </ul>
                                                                ) : null}
                                                                <p className="muted">Kunci: {question.answer_key ?? '-'}</p>
                                                                {question.explanation ? <p className="muted">Pembahasan: {question.explanation}</p> : null}
                                                            </article>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="muted">Belum ada soal terpilih pada rule ini.</p>
                                            )}
                                        </>
                                    ) : null}
                                </article>
                            );
                        })}
                    </div>
                ) : null}
            </section>

            {activeImage ? (
                <div className="image-lightbox" role="dialog" aria-modal="true" onClick={() => setActiveImage(null)}>
                    <button type="button" className="image-lightbox-close" onClick={() => setActiveImage(null)}>Tutup</button>
                    <img src={activeImage} alt="Preview gambar soal" className="image-lightbox-content" onClick={(event) => event.stopPropagation()} />
                </div>
            ) : null}

            <ExportAnswerKeyDialog
                open={exportChoice.open}
                format={exportChoice.format}
                onCancel={closeExportChoice}
                onSelect={handleSelectExportOption}
            />
        </article>
    );
}
