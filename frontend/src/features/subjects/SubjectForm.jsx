import { createSubjectForm } from '../../utils/factories';

export default function SubjectForm({ form, setForm, onSubmit, canCreate, canEdit }) {
    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Master Subject</p>
                    <h2>Kelola subject mapel</h2>
                </div>
            </div>
            <form className="form-grid" onSubmit={onSubmit}>
                <label>
                    <span>Nama Subject</span>
                    <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
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
                    <button type="submit" className="primary-button" disabled={form.id ? !canEdit : !canCreate}>{form.id ? 'Update Subject' : 'Tambah Subject'}</button>
                    <button type="button" className="ghost-button" onClick={() => setForm(createSubjectForm())}>Reset</button>
                </div>
            </form>
        </article>
    );
}
