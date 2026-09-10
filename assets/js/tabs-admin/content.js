import { db } from '../../../assets/js/firebase-config.js';
import { cloudinaryConfig } from '../../../assets/js/cloudinary-config.js';
import { loadingBoxHTML, withButtonLoading, setButtonLoading, paginate, renderPaginationInto } from '../../../assets/js/ui-utils.js';
import { 
    collection, 
    addDoc, 
    deleteDoc, 
    updateDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Khai báo biến lưu URL ảnh đã chọn
let selectedImageUrl = "";

// Dữ liệu đầy đủ (đổ về từ Firestore) + trạng thái phân trang
let allContentItems = [];
let currentPage = 1;
const PAGE_SIZE = 5;

document.addEventListener("DOMContentLoaded", function() {
    listenContentFromFirestore();
    setupAddContentForm();
    setupImageUpload();
});

// =========================================================
// 1. TẢI VÀ HIỂN THỊ DANH SÁCH BÀI HỌC REALTIME
// =========================================================
function listenContentFromFirestore() {
    let contentList = document.getElementById("contentList");
    if (!contentList) return;

    // Hiện spinner trong lúc chờ dữ liệu lần đầu từ Firestore
    contentList.innerHTML = loadingBoxHTML("Đang tải danh sách bài học...");

    let knowledgeRef = collection(db, "knowledge");
    let q = query(knowledgeRef, orderBy("createdAt", "desc"));

    onSnapshot(q, function(snapshot) {
        allContentItems = snapshot.docs.map(function(docSnap) {
            let item = docSnap.data();
            item.__id = docSnap.id;
            return item;
        });

        // Nếu đang ở trang không còn dữ liệu (VD sau khi xoá), tự lùi lại trang hợp lệ
        renderContentPage(currentPage);

    }, function(error) {
        console.error("Lỗi Firestore:", error);
        contentList.innerHTML = "<p style='color:red;'>❌ Lỗi tải dữ liệu từ Firebase!</p>";
    });
}

// =========================================================
// 1b. VẼ 1 TRANG DANH SÁCH BÀI HỌC (PHÂN TRANG)
// =========================================================
function renderContentPage(page) {
    let contentList = document.getElementById("contentList");
    if (!contentList) return;

    if (allContentItems.length === 0) {
        contentList.innerHTML = "<p>Chưa có bài học nào trên CSDL.</p>";
        renderContentPagination();
        return;
    }

    let result = paginate(allContentItems, page, PAGE_SIZE);
    currentPage = result.currentPage;

    let html = "";

    for (let i = 0; i < result.pageItems.length; i++) {
        let item = result.pageItems[i];
        let id = item.__id;
        let isPinned = item.featured;
        if (!isPinned) isPinned = false;

        let titleText = item.title;
        if (!titleText) titleText = "Không có tiêu đề";

        let descText = item.description;
        if (!descText) descText = "Không có nội dung";

        let subjectText = item.subjectLabel;
        if (!subjectText) subjectText = item.subject;
        if (!subjectText) subjectText = "Khác";

        let readTimeText = item.readTime;
        if (!readTimeText) readTimeText = "5 phút đọc";

        let starIcon = "";
        if (isPinned) {
            starIcon = "⭐";
        }

        let pinButtonText = "⭐ Nổi bật";
        if (isPinned) {
            pinButtonText = "Bỏ nổi bật";
        }

        // Xử lý hiển thị thẻ <img> nếu bài học có ảnh
        let imageHTML = "";
        if (item.imageUrl && item.imageUrl !== "") {
            imageHTML = '<img src="' + item.imageUrl + '" style="max-width: 100%; max-height: 200px; object-fit: cover; border-radius: 4px; margin-top: 8px; display: block;" />';
        }

        html += '<div style="border: 1px solid #ccc; padding: 12px; margin-bottom: 10px; border-radius: 6px; background: #fff;">';
        html += '  <div style="display: flex; justify-content: space-between; align-items: center;">';
        html += '    <h4 style="margin: 0;">' + titleText + ' ' + starIcon + '</h4>';
        html += '    <div>';
        html += '      <button class="btn-pin" data-id="' + id + '" data-pinned="' + isPinned + '" style="margin-right: 5px; cursor: pointer;">' + pinButtonText + '</button>';
        html += '      <button class="btn-delete" data-id="' + id + '" style="color: red; cursor: pointer;">🗑️ Xóa</button>';
        html += '    </div>';
        html += '  </div>';

        // Chèn hình ảnh vào khung bài viết
        html += imageHTML;

        html += '  <p style="margin: 8px 0; color: #555;">' + descText + '</p>';
        html += '  <small style="color: #888;">Môn: <b>' + subjectText + '</b> | Thời gian: <b>' + readTimeText + '</b></small>';
        html += '</div>';
    }

    contentList.innerHTML = html;
    attachEvents();
    renderContentPagination();
}

function renderContentPagination() {
    let paginationEl = document.getElementById("contentPagination");
    renderPaginationInto(paginationEl, {
        totalItems: allContentItems.length,
        currentPage: currentPage,
        pageSize: PAGE_SIZE,
        onPageChange: function(page) {
            renderContentPage(page);
        }
    });
}

// =========================================================
// 2. XỬ LÝ CHỌN VÀ UPLOAD ẢNH
// =========================================================
function setupImageUpload() {
    let fileInput = document.getElementById("contentImageFile");
    let urlInput = document.getElementById("contentImageUrl");
    let previewImg = document.getElementById("contentImagePreview");

    // Nhãn trạng thái tải ảnh (tự tạo nếu HTML chưa có sẵn)
    let statusEl = document.getElementById("contentImageUploadStatus");
    if (!statusEl && fileInput) {
        statusEl = document.createElement("small");
        statusEl.id = "contentImageUploadStatus";
        statusEl.style.color = "#64748b";
        fileInput.insertAdjacentElement("afterend", statusEl);
    }

    // Cách 1: Khi chọn file từ máy tính (Upload lên Cloudinary dùng file config)
    if (fileInput) {
        fileInput.addEventListener("change", async function(e) {
            let file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert("Kích thước ảnh tối đa là 5MB!");
                return;
            }

            let formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", cloudinaryConfig.uploadPreset);

            if (statusEl) statusEl.innerHTML = '<span class="brx-spinner brx-spinner-sm"></span> Đang tải ảnh lên...';

            try {
                let uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudinaryConfig.cloudName + "/image/upload";
                
                let res = await fetch(uploadUrl, {
                    method: "POST",
                    body: formData
                });

                if (res.ok) {
                    let data = await res.json();
                    selectedImageUrl = data.secure_url;

                    if (previewImg) {
                        previewImg.src = selectedImageUrl;
                        previewImg.style.display = "block";
                    }
                    if (statusEl) statusEl.textContent = "✅ Đã tải ảnh lên thành công.";
                } else {
                    if (statusEl) statusEl.textContent = "";
                    alert("Không thể tải ảnh lên, vui lòng kiểm tra cấu hình Cloudinary.");
                }
            } catch (err) {
                console.error("Lỗi upload:", err);
                if (statusEl) statusEl.textContent = "";
                alert("Lỗi kết nối khi tải ảnh!");
            }
        });
    }

    // Cách 2: Khi dán thẳng đường link URL ảnh vào ô input
    if (urlInput) {
        urlInput.addEventListener("input", function() {
            let url = urlInput.value.trim();
            if (url !== "") {
                selectedImageUrl = url;
                if (previewImg) {
                    previewImg.src = url;
                    previewImg.style.display = "block";
                }
            } else {
                if (fileInput && fileInput.files.length === 0) {
                    selectedImageUrl = "";
                    if (previewImg) previewImg.style.display = "none";
                }
            }
        });
    }
}

