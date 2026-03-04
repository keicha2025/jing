import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
    label: string;
    value: string;
}

interface DropdownProps {
    label?: string;
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
    style?: React.CSSProperties;
}

const Dropdown: React.FC<DropdownProps> = ({ label, options, value, onChange, className, style }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className={`dropdown-container ${className || ''}`} style={{ position: 'relative', width: '100%', ...style }}>
            {label && <label className="input-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</label>}

            <div
                className="input-field w-full flex-between"
                onClick={() => setIsOpen(!isOpen)}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <span>{selectedOption?.label || '請選擇'}</span>
                <ChevronDown size={16} style={{ transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
            </div>

            {isOpen && (
                <div
                    className="glass-card dropdown-list"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '0.5rem',
                        zIndex: 100,
                        padding: '0.5rem',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid var(--surface-border)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                    }}
                >
                    {options.map(opt => (
                        <div
                            key={opt.value}
                            className={`dropdown-option ${value === opt.value ? 'active' : ''}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '0.6rem',
                                cursor: 'pointer',
                                transition: 'var(--transition)',
                                backgroundColor: value === opt.value ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                color: value === opt.value ? 'var(--primary)' : 'var(--text-main)'
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .dropdown-option:hover {
                    background: rgba(255, 255, 255, 0.05) !important;
                }
                .dropdown-option.active:hover {
                    background: rgba(99, 102, 241, 0.15) !important;
                }
            `}</style>
        </div>
    );
};

export default Dropdown;
