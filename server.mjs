import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {openMeetingStore} from './meeting-store.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const mime={
 '.html':'text/html; charset=utf-8',
 '.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8',
 '.json':'application/json',
 '.png':'image/png',
 '.webp':'image/webp',
 '.mp3':'audio/mpeg',
 '.ttf':'font/ttf',
 '.txt':'text/plain; charset=utf-8'
};
const publicFiles=new Set([
 '/index.html',
 '/game.js',
 '/engine.js',
 '/animation.js',
 '/asset-loader.js',
 '/story.js',
 '/style.css',
 '/admin.html',
 '/admin.css',
 '/admin.js'
]);

export function createGameServer({database=process.env.GAME_DB_PATH||path.join(root,'data','meeting-dates.sqlite')}={}){
 const store=openMeetingStore(database);
 const server=http.createServer(async(req,res)=>{
  const json=(status,value)=>{
   res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(JSON.stringify(value));
  };
  try{
   const url=new URL(req.url,'http://localhost');
   const pathname=decodeURIComponent(url.pathname);
   const reqHost=req.headers['x-forwarded-host']||req.headers.host;
   const adminKey=process.env.ADMIN_KEY||'love';
   const isAuthorizedAdmin=()=>{
    const headerKey=req.headers['x-admin-key'];
    const queryKey=url.searchParams.get('key');
    return (headerKey===adminKey)||(queryKey===adminKey);
   };

   // Health check for Docker, cloud platforms, and load balancers
   if(pathname==='/api/health'||pathname==='/health'){
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    json(200,{status:'ok',uptime:Math.round(process.uptime()),timestamp:new Date().toISOString()});
    return;
   }

   // Confirmed meeting date endpoint (strict for test compatibility and idempotency)
   if(pathname==='/api/meeting-date'){
    if(req.method!=='POST'){json(405,{error:'Use explicit confirmation to save a date.'});return;}
    if(req.headers.origin){
     const originHost=new URL(req.headers.origin).host;
     if(originHost!==req.headers.host&&originHost!==reqHost){json(403,{error:'Origin not allowed.'});return;}
    }
    if(req.headers['content-type']?.split(';')[0]!=='application/json'){json(415,{error:'JSON required.'});return;}
    let body='',bytes=0;
    for await(const chunk of req){
     bytes+=chunk.length;
     if(bytes>2048){json(413,{error:'Request too large.'});return;}
     body+=chunk;
    }
    let parsed;
    try{parsed=JSON.parse(body);}catch{json(400,{error:'Invalid JSON.'});return;}
    const result=store.confirm(parsed),{status,...response}=result;
    json(status,response);
    return;
   }

   // Player data persistence endpoint
   if(pathname==='/api/player-data'){
    if(req.method==='POST'){
     if(req.headers.origin){
      const originHost=new URL(req.headers.origin).host;
      if(originHost!==req.headers.host&&originHost!==reqHost){json(403,{error:'Origin not allowed.'});return;}
     }
     if(req.headers['content-type']?.split(';')[0]!=='application/json'){json(415,{error:'JSON required.'});return;}
     let body='',bytes=0;
     for await(const chunk of req){
      bytes+=chunk.length;
      if(bytes>8192){json(413,{error:'Request too large.'});return;}
      body+=chunk;
     }
     let parsed;
     try{parsed=JSON.parse(body);}catch{json(400,{error:'Invalid JSON.'});return;}
     const result=store.savePlayerData(parsed),{status,...response}=result;
     json(status,response);
     return;
    }
    if(req.method==='GET'){
     if(!isAuthorizedAdmin()){json(401,{error:'Admin authorization required.'});return;}
     const sessionId=url.searchParams.get('sessionId');
     json(200,{players:store.getPlayerData(sessionId),meetings:store.getMeetingDates()});
     return;
    }
    if(req.method==='DELETE'){
     if(!isAuthorizedAdmin()){json(401,{error:'Admin authorization required.'});return;}
     const sessionId=url.searchParams.get('sessionId');
     if(!sessionId){json(400,{error:'Session ID required.'});return;}
     const result=store.deletePlayerData(sessionId),{status,...response}=result;
     json(status,response);
     return;
    }
    res.writeHead(405);res.end();return;
   }

   // Admin statistics endpoint
   if(pathname==='/api/player-stats'){
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    if(!isAuthorizedAdmin()){json(401,{error:'Admin authorization required.'});return;}
    json(200,store.getStats());
    return;
   }

   // Admin meeting dates endpoint
   if(pathname==='/api/meeting-dates'){
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    if(!isAuthorizedAdmin()){json(401,{error:'Admin authorization required.'});return;}
    json(200,{dates:store.getMeetingDates()});
    return;
   }

   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}

   let publicPath=pathname==='/'?'/index.html':(pathname==='/admin'?'/admin.html':pathname);
   const file=path.resolve(root,'.'+publicPath),assetRoot=path.join(root,'assets')+path.sep;

   // Private database, source sheets, QA files, and server code are never served.
   if(!publicFiles.has(publicPath)&&!(publicPath.startsWith('/assets/')&&file.startsWith(assetRoot)&&mime[path.extname(file)])){
    res.writeHead(404);
    res.end('Not found');
    return;
   }

   const data=await readFile(file);
   const isAsset=publicPath.startsWith('/assets/');
   const headers={
    'Content-Type':mime[path.extname(file)]||'application/octet-stream',
    'Cache-Control':isAsset?'public, max-age=86400':'no-cache',
    'X-Content-Type-Options':'nosniff',
    'Content-Length':data.length
   };

   if(path.extname(file)==='.mp3'){
    headers['Accept-Ranges']='bytes';
    if(req.headers.range&&req.method==='GET'){
     const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
     let start=range?.[1]?Number(range[1]):Math.max(0,data.length-Number(range?.[2]));
     let end=range?.[1]?(range[2]?Math.min(Number(range[2]),data.length-1):data.length-1):data.length-1;
     if(!range||(!range[1]&&!range[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=data.length){
      res.writeHead(416,{'Content-Range':`bytes */${data.length}`});
      res.end();
      return;
     }
     res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});
     res.end(data.subarray(start,end+1));
     return;
    }
   }

   res.writeHead(200,headers);
   res.end(req.method==='HEAD'?undefined:data);
  }catch(error){
   if(!res.headersSent){
    res.writeHead(error.code==='ENOENT'?404:500);
    res.end('The request could not be completed.');
   }else res.end();
  }
 });
 server.on('close',()=>store.close());
 return server;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const port=Number(process.env.PORT)||4173;
 const host=process.env.HOST||'0.0.0.0';
 const server=createGameServer();
 server.listen(port,host,()=>{
  console.log(`🌸 One Last Flower running at: http://${host==='0.0.0.0'?'localhost':host}:${port}`);
  console.log(`🌸 Admin Dashboard at: http://${host==='0.0.0.0'?'localhost':host}:${port}/admin`);
 });
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
