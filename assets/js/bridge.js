
/* global window, document, localStorage */
const $ = (s)=>document.querySelector(s);

function toast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3200);
}
async function copy(text){
  try{ await navigator.clipboard.writeText(text); return true; }catch{ return false; }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const snippet = localStorage.getItem('stepApp_planSnippet_v1') || '';
  const ta = $('#snippet');
  ta.value = snippet;

  $('#btnCopy').addEventListener('click', async ()=>{
    const ok = await copy(ta.value);
    toast(ok ? 'تم النسخ ✅' : 'ما قدرنا ننسخ.');
  });
});
