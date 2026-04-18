import { useMemo, useState } from 'react';
import AppDataTable from '../../components/AppDataTable';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { formatDateTime } from '../../utils/helpers';

const GROUP_LABELS = {
    dashboard: 'Dashboard',
    subjects: 'Subject',
    chapters: 'Bab',
    questions: 'Soal',
    packages: 'Paket',
    users: 'User',
    roles: 'Role',
};

const ACTION_LABELS = {
    view: 'Lihat',
    create: 'Tambah',
    update: 'Ubah',
    delete: 'Hapus',
    import: 'Import',
    generate: 'Generate',
    export: 'Export',
};

function formatPermissionLabel(permission) {
    const [groupKey = '', actionKey = ''] = permission.split('.');
    const groupLabel = GROUP_LABELS[groupKey] ?? groupKey;
    const actionLabel = ACTION_LABELS[actionKey] ?? actionKey;

    return `${groupLabel} - ${actionLabel}`;
}

export default function RoleList({
    filters,
    setFilters,
    setPage,
    roles,
    setForm,
    removeRole,
    bulkRemoveRoles,
    canEdit,
    canDelete,
    meta,
    setPerPage,
    setSort,
    loading,
}) {
    const [selectedRows, setSelectedRows] = useState([]);
    const [toggleClear, setToggleClear] = useState(false);

    const selectedDeletableRows = useMemo(
        () => selectedRows.filter((row) => !row.is_protected),
        [selectedRows]
    );

    function handleSort(column, direction) {
        setSort({ sortBy: column.sortField ?? '', sortDir: direction });
        setPage(1);
    }

    async function handleBulkDelete() {
        if (!selectedDeletableRows.length) {
            return;
        }

        const shouldDelete = window.confirm(
            `Yakin ingin menghapus ${selectedDeletableRows.length} role terpilih? Tindakan ini tidak dapat dibatalkan.`
        );

        if (!shouldDelete) {
            return;
        }

        await bulkRemoveRoles(selectedDeletableRows.map((row) => row.id));
        setSelectedRows([]);
        setToggleClear((current) => !current);
    }

    async function handleDeleteOne(roleId) {
        const shouldDelete = window.confirm('Yakin ingin menghapus role ini?');
        if (!shouldDelete) {
            return;
        }

        await removeRole(roleId);
    }

    const columns = [
        {
            name: 'Role',
            selector: (item) => item.name,
            sortable: true,
            sortField: 'name',
            grow: 1.2,
            cell: (item) => <strong>{item.name}</strong>,
        },
        {
            name: 'Jumlah User',
            selector: (item) => item.users_count,
            sortable: true,
            sortField: 'users_count',
            width: '140px',
        },
        {
            name: 'Permission',
            grow: 2,
            cell: (item) => (
                <div className="chip-row compact-chip-row">
                    {item.permissions.length ? item.permissions.map((permission) => (
                        <span key={permission} className="chip" title={permission}>{formatPermissionLabel(permission)}</span>
                    )) : <span className="muted">Belum ada permission</span>}
                </div>
            ),
        },
        {
            name: 'Dibuat',
            selector: (item) => formatDateTime(item.created_at),
            sortable: true,
            sortField: 'created_at',
            width: '180px',
        },
        {
            name: 'Aksi',
            width: '220px',
            cell: (item) => (
                <div className="button-row compact table-actions">
                    <button
                        type="button"
                        className="ghost-button"
                        disabled={!canEdit}
                        onClick={() => setForm({
                            id: item.id,
                            name: item.name,
                            permissions: item.permissions,
                            is_protected: item.is_protected,
                        })}
                    ><FiEdit2 /><span>Edit</span></button>
                    <button type="button" className="danger-button" disabled={!canDelete || item.is_protected} onClick={() => handleDeleteOne(item.id)}><FiTrash2 /><span>Hapus</span></button>
                </div>
            ),
        },
    ];

    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Daftar Role</p>
                    <h2>Role + permission terpasang</h2>
                </div>
            </div>

            <div className="form-grid filter-bar">
                <label className="filter-field filter-field-search">
                    <span>Cari</span>
                    <input value={filters.search} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })); }} placeholder="Nama role" />
                </label>
            </div>

            {selectedRows.length > 0 ? (
                <div className="bulk-action-bar">
                    <span>
                        {selectedRows.length} role dipilih, {selectedDeletableRows.length} bisa dihapus
                    </span>
                    <button type="button" className="danger-button" disabled={!canDelete || !selectedDeletableRows.length} onClick={handleBulkDelete}>
                        <FiTrash2 /><span>Hapus ({selectedDeletableRows.length})</span>
                    </button>
                </div>
            ) : null}

            <AppDataTable
                columns={columns}
                data={roles}
                meta={meta}
                onPageChange={setPage}
                onPerPageChange={(nextPerPage) => {
                    setPerPage(nextPerPage);
                    setPage(1);
                }}
                noDataText="Belum ada data role."
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
