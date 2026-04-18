import { COMPOSITION_TYPES, QUESTION_TYPES } from '../../config/constants';
import SearchableSelect from '../../components/SearchableSelect';

export default function PackageForm({ form, setForm, subjects, flatChapters, updateRule, onSubmit, canGenerate }) {
    function removeRule(index) {
        if (form.rules.length <= 1) {
            return;
        }

        if (!window.confirm('Hapus rule ini?')) {
            return;
        }

        setForm((current) => ({
            ...current,
            rules: current.rules.filter((_, ruleIndex) => ruleIndex !== index),
        }));
    }

    function handleSubjectChange(value) {
        setForm((current) => ({
            ...current,
            subject_id: value,
            rules: current.rules.map((rule) => ({
                ...rule,
                chapter_id: '',
            })),
        }));
    }

    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Generator</p>
                    <h2>Bentuk paket soal</h2>
                </div>
            </div>

            <form className="form-grid" onSubmit={onSubmit}>
                <label>
                    <span>Subject</span>
                    <SearchableSelect
                        value={form.subject_id}
                        onChange={handleSubjectChange}
                        options={subjects.map((subject) => ({ value: String(subject.id), label: subject.name }))}
                        placeholder="Pilih subject"
                        searchPlaceholder="Cari subject..."
                        required
                    />
                </label>
                <label>
                    <span>Nama Paket</span>
                    <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
                </label>
                <label>
                    <span>Total Soal</span>
                    <input type="number" min="1" value={form.total_questions} onChange={(event) => setForm((current) => ({ ...current, total_questions: event.target.value }))} required />
                </label>
                <label className="full-span">
                    <span>Deskripsi</span>
                    <textarea rows="3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                </label>

                <div className="full-span rule-stack">
                    {form.rules.map((rule, index) => (
                        <div key={index} className="rule-card package-rule-card">
                            <div className="package-rule-header">
                                <strong>Rule {index + 1}</strong>
                                <button
                                    type="button"
                                    className="danger-button"
                                    onClick={() => removeRule(index)}
                                    disabled={!canGenerate || form.rules.length <= 1}
                                    title={form.rules.length <= 1 ? 'Minimal harus ada 1 rule' : 'Hapus rule'}
                                >
                                    Hapus Rule
                                </button>
                            </div>
                            <div className="package-rule-grid">
                                <label>
                                    <span>Bab/Sub Bab</span>
                                    <SearchableSelect
                                        value={rule.chapter_id}
                                        onChange={(value) => updateRule(index, 'chapter_id', value)}
                                        options={flatChapters.map((chapter) => ({ value: String(chapter.id), label: chapter.name }))}
                                        placeholder={form.subject_id ? 'Pilih bab' : 'Pilih subject dulu'}
                                        searchPlaceholder="Cari bab/sub bab..."
                                        required
                                        disabled={!form.subject_id}
                                    />
                                </label>
                                <label>
                                    <span>Mode</span>
                                    <SearchableSelect
                                        value={rule.composition_type}
                                        onChange={(value) => updateRule(index, 'composition_type', value)}
                                        options={COMPOSITION_TYPES.map((item) => ({ value: item.value, label: item.label }))}
                                    />
                                </label>
                                <label>
                                    <span>{rule.composition_type === 'quantity' ? 'Jumlah Soal dari Bab/Sub Bab Ini' : 'Persentase Soal dari Total Paket (%)'}</span>
                                    <input type="number" min="1" value={rule.composition_value} onChange={(event) => updateRule(index, 'composition_value', event.target.value)} required />
                                </label>
                                <label>
                                    <span>Filter Tipe</span>
                                    <SearchableSelect
                                        value={rule.type}
                                        onChange={(value) => updateRule(index, 'type', value)}
                                        options={[{ value: '', label: 'Semua tipe' }, ...QUESTION_TYPES.map((item) => ({ value: item.value, label: item.label }))]}
                                        placeholder="Semua tipe"
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="button-row full-span">
                    <button type="button" className="ghost-button" disabled={!canGenerate} onClick={() => setForm((current) => ({
                        ...current,
                        rules: [...current.rules, { chapter_id: '', composition_type: 'quantity', composition_value: 1, type: '' }],
                    }))}>Tambah Rule</button>
                    <button type="submit" className="primary-button" disabled={!canGenerate}>Generate</button>
                </div>
            </form>
        </article>
    );
}
