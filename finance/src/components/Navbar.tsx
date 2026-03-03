import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Home, PieChart, PenTool, Database } from 'lucide-react';

interface NavbarProps {
    user: User;
}

export default function Navbar({ user }: NavbarProps) {
    const handleLogout = () => signOut(auth);
    const location = useLocation();

    return (
        <nav className="glass-card" style={{ margin: '1rem', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem' }}>
            <Link to="/" className="text-gradient" style={{ fontWeight: 800, fontSize: '1.25rem' }}>JING</Link>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <NavLink to="/" icon={<Home size={20} />} label="首頁" active={location.pathname === '/'} />
                <NavLink to="/config" icon={<PenTool size={20} />} label="配置" active={location.pathname === '/config'} />
                <NavLink to="/ai" icon={<PieChart size={20} />} label="分析" active={location.pathname === '/ai'} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src={user.photoURL || ''} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                <button onClick={handleLogout} className="flex-center" style={{ color: 'var(--text-muted)' }}>
                    <LogOut size={20} />
                </button>
            </div>
        </nav>
    );
}

function NavLink({ to, icon, label, active = false }: { to: string; icon: any, label: string; active?: boolean }) {
    return (
        <Link to={to} className="flex-center" style={{
            gap: '0.5rem',
            color: active ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            background: active ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            transition: 'var(--transition)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            minWidth: '70px'
        }}>
            <div className="flex-center" style={{ gap: '0.5rem' }}>
                {icon}
                <div style={{ position: 'relative' }}>
                    <span style={{
                        fontSize: '0.9rem',
                        fontWeight: active ? 600 : 400,
                        transition: 'font-weight 0.2s ease'
                    }}>
                        {label}
                    </span>
                    {/* Hidden bold label to reserve space and prevent layout shift */}
                    <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        visibility: 'hidden',
                        height: 0,
                        display: 'block',
                        overflow: 'hidden'
                    }}>
                        {label}
                    </span>
                </div>
            </div>
        </Link>
    );
}
