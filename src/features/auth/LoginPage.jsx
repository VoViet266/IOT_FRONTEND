import { useState } from 'react';
import { api } from '../../services/api.js';

export function LoginPage({ onSignedIn }) {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const identity = await api.signIn(userName.trim(), password);
      if (identity?.role !== 'teacher') {
        await api.signOut();
        throw new Error('Tài khoản này không có quyền truy cập giao diện giáo viên.');
      }
      onSignedIn(identity);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand login-brand"><span className="brand-mark">Đ</span><span><strong>Sổ điểm danh</strong><small>Quản lý lớp học</small></span></div>
        <h1>Đăng nhập</h1>
        <p className="muted">Đăng nhập bằng tài khoản giáo viên của bạn.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Tên đăng nhập</label>
          <input id="username" autoComplete="username" value={userName} onChange={(event) => setUserName(event.target.value)} required placeholder="Nhập tên đăng nhập" />
          <label htmlFor="password">Mật khẩu</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Nhập mật khẩu" />
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary login-submit" disabled={loading}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        </form>
        <p className="login-footnote">Dữ liệu được lưu trên hệ thống của nhà trường.</p>
      </section>
    </main>
  );
}
