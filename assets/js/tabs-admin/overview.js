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

    const totalUsers = document.getElementById('statTotalUsers');
    const totalNotes = document.getElementById('statTotalNotes');
    const aiRequests = document.getElementById('statAiRequestsToday');

    if (totalUsers) totalUsers.textContent = usersSnap.size.toLocaleString();
    if (totalNotes) totalNotes.textContent = '--';
    if (aiRequests) aiRequests.textContent = "128"; // Static hoặc đếm từ collection logs
  } catch (err) {
    console.error("Lỗi lấy thống kê:", err);
    ['statTotalUsers', 'statTotalNotes'].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = '--';
    });
  }
}

document.addEventListener('DOMContentLoaded', fetchStats);
