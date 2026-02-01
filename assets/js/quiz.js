
/* global window, document, fetch, localStorage */
const STORAGE = {
  quizState: 'stepApp_quizState_v1',
  lastResult: 'stepApp_lastResult_v1'
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const safeJSON = (s, fb=null)=>{ try{return JSON.parse(s);}catch{return fb;} };

function toast(msg){
  const t = $('#toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3200);
}

function showFloating(msg){
  const box = $('#floatingToast');
  const text = $('#floatingToastText');
  if(!box || !text) return;
  text.textContent = msg;
  box.classList.add('show');
  setTimeout(()=>box.classList.remove('show'), 5200);
}

function getProfileFromForm(){
  return {
    name: $('#name').value.trim(),
    goal: $('#goal').value,
    region: $('#region').value,
    testWindow: $('#testWindow').value,
    tookBefore: $('#tookBefore').value,
    prevScore: $('#prevScore').value || null,
    targetScore: $('#targetScore').value || null,
    dailyMinutes: Number($('#dailyMinutes').value),
    studyTime: $('#studyTime').value,
    stage: $('#stage').value,
    uniDetail: $('#uniDetail').value || null,
    major: $('#major').value.trim() || null,
    mode: $('#mode').value,
    weakestSelf: $('#weakest').value
  };
}

function saveState(state){
  localStorage.setItem(STORAGE.quizState, JSON.stringify(state));
}

function loadState(){
  return safeJSON(localStorage.getItem(STORAGE.quizState), null);
}

function clearState(){
  localStorage.removeItem(STORAGE.quizState);
}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function pickQuestions(bank){
  const qs = bank.questions || [];
  const bySection = {
    'Grammar': qs.filter(q=>q.section==='Grammar'),
    'Vocabulary': qs.filter(q=>q.section==='Vocabulary'),
    'Reading': qs.filter(q=>q.section==='Reading'),
    'Writing & Editing': qs.filter(q=>q.section==='Writing & Editing')
  };

  const pick = (arr, n) => shuffle(arr).slice(0,n);
  // balanced selection
  const selected = [
    ...pick(bySection['Grammar'], 20),
    ...pick(bySection['Vocabulary'], 10),
    ...pick(bySection['Reading'], 15),
    ...pick(bySection['Writing & Editing'], 5),
  ];
  return shuffle(selected).slice(0,50);
}

function computeProgress(state){
  const answered = state.answers.filter(a => a !== null).length;
  const pct = Math.round((answered / state.questions.length) * 100);
  return {answered, pct};
}

function renderNav(state){
  const nav = $('#qnav');
  nav.innerHTML = '';
  state.questions.forEach((q, idx)=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(idx+1);
    if(idx === state.currentIndex) b.classList.add('current');
    if(state.answers[idx] !== null) b.classList.add('answered');
    if(state.flags[idx]) b.classList.add('flagged');
    b.addEventListener('click', ()=>{
      state.currentIndex = idx;
      saveState(state);
      renderAll(state);
    });
    nav.appendChild(b);
  });
}

function renderQuestion(state){
  const q = state.questions[state.currentIndex];
  const tag = $('#qTag');
  tag.innerHTML = `<span>${q.section}</span> <span class="small">• ${q.level}</span>`;

  $('#qText').textContent = q.prompt;

  const opts = $('#options');
  opts.innerHTML = '';

  const chosen = state.answers[state.currentIndex];
  const correct = q.answerIndex;

  q.options.forEach((opt, i)=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className = 'opt';
    btn.textContent = opt;

    if(chosen === i) btn.classList.add('selected');
    // after answer show right/wrong coloring
    if(chosen !== null){
      if(i === correct) btn.classList.add('correct');
      if(i === chosen && chosen !== correct) btn.classList.add('wrong');
    }

    btn.addEventListener('click', ()=>{
      state.answers[state.currentIndex] = i;
      saveState(state);
      renderAll(state);
    });
    opts.appendChild(btn);
  });

  // auto feedback
  const auto = $('#autoBox');
  if(chosen === null){
    auto.style.display='none';
  }else{
    const ok = chosen === correct;
    auto.style.display='block';
    auto.innerHTML = `
      <div class="${ok ? 'tag good' : 'tag bad'}" style="display:inline-flex;margin-bottom:8px">
        ${ok ? '✅ إجابة صحيحة' : '❌ إجابة غير صحيحة'}
      </div>
      <div class="help"><b>الإجابة الصحيحة:</b> ${q.options[correct]}</div>
      <div class="help" style="margin-top:6px">${q.explanation_ar || ''}</div>
    `;
  }

  // flag button
  const flagBtn = $('#btnFlag');
  const flagged = state.flags[state.currentIndex];
  flagBtn.textContent = flagged ? '⭐ تمت المراجعة' : '⭐ للمراجعة';
}

