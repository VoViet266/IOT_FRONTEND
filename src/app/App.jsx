import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { AppShell } from '../components/layout/AppShell.jsx';
import { AttendancePage } from '../features/attendance/AttendancePage.jsx';
import { SessionsPage } from '../features/sessions/SessionsPage.jsx';
import { ClassesPage } from '../features/classes/ClassesPage.jsx';
import { CoursesPage } from '../features/courses/CoursesPage.jsx';
import { DevicesPage } from '../features/devices/DevicesPage.jsx';
import { FingerprintsPage } from '../features/fingerprints/FingerprintsPage.jsx';

export function App() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance');
  const [targetSessionId, setTargetSessionId] = useState('');

  useEffect(() => {
    api.restoreSession().then((restored) => {
      if (restored && (restored.role === 'teacher' || restored.role === 'admin')) {
        setIdentity(restored);
        setSignedIn(true);
      } else if (restored) {
        api.signOut();
      }
    }).finally(() => setReady(true));

    const onExpired = () => {
      setIdentity(null);
      setSignedIn(false);
    };
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, []);

  if (!ready) return <div className="loading-screen">Đang kiểm tra phiên đăng nhập…</div>;
  if (!signedIn) {
    return (
      <LoginPage
        onSignedIn={(user) => {
          setIdentity(user);
          setSignedIn(true);
        }}
      />
    );
  }

  return (
    <AppShell
      userName={identity?.fullName || identity?.userName}
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
      }}
      onSignOut={async () => {
        await api.signOut();
        setIdentity(null);
        setSignedIn(false);
      }}
    >
      {activeTab === 'attendance' && (
        <AttendancePage
          identity={identity}
          initialSessionId={targetSessionId}
        />
      )}
      {activeTab === 'sessions' && (
        <SessionsPage
          onSelectSessionForAttendance={(sId) => {
            setTargetSessionId(sId);
            setActiveTab('attendance');
          }}
        />
      )}
      {activeTab === 'classes' && <ClassesPage />}
      {activeTab === 'courses' && <CoursesPage identity={identity} />}
      {activeTab === 'devices' && <DevicesPage />}
      {activeTab === 'fingerprints' && <FingerprintsPage />}
    </AppShell>
  );
}
