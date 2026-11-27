const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {spawn,spawnSync}=require('node:child_process');
const {strict:assert}=require('node:assert');

async function main(){
 const binary=path.resolve(process.argv[2]??'src-tauri/target/release/cosmo-browser.exe');
 const capture=process.argv.includes('--capture');
 const theme=process.argv.includes('--dark')?'dark':'light';
 const report=path.resolve('.work/native-smoke.json');
 fs.mkdirSync(path.dirname(report),{recursive:true});
 if(fs.existsSync(report))fs.unlinkSync(report);
 const server=http.createServer((request,response)=>{
  const page=request.url==='/two'?'two':'one';
  response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'none'"});
  response.end(`<!doctype html><title>Cosmo smoke ${page}</title><h1>Native navigation ${page}</h1><a href="/two">Second page</a>`);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const url=`http://127.0.0.1:${server.address().port}/one`;
 const child=spawn(binary,['--smoke-test'],{windowsHide:true,stdio:'pipe',env:{...process.env,
  COSMO_SMOKE_REPORT:report,COSMO_SMOKE_CAPTURE:capture?'1':'0',COSMO_SMOKE_THEME:theme,
  COSMO_SMOKE_URL:capture?'':url,WEBVIEW2_USER_DATA_FOLDER:path.resolve('.work/smoke-webview2')
 }});
 let output='',polling;
 child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
 if(capture)polling=setInterval(()=>{
  if(!fs.existsSync(report))return;
  clearInterval(polling);
  setTimeout(()=>{
   const result=spawnSync('py',['tools/capture-native-window.py',String(child.pid),`docs/screenshots/windows-${theme}.png`],{encoding:'utf8'});
   if(result.status!==0){console.error(result.stderr||'Window capture failed');child.kill();process.exitCode=1;}
   else console.log(result.stdout.trim());
  },1200);
 },200);
 const timer=setTimeout(()=>{child.kill();console.error('Native browser smoke test timed out.');process.exitCode=1;},90000);
 child.on('error',error=>{clearTimeout(timer);if(polling)clearInterval(polling);server.close();console.error(error.message);process.exitCode=1;});
 child.on('exit',code=>{
  clearTimeout(timer);if(polling)clearInterval(polling);server.close();
  try {
   assert.equal(code,0,output.slice(-2000));
   const result=JSON.parse(fs.readFileSync(report,'utf8'));
   assert.equal(result.ok,true);assert.equal(result.openTabs,1);
   assert.ok(result.nativePages.loaded>=1);assert.equal(result.nativePages.created,2);
   assert.equal(result.nativePages.switched,true);assert.equal(result.nativePages.closed,true);
   assert.equal(result.nativePages.panels,true);
   if(!capture)assert.equal(result.nativePages.webNavigation,true);
   console.log(capture?'PASS: native tab lifecycle and owned-window capture.':'PASS: real HTTP navigation, URL sync, native back/forward and integrated tab lifecycle.');
  }catch(error){console.error(error.message);process.exitCode=1;}
 });
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
