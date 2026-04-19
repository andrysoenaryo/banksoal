import { useState } from 'react';
import AppDataTable from '../../components/AppDataTable';
import SearchableSelect from '../../components/SearchableSelect';
import { FiEdit2, FiKey, FiTrash2, FiX } from 'react-icons/fi';

const PERMISSION_LABELS = {
    'dashboard.view': 'Lihat Dashboard',
    'subjects.view': 'Lihat Mata Pelajaran',
    'subjects.create': 'Tambah Mata Pelajaran',
    'subjects.update': 'Edit Mata Pelajaran',
    'subjects.delete': 'Hapus Mata Pelajaran',
    'chapters.view': 'Lihat Bab & Sub Bab',
    'chapters.create': 'Tambah Bab & Sub Bab',
    'chapters.update': 'Edit Bab & Sub Bab',
    'chapters.delete': 'Hapus Bab & Sub Bab',
    'questions.view': 'Lihat Bank Soal',
    'questions.create': 'Tambah Soal',
    'questions.import': 'Import Soal',
    'questions.update': 'Edit Soal',
    'questions.delete': 'Hapus Soal',
    'packages.view': 'Lihat Paket Soal',
    'packages.generate': 'Generate Paket Soal',
    'packages.update': 'Edit Paket Soal',
    'packages.export': 'Export Paket Soal',
    'packages.delete': 'Hapus Paket Soal',
    'users.view': 'Lihat Daftar User',
    'users.create': 'Tambah User',
    'users.update': 'Edit User',
    'users.delete': 'Hapus User',
    'roles.view': 'Lihat Role & Permission',
    'roles.create': 'Tambah Role',
    'roles.update': 'Edit Role',
    'roles.delete': 'Hapus Role',
    'menus.manage': 'Kelola Menu Navigasi',
};

const PERMISSION_GROUP_LABELS = {
    dashboard: 'Dashboard',
    subjects: 'Mata Pelajaran',
    chapters: 'Bab & Sub Bab',
    questions: 'Bank Soal',
    packages: 'Paket Soal',
    users: 'Manajemen User',
    roles: 'Role & Permission',
    menus: 'Menu Navigasi',
};

function groupPermissions(permissions) {
    const groups = {};
    for (const perm of permissions) {
        const prefix = perm.split('.')[0];
        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push(perm);
    }
    return groups;
}

