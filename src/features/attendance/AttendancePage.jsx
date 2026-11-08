import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import { downloadCsv, formatDate, formatTime, getSessionLabel, idOf, statusLabel } from '../../utils/attendance.js';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'present', label: 'Có mặt' },
  { key: 'late', label: 'Đi muộn' },
  { key: 'absent', label: 'Vắng' },
  { key: 'unmarked', label: 'Chưa điểm danh' },
];

function statusClass(status) {
  return ({ present: 'badge-present', late: 'badge-late', absent: 'badge-absent' })[status] || 'badge-unmarked';
}

export function AttendancePage({ identity, initialSessionId }) {
  const [sessions, setSessions] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [sessionId, setSessionId] = useState(initialSessionId || '');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (initialSessionId) setSessionId(initialSessionId);
  }, [initialSessionId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sessionData, enrollmentData, attendanceData] = await Promise.all([
        api.get('/sessions/all'), api.get('/enrollments/all'), api.get('/attendance/teacher'),
      ]);
      setSessions(sessionData || []);
      setEnrollments(enrollmentData || []);
      setAttendance(attendanceData || []);
      setSessionId((current) => current || initialSessionId || sessionData[0]?._id || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [initialSessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const teacherSessions = sessions.filter((session) => {
    const teacherId = idOf(session.sectionId?.teacherId);
    return !identity?._id || teacherId === identity._id;
  });
  const selectedSession = teacherSessions.find((session) => session._id === sessionId);

  useEffect(() => {
    if (teacherSessions.length && !teacherSessions.some((session) => session._id === sessionId)) {
      setSessionId(teacherSessions[0]._id);
    }
  }, [teacherSessions, sessionId]);
  const sectionId = idOf(selectedSession?.sectionId);
  const sessionAttendance = attendance.filter((item) => idOf(item.sessionId) === sessionId);
  const attendanceByStudent = useMemo(() => new Map(sessionAttendance.map((item) => [idOf(item.studentId), item])), [sessionAttendance]);
  const roster = useMemo(() => enrollments
    .filter((item) => idOf(item.sectionId) === sectionId)
    .map((item) => {
      const student = item.studentId || {};
      const record = attendanceByStudent.get(idOf(student));
      return {
        id: idOf(student), student, record,
        status: drafts[idOf(student)] || record?.status || 'unmarked',
      };
    })
    .sort((a, b) => (a.student.fullName || '').localeCompare(b.student.fullName || '', 'vi')),
  [enrollments, sectionId, attendanceByStudent, drafts]);

  const counts = useMemo(() => roster.reduce((result, row) => {
    result.total += 1;
    if (row.status === 'present') result.present += 1;
    if (row.status === 'late') result.late += 1;
    if (row.status === 'absent') result.absent += 1;
    if (row.status === 'unmarked') result.unmarked += 1;
    return result;
  }, { total: 0, present: 0, late: 0, absent: 0, unmarked: 0 }), [roster]);

  const visibleRows = roster.filter((row) => {
    const matchesFilter = filter === 'all' || row.status === filter;
    const haystack = `${row.student.fullName || ''} ${row.student.studentCode || ''} ${row.student.userName || ''}`.toLocaleLowerCase('vi');
    return matchesFilter && haystack.includes(query.trim().toLocaleLowerCase('vi'));
  });

  function setStudentStatus(studentId, status) {
    setDrafts((current) => ({ ...current, [studentId]: status }));
  }

  async function saveRow(row) {
    if (!row.record && row.status === 'unmarked') return;
    setSavingId(row.id);
    setError('');
    setNotice('');
    const timestamp = row.status === 'absent' ? null : new Date().toISOString();
    const payload = {
      status: row.status === 'unmarked' ? 'absent' : row.status,
      method: 'manual',
      checkInTime: timestamp,
      ...(row.record ? {} : { sessionId, studentId: row.id }),
    };
    try {
      if (row.record) await api.patch(`/attendance/${row.record._id}`, payload);
      else await api.post('/attendance/create', payload);
      setDrafts((current) => { const next = { ...current }; delete next[row.id]; return next; });
      setNotice(`Đã lưu điểm danh cho ${row.student.fullName}.`);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId('');
    }
  }

  async function deleteRecord(row) {
    if (!row.record) return;
    if (!window.confirm(`Xóa bản ghi điểm danh của ${row.student.fullName}?`)) return;
    setError('');
    try {
      await api.delete(`/attendance/${row.record._id}`);
      setDrafts((current) => { const next = { ...current }; delete next[row.id]; return next; });
      setNotice(`Đã xóa điểm danh của ${row.student.fullName}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể xóa điểm danh');
    }
  }

  const course = selectedSession?.sectionId?.courseId || {};
  const section = selectedSession?.sectionId || {};
  const dateLabel = selectedSession ? formatDate(selectedSession.startTime, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Chưa chọn buổi học';

  return (
    <div className="attendance-page">
      <div className="page-heading">
        <div><div className="eyebrow">QUẢN LÝ LỚP HỌC</div><h1>Điểm danh</h1><p className="muted">Theo dõi sĩ số và cập nhật điểm danh cho từng buổi học.</p></div>
        <button className="button button-secondary" onClick={() => selectedSession && downloadCsv(roster.map((row) => ({ student: row.student, status: row.status, checkInTime: row.record?.checkInTime, method: row.record?.method || 'manual' })), `diem-danh-${section.sectionCode || 'lop'}-${new Date(selectedSession.startTime).toISOString().slice(0, 10)}.csv`)} disabled={!selectedSession || roster.length === 0}>
          <span aria-hidden="true">⇩</span> Xuất CSV
        </button>
      </div>

      {error && <div className="alert alert-error" role="alert"><span>{error}</span><button onClick={loadData}>Thử lại</button></div>}
      {notice && <div className="alert alert-success" role="status">{notice}<button aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}

      <section className="session-card" aria-label="Chọn buổi học">
        <div className="session-picker">
          <label htmlFor="session-select">Buổi học</label>
          <select id="session-select" value={sessionId} onChange={(event) => { setSessionId(event.target.value); setDrafts({}); }} disabled={loading || sessions.length === 0}>
            {teacherSessions.length === 0 && <option value="">Chưa có buổi học</option>}
            {teacherSessions.map((session) => <option value={session._id} key={session._id}>{getSessionLabel(session)}</option>)}
          </select>
        </div>
        <div className="session-detail"><strong>{course.courseName || course.courseCode || 'Môn học'}</strong><span>{section.sectionCode || '—'}</span><span>{dateLabel}</span></div>
        <div className="session-time"><span className="session-time-icon">◷</span><span><strong>{formatTime(selectedSession?.startTime)} – {formatTime(selectedSession?.endTime)}</strong><small>Giờ học</small></span></div>
      </section>

      <section className="stats-grid" aria-label="Tổng hợp điểm danh">
        <StatCard label="Tổng số sinh viên" value={counts.total} note="Theo danh sách lớp" />
        <StatCard label="Có mặt" value={counts.present} note={`${counts.total ? Math.round((counts.present / counts.total) * 100) : 0}% sĩ số`} tone="green" />
        <StatCard label="Đi muộn" value={counts.late} note="Cần lưu ý" tone="amber" />
        <StatCard label="Chưa điểm danh" value={counts.unmarked} note={counts.absent ? `${counts.absent} sinh viên vắng` : 'Chưa có kết quả'} tone="gray" />
      </section>

      <section className="roster-card">
        <div className="roster-heading"><div><h2>Danh sách sinh viên</h2><p className="muted">Cập nhật trạng thái trực tiếp trong danh sách.</p></div><div className="roster-count">{visibleRows.length} / {counts.total} sinh viên</div></div>
        <div className="toolbar">
          <div className="filter-tabs" role="tablist" aria-label="Lọc theo trạng thái">
            {FILTERS.map((item) => <button key={item.key} className={filter === item.key ? 'filter-tab selected' : 'filter-tab'} onClick={() => setFilter(item.key)} role="tab" aria-selected={filter === item.key}>{item.label}{item.key !== 'all' && <span>{item.key === 'unmarked' ? counts.unmarked : counts[item.key]}</span>}</button>)}
          </div>
          <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, mã sinh viên" aria-label="Tìm sinh viên" /></label>
        </div>

        <div className="table-scroll">
          <table>
            <thead><tr><th className="student-col">SINH VIÊN</th><th>TRẠNG THÁI</th><th>THỜI GIAN ĐIỂM DANH</th><th>HÌNH THỨC</th><th className="action-col">THAO TÁC</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="empty-state">Đang tải danh sách…</td></tr> : visibleRows.map((row, index) => {
                const savedStatus = row.record?.status || 'unmarked';
                const changed = row.status !== savedStatus;
                return <tr key={row.id}>
                  <td><div className="student-cell"><span className={`student-avatar avatar-${index % 5}`}>{(row.student.fullName || '?').trim().split(/\s+/).at(-1)?.slice(0, 1).toUpperCase()}</span><span><strong>{row.student.fullName || 'Chưa có tên'}</strong><small>{row.student.studentCode || row.student.userName || '—'}</small></span></div></td>
                  <td><select className={`status-select ${statusClass(row.status)}`} value={row.status} onChange={(event) => setStudentStatus(row.id, event.target.value)} aria-label={`Trạng thái của ${row.student.fullName}`}>
                    <option value="unmarked">Chưa điểm danh</option><option value="present">Có mặt</option><option value="late">Đi muộn</option><option value="absent">Vắng</option>
                  </select></td>
                  <td>{row.record?.checkInTime ? <span className="time-cell">{formatTime(row.record.checkInTime)} <small>{formatDate(row.record.checkInTime, { day: '2-digit', month: '2-digit' })}</small></span> : <span className="muted">—</span>}</td>
                  <td>{row.record ? <span className="method-cell"><span className={row.record.method === 'fingerprint' ? 'method-icon fingerprint' : 'method-icon'}>{row.record.method === 'fingerprint' ? '◉' : '✎'}</span>{row.record.method === 'fingerprint' ? 'Vân tay' : 'Thủ công'}</span> : <span className="muted">—</span>}</td>
                  <td className="action-col">
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button className={changed ? 'button button-save' : 'button button-row'} disabled={!changed || savingId === row.id} onClick={() => saveRow(row)}>
                        {savingId === row.id ? 'Đang lưu…' : changed ? 'Lưu' : 'Sửa'}
                      </button>
                      {row.record && (
                        <button className="button button-row" style={{ color: '#c24b4b' }} title="Xóa bản ghi này" onClick={() => deleteRecord(row)}>
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>;
              })}
              {!loading && visibleRows.length === 0 && <tr><td colSpan="5" className="empty-state">{roster.length === 0 ? 'Chưa có sinh viên trong danh sách lớp học phần này.' : 'Không tìm thấy sinh viên phù hợp.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="table-footer"><span>Giờ điểm danh được ghi nhận theo giờ thiết bị.</span><button className="text-button" onClick={loadData}>↻ Cập nhật danh sách</button></footer>
      </section>
    </div>
  );
}

function StatCard({ label, value, note, tone = 'blue' }) {
  return <article className={`stat-card stat-${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-indicator" /></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></article>;
}
