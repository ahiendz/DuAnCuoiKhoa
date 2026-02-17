import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Xác nhận', message = 'Bạn có chắc chắn?', loading }) {
    return (
        <Modal open={open} onClose={onClose} title={title} size="sm">
            <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                    <AlertTriangle className="text-red-500" size={24} />
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium">
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
