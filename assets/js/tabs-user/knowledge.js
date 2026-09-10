import { auth, db } from '../firebase-config.js';
import { loadingBoxHTML, paginate, renderPaginationInto } from '../ui-utils.js';
import {
  collection, getDocs, query, orderBy, doc, setDoc, deleteDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const API_URL = 'https://mock.apidog.com/m1/1359084-1362618-default/lessons';
const SUBJECT_BADGE_CLASS = { math:'badge-math', physics:'badge-physics', english:'badge-english', chemistry:'badge-chemistry' };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let allLessons = [];
let pinnedIds = new Set();
let currentFilter = 'all';
let currentUid = null;
let currentPage = 1;
const PAGE_SIZE = 6;

function lessonKey(lesson) {
  return String(lesson.id);
}

async function loadPins(uid) {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'pinnedLessons'));
    pinnedIds = new Set(snap.docs.map(d => d.id));
  } catch (e) {
    console.error('Không tải được bài ghim:', e);
    pinnedIds = new Set();
  }
}

async function loadFirebaseLessons() {
  try {
    const snap = await getDocs(query(collection(db, 'knowledge'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, source: 'firebase', ...d.data() }));
  } catch (e) {
    console.warn('Firestore knowledge không khả dụng:', e);
    return [];
  }
}

async function loadApiLessons() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map(x => ({ ...x, source: 'api' })) : [];
  } catch (e) {
    console.warn('API kho kiến thức không khả dụng:', e);
    return [];
  }
}

async function loadData() {
  const box = $('kbCardsContainer');
  if (box) box.innerHTML = loadingBoxHTML('Đang tải kho kiến thức...');
  const [firebaseLessons, apiLessons] = await Promise.all([loadFirebaseLessons(), loadApiLessons()]);
  const seen = new Set();
  allLessons = [...firebaseLessons, ...apiLessons].filter(x => {
    const key = lessonKey(x);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  currentPage = 1;
  render();
}

function visibleLessons() {
  const keyword = ($('kbSearchInput')?.value || '').trim().toLowerCase();
  return allLessons.filter(l => {
    const subject = String(l.subject || '').toLowerCase();
    const text = `${l.title || ''} ${l.description || ''} ${l.content || ''}`.toLowerCase();
    return (currentFilter === 'all' || subject === currentFilter) && (!keyword || text.includes(keyword));
  });
}

function render() {
  const filtered = visibleLessons();
  const result = paginate(filtered, currentPage, PAGE_SIZE);
  currentPage = result.currentPage;

  renderCards(result.pageItems, filtered.length === 0);
  renderPinned();
  $('kbPinnedCount') && ($('kbPinnedCount').textContent = pinnedIds.size);

  renderPaginationInto($('kbPagination'), {
    totalItems: filtered.length,
    currentPage: currentPage,
    pageSize: PAGE_SIZE,
    onPageChange: (page) => { currentPage = page; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
}

function renderCards(lessons, isEmptyFiltered) {
  const box = $('kbCardsContainer');
  if (!box) return;
  if (!lessons.length) {
    box.innerHTML = `<p class="kb-empty-text">${isEmptyFiltered ? 'Không tìm thấy bài học phù hợp.' : 'Chưa có bài học nào.'}</p>`;
    return;
  }
  box.innerHTML = lessons.map(lesson => {
    const id = lessonKey(lesson);
    const pinned = pinnedIds.has(id);
    const badge = SUBJECT_BADGE_CLASS[lesson.subject] || 'badge-math';
    return `<article class="kb-card" data-id="${esc(id)}">
      <div>
        <div class="kb-card-top">
          <span class="subject-badge ${badge}">${esc(lesson.subjectLabel || lesson.subject || 'Khác')}</span>
          <span>${pinned ? '📌 Đã ghim' : ''}</span>
        </div>
        <h3 class="kb-card-title">${esc(lesson.title || 'Bài học không tên')}</h3>
        <p class="kb-card-description">${esc(lesson.description || 'Không có mô tả.')}</p>
      </div>
      <div class="kb-card-footer">
        <span>⏱️ ${esc(lesson.readTime || '5 phút đọc')}</span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="btn btn-pin-lesson" data-id="${esc(id)}" aria-pressed="${pinned}">${pinned ? '📌 Bỏ ghim' : '📍 Ghim'}</button>
          <a href="lesson-detail.html?id=${encodeURIComponent(id)}" class="kb-read-more">Xem bài ➔</a>
        </div>
      </div>
    </article>`;
  }).join('');
}

function renderPinned() {
  const list = document.querySelector('.pinned-list');
  if (!list) return;
  const pinned = allLessons.filter(l => pinnedIds.has(lessonKey(l)));
  if (!pinned.length) {
    list.innerHTML = `<li class="pinned-info"><p>📌 Bạn chưa ghim bài học nào.</p><small>Hãy bấm “Ghim” ngay trên bài học bạn muốn lưu.</small></li>`;
    return;
  }
  list.innerHTML = pinned.map(l => `<li class="pinned-item">
    <a href="lesson-detail.html?id=${encodeURIComponent(lessonKey(l))}" class="pinned-link">
      <span class="pinned-icon">📌</span><span><strong>${esc(l.title || 'Bài học')}</strong><small>${esc(l.subjectLabel || l.subject || 'Khác')}</small></span>
    </a>
    <button class="btn-unpin" data-id="${esc(lessonKey(l))}" title="Bỏ ghim">×</button>
  </li>`).join('');
}

async function togglePin(lessonId) {
  if (!currentUid) return alert('Bạn cần đăng nhập để ghim bài học.');
  const lesson = allLessons.find(l => lessonKey(l) === String(lessonId));
  if (!lesson) return;
  const ref = doc(db, 'users', currentUid, 'pinnedLessons', String(lessonId));
  try {
    if (pinnedIds.has(String(lessonId))) {
      await deleteDoc(ref);
      pinnedIds.delete(String(lessonId));
    } else {
      await setDoc(ref, {
        lessonId: String(lessonId),
        source: lesson.source || 'unknown',
        title: lesson.title || 'Bài học',
        subject: lesson.subject || '',
        subjectLabel: lesson.subjectLabel || lesson.subject || 'Khác',
        imageUrl: lesson.imageUrl || lesson.image || '',
        pinnedAt: serverTimestamp()
      });
      pinnedIds.add(String(lessonId));
    }
    render();
  } catch (e) {
    console.error(e);
    alert('❌ Không thể cập nhật bài ghim. Kiểm tra Firestore Rules.');
  }
}

function setupEvents() {
  $('kbSearchInput')?.addEventListener('input', () => { currentPage = 1; render(); });
  document.querySelectorAll('.chip-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.chip-btn').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter || 'all';
    currentPage = 1;
    render();
  }));
  $('kbCardsContainer')?.addEventListener('click', e => {
    const pin = e.target.closest('.btn-pin-lesson');
    if (pin) { e.preventDefault(); e.stopPropagation(); togglePin(pin.dataset.id); return; }
    const card = e.target.closest('.kb-card');
    if (card && !e.target.closest('a')) location.href = `lesson-detail.html?id=${encodeURIComponent(card.dataset.id)}`;
  });
  document.querySelector('.pinned-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.btn-unpin');
    if (btn) { e.preventDefault(); togglePin(btn.dataset.id); }
  });
}

onAuthStateChanged(auth, async user => {
  if (!user) return;
  currentUid = user.uid;
  await loadPins(user.uid);
  await loadData();
});

document.addEventListener('DOMContentLoaded', setupEvents);
