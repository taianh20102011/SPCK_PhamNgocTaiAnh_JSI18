import { db } from "../firebase-config.js";
import { withButtonLoading } from "../ui-utils.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const configRef = doc(db, "system", "config");

async function initSettings() {
  const nameInput = document.getElementById('siteName');
  const form = document.getElementById('settingForm');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  // Load dữ liệu cũ
  const docSnap = await getDoc(configRef);
  if (docSnap.exists()) {
    nameInput.value = docSnap.data().siteName || '';
  }

  // Lưu dữ liệu mới
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      await withButtonLoading(submitBtn, "Đang lưu...", async () => {
        await setDoc(configRef, { siteName: nameInput.value }, { merge: true });
        alert("Cập nhật cấu hình thành công!");
      });
    };
  }
}

document.addEventListener('DOMContentLoaded', initSettings);
