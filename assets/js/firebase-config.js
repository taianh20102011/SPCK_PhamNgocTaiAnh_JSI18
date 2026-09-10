import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


const firebaseConfig = {

    apiKey: "AIzaSyDlVJmZ7Sed0QVoFqZVjiuxxGMNfXuwqyA",

    authDomain: "brainlyx-19ba8.firebaseapp.com",

    projectId: "brainlyx-19ba8",

    storageBucket: "brainlyx-19ba8.firebasestorage.app",

    messagingSenderId: "1043226356904",

    appId: "1:1043226356904:web:217ad4f701347aaa13e69d",

    measurementId: "G-VW4XZDE9F9"
};


// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);


// Khởi tạo đăng nhập
const auth = getAuth(app);


// Khởi tạo cơ sở dữ liệu
const db = getFirestore(app);


// Cho các file khác sử dụng
export { auth, db };