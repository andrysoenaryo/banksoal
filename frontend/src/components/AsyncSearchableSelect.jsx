import { useCallback, useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 300;

/**
 * Async searchable dropdown — fetches options lazily via `loadOptions`.
 *
 * Props:
 *   value          — current value string
 *   onChange       — called with new value string
 *   loadOptions    — async (searchTerm: string) => Array<{ value, label }>
 *                    Called on open and whenever the search term changes.
 *   displayLabel   — optional label to show for the current value when options
 *                    are not yet loaded (e.g. when editing a prefilled form).
 *   placeholder    — trigger placeholder text
 *   searchPlaceholder
 *   noOptionsText
 *   disabled
 *   required
 *   className
 */
export default function AsyncSearchableSelect({
    value,
    onChange,
    loadOptions,
    displayLabel = '',
    placeholder = 'Pilih opsi',
    searchPlaceholder = 'Ketik untuk mencari...',
    noOptionsText = 'Data tidak ditemukan.',
    disabled = false,
    required = false,
    className = '',
}) {
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const optionRefs = useRef([]);
    const debounceTimer = useRef(null);
    const latestRequestId = useRef(0);

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);

    // Derive the label to show when the menu is closed
    const closedLabel = options.find((option) => String(option.value) === String(value ?? ''))?.label ?? displayLabel;

    const fetchOptions = useCallback(async (term) => {
        const requestId = ++latestRequestId.current;
        setLoading(true);

        try {
            const results = await loadOptions(term);

            // Discard stale responses
            if (requestId !== latestRequestId.current) {
                return;
            }

            setOptions(results);
            setHighlighted(-1);
        } catch {
            // silently ignore errors
        } finally {
            if (requestId === latestRequestId.current) {
                setLoading(false);
            }
        }
    }, [loadOptions]);

    // Load options on open
    useEffect(() => {
        if (isOpen) {
            fetchOptions('');
        }
    }, [isOpen, fetchOptions]);

    // Debounce search-term changes
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            fetchOptions(searchTerm);
        }, DEBOUNCE_MS);

        return () => clearTimeout(debounceTimer.current);
    }, [searchTerm, isOpen, fetchOptions]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlighted >= 0) {
            optionRefs.current[highlighted]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlighted]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        function handlePointerDown(event) {
            if (!containerRef.current?.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
                setHighlighted(-1);
            }
        }

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [isOpen]);

    // Auto-focus search input on open
    useEffect(() => {
        if (isOpen) {
            searchInputRef.current?.focus();
        }
    }, [isOpen]);

    function handleToggle() {
        if (disabled) {
            return;
        }

        setIsOpen((current) => !current);
        setSearchTerm('');
        setHighlighted(-1);
    }

    function handleSelect(optionValue) {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
        setHighlighted(-1);
    }

    function handleKeyDown(event) {
        if (!isOpen) {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsOpen(true);
            }

            return;
        }

        if (event.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
            setHighlighted(-1);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlighted((current) => Math.min(current + 1, options.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted((current) => Math.max(current - 1, -1));
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (highlighted >= 0 && highlighted < options.length) {
                handleSelect(options[highlighted].value);
            }
        }
    }

    return (
        <div ref={containerRef} className={`searchable-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`.trim()} onKeyDown={handleKeyDown}>
            {required && !disabled ? (
                <input
                    className="searchable-select-proxy"
                    tabIndex={-1}
                    aria-hidden="true"
                    value={value ?? ''}
                    onChange={() => {}}
                    required
                />
            ) : null}
            <button
                type="button"
                className="searchable-select-trigger"
                onClick={handleToggle}
                disabled={disabled}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className={`searchable-select-value ${closedLabel ? '' : 'placeholder'}`.trim()}>
                    {closedLabel || placeholder}
                </span>
                <span className="searchable-select-caret">▾</span>
            </button>
            {isOpen ? (
                <div className="searchable-select-menu">
                    <input
                        ref={searchInputRef}
                        className="searchable-select-input"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={searchPlaceholder}
                        aria-autocomplete="list"
                    />
                    <div className="searchable-select-options" role="listbox">
                        {loading ? (
                            <div className="searchable-select-empty">Memuat data...</div>
                        ) : options.length > 0 ? options.map((option, index) => (
                            <button
                                key={`${option.value}`}
                                ref={(element) => { optionRefs.current[index] = element; }}
                                type="button"
                                role="option"
                                aria-selected={String(option.value) === String(value ?? '')}
                                className={[
                                    'searchable-select-option',
                                    String(option.value) === String(value ?? '') ? 'active' : '',
                                    highlighted === index ? 'highlighted' : '',
                                ].filter(Boolean).join(' ')}
                                onClick={() => handleSelect(option.value)}
                                onMouseEnter={() => setHighlighted(index)}
                            >
                                {option.label}
                            </button>
                        )) : (
                            <div className="searchable-select-empty">{noOptionsText}</div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
