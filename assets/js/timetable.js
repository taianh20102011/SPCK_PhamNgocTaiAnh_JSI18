import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Người dùng hiện tại. Firebase sẽ gán giá trị sau khi kiểm tra đăng nhập.
let currentUser = null;

// Mảng dữ liệu lấy từ các collection tương ứng trong Firestore.
let studyData = [];
let examData = [];
let deadlineData = [];
let historyData = [];

// Trạng thái của đồng hồ Pomodoro.
let timerId = null;
let focusMinutes = 25;
let secondsLeft = focusMinutes * 60;
let isStudying = false;

// Ngày đầu tuần đang được xem trên giao diện.
let currentWeekStart = getMonday(new Date());

// Viết ngắn document.getElementById để code phía dưới dễ đọc hơn.
const $ = (id) => document.getElementById(id);

// Chờ Firebase xác nhận người dùng rồi mới đọc dữ liệu thời khóa biểu.
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    return;
  }

  currentUser = user;
  showLoadingState();
  try {
    await loadAllData();
    updateScreen();
  } catch (error) {
    console.error('Không tải được dữ liệu thời khóa biểu:', error);
    showMessage('Không thể tải dữ liệu. Vui lòng thử lại sau.');
  }
});

async function loadAllData() {
  // Hiện trạng thái chờ trong lúc Firebase trả dữ liệu mới.
  showLoadingState();

  // Mỗi loại dữ liệu nằm trong một collection riêng của người dùng.
  studyData = await getData('studySchedules');
  examData = await getData('exams');
  deadlineData = await getData('deadlines');
  historyData = await getData('pomodoroHistory');
}

async function getData(collectionName) {
  const result = [];
  const dataRef = collection(db, 'users', currentUser.uid, collectionName);
  // Sắp xếp mục mới tạo lên đầu. Nếu collection chưa có dữ liệu thì trả mảng rỗng.
  const snapshot = await getDocs(query(dataRef, orderBy('createdAt', 'desc'))).catch(() => null);

  if (!snapshot) return result;

  snapshot.forEach((item) => {
    result.push({ id: item.id, ...item.data() });
  });

  return result;
}

// Vẽ lại toàn bộ phần giao diện sau mỗi lần thêm, xóa hoặc hoàn thành dữ liệu.
function updateScreen() {
  renderWeek();
  renderStudy();
  renderExams();
  renderDeadlines();
  renderHistory();
  updateStats();
}

// Hiển thị các lịch vào đúng ngày trong bảng tuần 7 cột.
function renderWeekTimeline() {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(currentWeekStart);
    day.setDate(day.getDate() + index);
    return toDateKey(day);
  });

  const items = [
    ...studyData.map((item) => ({ ...item, kind: 'study', icon: '📚' })),
    ...examData.map((item) => ({ ...item, kind: 'exam', icon: '📝' })),
    ...deadlineData.filter((item) => !item.done).map((item) => ({ ...item, kind: 'deadline', icon: '⏰' }))
  ];

  $('weekTimeline').innerHTML = days.map((day) => {
    const dayItems = items.filter((item) => item.date === day);
    return `<div class="week-day-column">
      <small>${formatShortDate(day)}</small>
      ${dayItems.length ? dayItems.map((item) => `
        <div class="week-event ${item.kind}">
          <strong>${item.icon} ${escapeHTML(item.name)}</strong>
          <span>${escapeHTML(item.time || 'Cả ngày')}${item.kind === 'study' ? ` · ${formatDuration(item.durationMinutes)}` : ''}</span>
        </div>`).join('') : '<span class="week-empty">Trống</span>'}
    </div>`;
  }).join('');
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function showLoadingState() {
  const loading = '<div class="loading-state"><span class="spinner"></span><span>Đang tải dữ liệu...</span></div>';
  $('weekTimeline').innerHTML = loading;
  $('studyList').innerHTML = loading;
  $('examList').innerHTML = loading;
  $('deadlineList').innerHTML = loading;
  $('historyList').innerHTML = loading;
}

