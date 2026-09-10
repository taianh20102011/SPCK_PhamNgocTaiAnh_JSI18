import { auth, db } from './firebase-config.js';
import { loadingBoxHTML, withButtonLoading } from './ui-utils.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { cloudinaryConfig } from './cloudinary-config.js';

// Khai báo các biến toàn cục
let notes = [];
let activeId = null;
let selectedImageUrl = '';

// Hàm xóa dữ liệu trên ô nhập (Reset form)
function resetEditor() {
    activeId = null;
    document.getElementById('note-title-input').value = '';
    document.getElementById('note-subject-select').value = 'math';
    document.getElementById('note-content-input').value = '';
    selectedImageUrl = '';
    
    document.getElementById('note-image-name').textContent = 'Chưa chọn ảnh';
    document.getElementById('note-image-preview').classList.add('hidden');
    document.getElementById('note-image-preview').src = '';
}

// Hàm hiển thị danh sách ghi chú ra màn hình
function renderList() {
    let box = document.getElementById('notes-list');
    let key = document.getElementById('note-search').value.trim().toLowerCase();
    
    // Tìm kiếm ghi chú
    let list = notes.filter(function(n) {
        if (!key) return true;
        let text = (n.title + ' ' + n.content).toLowerCase();
        return text.includes(key);
    });

    // Nếu không có ghi chú nào
    if (list.length === 0) {
        box.innerHTML = '<div class="note-empty">Chưa có ghi chú phù hợp.</div>';
        return;
    }

    // Ghép HTML danh sách
    let html = '';
    for (let i = 0; i < list.length; i++) {
        let n = list[i];
        let activeClass = '';
        if (n.id === activeId) {
            activeClass = 'active';
        }
        
        let titleText = n.title;
        if (!titleText) titleText = 'Không tiêu đề';

        let contentText = n.content;
        if (!contentText) contentText = 'Chưa có nội dung';

        let subjectText = n.subjectLabel;
        if (!subjectText) subjectText = n.subject;
        if (!subjectText) subjectText = '';

        html += '<button class="note-item ' + activeClass + '" data-id="' + n.id + '">';
        html += '<div class="note-item-title">' + titleText + '</div>';
        html += '<div class="note-item-snippet">' + contentText + '</div>';
        html += '<small>' + subjectText + '</small>';
        html += '</button>';
    }

    box.innerHTML = html;
}

// Hàm tải ghi chú từ Firebase về
async function loadNotes(uid) {
    let box = document.getElementById('notes-list');
    if (box) box.innerHTML = loadingBoxHTML('Đang tải ghi chú...');

    let notesRef = collection(db, 'users', uid, 'notes');
    let q = query(notesRef, orderBy('updatedAt', 'desc'));
    
    let snap = await getDocs(q);
    
    notes = [];
    snap.forEach(function(docSnap) {
        let data = docSnap.data();
        data.id = docSnap.id;
        notes.push(data);
    });

    renderList();

    // Mở ghi chú đầu tiên nếu có
    if (notes.length > 0) {
        openNote(notes[0].id);
    } else {
        resetEditor();
    }
}

// Hàm mở 1 ghi chú lên khung sửa
function openNote(id) {
    let n = null;
    for (let i = 0; i < notes.length; i++) {
        if (notes[i].id === id) {
            n = notes[i];
            break;
        }
    }

    if (!n) return;

    activeId = id;
    document.getElementById('note-title-input').value = n.title || '';
    document.getElementById('note-subject-select').value = n.subject || 'math';
    document.getElementById('note-content-input').value = n.content || '';
    
    selectedImageUrl = n.imageUrl || '';
    
    if (n.imageUrl) {
        document.getElementById('note-image-name').textContent = 'Đã đính kèm ảnh';
        document.getElementById('note-image-preview').src = n.imageUrl;
        document.getElementById('note-image-preview').classList.remove('hidden');
    } else {
        document.getElementById('note-image-name').textContent = 'Chưa chọn ảnh';
        document.getElementById('note-image-preview').classList.add('hidden');
        document.getElementById('note-image-preview').src = '';
    }

    renderList();
}

