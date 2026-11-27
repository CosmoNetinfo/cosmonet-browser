import { safeWebUrl, searchUrl } from './model.mjs';

const $ = id => document.getElementById(id);
const tabs = new Map();
let active = null;
let profile = {theme:'system',bookmarks:[],history:[]};
let saves = Promise.resolve();
let nativePages=0;
const native = (action, extra = {}) => window.__TAURI__.core.invoke('browser_command', {
  request:{action,label:active ?? '',url:'',data:null,...extra}
});
const report = message => { $('status').textContent = String(message).slice(0,200); };
function bounds() {
  const r=$('content').getBoundingClientRect();
  return {x:Math.max(0,r.x),y:Math.max(0,r.y),width:Math.max(1,r.width),height:Math.max(1,r.height)};
}
function saveProfile() {
  const snapshot=structuredClone(profile);
  saves=saves.catch(()=>{}).then(()=>native('profile_save',{data:snapshot})).catch(()=>report('Impossibile salvare le preferenze sul dispositivo.'));
  return saves;
}
function renderTabs() {
  $('tabs').replaceChildren();
  for (const [label,tab] of tabs) {
    const element=document.createElement('div');
    element.className='tab';element.role='tab';element.tabIndex=0;
    element.setAttribute('aria-selected',String(label===active));
    const title=document.createElement('span');title.className='title';title.textContent=tab.title;
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',`Chiudi ${tab.title}`);
    close.onclick=event=>{event.stopPropagation();closeTab(label).catch(report);};
    element.onclick=()=>activate(label).catch(report);
    element.onkeydown=event=>{if(event.key==='Enter')activate(label).catch(report);};
    element.append(title,close);$('tabs').append(element);
  }
}
function renderNavigation() {
  const tab=tabs.get(active);if(!tab)return;
  if(document.activeElement!==$('address'))$('address').value=tab.url==='home'?'':tab.url;
  $('back').disabled=!tab.back;$('forward').disabled=!tab.forward;
  $('progress').classList.toggle('loading',!!tab.loading);
  $('security').textContent=tab.url.startsWith('https://')?'HTTPS':tab.url.startsWith('http://')?'HTTP · non cifrato':'';
  $('bookmark').textContent=profile.bookmarks.some(b=>b.url===tab.url)?'★':'☆';
}
async function activate(label) {
  if(!tabs.has(label))return;
  await native('bounds',{label,bounds:bounds()});
  await native('activate',{label});
  active=label;renderTabs();renderNavigation();
}
async function createTab(url='home') {
  if(tabs.size>=32)return report('Puoi aprire fino a 32 schede.');
  const label=`tab-${crypto.randomUUID()}`;
  tabs.set(label,{url,title:url==='home'?'Nuova scheda':'Caricamento…',back:false,forward:false,loading:false});renderTabs();
  try {await native('create',{label,url,bounds:bounds()});await activate(label);}
  catch(error){tabs.delete(label);renderTabs();throw error;}
}
async function closeTab(label) {
  await native('close',{label});tabs.delete(label);
  if(label===active){active=null;const next=[...tabs.keys()].at(-1);if(next)await activate(next);else await createTab();}
  renderTabs();
}
async function navigate(input) {
  const value=String(input).trim();if(!value)return;
  const url=value==='home'?'home':safeWebUrl(value)??searchUrl(value,'duckduckgo');
  if(!active)return createTab(url);
  await native('navigate',{url});
}
function event(data) {
  if(data.newTab){const url=safeWebUrl(data.newTab);if(url)createTab(url).catch(report);return;}
  const tab=tabs.get(data.label);if(!tab)return;
  if(typeof data.url==='string'&&data.url){tab.url=/^(tauri:|https?:\/\/tauri\.localhost|https:\/\/home\.cosmo\.local)/.test(data.url)?'home':data.url;}
  if(typeof data.title==='string'&&data.title)tab.title=data.title.slice(0,256);
  for(const key of ['back','forward','loading'])if(typeof data[key]==='boolean')tab[key]=data[key];
  if(data.loading===false&&safeWebUrl(tab.url)){
    profile.history= [{url:tab.url,title:tab.title},...profile.history.filter(item=>item.url!==tab.url)].slice(0,1000);saveProfile();
  }
  if(data.loading===false)nativePages++;
  if(data.loading===false&&tab.url==='home')native('theme',{label:data.label,data:{theme:profile.theme}}).catch(()=>{});
  if(data.label===active){renderNavigation();if(data.error||data.notice)report(data.error??data.notice);else report(tab.loading?'Caricamento…':tab.title);}
  renderTabs();
}
async function openDialog(id) {
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  if(active)await native('hide');
  $(id).showModal();
}
async function showList(kind) {
  $('list-title').textContent=kind==='bookmarks'?'Preferiti':'Cronologia';$('list-items').replaceChildren();
  $('clear-history').hidden=kind!=='history';
  for(const item of profile[kind]){
    const row=document.createElement('div');row.className='list-item';
    const text=document.createElement('span');text.className='item-label';text.textContent=item.title||item.url;
    const small=document.createElement('small');small.textContent=item.url;text.append(small);
    const open=document.createElement('button');open.textContent='Apri';open.onclick=()=>{$('list').close();navigate(item.url).catch(report);};
    row.append(text,open);$('list-items').append(row);
  }
  if(!profile[kind].length)$('list-items').textContent='Nessun elemento salvato.';
  await openDialog('list');
}
async function showVault() {
  const result=await native('vault_list');
  $('vault-items').replaceChildren();
  for(const item of result.entries??[]){
    const row=document.createElement('div');row.className='list-item';
    const text=document.createElement('span');text.className='item-label';text.textContent=item.user;
    const site=document.createElement('small');site.textContent=item.origin;text.append(site);
    const fill=document.createElement('button');fill.textContent='Compila';
    fill.onclick=()=>native('vault_fill',{data:{id:item.id}}).then(()=>{$('vault').close();report('Campi di accesso compilati, se presenti.');}).catch(error=>{$('vault-status').textContent=String(error);});
    const remove=document.createElement('button');remove.textContent='Elimina';
    remove.onclick=()=>{if(confirm('Eliminare questo accesso dal dispositivo?'))native('vault_delete',{data:{id:item.id}}).then(showVault).catch(report);};
    row.append(text,fill,remove);$('vault-items').append(row);
  }
  $('vault-status').textContent='';await openDialog('vault');
}

