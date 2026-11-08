export const idOf = (value) => (typeof value === 'object' && value ? value._id : value) || '';

export function formatDate(value, options = {}) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', options).format(new Date(value));
}

export function formatTime(value) {
  return value
    ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
    : '—';
}

export function getSessionLabel(session) {
  const section = session.sectionId || {};
  const course = section.courseId || {};
  const title = course.courseName || course.courseCode || section.sectionCode || 'Buổi học';
  return `${title} · ${formatTime(session.startTime)}–${formatTime(session.endTime)}`;
}

export function downloadCsv(rows, filename) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const content = [
    ['Mã sinh viên', 'Họ và tên', 'Trạng thái', 'Thời gian', 'Hình thức'],
    ...rows.map((row) => [
      row.student?.studentCode || row.student?.userName || '',
      row.student?.fullName || '',
      statusLabel(row.status),
      row.checkInTime ? formatDate(row.checkInTime, { dateStyle: 'short', timeStyle: 'short' }) : '',
      row.method === 'fingerprint' ? 'Vân tay' : 'Thủ công',
    ]),
  ].map((line) => line.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function statusLabel(status) {
  return ({ present: 'Có mặt', late: 'Đi muộn', absent: 'Vắng' })[status] || 'Chưa điểm danh';
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

export function sessionStatusLabel(status) {
  return ({
    scheduled: 'Đã lên lịch',
    open: 'Đang mở điểm danh',
    closed: 'Đã đóng',
    cancelled: 'Đã hủy',
  })[status] || status || '—';
}

export function sessionStatusClass(status) {
  return ({
    scheduled: 'badge-scheduled',
    open: 'badge-open',
    closed: 'badge-closed',
    cancelled: 'badge-cancelled',
  })[status] || 'badge-unmarked';
}

export function fingerPositionLabel(pos) {
  const map = {
    'ngon-cai-phai': 'Ngón cái phải',
    'ngon-tro-phai': 'Ngón trỏ phải',
    'ngon-giua-phai': 'Ngón giữa phải',
    'ngon-ap-ut-phai': 'Ngón áp út phải',
    'ngon-ut-phai': 'Ngón út phải',
    'ngon-cai-trai': 'Ngón cái trái',
    'ngon-tro-trai': 'Ngón trỏ trái',
    'ngon-giua-trai': 'Ngón giữa trái',
    'ngon-ap-ut-trai': 'Ngón áp út trái',
    'ngon-ut-trai': 'Ngón út trái',
    'ngon-tay-phai': 'Ngón tay phải',
    'ngon-tay-trai': 'Ngón tay trái',
  };
  return map[pos] || pos || 'Chưa xác định';
}

export function toDatetimeLocal(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}
