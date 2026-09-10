import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const PUBLIC_PATHS = [
  '/page/html/auth/login.html',
  '/page/html/auth/register.html',
  '/index.html',
  '/'
];
const ADMIN_ROOT = '/page/html/admin/';
const USER_ROOT = '/page/html/user/';

function pagePath() {
  return location.pathname.replace(/\\/g, '/');
}
function isPublic() {
  const p = pagePath();
  return PUBLIC_PATHS.some(x => p.endsWith(x));
}
function isAdminPage() { return pagePath().includes(ADMIN_ROOT); }
function isUserPage() { return pagePath().includes(USER_ROOT); }
function redirect(relativeProjectPath) {
  const marker = '/page/html/';
  const path = location.pathname.replace(/\\/g, '/');
  const idx = path.indexOf(marker);
  const projectRoot = idx >= 0 ? path.slice(0, idx + 1) : '/';
  const target = `${projectRoot}${relativeProjectPath.replace(/^\//, '')}`;
  window.location.replace(target);
}

function loginPath() { return 'page/html/auth/login.html'; }
function userHome() { return 'page/html/user/dashboard.html'; }
function adminHome() { return 'page/html/admin/overview.html'; }

function wireLogout() {
  document.querySelectorAll('[data-action="logout"], #btn-logout').forEach(btn => {
    if (btn.dataset.logoutBound) return;
    btn.dataset.logoutBound = '1';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await signOut(auth); }
      catch (e) { console.error('Logout error:', e); }
      finally { redirect(loginPath()); }
    });
  });
}

async function readUserProfile(user) {
  const snap = await getDoc(doc(db, 'users', user.uid));
  return snap.exists() ? snap.data() : {};
}

function hydrateProfile(user, data) {
  const name = data.fullname || user.displayName || user.email?.split('@')[0] || 'Học viên';
  const level = Number(data.level || 1);
  const exp = Number(data.exp || 0);
  const avatar = data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=128`;
  document.querySelectorAll('#user-display-name,#sidebar-display-name').forEach(el => el.textContent = name);
  document.querySelectorAll('#user-level,#sidebar-user-level').forEach(el => el.textContent = `Lv.${level}`);
  document.querySelectorAll('#user-exp-bar,#sidebar-user-exp-bar').forEach(el => el.style.width = `${Math.min(100, exp % 100)}%`);
  document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email || '');
  document.querySelectorAll('[data-user-avatar]').forEach(img => img.src = avatar);
  window.BrainlyXUser = { ...data, uid: user.uid, email: user.email, fullname: name };
  window.dispatchEvent(new CustomEvent('brainlyx:user-ready', { detail: window.BrainlyXUser }));
}

async function guardAndHydrate(user) {
  const data = await readUserProfile(user);
  const role = String(data.role || 'student').toLowerCase();

  // Phân quyền theo thư mục URL.
  if (isAdminPage() && role !== 'admin') {
    alert('⛔ Bạn không có quyền truy cập khu vực quản trị.');
    redirect(userHome());
    return false;
  }
  if (isUserPage() && role === 'admin') {
    // Admin vẫn có thể vào khu quản trị; không trộn dashboard người dùng với admin.
    redirect(adminHome());
    return false;
  }

  hydrateProfile(user, data);
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  wireLogout();
  if (isPublic()) return;

  onAuthStateChanged(auth, async user => {
    if (!user) { redirect(loginPath()); return; }
    try { await guardAndHydrate(user); }
    catch (e) {
      console.error('Không tải được hồ sơ/phân quyền:', e);
      redirect(loginPath());
    }
  });
});
