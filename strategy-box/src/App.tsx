import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MonthlyConfig from './pages/MonthlyConfig';
import Holdings from './pages/Holdings';
import AIAnalyst from './pages/AIAnalyst';
import './index.css';

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '100vh' }}>
                <div className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 600 }}>JING Loading...</div>
            </div>
        );
    }

    return (
        <Router basename="/finance">
            {user && <Navbar user={user} />}
            <main style={{ flex: 1, padding: user ? '2rem' : '0' }}>
                <Routes>
                    <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                    <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
                    <Route path="/config" element={user ? <MonthlyConfig /> : <Navigate to="/login" />} />
                    <Route path="/holdings" element={user ? <Holdings /> : <Navigate to="/login" />} />
                    <Route path="/ai" element={user ? <AIAnalyst /> : <Navigate to="/login" />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
        </Router>
    );
}

export default App;
