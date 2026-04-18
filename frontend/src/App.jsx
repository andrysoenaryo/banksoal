import { useEffect, useMemo, useState } from 'react';
import { FiBookOpen, FiBookmark, FiChevronRight, FiFileText, FiGrid, FiHome, FiLayers, FiLogOut, FiMenu, FiShield, FiUsers } from 'react-icons/fi';
import LoginScreen from './components/LoginScreen';
import { resolveFeatherIcon } from './config/featherIcons';
import { STORAGE_KEY } from './config/constants';
import ChaptersView from './views/ChaptersView';
import DashboardView from './views/DashboardView';
import MenusView from './views/MenusView';
import PackagesView from './views/PackagesView';
import QuestionsView from './views/QuestionsView';
import RolesView from './views/RolesView';
import SubjectsView from './views/SubjectsView';
import UsersView from './views/UsersView';
import { buildClient } from './utils/client';
import { extractError } from './utils/helpers';

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});

const NAV_ICONS = {
    FiGrid,
    FiBookmark,
    FiLayers,
    FiBookOpen,
    FiFileText,
    FiUsers,
    FiShield,
    FiMenu,
    dashboard: FiGrid,
    subjects: FiBookmark,
    chapters: FiLayers,
    questions: FiBookOpen,
    packages: FiFileText,
    users: FiUsers,
    roles: FiShield,
    menus: FiMenu,
};

const RENDERABLE_VIEWS = new Set([
    'dashboard',
    'subjects',
    'chapters',
    'questions',
    'packages',
    'users',
    'roles',
    'menus',
]);

function flattenNavItems(items) {
    return items.flatMap((item) => [item, ...flattenNavItems(item.children ?? [])]);
}

