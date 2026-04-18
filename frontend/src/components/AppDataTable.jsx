import DataTable from 'react-data-table-component';

const customStyles = {
    table: {
        style: {
            backgroundColor: '#ffffff',
        },
    },
    headRow: {
        style: {
            minHeight: '56px',
            backgroundColor: '#f8faff',
            borderBottomWidth: '1px',
            borderBottomColor: '#e6eaf2',
            position: 'sticky',
            top: 0,
            zIndex: 1,
        },
    },
    headCells: {
        style: {
            fontSize: '0.9rem',
            fontWeight: 700,
            color: '#4b5563',
            paddingLeft: '1rem',
            paddingRight: '1rem',
        },
    },
    rows: {
        style: {
            minHeight: '64px',
            fontSize: '0.95rem',
            color: '#1f2937',
            '&:not(:last-of-type)': {
                borderBottomWidth: '1px',
                borderBottomColor: '#e6eaf2',
            },
        },
        stripedStyle: {
            backgroundColor: '#fbfcff',
        },
        highlightOnHoverStyle: {
            backgroundColor: '#f3f7ff',
            transitionDuration: '150ms',
            outlineStyle: 'none',
        },
    },
    cells: {
        style: {
            paddingLeft: '1rem',
            paddingRight: '1rem',
            alignItems: 'flex-start',
        },
    },
    pagination: {
        style: {
            borderTopWidth: '1px',
            borderTopColor: '#e6eaf2',
            minHeight: '64px',
            fontSize: '0.9rem',
        },
        pageButtonsStyle: {
            borderRadius: '999px',
            height: '34px',
            width: '34px',
            padding: 0,
            margin: '0 2px',
        },
    },
    noData: {
        style: {
            padding: '1.5rem',
            color: '#6b7280',
            fontSize: '0.95rem',
        },
    },
};

export default function AppDataTable({
    columns,
    data,
    meta,
    onPageChange,
    onPerPageChange,
    noDataText = 'Belum ada data.',
    // sorting
    sortServer = false,
    onSort,
    defaultSortFieldId,
    defaultSortAsc = true,
    // selection
    selectableRows = false,
    onSelectedRowsChange,
    contextActions,
    clearSelectedRows = false,
    // loading
    progressPending = false,
}) {
    return (
        <div className="datatable-shell">
            <DataTable
                columns={columns}
                data={data}
                customStyles={customStyles}
                striped
                highlightOnHover
                responsive
                persistTableHead
                noDataComponent={noDataText}
                pagination
                paginationServer
                paginationTotalRows={meta.total ?? data.length}
                paginationDefaultPage={meta.current_page ?? 1}
                paginationPerPage={meta.per_page ?? 10}
                paginationRowsPerPageOptions={[10, 20, 50]}
                onChangePage={onPageChange}
                onChangeRowsPerPage={(rowsPerPage) => onPerPageChange(rowsPerPage)}
                sortServer={sortServer}
                onSort={onSort}
                defaultSortFieldId={defaultSortFieldId}
                defaultSortAsc={defaultSortAsc}
                selectableRows={selectableRows}
                onSelectedRowsChange={onSelectedRowsChange}
                contextActions={contextActions}
                clearSelectedRows={clearSelectedRows}
                progressPending={progressPending}
            />
        </div>
    );
}
