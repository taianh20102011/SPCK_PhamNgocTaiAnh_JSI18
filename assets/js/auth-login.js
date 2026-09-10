import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const USER_HOME = '../user/dashboard.html';
const ADMIN_HOME = '../admin/overview.html';

async function redirectByRole(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  const role = snap.exists() ? String(snap.data().role || 'student').toLowerCase() : 'student';
  window.location.href = role === 'admin' ? ADMIN_HOME : USER_HOME;
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const googleBtn = document.getElementById('btn-google-login');

  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');
    try {
      btn.disabled = true;
      btn.textContent = 'Đang đăng nhập...';
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await redirectByRole(cred.user.uid);
    } catch (error) {
      console.error(error);
      const messages = {
        'auth/invalid-credential': 'Email hoặc mật khẩu không chính xác.',
        'auth/user-not-found': 'Email hoặc mật khẩu không chính xác.',
        'auth/wrong-password': 'Email hoặc mật khẩu không chính xác.',
        'auth/too-many-requests': 'Quá nhiều lần thử. Hãy thử lại sau.'
      };
      alert('❌ ' + (messages[error.code] || error.message));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Đăng Nhập';
    }
  });

  googleBtn?.addEventListener('click', async () => {
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = result.user;
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          fullname: user.displayName || 'Học sinh',
          role: 'student',
          grade: '9',
          className: 'Khối 9',
          email: user.email || '',
          level: 1,
          exp: 0,
          createdAt: new Date().toISOString()
        });
      }
      await redirectByRole(user.uid);
    } catch (error) {
      console.error(error);
      alert('❌ Đăng nhập Google thất bại: ' + error.message);
    }
  });
});
