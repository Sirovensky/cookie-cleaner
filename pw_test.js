// Headless test: serve index.html, inject a fake Wallet-Standard wallet whose account is a real Cookie Chain address, exercise UI.
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const OWNER=process.argv[2]||'7hmajuVWXD9iQv8LooaSraSJ6CryJv4WJXKU8gd5H6e';
const srv=http.createServer((q,r)=>{r.end(fs.readFileSync(path.join(__dirname,'index.html')));}).listen(8089);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:1400}});
 const errors=[];p.on('pageerror',e=>errors.push('PAGEERROR '+e.message));p.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text());});
 await p.addInitScript((owner)=>{
   const acct={address:owner,publicKey:new Uint8Array(32),chains:['solana:mainnet'],features:['solana:signAndSendTransaction']};
   window.nightly={solana:{name:'Nightly',features:{
     'standard:connect':{connect:async()=>({accounts:[acct]})},
     'standard:disconnect':{disconnect:async()=>{}},
     'solana:signTransaction':{signTransaction:async()=>{throw new Error('user rejected (fake wallet)');}},'solana:signAndSendTransaction':{signAndSendTransaction:async()=>{throw new Error('should not be used');}}}}};
 },OWNER);
 await p.goto('http://localhost:8089/');await p.waitForTimeout(3000);
 const stats=await p.evaluate(()=>['slot','epoch','tps'].map(i=>document.getElementById(i).textContent));console.log('stats',stats);await p.waitForFunction(()=>!/…/.test(document.getElementById('chainEmpty').textContent),null,{timeout:120000});console.log('chain',await p.textContent('#chainEmpty'),await p.textContent('#chainRent'));
 await p.click('#btnConnect');await p.waitForTimeout(1500);console.log('addr',await p.textContent('#addr'));
 await p.waitForFunction(()=>/token accounts, \d+ empty$/.test(document.getElementById('scanInfo').textContent),null,{timeout:180000});
 console.log('scanInfo',await p.textContent('#scanInfo'),'| bal',await p.textContent('#bal'),'| rent',await p.textContent('#rent'));
 const rows=await p.$$eval('#tbl tbody tr',rs=>rs.slice(0,3).map(r=>r.innerText.replace(/\s+/g,' ')));console.log('rows',rows);
 const hist=await p.$$eval('#hist tbody tr',rs=>rs.length);console.log('history rows',hist);
 await p.screenshot({path:'screenshot.png',fullPage:false});
 const closeDisabled=await p.$eval('#btnClose',b=>b.disabled);console.log('close enabled',!closeDisabled);
 if(!closeDisabled){await p.click('#btnClose');await p.waitForTimeout(8000);const toasts=await p.$$eval('#toasts .toast',t=>t.map(x=>x.innerText));console.log('toasts',toasts);}
 await p.fill('#to','bad-address');await p.fill('#amt','0.001');await p.click('#btnSend');await p.waitForTimeout(800);
 console.log('send-validation toast',await p.$$eval('#toasts .toast',t=>t.map(x=>x.innerText).slice(-1)));
 console.log('errors',errors);await b.close();srv.close();
})().catch(e=>{console.error('TEST FAIL',e);process.exit(1)});
