
/* global window, document */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const STORAGE = {
  settings: 'stepApp_settings_v1',
  quizState: 'stepApp_quizState_v1',
  lastResult: 'stepApp_lastResult_v1',
  supportTickets: 'stepApp_supportTickets_v1'
};

function safeJSONParse(s, fallback=null){
  try{ return JSON.parse(s); }catch{ return fallback; }
}

function loadSettings(){
  const s = safeJSONParse(localStorage.getItem(STORAGE.settings), {}) || {};
  return {
    toastsEnabled: s.toastsEnabled ?? true
  };
}
function saveSettings(s){
  localStorage.setItem(STORAGE.settings, JSON.stringify(s));
}

function showToast(msg, ms=4200){
  const t = $('#toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), ms);
}

function showFloating(msg, ms=5200){
  const box = $('#floatingToast');
  const text = $('#floatingToastText');
  if(!box || !text) return;
  text.textContent = msg;
  box.classList.add('show');
  setTimeout(()=>box.classList.remove('show'), ms);
}

function setupDrawer(){
  const btn = $('#menuBtn');
  const drawer = $('#drawer');
  const overlay = $('#overlay');
  if(!btn || !drawer || !overlay) return;

  const open = ()=>{ drawer.classList.add('open'); overlay.classList.add('show'); };
  const close= ()=>{ drawer.classList.remove('open'); overlay.classList.remove('show'); };

  btn.addEventListener('click', open);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
}

function copyToClipboard(text){
  return navigator.clipboard.writeText(text).then(()=>true).catch(()=>false);
}

function setupShareProgram(){
  const btn = $('#btnShareProgram');
  if(!btn) return;

  btn.addEventListener('click', async ()=>{
    const url = location.href.replace(/\/[^/]*$/, '/index.html');
    const msg =
`برنامج مجاني لاختبار تحديد المستوى (STEP) + خطة مذاكرة يوم بيوم ✅

"وَقُل رَّبِّ زِدْنِي عِلْمًا"

ابدأ هنا:
${url}`;

    if(navigator.share){
      try{
        await navigator.share({title:'اختبار تحديد المستوى STEP 2026', text: msg, url});
        showToast('تمت المشاركة ✅');
        return;
      }catch{}
    }
    const ok = await copyToClipboard(msg);
    showToast(ok ? 'تم نسخ نص المشاركة ✅' : 'ما قدرنا ننسخ، انسخ يدويًا.');
  });
}

function registerSW(){
  if(!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async ()=>{
    try{
      await navigator.serviceWorker.register('./sw.js', {scope:'./'});
    }catch(e){
      // لا نطبع أخطاء للمستخدم
    }
  });
}

function setupInstallPrompt(){
  let deferredPrompt = null;
  const bar = $('#installBar');
  const btnInstall = $('#btnInstall');
  const btnHide = $('#btnHideInstall');

  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    if(bar) bar.classList.remove('hidden');
  });

  if(btnHide){
    btnHide.addEventListener('click', ()=>{
      if(bar) bar.classList.add('hidden');
      showToast('تمام ✅');
    });
  }
  if(btnInstall){
    btnInstall.addEventListener('click', async ()=>{
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      const res = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if(bar) bar.classList.add('hidden');
      if(res && res.outcome === 'accepted') showToast('تم التثبيت ✅');
      else showToast('ما في مشكلة، تقدر تثبته لاحقًا.');
    });
  }
}

const tips = [
  'نصيحة: لا تتعلق بسؤال واحد—علّم للمراجعة وكمّل.',
  'نصيحة: إذا وقتك ضيق ركّز على أضعف قسم عندك أولاً.',
  'نصيحة: 15 دقيقة يوميًا أفضل من 3 ساعات مرة وحدة ثم انقطاع.',
  'نصيحة: في القراءة—اقرأ السؤال أول ثم رجع للنص بسرعة.',
  'نصيحة: في القواعد—ركز على الفكرة: زمن + رابط + ترتيب.',
  'نصيحة: المفردات تتحسن مع تكرار سياق الجملة، مو حفظ قائمة طويلة.',
  'نصيحة: خلك واقعي بالخطة—المهم الاستمرارية.',
  'نصيحة: إذا قرب الاختبار، خفف مصادرّك وخلها مصدر واحد + تدريب.',
  'نصيحة: النوم قبل الاختبار مو “رفاهية”… هذا جزء من الدرجة.',
  'نصيحة: وقت المذاكرة الأفضل هو اللي تقدر تلتزم فيه يوميًا.'
];

function setupToasts(){
  const settings = loadSettings();
  const toggle = $('#toggleToasts');
  if(toggle){
    toggle.checked = settings.toastsEnabled;
    toggle.addEventListener('change', ()=>{
      const s = loadSettings();
      s.toastsEnabled = toggle.checked;
      saveSettings(s);
      showToast(toggle.checked ? 'تم تشغيل الإشعارات ✅' : 'تم إيقاف الإشعارات ✅');
    });
  }

  let i = 0;
  setInterval(()=>{
    const s = loadSettings();
    if(!s.toastsEnabled) return;
    showFloating(tips[i % tips.length]);
    i++;
  }, 45000);
}

