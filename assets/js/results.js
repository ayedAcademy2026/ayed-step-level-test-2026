
/* global window, document, localStorage */
const STORAGE = {
  lastResult: 'stepApp_lastResult_v1'
};
const $ = (s) => document.querySelector(s);
const safeJSON = (s, fb=null)=>{ try{return JSON.parse(s);}catch{return fb;} };

function toast(msg){
  const t = $('#toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3200);
}
function copy(text){
  return navigator.clipboard.writeText(text).then(()=>true).catch(()=>false);
}
function sectionAdvice(sec){
  switch(sec){
    case 'Grammar': return 'القواعد: ركّز على if / الأزمنة / ترتيب الجملة + حل تدريبات كثيرة.';
    case 'Vocabulary': return 'المفردات: ذاكر بالمعنى والسياق، وراجع كلماتك الضعيفة يوميًا.';
    case 'Reading': return 'القراءة: درّب نفسك على (سؤال→تحديد مكان الجواب) بدل قراءة كاملة ببطء.';
    case 'Writing & Editing': return 'التحرير: ركّز على punctuation + capitalization + ترتيب الجمل.';
    default: return '';
  }
}
function buildBars(res){
  const wrap = $('#bars');
  wrap.innerHTML = '';
  const entries = Object.entries(res.bySection);
  for(const [sec, v] of entries){
    const pct = Math.round((v.correct / v.total) * 100);
    const row = document.createElement('div');
    row.className='bar-row';
    row.innerHTML = `
      <div style="font-weight:900">${sec}</div>
      <div class="meter"><div class="fill" style="width:${pct}%"></div></div>
      <div class="tag ${pct>=75?'good':(pct>=55?'warn':'bad')}">${pct}%</div>
    `;
    wrap.appendChild(row);
    const adv = document.createElement('div');
    adv.className='help';
    adv.style.marginBottom='10px';
    adv.textContent = sectionAdvice(sec);
    wrap.appendChild(adv);
  }
}

function planDays(windowKey){
  if(windowKey==='24h') return 1;
  if(windowKey==='3d') return 3;
  if(windowKey==='7d') return 7;
  if(windowKey==='30d') return 30;
  return 21; // not booked
}

function pickWeakest(res){
  let worst = null;
  let worstPct = 999;
  for(const [sec, v] of Object.entries(res.bySection)){
    const pct = (v.correct / v.total) * 100;
    if(pct < worstPct){ worstPct = pct; worst = sec; }
  }
  return {sec: worst, pct: Math.round(worstPct)};
}

function buildPlan(res){
  const prof = res.profile;
  const days = planDays(prof.testWindow);
  const mins = prof.dailyMinutes || 30;
  const weakest = pickWeakest(res).sec;

  const plan = [];
  const buckets = ['Grammar','Vocabulary','Reading','Writing & Editing'];
  // weighted order: weakest first
  const ordered = [weakest, ...buckets.filter(b=>b!==weakest)];

  function block(label, minutes, hint){
    return {label, minutes, hint};
  }

  for(let d=1; d<=days; d++){
    const tasks = [];
    let remaining = mins;

    // warmup vocab 5–10
    const warm = Math.min(10, Math.max(5, Math.round(mins*0.15)));
    tasks.push(block('Warm‑up Vocabulary', warm, 'راجع 10 كلمات + جملتين لكل كلمة.'));
    remaining -= warm;

    // main focus
    const main = Math.round(remaining*0.55);
    tasks.push(block(`${ordered[0]} Focus`, main, sectionAdvice(ordered[0])));
    remaining -= main;

    // secondary
    const sec = Math.round(remaining*0.6);
    tasks.push(block(`${ordered[1]} Practice`, sec, sectionAdvice(ordered[1])));
    remaining -= sec;

    // mini quiz
    const quiz = Math.max(10, remaining);
    tasks.push(block('Mini Quiz (10–15 Qs)', quiz, 'حل سريع ثم راجع أخطاءك مباشرة.'));
    remaining -= quiz;

    plan.push({day:d, time: prof.studyTime, total: mins, tasks});
  }

  let note = '';
  if(prof.testWindow==='na'){
    note = 'بما إنك ما حجزت، اقتراحنا: امشِ على الخطة 21 يوم وبعدها احجز موعد مناسب. خلك واقعي ولا تستعجل.';
  }else if(prof.testWindow==='24h'){
    note = 'وقتُك ضيق جدًا: ركّز على الأخطاء المتكررة + نم كويس. لا تفتح مصادر جديدة.';
  }else if(prof.testWindow==='3d'){
    note = 'خلال 3 أيام: ركّز على الأضعف + مراجعة سريعة لباقي الأقسام.';
  }else if(prof.testWindow==='7d'){
    note = 'خلال أسبوع: ركّز يومين للأضعف + تدريب يومي مختصر.';
  }else{
    note = 'خلال شهر: تقدر تبني أساس ممتاز مع تدريب ثابت.';
  }

  return {meta:{days, mins, weakest, note}, plan};
}

function buildShareText(res, planMeta){
  const url = location.href.replace(/\/[^/]*$/, '/index.html');
  const name = res.profile.name || 'صديقك';
  const days = planMeta.days;

  return `برنامج مجاني لاختبار تحديد المستوى STEP ✅

${name} جرّبت الاختبار وطلعت لي خطة ${days} يوم.
اللي عجبني: تحليل واضح + جدول مذاكرة + تصحيح فوري.

"وَقُل رَّبِّ زِدْنِي عِلْمًا"

جربه هنا:
${url}`;
}

function renderPlanTable(plan){
  const rows = $('#planRows');
  rows.innerHTML = '';
  for(const day of plan){
    const tasks = day.tasks.map(t=>`• ${t.label} (${t.minutes}د): ${t.hint}`).join('<br>');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>اليوم ${day.day}<div class="small">${day.time}</div></td><td>${tasks}</td><td>${day.total} دقيقة</td>`;
    rows.appendChild(tr);
  }
}

function init(){
  const res = safeJSON(localStorage.getItem(STORAGE.lastResult), null);
  if(!res) return;

  $('#emptyState').style.display='none';
  $('#summaryCard').style.display='block';
  $('#analysis').style.display='block';
  $('#plan').style.display='block';
  $('#share').style.display='block';
  $('#next').style.display='block';

  const prof = res.profile;
  const line = `آخر محاولة: ${new Date(res.takenAt).toLocaleString('ar-SA')}`;
  $('#sumLine').textContent = line;
  $('#greet').textContent = `يا ${prof.name}… شغل نظيف. خلنا نضبط المسار 🔥`;
  $('#pct').textContent = `${res.percent}%`;
  $('#est').textContent = `${res.estimate}/100`;

  const weakest = pickWeakest(res);
  const sum = `أقوى شيء عندك يظهر من الأقسام الأعلى. الأضعف عندك الآن: ${weakest.sec} (${weakest.pct}%).\nخطة اليوم بيوم تحت جاهزة حسب وقتك (${prof.dailyMinutes} دقيقة) وموعدك.`;
  $('#sumText').textContent = sum;

  buildBars(res);

  const planObj = buildPlan(res);
  $('#planMeta').textContent = `مدة الخطة: ${planObj.meta.days} يوم • وقتك اليومي: ${planObj.meta.mins} دقيقة • أضعف قسم: ${planObj.meta.weakest}. ${planObj.meta.note}`;
  renderPlanTable(planObj.plan);

  const share = buildShareText(res, planObj.meta);
  $('#shareText').value = share;

  // Save snippet for bridge page
  const snippet =
`الاسم: ${prof.name}
المرحلة: ${prof.stage}${prof.uniDetail?(' - '+prof.uniDetail):''}${prof.major?(' • '+prof.major):''}
المنطقة: ${prof.region}
موعد الاختبار: ${prof.testWindow}
الوقت اليومي: ${prof.dailyMinutes} دقيقة (${prof.studyTime})
الأضعف: ${planObj.meta.weakest}
النتيجة: ${res.percent}% (تقدير ${res.estimate}/100)

ملاحظة: ${planObj.meta.note}`;
  localStorage.setItem('stepApp_planSnippet_v1', snippet);

  $('#btnPrint').addEventListener('click', ()=>window.print());
  $('#btnCopyPlan').addEventListener('click', async ()=>{
    const text = document.getElementById('plan').innerText;
    const ok = await copy(text);
    toast(ok ? 'تم نسخ الخطة ✅' : 'ما قدرنا ننسخ.');
  });
  $('#btnCopyShare').addEventListener('click', async ()=>{
    const ok = await copy($('#shareText').value);
    toast(ok ? 'تم النسخ ✅' : 'ما قدرنا ننسخ.');
  });
  $('#btnShare').addEventListener('click', async ()=>{
    const text = $('#shareText').value;
    const url = location.href.replace(/\/[^/]*$/, '/index.html');
    if(navigator.share){
      try{
        await navigator.share({title:'برنامج تحديد مستوى STEP 2026', text, url});
        toast('تمت المشاركة ✅');
        return;
      }catch{}
    }
    const ok = await copy(text);
    toast(ok ? 'تم نسخ نص المشاركة ✅' : 'انسخ يدويًا.');
  });
}

document.addEventListener('DOMContentLoaded', init);