function getMonday(date) {
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Hiển thị khoảng ngày của tuần hiện tại.
function renderWeek() {
  const end = new Date(currentWeekStart);
  end.setDate(end.getDate() + 6);
  const format = (date) => date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  $('weekTitle').textContent = `Tuần ${format(currentWeekStart)} -> ${format(end)}`;
  renderWeekTimeline();
}

// offset = -1 để lùi một tuần, offset = 1 để tiến một tuần.
function moveWeek(offset) {
  currentWeekStart.setDate(currentWeekStart.getDate() + offset * 7);
  renderWeek();
}

function renderStudy() {
  if (studyData.length === 0) {
    $('studyList').innerHTML = '<p class="empty">Chưa có lịch học.</p>';
    return;
  }

  $('studyList').innerHTML = studyData.map((item) => `
    <div class="list-item">
      <div><strong>${escapeHTML(item.name)}</strong><small>${item.date} ${item.time || ''} · ${formatDuration(item.durationMinutes)}</small><small>${escapeHTML(item.extra || '')}</small></div>
      <button class="delete-btn" data-delete="studySchedules" data-id="${item.id}">Xóa</button>
    </div>
  `).join('');
}

function renderExams() {
  if (examData.length === 0) {
    $('examList').innerHTML = '<p class="empty">Chưa có lịch kiểm tra.</p>';
    return;
  }

  $('examList').innerHTML = examData.map((item) => `
    <div class="list-item">
      <div><strong>${escapeHTML(item.name)}</strong><small>${item.date} ${item.time || ''}</small><small>${escapeHTML(item.extra || '')}</small></div>
      <button class="delete-btn" data-delete="exams" data-id="${item.id}">Xóa</button>
    </div>
  `).join('');
}

function renderDeadlines() {
  if (deadlineData.length === 0) {
    $('deadlineList').innerHTML = '<p class="empty">Chưa có deadline.</p>';
    return;
  }

  $('deadlineList').innerHTML = deadlineData.map((item) => `
    <div class="list-item ${item.done ? 'done' : ''}">
      <div><strong>${escapeHTML(item.name)}</strong><small>Hạn: ${item.date}</small><small>${escapeHTML(item.extra || '')}</small></div>
      <div class="item-buttons">
        <button class="done-btn" data-done="${item.id}">${item.done ? 'Đã xong' : 'Hoàn thành'}</button>
        <button class="delete-btn" data-delete="deadlines" data-id="${item.id}">Xóa</button>
      </div>
    </div>
  `).join('');
}

function renderHistory() {
  if (historyData.length === 0) {
    $('historyList').innerHTML = '<p class="empty">Chưa có phiên học nào.</p>';
    return;
  }

  $('historyList').innerHTML = historyData.slice(0, 5).map((item) => `
    <div class="history-item"><span>🍅 ${item.minutes} phút</span><small>${item.date}</small></div>
  `).join('');
}

function updateStats() {
  const unfinished = deadlineData.filter((item) => !item.done).length;
  const totalMinutes = historyData.reduce((sum, item) => sum + Number(item.minutes || 0), 0);

  $('studyCount').textContent = studyData.length;
  $('examCount').textContent = examData.length;
  $('deadlineCount').textContent = unfinished;
  $('studyMinutes').textContent = `${totalMinutes} phút`;
}

// Mở form và đổi nhãn theo loại dữ liệu người dùng muốn thêm.
function openModal(type) {
  $('dataType').value = type;
  $('modal').classList.remove('hidden');
  $('dataForm').reset();
  $('durationField').hidden = type !== 'studySchedules';
  $('customDurationInput').hidden = true;

  if (type === 'studySchedules') {
    $('modalTitle').textContent = '📚 Thêm lịch học';
    $('nameLabel').textContent = 'Tên môn học';
    $('dateLabel').textContent = 'Ngày học';
    $('extraLabel').textContent = 'Giáo viên / phòng';
  }

  if (type === 'exams') {
    $('modalTitle').textContent = '📝 Thêm lịch kiểm tra';
    $('nameLabel').textContent = 'Môn kiểm tra';
    $('dateLabel').textContent = 'Ngày kiểm tra';
    $('extraLabel').textContent = 'Phòng / nội dung';
  }

  if (type === 'deadlines') {
    $('modalTitle').textContent = '⏰ Thêm deadline';
    $('nameLabel').textContent = 'Tên công việc';
    $('dateLabel').textContent = 'Hạn hoàn thành';
    $('extraLabel').textContent = 'Ghi chú';
  }
}

// Đổi số phút thành cách viết dễ đọc trong danh sách lịch học.
function formatDuration(minutes) {
  const value = Number(minutes || 0);
  if (!value) return 'Chưa chọn thời lượng';
  if (value < 60) return `${value} phút`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}

$('addStudyBtn').addEventListener('click', () => openModal('studySchedules'));
$('addExamBtn').addEventListener('click', () => openModal('exams'));
$('addDeadlineBtn').addEventListener('click', () => openModal('deadlines'));
$('closeModal').addEventListener('click', closeModal);
$('prevWeek').addEventListener('click', () => moveWeek(-1));
$('nextWeek').addEventListener('click', () => moveWeek(1));
$('todayWeek').addEventListener('click', () => {
  currentWeekStart = getMonday(new Date());
  renderWeek();
});
$('durationInput').addEventListener('change', () => {
  $('customDurationInput').hidden = $('durationInput').value !== 'custom';
});

function closeModal() {
  $('modal').classList.add('hidden');
}

$('dataForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showMessage('Bạn cần đăng nhập trước khi lưu dữ liệu.');
    return;
  }

  const type = $('dataType').value;
  const saveButton = $('dataForm').querySelector('[type="submit"]');
  saveButton.disabled = true;
  saveButton.classList.add('is-loading');
  saveButton.innerHTML = '<span class="spinner spinner-light"></span> Đang lưu...';
  let durationMinutes = 0;
  if (type === 'studySchedules') {
    durationMinutes = $('durationInput').value === 'custom'
      ? Number($('customDurationInput').value)
      : Number($('durationInput').value);

    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
      saveButton.disabled = false;
      saveButton.classList.remove('is-loading');
      saveButton.textContent = 'Lưu';
      showMessage('Vui lòng chọn hoặc nhập thời lượng học từ 1 đến 1440 phút.');
      return;
    }
  }

  const data = {
    name: $('nameInput').value.trim(),
    date: $('dateInput').value,
    time: $('timeInput').value,
    durationMinutes,
    extra: $('extraInput').value.trim(),
    done: false,
    createdAt: Date.now()
  };

  try {
    await addDoc(collection(db, 'users', currentUser.uid, type), data);
    closeModal();
    await loadAllData();
    updateScreen();
  } catch (error) {
    console.error('Không lưu được dữ liệu:', error);
    showMessage('Không thể lưu dữ liệu. Vui lòng thử lại.');
  } finally {
    saveButton.disabled = false;
    saveButton.classList.remove('is-loading');
    saveButton.textContent = 'Lưu';
  }
});