function setupChat(){
  const fab = $('#chatFab');
  const box = $('#chatWidget');
  const close = $('#chatClose');
  const body = $('#chatBody');
  const input = $('#chatInput');
  const send = $('#chatSend');
  const typing = $('#typing');

  if(!fab || !box || !close || !body || !input || !send || !typing) return;

  function addBubble(text, who='bot', quickButtons=[]){
    const b = document.createElement('div');
    b.className = `bubble ${who}`;
    b.textContent = text;
    body.appendChild(b);

    if(quickButtons.length){
      const q = document.createElement('div');
      q.className = 'quick';
      quickButtons.forEach(({label, payload})=>{
        const btn = document.createElement('button');
        btn.type='button';
        btn.className='btn small ghost';
        btn.textContent = label;
        btn.addEventListener('click', ()=>{
          input.value = payload;
          handleSend();
        });
        q.appendChild(btn);
      });
      body.appendChild(q);
    }

    body.scrollTop = body.scrollHeight;
  }

  const intents = [
    {
      keys: ['اختبار','ابدأ','quiz','سؤال'],
      reply: () => {
        addBubble('تمام ✅ روح صفحة الاختبار وابدأ. تقدر ترجع لأي سؤال وتعلّمه للمراجعة.', 'bot', [
          {label:'ابدأ الاختبار', payload:'ابدأ الاختبار'},
          {label:'النتائج والخطة', payload:'النتائج'}
        ]);
      }
    },
    {
      keys: ['خطة','جدول','schedule','plan'],
      reply: () => {
        addBubble('الخطة تطلع لك بعد ما تنهي 50 سؤال. بعدها تقدر تنسخ النص أو تحفظه PDF عبر الطباعة.', 'bot', [
          {label:'افتح النتائج', payload:'النتائج'},
          {label:'كيف أحفظ PDF؟', payload:'pdf'}
        ]);
      }
    },
    {
      keys: ['pdf','طباعة','حفظ'],
      reply: () => {
        addBubble('في صفحة النتائج اضغط: طباعة/حفظ PDF → ثم اختر Save as PDF ✅', 'bot');
      }
    },
    {
      keys: ['تثبيت','تطبيق','install','app'],
      reply: () => {
        addBubble('لو ظهر لك شريط “ثبّت البرنامج”، اضغط تثبيت. إذا ما ظهر: من قائمة المتصفح اختر Add to Home Screen.', 'bot');
      }
    },
    {
      keys: ['الدورة','تسجيل','مكثفة','course'],
      reply: () => {
        addBubble('بعد النتائج راح تشوف زر واضح يوديك لموقع الدورة المكثفة (الأكاديمية). الأفضل ترفق ملخص خطتك في التسجيل.', 'bot', [
          {label:'صفحة التسجيل/الشرح', payload:'التسجيل'},
        ]);
      }
    },
    {
      keys: ['التسجيل','bridge'],
      reply: () => {
        addBubble('افتح صفحة “التسجيل بالدورة” هنا داخل البرنامج—تلقى ملخص الخطة جاهز للنسخ.', 'bot');
      }
    },
    {
      keys: ['دعم','مشكلة','خطأ','bug'],
      reply: () => {
        addBubble('لو عندك مشكلة تقنية: افتح صفحة الدعم وسجّلها—بيطلع لك رقم تذكرة تحفظه عندك.', 'bot');
      }
    }
  ];

  function thinkAndReply(msg){
    const m = msg.trim().toLowerCase();
    for(const it of intents){
      if(it.keys.some(k => m.includes(k.toLowerCase()))){
        it.reply();
        return;
      }
    }
    addBubble('وصلت ✅ جرّب تكتب: "اختبار" أو "خطة" أو "PDF" أو "تثبيت".', 'bot', [
      {label:'اختبار', payload:'اختبار'},
      {label:'خطة', payload:'خطة'},
      {label:'PDF', payload:'pdf'}
    ]);
  }

  function handleSend(){
    const msg = input.value.trim();
    if(!msg) return;
    addBubble(msg, 'me');
    input.value='';

    typing.classList.remove('hidden');
    setTimeout(()=>{
      typing.classList.add('hidden');
      thinkAndReply(msg);
    }, 650);
  }

  fab.addEventListener('click', ()=>{
    box.classList.add('open');
    if(body.childElementCount === 0){
      addBubble('هلا 👋 أنا مساعد البرنامج. اكتب اللي تحتاجه، وبأعطيك أقصر طريق.', 'bot', [
        {label:'ابدأ الاختبار', payload:'اختبار'},
        {label:'الخطة', payload:'خطة'},
        {label:'تثبيت', payload:'تثبيت'}
      ]);
    }
  });
  close.addEventListener('click', ()=> box.classList.remove('open'));
  send.addEventListener('click', handleSend);
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') handleSend(); });
}

document.addEventListener('DOMContentLoaded', ()=>{
  setupDrawer();
  setupShareProgram();
  setupToasts();
  setupChat();
  setupInstallPrompt();
  registerSW();
});