function PermissionPopup({ user, onClose }) {
    const groups = groupPermissions(user.permissions);

    return (
        <div className="export-choice-overlay" onClick={onClose}>
            <div className="perm-popup" onClick={(e) => e.stopPropagation()}>
                <div className="perm-popup-header">
                    <div>
                        <p className="eyebrow">Hak Akses</p>
                        <h3>{user.name}</h3>
                    </div>
                    <button type="button" className="ghost-button perm-popup-close" onClick={onClose}><FiX /></button>
                </div>
                {user.permissions.length === 0 ? (
                    <p className="muted" style={{ margin: 0 }}>User ini belum memiliki permission.</p>
                ) : (
                    <div className="perm-group-list">
                        {Object.entries(groups).map(([prefix, perms]) => (
                            <div key={prefix} className="perm-group">
                                <p className="perm-group-title">{PERMISSION_GROUP_LABELS[prefix] ?? prefix}</p>
                                <div className="perm-item-list">
                                    {perms.map((perm) => (
                                        <span key={perm} className="perm-item">
                                            {PERMISSION_LABELS[perm] ?? perm}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function UserList({ filters, setFilters, setPage, roles, users, setForm, currentUserId, removeUser, bulkRemoveUsers, resetUserPassword, canEdit, canDelete, canResetPassword, meta, setPerPage, sort, setSort, loading }) {
    const [selectedRows, setSelectedRows] = useState([]);
    const [toggleClear, setToggleClear] = useState(false);
    const [permPopupUser, setPermPopupUser] = useState(null);

    function handleSort(column, direction) {
        setSort({ sortBy: column.sortField ?? '', sortDir: direction });
        setPage(1);
    }

    async function handleBulkDelete() {
        if (!selectedRows.length) return;
        // Prevent deleting current user
        const ids = selectedRows.map((row) => row.id).filter((id) => id !== currentUserId);
        if (!ids.length) return;

        const shouldDelete = window.confirm(`Yakin ingin menghapus ${ids.length} user terpilih?`);
        if (!shouldDelete) return;

        await bulkRemoveUsers(ids);
        setSelectedRows([]);
        setToggleClear((prev) => !prev);
    }

    async function handleDeleteOne(userId) {
        const shouldDelete = window.confirm('Yakin ingin menghapus user ini?');
        if (!shouldDelete) return;

        await removeUser(userId);
    }

    async function handleResetPassword(item) {
        const shouldReset = window.confirm(`Reset password untuk user ${item.name} (${item.email})? Password akan langsung diubah sekarang, lalu password baru dikirim via email.`);
        if (!shouldReset) return;

        await resetUserPassword(item.id);
    }

    const columns = [
        {
            name: 'Nama',
            selector: (item) => item.name,
            sortable: true,
            sortField: 'name',
            grow: 1.2,
            cell: (item) => <strong>{item.name}</strong>,
        },
        {
            name: 'Email',
            selector: (item) => item.email,
            sortable: true,
            sortField: 'email',
            grow: 1.5,
        },
        {
            name: 'Role',
            cell: (item) => <span className="badge">{item.roles.join(', ') || 'Tanpa role'}</span>,
            grow: 1.2,
        },
        {
            name: 'Status',
            cell: (item) => <span className="badge subtle">{item.is_active ? 'Aktif' : 'Nonaktif'}</span>,
            width: '130px',
        },
        {
            name: 'Permission',
            width: '120px',
            center: true,
            cell: (item) => (
                <button
                    type="button"
                    className="ghost-button perm-trigger"
                    title={`Lihat ${item.permissions.length} permission`}
                    onClick={() => setPermPopupUser(item)}
                >
                    <FiKey />
                    <span className="perm-count">{item.permissions.length}</span>
                </button>
            ),
        },
        {
            name: 'Aksi',
            width: '340px',
            cell: (item) => (
                <div className="button-row compact table-actions">
                    <button type="button" className="ghost-button" disabled={!canEdit} onClick={() => setForm({
                        id: item.id,
                        name: item.name,
                        email: item.email,
                        password: '',
                        role: item.roles[0] ?? roles[0] ?? '',
                        is_active: item.is_active,
                    })}><FiEdit2 /><span>Edit</span></button>
                    {canResetPassword ? (
                        <button type="button" className="ghost-button" onClick={() => handleResetPassword(item)}>
                            <span>Reset Password</span>
                        </button>
                    ) : null}
                    <button type="button" className="danger-button" disabled={!canDelete || item.id === currentUserId} onClick={() => handleDeleteOne(item.id)}><FiTrash2 /><span>Hapus</span></button>
                </div>
            ),
        },
    ];

    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Daftar User</p>
                    <h2>Filter detail + pagination</h2>
                </div>
            </div>

            <div className="form-grid filter-bar">
                <label className="filter-field filter-field-search">
                    <span>Cari</span>
                    <input value={filters.search} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })); }} placeholder="Nama/email" />
                </label>
                <label className="filter-field">
                    <span>Role</span>
                    <SearchableSelect
                        value={filters.role}
                        onChange={(value) => { setPage(1); setFilters((current) => ({ ...current, role: value })); }}
                        options={[{ value: '', label: 'Semua' }, ...roles.map((role) => ({ value: role, label: role }))]}
                        placeholder="Semua"
                        searchPlaceholder="Cari role..."
                    />
                </label>
                <label className="filter-field">
                    <span>Status</span>
                    <SearchableSelect
                        value={filters.is_active}
                        onChange={(value) => { setPage(1); setFilters((current) => ({ ...current, is_active: value })); }}
                        options={[{ value: '', label: 'Semua' }, { value: '1', label: 'Aktif' }, { value: '0', label: 'Nonaktif' }]}
                        placeholder="Semua"
                    />
                </label>
            </div>

            {selectedRows.length > 0 && (
                <div className="bulk-action-bar">
                    <span>{selectedRows.length} user dipilih</span>
                    <button type="button" className="danger-button" onClick={handleBulkDelete} disabled={!canDelete}>
                        <FiTrash2 /><span>Hapus ({selectedRows.length})</span>
                    </button>
                </div>
            )}
            <AppDataTable
                columns={columns}
                data={users}
                meta={meta}
                onPageChange={setPage}
                onPerPageChange={(nextPerPage) => {
                    setPerPage(nextPerPage);
                    setPage(1);
                }}
                noDataText="Belum ada data user."
                sortServer
                onSort={handleSort}
                selectableRows
                onSelectedRowsChange={({ selectedRows: rows }) => setSelectedRows(rows)}
                clearSelectedRows={toggleClear}
                progressPending={loading}
            />

            {permPopupUser ? <PermissionPopup user={permPopupUser} onClose={() => setPermPopupUser(null)} /> : null}
        </article>
    );
}
