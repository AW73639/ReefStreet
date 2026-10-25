// ReefStreet server: a simulated ocean stock market. Zero dependencies.
// Run: node server.js   (Node 18 or newer). See README.md for settings and deployment.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os'),{promisify}=require('util');
const scrypt=promisify(crypto.scrypt);

/* ---------- settings (from .env or real environment variables) ---------- */
const ENV={};try{fs.readFileSync(path.join(__dirname,'.env'),'utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m)ENV[m[1]]=m[2].replace(/^["']|["']$/g,'')})}catch(e){}
const cfg=k=>ENV[k]||process.env[k]||'';
const PORT=+cfg('PORT')||3000,HOST=cfg('HOST')||'0.0.0.0',PROXY=cfg('TRUST_PROXY')=='1',ADMIN=cfg('ADMIN_NAME').toLowerCase(),MAXU=+cfg('MAX_USERS')||500;
const DIR=path.resolve(cfg('DATA_DIR')||__dirname);fs.mkdirSync(DIR,{recursive:true});
const START=10000,FEE=.01,TICK=2000,AVS=['🐠','🐬','🦈','🐙','🐢','🦀','🐳','🧜‍♀️'];

/* ---------- the companies. Add your own here! s=ticker n=name e=emoji sec=sector b=base price v=volatility d=drift a=description ---------- */
const UNI=[
{s:'AAPL',n:'Apple',e:'🐠',sea:'Applefin Reef',sec:'Tech',b:230,v:.010,d:.0002,a:'Designs the iPhone, Mac and iPad, and earns a lot from services like the App Store and iCloud.'},
{s:'MSFT',n:'Microsoft',e:'🪼',sea:'Microsoft Jellyfleet',sec:'Tech',b:430,v:.010,d:.0002,a:'Makes Windows, Office and the Azure cloud, and is a big investor in AI.'},
{s:'NVDA',n:'NVIDIA',e:'🦈',sea:'NVIDIA Neon Shark',sec:'Tech',b:140,v:.020,d:.0003,a:'Designs the powerful chips used for video games and for training AI.'},
{s:'TSLA',n:'Tesla',e:'🐡',sea:'Tesla Pufferfish',sec:'Auto',b:250,v:.025,d:.0002,a:'Builds electric cars and batteries. Its price swings a lot, like a puffing pufferfish.'},
{s:'AMZN',n:'Amazon',e:'🦑',sea:'Amazon Squid Market',sec:'Consumer',b:200,v:.014,d:.0002,a:'Runs the online store plus AWS, the cloud service that powers much of the internet.'},
{s:'DIS',n:'Disney',e:'🐬',sea:'Disney Dolphin Show',sec:'Media',b:110,v:.013,d:.0001,a:'Owns theme parks, Pixar, Marvel and Star Wars films, and the Disney+ streaming service.'},
{s:'KO',n:'Coca-Cola',e:'🐟',sea:'Coca-Cola Calm Cove',sec:'Consumer',b:65,v:.007,d:.0002,a:'Sells drinks in over 200 countries. Known as a steady company that pays dividends.'},
{s:'XOM',n:'ExxonMobil',e:'🦀',sea:'Exxon Oil Crab',sec:'Energy',b:115,v:.016,d:.0001,a:'One of the largest oil and gas companies. Its price follows energy prices.'},
{s:'JPM',n:'JPMorgan Chase',e:'🐋',sea:'JPMorgan Whale Bank',sec:'Finance',b:240,v:.010,d:.0002,a:'The largest US bank: everyday banking, loans and investing for companies.'},
{s:'NKE',n:'Nike',e:'🦭',sea:'Nike Sprint Seal',sec:'Consumer',b:80,v:.012,d:.0002,a:'Sells sneakers and sportswear around the world.'}
];
const byS=Object.assign(Object.create(null),Object.fromEntries(UNI.map(u=>[u.s,u]))),SECS=[...new Set(UNI.map(u=>u.sec))];
const PUBLIC_UNI=UNI.map(({s,n,e,sea,sec,a})=>({s,n,e,sea,sec,a}));

/* ---------- market simulation (same prices for everyone) ---------- */
const gs=()=>Math.sqrt(-2*Math.log(Math.random()||1e-9))*Math.cos(6.2832*Math.random());
const MF=path.join(DIR,'market.json'),MKT={base:{},p:{},open:{},day:'',hist:{}};
let EVS=[],NEXT=null,TK=0,lastSummon=0;
try{const m=JSON.parse(fs.readFileSync(MF,'utf8'));Object.assign(MKT,{base:m.base||{},open:m.open||{},day:m.day||''})}catch(e){}
for(const u of UNI){const b=MKT.base[u.s]>0?MKT.base[u.s]:u.b;MKT.base[u.s]=b;MKT.p[u.s]=Math.round(b*100)/100;
 let p=b;const h=[];for(let i=0;i<160;i++){h.unshift(Math.round(p*100)/100);p/=Math.exp(u.v*.7*gs())}MKT.hist[u.s]=h;if(!MKT.open[u.s])MKT.open[u.s]=MKT.p[u.s]}
const hit=(e,s)=>e.sc=='all'||(e.sc=='sec'&&byS[s].sec==e.sec)||(e.sc=='sym'&&e.target==s);
const shape=a=>a<0?0:a<15000?a/15000:a<240000?1-(a-15000)/225000:0;
const ovr=s=>{let t=0;const n=Date.now();for(const e of EVS)if(hit(e,s))t+=.6*e.pct*shape(n-e.t);return t};
function step(){
 const m=gs()*.003,sf={};SECS.forEach(x=>sf[x]=gs()*.004);
 for(const u of UNI){const b=MKT.base[u.s];MKT.base[u.s]=Math.max(1,b*Math.exp(u.d+m+sf[u.sec]+u.v*.7*gs()-Math.log(b/u.b)*.0015));
  const p=Math.round(MKT.base[u.s]*(1+ovr(u.s))*100)/100;MKT.p[u.s]=p;const h=MKT.hist[u.s];h.push(p);if(h.length>400)h.shift()}
 TK++;const d=new Date().toISOString().slice(0,10);if(d!==MKT.day){MKT.day=d;MKT.open={...MKT.p}}}
setInterval(step,TICK);
const saveMkt=()=>{try{fs.writeFileSync(MF,JSON.stringify({base:MKT.base,open:MKT.open,day:MKT.day}),{mode:0o600})}catch(e){}};setInterval(saveMkt,60000);

/* ---------- imagination events: ocean stories with a real-world echo ---------- */
const EV=[
{k:'bad',nm:'The Great Tidal Collapse',tx:'A giant kraken rises from the trench and drags banks and builders under.',echo:'Real-world echo: the 2008 housing and banking crisis.',sc:'all',pct:-.09,mon:'🐙'},
{k:'bad',nm:'The Frozen Serpent',tx:'An icy sea serpent freezes every harbor. Boats stay docked and shops go quiet.',echo:'Real-world echo: the 2020 pandemic lockdowns.',sc:'all',pct:-.08,mon:'🐉'},
{k:'bad',nm:'Whirlpool of Rates',tx:'A whirlpool of rising borrowing costs sucks up the pricey tech reefs.',echo:'Real-world echo: central banks raising interest rates in 2022.',sc:'sec',sec:'Tech',pct:-.07,mon:'🌀'},
{k:'bad',nm:'Shark Fin Report',tx:'A shark circles {n} after a weak harvest report.',echo:'Real-world echo: a company missing its earnings.',sc:'sym',pct:-.08,mon:'🦈'},
{k:'bad',nm:'Pirate Raid on the Banks',tx:'Pirates scare savers away from the harbor banks.',echo:'Real-world echo: the 2023 regional bank scare.',sc:'sec',sec:'Finance',pct:-.06,mon:'🏴‍☠️'},
{k:'bad',nm:'Storm of Tolls',tx:'A storm of new border tolls batters every trading ship.',echo:'Real-world echo: trade wars and tariffs.',sc:'all',pct:-.05,mon:'🌪️'},
{k:'bad',nm:'Rogue Robot Squid',tx:'An imagined robot squid triggers a rush of strict new AI rules.',echo:'Imagined future: AI regulation shocks the tech reefs.',sc:'sec',sec:'Tech',pct:-.06,mon:'🦑'},
{k:'good',nm:"The Mermaid's Blessing",tx:'The mermaid council cuts the cost of borrowing and showers the sea with pearls.',echo:'Real-world echo: interest-rate cuts and stimulus.',sc:'all',pct:.06,mon:'🧜‍♀️'},
{k:'good',nm:'Dolphin Discovery',tx:'Clever dolphins invent a glowing new tool for the tech reefs.',echo:'Real-world echo: a breakthrough like the AI boom.',sc:'sec',sec:'Tech',pct:.08,mon:'🐬'},
{k:'good',nm:'Whale Sighting',tx:'A giant whale of an investor starts buying {n}.',echo:'Real-world echo: a big investor or share buyback.',sc:'sym',pct:.07,mon:'🐋'},
{k:'good',nm:'Treasure Galleon',tx:'A galleon full of treasure is salvaged near {n}.',echo:'Real-world echo: earnings that beat expectations.',sc:'sym',pct:.07,mon:'🚢'},
{k:'good',nm:'Kelp Boom',tx:'Fat, happy shoppers fill the kelp markets.',echo:'Real-world echo: strong consumer spending.',sc:'sec',sec:'Consumer',pct:.06,mon:'🐢'},
{k:'good',nm:'Oil Slick Blockade',tx:'A blockade of the deep-sea lanes makes every drop of fuel precious.',echo:'Real-world echo: an oil supply shock lifting energy companies.',sc:'sec',sec:'Energy',pct:.08,mon:'🦀'}];
function make(kind){
 const pool=EV.filter(e=>!kind||e.k==kind),e={...pool[Math.random()*pool.length|0]};
 if(e.sc=='sym'){e.target=UNI[Math.random()*UNI.length|0].s;e.tx=e.tx.replace('{n}',byS[e.target].n)}
 e.id=Date.now().toString(36)+Math.random().toString(36).slice(2,5);e.dur=240000;return e}
function fire(e){e.t=Date.now();EVS=[...EVS.slice(-11),e];for(const u of UNI)if(hit(e,u.s))MKT.base[u.s]*=1+.4*e.pct}
const plan=ms=>{NEXT=make();NEXT.at=Date.now()+ms};plan(40000);
setInterval(()=>{if(NEXT&&Date.now()>=NEXT.at){fire(NEXT);plan(100000+Math.random()*60000)}},1000);

/* ---------- users, sessions (saved in users.json) ---------- */
const UF=path.join(DIR,'users.json');let U=Object.create(null);try{Object.assign(U,JSON.parse(fs.readFileSync(UF,'utf8')))}catch(e){}
const sha=t=>crypto.createHash('sha256').update(t).digest('hex'),IDX=new Map();
for(const u of Object.values(U))for(const s of u.ses||[])IDX.set(s.h,u);
function flush(){try{const t=UF+'.tmp';fs.writeFileSync(t,JSON.stringify(U),{mode:0o600});fs.renameSync(t,UF)}catch(e){console.error('save failed',e.message)}}
let ft;const saveU=()=>{clearTimeout(ft);ft=setTimeout(flush,500)};
const E=(m,c=400)=>Object.assign(new Error(m),{code:c});
const fresh=()=>({cash:START,q:{},cost:{},vault:0,vaultT:Date.now(),fee:FEE,watch:['AAPL','MSFT','NVDA','TSLA','AMZN','DIS','KO'],log:[],map:0,lh:0,boat:0,trades:0,wins:0,losses:0,best:0,peak:START,chestAt:Date.now()+25000});
const nwOf=s=>s.cash+s.vault+Object.keys(s.q).reduce((t,k)=>t+(s.q[k]||0)*(MKT.p[k]||0),0);
const f=n=>(+n).toLocaleString('en-US',{maximumFractionDigits:n<10?3:2});
const lg=(s,m)=>{s.log.unshift(m);s.log.length=Math.min(s.log.length,8)};
const num=v=>{v=+v;return Number.isFinite(v)&&v>0&&v<=1e9?v:null};
const TIPS=['Diversify: owning many different companies means one bad day cannot sink you.','Time in the market beats timing the market. Patience is a superpower.','Never invest pearls you could not afford to lose.','Fees matter: a 1% fee on every trade quietly eats your gains.','A falling price is not automatically a bargain. Learn what the company does first.','Past performance does not guarantee future results.'];
const SHOP=Object.assign(Object.create(null),{map:300,lh:400,oct:800,adv:120,dinner:60,boat:150});
function advise(s){
 const tot=nwOf(s),held=Object.keys(s.q).map(k=>[k,s.q[k]*MKT.p[k]]).filter(x=>x[1]>1).sort((a,b)=>b[1]-a[1]);
 if(!held.length)return '🐬 You hold no stocks yet. Cash is safe but does not grow. Try starting small.';
 const sh=held[0][1]/tot;
 return `🐬 You hold ${held.length} stock${held.length>1?'s':''}. ${held[0][0]} is ${Math.round(sh*100)}% of your wealth. `+(sh>.4?'That is a lot in one fish. Spreading across several companies protects you if one gets eaten.':held.length<3?'Adding a few different companies and sectors can smooth the waves.':'Nice spread. One monster cannot eat everything.')+` Cash is ${Math.round(s.cash/tot*100)}% of your net worth.`}
function action(u,p,b){
 const s=u.state,now=Date.now();let msg='';
 if(s.vault>0){s.vault*=Math.pow(1.002,Math.min(now-s.vaultT,36e5)/3e4)}s.vaultT=now;
 if(p=='trade'){
  const sym=String(b.s||''),px=MKT.p[sym],amt=num(b.amt);if(!byS[sym])throw E('Unknown company');if(!amt)throw E('Enter an amount of pearls first');
  if(!s.watch.includes(sym)){if(s.watch.length>=20)throw E('Your reef can follow up to 20 stocks');s.watch.push(sym)}
  if(b.side=='buy'){if(amt>s.cash+1e-6)throw E('Not enough pearls in hand');const q=amt*(1-s.fee)/px,old=s.q[sym]||0;s.cost[sym]=((s.cost[sym]||0)*old+px*q)/(old+q);s.q[sym]=old+q;s.cash-=amt;lg(s,`Bought ${f(q)} ${sym} at ${f(px)}`)}
  else if(b.side=='sell'){if(amt>(s.q[sym]||0)*px+1e-6)throw E('You hold less than that');const q=Math.min(s.q[sym]||0,amt/px),pr=(px-s.cost[sym])*q;s.q[sym]-=q;s.cash+=q*px*(1-s.fee);
   if(pr>=0)s.wins++;else s.losses++;s.best=Math.max(s.best,pr);if(s.q[sym]<1e-9){s.q[sym]=0;s.cost[sym]=0}lg(s,`Sold ${f(q)} ${sym} at ${f(px)}`)}
  else throw E('Bad order');
  s.trades++}
 else if(p=='vault'){const amt=num(b.amt);if(!amt)throw E('Enter an amount');
  if(b.dir=='in'){if(amt>s.cash+1e-6)throw E('Not enough pearls');s.cash-=amt;s.vault+=amt;lg(s,'Deposited '+f(amt)+' in the reef vault')}
  else if(b.dir=='out'){if(amt>s.vault+1e-6)throw E('The vault holds less');s.vault-=amt;s.cash+=amt;lg(s,'Withdrew '+f(amt)+' from the reef vault')}else throw E('Bad request')}
 else if(p=='shop'){const id=String(b.id),c=SHOP[id];if(!c)throw E('Unknown item');
  if((id=='oct'&&s.fee<FEE)||(id=='boat'&&s.boat))throw E('You already own that');if(s.cash<c)throw E('Not enough pearls');
  s.cash-=c;lg(s,`Paid ${c} at the harbor shop`);
  if(id=='map')s.map++;if(id=='lh')s.lh=now+20*6e4;if(id=='oct')s.fee=.0025;if(id=='boat')s.boat=1;
  msg=id=='adv'?advise(s):id=='dinner'?'🍤 Fortune cookie: '+TIPS[Math.random()*TIPS.length|0]:'Purchased!'}
 else if(p=='chest'){if(s.chestAt>now)throw E('The chest is not ready yet');
  const hv=Object.keys(s.q).reduce((t,k)=>t+s.q[k]*MKT.p[k],0),v=Math.max(25,Math.round(hv*.0025));s.cash+=v;s.chestAt=now+8e4;lg(s,'Dividend chest: +'+v);
  msg=`🧰 Dividend chest! +${v} pearls. In real life, companies share part of their profits with owners as dividends.`}
 else if(p=='watch'){const sym=String(b.s||'');if(!byS[sym])throw E('Unknown company');
  if(b.on){if(!s.watch.includes(sym)){if(s.watch.length>=20)throw E('Your reef can follow up to 20 stocks');s.watch.push(sym)}}
  else{if((s.q[sym]||0)>0)throw E('Sell your fish first');if(s.watch.length<=1)throw E('Follow at least one stock');s.watch=s.watch.filter(x=>x!=sym)}}
 else if(p=='peek'){if(s.map<1)throw E('Buy a research report first',403);if(!NEXT||NEXT.at-now>6e4)throw E('Nothing to report yet. Check back soon.');
  s.map--;msg=`🗺️ Research report: ${NEXT.nm}. ${NEXT.tx} ${NEXT.echo}`}
 s.peak=Math.max(s.peak,nwOf(s));saveU();return{state:s,nw:nwOf(s),msg}}

/* ---------- http plumbing: limits, cookies, headers ---------- */
const RL=new Map(),LOCK=new Map(),DUMMY=crypto.randomBytes(16);
const limit=(ip,key,max,ms)=>{const k=key+ip,n=Date.now();let b=RL.get(k);if(!b||n>b.r){b={c:0,r:n+ms};RL.set(k,b)}return++b.c<=max};
setInterval(()=>{const n=Date.now();for(const[k,b]of RL)if(n>b.r)RL.delete(k);for(const[k,l]of LOCK)if(l.until<n&&!l.n)LOCK.delete(k)},6e4);
const body=req=>new Promise((ok,no)=>{let b='',n=0;req.on('data',d=>{n+=d.length;if(n>10000){no(E('Request too large',413));req.destroy();return}b+=d});
 req.on('end',()=>{try{const o=b?JSON.parse(b):{};ok(o&&typeof o=='object'?o:{})}catch(e){no(E('Bad JSON'))}});req.on('error',()=>no(E('Bad request')))});
const isSecure=req=>!!req.socket.encrypted||(PROXY&&req.headers['x-forwarded-proto']=='https');
const SEC={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cross-Origin-Opener-Policy':'same-origin','Permissions-Policy':'camera=(),microphone=(),geolocation=()','Cache-Control':'no-store'};
function send(req,res,c,o,extra={}){const h={...SEC,...extra};if(isSecure(req))h['Strict-Transport-Security']='max-age=31536000';
 h['Content-Type']=h['Content-Type']||'application/json';res.writeHead(c,h);res.end(typeof o=='string'?o:JSON.stringify(o))}
function userFrom(req){const m=(req.headers.cookie||'').match(/(?:^|;\s*)reef=([a-f0-9]{64})/);if(!m)return null;const h=sha(m[1]),u=IDX.get(h);if(!u)return null;
 const s=(u.ses||[]).find(x=>x.h==h);if(!s||s.exp<Date.now()){IDX.delete(h);return null}return u}
function login(req,u){const t=crypto.randomBytes(32).toString('hex'),now=Date.now();
 u.ses=(u.ses||[]).filter(s=>s.exp>now).slice(-4);u.ses.push({h:sha(t),exp:now+14*864e5});IDX.set(sha(t),u);saveU();
 return`reef=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${14*86400}${isSecure(req)?'; Secure':''}`}
const hashPw=async(pw,salt)=>(await scrypt(pw,salt,32)).toString('hex');
const priv=u=>({name:u.name,avatar:u.avatar,joined:u.joined,state:u.state,nw:nwOf(u.state),admin:!!ADMIN&&u.name.toLowerCase()==ADMIN});
const INDEX=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');

const server=http.createServer(async(req,res)=>{
 const ip=(PROXY?(req.headers['x-forwarded-for']||'').split(',').pop().trim():'')||req.socket.remoteAddress||'?';
 try{
  const url=new URL(req.url,'http://x'),p=url.pathname,post=req.method=='POST';
  if(req.method!='GET'&&!post)return send(req,res,405,{error:'Method not allowed'});
  if(!limit(ip,'all',900,6e4))return send(req,res,429,{error:'Slow down a little.'});
  if(p=='/healthz')return send(req,res,200,'ok',{'Content-Type':'text/plain'});
  if(p=='/favicon.ico')return send(req,res,204,'');
  if(p=='/'||p=='/index.html'){const n=crypto.randomBytes(16).toString('base64'),csp=`default-src 'none'; script-src 'nonce-${n}'; style-src 'self' 'nonce-${n}' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
   return send(req,res,200,INDEX.replace(/__NONCE__/g,n),{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':csp})}
  if(!p.startsWith('/api/'))return send(req,res,404,{error:'Not found'});
  if(post){
   if(!/^application\/json/i.test(req.headers['content-type']||''))return send(req,res,415,{error:'JSON only'});
   const o=req.headers.origin;if(o){let ok=false;try{ok=new URL(o).host===req.headers.host}catch(e){}if(!ok)return send(req,res,403,{error:'Bad origin'})}}

  /* public, read-only */
  if(p=='/api/universe')return send(req,res,200,PUBLIC_UNI);
  if(p=='/api/pulse')return send(req,res,200,{tk:TK,now:Date.now(),p:MKT.p,open:MKT.open,events:EVS,nextAt:NEXT?NEXT.at:0});
  if(p=='/api/hist'){const s=url.searchParams.get('s');if(!byS[s])return send(req,res,400,{error:'Unknown company'});return send(req,res,200,{c:MKT.hist[s]})}

  /* accounts */
  if(p=='/api/register'||p=='/api/login'){
   if(!post)return send(req,res,405,{error:'Use POST'});
   if(!limit(ip,'auth',12,6e5))return send(req,res,429,{error:'Too many attempts. Wait a few minutes.'});
   const b=await body(req),name=String(b.name||'').trim(),pass=String(b.pass||''),key=name.toLowerCase();
   if(p=='/api/register'){
    if(!limit(ip,'reg',6,36e5))return send(req,res,429,{error:'Too many new accounts from this network. Try later.'});
    if(!/^[A-Za-z0-9_ \-]{2,16}$/.test(name))throw E('Name must be 2 to 16 letters or numbers.');
    if(pass.length<6||pass.length>64)throw E('Passcode must be 6 to 64 characters.');
    if(/^(__proto__|constructor|prototype)$/i.test(name))throw E('Please pick another name.');
    if(U[key])throw E('That name is taken. Try logging in.',409);
    if(Object.keys(U).length>=MAXU)throw E('The reef is full right now.',503);
    const salt=crypto.randomBytes(16),u=U[key]={name,avatar:AVS.includes(b.avatar)?b.avatar:AVS[0],salt:salt.toString('hex'),h:await hashPw(pass,salt),joined:Date.now(),state:fresh(),ses:[]};
    return send(req,res,200,{user:priv(u)},{'Set-Cookie':login(req,u)})}
   const L=LOCK.get(key)||{n:0,until:0};if(L.until>Date.now())return send(req,res,429,{error:'This account is paused for a few minutes after too many wrong tries.'});
   const u=U[key];let ok=false;
   if(u){ok=crypto.timingSafeEqual(Buffer.from(await hashPw(pass,Buffer.from(u.salt,'hex')),'hex'),Buffer.from(u.h,'hex'))}else await scrypt(pass,DUMMY,32);
   if(!ok){L.n++;if(L.n>=5){L.until=Date.now()+3e5;L.n=0}LOCK.set(key,L);return send(req,res,401,{error:'Wrong name or passcode.'})}
   LOCK.delete(key);return send(req,res,200,{user:priv(u)},{'Set-Cookie':login(req,u)})}

  /* everything below needs a logged-in explorer */
  const u=userFrom(req);if(!u)return send(req,res,401,{error:'Please log in.'});
  if(p=='/api/me')return send(req,res,200,{user:priv(u)});
  if(p=='/api/logout'&&post){const m=(req.headers.cookie||'').match(/reef=([a-f0-9]{64})/);if(m){IDX.delete(sha(m[1]));u.ses=(u.ses||[]).filter(s=>s.h!=sha(m[1]));saveU()}
   return send(req,res,200,{ok:1},{'Set-Cookie':'reef=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'})}
  if(p=='/api/board')return send(req,res,200,Object.values(U).map(r=>({name:r.name,avatar:r.avatar,nw:Math.round(nwOf(r.state)*100)/100,trades:r.state.trades,joined:r.joined})).sort((a,b)=>b.nw-a.nw).slice(0,100));
  if(!post)return send(req,res,404,{error:'Not found'});
  const b=await body(req);
  if(p=='/api/reset'){u.state=fresh();saveU();return send(req,res,200,{state:u.state,nw:START,msg:''})}
  if(p=='/api/summon'){if(!ADMIN||u.name.toLowerCase()!=ADMIN)return send(req,res,403,{error:'Only the captain can do that.'});
   if(Date.now()-lastSummon<3e4)throw E('Wait a moment before summoning again.');lastSummon=Date.now();fire(make(b.k=='good'||b.k=='bad'?b.k:undefined));return send(req,res,200,{ok:1})}
  if(['trade','vault','shop','chest','watch','peek'].includes(p.slice(5)))return send(req,res,200,action(u,p.slice(5),b));
  send(req,res,404,{error:'Not found'});
 }catch(e){if(e.code)send(req,res,e.code,{error:e.message});else{console.error(e);try{send(req,res,500,{error:'Something went wrong.'})}catch(_){}}}
});
server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxHeadersCount=50;
server.listen(PORT,HOST,()=>{
 console.log(`\nReefStreet is running on port ${PORT} (simulated ocean market, ${UNI.length} companies, ${Object.keys(U).length} explorers)`);
 console.log(`  This computer:  http://localhost:${PORT}`);
 if(HOST!='127.0.0.1')for(const l of Object.values(os.networkInterfaces()).flat())if(l.family=='IPv4'&&!l.internal)console.log(`  Same Wi-Fi:     http://${l.address}:${PORT}`);
 if(!ADMIN)console.log('  Tip: set ADMIN_NAME in .env to unlock the "Summon event" button for one explorer.')});
for(const sig of['SIGINT','SIGTERM'])process.on(sig,()=>{flush();saveMkt();process.exit(0)});
process.on('unhandledRejection',e=>console.error('unhandled',e));
process.on('uncaughtException',e=>{console.error(e);flush();process.exit(1)});
