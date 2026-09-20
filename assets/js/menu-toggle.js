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
<<<<<<< HEAD
        btnToggle.setAttribute("aria-label", "Toggle Menu");
        btnToggle.innerHTML = `
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
        `;
        document.body.appendChild(btnToggle);
    }

    // 2. Tự động thêm Lớp Phủ Mờ (Overlay) nếu chưa có
=======
        btnToggle.setAttribute("aria-label", "Mở menu");
        btnToggle.innerHTML = `<span class="bar"></span><span class="bar"></span><span class="bar"></span>`;
        document.body.appendChild(btnToggle);
    }

    // ==================== 2. NÚT THU GỌN PC/LAPTOP ====================
    let collapseButton = sidebar.querySelector(".sidebar-collapse-btn");
    if (!collapseButton) {
        collapseButton = document.createElement("button");
        collapseButton.className = "sidebar-collapse-btn";
        collapseButton.type = "button";
        collapseButton.innerHTML = "‹";
        collapseButton.title = "Thu gọn menu";
        collapseButton.setAttribute("aria-label", "Thu gọn menu");
        sidebar.appendChild(collapseButton);
    }

    // ==================== 3. TẠO ICON + LABEL ====================
    // Mỗi link đang có dạng: "📅 Thời khóa biểu".
    // Ta tách icon ra để khi thu gọn chỉ còn icon.
    sidebar.querySelectorAll(".nav-link").forEach(link => {
        if (link.querySelector(".nav-icon")) return;

        const text = link.textContent.trim();
        const chars = Array.from(text);
        const icon = chars.shift() || "•";
        const label = chars.join("").trim();

        link.textContent = "";

        const iconSpan = document.createElement("span");
        iconSpan.className = "nav-icon";
        iconSpan.textContent = icon;

        const labelSpan = document.createElement("span");
        labelSpan.className = "nav-label";
        labelSpan.textContent = label;

        link.append(iconSpan, labelSpan);
    });

    // ==================== 4. CHỨC NĂNG THU GỌN ====================
    const setCollapsed = (collapsed) => {
        sidebar.classList.toggle("sidebar-collapsed", collapsed);
        collapseButton.innerHTML = collapsed ? "›" : "‹";
        collapseButton.title = collapsed ? "Mở rộng menu" : "Thu gọn menu";
        collapseButton.setAttribute("aria-label", collapsed ? "Mở rộng menu" : "Thu gọn menu");
        localStorage.setItem("brainlyx-sidebar-collapsed", collapsed ? "1" : "0");
    };

    // Chỉ khôi phục trạng thái thu gọn trên PC/Laptop.
    if (window.innerWidth > 768 && localStorage.getItem("brainlyx-sidebar-collapsed") === "1") {
        setCollapsed(true);
    }

    collapseButton.addEventListener("click", () => {
        if (window.innerWidth > 768) {
            setCollapsed(!sidebar.classList.contains("sidebar-collapsed"));
        }
    });

    // ==================== 5. HAMBURGER MOBILE ====================
>>>>>>> cd15854 (Initial commit)
    let overlay = document.querySelector(".sidebar-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "sidebar-overlay";
        document.body.appendChild(overlay);
    }

<<<<<<< HEAD
    // 3. Hàm bật/tắt Hamburger Menu
=======
>>>>>>> cd15854 (Initial commit)
    const toggleMenu = () => {
        const isOpen = sidebar.classList.toggle("is-open");
        btnToggle.classList.toggle("is-active", isOpen);
        overlay.classList.toggle("is-active", isOpen);
<<<<<<< HEAD

        // Khóa cuộn trang chính khi đang mở menu trên mobile
        document.body.style.overflow = isOpen ? "hidden" : "";
    };

    // 4. Hàm đóng Hamburger Menu
=======
        document.body.style.overflow = isOpen ? "hidden" : "";
    };

>>>>>>> cd15854 (Initial commit)
    const closeMenu = () => {
        sidebar.classList.remove("is-open");
        btnToggle.classList.remove("is-active");
        overlay.classList.remove("is-active");
        document.body.style.overflow = "";
    };

<<<<<<< HEAD
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
=======
    btnToggle.addEventListener("click", toggleMenu);
    overlay.addEventListener("click", closeMenu);

    sidebar.querySelectorAll(".nav-link, a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    // Khi quay về mobile: mở sidebar đầy đủ.
    window.addEventListener("resize", () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove("sidebar-collapsed");
            closeMenu();
        }
    });
});
>>>>>>> cd15854 (Initial commit)
