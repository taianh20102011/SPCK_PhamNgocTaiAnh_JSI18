import { db } from './firebase-config.js';
import { loadingBoxHTML, paginate, renderPaginationInto } from './ui-utils.js';
import { collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allDocuments = [];
let currentPage = 1;
const PAGE_SIZE = 6;

document.addEventListener("DOMContentLoaded", () => {
  fetchDocuments();
  setupFilters();
});

// 1. TẢI TÀI LIỆU TỪ FIRESTORE (COLLECTION 'documents')
function fetchDocuments() {
  const gridContainer = document.getElementById("documents-grid-container");
  if (!gridContainer) return;

  // Hiện spinner trong lúc chờ dữ liệu lần đầu
  gridContainer.innerHTML = loadingBoxHTML("Đang tải kho tài liệu...");

  const docsRef = collection(db, "documents");

  onSnapshot(docsRef, (snapshot) => {
    if (snapshot.empty) {
      gridContainer.innerHTML = `<div class="glass-card" style="grid-column: 1/-1; text-align: center; padding: 20px;">
        📌 Chưa có tài liệu nào được đăng tải.
      </div>`;
      renderDocumentsPagination(0);
      return;
    }

    allDocuments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    currentPage = 1;
    renderDocuments(allDocuments);
  }, (error) => {
    // Rules chưa publish hoặc mạng lỗi: dùng dữ liệu mẫu thay vì làm hỏng landing page.
    console.warn("Không tải được kho tài liệu từ Firebase, dùng dữ liệu mẫu:", error);
    // Nếu chưa tạo collection 'documents' trên Firestore, hiển thị mẫu mặc định
    renderFallbackData();
  });
}

// 2. HIỂN THỊ DANH SÁCH TÀI LIỆU RA GIAO DIỆN (CÓ PHÂN TRANG)
function renderDocuments(docs) {
  const gridContainer = document.getElementById("documents-grid-container");
  if (!gridContainer) return;

  if (docs.length === 0) {
    gridContainer.innerHTML = `<div class="glass-card" style="grid-column: 1/-1; text-align: center; padding: 20px;">
      🔍 Không tìm thấy tài liệu phù hợp với bộ lọc!
    </div>`;
    renderDocumentsPagination(0);
    return;
  }

  const result = paginate(docs, currentPage, PAGE_SIZE);
  currentPage = result.currentPage;

  gridContainer.innerHTML = result.pageItems.map(doc => {
    const gradeText = doc.grade ? `Lớp ${doc.grade}` : "Toàn cấp";
    const subjectText = getSubjectName(doc.subject);
    const title = doc.title || "Tài liệu học tập";
    const desc = doc.description || "Tóm tắt nội dung lý thuyết và bài tập.";
    const author = doc.author || "BrainlyX Team";
    const fileUrl = doc.fileUrl || "./page/html/auth/login.html";

    return `
      <div class="glass-card doc-card-placeholder">
        <div class="doc-badge">${gradeText} • ${subjectText}</div>
        <h4 class="doc-title">${title}</h4>
        <p class="doc-desc">${desc}</p>
        <div class="doc-footer" style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
          <span class="doc-author" style="font-size: 13px; color: #666;">✍️ ${author}</span>
          <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-primary">Xem tài liệu</a>
        </div>
      </div>
    `;
  }).join("");

  renderDocumentsPagination(docs.length);
}

function renderDocumentsPagination(totalItems) {
  renderPaginationInto(document.getElementById('documentsPagination'), {
    totalItems: totalItems,
    currentPage: currentPage,
    pageSize: PAGE_SIZE,
    onPageChange: (page) => {
      currentPage = page;
      renderDocuments(currentFilteredList());
      document.getElementById('documents-grid-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// Ghi nhớ danh sách đã lọc gần nhất để đổi trang không cần lọc lại
let lastFilteredList = null;
function currentFilteredList() {
  return lastFilteredList || allDocuments;
}

// 3. LẮP BỘ LỌC KHI TÌM KIẾM, CHỌN KHỐI LỚP / MÔN HỌC
function setupFilters() {
  const searchInput = document.getElementById("doc-search-input");
  const gradeFilter = document.getElementById("doc-grade-filter");
  const subjectFilter = document.getElementById("doc-subject-filter");

  const filterHandler = () => {
    const searchText = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedGrade = gradeFilter ? gradeFilter.value : "all";
    const selectedSubject = subjectFilter ? subjectFilter.value : "all";

    const filtered = allDocuments.filter(doc => {
      const matchSearch = !searchText || 
        (doc.title && doc.title.toLowerCase().includes(searchText)) ||
        (doc.description && doc.description.toLowerCase().includes(searchText));

      const matchGrade = selectedGrade === "all" || String(doc.grade) === selectedGrade;
      const matchSubject = selectedSubject === "all" || doc.subject === selectedSubject;

      return matchSearch && matchGrade && matchSubject;
    });

    lastFilteredList = filtered;
    currentPage = 1;
    renderDocuments(filtered);
  };

  if (searchInput) searchInput.addEventListener("input", filterHandler);
  if (gradeFilter) gradeFilter.addEventListener("change", filterHandler);
  if (subjectFilter) subjectFilter.addEventListener("change", filterHandler);
}

// HÀM CHUYỂN MÃ MÔN SANG TÊN TIẾNG VIỆT
function getSubjectName(code) {
  const map = {
    math: "Toán Học",
    literature: "Ngữ Văn",
    english: "Tiếng Anh",
    physics: "Vật Lý",
    chemistry: "Hóa Học"
  };
  return map[code] || "Kiến thức chung";
}

// DỮ LIỆU MẪU DỰ PHÒNG NẾU CSƯL FIRESTORE CHƯA CÓ COLLECTION 'documents'
function renderFallbackData() {
  const sampleData = [
    {
      id: "1",
      grade: "9",
      subject: "math",
      title: "Tổng hợp Công thức & Dạng bài Ôn thi Vào 10 Môn Toán",
      description: "Tóm tắt toàn bộ lý thuyết Đại số & Hình học 9 trọng tâm kèm bài tập có lời giải.",
      author: "BrainlyX Team",
      fileUrl: "./page/html/auth/login.html"
    },
    {
      id: "2",
      grade: "12",
      subject: "physics",
      title: "Bộ Đề Thi Thử Tốt Nghiệp THPT Môn Vật Lý",
      description: "Đề thi thử chuẩn cấu trúc Bộ GD&ĐT có đáp án chi tiết.",
      author: "BrainlyX Team",
      fileUrl: "./page/html/auth/login.html"
    }
  ];
  allDocuments = sampleData;
  currentPage = 1;
  renderDocuments(sampleData);
}
