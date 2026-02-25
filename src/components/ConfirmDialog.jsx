import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Xác nhận', message = 'Bạn có chắc chắn?', loading }) {
    return (
        <Modal open={open} onClose={onClose} title={title} size="sm">
            <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--hover-bg-danger)' }}>
                    <AlertTriangle className="text-red-500" size={24} />
                </div>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{message}</p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-primary)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        Hủy
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                        className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50">
                        {loading ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
