import { useState } from 'react';
import AppDataTable from '../../components/AppDataTable';
import ExportAnswerKeyDialog from '../../components/ExportAnswerKeyDialog';
import { FiEdit2, FiFile, FiFileText, FiGrid, FiTrash2 } from 'react-icons/fi';
import { formatDateTime } from '../../utils/helpers';

export default function PackageList({ filters, setFilters, setPage, packages, exportPackage, previewPackage, removePackage, bulkRemovePackages, canUpdate, canDelete, canExport, meta, setPerPage, sort, setSort, loading, previewLoading, previewingPackageId }) {
    const [selectedRows, setSelectedRows] = useState([]);
    const [toggleClear, setToggleClear] = useState(false);
    const [exportChoice, setExportChoice] = useState({ open: false, packageId: null, format: null });

    function handleSort(column, direction) {
        setSort({ sortBy: column.sortField ?? '', sortDir: direction });
        setPage(1);
    }

    async function handleBulkDelete() {
        if (!selectedRows.length) return;

        const shouldDelete = window.confirm(`Yakin ingin menghapus ${selectedRows.length} paket terpilih?`);
        if (!shouldDelete) return;

        await bulkRemovePackages(selectedRows.map((row) => row.id));
        setSelectedRows([]);
        setToggleClear((prev) => !prev);
    }

    async function handleDeleteOne(packageId) {
        const shouldDelete = window.confirm('Yakin ingin menghapus paket soal ini?');
        if (!shouldDelete) return;

        await removePackage(packageId);
    }

    function handleExport(packageId, format) {
        if (format === 'pdf' || format === 'word') {
            setExportChoice({ open: true, packageId: packageId, format: format });
            return;
        }

        exportPackage(packageId, format);
    }

    function closeExportChoice() {
        setExportChoice({ open: false, packageId: null, format: null });
    }

    function handleSelectExportOption(includeAnswerKey) {
        if (!exportChoice.packageId || !exportChoice.format) {
            closeExportChoice();
            return;
        }

        exportPackage(exportChoice.packageId, exportChoice.format, includeAnswerKey);
        closeExportChoice();
    }

    const columns = [
        {
            name: 'Paket',
            selector: (item) => item.title,
            sortable: true,
            sortField: 'title',
            grow: 1.4,
            cell: (item) => <strong>{item.title}</strong>,
        },
        {
            name: 'Generator',
            selector: (item) => item.creator?.name ?? '-',
            grow: 1.1,
        },
        {
            name: 'Total',
            width: '120px',
            sortable: true,
            sortField: 'total_questions',
            cell: (item) => <span className="badge">{item.total_questions} soal</span>,
        },
        {
            name: 'Tanggal',
            selector: (item) => formatDateTime(item.generated_at),
            sortable: true,
            sortField: 'generated_at',
            grow: 1.2,
        },
        {
            name: 'Komposisi',
            grow: 2,
            cell: (item) => (
                <div className="chip-row compact-chip-row">
                    {item.rules?.map((rule) => (
                        <span key={rule.id} className="chip">{rule.chapter?.name}: {rule.composition_type === 'percentage' ? `${rule.composition_value}%` : `${rule.composition_value} soal`}</span>
                    ))}
                </div>
            ),
        },
        {
            name: 'Aksi',
            width: '360px',
            cell: (item) => {
                const isPreviewingThisRow = previewLoading && Number(previewingPackageId) === Number(item.id);

                return (
                    <div className="button-row compact table-actions multi-action-cell">
                        <button type="button" className="ghost-button" disabled={!canUpdate || previewLoading} onClick={() => previewPackage(item.id)}>
                            <FiEdit2 /><span>{isPreviewingThisRow ? 'Memuat preview...' : 'Preview'}</span>
                        </button>
                        <button type="button" className="ghost-button" disabled={!canExport || previewLoading} onClick={() => handleExport(item.id, 'excel')}><FiGrid /><span>Excel</span></button>
                        <button type="button" className="ghost-button" disabled={!canExport || previewLoading} onClick={() => handleExport(item.id, 'pdf')}><FiFile /><span>PDF</span></button>
                        <button type="button" className="ghost-button" disabled={!canExport || previewLoading} onClick={() => handleExport(item.id, 'word')}><FiFileText /><span>Word</span></button>
                        <button type="button" className="danger-button" disabled={!canDelete || previewLoading} onClick={() => handleDeleteOne(item.id)}><FiTrash2 /><span>Hapus</span></button>
                    </div>
                );
            },
        },
    ];

    return (
        <article className="panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Riwayat Paket</p>
                    <h2>Filter detail + export</h2>
                </div>
            </div>

            <div className="form-grid filter-bar">
                <label className="filter-field filter-field-search">
                    <span>Cari Paket</span>
                    <input value={filters.search} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })); }} placeholder="Nama paket" />
                </label>
                <label className="filter-field">
                    <span>Dari Tanggal</span>
                    <input type="date" value={filters.from_date} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, from_date: event.target.value })); }} />
                </label>
                <label className="filter-field">
                    <span>Sampai Tanggal</span>
                    <input type="date" value={filters.to_date} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, to_date: event.target.value })); }} />
                </label>
                <label className="filter-field">
                    <span>Min Soal</span>
                    <input type="number" min="1" value={filters.min_questions} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, min_questions: event.target.value })); }} />
                </label>
                <label className="filter-field">
                    <span>Max Soal</span>
                    <input type="number" min="1" value={filters.max_questions} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, max_questions: event.target.value })); }} />
                </label>
            </div>

            {selectedRows.length > 0 && (
                <div className="bulk-action-bar">
                    <span>{selectedRows.length} paket dipilih</span>
                    <button type="button" className="danger-button" onClick={handleBulkDelete} disabled={!canDelete}>
                        <FiTrash2 /><span>Hapus ({selectedRows.length})</span>
                    </button>
                </div>
            )}
            <AppDataTable
                columns={columns}
                data={packages}
                meta={meta}
                onPageChange={setPage}
                onPerPageChange={(nextPerPage) => {
                    setPerPage(nextPerPage);
                    setPage(1);
                }}
                noDataText="Belum ada paket soal."
                sortServer
                onSort={handleSort}
                selectableRows
                onSelectedRowsChange={({ selectedRows: rows }) => setSelectedRows(rows)}
                clearSelectedRows={toggleClear}
                progressPending={loading}
            />

            <ExportAnswerKeyDialog
                open={exportChoice.open}
                format={exportChoice.format}
                onCancel={closeExportChoice}
                onSelect={handleSelectExportOption}
            />
        </article>
    );
}
