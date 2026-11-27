const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {strict:assert}=require('node:assert');
const binary=path.resolve(process.argv[2]??'src-tauri/target/release/cosmo-browser.exe');
const capture=process.argv.includes('--capture');
const theme=process.argv.includes('--dark')?'dark':'light';
const report=path.resolve('.work/native-smoke.json');
fs.mkdirSync(path.dirname(report),{recursive:true});
if(fs.existsSync(report))fs.unlinkSync(report);
const child=spawn(binary,['--smoke-test'],{windowsHide:true,stdio:'pipe',env:{...process.env,COSMO_SMOKE_REPORT:report,COSMO_SMOKE_CAPTURE:capture?'1':'0',COSMO_SMOKE_THEME:theme,WEBVIEW2_USER_DATA_FOLDER:path.resolve('.work/smoke-webview2')}});
let polling;
if(capture)polling=setInterval(()=>{
 if(!fs.existsSync(report))return;
 clearInterval(polling);
 setTimeout(()=>{
  const result=require('node:child_process').spawnSync('py',['tools/capture-native-window.py',String(child.pid),`docs/screenshots/windows-${theme}.png`],{encoding:'utf8'});
  if(result.status!==0){console.error(result.stderr||'Window capture failed');child.kill();process.exitCode=1;}
  else console.log(result.stdout.trim());
 },1200);
},200);
let output='';
child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
const timer=setTimeout(()=>{child.kill();console.error('Native browser smoke test timed out.');process.exitCode=1;},90000);
child.on('error',error=>{clearTimeout(timer);console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{
 clearTimeout(timer);
 if(polling)clearInterval(polling);
 try {
  assert.equal(code,0,output.slice(-2000));
  const result=JSON.parse(fs.readFileSync(report,'utf8'));
  assert.equal(result.ok,true);assert.equal(result.openTabs,1);
  assert.ok(result.nativePages.loaded>=1);assert.equal(result.nativePages.created,2);
  assert.equal(result.nativePages.switched,true);assert.equal(result.nativePages.closed,true);
  console.log('PASS: native WebView content loaded, two integrated tabs created, switched and closed through the Rust bridge.');
 } catch(error){console.error(error.message);process.exitCode=1;}
});
