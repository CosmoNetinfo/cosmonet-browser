// Browser UI integration tests. The native bridge is simulated; this is not an Android runtime test.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
(async()=>{
 const root=path.resolve('app');
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  const types={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.png':'image/png'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.COSMO_TEST_BROWSER?{executablePath:process.env.COSMO_TEST_BROWSER}:{})});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
   window.testCommands=[];
   window.testVisibleTabs=[];
   window.testOverlayOpen=false;
   window.testActiveTab=null;
   const defaults={theme:'system',engine:'duckduckgo',siteMode:'mobile',rememberHistory:true,autoUpdates:false,bookmarks:[],history:[{url:'https://example.com/',title:'Existing'}]};
   window.__TAURI__={event:{listen:async()=>{}},core:{invoke:async(_, {request:r})=>{
    window.testCommands.push(r);
    if(r.action==='activate'){window.testActiveTab=r.label;window.testVisibleTabs=testOverlayOpen?[]:[r.label];}
    if(r.action==='overlay'){
     window.testOverlayOpen=r.data.open;
     window.testVisibleTabs=r.data.open?[]:(testActiveTab?[testActiveTab]:[]);
     await new Promise(resolve=>setTimeout(resolve,100));
    }
    if(r.action==='hide'){
     window.testVisibleTabs=[];
     // The native view hides before its delayed IPC acknowledgement arrives.
     await new Promise(resolve=>setTimeout(resolve,100));
    }
    if(r.action==='profile_load')return {...defaults,...JSON.parse(localStorage.getItem('testProfile')||'{}'),platform:'android',version:'0.3.1'};
    if(r.action==='profile_save'){localStorage.setItem('testProfile',JSON.stringify(r.data));return r.data;}
    if(r.action==='vault_list')return {entries:[]};
    if(r.action==='update_check')return {available:true,version:'0.3.2',ready:false};
    if(r.action==='update_download')return {ready:true,version:'0.3.2'};
    if(r.action==='update_install')return {permissionRequired:true};
    return {};
   }}};
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/index.html');
  await page.waitForFunction(()=>window.testCommands?.some(c=>c.action==='activate'));
  assert.equal(await page.evaluate(()=>testCommands.find(c=>c.action==='create').data.desktop),false);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('android-browser-event',{detail:{label:testCommands.find(c=>c.action==='create').label,url:'about:blank',loading:false}})));
  assert.equal(await page.locator('#address').inputValue(),'');
  for(const width of [360,390,600,768,1280]){
   await page.setViewportSize({width,height:844});
   await page.locator('#menu').click();await page.locator('#show-settings').click();
   await page.locator('#settings').waitFor({state:'visible'});
   await page.waitForTimeout(120);
   assert.deepEqual(await page.evaluate(()=>testVisibleTabs),[],'A delayed native reply must not restore a tab over Settings');
   if(width===390){
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('android-browser-event',{detail:{newTab:'https://example.net/'}})));
    await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(()=>testVisibleTabs),[],'A new tab must remain hidden while Settings is open');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const box=await page.locator('#settings').boundingBox();assert.ok(box.width<=width+1);
   if(width<=600){assert.equal(Math.round(box.width),width);assert.ok((await page.locator('#menu').boundingBox()).height>=44);}
   await page.locator('[data-close=settings]').click();
   await page.waitForFunction(()=>testVisibleTabs.length===1);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#menu').click();await page.locator('#show-settings').click();
  await page.locator('#theme').selectOption('dark');
  await page.locator('#search-engine').selectOption('google');
  await page.locator('#site-mode').selectOption('desktop');
  await page.locator('#remember-history').uncheck();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('testProfile')||'{}').rememberHistory===false);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('testProfile')).history.length),1);
  fs.mkdirSync('test-results',{recursive:true});
  await page.locator('#settings').screenshot({path:'test-results/browser-settings-mobile.png'});
  await page.reload();
  await page.waitForFunction(()=>window.testCommands?.some(c=>c.action==='activate'));
  assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
  assert.equal(await page.evaluate(()=>testCommands.find(c=>c.action==='create').data.desktop),true);
  await page.locator('#menu').click();await page.locator('#desktop-site').uncheck();
  await page.waitForFunction(()=>testCommands.some(c=>c.action==='site_mode'&&c.data.desktop===false));
  const label=await page.evaluate(()=>testCommands.find(c=>c.action==='create').label);
  await page.evaluate(label=>window.dispatchEvent(new CustomEvent('android-browser-event',{detail:{label,url:'https://example.org/',loading:false,title:'No new history'}})),label);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('testProfile')).history.length),1);
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('#menu').click();await page.locator('#show-settings').click();
  await page.locator('#settings-clear-history').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('testProfile')).history.length===0);
  await page.locator('#settings-vault').click();await page.locator('#vault').waitFor({state:'visible'});
  assert.deepEqual(await page.evaluate(()=>testVisibleTabs),[],'Switching Settings to Passwords must not reveal content');
  await page.locator('[data-close=vault]').click();
  await page.locator('#menu').click();await page.locator('#show-settings').click();
  await page.locator('#check-updates').click();
  await page.locator('#download-update').waitFor({state:'visible'});
  await page.locator('#download-update').click();
  await page.locator('#install-update').waitFor({state:'visible'});
  await page.locator('#install-update').click();
  await page.waitForFunction(()=>document.getElementById('update-status').textContent.includes('Autorizza'));
  await page.locator('#auto-updates').check();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('testProfile')).autoUpdates===true);
  await page.reload();await page.locator('#update-notice').waitFor({state:'visible'});
  await page.locator('#open-update-settings').click();await page.locator('#settings').waitFor({state:'visible'});
  assert.deepEqual(await page.evaluate(()=>testVisibleTabs),[],'Switching update notice to Settings must not reveal content');
  await page.goto(origin+'/home.html');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.ok((await page.locator('input').boundingBox()).height>=44);
  await page.screenshot({path:'test-results/browser-home-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: 360–1280px layouts, settings persistence, mobile/desktop mode, home URL, history controls, passwords and update check/download/install/permission/startup flows (simulated native bridge).');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
