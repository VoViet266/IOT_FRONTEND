import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { formatDateTime, idOf } from '../../utils/attendance.js';

export function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [revealedSecrets, setRevealedSecrets] = useState({});

  // Modal tạo/sửa Thiết bị
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({
    deviceCode: '',
    deviceName: '',
    roomId: '',
    status: 'active',
    authSecret: '',
  });

  // Modal tạo Phòng học
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    roomCode: '',
    building: '',
    campus: 'Cơ sở 1',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [devicesRes, roomsRes] = await Promise.all([
        api.get('/devices/all').catch(() => api.get('/devices')),
        api.get('/rooms/all').catch(() => api.get('/rooms')),
      ]);
      setDevices(devicesRes || []);
      setRooms(roomsRes || []);
      if (!deviceForm.roomId && roomsRes?.length > 0) {
        setDeviceForm((prev) => ({ ...prev, roomId: roomsRes[0]._id }));
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách thiết bị và phòng học');
    } finally {
      setLoading(false);
    }
  }, [deviceForm.roomId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle ẩn/hiện secret
  function toggleSecret(id) {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Mở modal thêm thiết bị
  function handleOpenCreateDevice() {
    setEditingDevice(null);
    setDeviceForm({
      deviceCode: `FP00${devices.length + 1}`,
      deviceName: 'Máy vân tay phòng mới',
      roomId: rooms[0]?._id || '',
      status: 'active',
      authSecret: 'TrungTinVoDichThienHa',
    });
    setShowDeviceModal(true);
  }

  // Mở modal sửa thiết bị
  function handleOpenEditDevice(d) {
    setEditingDevice(d);
    setDeviceForm({
      deviceCode: d.deviceCode || '',
      deviceName: d.deviceName || '',
      roomId: idOf(d.roomId),
      status: d.status || 'active',
      authSecret: d.authSecret || '',
    });
    setShowDeviceModal(true);
  }

  // Lưu thiết bị
  async function handleSubmitDevice(e) {
    e.preventDefault();
    setError('');
    if (!deviceForm.deviceCode || !deviceForm.deviceName || !deviceForm.roomId) {
      setError('Vui lòng điền đủ mã thiết bị, tên máy và phòng đặt');
      return;
    }

    try {
      if (editingDevice) {
        await api.patch(`/devices/${editingDevice._id}`, deviceForm);
        setNotice(`Đã cập nhật máy điểm danh ${deviceForm.deviceCode}`);
      } else {
        await api.post('/devices/create', deviceForm);
        setNotice(`Đã tạo mới máy điểm danh ${deviceForm.deviceCode}`);
      }
      setShowDeviceModal(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể lưu thiết bị');
    }
  }

  // Bật/tắt nhanh trạng thái máy
  async function handleToggleStatus(d) {
    const nextStatus = d.status === 'active' ? 'inactive' : 'active';
    setError('');
    try {
      await api.patch(`/devices/${d._id}`, { status: nextStatus });
      setNotice(`Đã chuyển thiết bị sang trạng thái: ${nextStatus === 'active' ? 'Hoạt động' : 'Tạm dừng'}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể đổi trạng thái máy');
    }
  }

  // Xóa thiết bị
  async function handleDeleteDevice(d) {
    if (!window.confirm(`Xóa thiết bị điểm danh ${d.deviceCode} (${d.deviceName})?`)) return;
    setError('');
    try {
      await api.delete(`/devices/${d._id}`);
      setNotice(`Đã xóa thiết bị ${d.deviceCode}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể xóa thiết bị');
    }
  }

  // Lưu phòng học mới
  async function handleSubmitRoom(e) {
    e.preventDefault();
    if (!roomForm.roomCode) return;
    setError('');
    try {
      await api.post('/rooms/create', roomForm);
      setNotice(`Đã tạo phòng học ${roomForm.roomCode}`);
      setShowRoomModal(false);
      setRoomForm({ roomCode: '', building: '', campus: 'Cơ sở 1' });
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể tạo phòng học');
    }
  }

  // Xóa phòng học
  async function handleDeleteRoom(r) {
    if (!window.confirm(`Xóa phòng học ${r.roomCode}?`)) return;
    setError('');
    try {
      await api.delete(`/rooms/${r._id}`);
      setNotice(`Đã xóa phòng học ${r.roomCode}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể xóa phòng học');
    }
  }

  const activeCount = devices.filter((d) => d.status === 'active').length;

  return (
    <div className="attendance-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">QUẢN TRỊ IOT</div>
          <h1>Thiết bị & Phòng học</h1>
          <p className="muted">Quản lý máy điểm danh vân tay ESP32, thông số kết nối và sơ đồ phòng học.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="button button-secondary" onClick={() => setShowRoomModal(true)}>
            + Thêm phòng học
          </button>
          <button className="button button-primary" onClick={handleOpenCreateDevice} disabled={rooms.length === 0}>
            + Thêm máy điểm danh ESP32
          </button>
        </div>
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

      {/* Thống kê */}
      <section className="stats-grid">
        <article className="stat-card stat-blue">
          <div className="stat-top">
            <span>Tổng số thiết bị ESP32</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{devices.length}</div>
          <div className="stat-note">Máy quét vân tay đã cấu hình</div>
        </article>
        <article className="stat-card stat-green">
          <div className="stat-top">
            <span>Đang hoạt động (Active)</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-note">Sẵn sàng nhận tín hiệu check-in</div>
        </article>
        <article className="stat-card stat-amber">
          <div className="stat-top">
            <span>Phòng học</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{rooms.length}</div>
          <div className="stat-note">Phòng có trang bị hệ thống</div>
        </article>
      </section>

      {/* Bảng danh sách thiết bị vân tay ESP32 */}
      <section className="roster-card" style={{ marginBottom: '24px' }}>
        <div className="roster-heading">
          <div>
            <h2>Danh sách máy quét vân tay ESP32 ({devices.length})</h2>
            <p className="muted">Thông tin thiết bị, mã bí mật kết nối và phòng lắp ráp.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>MÃ MÁY</th>
                <th style={{ width: '22%' }}>TÊN THIẾT BỊ</th>
                <th style={{ width: '18%' }}>PHÒNG LẮP ĐẶT</th>
                <th style={{ width: '18%' }}>MẬT MÃ (SECRET)</th>
                <th style={{ width: '12%' }}>TRẠNG THÁI</th>
                <th className="action-col">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">Đang tải danh sách thiết bị…</td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">Chưa có thiết bị nào. Hãy bấm &quot;Thêm máy điểm danh ESP32&quot;.</td>
                </tr>
              ) : (
                devices.map((d) => {
                  const room = rooms.find((r) => r._id === idOf(d.roomId)) || d.roomId || {};
                  const isRevealed = revealedSecrets[d._id];
                  return (
                    <tr key={d._id}>
                      <td>
                        <strong><code>{d.deviceCode}</code></strong>
                      </td>
                      <td>
                        <strong>{d.deviceName}</strong>
                        {d.lastSeenAt && (
                          <small style={{ display: 'block', color: 'var(--muted)', marginTop: '2px' }}>
                            Online gần nhất: {formatDateTime(d.lastSeenAt)}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className="badge-unmarked" style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
                          Phòng {room.roomCode || '—'}
                        </span>
                        {room.building && <small style={{ display: 'block', color: 'var(--muted)', marginTop: '2px' }}>Tòa {room.building}</small>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <code style={{ fontSize: '11px' }}>
                            {isRevealed ? d.authSecret : '••••••••••••'}
                          </code>
                          <button
                            type="button"
                            className="text-button"
                            style={{ padding: '0 4px', fontSize: '11px' }}
                            onClick={() => toggleSecret(d._id)}
                          >
                            {isRevealed ? 'Ẩn' : 'Hiện'}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span
                          className={d.status === 'active' ? 'badge-present' : 'badge-absent'}
                          style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600 }}
                        >
                          {d.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                        </span>
                      </td>
                      <td className="action-col">
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            className="button button-row"
                            onClick={() => handleToggleStatus(d)}
                            title="Bật / Tắt trạng thái máy"
                          >
                            {d.status === 'active' ? 'Khóa' : 'Bật'}
                          </button>
                          <button
                            className="button button-row"
                            onClick={() => handleOpenEditDevice(d)}
                          >
                            Sửa
                          </button>
                          <button
                            className="button button-row"
                            style={{ color: '#c24b4b' }}
                            onClick={() => handleDeleteDevice(d)}
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

      {/* Bảng danh sách phòng học */}
      <section className="roster-card">
        <div className="roster-heading">
          <div>
            <h2>Danh sách phòng học ({rooms.length})</h2>
            <p className="muted">Phòng học phục vụ giảng dạy và gắn thiết bị IoT.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>SỐ PHÒNG</th>
                <th style={{ width: '30%' }}>TÒA NHÀ</th>
                <th style={{ width: '30%' }}>CƠ SỞ</th>
                <th className="action-col">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r._id}>
                  <td><strong>Phòng {r.roomCode}</strong></td>
                  <td>Tòa {r.building || '—'}</td>
                  <td>{r.campus || '—'}</td>
                  <td className="action-col">
                    <button
                      className="button button-row"
                      style={{ color: '#c24b4b' }}
                      onClick={() => handleDeleteRoom(r)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Thêm/Sửa Thiết Bị */}
      {showDeviceModal && (
        <div className="modal-backdrop" onClick={() => setShowDeviceModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDevice ? 'Cập nhật thiết bị máy vân tay' : 'Thêm thiết bị điểm danh ESP32'}</h3>
              <button className="close-button" onClick={() => setShowDeviceModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitDevice}>
              <div className="modal-body">
                <label className="form-label">Mã thiết bị (Device Code)</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: FP001, FP002"
                  value={deviceForm.deviceCode}
                  onChange={(e) => setDeviceForm({ ...deviceForm, deviceCode: e.target.value })}
                  required
                />

                <label className="form-label">Tên thiết bị</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: Máy vân tay phòng A201"
                  value={deviceForm.deviceName}
                  onChange={(e) => setDeviceForm({ ...deviceForm, deviceName: e.target.value })}
                  required
                />

                <label className="form-label">Phòng học lắp đặt</label>
                <select
                  className="form-select"
                  value={deviceForm.roomId}
                  onChange={(e) => setDeviceForm({ ...deviceForm, roomId: e.target.value })}
                  required
                >
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      Phòng {r.roomCode} - Tòa {r.building} ({r.campus})
                    </option>
                  ))}
                </select>

                <label className="form-label">Mật khẩu bí mật kết nối (Auth Secret)</label>
                <input
                  className="form-input"
                  placeholder="Nhập secret máy ESP32"
                  value={deviceForm.authSecret}
                  onChange={(e) => setDeviceForm({ ...deviceForm, authSecret: e.target.value })}
                  required
                />

                <label className="form-label">Trạng thái hoạt động</label>
                <select
                  className="form-select"
                  value={deviceForm.status}
                  onChange={(e) => setDeviceForm({ ...deviceForm, status: e.target.value })}
                >
                  <option value="active">Hoạt động (active)</option>
                  <option value="inactive">Tạm dừng (inactive)</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowDeviceModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="button button-primary">
                  {editingDevice ? 'Cập nhật thiết bị' : 'Lưu thiết bị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Phòng Học */}
      {showRoomModal && (
        <div className="modal-backdrop" onClick={() => setShowRoomModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm phòng học mới</h3>
              <button className="close-button" onClick={() => setShowRoomModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitRoom}>
              <div className="modal-body">
                <label className="form-label">Mã số phòng</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: A201, C305, LAB01"
                  value={roomForm.roomCode}
                  onChange={(e) => setRoomForm({ ...roomForm, roomCode: e.target.value })}
                  required
                />

                <label className="form-label">Tòa nhà</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: A, B, C, Nhà Hiệu Bộ"
                  value={roomForm.building}
                  onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                  required
                />

                <label className="form-label">Cơ sở đào tạo</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: Cơ sở 1, Cơ sở 2"
                  value={roomForm.campus}
                  onChange={(e) => setRoomForm({ ...roomForm, campus: e.target.value })}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowRoomModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="button button-primary">
                  Lưu phòng học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