function renderProgress(state){
  const {answered, pct} = computeProgress(state);
  $('#progressText').textContent = `${answered} / ${state.questions.length}`;
  $('#progressBar').style.width = `${pct}%`;
  $('#btnFinish').disabled = answered < state.questions.length;
}

function renderAll(state){
  renderNav(state);
  renderQuestion(state);
  renderProgress(state);
}

function grade(state){
  const result = {
    takenAt: new Date().toISOString(),
    profile: state.profile,
    total: state.questions.length,
    correct: 0,
    bySection: {},
    answers: state.answers,
    questions: state.questions
  };

  const secMap = {};
  state.questions.forEach((q, idx)=>{
    const sec = q.section;
    secMap[sec] = secMap[sec] || {total:0, correct:0};
    secMap[sec].total += 1;
    if(state.answers[idx] === q.answerIndex){
      secMap[sec].correct += 1;
      result.correct += 1;
    }
  });
  result.bySection = secMap;
  result.percent = Math.round((result.correct / result.total) * 100);
  // estimate out of 100 as a guiding indicator
  result.estimate = result.percent;
  return result;
}

function goToResults(){
  window.location.href = './results.html';
}

async function init(){
  // toggles based on previous selection
  $('#tookBefore').addEventListener('change', ()=>{
    const yes = $('#tookBefore').value === 'yes';
    $('#prevScoreWrap').style.display = yes ? 'block':'none';
    $('#targetScoreWrap').style.display = yes ? 'block':'none';
  });
  $('#stage').addEventListener('change', ()=>{
    const uni = $('#stage').value === 'جامعي';
    $('#uniWrap').style.display = uni ? 'block':'none';
  });

  const params = new URLSearchParams(location.search);
  const resume = params.get('resume') === '1';

  const form = $('#profileForm');
  const layout = $('#quizLayout');

  let state = null;
  if(resume){
    state = loadState();
    if(state){
      form.closest('.card').style.display = 'none';
      layout.style.display = 'grid';
      renderAll(state);
    }else{
      toast('ما لقينا حفظ سابق.');
    }
  }

  // Start
  $('#btnStart').addEventListener('click', async ()=>{
    // validate
    const required = ['name','goal','region','testWindow','tookBefore','dailyMinutes','studyTime','stage','mode','weakest'];
    for(const id of required){
      const el = document.getElementById(id);
      if(!el || !el.value){
        toast('عبِّ البيانات المطلوبة أول.');
        el?.focus();
        return;
      }
    }
    const profile = getProfileFromForm();

    const bank = await fetch('./assets/data/question-bank.json').then(r=>r.json());
    const qs = pickQuestions(bank);

    state = {
      version: '2026.1',
      profile,
      questions: qs,
      answers: Array(qs.length).fill(null),
      flags: Array(qs.length).fill(false),
      currentIndex: 0,
      startedAt: new Date().toISOString()
    };
    saveState(state);
    form.closest('.card').style.display='none';
    layout.style.display='grid';
    toast('بالتوفيق ✅');
    renderAll(state);
  });

  $('#btnPrev').addEventListener('click', ()=>{
    if(!state) return;
    state.currentIndex = Math.max(0, state.currentIndex-1);
    saveState(state);
    renderAll(state);
  });
  $('#btnNext').addEventListener('click', ()=>{
    if(!state) return;
    state.currentIndex = Math.min(state.questions.length-1, state.currentIndex+1);
    saveState(state);
    renderAll(state);
  });

  $('#btnFlag').addEventListener('click', ()=>{
    if(!state) return;
    state.flags[state.currentIndex] = !state.flags[state.currentIndex];
    saveState(state);
    renderAll(state);
  });

  $('#btnSaveExit').addEventListener('click', ()=>{
    if(!state) return;
    saveState(state);
    toast('تم الحفظ ✅');
    window.location.href = './index.html';
  });

  $('#btnGoResults').addEventListener('click', ()=> goToResults());

  $('#btnFinish').addEventListener('click', ()=>{
    if(!state) return;
    const prog = computeProgress(state);
    if(prog.answered < state.questions.length){
      toast('كمّل باقي الأسئلة أول.');
      return;
    }
    const res = grade(state);
    localStorage.setItem(STORAGE.lastResult, JSON.stringify(res));
    clearState();
    toast('تم حفظ النتيجة ✅');
    goToResults();
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  init().catch(()=>toast('صار خطأ غير متوقع.'));
});
