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
        <nav className="glass-card" style={{
            margin: '1.25rem',
            borderRadius: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 1.5rem',
            height: '64px'
        }}>
            <Link to="/" className="text-gradient" style={{
                fontWeight: 900,
                fontSize: '1.4rem',
                letterSpacing: '-0.05em',
                marginRight: '1rem'
            }}>JING</Link>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', height: '100%' }}>
                <NavLink to="/" icon={<Home size={20} />} label="首頁" active={location.pathname === '/'} />
                <NavLink to="/config" icon={<PenTool size={20} />} label="配置" active={location.pathname === '/config'} />
                <NavLink to="/ai" icon={<PieChart size={20} />} label="分析" active={location.pathname === '/ai'} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                    padding: '2px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))'
                }}>
                    <img src={user.photoURL || ''} alt="avatar" style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'block',
                        background: 'var(--background)'
                    }} />
                </div>
                <button onClick={handleLogout} className="icon-btn" style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)'
                }}>
                    <LogOut size={18} />
                </button>
            </div>
        </nav>
    );
}

function NavLink({ to, icon, label, active = false }: { to: string; icon: any, label: string; active?: boolean }) {
    return (
        <Link to={to} className="nav-link-item" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: active ? 'white' : 'var(--text-muted)',
            padding: '0.6rem 1rem',
            borderRadius: '1rem',
            background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            transition: 'var(--transition)',
            position: 'relative',
            fontWeight: active ? 600 : 500,
            whiteSpace: 'nowrap'
        }}>
            <span style={{
                color: active ? 'var(--primary)' : 'inherit',
                display: 'flex',
                alignItems: 'center'
            }}>
                {icon}
            </span>
            <span className="nav-label" style={{ fontSize: '0.9rem' }}>
                {label}
            </span>
            <style>{`
                .nav-link-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-main);
                }
                @media (max-width: 600px) {
                    .nav-label { display: none !important; }
                    .nav-link-item { padding: 0.75rem; border-radius: 12px; }
                }
            `}</style>
        </Link>
    );
}
