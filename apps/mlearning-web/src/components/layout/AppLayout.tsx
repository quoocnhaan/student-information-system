import { useState } from 'react';
import { BookOpen, LayoutDashboard, Calendar, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  const SupportIcon: React.FC = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.5 9.3a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.6v.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  );

  const BankIcon: React.FC = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 10h16M5 10v9M9 10v9M15 10v9M19 10v9M3 20h18M12 2 3 7h18L12 2Z"
        stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const mainNavItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { label: 'Courses', path: '/courses', icon: <BookOpen size={20} /> },
    { label: 'Calendar', path: '/calendar', icon: <Calendar size={20} /> },
  ];

  const bottomNavItems = [
    { label: 'Setting', path: '/', icon: <Settings size={20} /> },
    { label: 'SupportIcon', path: '/', icon: <SupportIcon /> },
  ];
  return (
    <div className={styles.layout}>
      {/* ----- Sidebar ----- */}
      <aside className={styles.sidebar}>
        {/* Logo & tên trường */}
        <div className={styles.logoRow}>
          <div className={styles.logoBadge}>
            <BankIcon />
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>Universitas</span>
            <span className={styles.logoSubtitle}>Academic Portal</span>
          </div>
        </div>

        {/* Menu điều hướng chính */}
        <nav className={styles.nav}>
          {mainNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Khoảng đẩy nội dung phía dưới xuống cuối Sidebar */}
        <div className={styles.spacer} />

        {/* Đường kẻ phân cách */}
        <div className={styles.divider} />

        {/* Menu phụ: Settings, Support */}
        <nav className={styles.nav}>
          {bottomNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* ----- Vùng nội dung chính ----- */}
      <main className={styles.mainContent}>
        {/* Topbar */}
        <header className={styles.navbar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search calendar events, exams, assign..."
            />
          </div>

          <nav className={styles.tabs}>
            <button className={`${styles.tab} ${styles.tabActive}`}>Spring 2025</button>
            <button className={styles.tab}>Schedule</button>
            <button className={styles.tab}>Directory</button>
          </nav>

          <div className={styles.right}>
            <button className={styles.iconBtn} aria-label="Notifications">🔔</button>
            <button className={styles.iconBtn} aria-label="Help">❓</button>
            <div className={styles.user} onClick={() => setShowMenu(!showMenu)}>
              <div className={styles.avatar}>AL</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>Alex Lin</span>
                <span className={styles.userRole}>CS Data Science 2027</span>
              </div>
              {showMenu && (
                <div className={styles.userMenu}>
                  <Link to="/login" className={styles.logoutButton}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className={styles.pageContent}>
          {children}
        </div>
      </main>
    </div>
  );
}
