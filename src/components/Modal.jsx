import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                role="button"
                tabIndex={0}
                aria-label="Close modal"
                className="fixed inset-0 backdrop-blur-sm"
                style={{ backgroundColor: 'var(--overlay-bg)' }}
                onClick={onClose}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
            />
            <div
                className={cn("relative rounded-2xl w-full overflow-hidden", sizes[size])}
                style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-modal)',
                }}
            >
                <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-placeholder)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}
