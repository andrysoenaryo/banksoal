export default function ExportAnswerKeyDialog({ open, format, onCancel, onSelect }) {
    if (!open || !format) {
        return null;
    }

    const formatLabel = format.toUpperCase();

    return (
        <div className="export-choice-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
            <div className="export-choice-dialog" onClick={(event) => event.stopPropagation()}>
                <p className="eyebrow">Pilihan Export {formatLabel}</p>
                <h3>Sertakan kunci jawaban?</h3>
                <p className="muted">Pilih jenis export {formatLabel} yang kamu butuhkan.</p>

                <div className="button-row">
                    <button type="button" className="primary-button" onClick={() => onSelect(true)}>Dengan Kunci Jawaban</button>
                    <button type="button" className="ghost-button" onClick={() => onSelect(false)}>Tanpa Kunci Jawaban</button>
                    <button type="button" className="danger-button" onClick={onCancel}>Batal</button>
                </div>
            </div>
        </div>
    );
}