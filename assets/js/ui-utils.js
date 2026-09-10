/**
 * BrainlyX - UI Utilities dùng chung
 * Gồm 2 nhóm chức năng:
 *  1. Spinner / trạng thái loading (khi gọi API / chờ Firestore)
 *  2. Phân trang (pagination) cho các danh sách "get all data"
 */

// =========================================================
// 1. SPINNER / LOADING
// =========================================================

/**
 * Trả về đoạn HTML hiển thị spinner + thông báo, dùng để thay thế tạm
 * nội dung 1 khung/danh sách trong lúc chờ dữ liệu.
 */
export function loadingBoxHTML(message = 'Đang tải dữ liệu...') {
  return `<div class="brx-loading-box"><span class="brx-spinner"></span><span>${message}</span></div>`;
}

/**
 * Bật/tắt trạng thái loading cho 1 nút bấm (disable + hiện spinner thay chữ).
 * Chữ gốc của nút được lưu tạm vào dataset để khôi phục lại sau khi xong.
 */
export function setButtonLoading(btn, isLoading, loadingText = 'Đang xử lý...') {
  if (!btn) return;

  if (isLoading) {
    if (btn.dataset.brxOriginalHtml === undefined) {
      btn.dataset.brxOriginalHtml = btn.innerHTML;
    }
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.innerHTML = `<span class="brx-spinner brx-spinner-sm brx-spinner-light"></span><span>${loadingText}</span>`;
  } else {
    btn.disabled = false;
    btn.classList.remove('is-loading');
    if (btn.dataset.brxOriginalHtml !== undefined) {
      btn.innerHTML = btn.dataset.brxOriginalHtml;
      delete btn.dataset.brxOriginalHtml;
    }
  }
}

/**
 * Chạy 1 hàm bất đồng bộ trong khi hiện trạng thái loading trên nút bấm.
 * Tự động khôi phục lại nút dù thành công hay lỗi.
 */
export async function withButtonLoading(btn, loadingText, asyncFn) {
  setButtonLoading(btn, true, loadingText);
  try {
    return await asyncFn();
  } finally {
    setButtonLoading(btn, false);
  }
}

/**
 * Hiện/ẩn overlay mờ (có spinner) phủ lên 1 phần tử đang xử lý,
 * ví dụ khung ảnh đại diện trong lúc tải ảnh lên Cloudinary.
 */
export function toggleOverlayLoading(wrapperEl, isLoading) {
  if (!wrapperEl) return;
  let overlay = wrapperEl.querySelector(':scope > .brx-loading-overlay');
  if (isLoading) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'brx-loading-overlay';
      overlay.innerHTML = '<span class="brx-spinner"></span>';
      wrapperEl.appendChild(overlay);
    }
  } else if (overlay) {
    overlay.remove();
  }
}

// =========================================================
// 2. PHÂN TRANG (PAGINATION)
// =========================================================

/**
 * Cắt mảng dữ liệu theo trang hiện tại.
 * Trả về phần tử của trang, tổng số trang và trang hiện tại đã hợp lệ hoá.
 */
export function paginate(items, page, pageSize) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page || 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    totalItems,
    totalPages,
    currentPage
  };
}

/**
 * Vẽ thanh phân trang (Trước / số trang / Sau) vào 1 container,
 * đồng thời tự gắn sự kiện click gọi lại onPageChange(page).
 * Nếu chỉ có 1 trang thì ẩn thanh phân trang đi.
 */
export function renderPaginationInto(container, { totalItems, currentPage, pageSize, onPageChange }) {
  if (!container) return;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const maxButtons = 5;
  let from = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let to = Math.min(totalPages, from + maxButtons - 1);
  from = Math.max(1, to - maxButtons + 1);

  let pagesHtml = '';
  for (let p = from; p <= to; p++) {
    pagesHtml += `<button type="button" class="brx-page-btn${p === currentPage ? ' active' : ''}" data-page="${p}" ${p === currentPage ? 'aria-current="page"' : ''}>${p}</button>`;
  }

  container.className = 'brx-pagination';
  container.innerHTML = `
    <span class="brx-pagination-info">${start}–${end} / ${totalItems}</span>
    <button type="button" class="brx-page-btn" data-page="${currentPage - 1}" aria-label="Trang trước" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>
    ${pagesHtml}
    <button type="button" class="brx-page-btn" data-page="${currentPage + 1}" aria-label="Trang sau" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>
  `;

  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = Number(btn.dataset.page);
      if (page >= 1 && page <= totalPages && page !== currentPage) onPageChange(page);
    });
  });
}

/**
 * Đảm bảo có sẵn 1 <div> container ngay sau `afterEl` để vẽ pagination vào,
 * dùng cho các trang chưa có sẵn khung phân trang trong HTML.
 */
export function ensurePaginationContainer(afterEl, id) {
  let el = document.getElementById(id);
  if (!el && afterEl) {
    el = document.createElement('div');
    el.id = id;
    el.className = 'brx-pagination';
    afterEl.insertAdjacentElement('afterend', el);
  }
  return el;
}
