import { auth, db } from './firebase-config.js';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, setDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { loadingBoxHTML } from './ui-utils.js';

const SUBJECTS = [
  ['math','➗','Toán học','mastery'], ['physics','⚡','Vật lý','mastery'], ['chemistry','🧪','Hóa học','mastery'],
  ['english','🔤','Tiếng Anh','mastery'], ['literature','📖','Ngữ Văn','mastery'], ['it','💻','Tin học','mastery']
];

let timer = null, seconds = 25*60;
const $ = id => document.getElementById(id);
const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
function updateTimer(){ if($('pomo-timer')) $('pomo-timer').textContent = fmt(seconds); }
function startTimer(){ if(timer) return; timer=setInterval(()=>{ if(seconds>0){seconds--;updateTimer();}else{clearInterval(timer);timer=null; alert('🎉 Pomodoro hoàn thành! Nghỉ 5 phút nhé.');}},1000); }
function pauseTimer(){ clearInterval(timer); timer=null; }
function resetTimer(){ pauseTimer(); seconds=25*60; updateTimer(); }
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

async function load(){
  // Spinner tạm trong lúc chờ dữ liệu môn học / deadline từ Firestore
  if($('subjects-container')) $('subjects-container').innerHTML = loadingBoxHTML('Đang tải môn học...');
  if($('upcoming-deadlines')) $('upcoming-deadlines').innerHTML = `<li>${loadingBoxHTML('Đang tải...')}</li>`;

  onAuthStateChanged(auth, async user=>{
    if(!user) return;
    const userRef=doc(db,'users',user.uid);
    const snap=await getDoc(userRef); const data=snap.exists()?snap.data():{};
    const exp=Number(data.exp||0), level=Number(data.level||1);
    if($('stat-total-exp')) $('stat-total-exp').textContent=exp;
    if($('user-level')) $('user-level').textContent=`Lv.${level}`;
    if($('user-exp-bar')) $('user-exp-bar').style.width=`${Math.min(100,exp%100)}%`;

    const [notesSnap, attemptsSnap] = await Promise.all([
      getDocs(collection(db,'users',user.uid,'notes')),
      getDocs(query(collection(db,'users',user.uid,'quizAttempts'), orderBy('createdAt','desc'), limit(50))).catch(()=>({docs:[]}))
    ]);
    const attempts=attemptsSnap.docs||[];
    const notesCount=notesSnap.size;
    const completed=Math.max(Number(data.completedTasks||0), attempts.length, Number(data.quizCompleted||0));
    const avg = attempts.length ? attempts.reduce((s,d)=>s+Number(d.data().percent||0),0)/attempts.length : Number(data.gpa||0);
    if($('stat-completed-tasks')) $('stat-completed-tasks').textContent=`${completed}/${Math.max(completed,1)}`;
    if($('stat-gpa')) $('stat-gpa').textContent=(avg/10).toFixed(1);
    const studyMinutes=Number(data.studyMinutes||0);
    if($('stat-study-time')) $('stat-study-time').textContent=`${studyMinutes} phút`;
    renderSubjects(data, attempts, notesCount);
    renderDeadlines(data, attempts);
  });
}
function renderSubjects(data,attempts,notesCount){
  const box=$('subjects-container'); if(!box)return;
  const scores={};
  attempts.forEach(d=>{const x=d.data(); if(x.subject) scores[x.subject]=Math.max(scores[x.subject]||0,Number(x.percent||0));});
  box.innerHTML=SUBJECTS.map(([key,icon,label])=>{
    const p=Math.round(scores[key]||0);
    return `<div class="subject-card"><div class="subject-icon">${icon}</div><div><strong>${label}</strong><p>${p?`Tiến độ tốt nhất: ${p}%`:'Chưa có dữ liệu'}</p></div><div class="subject-progress"><span style="width:${p}%"></span></div><a class="btn subject-open" href="quiz.html?subject=${key}">Luyện tập →</a></div>`
  }).join('') + `<div class="subject-card"><div class="subject-icon">📝</div><div><strong>Sổ tay</strong><p>${notesCount} ghi chú đã lưu</p></div><div class="subject-progress"><span style="width:${Math.min(100,notesCount*10)}%"></span></div><a class="btn subject-open" href="note.html">Mở sổ tay →</a></div>`;
}
function renderDeadlines(data,attempts){
  const box=$('upcoming-deadlines'); if(!box)return;
  const list=(data.deadlines||[]).slice(0,4);
  if(!list.length && !attempts.length){box.innerHTML='<li class="dashboard-empty">✨ Chưa có deadline. Hãy bắt đầu một bài luyện tập!</li>';return;}
  box.innerHTML=(list.length?list:[{title:'Làm một bài Quiz để duy trì chuỗi học tập',date:'Hôm nay'}]).map(x=>`<li class="deadline-item"><span>📌</span><div><strong>${esc(x.title)}</strong><small>${esc(x.date||'')}</small></div></li>`).join('');
}

document.addEventListener('DOMContentLoaded',()=>{updateTimer();$('btn-pomo-start')?.addEventListener('click',startTimer);$('btn-pomo-pause')?.addEventListener('click',pauseTimer);$('btn-pomo-reset')?.addEventListener('click',resetTimer);load();});
