import { renderOverview, initOverviewEvents } from './tabs-admin/overview.js';
import { renderUsers, initUsersEvents } from './tabs-admin/users.js';
import { renderContent, initContentEvents } from './tabs-admin/content.js';
import { renderLogs, initLogsEvents } from './tabs-admin/logs.js';
import { renderSettings, initSettingsEvents } from './tabs-admin/settings.js';

const routes = {
  overview: {
    title: 'Tổng Quan Hệ Thống',
    sub: 'Thống kê tổng quan hoạt động',
    render: renderOverview,
    init: initOverviewEvents
  },
  users: {
    title: 'Quản Lý Người Dùng',
    sub: 'Quản lý tài khoản, trạng thái và phân quyền',
    render: renderUsers,
    init: initUsersEvents
  },
  content: {
    title: 'Kho Kiến Thức',
    sub: 'Quản lý tài nguyên bài học và ghi chú',
    render: renderContent,
    init: initContentEvents
  },
  logs: {
    title: 'Nhật Ký Hệ Thống',
    sub: 'Lịch sử hoạt động và sự kiện hệ thống',
    render: renderLogs,
    init: initLogsEvents
  },
  settings: {
    title: 'Cấu Hình Hệ Thống',
    sub: 'Cài đặt chung và trạng thái máy chủ',
    render: renderSettings,
    init: initSettingsEvents
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('adminTabContainer');
  const titleEl = document.getElementById('adminPageTitle');
  const subEl = document.getElementById('adminPageSub');
  const navLinks = document.querySelectorAll('#adminNavMenu .nav-link');

  function loadTab(tabKey) {
    const route = routes[tabKey];
    if (!route) return;

    // 1. Cập nhật Sidebar UI
    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.tab === tabKey);
    });

    // 2. Cập nhật Topbar
    if (titleEl) titleEl.textContent = route.title;
    if (subEl) subEl.textContent = route.sub;

    // 3. Render HTML và gán sự kiện riêng của Tab
    container.innerHTML = route.render();
    route.init();
  }

  // Lắng nghe sự kiện click Menu
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabKey = link.dataset.tab;
      loadTab(tabKey);
    });
  });

  // Khởi chạy Tab mặc định (Overview)
  loadTab('overview');
});