const {chromium}=require('C:/Users/NAMI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises');
(async()=>{
 const {createGameServer}=await import('../server.mjs');const server=createGameServer({database:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const p=await browser.newPage({viewport:{width:390,height:844}}),cdp=await p.context().newCDPSession(p);
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:1.5*1024*1024,uploadThroughput:1024*1024});
  let bytes=0,requests=0;cdp.on('Network.dataReceived',e=>bytes+=e.encodedDataLength);p.on('request',()=>requests++);
  const start=Date.now();await p.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'domcontentloaded'});await p.waitForSelector('#loading',{state:'detached',timeout:120000});await p.getByRole('button',{name:'Start',exact:true}).waitFor();
  const result={titleReadyMs:Date.now()-start,receivedBytes:bytes,requests,network:'12 Mbps / 40ms latency / empty cache'};
  await fs.mkdir('qa/performance',{recursive:true});await fs.writeFile(`qa/performance/${process.env.PERF_LABEL||'after'}.json`,JSON.stringify(result,null,2));console.log(result);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})();
