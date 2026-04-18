import { useState } from 'react';
import AppDataTable from '../../components/AppDataTable';
import SearchableSelect from '../../components/SearchableSelect';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function ChapterList({ filters, setFilters, setPage, subjects, chapters, setForm, removeChapter, bulkRemoveChapters, canEdit, canDelete, meta, setPerPage, sort, setSort, loading }) {
    const [selectedRows, setSelectedRows] = useState([]);
    const [toggleClear, setToggleClear] = useState(false);

    function handleSort(column, direction) {
        setSort({ sortBy: column.sortField ?? '', sortDir: direction });
        setPage(1);
    }

    async function handleBulkDelete() {
        if (!selectedRows.length) return;

        const shouldDelete = window.confirm(`Yakin ingin menghapus ${selectedRows.length} bab terpilih?`);
        if (!shouldDelete) return;

        await bulkRemoveChapters(selectedRows.map((row) => row.id));
        setSelectedRows([]);
        setToggleClear((prev) => !prev);
    }

    async function handleDeleteOne(chapterId) {
        const shouldDelete = window.confirm('Yakin ingin menghapus bab ini?');
        if (!shouldDelete) return;

        await removeChapter(chapterId);
    }

    const columns = [
        {
            name: 'Bab',
            grow: 2,
            sortable: true,
            sortField: 'name',
            cell: (chapter) => (
                <div>
                    <strong>{chapter.name}</strong>
                    {chapter.description ? <p className="table-note">{chapter.description}</p> : null}
                </div>
            ),
        },
        {
            name: 'Parent',
            selector: (chapter) => chapter.parent?.name ?? 'Bab Utama',
        },
        {
            name: 'Subject',
            selector: (chapter) => chapter.subject?.name ?? '-',
            width: '180px',
        },
        {
            name: 'Jumlah Soal',
            selector: (chapter) => chapter.questions_count,
            sortable: true,
            sortField: 'questions_count',
            width: '140px',
        },
        {
            name: 'Status',
            cell: (chapter) => <span className="badge">{chapter.is_active ? 'Aktif' : 'Nonaktif'}</span>,
            width: '140px',
        },
        {
            name: 'Urutan',
            selector: (chapter) => chapter.sort_order,
            sortable: true,
            sortField: 'sort_order',
            width: '120px',
        },
        {
            name: 'Aksi',
            width: '220px',
            cell: (chapter) => (
                <div className="button-row compact table-actions">
                    <button type="button" className="ghost-button" disabled={!canEdit} onClick={() => setForm({
                        id: chapter.id,
                        subject_id: String(chapter.subject_id ?? ''),
                        parent_id: chapter.parent_id ?? '',
                        name: chapter.name,
                        description: chapter.description ?? '',
                        sort_order: chapter.sort_order,
                        is_active: chapter.is_active,
                    })}><FiEdit2 /><span>Edit</span></button>
                    <button type="button" className="danger-button" disabled={!canDelete} onClick={() => handleDeleteOne(chapter.id)}><FiTrash2 /><span>Hapus</span></button>
                </div>
            ),
        },
    ];

    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">List Bab</p>
                    <h3>Filter & pagination</h3>
                </div>
            </div>

            <div className="form-grid filter-bar">
                <label className="filter-field filter-field-search">
                    <span>Cari</span>
                    <input value={filters.search} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })); }} placeholder="Nama/deskripsi" />
                </label>
                <label className="filter-field">
                    <span>Subject</span>
                    <SearchableSelect
                        value={filters.subject_id}
                        onChange={(value) => { setPage(1); setFilters((current) => ({ ...current, subject_id: value })); }}
                        options={[{ value: '', label: 'Semua' }, ...subjects.map((subject) => ({ value: String(subject.id), label: subject.name }))]}
                        placeholder="Semua"
                        searchPlaceholder="Cari subject..."
                    />
                </label>
                <label className="filter-field">
                    <span>Scope</span>
                    <SearchableSelect
                        value={filters.scope}
                        onChange={(value) => { setPage(1); setFilters((current) => ({ ...current, scope: value })); }}
                        options={[{ value: '', label: 'Semua' }, { value: 'root', label: 'Bab utama' }, { value: 'sub', label: 'Sub bab' }]}
                        placeholder="Semua"
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
                    <span>{selectedRows.length} bab dipilih</span>
                    <button type="button" className="danger-button" onClick={handleBulkDelete} disabled={!canDelete}>
                        <FiTrash2 /><span>Hapus ({selectedRows.length})</span>
                    </button>
                </div>
            )}
            <AppDataTable
                columns={columns}
                data={chapters}
                meta={meta}
                onPageChange={setPage}
                onPerPageChange={(nextPerPage) => {
                    setPerPage(nextPerPage);
                    setPage(1);
                }}
                noDataText="Belum ada data bab."
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
