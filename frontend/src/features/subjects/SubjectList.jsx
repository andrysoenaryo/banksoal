import { useState } from 'react';
import AppDataTable from '../../components/AppDataTable';
import SearchableSelect from '../../components/SearchableSelect';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function SubjectList({ filters, setFilters, setPage, subjects, setForm, removeSubject, bulkRemoveSubjects, canEdit, canDelete, meta, setPerPage, setSort, loading }) {
    const [selectedRows, setSelectedRows] = useState([]);
    const [toggleClear, setToggleClear] = useState(false);

    function handleSort(column, direction) {
        setSort({ sortBy: column.sortField ?? '', sortDir: direction });
        setPage(1);
    }

    async function handleBulkDelete() {
        if (!selectedRows.length) return;

        const shouldDelete = window.confirm(`Yakin ingin menghapus ${selectedRows.length} subject terpilih?`);
        if (!shouldDelete) return;

        await bulkRemoveSubjects(selectedRows.map((row) => row.id));
        setSelectedRows([]);
        setToggleClear((prev) => !prev);
    }

    async function handleDeleteOne(subjectId) {
        const shouldDelete = window.confirm('Yakin ingin menghapus subject ini?');
        if (!shouldDelete) return;

        await removeSubject(subjectId);
    }

    const columns = [
        {
            name: 'Subject',
            sortable: true,
            sortField: 'name',
            grow: 1.6,
            cell: (item) => (
                <div>
                    <strong>{item.name}</strong>
                    {item.description ? <p className="table-note">{item.description}</p> : null}
                </div>
            ),
        },
        {
            name: 'Jumlah Bab',
            selector: (item) => item.chapters_count ?? 0,
            width: '130px',
        },
        {
            name: 'Status',
            width: '120px',
            cell: (item) => <span className="badge">{item.is_active ? 'Aktif' : 'Nonaktif'}</span>,
        },
        {
            name: 'Urutan',
            selector: (item) => item.sort_order,
            sortable: true,
            sortField: 'sort_order',
            width: '120px',
        },
        {
            name: 'Aksi',
            width: '220px',
            cell: (item) => (
                <div className="button-row compact table-actions">
                    <button type="button" className="ghost-button" disabled={!canEdit} onClick={() => setForm({
                        id: item.id,
                        name: item.name,
                        description: item.description ?? '',
                        sort_order: item.sort_order,
                        is_active: item.is_active,
                    })}><FiEdit2 /><span>Edit</span></button>
                    <button type="button" className="danger-button" disabled={!canDelete} onClick={() => handleDeleteOne(item.id)}><FiTrash2 /><span>Hapus</span></button>
                </div>
            ),
        },
    ];

    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Daftar Subject</p>
                    <h2>Filter & pagination</h2>
                </div>
            </div>

            <div className="form-grid filter-bar">
                <label className="filter-field filter-field-search">
                    <span>Cari</span>
                    <input value={filters.search} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })); }} placeholder="Nama subject" />
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

            {selectedRows.length > 0 ? (
                <div className="bulk-action-bar">
                    <span>{selectedRows.length} subject dipilih</span>
                    <button type="button" className="danger-button" onClick={handleBulkDelete} disabled={!canDelete}>
                        <FiTrash2 /><span>Hapus ({selectedRows.length})</span>
                    </button>
                </div>
            ) : null}

            <AppDataTable
                columns={columns}
                data={subjects}
                meta={meta}
                onPageChange={setPage}
                onPerPageChange={(nextPerPage) => {
                    setPerPage(nextPerPage);
                    setPage(1);
                }}
                noDataText="Belum ada data subject."
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
