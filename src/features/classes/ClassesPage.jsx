import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import { idOf } from '../../utils/attendance.js';

export function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [studentQuery, setStudentQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Modals
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassCode, setNewClassCode] = useState('');
  const [newClassName, setNewClassName] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);
  const [importClassId, setImportClassId] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    studentCode: '',
    userName: '',
    password: '',
    classId: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [classRes, studentRes] = await Promise.all([
        api.get('/classes/all').catch(() => api.get('/classes')),
        api.get('/users/all/student'),
      ]);
      setClasses(classRes || []);
      setStudents(studentRes || []);
      if (!importClassId && classRes?.length > 0) {
        setImportClassId(classRes[0]._id);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách lớp và sinh viên');
    } finally {
      setLoading(false);
    }
  }, [importClassId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thống kê sinh viên theo lớp
  const studentCountByClass = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      const cid = idOf(s.classId);
      map.set(cid, (map.get(cid) || 0) + 1);
    });
    return map;
  }, [students]);

  // Lọc sinh viên
  const visibleStudents = useMemo(() => {
    return students.filter((s) => {
      const cid = idOf(s.classId);
      const matchClass = selectedClassId === 'all' || cid === selectedClassId;
      const haystack = `${s.fullName || ''} ${s.studentCode || ''} ${s.userName || ''}`.toLowerCase();
      const matchQuery = haystack.includes(studentQuery.trim().toLowerCase());
      return matchClass && matchQuery;
    });
  }, [students, selectedClassId, studentQuery]);

  // Tạo lớp mới
  async function handleCreateClass(e) {
    e.preventDefault();
    if (!newClassCode.trim() || !newClassName.trim()) return;
    setError('');
    try {
      await api.post('/classes/create', {
        classCode: newClassCode.trim(),
        className: newClassName.trim(),
      });
      setNotice(`Đã tạo thành công lớp ${newClassCode}`);
      setNewClassCode('');
      setNewClassName('');
      setShowCreateClassModal(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể tạo lớp học');
    }
  }

  // Xóa lớp
  async function handleDeleteClass(classItem) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lớp "${classItem.className}" (${classItem.classCode})?`)) {
      return;
    }
    setError('');
    try {
      await api.delete(`/classes/${classItem._id}`);
      setNotice(`Đã xóa lớp ${classItem.classCode}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể xóa lớp');
    }
  }

  // Import Excel
  async function handleImportExcel(e) {
    e.preventDefault();
    if (!importClassId) {
      setError('Vui lòng chọn lớp học');
      return;
    }
    if (!importFile) {
      setError('Vui lòng chọn file Excel');
      return;
    }

    setImporting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.upload(`/users/${importClassId}/import`, formData);
      setNotice(res.message || 'Nhập danh sách sinh viên từ Excel thành công!');
      setShowImportModal(false);
      setImportFile(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Nhập file Excel thất bại');
    } finally {
      setImporting(false);
    }
  }

  // Thêm sinh viên thủ công
  async function handleAddStudent(e) {
    e.preventDefault();
    if (!studentForm.fullName || !studentForm.studentCode || !studentForm.classId) {
      setError('Vui lòng điền đủ thông tin sinh viên');
      return;
    }

    setError('');
    try {
      await api.post('/users/create', {
        fullName: studentForm.fullName.trim(),
        studentCode: studentForm.studentCode.trim(),
        userName: studentForm.userName.trim() || studentForm.studentCode.trim(),
        password: studentForm.password.trim() || studentForm.studentCode.trim(),
        role: 'student',
        classId: studentForm.classId,
      });
      setNotice(`Đã thêm sinh viên ${studentForm.fullName}`);
      setShowAddStudentModal(false);
      setStudentForm({ fullName: '', studentCode: '', userName: '', password: '', classId: '' });
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể tạo sinh viên');
    }
  }

  return (
    <div className="attendance-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">QUẢN LÝ ĐÀO TẠO</div>
          <h1>Lớp học & Sinh viên</h1>
          <p className="muted">Quản lý các lớp niên chế, thêm sinh viên hoặc nhập danh sách bằng file Excel.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="button button-secondary" onClick={() => setShowImportModal(true)} disabled={classes.length === 0}>
            ⭳ Nhập Excel vào lớp
          </button>
          <button className="button button-primary" onClick={() => setShowCreateClassModal(true)}>
            + Tạo lớp mới
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

      {/* Thống kê nhanh */}
      <section className="stats-grid">
        <article className="stat-card stat-blue">
          <div className="stat-top">
            <span>Tổng số lớp</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{classes.length}</div>
          <div className="stat-note">Lớp học hiện có trong hệ thống</div>
        </article>
        <article className="stat-card stat-green">
          <div className="stat-top">
            <span>Tổng số sinh viên</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{students.length}</div>
          <div className="stat-note">Sinh viên đã có tài khoản</div>
        </article>
        <article className="stat-card stat-amber">
          <div className="stat-top">
            <span>Lớp đang chọn lọc</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value" style={{ fontSize: '18px', paddingTop: '6px' }}>
            {selectedClassId === 'all' ? 'Tất cả lớp' : classes.find((c) => c._id === selectedClassId)?.classCode || '—'}
          </div>
          <div className="stat-note">{visibleStudents.length} sinh viên hiển thị</div>
        </article>
      </section>

      {/* Danh sách lớp học */}
      <section className="roster-card" style={{ marginBottom: '24px' }}>
        <div className="roster-heading">
          <div>
            <h2>Danh sách các lớp ({classes.length})</h2>
            <p className="muted">Các lớp niên chế và số lượng sinh viên.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: '20%' }}>MÃ LỚP</th>
                <th style={{ width: '45%' }}>TÊN LỚP</th>
                <th style={{ width: '20%' }}>SĨ SỐ SINH VIÊN</th>
                <th className="action-col">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="empty-state">Đang tải danh sách lớp…</td>
                </tr>
              ) : classes.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">Chưa có lớp nào. Hãy bấm &quot;Tạo lớp mới&quot;.</td>
                </tr>
              ) : (
                classes.map((item) => (
                  <tr key={item._id} style={{ background: selectedClassId === item._id ? '#f2f6fa' : 'transparent' }}>
                    <td><strong>{item.classCode}</strong></td>
                    <td>{item.className}</td>
                    <td>
                      <span className="badge-present" style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {studentCountByClass.get(item._id) || 0} sinh viên
                      </span>
                    </td>
                    <td className="action-col">
                      <button
                        className="button button-row"
                        style={{ marginRight: '6px' }}
                        onClick={() => setSelectedClassId(selectedClassId === item._id ? 'all' : item._id)}
                      >
                        {selectedClassId === item._id ? 'Bỏ lọc' : 'Xem SV'}
                      </button>
                      <button
                        className="button button-row"
                        style={{ color: '#c24b4b' }}
                        onClick={() => handleDeleteClass(item)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Danh sách sinh viên */}
      <section className="roster-card">
        <div className="roster-heading">
          <div>
            <h2>Danh sách sinh viên ({visibleStudents.length})</h2>
            <p className="muted">Chi tiết tài khoản và mã số sinh viên theo từng lớp.</p>
          </div>
          <button className="button button-secondary" onClick={() => setShowAddStudentModal(true)}>
            + Thêm sinh viên thủ công
          </button>
        </div>

        <div className="toolbar">
          <div className="filter-tabs">
            <button
              className={selectedClassId === 'all' ? 'filter-tab selected' : 'filter-tab'}
              onClick={() => setSelectedClassId('all')}
            >
              Tất cả <span>{students.length}</span>
            </button>
            {classes.map((cls) => (
              <button
                key={cls._id}
                className={selectedClassId === cls._id ? 'filter-tab selected' : 'filter-tab'}
                onClick={() => setSelectedClassId(cls._id)}
              >
                {cls.classCode} <span>{studentCountByClass.get(cls._id) || 0}</span>
              </button>
            ))}
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="Tìm theo tên, MSSV, username…"
            />
          </label>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="student-col">SINH VIÊN</th>
                <th>MÃ SINH VIÊN</th>
                <th>TÊN ĐĂNG NHẬP</th>
                <th>LỚP NIÊN CHẾ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="empty-state">Đang tải danh sách sinh viên…</td>
                </tr>
              ) : visibleStudents.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    {students.length === 0
                      ? 'Chưa có sinh viên nào trong hệ thống.'
                      : 'Không tìm thấy sinh viên phù hợp với bộ lọc.'}
                  </td>
                </tr>
              ) : (
                visibleStudents.map((s, idx) => {
                  const sClass = classes.find((c) => c._id === idOf(s.classId));
                  return (
                    <tr key={s._id}>
                      <td>
                        <div className="student-cell">
                          <span className={`student-avatar avatar-${idx % 5}`}>
                            {(s.fullName || '?').trim().split(/\s+/).at(-1)?.slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <strong>{s.fullName}</strong>
                            <small>{s.userName || '—'}</small>
                          </span>
                        </div>
                      </td>
                      <td><strong>{s.studentCode || '—'}</strong></td>
                      <td><code>{s.userName || '—'}</code></td>
                      <td>
                        <span className="badge-unmarked" style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px' }}>
                          {sClass ? `${sClass.classCode} - ${sClass.className}` : 'Chưa phân lớp'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Tạo Lớp */}
      {showCreateClassModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateClassModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo lớp học mới</h3>
              <button className="close-button" onClick={() => setShowCreateClassModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className="modal-body">
                <label className="form-label">Mã lớp</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: KTPM2211, DHKTPM18A"
                  value={newClassCode}
                  onChange={(e) => setNewClassCode(e.target.value)}
                  required
                />
                <label className="form-label">Tên lớp</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: Kỹ thuật phần mềm 2022"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowCreateClassModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="button button-primary">
                  Lưu lớp học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Excel */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nhập danh sách sinh viên từ file Excel</h3>
              <button className="close-button" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <form onSubmit={handleImportExcel}>
              <div className="modal-body">
                <p className="muted" style={{ marginBottom: '14px' }}>
                  File Excel cần chứa các cột: <code>fullName</code> (Họ và tên), <code>studentCode</code> (Mã SV), tùy chọn: <code>userName</code>, <code>password</code>.
                </p>
                <label className="form-label">Chọn lớp niên chế tiếp nhận</label>
                <select
                  className="form-select"
                  value={importClassId}
                  onChange={(e) => setImportClassId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.classCode} - {cls.className}
                    </option>
                  ))}
                </select>

                <label className="form-label" style={{ marginTop: '14px' }}>Chọn file Excel (.xlsx / .xls)</label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="form-input"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowImportModal(false)} disabled={importing}>
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={importing || !importFile}>
                  {importing ? 'Đang nhập dữ liệu…' : 'Bắt đầu nạp sinh viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Sinh Viên Thủ Công */}
      {showAddStudentModal && (
        <div className="modal-backdrop" onClick={() => setShowAddStudentModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm sinh viên mới</h3>
              <button className="close-button" onClick={() => setShowAddStudentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="modal-body">
                <label className="form-label">Lớp niên chế</label>
                <select
                  className="form-select"
                  value={studentForm.classId}
                  onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.classCode} - {c.className}
                    </option>
                  ))}
                </select>

                <label className="form-label">Họ và tên</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={studentForm.fullName}
                  onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                  required
                />

                <label className="form-label">Mã số sinh viên (MSSV)</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: 2022601234"
                  value={studentForm.studentCode}
                  onChange={(e) => setStudentForm({ ...studentForm, studentCode: e.target.value })}
                  required
                />

                <label className="form-label">Tên đăng nhập (mặc định lấy MSSV nếu để trống)</label>
                <input
                  className="form-input"
                  placeholder="Để trống sẽ tự động lấy MSSV"
                  value={studentForm.userName}
                  onChange={(e) => setStudentForm({ ...studentForm, userName: e.target.value })}
                />

                <label className="form-label">Mật khẩu ban đầu (mặc định lấy MSSV nếu để trống)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Để trống sẽ tự động lấy MSSV"
                  value={studentForm.password}
                  onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowAddStudentModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="button button-primary">
                  Tạo sinh viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

