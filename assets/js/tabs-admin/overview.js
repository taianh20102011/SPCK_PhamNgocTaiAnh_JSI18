import { db } from "../firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

function setLoadingState() {
  ['statTotalUsers', 'statTotalNotes', 'statAiRequestsToday'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="brx-spinner brx-spinner-sm"></span>';
  });
}

async function fetchStats() {
  setLoadingState();
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const notesSnap = await getDocs(collection(db, "notes"));

    document.getElementById('statTotalUsers').textContent = usersSnap.size.toLocaleString();
    document.getElementById('statTotalNotes').textContent = notesSnap.size.toLocaleString();
    document.getElementById('statAiRequestsToday').textContent = "128"; // Static hoặc đếm từ collection logs
  } catch (err) {
    console.error("Lỗi lấy thống kê:", err);
  }
}

document.addEventListener('DOMContentLoaded', fetchStats);
