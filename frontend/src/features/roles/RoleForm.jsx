import { createRoleForm } from '../../utils/factories';

const GROUP_LABELS = {
    dashboard: 'Dashboard',
    subjects: 'Subject',
    chapters: 'Bab & Sub Bab',
    questions: 'Bank Soal',
    packages: 'Generator Soal',
    users: 'Hak Akses User',
    roles: 'Role Permission',
    lainnya: 'Lainnya',
    menus: 'Menu Navigasi',
};

const ACTION_LABELS = {
    view: { title: 'Lihat Data', description: 'Dapat melihat daftar dan detail data.' },
    create: { title: 'Tambah Data', description: 'Dapat menambahkan data baru.' },
    update: { title: 'Ubah Data', description: 'Dapat mengubah data yang sudah ada.' },
    delete: { title: 'Hapus Data', description: 'Dapat menghapus data.' },
    import: { title: 'Import Data', description: 'Dapat melakukan import file data.' },
    generate: { title: 'Generate Paket', description: 'Dapat membuat paket soal otomatis.' },
    export: { title: 'Export Data', description: 'Dapat export ke Excel/PDF/Word.' },
};

function getPermissionMeta(permission) {
    const [groupKey = 'lainnya', actionKey = 'view'] = permission.split('.');
    const groupLabel = GROUP_LABELS[groupKey] ?? groupKey;
    const actionMeta = ACTION_LABELS[actionKey] ?? {
        title: actionKey,
        description: 'Hak akses khusus modul ini.',
    };

    return {
        groupLabel,
        title: `${groupLabel} - ${actionMeta.title}`,
        description: actionMeta.description,
        raw: permission,
    };
}

export default function RoleForm({ form, setForm, availablePermissions, onSubmit, canCreate, canEdit }) {
    const groupedPermissions = availablePermissions.reduce((accumulator, permission) => {
        const [group = 'lainnya'] = permission.split('.');

        if (!accumulator[group]) {
            accumulator[group] = [];
        }

        accumulator[group].push(permission);
        return accumulator;
    }, {});

    function togglePermission(permission) {
        setForm((current) => {
            const hasPermission = current.permissions.includes(permission);
            const nextPermissions = hasPermission
                ? current.permissions.filter((item) => item !== permission)
                : [...current.permissions, permission];

            return {
                ...current,
                permissions: nextPermissions,
            };
        });
    }

    function togglePermissionGroup(permissions, checked) {
        setForm((current) => {
            if (checked) {
                return {
                    ...current,
                    permissions: Array.from(new Set([...current.permissions, ...permissions])),
                };
            }

            return {
                ...current,
                permissions: current.permissions.filter((permission) => !permissions.includes(permission)),
            };
        });
    }

    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Role & Hak Akses</p>
                    <h2>Kelola role dan hak akses</h2>
                </div>
            </div>

            <form className="form-grid" onSubmit={onSubmit}>
                <label className="full-span">
                    <span>Nama Role</span>
                    <input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Contoh: operator-sekolah"
                        disabled={form.is_protected}
                        required
                    />
                </label>

                {form.is_protected ? <p className="form-note full-span">Nama role bawaan dikunci, tetapi permission masih bisa diubah.</p> : null}

                <div className="full-span permissions-panel">
                    <p className="permissions-title">Hak akses untuk role ini</p>
                    <div className="permission-group-stack">
                        {Object.entries(groupedPermissions).map(([group, permissions]) => {
                            const selectedCount = permissions.filter((permission) => form.permissions.includes(permission)).length;
                            const isGroupChecked = selectedCount === permissions.length && permissions.length > 0;
                            const groupLabel = GROUP_LABELS[group] ?? group;

                            return (
                                <section key={group} className="permission-group-block">
                                    <div className="permission-group-head">
                                        <strong>{groupLabel}</strong>
                                        <label className="permission-toggle-all">
                                            <input
                                                type="checkbox"
                                                checked={isGroupChecked}
                                                onChange={(event) => togglePermissionGroup(permissions, event.target.checked)}
                                            />
                                            <span>Pilih semua ({selectedCount}/{permissions.length})</span>
                                        </label>
                                    </div>
                                    <div className="permission-grid">
                                        {permissions.map((permission) => {
                                            const meta = getPermissionMeta(permission);

                                            return (
                                                <label key={permission} className="permission-item">
                                                <input
                                                    type="checkbox"
                                                    checked={form.permissions.includes(permission)}
                                                    onChange={() => togglePermission(permission)}
                                                />
                                                <span className="permission-item-copy">
                                                    <strong>{meta.title}</strong>
                                                    <small>{meta.description}</small>
                                                    <em>{meta.raw}</em>
                                                </span>
                                            </label>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </div>

                <div className="button-row full-span">
                    <button type="submit" className="primary-button" disabled={form.id ? !canEdit : !canCreate}>{form.id ? 'Update Role' : 'Tambah Role'}</button>
                    <button type="button" className="ghost-button" onClick={() => setForm(createRoleForm())}>Reset</button>
                </div>
            </form>
        </article>
    );
}
