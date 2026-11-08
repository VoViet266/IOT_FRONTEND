import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import { fingerPositionLabel, formatDateTime, idOf } from '../../utils/attendance.js';

export function FingerprintsPage() {
  const [fingerprints, setFingerprints] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [students, setStudents] = useState([]);
  const [devices, setDevices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'registrations'
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Modal tạo đăng ký vân tay mới
  const [showModal, setShowModal] = useState(false);
  const [regForm, setRegForm] = useState({
    studentId: '',
    deviceId: '',
    fingerPosition: 'ngon-tro-phai',
  });

  const [modalClassFilter, setModalClassFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fprintsRes, regsRes, studentsRes, devicesRes, classesRes] = await Promise.all([
        selectedClassId === 'all'
          ? api.get('/fingerprints/all')
          : api.get(`/fingerprints/class/all/${selectedClassId}`),
        selectedClassId === 'all'
          ? api.get('/fingerprint-registrations/all')
          : api.get(`/fingerprint-registrations/all/class/${selectedClassId}`),
        api.get('/users/all/student'),
        api.get('/devices/all'),
        api.get('/classes/all'),
      ]);
      setFingerprints(fprintsRes || []);
      setRegistrations(regsRes || []);
      setStudents(studentsRes || []);
      setDevices(devicesRes || []);
      setClasses(classesRes || []);
      if (!regForm.studentId && studentsRes?.length > 0) {
        setRegForm((prev) => ({
          ...prev,
          studentId: studentsRes[0]._id,
          deviceId: devicesRes?.[0]?._id || '',
        }));
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu vân tay');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, regForm.studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tạo yêu cầu đăng ký vân tay
  async function handleCreateRegistration(e) {
    e.preventDefault();
    if (!regForm.studentId || !regForm.deviceId) {
      setError('Vui lòng chọn sinh viên và thiết bị quét');
      return;
    }
    setError('');
    try {
      await api.post('/fingerprint-registrations/create', regForm);
      setNotice('Đã tạo lệnh đăng ký vân tay! Máy quét ESP32 sẽ nhận lệnh và yêu cầu sinh viên đặt ngón tay.');
      setShowModal(false);
      setActiveTab('registrations');
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể tạo yêu cầu đăng ký vân tay');
    }
  }

  // Hủy yêu cầu đăng ký
  async function handleDeleteRegistration(reg) {
    if (!window.confirm('Hủy yêu cầu đăng ký vân tay này?')) return;
    setError('');
    try {
      await api.delete(`/fingerprint-registrations/${reg._id}`);
      setNotice('Đã hủy yêu cầu đăng ký vân tay');
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể hủy yêu cầu');
    }
  }

  // Xóa mẫu vân tay
  async function handleDeleteFingerprint(fp) {
    const student = fp.studentId || {};
    if (!window.confirm(`Xóa mẫu vân tay của sinh viên ${student.fullName || student.studentCode}?`)) return;
    setError('');
    try {
      await api.delete(`/fingerprints/${fp._id}`);
      setNotice('Đã xóa mẫu vân tay thành công');
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể xóa mẫu vân tay');
    }
  }

  // Lọc mẫu vân tay
  const filteredFingerprints = useMemo(() => {
    return fingerprints.filter((item) => {
      const student = item.studentId || {};
      const cid = idOf(student.classId);
      const matchClass = selectedClassId === 'all' || cid === selectedClassId;
      const haystack = `${student.fullName || ''} ${student.studentCode || ''} ${student.userName || ''}`.toLowerCase();
      const matchQuery = haystack.includes(query.trim().toLowerCase());
      return matchClass && matchQuery;
    });
  }, [fingerprints, selectedClassId, query]);

  // Lọc yêu cầu đăng ký
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((item) => {
      const student = item.studentId || {};
      const cid = idOf(student.classId);
      const matchClass = selectedClassId === 'all' || cid === selectedClassId;
      const haystack = `${student.fullName || ''} ${student.studentCode || ''}`.toLowerCase();
      const matchQuery = haystack.includes(query.trim().toLowerCase());
      return matchClass && matchQuery;
    });
  }, [registrations, selectedClassId, query]);

  return (
    <div className="attendance-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">DỮ LIỆU SINH TRẮC HỌC</div>
          <h1>Quản lý & Đăng ký Vân tay</h1>
          <p className="muted">Quản lý kho mẫu vân tay đã lưu trong hệ thống và ra lệnh đăng ký ngón tay mới qua máy ESP32.</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setShowModal(true)}
          disabled={students.length === 0 || devices.length === 0}
        >
          + Đăng ký vân tay mới cho SV
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

      {/* Thống kê */}
      <section className="stats-grid">
        <article className="stat-card stat-blue">
          <div className="stat-top">
            <span>Mẫu vân tay đã lưu</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{fingerprints.length}</div>
          <div className="stat-note">Được mã hóa trong hệ cơ sở dữ liệu</div>
        </article>
        <article className="stat-card stat-green">
          <div className="stat-top">
            <span>Sinh viên đã có vân tay</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">
            {new Set(fingerprints.map((f) => idOf(f.studentId))).size}
          </div>
          <div className="stat-note">Trên tổng số {students.length} sinh viên</div>
        </article>
        <article className="stat-card stat-amber">
          <div className="stat-top">
            <span>Lệnh đăng ký đang chờ</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{registrations.length}</div>
          <div className="stat-note">Chờ sinh viên đặt tay lên máy</div>
        </article>
      </section>

      {/* Tabs chuyển đổi giữa mẫu vân tay và lệnh đăng ký */}
      <section className="roster-card">
        <div className="toolbar" style={{ borderTop: 'none' }}>
          <div className="filter-tabs">
            <button
              className={activeTab === 'templates' ? 'filter-tab selected' : 'filter-tab'}
              onClick={() => setActiveTab('templates')}
            >
              Mẫu vân tay lưu trong hệ thống <span>{fingerprints.length}</span>
            </button>
            <button
              className={activeTab === 'registrations' ? 'filter-tab selected' : 'filter-tab'}
              onClick={() => setActiveTab('registrations')}
            >
              Lệnh chờ máy quét lấy mẫu <span>{registrations.length}</span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              className="form-select"
              style={{ width: 'auto', height: '31px', margin: 0, padding: '0 8px', fontSize: '11px', fontWeight: 600 }}
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="all">Tất cả các lớp ({classes.length})</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.classCode} - {cls.className}
                </option>
              ))}
            </select>
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên, MSSV…"
              />
            </label>
          </div>
        </div>

        {/* Tab 1: Danh sách mẫu vân tay */}
        {activeTab === 'templates' && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="student-col">SINH VIÊN</th>
                  <th>MÃ SINH VIÊN</th>
                  <th>VỊ TRÍ NGÓN TAY</th>
                  <th>ĐỊNH DẠNG MẪU</th>
                  <th>NGÀY CẬP NHẬT</th>
                  <th className="action-col">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty-state">Đang tải danh sách mẫu vân tay…</td>
                  </tr>
                ) : filteredFingerprints.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      {fingerprints.length === 0
                        ? 'Chưa có mẫu vân tay nào trong hệ thống.'
                        : 'Không tìm thấy mẫu vân tay theo từ khóa.'}
                    </td>
                  </tr>
                ) : (
                  filteredFingerprints.map((fp, idx) => {
                    const student = fp.studentId || {};
                    return (
                      <tr key={fp._id}>
                        <td>
                          <div className="student-cell">
                            <span className={`student-avatar avatar-${idx % 5}`}>
                              {(student.fullName || '?').trim().split(/\s+/).at(-1)?.slice(0, 1).toUpperCase()}
                            </span>
                            <span>
                              <strong>{student.fullName || '—'}</strong>
                              <small>{student.userName || '—'}</small>
                            </span>
                          </div>
                        </td>
                        <td><strong>{student.studentCode || '—'}</strong></td>
                        <td>
                          <span className="badge-present" style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600 }}>
                            {fingerPositionLabel(fp.fingerPosition)}
                          </span>
                        </td>
                        <td>
                          <code style={{ fontSize: '10px', background: '#f0f3f5', padding: '2px 6px', borderRadius: '4px' }}>
                            {fp.templateFormat || 'ISO'} (v{fp.algorithmVersion || '1.0'})
                          </code>
                        </td>
                        <td>{formatDateTime(fp.updatedAt || fp.createdAt)}</td>
                        <td className="action-col">
                          <button
                            className="button button-row"
                            style={{ color: '#c24b4b' }}
                            onClick={() => handleDeleteFingerprint(fp)}
                          >
                            Xóa mẫu
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Lệnh chờ quét */}
        {activeTab === 'registrations' && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="student-col">SINH VIÊN ĐĂNG KÝ</th>
                  <th>MÃ SINH VIÊN</th>
                  <th>MÁY QUÉT CHỈ ĐỊNH</th>
                  <th>NGÓN TAY CẦN QUÉT</th>
                  <th>THỜI GIAN TẠO LỆNH</th>
                  <th className="action-col">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="empty-state">Đang tải danh sách lệnh…</td>
                  </tr>
                ) : filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      Hiện không có lệnh đăng ký vân tay nào đang chờ.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg, idx) => {
                    const student = reg.studentId || {};
                    const device = devices.find((d) => d._id === idOf(reg.deviceId)) || reg.deviceId || {};
                    return (
                      <tr key={reg._id}>
                        <td>
                          <div className="student-cell">
                            <span className={`student-avatar avatar-${idx % 5}`}>
                              {(student.fullName || '?').trim().split(/\s+/).at(-1)?.slice(0, 1).toUpperCase()}
                            </span>
                            <span>
                              <strong>{student.fullName || '—'}</strong>
                              <small>{student.userName || '—'}</small>
                            </span>
                          </div>
                        </td>
                        <td><strong>{student.studentCode || '—'}</strong></td>
                        <td>
                          <span className="badge-unmarked" style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
                            {device.deviceName || device.deviceCode || 'Máy quét ESP32'}
                          </span>
                        </td>
                        <td>
                          <span className="badge-late" style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600 }}>
                            {fingerPositionLabel(reg.fingerPosition)}
                          </span>
                        </td>
                        <td>{formatDateTime(reg.createdAt)}</td>
                        <td className="action-col">
                          <button
                            className="button button-row"
                            style={{ color: '#c24b4b' }}
                            onClick={() => handleDeleteRegistration(reg)}
                          >
                            Hủy lệnh
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Đăng Ký Vân Tay Mới */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Đăng ký lấy mẫu vân tay mới</h3>
              <button className="close-button" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateRegistration}>
              <div className="modal-body">
                <p className="muted" style={{ marginBottom: '14px' }}>
                  Sau khi tạo lệnh, thiết bị ESP32 được chọn sẽ hiển thị thông báo và chuyển sang chế độ quét vân tay khi sinh viên đặt ngón tay vào cảm biến.
                </p>

                <label className="form-label">Chọn sinh viên lấy mẫu</label>
                <select
                  className="form-select"
                  value={regForm.studentId}
                  onChange={(e) => setRegForm({ ...regForm, studentId: e.target.value })}
                  required
                >
                  {students.map((st) => (
                    <option key={st._id} value={st._id}>
                      {st.studentCode ? `[${st.studentCode}] ` : ''}{st.fullName} ({st.userName})
                    </option>
                  ))}
                </select>

                <label className="form-label" style={{ marginTop: '12px' }}>Chọn thiết bị máy quét ESP32</label>
                <select
                  className="form-select"
                  value={regForm.deviceId}
                  onChange={(e) => setRegForm({ ...regForm, deviceId: e.target.value })}
                  required
                >
                  {devices.map((d) => (
                    <option key={d._id} value={d._id}>
                      [{d.deviceCode}] {d.deviceName}
                    </option>
                  ))}
                </select>

                <label className="form-label" style={{ marginTop: '12px' }}>Vị trí ngón tay quét</label>
                <select
                  className="form-select"
                  value={regForm.fingerPosition}
                  onChange={(e) => setRegForm({ ...regForm, fingerPosition: e.target.value })}
                  required
                >
                  <option value="ngon-tro-phai">Ngón trỏ phải (Phổ biến)</option>
                  <option value="ngon-cai-phai">Ngón cái phải</option>
                  <option value="ngon-giua-phai">Ngón giữa phải</option>
                  <option value="ngon-ap-ut-phai">Ngón áp út phải</option>
                  <option value="ngon-ut-phai">Ngón út phải</option>
                  <option value="ngon-tro-trai">Ngón trỏ trái</option>
                  <option value="ngon-cai-trai">Ngón cái trái</option>
                  <option value="ngon-giua-trai">Ngón giữa trái</option>
                  <option value="ngon-tay-phai">Ngón tay phải chung</option>
                  <option value="ngon-tay-trai">Ngón tay trái chung</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="button button-primary">
                  Gửi lệnh đăng ký đến máy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

