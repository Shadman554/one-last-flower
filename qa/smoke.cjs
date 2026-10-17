const {chromium}=require('C:/Users/NAMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,channel:'msedge'});const p=await b.newPage({viewport:{width:450,height:800},deviceScaleFactor:1});await p.goto('http://127.0.0.1:4173');await p.waitForFunction(()=>!document.querySelector('#loading'));await p.screenshot({path:'qa/title.png'});console.log(await p.evaluate(()=>window.gameDebug.assets()));await b.close();})()

