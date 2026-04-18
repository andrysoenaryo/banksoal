import { FiChevronLeft, FiChevronRight, FiList } from 'react-icons/fi';
import SearchableSelect from './SearchableSelect';

export default function PaginationControls({ meta, onPageChange, onPerPageChange }) {
    return (
        <div className="pagination-row">
            <div className="muted">
                Menampilkan {meta.from ?? 0}-{meta.to ?? 0} dari {meta.total ?? 0} data
            </div>
            <div className="button-row compact">
                <SearchableSelect
                    value={meta.per_page}
                    onChange={(value) => onPerPageChange(Number(value))}
                    options={[10, 20, 50].map((size) => ({ value: size, label: `${size}/hal` }))}
                    className="pagination-select"
                />
                <button type="button" className="ghost-button" disabled={meta.current_page <= 1} onClick={() => onPageChange(meta.current_page - 1)}><FiChevronLeft /><span>Prev</span></button>
                <span className="page-indicator"><FiList /> {meta.current_page} / {meta.last_page}</span>
                <button type="button" className="ghost-button" disabled={meta.current_page >= meta.last_page} onClick={() => onPageChange(meta.current_page + 1)}><span>Next</span><FiChevronRight /></button>
            </div>
        </div>
    );
}
