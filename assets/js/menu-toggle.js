/**
 * BrainlyX - Hamburger Menu & Responsive Sidebar Controller
 */
document.addEventListener("DOMContentLoaded", () => {
    // Tìm Sidebar (hỗ trợ cả user sidebar và admin sidebar)
    const sidebar = document.querySelector(".sidebar, .admin-sidebar");
    if (!sidebar) return;

    // 1. Tự động thêm Nút Hamburger Toggle nếu chưa có trong DOM
    let btnToggle = document.getElementById("btn-menu-toggle");
    if (!btnToggle) {
        btnToggle = document.createElement("button");
        btnToggle.id = "btn-menu-toggle";
        btnToggle.className = "menu-toggle-btn";
        btnToggle.setAttribute("aria-label", "Toggle Menu");
        btnToggle.innerHTML = `
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
        `;
        document.body.appendChild(btnToggle);
    }

    // 2. Tự động thêm Lớp Phủ Mờ (Overlay) nếu chưa có
    let overlay = document.querySelector(".sidebar-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "sidebar-overlay";
        document.body.appendChild(overlay);
    }

    // 3. Hàm bật/tắt Hamburger Menu
    const toggleMenu = () => {
        const isOpen = sidebar.classList.toggle("is-open");
        btnToggle.classList.toggle("is-active", isOpen);
        overlay.classList.toggle("is-active", isOpen);

        // Khóa cuộn trang chính khi đang mở menu trên mobile
        document.body.style.overflow = isOpen ? "hidden" : "";
    };

    // 4. Hàm đóng Hamburger Menu
    const closeMenu = () => {
        sidebar.classList.remove("is-open");
        btnToggle.classList.remove("is-active");
        overlay.classList.remove("is-active");
        document.body.style.overflow = "";
    };

    // Bắt sự kiện Click
    btnToggle.addEventListener("click", toggleMenu);
    overlay.addEventListener("click", closeMenu);

    // Tự động đóng menu khi bấm vào bất kỳ liên kết chuyển trang nào
    const navLinks = sidebar.querySelectorAll(".nav-link, a");
    navLinks.forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    // Tự động đóng menu khi thay đổi kích thước màn hình lên Desktop (> 768px)
    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            closeMenu();
        }
    });
});
