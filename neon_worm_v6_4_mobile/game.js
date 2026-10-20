(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('arena');
if (!canvas || !canvas.getContext) { document.body.innerHTML = '<p style="padding:30px;color:white">Open this game in Chrome or Edge.</p>'; return; }
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

// Neon Worm v6.2: visual polish only; self-collision remains disabled.
const TARGETS = [1000, 1700, 3000];
function currentTarget(){ return TARGETS[Math.min(targetStage, TARGETS.length - 1)]; }
const SEGMENT_SPACING = 5.8;
const BOT_COUNT = 30;
const FOOD_CELL = 110;
const SPARK_CELL = 260;
const PALETTES = [
  {name:'rainbow', colors:['#ff5ec9','#ffad45','#fff16b','#4ffff0','#6c8dff','#be6bff','#ff5ec9'], glow:'#54f9ff', rainbow:true},
  {name:'lime', colors:['#dfff82','#91ff55','#46ffa1','#e9ffbe'], glow:'#73ff67'},
  {name:'gold', colors:['#fff2a2','#ffc72e','#ff8d2b','#fff2a2'], glow:'#ffbf39'},
  {name:'ice', colors:['#ffffff','#7cf8ff','#54aaff','#f2ffff'], glow:'#63efff'},
  {name:'violet', colors:['#f1adff','#ac67ff','#686bff','#f1adff'], glow:'#be6cff'},
  {name:'rose', colors:['#ffe1ed','#ff5c9a','#ff8e66','#ffe1ed'], glow:'#ff649d'},
  {name:'toxic', colors:['#edff63','#67ff36','#19d5a0','#b9ff6a'], glow:'#73ff49'},
  {name:'white', colors:['#ffffff','#dce9f4','#92b8cf','#ffffff'], glow:'#d9f9ff'},
  {name:'cyan', colors:['#eaffff','#42f8e6','#248cff','#c4ffff'], glow:'#3efff0'},
  {name:'fire', colors:['#fff5a2','#ffcd35','#ff602e','#ffb83f'], glow:'#ff832f'}
];
const BOT_NAMES = ['Marico','Royale','Frosty','NeonKid','Viper','Pixel','Luna','Ghost','NOVA','BLAZE','Minty','Echo','RUSH','Jelly','Comet','ZAP','Sonic','MATRIX','Rex','WAVE','Sunny','KRAKEN','Panda','Flare','Byte','Kira','Turbo','Mochi','Volt','Noodle','Skittles','Chili','Cosmo','Bubbles','Glitch','Sparky'];
let W=innerWidth,H=innerHeight,dpr=1,WORLD_W=14000,WORLD_H=9000;
let state='menu',player=null,bots=[],food=[],foodBuckets=new Map(),sparks=[],sparkBuckets=new Map(),particles=[];
let cash=100,best=0,collected=0,escapeLeft=15,exitY=null,targetStage=0,targetWindowUsed=false;
let camera={x:0,y:0},mouse={x:innerWidth*.7,y:innerHeight*.5},keys=new Set();
let bgTile=null,bgPattern=null,lastFrame=0,lastRender=0,lastFoodSpawn=0,lastBoostCost=0,lastBoostDrop=0,collisionTick=0,uiTick=0;
let soundMuted=false,spawnShieldUntil=0;
function storeGet(k,f){try{const x=localStorage.getItem(k);return x===null?f:x}catch(_){return f}}
function storeSet(k,v){try{localStorage.setItem(k,String(v))}catch(_){}}
function storeRemove(k){try{localStorage.removeItem(k)}catch(_){}}
best=Number(storeGet('neonWormBestRublesV1','0')) || 0;
function rand(a,b){return a+Math.random()*(b-a)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function money(n){return Math.max(0,Math.floor(n)).toLocaleString('ru-RU')+' ₽'}
function toast(message){const e=$('toast');if(!e)return;e.textContent=message;e.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('show'),2100)}
function roundedRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function makeRoundedHex(c,cx,cy,r){
  const pts=[];for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;pts.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r})}
  const cut=.18, first={x:pts[0].x+(pts[5].x-pts[0].x)*cut,y:pts[0].y+(pts[5].y-pts[0].y)*cut};
  c.beginPath();c.moveTo(first.x,first.y);
  for(let i=0;i<6;i++){const p=pts[i],n=pts[(i+1)%6],q={x:p.x+(n.x-p.x)*cut,y:p.y+(n.y-p.y)*cut};c.lineTo(p.x+(pts[(i+5)%6].x-p.x)*cut,p.y+(pts[(i+5)%6].y-p.y)*cut);c.quadraticCurveTo(p.x,p.y,q.x,q.y)}c.closePath();
}
function createBackgroundPattern(){
  const tile=document.createElement('canvas');tile.width=336;tile.height=300;const b=tile.getContext('2d');
  b.fillStyle='#030710';b.fillRect(0,0,tile.width,tile.height);
  // Large, soft-edged navy hex tiles matching the texture in the video.
  for(let row=-1;row<7;row++)for(let col=-1;col<8;col++){
    const x=col*56+(row%2?28:0)+28,y=row*50+25,r=25;
    const g=b.createLinearGradient(x-r*.8,y-r,x+r*.8,y+r);g.addColorStop(0,'#17233b');g.addColorStop(.34,'#111d34');g.addColorStop(.72,'#0d182d');g.addColorStop(1,'#091326');
    makeRoundedHex(b,x,y,r);b.fillStyle=g;b.fill();b.lineWidth=3.1;b.strokeStyle='#050b17';b.stroke();
    b.save();b.globalAlpha=.16;b.lineWidth=1.2;b.strokeStyle='#2b3b59';makeRoundedHex(b,x,y,r-3.2);b.stroke();b.restore();
    b.save();b.globalAlpha=.09;b.fillStyle='#526688';b.beginPath();b.ellipse(x-6,y-7,r*.31,r*.14,-.4,0,Math.PI*2);b.fill();b.restore();
  }
  bgTile=tile;bgPattern=ctx.createPattern(tile,'repeat');
}
function resize(){
  W=Math.max(320,innerWidth);H=Math.max(320,innerHeight);
  WORLD_W=Math.max(14000,Math.round(W*7.2));WORLD_H=Math.max(9000,Math.round(H*7.0));
  dpr=Math.min(window.devicePixelRatio||1,1.2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
  createBackgroundPattern();
  if(player){player.x=clamp(player.x,100,WORLD_W-100);player.y=clamp(player.y,100,WORLD_H-100);updateCamera(1)}
  if(!mouse.x){mouse.x=W*.7;mouse.y=H*.5}
}
addEventListener('resize',resize);resize();
function bucketKey(x,y,size){return Math.floor(x/size)+','+Math.floor(y/size)}
function addToBuckets(map,key,obj){if(!map.has(key))map.set(key,[]);map.get(key).push(obj)}
// Balance has a deliberately strong visual effect: noticeably wider and longer at higher dollar values.
function wormRadius(w){return clamp(8.8+Math.pow(Math.max(0,w.worth)/850,.52)*5.1,10.5,34)}
function lengthFor(worth){return Math.round(clamp(68+Math.sqrt(Math.max(0,worth))*2.35,90,480))}
function setDimensions(w,instant=false){w.lengthTarget=lengthFor(w.worth);w.radius=wormRadius(w);if(instant){while(w.body.length<w.lengthTarget){const t=w.body[w.body.length-1],p=w.body[w.body.length-2]||{x:t.x-Math.cos(w.angle)*SEGMENT_SPACING,y:t.y-Math.sin(w.angle)*SEGMENT_SPACING};const dx=t.x-p.x,dy=t.y-p.y,d=Math.hypot(dx,dy)||1;w.body.push({x:t.x+dx/d*SEGMENT_SPACING,y:t.y+dy/d*SEGMENT_SPACING})}w.body.length=w.lengthTarget}}
function makeWorm(x,y,palette,name,isPlayer=false,worth){
  const a=isPlayer?-Math.PI/2:rand(0,Math.PI*2),v=worth===undefined?(isPlayer?cash:Math.floor(rand(180,1400))):worth;
  const tmp={x,y,angle:a,color:palette.colors[0],palette,name,isPlayer,worth:v,baseSpeed:isPlayer?160:rand(112,145),speed:isPlayer?160:125,length:0,lengthTarget:0,radius:5,body:[],style:rand(0,10),skill:rand(.48,.94),homeX:x,homeY:y,targetX:x+rand(-900,900),targetY:y+rand(-700,700),nextDecision:performance.now()+rand(250,1800),nextAvoid:0,avoidAngle:null,boostUntil:0,boosting:false,lastBoostCost:0,lastBoostDrop:0,deadTimer:0,lastHeadBump:0};
  tmp.body=[];const len=lengthFor(v);for(let i=0;i<len;i++)tmp.body.push({x:x-Math.cos(a)*i*SEGMENT_SPACING,y:y-Math.sin(a)*i*SEGMENT_SPACING});tmp.length=len;tmp.lengthTarget=len;tmp.radius=wormRadius(tmp);return tmp;
}
function rebuildFoodBuckets(){foodBuckets=new Map();for(const f of food)addToBuckets(foodBuckets,bucketKey(f.x,f.y,FOOD_CELL),f)}
function spawnFood(x,y,value,opts={}){
  if(food.length>4800)return null;
  const f={x:x===undefined?rand(80,WORLD_W-80):x,y:y===undefined?rand(80,WORLD_H-80):y,r:opts.r||rand(3.8,5.1),value:value===undefined?Math.round(rand(6,12)):Math.max(3,Math.round(value)),phase:rand(0,Math.PI*2),loot:!!opts.loot};
  food.push(f);addToBuckets(foodBuckets,bucketKey(f.x,f.y,FOOD_CELL),f);return f;
}
function removeFood(f){const i=food.indexOf(f);if(i>=0)food.splice(i,1);const key=bucketKey(f.x,f.y,FOOD_CELL),bucket=foodBuckets.get(key);if(bucket){const j=bucket.indexOf(f);if(j>=0)bucket.splice(j,1);if(!bucket.length)foodBuckets.delete(key)}}
function seedSparks(){sparks=[];sparkBuckets=new Map();const n=Math.round(WORLD_W*WORLD_H/69000);for(let i=0;i<n;i++){const s={x:rand(20,WORLD_W-20),y:rand(20,WORLD_H-20),r:rand(1.8,3.4),phase:rand(0,Math.PI*2),pulse:rand(.0015,.004)};sparks.push(s);addToBuckets(sparkBuckets,bucketKey(s.x,s.y,SPARK_CELL),s)}}
function seedFood(){food=[];foodBuckets=new Map();const globalCount=2450;for(let i=0;i<globalCount;i++)spawnFood();
  // A moderate starter cluster near the spawn; spheres are worth only a few rubles.
  const rad=Math.min(W,H)*.72;for(let i=0;i<450;i++){const a=rand(0,Math.PI*2),r=Math.sqrt(Math.random())*rad;spawnFood(clamp(player.x+Math.cos(a)*r,70,WORLD_W-70),clamp(player.y+Math.sin(a)*r,70,WORLD_H-70),Math.random()<.12?Math.round(rand(13,18)):Math.round(rand(6,11)),{r:rand(3.8,5.2)})}
}
function spawnBots(){
  bots=[];for(let i=0;i<BOT_COUNT;i++){
    let x,y;const a=rand(0,Math.PI*2);let r;
    if(i<10)r=rand(Math.max(850,Math.min(W,H)*.95),Math.max(1450,Math.min(W,H)*1.75));
    else if(i<20)r=rand(Math.max(W,H)*1.55,Math.max(W,H)*2.55);
    else r=rand(Math.max(W,H)*2.1,Math.max(W,H)*3.6);
    if(i<20){x=clamp(player.x+Math.cos(a)*r,160,WORLD_W-160);y=clamp(player.y+Math.sin(a)*r,160,WORLD_H-160)}else{x=rand(180,WORLD_W-180);y=rand(180,WORLD_H-180)}
    const palette=PALETTES[(i+1+Math.floor(rand(0,PALETTES.length)))%PALETTES.length];
    const worth=Math.random()<.10?Math.floor(rand(1450,2300)):Math.floor(rand(180,1150));
    const b=makeWorm(x,y,palette,BOT_NAMES[i%BOT_NAMES.length],false,worth);b.homeX=x;b.homeY=y;b.targetX=clamp(x+rand(-1100,1100),100,WORLD_W-100);b.targetY=clamp(y+rand(-900,900),100,WORLD_H-100);b.nextDecision=performance.now()+rand(300,1900);bots.push(b);
  }
}
function updateCamera(snap=0,dt=1/60){if(!player)return;const tx=clamp(player.x-W*.5,0,WORLD_W-W),ty=clamp(player.y-H*.5,0,WORLD_H-H);const k=snap?1:1-Math.exp(-Math.max(.001,dt)*8.5);camera.x+=(tx-camera.x)*k;camera.y+=(ty-camera.y)*k}
function updateUI(){
  const target=currentTarget(),pct=clamp(cash/target*100,0,100);if($('cashValue'))$('cashValue').textContent=money(cash);if($('targetAmount'))$('targetAmount').textContent=money(target);if($('startTarget'))$('startTarget').textContent=money(TARGETS[0]);if($('goalFill'))$('goalFill').style.width=pct+'%';if($('statusFill'))$('statusFill').style.width=pct+'%';
  if($('statusText'))$('statusText').textContent=state==='escape'?'EXIT OPEN — YOU CAN LEAVE NOW':(targetStage===2&&cash>=target&&!targetWindowUsed?'FINAL GOAL REACHED — NEXT ORB OPENS EXIT WINDOW':'COLLECT YELLOW ORBS TO REACH '+money(target));
  if($('lengthCount')&&player)$('lengthCount').textContent=player.body.length;if($('bestValue'))$('bestValue').textContent=money(best);if($('orbCount'))$('orbCount').textContent=collected;
}
function updateLeaderboard(){if(!$('leaderboardList'))return;const rows=[{name:'YOU',worth:cash,color:'#54fff0'},...bots.filter(b=>b.deadTimer<=0).map(b=>({name:b.name,worth:b.worth,color:b.palette.glow}))].sort((a,b)=>b.worth-a.worth).slice(0,6);$('leaderboardList').innerHTML=rows.map((b,i)=>`<div class="leader-row"><span class="leader-rank">${String(i+1).padStart(2,'0')}</span><span class="leader-name"><i class="leader-dot" style="background:${b.color};color:${b.color}"></i>${b.name}</span><span class="leader-cash">${money(b.worth)}</span></div>`).join('');if($('wormCount'))$('wormCount').textContent=1+bots.filter(b=>b.deadTimer<=0).length}
function seedWorld(){cash=100;collected=0;escapeLeft=15;exitY=null;targetStage=0;targetWindowUsed=false;particles=[];player=makeWorm(WORLD_W*.5,WORLD_H*.51,PALETTES[0],'YOU',true,cash);mouse={x:W*.72,y:H*.49};spawnBots();seedFood();seedSparks();updateCamera(1);updateUI();updateLeaderboard()}
function showStart(){state='menu';$('mobileControls').classList.add('hidden');$('gameShell').classList.remove('playing');$('startScreen').classList.remove('hidden');$('resultScreen').classList.add('hidden');$('pauseScreen').classList.add('hidden');$('taskBanner').classList.add('hidden');$('timerBox').classList.add('hidden');$('topHud').classList.remove('hidden');$('bottomHud').classList.remove('hidden');$('controlsNote').classList.remove('hidden');$('quickStats').classList.remove('hidden');$('leaderboardPanel').classList.remove('hidden')}
function startGame(){try{seedWorld();$('mobileControls').classList.remove('hidden');$('gameShell').classList.add('playing');state='running';spawnShieldUntil=performance.now()+1800;lastFrame=performance.now();lastFoodSpawn=lastFrame;lastBoostCost=lastFrame;lastBoostDrop=lastFrame;collisionTick=0;uiTick=0;$('startScreen').classList.add('hidden');$('resultScreen').classList.add('hidden');$('pauseScreen').classList.add('hidden');$('taskBanner').classList.add('hidden');$('timerBox').classList.add('hidden');$('topHud').classList.remove('hidden');$('bottomHud').classList.remove('hidden');$('controlsNote').classList.remove('hidden');$('quickStats').classList.remove('hidden');$('leaderboardPanel').classList.remove('hidden');updateUI();toast('Collect the yellow spheres and keep moving.')}catch(err){console.error(err);toast('Could not start: '+err.message)}}
function steer(w,aim,dt,rate){const d=Math.atan2(Math.sin(aim-w.angle),Math.cos(aim-w.angle));w.angle+=clamp(d,-rate*dt,rate*dt)}
function updateBody(w,dt){
  const first=w.body[0];if(first){const dx=w.x-first.x,dy=w.y-first.y,d=Math.hypot(dx,dy);if(d>=SEGMENT_SPACING){const steps=Math.min(8,Math.floor(d/SEGMENT_SPACING));for(let k=steps;k>=1;k--)w.body.unshift({x:w.x-dx*(k*SEGMENT_SPACING/d),y:w.y-dy*(k*SEGMENT_SPACING/d)})}}
  w.lengthTarget=lengthFor(w.worth);
  // Grow/shrink smoothly with cash; at higher balances both length and body thickness rise.
  const target=w.lengthTarget;if(w.body.length<target){const add=Math.min(3,target-w.body.length);for(let i=0;i<add;i++){const t=w.body[w.body.length-1],p=w.body[w.body.length-2]||{x:t.x-Math.cos(w.angle)*SEGMENT_SPACING,y:t.y-Math.sin(w.angle)*SEGMENT_SPACING};const dx=t.x-p.x,dy=t.y-p.y,d=Math.hypot(dx,dy)||1;w.body.push({x:t.x+dx/d*SEGMENT_SPACING,y:t.y+dy/d*SEGMENT_SPACING})}}else if(w.body.length>target){w.body.length=Math.max(target,w.body.length-2)}
  w.radius=wormRadius(w);w.length=w.body.length;
}
function findFoodFor(w,radius=720){
  const minX=Math.floor((w.x-radius)/FOOD_CELL),maxX=Math.floor((w.x+radius)/FOOD_CELL),minY=Math.floor((w.y-radius)/FOOD_CELL),maxY=Math.floor((w.y+radius)/FOOD_CELL);let chosen=null,score=-Infinity;
  for(let gx=minX;gx<=maxX;gx++)for(let gy=minY;gy<=maxY;gy++){const bucket=foodBuckets.get(gx+','+gy);if(!bucket)continue;for(const f of bucket){const dx=f.x-w.x,dy=f.y-w.y,d2=dx*dx+dy*dy;if(d2>radius*radius)continue;const v=f.value/(Math.sqrt(d2)+80)+rand(0,.025);if(v>score){score=v;chosen=f}}}return chosen;
}
function avoidAngle(w){
  const lx=w.x+Math.cos(w.angle)*115,ly=w.y+Math.sin(w.angle)*115;let ax=0,ay=0;
  for(const other of [player,...bots]){if(!other||other===w||other.deadTimer>0||!other.body.length)continue;
    let dx=w.x-other.x,dy=w.y-other.y,d=Math.hypot(dx,dy);if(d<100&&d>0){ax+=dx/d*(100-d)/100;ay+=dy/d*(100-d)/100}
    for(let j=8;j<other.body.length;j+=4){const p=other.body[j],vx=lx-p.x,vy=ly-p.y,dd=Math.hypot(vx,vy);if(dd<76){ax+=vx/(dd||1)*(76-dd)/76;ay+=vy/(dd||1)*(76-dd)/76}}
  }
  return Math.hypot(ax,ay)>.17?Math.atan2(ay,ax):null;
}
function spawnLootFrom(w){
  if(!w.body.length)return;const count=Math.floor(clamp(w.body.length*.58+Math.sqrt(Math.max(0,w.worth))*.2,12,190));const total=Math.floor(w.worth*.42);const weights=[];let sum=0;
  for(let i=0;i<count;i++){const z=rand(.55,1.55);weights.push(z);sum+=z}
  for(let i=0;i<count;i++){
    const idx=Math.min(w.body.length-1,Math.floor(i/(count-1||1)*(w.body.length-1)));const p=w.body[idx];const value=Math.max(3,Math.round(total*weights[i]/sum));
    spawnFood(clamp(p.x+rand(-22,22),35,WORLD_W-35),clamp(p.y+rand(-22,22),35,WORLD_H-35),value,{r:rand(4.6,7.1),loot:true});
  }
  burst(w.x,w.y,w.palette.glow,22);
}
function respawnBot(b){const idx=bots.indexOf(b);if(idx<0)return;const side=Math.floor(rand(0,4));let x,y;if(side===0){x=rand(100,WORLD_W-100);y=160}else if(side===1){x=rand(100,WORLD_W-100);y=WORLD_H-160}else if(side===2){x=160;y=rand(100,WORLD_H-100)}else{x=WORLD_W-160;y=rand(100,WORLD_H-100)}const repl=makeWorm(x,y,PALETTES[Math.floor(rand(1,PALETTES.length))],b.name,false,Math.floor(rand(160,1050)));Object.assign(b,repl);b.homeX=x;b.homeY=y;b.nextDecision=performance.now()+rand(500,2000)}
function killBot(b){if(!b||b.deadTimer>0)return;spawnLootFrom(b);b.deadTimer=rand(2.6,4.2);b.body=[];b.worth=0}
function burst(x,y,color,n){for(let i=0;i<n&&particles.length<450;i++){const a=rand(0,Math.PI*2),s=rand(25,110),life=rand(.2,.48);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,max:life,color,r:rand(1,3)})}}
function eatFood(w){
  const cx=Math.floor(w.x/FOOD_CELL),cy=Math.floor(w.y/FOOD_CELL);for(let gx=cx-1;gx<=cx+1;gx++)for(let gy=cy-1;gy<=cy+1;gy++){const bucket=foodBuckets.get(gx+','+gy);if(!bucket)continue;
    for(const f of bucket){const dx=w.x-f.x,dy=w.y-f.y,rr=w.radius*.95+f.r+2;if(dx*dx+dy*dy<rr*rr){removeFood(f);w.worth+=f.value;w.lengthTarget=lengthFor(w.worth);if(w.isPlayer){cash=w.worth;collected++;burst(f.x,f.y,'#ffe85b',3);updateUI();if(cash>=currentTarget()&&state==='running'&&!targetWindowUsed)beginEscape()}return true}}
  }return false;
}
function moveBot(b,dt,now){
  if(b.deadTimer>0){b.deadTimer-=dt;if(b.deadTimer<=0)respawnBot(b);return}
  if(now>b.nextDecision){
    const snack=findFoodFor(b,rand(420,780));if(snack&&Math.random()<.77){b.targetX=snack.x+rand(-60,60);b.targetY=snack.y+rand(-60,60)}else{b.targetX=clamp(b.x+rand(-1250,1250),110,WORLD_W-110);b.targetY=clamp(b.y+rand(-950,950),110,WORLD_H-110)}
    b.nextDecision=now+rand(850,2400);if(b.worth>800&&Math.random()<.105)b.boostUntil=now+rand(450,1050);if(Math.random()<.12)b.targetX=clamp(b.targetX+rand(-600,600),100,WORLD_W-100);
  }
  let aim=Math.atan2(b.targetY-b.y,b.targetX-b.x);
  if(now>b.nextAvoid){b.avoidAngle=avoidAngle(b);b.nextAvoid=now+rand(110,260)}
  // Imperfect, personality-based avoidance: bots usually make room but sometimes misjudge a turn.
  if(b.avoidAngle!==null&&Math.random()<b.skill){const d=Math.atan2(Math.sin(b.avoidAngle-aim),Math.cos(b.avoidAngle-aim));aim+=d*rand(.52,.9)}
  aim+=Math.sin(now*.00072+b.style*5)*.09+(Math.random()-.5)*.026;steer(b,aim,dt,rand(1.45,2.05));
  b.boosting=now<b.boostUntil&&b.worth>80;const speed=Math.max(80,b.baseSpeed-Math.sqrt(b.worth)*.25)*(b.boosting?1.42:1);b.x+=Math.cos(b.angle)*speed*dt;b.y+=Math.sin(b.angle)*speed*dt;
  if(b.boosting&&now-b.lastBoostCost>510){b.lastBoostCost=now;b.worth=Math.max(0,b.worth-5);if(now-b.lastBoostDrop>680){b.lastBoostDrop=now;const tail=b.body[b.body.length-1];if(tail)spawnFood(tail.x+rand(-7,7),tail.y+rand(-7,7),3,{r:3.8})}}
  if(b.x<50||b.x>WORLD_W-50||b.y<50||b.y>WORLD_H-50){b.targetX=clamp(WORLD_W*.5+rand(-WORLD_W*.36,WORLD_W*.36),150,WORLD_W-150);b.targetY=clamp(WORLD_H*.5+rand(-WORLD_H*.36,WORLD_H*.36),150,WORLD_H-150);steer(b,Math.atan2(b.targetY-b.y,b.targetX-b.x),dt,2.2)}
  updateBody(b,dt);
}
function bodyHit(head,bodyW,skip=8){if(!head||!bodyW||head===bodyW||bodyW.deadTimer>0||!bodyW.body.length)return false;const radius=wormRadius(head)+wormRadius(bodyW)*.82+2;const rr=radius*radius;
  for(let j=skip;j<bodyW.body.length;j+=2){const p=bodyW.body[j],dx=head.x-p.x,dy=head.y-p.y;if(Math.abs(dx)>radius+2||Math.abs(dy)>radius+2)continue;if(dx*dx+dy*dy<rr)return true}return false;
}
function headOn(a,b,now){if(!a||!b||!a.body.length||!b.body.length)return false;const r=wormRadius(a)+wormRadius(b)+1,dx=a.x-b.x,dy=a.y-b.y;if(dx*dx+dy*dy>r*r)return false;if(now-(a.lastHeadBump||0)<1000||now-(b.lastHeadBump||0)<1000)return false;a.lastHeadBump=b.lastHeadBump=now;const opposed=Math.cos(a.angle-b.angle)<-.05;
  if(opposed&&Math.random()<.32){if(a.isPlayer){lose('A head-on collision with '+b.name+'!');return true}if(b.isPlayer){killBot(a);return false}killBot(Math.random()<.5?a:b)}return false;
}
function checkCollisions(now){
  // Head-to-body contact follows the classic slither rule; head-on brushes only cause crashes sometimes.
  if(now>=spawnShieldUntil){for(const b of bots){if(b.deadTimer>0)continue;if(bodyHit(player,b,8)){lose('You crashed into '+b.name+'!');return true}}}
  for(const b of bots){if(b.deadTimer>0)continue;if(bodyHit(b,player,8)){killBot(b);continue}
    for(const other of bots){if(other===b||other.deadTimer>0)continue;if(bodyHit(b,other,8)){killBot(b);break}}
  }
  // Self-collision is intentionally disabled for every worm. Collisions with other worms still work.
  for(let i=0;i<bots.length;i++){const a=bots[i];if(a.deadTimer>0)continue;for(let j=i+1;j<bots.length;j++){const b=bots[j];if(b.deadTimer>0)continue;headOn(a,b,now)}}
  if(now>=spawnShieldUntil){for(const b of bots){if(b.deadTimer>0)continue;if(headOn(player,b,now))return true}}return false;
}
function beginEscape(){if(targetWindowUsed||state!=='running')return;targetWindowUsed=true;state='escape';escapeLeft=15;exitY=Math.max(55,player.y-H*.37);if($('taskBanner'))$('taskBanner').classList.remove('hidden');if($('timerBox'))$('timerBox').classList.remove('hidden');if($('timerValue'))$('timerValue').textContent='15';updateUI();toast('GOAL REACHED — EXIT IS OPTIONAL FOR 15 SECONDS')}
function expireExitWindow(){if($('taskBanner'))$('taskBanner').classList.add('hidden');if($('timerBox'))$('timerBox').classList.add('hidden');exitY=null;state='running';if(targetStage<TARGETS.length-1){targetStage++;targetWindowUsed=false;updateUI();toast('NEW GOAL: '+money(currentTarget()));if(cash>=currentTarget())beginEscape()}else{targetWindowUsed=false;updateUI();toast('FINAL GOAL REACHED — NEXT ORB OPENS EXIT WINDOW')}}
function endRun(won,reason){state=won?'won':'lost';$('mobileControls').classList.add('hidden');keys.delete(' ');if($('mobileBoost'))$('mobileBoost').classList.remove('pressed');best=Math.max(best,cash);storeSet('neonWormBestRublesV1',best);$('bestValue').textContent=money(best);$('resultScreen').classList.remove('hidden');$('resultKicker').textContent=won?'RUN COMPLETE':'RUN OVER';$('resultTitle').textContent=money(cash);$('resultText').textContent=reason;$('taskBanner').classList.add('hidden');$('timerBox').classList.add('hidden') }
function lose(reason){endRun(false,reason)}function win(){endRun(true,'You reached the exit.')}
function togglePause(){if(state==='running'||state==='escape'){state='paused';$('pauseScreen').classList.remove('hidden')}else if(state==='paused'){state=exitY!==null?'escape':'running';$('pauseScreen').classList.add('hidden');lastFrame=performance.now()}}
function goMenu(){showStart();}
function update(dt,now){
  if(state!=='running'&&state!=='escape')return;dt=Math.min(dt,.04);
  const dx=mouse.x-W*.5,dy=mouse.y-H*.5;if(Math.hypot(dx,dy)>12)steer(player,Math.atan2(dy,dx),dt,3.15);
  player.boosting=(keys.has(' ')||keys.has('space'))&&cash>0;const base=Math.max(105,player.baseSpeed-Math.sqrt(cash)*.22),speed=base*(player.boosting?1.58:1.0);player.x+=Math.cos(player.angle)*speed*dt;player.y+=Math.sin(player.angle)*speed*dt;
  if(player.boosting&&now-lastBoostCost>450){lastBoostCost=now;cash=Math.max(0,cash-5);player.worth=cash;player.lengthTarget=lengthFor(cash);if(now-lastBoostDrop>590){lastBoostDrop=now;const t=player.body[player.body.length-1];if(t)spawnFood(t.x+rand(-8,8),t.y+rand(-8,8),3,{r:3.8})}}
  updateBody(player,dt);for(const b of bots)moveBot(b,dt,now);
  // Each worm can collect only yellow round orbs. Death loot uses the same round orb visual.
  eatFood(player);for(const b of bots){if(b.deadTimer<=0){eatFood(b);if(b.worth>15000)b.worth=15000}}
  if(now-lastFoodSpawn>450&&food.length<4100){const n=2;for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),r=rand(Math.max(80,Math.min(W,H)*.15),Math.max(150,Math.min(W,H)*.62));spawnFood(clamp(player.x+Math.cos(a)*r,40,WORLD_W-40),clamp(player.y+Math.sin(a)*r,40,WORLD_H-40),Math.random()<.14?Math.round(rand(13,18)):Math.round(rand(5,10)),{r:rand(3.6,5.1)})}lastFoodSpawn=now}
  if(++collisionTick%3===0&&checkCollisions(now))return;
  if(state==='escape'){escapeLeft-=dt;if($('timerValue'))$('timerValue').textContent=String(Math.max(0,Math.ceil(escapeLeft)));if(player.y<=exitY){win();return}if(escapeLeft<=0){expireExitWindow();}}
  if(player.x<28||player.x>WORLD_W-28||player.y>WORLD_H-28||(player.y<28&&state!=='escape')){lose('You crashed into the arena wall.');return}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
  updateCamera(0,dt);if(++uiTick%6===0){updateUI();updateLeaderboard()}
}
function inView(x,y,pad=50){return x>=camera.x-pad&&x<=camera.x+W+pad&&y>=camera.y-pad&&y<=camera.y+H+pad}
function drawBackground(now){ctx.fillStyle='#030817';ctx.fillRect(0,0,W,H);if(bgPattern&&bgTile){ctx.save();const ox=-((camera.x%bgTile.width)+bgTile.width)%bgTile.width,oy=-((camera.y%bgTile.height)+bgTile.height)%bgTile.height;ctx.translate(ox,oy);ctx.fillStyle=bgPattern;ctx.fillRect(0,0,W+bgTile.width,H+bgTile.height);ctx.restore()}
  // Soft vignette is subtle and does not turn the arena into a vertical phone window.
  const g=ctx.createRadialGradient(W*.5,H*.48,Math.min(W,H)*.18,W*.5,H*.48,Math.max(W,H)*.78);g.addColorStop(0,'rgba(4,10,21,0)');g.addColorStop(1,'rgba(0,2,9,.3)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function visibleObjects(map,cell){const out=[];const x0=Math.floor(camera.x/cell),x1=Math.floor((camera.x+W)/cell),y0=Math.floor(camera.y/cell),y1=Math.floor((camera.y+H)/cell);for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const b=map.get(x+','+y);if(b)for(const o of b)if(inView(o.x,o.y,20))out.push(o)}return out}
function drawSparks(now){for(const s of visibleObjects(sparkBuckets,SPARK_CELL)){const x=s.x-camera.x,y=s.y-camera.y,pulse=.7+.3*Math.sin(now*s.pulse+s.phase),r=s.r*pulse;ctx.globalAlpha=.16;ctx.fillStyle='#ff233f';ctx.beginPath();ctx.arc(x,y,r*2.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.94;ctx.fillStyle='#ef233b';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#ff9ca7';ctx.beginPath();ctx.arc(x-r*.25,y-r*.27,Math.max(.6,r*.32),0,Math.PI*2);ctx.fill()}}
function drawFood(f,now){const x=f.x-camera.x,y=f.y-camera.y,r=f.r*(1+Math.sin(now*.0025+f.phase)*.08);ctx.globalAlpha=f.loot?.22:.16;ctx.fillStyle='#ffe45a';ctx.beginPath();ctx.arc(x,y,r*(f.loot?2.8:2.2),0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=f.loot?'#f7c72d':'#dcb52a';ctx.beginPath();ctx.arc(x,y,r+1,0,Math.PI*2);ctx.fill();const g=ctx.createRadialGradient(x-r*.34,y-r*.4,.4,x,y,r*1.2);g.addColorStop(0,'#fff6a9');g.addColorStop(.42,'#ffec54');g.addColorStop(1,f.loot?'#edae16':'#e3ba25');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*.88,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,225,.9)';ctx.beginPath();ctx.arc(x-r*.3,y-r*.34,Math.max(.8,r*.22),0,Math.PI*2);ctx.fill()}
function paletteGradient(w){const b=w.body[w.body.length-1]||{x:w.x,y:w.y};const g=ctx.createLinearGradient(b.x-camera.x,b.y-camera.y,w.x-camera.x,w.y-camera.y||.001);const colors=w.palette.colors;colors.forEach((c,i)=>g.addColorStop(i/Math.max(1,colors.length-1),c));return g}
function wormVisible(w){if(inView(w.x,w.y,200))return true;for(let i=0;i<w.body.length;i+=5)if(inView(w.body[i].x,w.body[i].y,90))return true;return false}
function drawWorm(w,now){
  if(!w||!w.body.length||w.deadTimer>0||!wormVisible(w))return;
  const r=wormRadius(w);ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  // Build one continuous, smooth ribbon so the worm reads as a body, not a row of beads.
  ctx.beginPath();ctx.moveTo(w.body[0].x-camera.x,w.body[0].y-camera.y);
  for(let i=1;i<w.body.length-1;i++){const p=w.body[i],n=w.body[i+1];ctx.quadraticCurveTo(p.x-camera.x,p.y-camera.y,(p.x+n.x)*.5-camera.x,(p.y+n.y)*.5-camera.y)}
  const tail=w.body[w.body.length-1];ctx.lineTo(tail.x-camera.x,tail.y-camera.y);const grad=paletteGradient(w);
  // Deep outline, broad saturated body, and a soft specular streak inspired by the reference worms.
  ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=Math.min(8,r*.36);ctx.strokeStyle='rgba(0,3,12,.98)';ctx.lineWidth=r*2+7;ctx.stroke();ctx.shadowBlur=0;
  ctx.shadowColor=w.palette.glow;ctx.shadowBlur=Math.min(12,r*.48);ctx.strokeStyle=grad;ctx.lineWidth=r*2+1;ctx.stroke();ctx.shadowBlur=0;
  ctx.strokeStyle=grad;ctx.lineWidth=r*1.72;ctx.stroke();
  // Small pill-like glints across the upper shoulder create the glossy segmented feel of the video.
  ctx.fillStyle='rgba(255,255,255,.12)';
  for(let i=5;i<w.body.length-3;i+=6){const p=w.body[i],prev=w.body[i-1],next=w.body[i+1];if(!inView(p.x,p.y,r+12))continue;const tx=next.x-prev.x,ty=next.y-prev.y,a=Math.atan2(ty,tx),nx=-Math.sin(a),ny=Math.cos(a);const x=p.x-camera.x-nx*r*.36,y=p.y-camera.y-ny*r*.36;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,Math.max(2,r*.53),Math.max(.8,r*.15),0,0,Math.PI*2);ctx.fill();ctx.restore()}
  // Thin reflection on the body; keep it restrained rather than turning the worm into a white line.
  ctx.globalAlpha=.15;ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(1.1,r*.09);ctx.stroke();ctx.globalAlpha=1;
  const hx=w.x-camera.x,hy=w.y-camera.y,headR=r*1.12;ctx.shadowColor=w.palette.glow;ctx.shadowBlur=Math.min(11,r*.43);const headGrad=ctx.createRadialGradient(hx-r*.34,hy-r*.42,1,hx,hy,headR*1.35);headGrad.addColorStop(0,'#ffffffaa');headGrad.addColorStop(.2,w.palette.colors[Math.min(1,w.palette.colors.length-1)]);headGrad.addColorStop(1,w.palette.glow);ctx.fillStyle=headGrad;ctx.beginPath();ctx.arc(hx,hy,headR,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=Math.max(1,r*.07);ctx.stroke();
  // Big, expressive white eyes sit at the front of the head, like the worms in the clip.
  const ex=Math.cos(w.angle),ey=Math.sin(w.angle),px=-ey,py=ex;
  for(const side of [-1,1]){const exx=hx+ex*r*.53+px*side*r*.57,eyy=hy+ey*r*.53+py*side*r*.57;ctx.fillStyle='#faffff';ctx.beginPath();ctx.ellipse(exx,eyy,r*.43,r*.5,Math.atan2(ey,ex),0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(3,13,24,.5)';ctx.lineWidth=Math.max(.8,r*.055);ctx.stroke();ctx.fillStyle='#07101a';ctx.beginPath();ctx.arc(exx+ex*r*.17,eyy+ey*r*.17,Math.max(1.4,r*.19),0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(exx+ex*r*.09-r*.08,eyy+ey*r*.09-r*.08,Math.max(.8,r*.075),0,Math.PI*2);ctx.fill()}
  // Floating balance plate with a vivid green frame, plus the nickname directly underneath.
  const balance=money(w.worth),font=Math.min(18,11+Math.sqrt(Math.max(0,w.worth))*.05);ctx.font=`800 ${font}px Arial`;const tw=Math.max(46,ctx.measureText(balance).width+18),plateH=Math.max(19,font*1.55),py0=hy-r-plateH*.5-3;
  ctx.fillStyle='rgba(0,7,10,.97)';ctx.strokeStyle='#24ff58';ctx.lineWidth=1.4;roundedRect(ctx,hx-tw/2,py0-plateH/2,tw,plateH,3);ctx.fill();ctx.shadowColor='#29ff60';ctx.shadowBlur=3;ctx.stroke();ctx.shadowBlur=0;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#60ff78';ctx.font=`800 ${font}px Arial`;ctx.fillText(balance,hx,py0+.4);ctx.fillStyle='#f3fbff';ctx.font='800 10px Arial';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.fillText(w.isPlayer?'YOU':w.name,hx,hy+r+11);ctx.shadowBlur=0;ctx.restore();
}
function drawExit(){if(exitY===null)return;const y=exitY-camera.y;if(y<-30||y>H+30)return;ctx.save();ctx.fillStyle='rgba(54,255,85,.08)';ctx.fillRect(0,y-12,W,24);ctx.strokeStyle='#4cff69';ctx.lineWidth=2.8;ctx.shadowColor='#4cff69';ctx.shadowBlur=13;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#b5ff79';for(let x=8;x<W;x+=42){ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x,y-6);ctx.lineTo(x+5,y);ctx.closePath();ctx.fill()}ctx.restore()}
function drawWorld(now){drawBackground(now);drawSparks(now);const visibleFood=visibleObjects(foodBuckets,FOOD_CELL);for(const f of visibleFood)drawFood(f,now);if(state==='escape')drawExit();for(const b of bots)drawWorm(b,now);if(player)drawWorm(player,now);for(const p of particles){const x=p.x-camera.x,y=p.y-camera.y;if(x<-5||x>W+5||y<-5||y>H+5)continue;ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
  // The actual world edge is visible only when approaching it.
  ctx.strokeStyle='rgba(80,255,117,.58)';ctx.lineWidth=3;if(camera.y<3&&state!=='escape'){ctx.beginPath();ctx.moveTo(0,1);ctx.lineTo(W,1);ctx.stroke()}if(camera.x<3){ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(1,H);ctx.stroke()}if(camera.x+W>WORLD_W-3){ctx.beginPath();ctx.moveTo(W-1,0);ctx.lineTo(W-1,H);ctx.stroke()}if(camera.y+H>WORLD_H-3){ctx.beginPath();ctx.moveTo(0,H-1);ctx.lineTo(W,H-1);ctx.stroke()}
}
function showHelp(){$('helpModal').classList.remove('hidden')}function closeHelp(){$('helpModal').classList.add('hidden')}
$('playButton').addEventListener('click',startGame);$('againButton').addEventListener('click',startGame);$('homeButton').addEventListener('click',goMenu);$('helpButton').addEventListener('click',showHelp);$('closeHelp').addEventListener('click',closeHelp);$('gotItButton').addEventListener('click',closeHelp);$('continueButton').addEventListener('click',togglePause);$('pauseHomeButton').addEventListener('click',goMenu);
$('resetButton').addEventListener('click',()=>{storeRemove('neonWormBestRublesV1');storeRemove('dollarWormBestV5');storeRemove('dollarWormBestV4');best=0;$('bestValue').textContent=money(0);toast('Best score reset')});
addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.code==='Space')e.preventDefault();if(e.key==='Escape'){if(!$('helpModal').classList.contains('hidden'))closeHelp();else togglePause()}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
// Mouse on desktop; touch-drag steering on phones. Prevent browser panning while playing.
function setPointer(x,y){const r=canvas.getBoundingClientRect();mouse={x:clamp(x-r.left,0,W),y:clamp(y-r.top,0,H)}}
addEventListener('mousemove',e=>{if(e.pointerType==='touch')return;if(state==='running'||state==='escape')setPointer(e.clientX,e.clientY)});
let touchSteerActive=false;
canvas.addEventListener('touchstart',e=>{if(state==='running'||state==='escape'){const p=e.touches[0];if(p){touchSteerActive=true;setPointer(p.clientX,p.clientY)}e.preventDefault()}},{passive:false});
canvas.addEventListener('touchmove',e=>{if((state==='running'||state==='escape')&&touchSteerActive){const p=e.touches[0];if(p)setPointer(p.clientX,p.clientY);e.preventDefault()}},{passive:false});
canvas.addEventListener('touchend',()=>{touchSteerActive=false},{passive:true});canvas.addEventListener('touchcancel',()=>{touchSteerActive=false},{passive:true});
// Big hold-to-boost button for touch screens. It uses the same boost key as SPACE.
const mobileBoost=$('mobileBoost');
function pressMobileBoost(e){if(e)e.preventDefault();if(state!=='running'&&state!=='escape')return;keys.add(' ');if(mobileBoost){mobileBoost.classList.add('pressed');if(e&&e.pointerId!==undefined&&mobileBoost.setPointerCapture){try{mobileBoost.setPointerCapture(e.pointerId)}catch(_){}}}}
function releaseMobileBoost(e){if(e)e.preventDefault();keys.delete(' ');if(mobileBoost)mobileBoost.classList.remove('pressed');}
if(mobileBoost){mobileBoost.addEventListener('pointerdown',pressMobileBoost);mobileBoost.addEventListener('pointerup',releaseMobileBoost);mobileBoost.addEventListener('pointercancel',releaseMobileBoost);mobileBoost.addEventListener('lostpointercapture',releaseMobileBoost);mobileBoost.addEventListener('contextmenu',e=>e.preventDefault());}
const mobilePause=$('mobilePause');if(mobilePause)mobilePause.addEventListener('click',e=>{e.preventDefault();togglePause()});
addEventListener('blur',()=>{keys.delete(' ');if(mobileBoost)mobileBoost.classList.remove('pressed')});
addEventListener('error',e=>{console.error('Dollar Worm:',e.message);if(state==='menu')toast('Game error — open in Chrome or Edge')});
function frame(now){requestAnimationFrame(frame);if(now-lastRender<16.3)return;const dt=lastRender?Math.min(.045,(now-lastRender)/1000):1/60;lastRender=now;if(state==='running'||state==='escape')update(dt,now);drawWorld(now)}
seedWorld();state='menu';updateUI();updateLeaderboard();requestAnimationFrame(frame);
})();
