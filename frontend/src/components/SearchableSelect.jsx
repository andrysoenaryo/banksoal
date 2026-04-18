import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_LIMIT = 10;

function getOptionSearchText(option) {
    if (typeof option.searchText === 'string') {
        return option.searchText;
    }

    if (typeof option.selectedLabel === 'string') {
        return option.selectedLabel;
    }

    if (typeof option.label === 'string') {
        return option.label;
    }

    return String(option.value ?? '');
}

export default function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = 'Pilih opsi',
    searchPlaceholder = 'Ketik untuk mencari...',
    noOptionsText = 'Data tidak ditemukan.',
    disabled = false,
    required = false,
    limit = DEFAULT_LIMIT,
    className = '',
}) {
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const optionRefs = useRef([]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlighted, setHighlighted] = useState(-1);

    const selectedOption = useMemo(
        () => options.find((option) => String(option.value) === String(value ?? '')),
        [options, value]
    );

    const filteredOptions = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return options
            .filter((option) => normalizedSearch === '' || getOptionSearchText(option).toLowerCase().includes(normalizedSearch))
            .slice(0, limit);
    }, [limit, options, searchTerm]);

    // Reset highlighted when options change
    useEffect(() => {
        setHighlighted(-1);
    }, [filteredOptions]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlighted >= 0) {
            optionRefs.current[highlighted]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlighted]);

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
            setHighlighted((current) => Math.min(current + 1, filteredOptions.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted((current) => Math.max(current - 1, -1));
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (highlighted >= 0 && highlighted < filteredOptions.length) {
                handleSelect(filteredOptions[highlighted].value);
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
                <span className={`searchable-select-value ${selectedOption ? '' : 'placeholder'}`.trim()}>
                    {selectedOption?.selectedLabel ?? selectedOption?.label ?? placeholder}
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
                        {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
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