// =========================================================
// 3. THÊM BÀI HỌC MỚI VÀO FIRESTORE (KÈM ẢNH)
// =========================================================
function setupAddContentForm() {
    let form = document.getElementById("addContentForm");
    if (!form) return;

    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        let titleInput = document.getElementById("contentTitle");
        let subjectSelect = document.getElementById("contentSubject");
        let readTimeInput = document.getElementById("contentReadTime");
        let descInput = document.getElementById("contentDesc");
        let submitBtn = form.querySelector('button[type="submit"]');

        let title = "";
        if (titleInput) title = titleInput.value.trim();

        let subject = "";
        if (subjectSelect) subject = subjectSelect.value;

        let subjectLabel = "";
        if (subjectSelect && subjectSelect.selectedIndex >= 0) {
            subjectLabel = subjectSelect.options[subjectSelect.selectedIndex].text;
        }

        let readTime = "5 phút đọc";
        if (readTimeInput && readTimeInput.value.trim() !== "") {
            readTime = readTimeInput.value.trim();
        }

        let description = "";
        if (descInput) description = descInput.value.trim();

        if (title === "" || subject === "" || description === "") {
            alert("Vui lòng điền tiêu đề, chọn môn học và nhập nội dung!");
            return;
        }

        await withButtonLoading(submitBtn, "Đang lưu...", async function() {
            try {
                let knowledgeRef = collection(db, "knowledge");
                await addDoc(knowledgeRef, {
                    title: title,
                    subject: subject,
                    subjectLabel: subjectLabel,
                    readTime: readTime,
                    description: description,
                    imageUrl: selectedImageUrl, // Lưu đường link ảnh vào Firestore
                    featured: false,
                    createdAt: new Date().toISOString()
                });

                alert("✅ Đã lưu bài học lên Firebase!");

                // Reset form và ô xem trước ảnh
                form.reset();
                selectedImageUrl = "";
                let previewImg = document.getElementById("contentImagePreview");
                if (previewImg) {
                    previewImg.src = "";
                    previewImg.style.display = "none";
                }
                let statusEl = document.getElementById("contentImageUploadStatus");
                if (statusEl) statusEl.textContent = "";

                // Bài mới nằm ở đầu danh sách (orderBy createdAt desc) -> quay về trang 1
                currentPage = 1;

            } catch (error) {
                console.error("Lỗi khi thêm bài học:", error);
                alert("❌ Lỗi khi lưu bài học!");
            }
        });
    });
}

