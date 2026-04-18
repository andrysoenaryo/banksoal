import SearchableSelect from '../../components/SearchableSelect';
import { createChapterForm } from '../../utils/factories';

export default function ChapterForm({ form, setForm, flatChapters, subjects, onSubmit, canCreate, canEdit }) {
    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Struktur Materi</p>
                    <h2>Bab dan sub bab</h2>
                </div>
            </div>
            <form className="form-grid" onSubmit={onSubmit}>
                <label>
                    <span>Subject</span>
                    <SearchableSelect
                        value={form.subject_id}
                        onChange={(value) => setForm((current) => ({ ...current, subject_id: value, parent_id: '' }))}
                        options={subjects.map((subject) => ({ value: String(subject.id), label: subject.name }))}
                        placeholder="Pilih subject"
                        searchPlaceholder="Cari subject..."
                        required
                    />
                </label>
                <label>
                    <span>Nama Bab</span>
                    <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                </label>
                <label>
                    <span>Parent</span>
                    <SearchableSelect
                        value={form.parent_id}
                        onChange={(value) => setForm((current) => ({ ...current, parent_id: value }))}
                        options={[{ value: '', label: 'Bab utama' }, ...flatChapters
                            .filter((chapter) => chapter.id !== form.id && String(chapter.subject_id) === String(form.subject_id))
                            .map((chapter) => ({ value: String(chapter.id), label: chapter.name }))]}
                        placeholder={!form.subject_id ? 'Pilih subject dulu' : 'Bab utama'}
                        searchPlaceholder="Cari parent bab..."
                        disabled={!form.subject_id}
                    />
                </label>
                <label>
                    <span>Urutan</span>
                    <input type="number" min="0" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
                </label>
                <label className="toggle-row">
                    <span>Aktif</span>
                    <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
                </label>
                <label className="full-span">
                    <span>Deskripsi</span>
                    <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows="4" />
                </label>
                <div className="button-row full-span">
                    <button type="submit" className="primary-button" disabled={form.id ? !canEdit : !canCreate}>{form.id ? 'Update Bab' : 'Tambah Bab'}</button>
                    <button type="button" className="ghost-button" onClick={() => setForm(createChapterForm())}>Reset</button>
                </div>
            </form>
        </article>
    );
}
