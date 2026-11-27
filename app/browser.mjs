import { safeWebUrl, searchUrl } from './model.mjs';

const $ = id => document.getElementById(id);
const tabs = new Map();
let active = null;
let profile = {theme:'system',bookmarks:[],history:[]};
let saves = Promise.resolve();
let nativePages=0;
let android=false;
let updateBusy=false;
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
  saves=saves.catch(()=>{}).then(()=>native('profile_save',{data:snapshot})).then(()=>true).catch(()=>{report('Impossibile salvare le preferenze sul dispositivo.');return false;});
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
  $('desktop-site').checked=!!tab.desktop;
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
  const desktop=android&&profile.siteMode==='desktop';
  tabs.set(label,{url,title:url==='home'?'Nuova scheda':'Caricamento…',back:false,forward:false,loading:false,desktop});renderTabs();
  try {await native('create',{label,url,bounds:bounds(),data:{desktop}});await activate(label);}
  catch(error){tabs.delete(label);renderTabs();throw error;}
}
async function closeTab(label) {
  await native('close',{label});tabs.delete(label);
  if(label===active){active=null;const next=[...tabs.keys()].at(-1);if(next)await activate(next);else await createTab();}
  renderTabs();
}
async function navigate(input) {
  const value=String(input).trim();if(!value)return;
  const url=value==='home'?'home':safeWebUrl(value)??searchUrl(value,profile.engine);
  if(!active)return createTab(url);
  await native('navigate',{url});
}
function event(data) {
  if(data.newTab){const url=safeWebUrl(data.newTab);if(url)createTab(url).catch(report);return;}
  const tab=tabs.get(data.label);if(!tab)return;
  if(typeof data.url==='string'&&data.url){tab.url=data.url==='about:blank'&&tab.url==='home'?'home':/^(tauri:|https?:\/\/tauri\.localhost|https:\/\/home\.cosmo\.local)/.test(data.url)?'home':data.url;}
  if(typeof data.title==='string'&&data.title)tab.title=data.title.slice(0,256);
  for(const key of ['back','forward','loading','desktop'])if(typeof data[key]==='boolean')tab[key]=data[key];
  if(data.loading===false&&profile.rememberHistory&&tab.url!=='home'&&safeWebUrl(tab.url)){
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
$('show-settings').onclick=()=>openDialog('settings').catch(report);
$('open-update-settings').onclick=()=>openDialog('settings').then(()=>$('check-updates').scrollIntoView({block:'center'})).catch(report);
$('settings-vault').onclick=()=>showVault().catch(report);
$('menu-forward').onclick=()=>native('forward').then(()=>$('tools').close()).catch(report);
$('menu-home').onclick=()=>navigate('home').then(()=>$('tools').close()).catch(report);
$('menu-bookmark').onclick=()=>{$('bookmark').click();$('tools').close();};
$('desktop-site').onchange=async()=>{
  const tab=tabs.get(active);if(!tab)return;
  const desktop=$('desktop-site').checked;
  try{await native('site_mode',{data:{desktop}});tab.desktop=desktop;$('tools').close();renderNavigation();}
  catch(error){$('desktop-site').checked=tab.desktop;report(error);}
};
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
$('theme').onchange=()=>{profile.theme=$('theme').value;document.documentElement.dataset.theme=profile.theme;saveSetting();for(const label of tabs.keys())native('theme',{label,data:{theme:profile.theme}}).catch(()=>{});};
async function saveSetting(){
  $('settings-status').textContent='Salvataggio…';
  const saved=await saveProfile();$('settings-status').textContent=saved?'Preferenze salvate sul dispositivo.':'Salvataggio non riuscito. Riprova.';
  return saved;
}
$('search-engine').onchange=()=>{profile.engine=$('search-engine').value;saveSetting();};
$('site-mode').onchange=()=>{profile.siteMode=$('site-mode').value;saveSetting();};
$('remember-history').onchange=()=>{profile.rememberHistory=$('remember-history').checked;saveSetting();};
$('auto-updates').onchange=()=>{profile.autoUpdates=$('auto-updates').checked;saveSetting();};
function updateButtons(busy){
  updateBusy=busy;
  for(const id of ['check-updates','download-update','install-update'])$(id).disabled=busy;
}
async function checkUpdates(automatic=false){
  if(updateBusy)return;updateButtons(true);
  $('update-status').textContent='Ricerca di nuove release…';
  try{
    const result=await native('update_check');
    $('download-update').hidden=!result.available||result.ready;
    $('install-update').hidden=!result.ready;
    $('download-update').textContent=`Scarica Cosmo Browser ${result.version}`;
    $('update-status').textContent=result.available?`Disponibile Cosmo Browser ${result.version}.`:'Stai usando la versione più recente disponibile per questo dispositivo.';
    if(automatic&&result.available){
      $('update-notice-text').textContent=`È disponibile Cosmo Browser ${result.version}. Puoi scaricarlo dalle Impostazioni.`;
      if(!document.querySelector('dialog[open]'))await openDialog('update-notice');
      else report(`Cosmo Browser ${result.version} disponibile nelle Impostazioni.`);
    }
  }catch(error){$('update-status').textContent=String(error);}
  finally{updateButtons(false);}
}
$('check-updates').onclick=()=>checkUpdates();
$('download-update').onclick=async()=>{
  if(updateBusy)return;updateButtons(true);$('update-status').textContent='Download e verifica dell’aggiornamento…';
  try{const result=await native('update_download');if(!result.ready)throw Error('Verifica del pacchetto non riuscita.');$('download-update').hidden=true;$('install-update').hidden=false;$('update-status').textContent=`Cosmo Browser ${result.version} verificato e pronto da installare.`;}
  catch(error){$('update-status').textContent=String(error);}
  finally{updateButtons(false);}
};
$('install-update').onclick=async()=>{
  if(updateBusy)return;updateButtons(true);
  try{const result=await native('update_install');$('update-status').textContent=result.permissionRequired?'Autorizza Cosmo Browser nelle impostazioni Android, poi torna qui e premi di nuovo Installa.':'Conferma l’aggiornamento nella schermata di sistema.';}
  catch(error){$('update-status').textContent=String(error);}
  finally{updateButtons(false);}
};
$('settings-clear-history').onclick=async()=>{
  if(confirm('Cancellare la cronologia salvata su questo dispositivo?')){profile.history=[];if(await saveSetting())$('settings-status').textContent='Cronologia cancellata. Preferiti e password conservati.';}
};
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
  android=saved.platform==='android';
  profile={theme:['system','light','dark','sand'].includes(saved.theme)?saved.theme:'system',engine:['duckduckgo','google','bing'].includes(saved.engine)?saved.engine:'duckduckgo',siteMode:saved.siteMode==='desktop'?'desktop':'mobile',rememberHistory:saved.rememberHistory!==false,autoUpdates:saved.autoUpdates!==false,bookmarks:Array.isArray(saved.bookmarks)?saved.bookmarks:[],history:Array.isArray(saved.history)?saved.history:[]};
  document.documentElement.dataset.theme=profile.theme;$('theme').value=profile.theme;
  $('search-engine').value=profile.engine;$('site-mode').value=profile.siteMode;$('remember-history').checked=profile.rememberHistory;
  $('desktop-row').hidden=!android;$('default-mode-row').hidden=!android;
  $('app-version').textContent=`Cosmo Browser ${saved.version??'0.3.1'}`;
  $('runtime-info').textContent=android?'Android WebView · modalità mobile predefinita. Mantieni aggiornato il motore WebView dal sistema.':'Microsoft WebView2 · mantieni aggiornato il runtime dal sistema.';
  $('auto-updates').checked=profile.autoUpdates;
  $('install-update').textContent=android?'Installa aggiornamento':'Chiudi Cosmo Browser e avvia installer';
  $('update-help').textContent+=android?' Android richiede la tua conferma e può chiedere l’autorizzazione per installare da Cosmo Browser.':' Su Windows viene avviato l’installer, anche quando stai usando la portable.';
  await createTab();report('Cosmo Browser · pronto');
  if(!saved.smoke&&profile.autoUpdates)setTimeout(()=>checkUpdates(true),2500);
  if(saved.smoke){
    const first=active;
    const waitLoaded=async()=>{const until=Date.now()+20000;while(nativePages<1&&Date.now()<until)await new Promise(r=>setTimeout(r,100));if(nativePages<1)throw Error('Nessun caricamento nativo osservato');};
    const until=async predicate=>{const end=Date.now()+20000;while(!predicate()&&Date.now()<end)await new Promise(r=>setTimeout(r,100));if(!predicate())throw Error('Navigazione nativa non confermata');};
    await waitLoaded();await createTab(saved.smokeUrl||'home');const second=active;
    if(saved.smokeUrl){
      const two=new URL('/two',saved.smokeUrl).href;
      await until(()=>tabs.get(second)?.title==='Cosmo smoke one'&&!tabs.get(second)?.loading);
      await native('navigate',{url:two});
      await until(()=>tabs.get(second)?.url===two&&tabs.get(second)?.back===true&&!tabs.get(second)?.loading);
      await native('back');
      await until(()=>tabs.get(second)?.url===saved.smokeUrl&&tabs.get(second)?.forward===true&&!tabs.get(second)?.loading);
      await native('forward');
      await until(()=>tabs.get(second)?.url===two&&tabs.get(second)?.title==='Cosmo smoke two'&&!tabs.get(second)?.loading);
    }
    await activate(first);await closeTab(second);
    await native('smoke_finish',{data:{loaded:nativePages,created:2,switched:true,closed:true,webNavigation:!!saved.smokeUrl}});
  }
}catch(error){report(error);}
