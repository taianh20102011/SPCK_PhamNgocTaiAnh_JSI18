import { db } from "../firebase-config.js";
import { loadingBoxHTML, withButtonLoading } from "../ui-utils.js";
import { collection, getDocs, addDoc, query, orderBy, limit, startAfter, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const logsRef = collection(db, "logs");
const PAGE_SIZE = 10;

// Con trỏ (cursor) đầu mỗi trang đã xem qua, dùng để hỗ trợ nút "Trang trước"
let pageCursors = [null]; // cursor của trang 1 luôn là null (bắt đầu từ đầu)
let currentPage = 1;
let hasNextPage = false;

async function loadLogs(page = 1) {
  const box = document.getElementById('logsBox');
  if (!box) return;

  box.innerHTML = loadingBoxHTML("Đang tải nhật ký hệ thống...");

  try {
    const cursor = pageCursors[page - 1];
    let q = cursor
      ? query(logsRef, orderBy("timestamp", "desc"), startAfter(cursor), limit(PAGE_SIZE + 1))
      : query(logsRef, orderBy("timestamp", "desc"), limit(PAGE_SIZE + 1));

    const snap = await getDocs(q);
    const docs = snap.docs;

    hasNextPage = docs.length > PAGE_SIZE;
    const pageDocs = docs.slice(0, PAGE_SIZE);

    // Lưu cursor để trang kế tiếp có thể "startAfter" đúng vị trí
    if (pageDocs.length > 0) {
      pageCursors[page] = pageDocs[pageDocs.length - 1];
    }

    currentPage = page;

    if (pageDocs.length === 0) {
      box.innerHTML = "> Không có nhật ký hoặc lỗi tải nhật ký.";
    } else {
      box.innerHTML = pageDocs.map(docSnap => {
        const log = docSnap.data();
        return `<p style="margin:4px 0;">[${log.type || 'INFO'}] ${log.message}</p>`;
      }).join('');
    }

    renderLogsPagination();
  } catch (err) {
    box.innerHTML = "> Không có nhật ký hoặc lỗi tải nhật ký.";
  }
}

// Firestore phân trang theo cursor nên không biết trước tổng số bản ghi
// -> chỉ cần 2 nút Trước/Sau (Sau chỉ bật khi thật sự còn dữ liệu).
function renderLogsPagination() {
  const paginationEl = document.getElementById('logsPagination');
  if (!paginationEl) return;

  if (currentPage === 1 && !hasNextPage) {
    paginationEl.innerHTML = '';
    return;
  }

  paginationEl.className = 'brx-pagination';
  paginationEl.innerHTML = `
    <span class="brx-pagination-info">Trang ${currentPage}</span>
    <button type="button" class="brx-page-btn" id="btnLogsPrev" ${currentPage <= 1 ? 'disabled' : ''}>‹ Trước</button>
    <button type="button" class="brx-page-btn" id="btnLogsNext" ${!hasNextPage ? 'disabled' : ''}>Sau ›</button>
  `;

  document.getElementById('btnLogsPrev')?.addEventListener('click', () => {
    if (currentPage > 1) loadLogs(currentPage - 1);
  });
  document.getElementById('btnLogsNext')?.addEventListener('click', () => {
    if (hasNextPage) loadLogs(currentPage + 1);
  });
}

// LƯU LOG MỚI VÀO FIREBASE
document.addEventListener('DOMContentLoaded', () => {
  loadLogs(1);

  const btnCreateLog = document.getElementById('btnCreateLog');
  if (btnCreateLog) {
    btnCreateLog.addEventListener('click', async () => {
      await withButtonLoading(btnCreateLog, "Đang lưu...", async () => {
        try {
          await addDoc(logsRef, {
            type: 'ADMIN_ACTION',
            message: 'Admin vừa thao tác kiểm tra hệ thống lúc ' + new Date().toLocaleTimeString(),
            timestamp: serverTimestamp()
          });
          // Log mới nhất luôn nằm ở đầu -> quay về trang 1
          pageCursors = [null];
          await loadLogs(1);
        } catch (err) {
          alert("Lỗi lưu Log: " + err.message);
        }
      });
    });
  }
});
