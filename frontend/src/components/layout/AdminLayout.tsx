import React, { memo, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    BadgePercent,
    Bike,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquare,
    PanelLeftClose,
    PanelLeftOpen,
    Percent,
    Settings,
    ShieldCheck,
    ShoppingBag,
    Star,
    Store,
    UserCircle,
    Users,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import UserAvatar from '../common/UserAvatar';
import { useLogoutMutation } from '../../store/api/authApi';
import { useGetAdminSettingsQuery, useUpdateAdminSettingsMutation } from '../../store/api/adminSettingsApi';

interface NavigationItem {
    path: string;
    icon: LucideIcon;
    label: string;
    end?: boolean;
}

const navigationItems: NavigationItem[] = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/menu', icon: ShoppingBag, label: 'Menu' },
    { path: '/admin/featured-food', icon: Star, label: 'Featured Food' },
    { path: '/admin/restaurants', icon: Store, label: 'Restaurants' },
    { path: '/admin/commissions', icon: Percent, label: 'Commissions' },
    { path: '/admin/restaurant-name-requests', icon: ShieldCheck, label: 'Name Requests' },
    { path: '/admin/delivery-management', icon: Bike, label: 'Delivery Management' },
    { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/admin/reviews', icon: MessageSquare, label: 'Reviews' },
    { path: '/admin/campaigns', icon: BadgePercent, label: 'Campaigns' },
];

interface SidebarLinkProps extends NavigationItem {
    collapsed: boolean;
    onNavigate?: () => void;
    disableActive?: boolean;
}

const SidebarLink = memo(({ path, icon: Icon, label, end, collapsed, onNavigate, disableActive }: SidebarLinkProps) => (
    <NavLink
        to={path}
        end={end}
        onClick={onNavigate}
        aria-label={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
        className={({ isActive }) => `group relative flex min-h-11 items-center rounded-xl px-3 py-2.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
            collapsed ? 'justify-center' : 'gap-3'
        } ${isActive && !disableActive ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
    >
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="min-w-0 truncate text-sm font-medium">{label}</span>}
        {collapsed && (
            <span role="tooltip" className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-lg border border-white/10 bg-dark-100 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl group-hover:block group-hover:opacity-100 group-focus-visible:block group-focus-visible:opacity-100">
                {label}
            </span>
        )}
    </NavLink>
));

interface AdminSidebarProps {
    collapsed: boolean;
    mobile: boolean;
    onClose: () => void;
    onToggleCollapse: () => void;
    language: 'en' | 'bn';
}

const banglaLabels:Record<string,string>={Dashboard:'ড্যাশবোর্ড',Users:'ব্যবহারকারী',Menu:'মেনু','Featured Food':'ফিচার্ড খাবার',Restaurants:'রেস্টুরেন্ট',Commissions:'কমিশন','Name Requests':'নাম পরিবর্তনের অনুরোধ','Delivery Management':'ডেলিভারি ব্যবস্থাপনা',Orders:'অর্ডার',Reviews:'রিভিউ',Campaigns:'ক্যাম্পেইন',Settings:'সেটিংস',Profile:'প্রোফাইল',Logout:'লগআউট'};
const AdminSidebar = ({ collapsed, mobile, onClose, onToggleCollapse, language }: AdminSidebarProps) => {
    const dispatch = useAppDispatch();
    const user = useAppSelector(state => state.auth.user);
    const [logoutRequest] = useLogoutMutation();
    const compact = collapsed && !mobile;
    const label=(english:string)=>language==='bn'?banglaLabels[english]||english:english;

    return (
        <aside
            id={mobile ? 'admin-sidebar-mobile' : 'admin-sidebar-desktop'}
            aria-label="Admin navigation"
            className={`flex min-h-full flex-col overflow-visible border-r border-white/10 bg-dark-200 shadow-2xl transition-[width] duration-300 ${compact ? 'h-auto w-20 self-start' : 'h-full min-h-0 w-72'}`}
        >
            <header className={`flex h-20 shrink-0 items-center border-b border-white/5 bg-dark-200 ${compact ? 'sticky top-0 z-40 justify-center px-3' : 'justify-between px-5'}`}>
                <Link to="/" className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400" aria-label="HalkaBite home">
                    <span className="shrink-0 text-3xl" aria-hidden="true">🍔</span>
                    {!compact && <span className="truncate text-lg font-bold gradient-text">HalkaBite Admin</span>}
                </Link>
                {mobile && <button onClick={onClose} className="rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Close admin menu"><X /></button>}
            </header>

            <nav
                className={`admin-sidebar-scroll space-y-1.5 overscroll-contain px-3 py-4 ${compact ? 'flex-none overflow-visible' : 'min-h-0 flex-1 overflow-y-auto'}`}
                aria-label="Admin menu"
                tabIndex={0}
            >
                {navigationItems.map(item => <SidebarLink key={item.path} {...item} label={label(item.label)} collapsed={compact} onNavigate={mobile ? onClose : undefined} />)}
                <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4">
                    <SidebarLink path="/admin/settings" icon={Settings} label={label('Settings')} collapsed={compact} onNavigate={mobile ? onClose : undefined} />
                    <SidebarLink path="/admin/profile" icon={UserCircle} label={label('Profile')} collapsed={compact} onNavigate={mobile ? onClose : undefined} />
                    {!compact && user && (
                        <div className="mx-1 my-2 flex min-w-0 items-center gap-3 rounded-xl bg-white/[0.035] px-3 py-2">
                            <UserAvatar name={user.name} src={user.avatar} className="h-8 w-8 text-xs" />
                            <span className="min-w-0"><b className="block truncate text-xs">{user.name}</b><small className="block truncate text-[10px] text-white/40">Administrator</small></span>
                        </div>
                    )}
                    <button
                        onClick={async () => { try { await logoutRequest().unwrap(); } catch { /* clear local credentials even when the session expired */ } dispatch(logout()); }}
                        aria-label={compact ? label('Logout') : undefined}
                        title={compact ? label('Logout') : undefined}
                        className={`group relative flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-red-400 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${compact ? 'justify-center' : 'gap-3'}`}
                    >
                        <LogOut className="h-5 w-5 shrink-0" />{!compact && <span className="text-sm font-medium">{label('Logout')}</span>}
                        {compact && <span role="tooltip" className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-lg border border-white/10 bg-dark-100 px-2.5 py-1.5 text-xs text-white shadow-xl group-hover:block group-focus-visible:block">{label('Logout')}</span>}
                    </button>
                    {!mobile && (
                        <button onClick={onToggleCollapse} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-xs text-white/40 transition hover:bg-white/5 hover:text-white" aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}>
                            {compact ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /><span>Collapse sidebar</span></>}
                        </button>
                    )}
                </div>
            </nav>
        </aside>
    );
};

const AdminLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const initializedMenu = useRef(false);
    const { data: settingsData } = useGetAdminSettingsQuery();
    const [saveSettings] = useUpdateAdminSettingsMutation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => setMobileOpen(false), [location.pathname]);
    useEffect(() => {
        const preferences = settingsData?.data?.preferences;
        if (!preferences || initializedMenu.current) return;
        initializedMenu.current = true;
        if (location.pathname === '/admin') {
            const destination = preferences.rememberLastMenu ? preferences.lastMenu : preferences.defaultPage;
            if (destination && destination !== '/admin') navigate(destination, { replace: true });
        }
    }, [settingsData, location.pathname, navigate]);
    useEffect(() => {
        const preferences = settingsData?.data?.preferences;
        if (!initializedMenu.current || !preferences?.rememberLastMenu || !location.pathname.startsWith('/admin') || preferences.lastMenu === location.pathname) return;
        const timer = window.setTimeout(() => saveSettings({ preferences: { ...preferences, lastMenu: location.pathname } }), 300);
        return () => window.clearTimeout(timer);
    }, [location.pathname, settingsData, saveSettings]);
    useEffect(() => { const preferences=settingsData?.data?.preferences;if(!preferences)return;if(preferences.sidebarBehavior==='expanded')setCollapsed(false);else if(preferences.sidebarBehavior==='collapsed')setCollapsed(true);else setCollapsed(preferences.sidebarCollapsed); }, [settingsData]);
    useEffect(() => {
        const applySidebarPreference = (preference?: string, remembered?: boolean) => {
            if (preference === 'expanded') setCollapsed(false);
            if (preference === 'collapsed') setCollapsed(true);
            if (preference === 'remember' && remembered !== undefined) setCollapsed(remembered);
        };
        const onPreferencesChanged = (event: Event) => { const preferences=(event as CustomEvent<{preferences?:{sidebarBehavior?:string;sidebarCollapsed?:boolean}}>).detail?.preferences;applySidebarPreference(preferences?.sidebarBehavior,preferences?.sidebarCollapsed); };
        window.addEventListener('admin-settings-applied', onPreferencesChanged);
        return () => window.removeEventListener('admin-settings-applied', onPreferencesChanged);
    }, []);
    useEffect(() => {
        if (!mobileOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setMobileOpen(false);
        const closeOnDesktop = () => window.innerWidth >= 1024 && setMobileOpen(false);
        window.addEventListener('keydown', closeOnEscape);
        window.addEventListener('resize', closeOnDesktop);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
            window.removeEventListener('resize', closeOnDesktop);
        };
    }, [mobileOpen]);

    return (
        <div className={`admin-shell flex h-screen h-dvh min-h-0 overflow-hidden bg-dark-100 ${collapsed ? 'lg:h-auto lg:min-h-dvh lg:overflow-y-auto' : ''}`}>
            <div className={`hidden shrink-0 lg:block ${collapsed ? 'min-h-screen min-h-dvh' : 'h-screen h-dvh'}`}>
                <AdminSidebar language={settingsData?.data?.locale.language||'en'} collapsed={collapsed} mobile={false} onClose={() => undefined} onToggleCollapse={() => { const next=!collapsed;setCollapsed(next);const preferences=settingsData?.data?.preferences;if(preferences?.sidebarBehavior==='remember')saveSettings({preferences:{...preferences,sidebarCollapsed:next}}); }} />
            </div>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation drawer">
                    <button className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation drawer" />
                    <div className="relative h-screen h-dvh w-72 max-w-[86vw] animate-slide-right">
                        <AdminSidebar language={settingsData?.data?.locale.language||'en'} collapsed={false} mobile onClose={() => setMobileOpen(false)} onToggleCollapse={() => undefined} />
                    </div>
                </div>
            )}

            <main className={`min-w-0 flex-1 overflow-y-auto overscroll-contain ${collapsed ? 'lg:sticky lg:top-0 lg:h-screen lg:h-dvh' : ''}`} id="admin-main-content">
                <div className="sticky top-0 z-30 flex h-16 items-center border-b border-white/10 bg-dark-200/90 px-4 backdrop-blur-xl lg:hidden">
                    <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400" aria-label="Open admin menu" aria-controls="admin-sidebar-mobile" aria-expanded={mobileOpen}>
                        <Menu />
                    </button>
                    <span className="ml-3 font-bold gradient-text">HalkaBite Admin</span>
                </div>
                <div className="mx-auto w-full p-4 sm:p-6 lg:p-8 2xl:max-w-[1800px]">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
