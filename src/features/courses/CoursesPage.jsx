import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import { idOf } from '../../utils/attendance.js';

export function CoursesPage({ identity }) {
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState('all');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionCode, setSectionCode] = useState('');
  const [sectionCourseId, setSectionCourseId] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [term, setTerm] = useState(1);

  const [showEnrollClassModal, setShowEnrollClassModal] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [coursesRes, sectionsRes, enrollmentsRes, classesRes] = await Promise.all([
        api.get('/courses/all').catch(() => api.get('/courses')),
        api.get('/sections/all').catch(() => api.get('/sections')),
        api.get('/enrollments/all').catch(() => api.get('/enrollments')),
        api.get('/classes/all').catch(() => api.get('/classes')),
      ]);
      setCourses(coursesRes || []);
      setSections(sectionsRes || []);
      setEnrollments(enrollmentsRes || []);
      setClasses(classesRes || []);
      if (!sectionCourseId && coursesRes?.length > 0) {
        setSectionCourseId(coursesRes[0]._id);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu môn học và học phần');
    } finally {
      setLoading(false);
    }
  }, [sectionCourseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Đếm sinh viên ghi danh theo từng học phần
  const enrollmentCountBySection = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      const sid = idOf(e.sectionId);
      map.set(sid, (map.get(sid) || 0) + 1);
    });
    return map;
  }, [enrollments]);

  // Sinh viên ghi danh hiển thị theo section đang chọn
  const filteredEnrollments = useMemo(() => {
    if (selectedSectionId === 'all') return enrollments;
    return enrollments.filter((e) => idOf(e.sectionId) === selectedSectionId);
  }, [enrollments, selectedSectionId]);

  // Tạo môn học mới
  async function handleCreateCourse(e) {
    e.preventDefault();
    if (!courseCode.trim() || !courseName.trim()) return;
    setError('');
    try {
      await api.post('/courses/create', {
        courseCode: courseCode.trim(),
        courseName: courseName.trim(),
      });
      setNotice(`Đã tạo môn học ${courseCode}`);
      setCourseCode('');
      setCourseName('');
      setShowCourseModal(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể tạo môn học');
    }
  }

  // Tạo học phần mới
  async function handleCreateSection(e) {
    e.preventDefault();
    if (!sectionCode.trim() || !sectionCourseId) return;
    setError('');
    try {
      await api.post('/sections/create', {
        sectionCode: sectionCode.trim(),
        courseId: sectionCourseId,
        teacherId: identity?._id,
        academicYear,
        term: Number(term),
      });
      setNotice(`Đã tạo học phần ${sectionCode}`);
      setSectionCode('');
      setShowSectionModal(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể tạo học phần');
    }
  }

  // Xóa học phần
  async function handleDeleteSection(sec) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa học phần "${sec.sectionCode}"?`)) return;
    setError('');
    try {
      await api.delete(`/sections/${sec._id}`);
      setNotice(`Đã xóa học phần ${sec.sectionCode}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể xóa học phần');
    }
  }

  // Ghi danh cả lớp vào học phần
  async function handleEnrollClass(e) {
    e.preventDefault();
    if (!targetSectionId || !targetClassId) {
      setError('Vui lòng chọn học phần và lớp sinh viên');
      return;
    }
    setEnrolling(true);
    setError('');
    try {
      const res = await api.post('/enrollments/create-by-class', {
        sectionId: targetSectionId,
        classId: targetClassId,
      });
      setNotice(res.message || 'Ghi danh lớp sinh viên vào học phần thành công!');
      setShowEnrollClassModal(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể ghi danh lớp vào học phần');
    } finally {
      setEnrolling(false);
    }
  }

  // Hủy ghi danh sinh viên
  async function handleDeleteEnrollment(enrollmentItem) {
    const student = enrollmentItem.studentId || {};
    if (!window.confirm(`Hủy ghi danh sinh viên ${student.fullName || student.studentCode}?`)) return;
    setError('');
    try {
      await api.delete(`/enrollments/${enrollmentItem._id}`);
      setNotice('Đã hủy ghi danh sinh viên khỏi học phần');
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể hủy ghi danh');
    }
  }

  return (
    <div className="attendance-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">QUẢN LÝ ĐÀO TẠO</div>
          <h1>Môn học & Học phần</h1>
          <p className="muted">Quản lý danh mục môn học, tạo các lớp học phần và ghi danh sinh viên theo lớp.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="button button-secondary" onClick={() => setShowCourseModal(true)}>
            + Thêm môn học
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              if (sections.length > 0) setTargetSectionId(sections[0]._id);
              if (classes.length > 0) setTargetClassId(classes[0]._id);
              setShowEnrollClassModal(true);
            }}
            disabled={sections.length === 0 || classes.length === 0}
          >
            👥 Ghi danh cả lớp vào HP
          </button>
          <button className="button button-primary" onClick={() => setShowSectionModal(true)} disabled={courses.length === 0}>
            + Mở lớp học phần mới
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
            <span>Tổng số môn học</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{courses.length}</div>
          <div className="stat-note">Chương trình đào tạo</div>
        </article>
        <article className="stat-card stat-green">
          <div className="stat-top">
            <span>Lớp học phần phụ trách</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{sections.length}</div>
          <div className="stat-note">Được phân công cho giảng viên</div>
        </article>
        <article className="stat-card stat-amber">
          <div className="stat-top">
            <span>Lượt ghi danh</span>
            <span className="stat-indicator" />
          </div>
          <div className="stat-value">{enrollments.length}</div>
          <div className="stat-note">Sinh viên trong các học phần</div>
        </article>
      </section>

      {/* Bảng danh sách học phần */}
      <section className="roster-card" style={{ marginBottom: '24px' }}>
        <div className="roster-heading">
          <div>
            <h2>Lớp học phần của bạn ({sections.length})</h2>
            <p className="muted">Danh sách các học phần bạn giảng dạy trong năm học.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: '22%' }}>MÃ HỌC PHẦN</th>
                <th style={{ width: '35%' }}>MÔN HỌC</th>
                <th style={{ width: '15%' }}>HỌC KỲ / NĂM</th>
                <th style={{ width: '13%' }}>SĨ SỐ ĐÃ GHI DANH</th>
                <th className="action-col">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-state">Đang tải danh sách học phần…</td>
                </tr>
              ) : sections.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">Chưa có lớp học phần nào. Bấm &quot;Mở lớp học phần mới&quot;.</td>
                </tr>
              ) : (
                sections.map((sec) => {
                  const course = sec.courseId || {};
                  const isSelected = selectedSectionId === sec._id;
                  const count = enrollmentCountBySection.get(sec._id) || 0;
                  return (
                    <tr key={sec._id} style={{ background: isSelected ? '#f2f6fa' : 'transparent' }}>
                      <td><strong>{sec.sectionCode}</strong></td>
                      <td>
                        <strong>{course.courseName || '—'}</strong>
                        <small style={{ display: 'block', color: 'var(--muted)', marginTop: '2px' }}>
                          Mã môn: {course.courseCode || '—'}
                        </small>
                      </td>
                      <td>
                        <span className="badge-unmarked" style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px' }}>
                          HK {sec.term || 1} ({sec.academicYear || '2026-2027'})
                        </span>
                      </td>
                      <td>
                        <span className="badge-present" style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                          {count} sinh viên
                        </span>
                      </td>
                      <td className="action-col">
                        <button
                          className="button button-row"
                          style={{ marginRight: '6px' }}
                          onClick={() => setSelectedSectionId(isSelected ? 'all' : sec._id)}
                        >
                          {isSelected ? 'Bỏ chọn' : 'Xem DSSV'}
                        </button>
                        <button
                          className="button button-row"
                          style={{ color: '#c24b4b' }}
                          onClick={() => handleDeleteSection(sec)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bảng sinh viên đã ghi danh vào học phần */}
      <section className="roster-card" style={{ marginBottom: '24px' }}>
        <div className="roster-heading">
          <div>
            <h2>
              Danh sách sinh viên đã ghi danh ({filteredEnrollments.length})
              {selectedSectionId !== 'all' && (
                <span style={{ fontSize: '12px', color: 'var(--blue)', marginLeft: '10px' }}>
                  [Lọc theo {sections.find((s) => s._id === selectedSectionId)?.sectionCode}]
                </span>
              )}
            </h2>
            <p className="muted">Sinh viên thuộc danh sách học phần chính thức tham gia điểm danh.</p>
          </div>
          {selectedSectionId !== 'all' && (
            <button className="button button-secondary" onClick={() => setSelectedSectionId('all')}>
              Xem tất cả học phần
            </button>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="student-col">SINH VIÊN</th>
                <th>MÃ SINH VIÊN</th>
                <th>LỚP HỌC PHẦN</th>
                <th>NGÀY GHI DANH</th>
                <th className="action-col">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-state">Đang tải danh sách…</td>
                </tr>
              ) : filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    Chưa có sinh viên ghi danh trong học phần này. Hãy bấm &quot;Ghi danh cả lớp vào HP&quot;.
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((en, idx) => {
                  const student = en.studentId || {};
                  const sec = en.sectionId || {};
                  return (
                    <tr key={en._id}>
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
                        <span className="badge-unmarked" style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '10px' }}>
                          {sec.sectionCode || '—'}
                        </span>
                      </td>
                      <td>{en.addedAt ? new Date(en.addedAt).toLocaleDateString('vi-VN') : '—'}</td>
                      <td className="action-col">
                        <button
                          className="button button-row"
                          style={{ color: '#c24b4b' }}
                          onClick={() => handleDeleteEnrollment(en)}
                        >
                          Hủy
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Danh mục môn học */}
      <section className="roster-card">
        <div className="roster-heading">
          <div>
            <h2>Danh mục môn học ({courses.length})</h2>
            <p className="muted">Các môn học được cấu hình trong hệ thống.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>MÃ MÔN HỌC</th>
                <th style={{ width: '75%' }}>TÊN MÔN HỌC</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c._id}>
                  <td><strong>{c.courseCode}</strong></td>
                  <td>{c.courseName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Thêm Môn Học */}
      {showCourseModal && (
        <div className="modal-backdrop" onClick={() => setShowCourseModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm môn học mới</h3>
              <button className="close-button" onClick={() => setShowCourseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCourse}>
              <div className="modal-body">
                <label className="form-label">Mã môn học</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: LNX102, CS50, IOT301"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  required
                />
                <label className="form-label">Tên môn học</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: Linux System Administration, Lập trình IoT"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowCourseModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="button button-primary">
                  Lưu môn học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mở Lớp Học Phần */}
      {showSectionModal && (
        <div className="modal-backdrop" onClick={() => setShowSectionModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mở lớp học phần mới</h3>
              <button className="close-button" onClick={() => setShowSectionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSection}>
              <div className="modal-body">
                <label className="form-label">Môn học</label>
                <select
                  className="form-select"
                  value={sectionCourseId}
                  onChange={(e) => setSectionCourseId(e.target.value)}
                  required
                >
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>

                <label className="form-label">Mã lớp học phần</label>
                <input
                  className="form-input"
                  placeholder="Ví dụ: LNX102_2026_HK1_01"
                  value={sectionCode}
                  onChange={(e) => setSectionCode(e.target.value)}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Năm học</label>
                    <input
                      className="form-input"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Học kỳ</label>
                    <select
                      className="form-select"
                      value={term}
                      onChange={(e) => setTerm(Number(e.target.value))}
                    >
                      <option value={1}>Học kỳ 1</option>
                      <option value={2}>Học kỳ 2</option>
                      <option value={3}>Học kỳ hè</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowSectionModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="button button-primary">
                  Tạo học phần
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ghi Danh Lớp Vào Học Phần */}
      {showEnrollClassModal && (
        <div className="modal-backdrop" onClick={() => setShowEnrollClassModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ghi danh cả lớp vào lớp học phần</h3>
              <button className="close-button" onClick={() => setShowEnrollClassModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEnrollClass}>
              <div className="modal-body">
                <p className="muted" style={{ marginBottom: '14px' }}>
                  Hệ thống sẽ tự động thêm toàn bộ sinh viên thuộc lớp niên chế này vào danh sách lớp học phần để tham gia điểm danh.
                </p>

                <label className="form-label">Chọn lớp học phần</label>
                <select
                  className="form-select"
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  required
                >
                  {sections.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.sectionCode} ({s.courseId?.courseName || 'Môn học'})
                    </option>
                  ))}
                </select>

                <label className="form-label" style={{ marginTop: '14px' }}>Chọn lớp sinh viên (Lớp niên chế)</label>
                <select
                  className="form-select"
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  required
                >
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.classCode} - {cls.className}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="button button-secondary" onClick={() => setShowEnrollClassModal(false)} disabled={enrolling}>
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={enrolling}>
                  {enrolling ? 'Đang ghi danh…' : 'Xác nhận ghi danh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

