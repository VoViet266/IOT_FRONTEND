import { useState } from 'react';
import { ChangePasswordModal } from '../../features/auth/ChangePasswordModal.jsx';

const NAV_ITEMS = [
  { id: 'attendance', label: 'Điểm danh', icon: '☷' },
  { id: 'sessions', label: 'Buổi học & Ca học', icon: '◷' },
  { id: 'classes', label: 'Lớp học & Sinh viên', icon: '▤' },
  { id: 'courses', label: 'Môn & Học phần', icon: '🕮' },
  { id: 'devices', label: 'Thiết bị & Phòng', icon: '🖵' },
  { id: 'fingerprints', label: 'Quản lý Vân tay', icon: '◉' },
];

export function AppShell({
  userName,
  onSignOut,
  activeTab,
  onTabChange,
  children,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState('');

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Sổ điểm danh IoT" onClick={(e) => { e.preventDefault(); onTabChange('attendance'); }}>
          <span className="brand-mark">Đ</span>
          <span>
            <strong>Sổ điểm danh IoT</strong>
            <small>Quản lý vân tay &amp; lớp học</small>
          </span>
        </a>

        <div className="nav-caption">ĐIỀU HƯỚNG CHÍNH</div>
        <nav aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <span className="status-dot" />
          Hệ thống IoT Vân tay hoạt động
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            Giáo viên <span>/</span> {currentNav.label}
          </div>

          <div className="account-wrap">
            <button
              className="account-button"
              onClick={() => setShowMenu((value) => !value)}
              aria-expanded={showMenu}
            >
              <span className="avatar">{(userName || 'GV').slice(0, 1).toUpperCase()}</span>
              <span className="account-name">{userName || 'Tài khoản giáo viên'}</span>
              <span className="chevron">⌄</span>
            </button>

            {showMenu && (
              <div className="account-menu">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowChangePassword(true);
                  }}
                >
                  🔑 Đổi mật khẩu
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onSignOut();
                  }}
                  style={{ color: '#c24b4b' }}
                >
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>

        {passwordNotice && (
          <div style={{ padding: '16px 34px 0', maxWidth: '1380px', margin: '0 auto' }}>
            <div className="alert alert-success">
              <span>{passwordNotice}</span>
              <button onClick={() => setPasswordNotice('')}>✕</button>
            </div>
          </div>
        )}

        <main className="page-content">{children}</main>
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={(msg) => setPasswordNotice(msg)}
        />
      )}
    </div>
  );
}
