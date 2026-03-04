import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onConfirm, onCancel }) => {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(10px)' }}>
            <div className="glass-card" style={{ maxWidth: '400px', width: '100%', border: '1px solid var(--primary)', padding: '2rem', animation: 'modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px', borderRadius: '12px' }}>
                        <AlertCircle size={24} color="var(--primary)" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h3>
                </div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>{message}</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button onClick={onCancel} className="btn-secondary" style={{ flex: 1 }}>取消</button>
                    <button onClick={onConfirm} className="btn-primary" style={{ flex: 1 }}>確認</button>
                </div>
            </div>
            <style>{`
                @keyframes modal-pop {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ConfirmModal;