// Hàm tải ảnh lên Cloudinary
async function uploadImage(file) {
    if (!file) return;

    // Kiểm tra dung lượng (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Ảnh tối đa 5MB.');
        return;
    }

    document.getElementById('note-image-name').innerHTML = '<span class="brx-spinner brx-spinner-sm"></span> Đang tải ảnh...';

    let fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', cloudinaryConfig.uploadPreset);

    let url = 'https://api.cloudinary.com/v1_1/' + cloudinaryConfig.cloudName + '/image/upload';
    
    let response = await fetch(url, {
        method: 'POST',
        body: fd
    });

    if (response.ok) {
        let data = await response.json();
        selectedImageUrl = data.secure_url;
        document.getElementById('note-image-name').textContent = file.name;
        document.getElementById('note-image-preview').src = selectedImageUrl;
        document.getElementById('note-image-preview').classList.remove('hidden');
    } else {
        alert('Upload ảnh thất bại');
        document.getElementById('note-image-name').textContent = 'Chưa chọn ảnh';
    }
}

// Hàm Lưu ghi chú
async function save() {
    let user = auth.currentUser;
    if (!user) {
        alert('Bạn chưa đăng nhập!');
        return;
    }

    let title = document.getElementById('note-title-input').value.trim();
    let content = document.getElementById('note-content-input').value.trim();
    let subject = document.getElementById('note-subject-select').value;
    
    let selectElem = document.getElementById('note-subject-select');
    let subjectLabel = selectElem.options[selectElem.selectedIndex].text;

    if (title === '' && content === '' && selectedImageUrl === '') {
        alert('Hãy nhập nội dung ghi chú hoặc chọn ảnh.');
        return;
    }

    if (title === '') {
        title = 'Ghi chú chưa đặt tên';
    }

    let payload = {
        title: title,
        content: content,
        subject: subject,
        subjectLabel: subjectLabel,
        imageUrl: selectedImageUrl,
        updatedAt: serverTimestamp()
    };

    await withButtonLoading(document.getElementById('btn-save-note'), 'Đang lưu...', async function() {
        if (activeId !== null) {
            // Cập nhật ghi chú cũ
            let docRef = doc(db, 'users', user.uid, 'notes', activeId);
            await updateDoc(docRef, payload);
        } else {
            // Tạo ghi chú mới
            payload.createdAt = serverTimestamp();
            let notesRef = collection(db, 'users', user.uid, 'notes');
            let ref = await addDoc(notesRef, payload);
            activeId = ref.id;
        }

        await loadNotes(user.uid);
        alert('✅ Đã lưu ghi chú.');
    });
}

// Hàm Xóa ghi chú
async function remove() {
    let user = auth.currentUser;
    if (!user || !activeId) return;

    let confirmDelete = confirm('Xóa ghi chú này?');
    if (confirmDelete) {
        await withButtonLoading(document.getElementById('btn-delete-note'), 'Đang xóa...', async function() {
            let docRef = doc(db, 'users', user.uid, 'notes', activeId);
            await deleteDoc(docRef);
            await loadNotes(user.uid);
            alert('🗑️ Đã xóa.');
        });
    }
}

// Lắng nghe các sự kiện giao diện
document.addEventListener('DOMContentLoaded', function() {
    
    // Lắng nghe trạng thái đăng nhập
    onAuthStateChanged(auth, function(user) {
        if (user) {
            loadNotes(user.uid);
        }
    });

    // Nút Tạo mới
    document.getElementById('btn-create-note').addEventListener('click', function() {
        resetEditor();
    });

    // Nút Lưu
    document.getElementById('btn-save-note').addEventListener('click', function() {
        save();
    });

    // Nút Xóa
    document.getElementById('btn-delete-note').addEventListener('click', function() {
        remove();
    });

    // Ô tìm kiếm
    document.getElementById('note-search').addEventListener('input', function() {
        renderList();
    });

    // Click chọn ghi chú trong danh sách
    document.getElementById('notes-list').addEventListener('click', function(e) {
        let btn = e.target.closest('[data-id]');
        if (btn) {
            let id = btn.getAttribute('data-id');
            openNote(id);
        }
    });

    // Nút bấm tải ảnh
    let btnImage = document.getElementById('btn-note-image');
    if (btnImage) {
        btnImage.addEventListener('click', function() {
            document.getElementById('note-image-upload').click();
        });
    }

    // Sự kiện khi chọn file ảnh xong
    document.getElementById('note-image-upload').addEventListener('change', function(e) {
        let file = e.target.files[0];
        uploadImage(file);
    });
});
