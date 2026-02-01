
/* global window, document, localStorage */
const STORAGE = {
  supportTickets: 'stepApp_supportTickets_v1'
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
function loadTickets(){
  return safeJSON(localStorage.getItem(STORAGE.supportTickets), []) || [];
}
function saveTickets(t){
  localStorage.setItem(STORAGE.supportTickets, JSON.stringify(t));
}
function renderTickets(){
  const tbody = $('#tickets');
  const t = loadTickets().slice(-12).reverse();
  tbody.innerHTML = '';
  for(const item of t){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date(item.at).toLocaleString('ar-SA')}</td><td>${item.type}</td><td><b>${item.id}</b></td>`;
    tbody.appendChild(tr);
  }
}
function makeId(){
  const r = Math.floor(Math.random()*900000)+100000;
  return `ST-${r}`;
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderTickets();

  $('#btnSend').addEventListener('click', ()=>{
    const type = $('#type').value;
    const msg = $('#message').value.trim();
    if(!type || !msg){
      toast('كمّل البيانات المطلوبة.');
      return;
    }
    const id = makeId();
    const ticket = {id, type, email: $('#email').value.trim()||null, message: msg, at: new Date().toISOString()};
    const list = loadTickets();
    list.push(ticket);
    saveTickets(list);

    $('#ticket').textContent = id;
    $('#sentBox').classList.remove('hidden');
    toast('تم الإرسال ✅ (محلي)');
    $('#message').value='';
    renderTickets();
  });
});
