'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const levels=[['初入森林','学习瞄准',0,0,80,.22],['蘑菇小径','稳稳命中',0,0,100,.25],['溪边练习','稍远一点',0,-20,110,.3],['风起林间','留意侧风',28,0,115,.35],['树梢来客','向高处投',-18,-55,120,.38],['落叶回旋','逆风挑战',-35,15,125,.42],['暮色峡谷','强劲对手',38,-30,135,.46],['月光木桩','精准出击',-42,-60,140,.5],['英雄前夜','最后的练习',48,-15,150,.55],['森林守卫','终章 · 首领',-28,-35,175,.6]];
let saved={unlocked:1,stars:{},cat:'gold'};try{Object.assign(saved,JSON.parse(localStorage.getItem('paw-pillar-v1')||'{}'));}catch{}saved.unlocked=Math.min(10,Math.max(1,+saved.unlocked||1));saved.stars=saved.stars||{};
let cat=saved.cat==='blue'?'blue':'gold',lvl=0,phase='welcome',hp=100,ehp=80,enemyMax=80,projectile=null,paused=false,turnTime=0,shots=0,shield=true,enemyShots=0,particles=[],floaters=[],drag=null,sound=false,audioCtx=null,enemyFlash=0,playerFlash=0,fall=0,last=0,clock=0;
const bg=new Image();bg.src='assets/forest.webp';const cats=new Image();cats.src='assets/cats.webp';
function save(){try{localStorage.setItem('paw-pillar-v1',JSON.stringify(saved));}catch{}}
function tone(freq=500,dur=.1){if(!sound)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(.06,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.start();o.stop(audioCtx.currentTime+dur);}catch{}}
function select(c){if(!['welcome','win','lose'].includes(phase)){setStatus('本关正在进行，结束后可以更换伙伴。');return;}cat=c;saved.cat=c;save();document.querySelectorAll('.hero,.mini-cat').forEach(el=>{const yes=el.dataset.cat===c;el.classList.toggle('selected',yes);el.setAttribute('aria-pressed',String(yes));const label=el.querySelector('.chosen');if(label)label.textContent=yes?'● 已选择':'选择伙伴 →';});$('playerName').textContent=cat==='gold'?'奶糖':'蓝莓';draw();}
function map(){const done=Object.keys(saved.stars).length;$('completeCount').textContent=String(done).padStart(2,'0');$('levelList').innerHTML=levels.map((l,i)=>`<button class="level ${i===lvl?'current':''}" data-level="${i}" ${i+1>saved.unlocked?'disabled':''}><span class="num">${saved.stars[i]?'✓':String(i+1).padStart(2,'0')}</span><span class="lname">${l[0]}<small>${saved.stars[i]?'★'.repeat(saved.stars[i]):l[1]}</small></span><span class="lock">${i+1>saved.unlocked?'锁':i===lvl?'←':''}</span></button>`).join('');document.querySelectorAll('.level').forEach(b=>b.onclick=()=>start(+b.dataset.level));}
function setStatus(t){$('status').textContent=t;}
function hud(){$('playerHp').textContent=`${Math.max(0,Math.ceil(hp))} / 100`;$('enemyHp').textContent=`${Math.max(0,Math.ceil(ehp))} / ${enemyMax}`;$('pbar').style.width=Math.max(0,hp)+'%';$('ebar').style.width=Math.max(0,ehp/enemyMax*100)+'%';$('throwBtn').disabled=phase!=='aim'||paused;$('retryBtn').disabled=['intro','reward','ended'].includes(phase)||(phase==='win'&&lvl===9);$('pauseBtn').disabled=!['aim','player-flight','enemy-wait','enemy-flight'].includes(phase);}
function start(n=0){if(['intro','reward','ended'].includes(phase)||(phase==='win'&&lvl===9))return;lvl=n;hp=100;enemyMax=levels[lvl][4];ehp=enemyMax;shots=0;enemyShots=0;shield=cat==='blue';phase='aim';projectile=null;paused=false;fall=0;drag=null;particles=[];floaters=[];$('welcome').classList.add('hidden');$('result').classList.add('hidden');$('pauseLayer').classList.add('hidden');$('pauseBtn').textContent='Ⅱ 暂停';$('levelTitle').textContent=`第 ${String(lvl+1).padStart(2,'0')} 关 · ${levels[lvl][0]}`;$('enemyName').textContent=lvl===9?'森林守卫':`${['小径','蘑菇','溪边','林间','树梢','落叶','暮色','月光','木桩'][lvl]}陪练`;const w=levels[lvl][2];$('wind').textContent=w===0?'无风 · 0':`${w>0?'顺风 →':'← 逆风'} ${Math.abs(w)}`;setStatus(lvl===0?'按住角色向下拉，离角色越远力度越大，松手投掷。':`你的回合。${levels[lvl][1]}，准备投掷！`);map();hud();}
function target(enemy){return enemy?{x:710,y:312+levels[lvl][3]}:{x:190,y:312};}
function shot(enemy=false){if(paused||(!enemy&&phase!=='aim'))return;const p=target(enemy),t=target(!enemy);let vx,vy;if(enemy){enemyShots++;const a=.64+Math.random()*.3,dx=t.x-p.x+20,dy=(t.y-43)-(p.y-68),error=(Math.random()-.5)*(1-levels[lvl][5])*140;const d=Math.abs(dx);const speed=Math.sqrt(200*d*d/(2*Math.cos(a)**2*(dy+d*Math.tan(a))));vx=-speed*Math.cos(a);vy=-speed*Math.sin(a)+(error/d)*speed;phase='enemy-flight';setStatus('对手出手了……站稳！');}else{const a=+$('angle').value*Math.PI/180,speed=+$('power').value*4.5;vx=speed*Math.cos(a);vy=-speed*Math.sin(a);shots++;phase='player-flight';setStatus('飞吧，小小的勇气！');}projectile={x:p.x+(enemy?-30:30),y:p.y-68,vx,vy,enemy,trail:[]};tone(660,.09);hud();}
function resolve(hit,head=false){const e=projectile.enemy;projectile=null;if(hit){const t=target(!e);const damage=e?(head?36:25):(head?65:42)*(cat==='gold'?1.15:1);let text;if(e&&shield){shield=false;text='守护 · 抵挡';tone(750,.2);}else{if(e){hp-=damage;playerFlash=.3;}else{ehp-=damage;enemyFlash=.3;}text=`${head?'精准！ ':''}−${Math.round(damage)}`;tone(e?200:900,.14);}floaters.push({x:t.x,y:t.y-110,text,life:1.3});for(let i=0;i<15;i++)particles.push({x:t.x,y:t.y-55,vx:(Math.random()-.5)*150,vy:-Math.random()*150,life:.8,color:e?'#dca46d':'#e7c763'});}else{setStatus(e?'对手投空了，轮到你！':'擦肩而过，下一投调整一下角度或力度。');tone(280,.1);}hud();if(ehp<=0){finish(true);return;}if(hp<=0){finish(false);return;}if(e){phase='aim';setStatus(shield?'你的回合。守护仍在，放心瞄准。':'你的回合。调整角度，再来一投。');}else{phase='enemy-wait';turnTime=.95;}hud();}
function finish(win){phase=win?'win':'lose';fall=0;const stars=hp>=70&&shots<=5?3:hp>=35?2:1;if(win){saved.stars[lvl]=Math.max(saved.stars[lvl]||0,stars);saved.unlocked=Math.max(saved.unlocked,Math.min(10,lvl+2));save();map();for(let i=0;i<65;i++)particles.push({x:Math.random()*900,y:-Math.random()*250,vx:(Math.random()-.5)*80,vy:80+Math.random()*80,life:4,color:['#d4a14c','#9cad7d','#dc8763'][i%3]});}$('resultTag').textContent=win?(lvl===9?'THE FOREST HAS A NEW HERO':'A LOVELY LITTLE VICTORY'):'再试一次，也很勇敢';$('resultTitle').textContent=win?(lvl===9?'十关通关，英雄诞生！':'漂亮，守住木桩了！'):'差一点点，再来一投';$('stars').textContent=win?'★'.repeat(stars)+'☆'.repeat(3-stars):'✧';$('resultText').textContent=win?`本关投掷 ${shots} 次 · 剩余生命 ${Math.max(0,Math.ceil(hp))}${lvl===9?' · 你完成了全部森林试炼！':''}`:'试试参考虚线落点。蓝猫可以抵挡每关首次伤害。';if(win&&lvl===9)prepareRewards();$('nextBtn').textContent=win?(lvl===9?'领取通关手办 ✦':'前往下一关 →'):'再挑战一次 ↻';turnTime=1;setStatus(win?'勇气 +1！你的冒险正在继续。':'每一次尝试，都离英雄更近。');hud();}
function pause(){if(!['aim','player-flight','enemy-wait','enemy-flight'].includes(phase))return;paused=!paused;$('pauseLayer').classList.toggle('hidden',!paused);$('pauseBtn').textContent=paused?'▶ 继续':'Ⅱ 暂停';hud();}
function sprite(x,base,c,flip=false,alpha=1,offset=0){ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,base+offset);if(flip)ctx.scale(-1,1);if(cats.complete&&cats.naturalWidth){const sw=cats.naturalWidth/2;ctx.drawImage(cats,c==='gold'?0:sw,0,sw,cats.naturalHeight,-62,-122,124,124);}else{ctx.fillStyle=c==='gold'?'#d5a15a':'#869aa8';ctx.beginPath();ctx.ellipse(0,-44,35,43,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(0,-82,36,0,Math.PI*2);ctx.fill();ctx.fillStyle='#454b3b';ctx.fillRect(-15,-88,5,7);ctx.fillRect(12,-88,5,7);}ctx.restore();}
function stump(x,y){ctx.save();const bark=ctx.createLinearGradient(x-50,0,x+50,0);bark.addColorStop(0,'#9a764c');bark.addColorStop(.4,'#ba9562');bark.addColorStop(.8,'#99744c');bark.addColorStop(1,'#826341');ctx.fillStyle=bark;ctx.beginPath();ctx.moveTo(x-48,y);ctx.bezierCurveTo(x-48,y+75,x-50,y+131,x-74,y+166);ctx.lineTo(x+75,y+166);ctx.bezierCurveTo(x+48,y+115,x+48,y+40,x+48,y);ctx.closePath();ctx.fill();ctx.lineWidth=2;for(let i=-36;i<44;i+=12){ctx.strokeStyle=i%3?'#80633d88':'#d3b47a88';ctx.beginPath();ctx.moveTo(x+i,y+10);ctx.bezierCurveTo(x+i-9,y+52,x+i+10,y+93,x+i*1.3,y+155);ctx.stroke();}ctx.fillStyle='#e3c48c';ctx.beginPath();ctx.ellipse(x,y,50,12,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b99961';ctx.lineWidth=1.4;for(let r=12;r<49;r+=11){ctx.beginPath();ctx.ellipse(x,y,r,r*.21,0,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#80906288';for(let i=0;i<8;i++){ctx.beginPath();ctx.ellipse(x-43+(i%3)*5,y+70+i*7,6,4,0,0,7);ctx.fill();}ctx.restore();}
function drawPowerMeter(hero){
  const power=+$('power').value/100,x=hero.x-91,y=hero.y-137,w=18,h=120;
  ctx.save();ctx.globalAlpha=phase==='aim'?1:.68;
  ctx.fillStyle='#fffaf073';ctx.strokeStyle='#fffbea';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(x,y,w,h,9);ctx.fill();ctx.stroke();
  const gradient=ctx.createLinearGradient(0,y,0,y+h);
  gradient.addColorStop(0,'#ef675b');gradient.addColorStop(.5,'#568ee9');gradient.addColorStop(1,'#62bf85');
  ctx.save();ctx.beginPath();ctx.roundRect(x+2,y+2,w-4,h-4,7);ctx.clip();
  ctx.fillStyle=gradient;ctx.fillRect(x+2,y+h-power*(h-3),w-4,power*(h-3));
  ctx.fillStyle='#ffffff44';ctx.fillRect(x+4,y+2,3,h-4);ctx.restore();
  ctx.strokeStyle='#fff9e8';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.ellipse(x+w/2,y+3,w/2,4,0,0,Math.PI*2);ctx.stroke();
  for(const fraction of [.25,.5,.75]){ctx.beginPath();ctx.moveTo(x+w+4,y+h*(1-fraction));ctx.lineTo(x+w+9,y+h*(1-fraction));ctx.stroke();}
  ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillStyle='#3c5639';ctx.fillText(Math.round(power*100)+'%',x+w/2,y-13);
  ctx.font='11px system-ui';ctx.fillText('力度',x+w/2,y+h+18);ctx.restore();
}
function drawAimArc(hero){
  let x=hero.x+30,y=hero.y-68;
  const speed=+$('power').value*4.5,a=+$('angle').value*Math.PI/180;
  let vx=speed*Math.cos(a),vy=-speed*Math.sin(a);
  ctx.save();ctx.strokeStyle='#fffce8';ctx.lineWidth=3;ctx.lineCap='round';ctx.setLineDash([4,10]);ctx.lineDashOffset=-clock*12;
  ctx.shadowColor='#5a714e66';ctx.shadowBlur=3;ctx.beginPath();ctx.moveTo(x,y);
  for(let i=0;i<240;i++){
    const dt=1/120;vx+=levels[lvl][2]*dt;x+=vx*dt;y+=vy*dt;vy+=200*dt;
    ctx.lineTo(x,y);if(y>450||x>880)break;
  }
  ctx.stroke();ctx.restore();
}
function draw(){ctx.clearRect(0,0,900,470);if(bg.complete&&bg.naturalWidth)ctx.drawImage(bg,0,0,900,470);else{ctx.fillStyle='#e9eddc';ctx.fillRect(0,0,900,470);ctx.fillStyle='#cbd8b9';ctx.beginPath();ctx.ellipse(450,520,700,200,0,0,7);ctx.fill();}const e=target(true),p=target(false);stump(p.x,p.y+1);stump(e.x,e.y+1);if(shield&&phase!=='welcome'){ctx.strokeStyle='#9bbfc29c';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p.x,p.y-54,53,68,0,0,7);ctx.stroke();}const f=Math.min(fall*220,230);sprite(p.x,p.y,cat,false,playerFlash>0?.55:1,phase==='lose'?f:0);sprite(e.x,e.y,cat==='gold'?'blue':'gold',true,enemyFlash>0?.55:1,phase==='win'?f:0);
if(['aim','player-flight','enemy-wait','enemy-flight'].includes(phase))drawPowerMeter(p);
if(phase==='aim')drawAimArc(p);

if(projectile){const s=projectile;ctx.strokeStyle='#fff8d6b0';ctx.lineWidth=2;ctx.beginPath();s.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.atan2(s.vy,s.vx));ctx.strokeStyle='#82633c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-25,0);ctx.lineTo(7,0);ctx.stroke();ctx.fillStyle='#e8e8c5';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(4,-5);ctx.lineTo(4,5);ctx.fill();ctx.restore();}particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,5,5);});ctx.globalAlpha=1;floaters.forEach(p=>{ctx.globalAlpha=Math.min(1,p.life);ctx.font='bold 22px system-ui';ctx.fillStyle='#a05c3c';ctx.textAlign='center';ctx.fillText(p.text,p.x,p.y);});ctx.globalAlpha=1;}
function loop(t){const dt=Math.min(.1,(t-last)/1000||0);last=t;if(!paused){clock+=dt;enemyFlash=Math.max(0,enemyFlash-dt);playerFlash=Math.max(0,playerFlash-dt);if(phase==='enemy-wait'){turnTime-=dt;if(turnTime<=0)shot(true);}if(phase==='win'||phase==='lose'){fall+=dt;turnTime-=dt;if(turnTime<=0){if(phase==='win'&&lvl===9)openRewards();else $('result').classList.remove('hidden');}}if(projectile){let s=projectile;for(let j=0;j<3&&projectile;j++){const d=dt/3;s.vx+=levels[lvl][2]*d;s.x+=s.vx*d;s.y+=s.vy*d;s.vy+=200*d;const t=target(!s.enemy);if(Math.abs(s.x-t.x)<30&&s.y>t.y-108&&s.y<t.y-5){resolve(true,s.y<t.y-70);}else if(s.y>470||s.x>960||s.x< -60){resolve(false);}}if(projectile){s.trail.push({x:s.x,y:s.y});if(s.trail.length>18)s.trail.shift();}}particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=100*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);floaters.forEach(p=>{p.y-=35*dt;p.life-=dt;});floaters=floaters.filter(p=>p.life>0);}draw();requestAnimationFrame(loop);}
$('startBtn').onclick=()=>start(Math.min(saved.unlocked-1,9));$('startBtn').innerHTML=`开始第 ${saved.unlocked} 关 <span>↗</span>`;$('throwBtn').onclick=()=>shot();$('nextBtn').onclick=()=>{if(phase==='win'&&lvl===9)openRewards();else start(phase==='win'?lvl+1:lvl);};$('againBtn').onclick=()=>start(lvl);$('retryBtn').onclick=()=>start(lvl);$('pauseBtn').onclick=pause;$('resumeBtn').onclick=pause;
for(const id of ['angle','power'])$(id).oninput=syncAimReadout;document.querySelectorAll('.hero,.mini-cat').forEach(b=>b.onclick=()=>select(b.dataset.cat));$('helpBtn').onclick=()=>{if(!paused&&['aim','player-flight','enemy-wait','enemy-flight'].includes(phase)){pause();$('help').dataset.resume='1';}$('help').showModal();};function closeHelp(){$('help').close();if($('help').dataset.resume==='1'&&paused)pause();delete $('help').dataset.resume;}$('closeHelp').onclick=closeHelp;$('gotIt').onclick=closeHelp;$('help').addEventListener('cancel',e=>{e.preventDefault();closeHelp();});$('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').textContent=sound?'♫':'♪';$('soundBtn').setAttribute('aria-label',sound?'关闭声音':'开启声音');$('soundBtn').style.background=sound?'#e4e9d9':'transparent';tone();};
function canvasPoint(event){
  const rect=canvas.getBoundingClientRect();
  const rotated=window.matchMedia('(max-width:700px) and (orientation:portrait)').matches;
  return rotated?{x:(event.clientY-rect.top)/rect.height*900,y:(rect.right-event.clientX)/rect.width*470}
    :{x:(event.clientX-rect.left)/rect.width*900,y:(event.clientY-rect.top)/rect.height*470};
}
function syncAimReadout(){
  $('angleOut').textContent=$('angle').value;
  $('powerOut').textContent=$('power').value;
  $('touchAngle').textContent=$('angle').value+'°';
  $('touchPower').textContent=$('power').value+'%';
}
function pullAim(point){
  const hero=target(false),dx=point.x-hero.x,dy=point.y-(hero.y-68);
  const distance=Math.hypot(dx,dy);
  // Pulling downward raises the launch arc; distance from the cat controls power.
  const angle=Math.atan2(Math.max(0,dy),Math.max(1,Math.abs(dx)))*180/Math.PI;
  $('angle').value=Math.round(Math.max(15,Math.min(75,angle)));
  $('power').value=Math.round(Math.max(0,Math.min(100,distance/260*100)));
  syncAimReadout();
  return distance;
}
canvas.onpointerdown=event=>{
  if(phase!=='aim'||paused||drag||event.isPrimary===false||(event.button!==undefined&&event.button!==0))return;
  event.preventDefault();
  drag={pointerId:event.pointerId};
  pullAim(canvasPoint(event));
  canvas.setPointerCapture(event.pointerId);
};
canvas.onpointermove=event=>{
  if(!drag||event.pointerId!==drag.pointerId||phase!=='aim'||paused)return;
  event.preventDefault();pullAim(canvasPoint(event));
};
canvas.onpointerup=event=>{
  if(!drag||event.pointerId!==drag.pointerId)return;
  event.preventDefault();
  const distance=pullAim(canvasPoint(event));
  drag=null;
  if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  if(distance>=18)shot();
};
canvas.onpointercancel=()=>{drag=null;};
canvas.onlostpointercapture=()=>{drag=null;};
window.addEventListener('resize',()=>{drag=null;});
window.addEventListener('orientationchange',()=>{drag=null;});
$('fullscreenBtn').onclick=async()=>{
  try{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    await document.documentElement.requestFullscreen();
    if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape').catch(()=>{});
  }catch{setStatus('已适配横屏，可直接继续游戏。');}
};
document.addEventListener('keydown',e=>{if($('help').open||/INPUT|BUTTON/.test(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();shot();}if(e.code==='KeyP')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&['aim','player-flight','enemy-wait','enemy-flight'].includes(phase))pause();});
select(cat);map();hud();syncAimReadout();requestAnimationFrame(loop);
