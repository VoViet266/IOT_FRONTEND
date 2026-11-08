import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import {
  formatDateTime,
  formatTime,
  idOf,
  sessionStatusClass,
  sessionStatusLabel,
  toDatetimeLocal,
} from '../../utils/attendance.js';

export function SessionsPage({ onSelectSessionForAttendance }) {
  const [sessions, setSessions] = useState([]);
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Modal tạo/sửa session
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [form, setForm] = useState({
    sectionId: '',
    roomId: '',
    status: 'scheduled',
    startTime: '',
    endTime: '',
    attendanceOpenTime: '',
    attendanceCloseTime: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sessionsRes, sectionsRes, roomsRes] = await Promise.all([
        api.get('/sessions/all').catch(() => api.get('/sessions')),
        api.get('/sections/all').catch(() => api.get('/sections')),
        api.get('/rooms/all').catch(() => api.get('/rooms')),
      ]);
      setSessions(sessionsRes || []);
      setSections(sectionsRes || []);
      setRooms(roomsRes || []);
      if (!form.sectionId && sectionsRes?.length > 0) {
        setForm((prev) => ({
          ...prev,
          sectionId: sectionsRes[0]._id,
          roomId: roomsRes?.[0]?._id || '',
        }));
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách buổi học');
    } finally {
      setLoading(false);
    }
  }, [form.sectionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mở modal tạo mới
  function handleOpenCreate() {
    setEditingSession(null);
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 tiếng sau
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // học 2 tiếng
    const open = new Date(start.getTime() - 15 * 60 * 1000); // mở trước 15p
    const close = new Date(start.getTime() + 30 * 60 * 1000); // đóng sau 30p

    setForm({
      sectionId: sections[0]?._id || '',
      roomId: rooms[0]?._id || '',
      status: 'scheduled',
      startTime: toDatetimeLocal(start.toISOString()),
      endTime: toDatetimeLocal(end.toISOString()),
      attendanceOpenTime: toDatetimeLocal(open.toISOString()),
      attendanceCloseTime: toDatetimeLocal(close.toISOString()),
    });
    setShowModal(true);
  }

  // Mở modal sửa
  function handleOpenEdit(s) {
    setEditingSession(s);
    setForm({
      sectionId: idOf(s.sectionId),
      roomId: idOf(s.roomId),
      status: s.status || 'scheduled',
      startTime: toDatetimeLocal(s.startTime),
      endTime: toDatetimeLocal(s.endTime),
      attendanceOpenTime: toDatetimeLocal(s.attendanceOpenTime),
      attendanceCloseTime: toDatetimeLocal(s.attendanceCloseTime),
    });
    setShowModal(true);
  }

  // Submit form
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.sectionId || !form.roomId || !form.startTime || !form.endTime) {
      setError('Vui lòng điền đầy đủ học phần, phòng học và thời gian bắt đầu/kết thúc');
      return;
    }

    const payload = {
      sectionId: form.sectionId,
      roomId: form.roomId,
      status: form.status,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      attendanceOpenTime: form.attendanceOpenTime ? new Date(form.attendanceOpenTime).toISOString() : null,
      attendanceCloseTime: form.attendanceCloseTime ? new Date(form.attendanceCloseTime).toISOString() : null,
    };

    try {
      if (editingSession) {
        await api.patch(`/sessions/${editingSession._id}`, payload);
        setNotice('Đã cập nhật ca học thành công');
      } else {
        await api.post('/sessions/create', payload);
        setNotice('Đã tạo ca học mới thành công');
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể lưu ca học');
    }
  }

  // Đổi nhanh status
  async function handleQuickStatusChange(s, newStatus) {
    setError('');
    try {
      await api.patch(`/sessions/${s._id}`, { status: newStatus });
      setNotice(`Đã chuyển trạng thái sang "${sessionStatusLabel(newStatus)}"`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể đổi trạng thái');
    }
  }

  // Xóa ca học
  async function handleDelete(s) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ca học này? Dữ liệu điểm danh liên quan có thể bị ảnh hưởng.')) return;
    setError('');
    try {
      await api.delete(`/sessions/${s._id}`);
      setNotice('Đã xóa ca học thành công');
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể xóa ca học');
    }
  }

  // Thống kê
  const openCount = sessions.filter((s) => s.status === 'open').length;
  const scheduledCount = sessions.filter((s) => s.status === 'scheduled').length;
  const closedCount = sessions.filter((s) => s.status === 'closed').length;

  return (
    <div className="attendance-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">QUẢN LÝ LỊCH HỌC</div>
          <h1>Buổi học & Ca điểm danh</h1>
          <p className="muted">Lên lịch các buổi học, phân phòng, cấu hình khung giờ mở điểm danh cho thiết bị IoT.</p>
        </div>
        <button className="button button-primary" onClick={handleOpenCreate} disabled={sections.length === 0 || rooms.length === 0}>
          + Lên lịch buổi học mới
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')}>✕</button>
        </div>
      )}

      {/* Thống kê ca học */}
      <section className="stats-grid">
        <article className="stat-card stat-blue">
          <div className="stat-top">
            <span>Tổng số buổi học</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-note">Các ca học trong danh sách</div>
        </article>
        <article className="stat-card stat-green">
          <div className="stat-top">
            <span>Đang mở điểm danh</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{openCount}</div>
          <div className="stat-note">Thiết bị IoT đang ghi nhận</div>
        </article>
        <article className="stat-card stat-amber">
          <div className="stat-top">
            <span>Đã lên lịch</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{scheduledCount}</div>
          <div className="stat-note">Sắp diễn ra</div>
        </article>
        <article className="stat-card stat-gray">
          <div className="stat-top">
            <span>Đã kết thúc / Đóng</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{closedCount}</div>
          <div className="stat-note">Ca học đã hoàn thành</div>
        </article>
      </section>

      {/* Bảng danh sách ca học */}
      <section className="roster-card">
        <div className="roster-heading">
          <div>
            <h2>Danh sách các buổi học ({sessions.length})</h2>
            <p className="muted">Theo dõi trạng thái, phòng học và thời gian biểu.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: '22%' }}>HỌC PHẦN</th>
                <th style={{ width: '15%' }}>PHÒNG HỌC</th>
                <th style={{ width: '22%' }}>THỜI GIAN HỌC</th>
                <th style={{ width: '18%' }}>GIỜ ĐIỂM DANH</th>
                <th style={{ width: '10%' }}>TRẠNG THÁI</th>
                <th className="action-col" style={{ width: '13%' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">Đang tải danh sách ca học…</td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">Chưa có buổi học nào được tạo.</td>
                </tr>
              ) : (
                sessions.map((s) => {
                  const sec = s.sectionId || {};
                  const room = s.roomId || {};
                  return (
                    <tr key={s._id}>
                      <td>
                        <strong>{sec.sectionCode || '—'}</strong>
                      </td>
                      <td>
                        <span className="badge-unmarked" style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
                          Phòng {room.roomCode || '—'}
                        </span>
                        <small style={{ display: 'block', color: 'var(--muted)', marginTop: '2px' }}>
                          {room.building ? `Tòa ${room.building}` : ''} {room.campus ? `(${room.campus})` : ''}
                        </small>
                      </td>
                      <td>
                        <div className="time-cell">
                          <strong>{formatDateTime(s.startTime)}</strong>
                          <small style={{ display: 'block', marginTop: '2px' }}>
                            Đến: {formatTime(s.endTime)}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: '#4a5560' }}>
                          {formatTime(s.attendanceOpenTime)} – {formatTime(s.attendanceCloseTime)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${sessionStatusClass(s.status)}`} style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600 }}>
                          {sessionStatusLabel(s.status)}
                        </span>
                      </td>
                      <td className="action-col">
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          {s.status === 'scheduled' && (
                            <button
                              className="button button-row"
                              style={{ color: '#2b7a4b', fontWeight: 600 }}
                              title="Bật mở điểm danh ngay"
                              onClick={() => handleQuickStatusChange(s, 'open')}
                            >
                              Mở
                            </button>
                          )}
                          {s.status === 'open' && (
                            <button
                              className="button button-row"
                              style={{ color: '#a4751f', fontWeight: 600 }}
                              title="Đóng điểm danh"
                              onClick={() => handleQuickStatusChange(s, 'closed')}
                            >
                              Đóng
                            </button>
                          )}
                          {onSelectSessionForAttendance && (
                            <button
                              className="button button-row"
                              style={{ color: 'var(--blue)', fontWeight: 600 }}
                              title="Xem trang điểm danh của ca này"
                              onClick={() => onSelectSessionForAttendance(s._id)}
                            >
                              Điểm danh
                            </button>
                          )}
                          <button
                            className="button button-row"
                            onClick={() => handleOpenEdit(s)}
                          >
                            Sửa
                          </button>
                          <button
                            className="button button-row"
                            style={{ color: '#c24b4b' }}
                            onClick={() => handleDelete(s)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Tạo/Sửa Ca Học */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSession ? 'Cập nhật thông tin ca học' : 'Lên lịch ca học mới'}</h3>
              <button className="close-button" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <label className="form-label">Chọn lớp học phần</label>
                <select
                  className="form-select"
                  value={form.sectionId}
                  onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
                  required
                >
                  {sections.map((sec) => (
                    <option key={sec._id} value={sec._id}>
                      {sec.sectionCode} ({sec.courseId?.courseName || 'Môn học'})
                    </option>
                  ))}
                </select>

                <label className="form-label">Phòng học (gắn thiết bị điểm danh)</label>
                <select
                  className="form-select"
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  required
                >
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      Phòng {r.roomCode} - Tòa {r.building} ({r.campus})
                    </option>
                  ))}
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Giờ bắt đầu học</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Giờ kết thúc học</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                  <div>
                    <label className="form-label">Mở nhận vân tay từ</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={form.attendanceOpenTime}
                      onChange={(e) => setForm({ ...form, attendanceOpenTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Đóng nhận vân tay lúc</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={form.attendanceCloseTime}
                      onChange={(e) => setForm({ ...form, attendanceCloseTime: e.target.value })}
                    />
                  </div>
                </div>

                <label className="form-label" style={{ marginTop: '6px' }}>Trạng thái ca học</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="scheduled">Đã lên lịch (scheduled)</option>
                  <option value="open">Đang mở điểm danh (open)</option>
                  <option value="closed">Đã đóng (closed)</option>
                  <option value="cancelled">Đã hủy (cancelled)</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="button button-primary">
                  {editingSession ? 'Cập nhật ca học' : 'Lưu buổi học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

