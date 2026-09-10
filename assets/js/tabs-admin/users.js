import { db } from '../firebase-config.js';
import { loadingBoxHTML, withButtonLoading, paginate, renderPaginationInto } from '../ui-utils.js';
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Dữ liệu đầy đủ + trạng thái phân trang
let allUsers = [];
let currentPage = 1;
const PAGE_SIZE = 8;

document.addEventListener("DOMContentLoaded", () => {
  listenUsersFromFirestore();
  setupAddUserForm();
});

// =========================================================
// 1. TẢI VÀ HIỂN THỊ DANH SÁCH USER TỪ FIRESTORE
// =========================================================
function listenUsersFromFirestore() {
  const tableBody = document.getElementById("adminUserTableBody");
  if (!tableBody) return;

  // Hiện spinner trong lúc chờ dữ liệu lần đầu
  tableBody.innerHTML = `<tr><td colspan="7">${loadingBoxHTML("Đang tải danh sách người dùng...")}</td></tr>`;

  const usersRef = collection(db, "users");

  onSnapshot(usersRef, (snapshot) => {
    allUsers = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    renderUsersPage(currentPage);
  }, (error) => {
    console.error("Lỗi lấy danh sách user:", error);
    tableBody.innerHTML = `<tr><td colspan="7" style="color:red;">❌ Lỗi tải dữ liệu người dùng!</td></tr>`;
  });
}

// =========================================================
// 1b. VẼ 1 TRANG DANH SÁCH USER (PHÂN TRANG)
// =========================================================
function renderUsersPage(page) {
  const tableBody = document.getElementById("adminUserTableBody");
  if (!tableBody) return;

  if (allUsers.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7">Chưa có người dùng nào.</td></tr>`;
    renderUsersPagination();
    return;
  }

  const result = paginate(allUsers, page, PAGE_SIZE);
  currentPage = result.currentPage;

  tableBody.innerHTML = result.pageItems.map(data => {
    const id = data.id;

    // Khớp chuẩn các field trên Firestore của bạn
    const fullname = data.fullname || data.name || data.displayName || "N/A";
    const email = data.email || "N/A";
    const phone = data.phone || "Chưa có";
    const grade = data.className || (data.grade ? `Khối ${data.grade}` : "Chưa xếp");
    const role = (data.role || "student").toUpperCase();
    const shortId = `#${id.substring(0, 6)}`;

    return `
      <tr style="border-bottom: 1px solid #f0f0f0; height: 45px;">
        <td style="font-weight: bold; color: #666;">${shortId}</td>
        <td style="font-weight: 600;">${fullname}</td>
        <td>${email}</td>
        <td>${phone}</td>
        <td><span style="background: #f3f4f6; padding: 3px 8px; border-radius: 4px; font-size: 13px;">${grade}</span></td>
        <td><span style="font-weight: bold; color: ${role === 'ADMIN' ? '#d97706' : '#4f46e5'};">${role}</span></td>
        <td>
          <button class="btn-delete-user" data-id="${id}" style="color: red; cursor: pointer; border: 1px solid #ffcccc; background: #fff5f5; padding: 2px 8px; border-radius: 4px;">Xóa</button>
        </td>
      </tr>
    `;
  }).join("");

  attachDeleteEvents();
  renderUsersPagination();
}

function renderUsersPagination() {
  const paginationEl = document.getElementById("usersPagination");
  renderPaginationInto(paginationEl, {
    totalItems: allUsers.length,
    currentPage: currentPage,
    pageSize: PAGE_SIZE,
    onPageChange: (page) => renderUsersPage(page)
  });
}

// =========================================================
// 2. THÊM USER MỚI LÊN FIRESTORE
// =========================================================
function setupAddUserForm() {
  const form = document.getElementById("addUserForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("userName");
    const emailInput = document.getElementById("userEmail");
    const phoneInput = document.getElementById("userPhone");
    const gradeSelect = document.getElementById("userGrade");
    const roleSelect = document.getElementById("userRole");
    const submitBtn = form.querySelector('button[type="submit"]');

    const fullname = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const grade = gradeSelect ? gradeSelect.value : "";
    const role = roleSelect ? roleSelect.value : "student";

    if (!fullname || !email) {
      alert("Vui lòng nhập Họ tên và Email!");
      return;
    }

    await withButtonLoading(submitBtn, "Đang thêm...", async () => {
      try {
        await addDoc(collection(db, "users"), {
          fullname: fullname,
          email: email,
          phone: phone || "Chưa có",
          grade: grade || "8",
          className: grade ? `Khối ${grade}` : "Chưa xếp",
          role: role,
          level: 1,
          exp: 0,
          createdAt: new Date().toISOString()
        });

        alert("✅ Đã thêm người dùng thành công!");
        form.reset();
        currentPage = 1;
      } catch (error) {
        console.error("Lỗi khi thêm user:", error);
        alert("❌ Không thể thêm người dùng!");
      }
    });
  });
}

// =========================================================
// 3. XÓA USER KHỎI FIRESTORE
// =========================================================
function attachDeleteEvents() {
  document.querySelectorAll(".btn-delete-user").forEach(btn => {
    btn.addEventListener("click", async () => {
      const uid = btn.getAttribute("data-id");
      if (confirm("Bạn có chắc chắn muốn xóa người dùng này khỏi CSDL?")) {
        await withButtonLoading(btn, "...", async () => {
          try {
            await deleteDoc(doc(db, "users", uid));
            alert("✅ Đã xóa người dùng thành công!");
          } catch (error) {
            console.error("Lỗi khi xóa user:", error);
            alert("❌ Không thể xóa người dùng!");
          }
        });
      }
    });
  });
}
