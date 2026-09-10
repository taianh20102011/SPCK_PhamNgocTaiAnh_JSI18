import { auth, db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    setDoc, 
    increment, 
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { setButtonLoading } from './ui-utils.js';

// Ngân hàng câu hỏi
let BANK = {
    math: [
        { q: 'Kết quả của 3² + 4² là?', o: ['12', '25', '49', '7'], a: 1 },
        { q: 'Nghiệm của 2x + 6 = 14 là?', o: ['2', '3', '4', '5'], a: 2 },
        { q: 'Phân số nào bằng 0,75?', o: ['1/2', '2/3', '3/4', '4/5'], a: 2 },
        { q: 'Diện tích hình tròn bán kính 2 cm (lấy π≈3,14)?', o: ['6,28', '12,56', '25,12', '4,14'], a: 1 },
        { q: 'Nếu y = 2x + 1 và x = 4 thì y bằng?', o: ['7', '8', '9', '10'], a: 2 }
    ],
    physics: [
        { q: 'Đơn vị SI của lực là?', o: ['Joule', 'Watt', 'Newton', 'Pascal'], a: 2 },
        { q: 'Công thức vận tốc trung bình là?', o: ['v=s/t', 'v=t/s', 'v=s·t', 'v=s+t'], a: 0 },
        { q: 'Vật chuyển động thẳng đều thì gia tốc bằng?', o: ['0', '1 m/s²', 'g', 'Phụ thuộc khối lượng'], a: 0 },
        { q: 'Công suất được tính bằng?', o: ['P=A/t', 'P=A·t', 'P=t/A', 'P=F/s'], a: 0 },
        { q: 'Dòng điện qua điện trở tuân theo định luật?', o: ['Ohm', 'Hooke', 'Archimedes', 'Faraday'], a: 0 }
    ],
    chemistry: [
        { q: 'Ký hiệu hóa học của Natri là?', o: ['Na', 'N', 'Ni', 'Ne'], a: 0 },
        { q: 'pH = 7 biểu thị môi trường?', o: ['Axit mạnh', 'Bazơ', 'Trung tính', 'Muối'], a: 2 },
        { q: 'Khí chiếm nhiều nhất trong không khí?', o: ['O₂', 'CO₂', 'N₂', 'H₂'], a: 2 },
        { q: 'Nước có công thức?', o: ['H₂O', 'CO₂', 'NaCl', 'O₂'], a: 0 },
        { q: 'NaCl là?', o: ['Đường', 'Muối ăn', 'Axit', 'Kim loại'], a: 1 }
    ],
    english: [
        { q: 'Choose the correct form: She ___ to school every day.', o: ['go', 'goes', 'going', 'gone'], a: 1 },
        { q: 'What is the past tense of “buy”?', o: ['buyed', 'bought', 'buys', 'buy'], a: 1 },
        { q: '“Beautiful” is a/an ...', o: ['verb', 'adverb', 'adjective', 'pronoun'], a: 2 },
        { q: 'Choose: I have lived here ___ 2020.', o: ['for', 'since', 'at', 'on'], a: 1 },
        { q: 'Opposite of “difficult” is ...', o: ['easy', 'hard', 'late', 'slow'], a: 0 }
    ],
    literature: [
        { q: 'Biện pháp tu từ so sánh thường có từ “như”, đúng hay sai?', o: ['Đúng', 'Sai', 'Chỉ trong thơ', 'Chỉ trong văn xuôi'], a: 0 },
        { q: '“Làng” là tác phẩm của ai?', o: ['Kim Lân', 'Tô Hoài', 'Nam Cao', 'Nguyễn Du'], a: 0 },
        { q: 'Thể thơ lục bát có số tiếng mỗi cặp câu là?', o: ['6-8', '7-7', '5-7', '8-8'], a: 0 },
        { q: '“Truyện Kiều” do ai sáng tác?', o: ['Nguyễn Trãi', 'Nguyễn Du', 'Hồ Xuân Hương', 'Nguyễn Khuyến'], a: 1 },
        { q: 'Miêu tả là phương thức biểu đạt chủ yếu nhằm?', o: ['Kể sự việc', 'Tái hiện đặc điểm, hình dáng', 'Bộc lộ cảm xúc', 'Nêu luận điểm'], a: 1 }
    ],
    it: [
        { q: 'HTML là viết tắt của?', o: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink Text Machine Language', 'Home Tool Markup Language'], a: 0 },
        { q: 'CSS dùng chủ yếu để?', o: ['Lưu dữ liệu', 'Tạo giao diện/trình bày', 'Chạy máy chủ', 'Quản lý email'], a: 1 },
        { q: 'JavaScript chạy phổ biến ở đâu?', o: ['Trình duyệt', 'Chỉ BIOS', 'Chỉ Word', 'Chỉ Photoshop'], a: 0 },
        { q: 'JSON thường dùng để?', o: ['Trao đổi dữ liệu', 'Nén ảnh', 'Dựng phim', 'Biên dịch C++'], a: 0 },
        { q: 'Firebase là nền tảng thuộc hệ sinh thái nào?', o: ['Google', 'Apple', 'Adobe', 'Microsoft'], a: 0 }
    ]
};

// Nhãn tên môn học
let LABEL = {
    math: 'Toán học',
    physics: 'Vật lý',
    chemistry: 'Hóa học',
    english: 'Tiếng Anh',
    literature: 'Ngữ Văn',
    it: 'Tin học'
};

// Lấy môn học từ thanh địa chỉ URL
let urlParams = new URLSearchParams(window.location.search);
let subject = urlParams.get('subject');

// Nếu không truyền môn hoặc môn không có trong danh sách thì mặc định chọn math
if (!subject || !BANK[subject]) {
    subject = 'math';
}

// Khai báo các biến trạng thái bài trắc nghiệm
let questions = BANK[subject];
let index = 0;
let score = 0;
let answered = false;

// Hàm hiển thị câu hỏi ra màn hình
function render() {
    let titleElem = document.getElementById('quiz-title');
    titleElem.textContent = '🧠 ' + LABEL[subject] + ' • Luyện tập';

    let scoreElem = document.getElementById('quiz-score');
    scoreElem.textContent = score;

    let progressElem = document.getElementById('quiz-progress');
    if (progressElem) {
        progressElem.textContent = 'Câu ' + (index + 1) + '/' + questions.length;
    }

    let currentQuestion = questions[index];
    let questionTextElem = document.getElementById('quiz-question-text');
    questionTextElem.textContent = currentQuestion.q;

    // Tạo các nút lựa chọn đáp án
    let box = document.getElementById('quiz-options-container');
    box.className = 'quiz-options-grid';
    
    let htmlOptions = '';
    for (let i = 0; i < currentQuestion.o.length; i++) {
        let letter = String.fromCharCode(65 + i); // 65 là mã ASCII của chữ 'A'
        let text = currentQuestion.o[i];
        htmlOptions += '<button class="quiz-option" data-i="' + i + '">' + letter + '. ' + text + '</button>';
    }
    box.innerHTML = htmlOptions;

    // Đặt lại trạng thái chưa chọn đáp án
    answered = false;

    let nextBtn = document.getElementById('btn-next-question');
    nextBtn.disabled = true;

    if (index === questions.length - 1) {
        nextBtn.textContent = 'Hoàn thành ✓';
    } else {
        nextBtn.textContent = 'Câu tiếp theo ➔';
    }
}

// Hàm xử lý khi người dùng bấm chọn 1 đáp án
function choose(selectedIndex) {
    if (answered === true) {
        return;
    }

    answered = true;
    let currentQuestion = questions[index];
    let optionButtons = document.querySelectorAll('.quiz-option');

    // Khóa tất cả các nút và tô màu đúng/sai
    for (let j = 0; j < optionButtons.length; j++) {
        let btn = optionButtons[j];
        btn.disabled = true;

        // Nếu đây là đáp án đúng
        if (j === currentQuestion.a) {
            btn.classList.add('correct');
        }

        // Nếu chọn sai đáp án này
        if (j === selectedIndex && selectedIndex !== currentQuestion.a) {
            btn.classList.add('incorrect');
        }
    }

    // Nếu trả lời đúng thì cộng điểm
    if (selectedIndex === currentQuestion.a) {
        score = score + 1;
        document.getElementById('quiz-score').textContent = score;
    }

    // Mở khóa nút sang câu tiếp theo
    document.getElementById('btn-next-question').disabled = false;
}

// Hàm hoàn thành bài trắc nghiệm và lưu kết quả
async function finish() {
    let user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    let percent = Math.round((score / questions.length) * 100);

    let attemptData = {
        subject: subject,
        subjectLabel: LABEL[subject],
        score: score,
        total: questions.length,
        percent: percent,
        createdAt: serverTimestamp()
    };

    // Lưu thông tin lần làm bài
    let userAttemptsRef = collection(db, 'users', user.uid, 'quizAttempts');
    await addDoc(userAttemptsRef, attemptData);

    // Lấy thông tin cấp độ/kinh nghiệm hiện tại của người dùng
    let userDocRef = doc(db, 'users', user.uid);
    let snap = await getDoc(userDocRef);

    let level = 1;
    let exp = 0;

    if (snap.exists()) {
        let data = snap.data();
        if (data.level) {
            level = Number(data.level);
        }
        if (data.exp) {
            exp = Number(data.exp);
        }
    }

    // Tính kinh nghiệm thưởng
    let expGain = score * 5;
    if (expGain < 5) {
        expGain = 5;
    }

    // Cập nhật thông tin điểm/kinh nghiệm vào Firestore
    await setDoc(userDocRef, {
        level: level,
        exp: exp + expGain,
        quizCompleted: increment(1)
    }, { merge: true });

    // Chọn biểu tượng emoji theo kết quả
    let emoji = '📘';
    if (percent >= 80) {
        emoji = '🏆';
    } else if (percent >= 60) {
        emoji = '🎉';
    }

    // Hiển thị khung kết quả
    let resultHTML = '';
    resultHTML += '<div class="quiz-result">';
    resultHTML += '  <div class="result-emoji">' + emoji + '</div>';
    resultHTML += '  <h3>Hoàn thành bài luyện tập!</h3>';
    resultHTML += '  <p>Bạn đạt <strong>' + score + '/' + questions.length + '</strong> câu đúng (' + percent + '%).</p>';
    resultHTML += '  <p class="quiz-earned">+' + expGain + ' EXP đã được cộng.</p>';
    resultHTML += '  <div class="result-actions">';
    resultHTML += '    <button class="btn btn-primary" id="retry-quiz">Làm lại</button>';
    resultHTML += '    <a class="btn" href="dashboard.html">Về Dashboard</a>';
    resultHTML += '  </div>';
    resultHTML += '</div>';

    document.getElementById('quiz-question-card').innerHTML = resultHTML;

    // Gán sự kiện cho nút Làm lại
    document.getElementById('retry-quiz').addEventListener('click', function() {
        window.location.reload();
    });
}

// Bắt sự kiện khi trang web tải xong
document.addEventListener('DOMContentLoaded', function() {
    render();

    // Bắt sự kiện click chọn đáp án
    document.getElementById('quiz-options-container').addEventListener('click', function(e) {
        let btn = e.target.closest('.quiz-option');
        if (btn) {
            let optionIndex = Number(btn.getAttribute('data-i'));
            choose(optionIndex);
        }
    });

    // Bắt sự kiện bấm nút Tiếp theo / Hoàn thành
    document.getElementById('btn-next-question').addEventListener('click', function() {
        if (answered === false) {
            return;
        }

        if (index < questions.length - 1) {
            index = index + 1;
            render();
        } else {
            let nextBtn = document.getElementById('btn-next-question');
            setButtonLoading(nextBtn, true, 'Đang lưu kết quả...');
            finish().catch(function(e) {
                console.error(e);
                alert('Không thể lưu kết quả. Kiểm tra Firestore rules.');
                setButtonLoading(nextBtn, false);
            });
        }
    });
});