import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Login() {
    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    return (
        <div className="flex-center animate-fade-in" style={{ height: '100vh', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
                <h1 className="text-gradient" style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>JING</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>個人理財管理系統</p>
            </div>

            <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>歡迎回來</h2>
                <button onClick={handleLogin} className="btn-primary" style={{ width: '100%', display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
                    使用 Google 登入
                </button>
                <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    需使用 Firebase 專案 JING 下的資料庫
                </p>
            </div>
        </div>
    );
}