// Dùng một listener chung cho các nút được tạo động trong danh sách.
document.addEventListener('click', async (event) => {
  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) {
    const ok = confirm('Bạn có chắc muốn xóa mục này?');
    if (!ok) return;

    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, deleteButton.dataset.delete, deleteButton.dataset.id));
      await loadAllData();
      updateScreen();
    } catch (error) {
      console.error('Không xóa được dữ liệu:', error);
      showMessage('Không thể xóa mục này. Vui lòng thử lại.');
    }
  }

  const doneButton = event.target.closest('[data-done]');
  if (doneButton) {
    const item = deadlineData.find((x) => x.id === doneButton.dataset.done);
    if (!item) return;

    // Deadline hoàn thành được xóa khỏi danh sách đang theo dõi.
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'deadlines', item.id));
      await loadAllData();
      updateScreen();
    } catch (error) {
      console.error('Không cập nhật được deadline:', error);
      showMessage('Không thể cập nhật deadline. Vui lòng thử lại.');
    }
  }
});

// Cập nhật số phút, số giây và thanh tiến trình trên màn hình.
function updateTimer() {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  $('timer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalSeconds = focusMinutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  $('timerProgress').style.width = `${progress}%`;
}

// Đổi thời lượng tập trung và đưa timer về đầu chu kỳ mới.
function applyFocusMinutes() {
  const inputValue = Number($('focusMinutes').value);
  if (!Number.isInteger(inputValue) || inputValue < 1 || inputValue > 120) {
    showMessage('Vui lòng chọn thời gian từ 1 đến 120 phút.');
    return;
  }

  pauseTimer();
  focusMinutes = inputValue;
  secondsLeft = focusMinutes * 60;
  isStudying = false;
  $('focusDescription').textContent = `${focusMinutes} phút tập trung → 5 phút nghỉ.`;
  updateTimer();
}

function startTimer() {
  if (!currentUser) {
    showMessage('Bạn cần đăng nhập trước khi bắt đầu học.');
    return;
  }

  if (timerId) return;
  isStudying = true;

  timerId = setInterval(() => {
    secondsLeft--;
    updateTimer();

    if (secondsLeft <= 0) {
      finishPomodoro();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerId);
  timerId = null;
}

function resetTimer() {
  pauseTimer();
  secondsLeft = focusMinutes * 60;
  isStudying = false;
  updateTimer();
}

function showMessage(message) {
  window.alert(message);
}

async function finishPomodoro() {
  if (!currentUser) return;

  pauseTimer();
  secondsLeft = focusMinutes * 60;
  isStudying = false;
  updateTimer();

  // Khi chạy đủ thời lượng, lưu một phiên học vào Firebase.
  await addDoc(collection(db, 'users', currentUser.uid, 'pomodoroHistory'), {
    minutes: focusMinutes,
    date: new Date().toLocaleString('vi-VN'),
    createdAt: Date.now()
  });

  alert(`🎉 Bạn đã hoàn thành ${focusMinutes} phút học! Hãy nghỉ 5 phút.`);
  await loadAllData();
  updateScreen();
}

$('startBtn').addEventListener('click', startTimer);
$('pauseBtn').addEventListener('click', pauseTimer);
$('resetBtn').addEventListener('click', resetTimer);
$('applyFocusMinutes').addEventListener('click', applyFocusMinutes);

// Chặn dữ liệu người dùng chứa HTML/JavaScript khi đưa vào innerHTML.
function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

updateTimer();
