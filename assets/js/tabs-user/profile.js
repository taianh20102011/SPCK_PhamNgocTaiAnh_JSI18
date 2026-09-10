import { auth, db } from '../firebase-config.js';
import { toggleOverlayLoading, withButtonLoading } from '../ui-utils.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { cloudinaryConfig } from '../cloudinary-config.js';

let currentUid = null;

document.addEventListener("DOMContentLoaded", () => {
  initProfile();
  setupEvents();
});

// 1. LẤY DỮ LIỆU TỪ FIREBASE KHI DỰ ÁN KHỞI CHẠY
function initProfile() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "../auth/login.html";
      return;
    }

    currentUid = user.uid;

    try {
      const userRef = doc(db, "users", currentUid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        fillProfileData(userData, user.email);
      } else {
        console.warn("Chưa có document user trên Firestore!");
      }
    } catch (error) {
      console.error("Lỗi tải thông tin cá nhân:", error);
    }
  });
}

// 2. ĐỔ DỮ LIỆU TỪ FIRESTORE VÀO GIAO DIỆN HỒ SƠ & SIDEBAR
function fillProfileData(data, authEmail) {
  const fullname = data.fullname || "Học Viên";
  const email = data.email || authEmail;
  const grade = data.grade || "8";
  const className = data.className || `Khối ${grade}`;
  const phone = data.phone || "";
  const gender = data.gender || "Nam";
  const level = data.level || 1;
  const exp = data.exp || 0;
  const role = data.role === "student" ? "Học Viên" : (data.role || "Học Viên");

  // Render Header & Sidebar
  document.getElementById("profile-display-name").textContent = fullname;
  document.getElementById("sidebar-display-name").textContent = fullname;
  document.getElementById("profile-class-text").textContent = `Học sinh ${className}`;
  document.getElementById("sidebar-user-level").textContent = `Lv.${level}`;
  document.getElementById("profile-role-badge").textContent = role;

  // Thanh EXP Sidebar (Mặc định max 100 EXP / level)
  const expBar = document.getElementById("sidebar-user-exp-bar");
  if (expBar) expBar.style.width = `${Math.min(100, exp)}%`;

  // Dynamic Avatar theo tên (chỉ dùng khi chưa có ảnh đại diện tuỳ chỉnh)
  const avatarImg = document.getElementById("profile-avatar-img");
  if (avatarImg && data.avatarUrl) {
    avatarImg.src = data.avatarUrl;
  } else if (avatarImg) {
    avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullname)}&background=4f46e5&color=fff&size=128`;
  }

  // Điền vào Form Input
  document.getElementById("fullname").value = fullname;
  document.getElementById("email").value = email;
  document.getElementById("grade-select").value = grade;
  document.getElementById("phone").value = phone;
  document.getElementById("gender").value = gender;
}

// 3. ĐỔI / TẢI LÊN ẢNH ĐẠI DIỆN MỚI (CLOUDINARY)
async function uploadAvatar(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) throw new Error('Ảnh tối đa 5MB.');

  const wrapper = document.querySelector('.avatar-wrapper');
  toggleOverlayLoading(wrapper, true);

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Không thể tải ảnh lên Cloudinary.');
    const result = await response.json();
    await updateDoc(doc(db, 'users', currentUid), { avatarUrl: result.secure_url });
    document.getElementById('profile-avatar-img').src = result.secure_url;
    alert('✅ Đã cập nhật ảnh đại diện!');
  } finally {
    toggleOverlayLoading(wrapper, false);
  }
}

// 4. XỬ LÝ LƯU THAY ĐỔI VÀ ĐĂNG XUẤT
function setupEvents() {
  const avatarBtn = document.getElementById('btn-change-avatar');
  const avatarInput = document.getElementById('avatar-input');
  avatarBtn?.addEventListener('click', () => avatarInput?.click());
  avatarInput?.addEventListener('change', async e => { try { await uploadAvatar(e.target.files[0]); } catch (err) { alert('❌ ' + err.message); } finally { e.target.value = ''; } });
  const form = document.getElementById("profile-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUid) return;

      const newFullname = document.getElementById("fullname").value.trim();
      const newGrade = document.getElementById("grade-select").value;
      const newPhone = document.getElementById("phone").value.trim();
      const newGender = document.getElementById("gender").value;
      const submitBtn = document.getElementById("btn-save-profile");

      await withButtonLoading(submitBtn, "Đang lưu...", async () => {
        try {
          const userRef = doc(db, "users", currentUid);
          await updateDoc(userRef, {
            fullname: newFullname,
            grade: newGrade,
            className: `Khối ${newGrade}`,
            phone: newPhone,
            gender: newGender
          });

          alert("✅ Cập nhật hồ sơ thành công!");
          location.reload();
        } catch (error) {
          console.error("Lỗi cập nhật Firestore:", error);
          alert("❌ Không thể cập nhật hồ sơ!");
        }
      });
    });
  }

  // Nút Hủy
  const btnCancel = document.getElementById("btn-cancel-profile");
  if (btnCancel) {
    btnCancel.addEventListener("click", () => location.reload());
  }

  // Nút Đăng xuất
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "../auth/login.html";
    });
  }
}
