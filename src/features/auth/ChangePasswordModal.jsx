import { useState } from 'react';
import { api } from '../../services/api.js';

export function ChangePasswordModal({ onClose, onSuccess }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!oldPassword || !newPassword) {
      setError('Vui lòng điền đầy đủ mật khẩu cũ và mới');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/users/updatePassword', {
        oldPassword,
        newPassword,
      });
      if (onSuccess) onSuccess('Đổi mật khẩu thành công!');
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Đổi mật khẩu</h3>
          <button className="close-button" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <label className="form-label" htmlFor="oldPassword">
              Mật khẩu hiện tại
            </label>
            <input
              id="oldPassword"
              type="password"
              className="form-input"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Nhập mật khẩu đang sử dụng"
              required
            />

            <label className="form-label" htmlFor="newPassword">
              Mật khẩu mới
            </label>
            <input
              id="newPassword"
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              required
            />

            <label className="form-label" htmlFor="confirmPassword">
              Xác nhận mật khẩu mới
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="button button-secondary" onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? 'Đang lưu…' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