$('new-tab').onclick=()=>createTab().catch(report);
$('address-form').onsubmit=event=>{event.preventDefault();$('address').blur();navigate($('address').value).catch(report);};
for(const action of ['back','forward','reload'])$(action).onclick=()=>native(action).catch(report);
$('home').onclick=()=>navigate('home').catch(report);
$('menu').onclick=()=>openDialog('tools').catch(report);
$('show-bookmarks').onclick=()=>showList('bookmarks').catch(report);
$('show-history').onclick=()=>showList('history').catch(report);
$('show-vault').onclick=()=>showVault().catch(report);
$('reader').onclick=()=>native('reader').then(()=>$('tools').close()).catch(error=>{report(error);$('tools').close();});
$('devtools').onclick=()=>native('devtools').then(()=>$('tools').close()).catch(report);
$('console').onclick=()=>native('console').then(()=>$('tools').close()).catch(report);
$('bookmark').onclick=()=>{
  const tab=tabs.get(active);if(!tab||!safeWebUrl(tab.url))return;
  if(profile.bookmarks.some(b=>b.url===tab.url))profile.bookmarks=profile.bookmarks.filter(b=>b.url!==tab.url);
  else profile.bookmarks.push({url:tab.url,title:tab.title});
  saveProfile();renderNavigation();
};
$('clear-history').onclick=()=>{if(confirm('Svuotare la cronologia locale?')){profile.history=[];saveProfile();showList('history').catch(report);}};
$('theme').onchange=()=>{profile.theme=$('theme').value;document.documentElement.dataset.theme=profile.theme;saveProfile();if(active)native('theme',{data:{theme:profile.theme}}).catch(()=>{});};
$('vault-form').onsubmit=async event=>{
  event.preventDefault();
  try {await native('vault_save',{data:{user:$('vault-user').value,secret:$('vault-secret').value}});$('vault-form').reset();await showVault();$('vault-status').textContent='Accesso cifrato e salvato sul dispositivo.';}
  catch(error){$('vault-status').textContent=String(error);}
};
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$(button.dataset.close).close();
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('close',()=>{
  if(dialog.id==='vault')$('vault-form').reset();
  setTimeout(()=>{if(active&&!document.querySelector('dialog[open]'))activate(active).catch(report);},0);
});
let resizing=false;
new ResizeObserver(()=>{if(resizing||!active)return;resizing=true;requestAnimationFrame(()=>{native('bounds',{bounds:bounds()}).catch(report);resizing=false;});}).observe($('content'));
window.addEventListener('keydown',event=>{
  if(document.querySelector('dialog[open]'))return;
  if(event.ctrlKey&&event.key.toLowerCase()==='l'){event.preventDefault();$('address').focus();$('address').select();}
  if(event.ctrlKey&&event.key.toLowerCase()==='t'){event.preventDefault();createTab().catch(report);}
  if(event.ctrlKey&&event.key.toLowerCase()==='w'){event.preventDefault();if(active)closeTab(active).catch(report);}
  if(event.key==='F12'){event.preventDefault();native('devtools').catch(report);}
});
window.addEventListener('android-browser-event',e=>event(e.detail));

try {
  if(!window.__TAURI__)throw Error('Avvia questa interfaccia dall’app Cosmo Browser.');
  await window.__TAURI__.event.listen('browser-event',e=>event(e.payload));
  const saved=await native('profile_load');
  profile={theme:['system','light','dark','sand'].includes(saved.theme)?saved.theme:'system',bookmarks:Array.isArray(saved.bookmarks)?saved.bookmarks:[],history:Array.isArray(saved.history)?saved.history:[]};
  document.documentElement.dataset.theme=profile.theme;$('theme').value=profile.theme;
  await createTab();report('Cosmo Browser · pronto');
  if(saved.smoke){
    const first=active;
    const waitLoaded=async()=>{const until=Date.now()+20000;while(nativePages<1&&Date.now()<until)await new Promise(r=>setTimeout(r,100));if(nativePages<1)throw Error('Nessun caricamento nativo osservato');};
    await waitLoaded();await createTab();const second=active;await activate(first);await closeTab(second);
    await native('smoke_finish',{data:{loaded:nativePages,created:2,switched:true,closed:true}});
  }
}catch(error){report(error);}