function App() {
    const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
    const [user, setUser] = useState(null);
    const [activeView, setActiveView] = useState('dashboard');
    const [navItems, setNavItems] = useState([]);
    const [status, setStatus] = useState({ type: 'idle', message: '' });
    const [checkingAuth, setCheckingAuth] = useState(Boolean(token));
    const [isMobileNav, setIsMobileNav] = useState(() => window.matchMedia('(max-width: 900px)').matches);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const client = useMemo(() => buildClient(token), [token]);

    useEffect(() => {
        if (!status.message) {
            return;
        }

        const timeoutId = setTimeout(() => {
            setStatus({ type: 'idle', message: '' });
        }, 4000);

        return () => clearTimeout(timeoutId);
    }, [status.message]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 900px)');

        function handleChange(event) {
            setIsMobileNav(event.matches);

            if (!event.matches) {
                setIsSidebarOpen(false);
            }
        }

        setIsMobileNav(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    useEffect(() => {
        if (!isMobileNav) {
            document.body.style.overflow = '';
            return;
        }

        document.body.style.overflow = isSidebarOpen ? 'hidden' : '';

        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileNav, isSidebarOpen]);

    useEffect(() => {
        if (!token) {
            setCheckingAuth(false);
            setUser(null);
            setNavItems([]);
            return;
        }

        let cancelled = false;
        setCheckingAuth(true);

        client.get('/me')
            .then(async (response) => {
                if (cancelled) {
                    return;
                }

                setUser(response.data.user);
                try {
                    const menusResponse = await client.get('/menus/navigation');
                    const nextNavItems = menusResponse.data?.data ?? [];
                    setNavItems(nextNavItems);
                    setActiveView((currentView) => {
                        if (currentView && flattenNavItems(nextNavItems).some((item) => item.key === currentView)) {
                            return currentView;
                        }

                        const firstRenderable = flattenNavItems(nextNavItems).find((item) => RENDERABLE_VIEWS.has(item.key));

                        return firstRenderable?.key ?? 'dashboard';
                    });
                } catch {
                    setNavItems([]);
                    setActiveView('dashboard');
                }
            })
            .catch(() => {
                if (!cancelled) {
                    localStorage.removeItem(STORAGE_KEY);
                    setToken('');
                    setUser(null);
                    setNavItems([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setCheckingAuth(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [client, token]);

    const visibleNavItems = user ? navItems : [];
    const flatNavItems = useMemo(() => flattenNavItems(visibleNavItems), [visibleNavItems]);

    const [openGroups, setOpenGroups] = useState(() => new Set());

    useEffect(() => {
        setOpenGroups((prev) => {
            const next = new Set(prev);
            function findAncestors(items, target) {
                for (const item of items) {
                    if (item.key === target) return true;
                    if (Array.isArray(item.children) && item.children.length > 0) {
                        if (findAncestors(item.children, target)) {
                            next.add(item.key);
                            return true;
                        }
                    }
                }
                return false;
            }
            findAncestors(visibleNavItems, activeView);
            return next;
        });
    }, [activeView, visibleNavItems]);

    const activeItem = flatNavItems.find((item) => item.key === activeView);
    const now = new Date();
    const pageTime = `${DATE_FORMATTER.format(now)} pukul ${TIME_FORMATTER.format(now)}`;

    useEffect(() => {
        if (!user || flatNavItems.some((item) => item.key === activeView)) {
            return;
        }

        const firstRenderable = flatNavItems.find((item) => RENDERABLE_VIEWS.has(item.key));
        setActiveView(firstRenderable?.key ?? 'dashboard');
    }, [activeView, user, flatNavItems]);

    async function handleLogin(credentials) {
        const response = await buildClient('').post('/login', credentials);
        localStorage.setItem(STORAGE_KEY, response.data.token);
        setToken(response.data.token);
        setUser(response.data.user);
        setStatus({ type: 'success', message: 'Login berhasil.' });
    }

    async function handleLogout() {
        try {
            await client.post('/logout');
        } catch {
        }

        localStorage.removeItem(STORAGE_KEY);
        setToken('');
        setUser(null);
        setStatus({ type: 'success', message: 'Sesi telah diakhiri.' });
    }

    function handleError(error) {
        setStatus({ type: 'error', message: extractError(error) });
    }

    if (checkingAuth) {
        return (
            <div className="screen-state">
                <div className="loading-content">
                    <div className="loading-spinner"></div>
                    <div className="loading-text">
                        <p>Memeriksa sesi login...</p>
                        <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>Silakan tunggu</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!token || !user) {
        return <LoginScreen onLogin={handleLogin} onError={handleError} status={status} />;
    }

    function handleSelectView(nextView) {
        setActiveView(nextView);

        if (isMobileNav) {
            setIsSidebarOpen(false);
        }
    }

    async function reloadNavigation() {
        if (!token) {
            return;
        }

        try {
            const menusResponse = await client.get('/menus/navigation');
            const nextNavItems = menusResponse.data?.data ?? [];
            setNavItems(nextNavItems);
            setActiveView((current) => {
                if (flattenNavItems(nextNavItems).some((item) => item.key === current)) {
                    return current;
                }

                const firstRenderable = flattenNavItems(nextNavItems).find((item) => RENDERABLE_VIEWS.has(item.key));

                return firstRenderable?.key ?? 'dashboard';
            });
        } catch {
            setNavItems([]);
        }
    }

    function toggleGroup(key) {
        setOpenGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }

    function renderNavItems(items, level = 0, parentPath = 'root') {
        return items.map((item, index) => {
            const Icon = resolveFeatherIcon(item.icon) ?? NAV_ICONS[item.key] ?? FiGrid;
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            const canNavigate = RENDERABLE_VIEWS.has(item.key);
            const navKey = `${parentPath}-${item.key}-${index}`;
            const isOpen = openGroups.has(item.key);

            return (
                <div key={navKey} className={`nav-item level-${level}`}>
                    {canNavigate ? (
                        <button
                            type="button"
                            className={`nav-button ${activeView === item.key ? 'active' : ''} ${level > 0 ? 'child' : ''}`}
                            onClick={() => { handleSelectView(item.key); if (hasChildren) toggleGroup(item.key); }}
                        >
                            <span className="nav-button-icon"><Icon /></span>
                            <span className="nav-button-label">{item.label}</span>
                            {hasChildren ? <span className={`nav-arrow ${isOpen ? 'open' : ''}`}>&#8250;</span> : null}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={`nav-group-title ${level > 0 ? 'child' : ''}`}
                            onClick={() => hasChildren && toggleGroup(item.key)}
                        >
                            <span className="nav-button-icon"><Icon /></span>
                            <span className="nav-button-label">{item.label}</span>
                            {hasChildren ? <span className={`nav-arrow ${isOpen ? 'open' : ''}`}>&#8250;</span> : null}
                        </button>
                    )}

                    {hasChildren ? (
                        <div className={`nav-subgrid ${isOpen ? 'open' : ''}`}>
                            {renderNavItems(item.children, level + 1, navKey)}
                        </div>
                    ) : null}
                </div>
            );
        });
    }

    return (
        <div className={`app-shell ${isMobileNav ? 'mobile' : ''}`}>
            {isMobileNav ? (
                <button
                    type="button"
                    className="mobile-nav-toggle"
                    aria-expanded={isSidebarOpen}
                    aria-controls="main-sidebar"
                    onClick={() => setIsSidebarOpen((current) => !current)}
                >
                    {isSidebarOpen ? 'Tutup Menu' : 'Buka Menu'}
                </button>
            ) : null}

            {isMobileNav && isSidebarOpen ? <button type="button" className="mobile-backdrop" aria-label="Tutup sidebar" onClick={() => setIsSidebarOpen(false)} /> : null}

            <aside id="main-sidebar" className={`sidebar ${isMobileNav ? 'mobile' : ''} ${isSidebarOpen ? 'open' : ''}`}>
                <div>
                    <p className="shell-brand">Dashboard Guru</p>
                    <p className="sidebar-copy">Kelola bank soal, jadwal, dan paket ujian dalam satu panel.</p>
                </div>

                <div className="profile-card">
                    <p className="profile-name">{user.name}</p>
                    <p className="profile-email">{user.email}</p>
                    <p className="profile-role">{user.roles.join(', ') || 'Tanpa role'}</p>
                </div>

                <p className="sidebar-menu-title">Menu Navigasi</p>
                <nav className="nav-grid">
                    {renderNavItems(visibleNavItems)}
                </nav>

                <button type="button" className="ghost-button sidebar-logout" onClick={handleLogout}>
                    <span className="nav-button-icon"><FiLogOut /></span>
                    <span>Logout</span>
                </button>
            </aside>

            <main className="content-area">
                <section className="content-topbar">
                    <div>
                        <div className="breadcrumb-row">
                            <span className="breadcrumb-item"><FiHome /> Dashboard</span>
                            <span className="breadcrumb-separator"><FiChevronRight /></span>
                            <span className="breadcrumb-item current">{activeItem?.label ?? 'Dashboard'}</span>
                        </div>
                        <h2 className="welcome-title">Selamat Datang, {user.name}</h2>
                        <p className="welcome-time">{pageTime}</p>
                    </div>
                    <div className="topbar-profile">
                        <span className="topbar-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                        <div>
                            <strong>{user.name}</strong>
                            <p className="muted topbar-role">{activeItem?.label ?? 'Dashboard'}</p>
                        </div>
                    </div>
                </section>

                {status.message ? <div className={`status-banner ${status.type}`}>{status.message}</div> : null}

                {activeView === 'dashboard' ? <DashboardView client={client} user={user} onError={handleError} onNavigate={handleSelectView} /> : null}
                {activeView === 'subjects' ? <SubjectsView client={client} user={user} onStatus={setStatus} onError={handleError} /> : null}
                {activeView === 'chapters' ? <ChaptersView client={client} user={user} onStatus={setStatus} onError={handleError} /> : null}
                {activeView === 'questions' ? <QuestionsView client={client} user={user} onStatus={setStatus} onError={handleError} /> : null}
                {activeView === 'packages' ? <PackagesView client={client} user={user} onStatus={setStatus} onError={handleError} /> : null}
                {activeView === 'users' ? <UsersView client={client} user={user} onStatus={setStatus} onError={handleError} /> : null}
                {activeView === 'roles' ? <RolesView client={client} user={user} onStatus={setStatus} onError={handleError} /> : null}
                {activeView === 'menus' ? <MenusView client={client} user={user} onStatus={setStatus} onError={handleError} onNavigationChanged={reloadNavigation} /> : null}
            </main>
        </div>
    );
}

export default App;
