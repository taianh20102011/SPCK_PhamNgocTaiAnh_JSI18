import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const ERROR_MAP = {
    "auth/email-already-in-use": {
        msg: "Email này đã được dùng cho tài khoản khác!",
        fix: "Dùng email khác hoặc chuyển sang trang Đăng nhập."
    },
    "auth/invalid-email": {
        msg: "Địa chỉ email không đúng định dạng!",
        fix: "Kiểm tra lại đuôi email (ví dụ: @gmail.com)."
    },
    "auth/weak-password": {
        msg: "Mật khẩu quá yếu! Cần ít nhất 6 ký tự.",
        fix: "Nhập mật khẩu dài hơn 6 ký tự."
    },
    "auth/network-request-failed": {
        msg: "Mất kết nối mạng hoặc Firebase bị chặn!",
        fix: "Kiểm tra lại Wifi hoặc kết nối Internet của bạn."
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    if (!registerForm) return;

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fullname = document.getElementById("register-name").value.trim();
        const role = 'student';
        const grade = document.getElementById("register-grade").value;
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;
        const btnRegister = document.getElementById("btn-register");

        if (!fullname || !grade || !email || !password) {
            alert("⚠️ Bạn chưa điền đầy đủ thông tin!");
            return;
        }

        try {
            btnRegister.disabled = true;
            btnRegister.textContent = "Đang tạo tài khoản...";

            // 1. Tạo user trên Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Lưu chi tiết User & Role vào Cloud Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                fullname: fullname,
                role: 'student', // 'student' hoặc 'admin'
                grade: grade,
                className: `Khối ${grade}`,
                email: email,
                level: 1,
                exp: 0,
                createdAt: new Date().toISOString()
            });

            alert("🎉 Đăng ký thành công!");

            // 3. Đăng ký công khai chỉ tạo tài khoản Student. Admin được cấp riêng.
            window.location.href = "../user/dashboard.html";

        } catch (error) {
            const errorInfo = ERROR_MAP[error.code] || {
                msg: "Đã có lỗi xảy ra: " + error.message,
                fix: "Kiểm tra lại cấu hình Firebase."
            };
            console.error("Lỗi đăng ký:", error);
            alert("❌ " + errorInfo.msg);
        } finally {
            btnRegister.disabled = false;
            btnRegister.textContent = "Đăng Ký Tài Khoản";
        }
    });
});