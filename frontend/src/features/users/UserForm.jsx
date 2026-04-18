import SearchableSelect from '../../components/SearchableSelect';
import { createUserForm } from '../../utils/factories';

export default function UserForm({ form, setForm, roles, onSubmit, canCreate, canEdit }) {
    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Hak Akses</p>
                    <h2>Kelola user aplikasi</h2>
                </div>
            </div>

            <form className="form-grid" onSubmit={onSubmit}>
                <label>
                    <span>Nama</span>
                    <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                </label>
                <label>
                    <span>Email</span>
                    <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
                </label>
                <label>
                    <span>Role</span>
                    <SearchableSelect
                        value={form.role}
                        onChange={(value) => setForm((current) => ({ ...current, role: value }))}
                        options={roles.map((role) => ({ value: role, label: role }))}
                        placeholder="Pilih role"
                        searchPlaceholder="Cari role..."
                        required
                    />
                </label>
                <label>
                    <span>Password {form.id ? '(opsional)' : ''}</span>
                    <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required={!form.id} />
                </label>
                <label className="toggle-row">
                    <span>Aktif</span>
                    <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
                </label>
                <div className="button-row full-span">
                    <button type="submit" className="primary-button" disabled={form.id ? !canEdit : !canCreate}>{form.id ? 'Update User' : 'Tambah User'}</button>
                    <button type="button" className="ghost-button" onClick={() => setForm(createUserForm(roles[0] ?? ''))}>Reset</button>
                </div>
            </form>
        </article>
    );
}