// =========================================================
// 4. XỬ LÝ SỰ KIỆN NÚT XÓA / GHIM BÀI HỌC
// =========================================================
function attachEvents() {
    // Nút Xóa
    let deleteButtons = document.querySelectorAll(".btn-delete");
    for (let i = 0; i < deleteButtons.length; i++) {
        deleteButtons[i].addEventListener("click", async function() {
            let btn = this;
            let id = btn.getAttribute("data-id");
            let confirmDelete = confirm("Bạn có chắc muốn xóa bài viết này không?");
            
            if (confirmDelete) {
                await withButtonLoading(btn, "Đang xóa...", async function() {
                    try {
                        let docRef = doc(db, "knowledge", id);
                        await deleteDoc(docRef);
                    } catch (err) {
                        console.error("Lỗi xóa:", err);
                        alert("Lỗi không thể xóa bài viết!");
                    }
                });
            }
        });
    }

    // Nút Ghim
    let pinButtons = document.querySelectorAll(".btn-pin");
    for (let i = 0; i < pinButtons.length; i++) {
        pinButtons[i].addEventListener("click", async function() {
            let btn = this;
            let id = btn.getAttribute("data-id");
            let currentPinned = (btn.getAttribute("data-pinned") === "true");

            setButtonLoading(btn, true, "...");
            try {
                let docRef = doc(db, "knowledge", id);
                await updateDoc(docRef, {
                    featured: !currentPinned
                });
            } catch (err) {
                console.error("Lỗi cập nhật ghim:", err);
                setButtonLoading(btn, false);
            }
        });
    }
}
