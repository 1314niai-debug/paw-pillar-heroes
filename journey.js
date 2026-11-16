'use strict';
const rewardPool = [
  {id:'gold-hero',cat:'gold',name:'奶糖 · 勇气英雄',type:'COURAGE / 01',description:'把小小的勇气，握成一片闪亮的叶子。',image:'assets/rewards/gold-hero.webp'},
  {id:'gold-heart',cat:'gold',name:'奶糖 · 暖心守护',type:'WITH LOVE / 02',description:'把森林里的暖意，留给最重要的你。',image:'assets/rewards/gold-heart.webp'},
  {id:'gold-dream',cat:'gold',name:'奶糖 · 星梦旅人',type:'DAYDREAM / 03',description:'勇敢过后，安心做一个金色的梦。',image:'assets/rewards/gold-dream.webp'},
  {id:'blue-hero',cat:'blue',name:'蓝莓 · 勇气英雄',type:'COURAGE / 04',description:'稳稳站住，也能成为自己的小英雄。',image:'assets/rewards/blue-hero.webp'},
  {id:'blue-heart',cat:'blue',name:'蓝莓 · 暖心守护',type:'WITH LOVE / 05',description:'柔软的拥抱，是藏在心里的守护。',image:'assets/rewards/blue-heart.webp'},
  {id:'blue-dream',cat:'blue',name:'蓝莓 · 星梦旅人',type:'DAYDREAM / 06',description:'枕着月亮，收好今天所有的快乐。',image:'assets/rewards/blue-dream.webp'}
];
let selectedReward = null;
let openingSequence = 0;
let openingTimer = null;
const findReward = id => rewardPool.find(item => item.id === id);
function randomIndex(length) {
  if (window.crypto && window.crypto.getRandomValues) {
    const values = new Uint32Array(1);
    const ceiling = Math.floor(0x100000000 / length) * length;
    do { window.crypto.getRandomValues(values); } while (values[0] >= ceiling);
    return values[0] % length;
  }
  return Math.floor(Math.random() * length);
}
function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function validRewardState(reward) {
  return reward && ['choosing','finished'].includes(reward.status)
    && Array.isArray(reward.candidates) && reward.candidates.length === 3
    && new Set(reward.candidates).size === 3
    && reward.candidates.every(id => !!findReward(id))
    && (reward.status !== 'finished' || reward.candidates.includes(reward.selected));
}
function prepareRewards() {
  // Two cat families are always represented; the third collectible is random.
  const gold = rewardPool.filter(item => item.cat === 'gold');
  const blue = rewardPool.filter(item => item.cat === 'blue');
  const first = gold[randomIndex(gold.length)];
  const second = blue[randomIndex(blue.length)];
  const remainder = rewardPool.filter(item => item.id !== first.id && item.id !== second.id);
  const third = remainder[randomIndex(remainder.length)];
  saved.reward = {status:'choosing', candidates:shuffled([first.id,second.id,third.id]), selected:null};
  selectedReward = null;
  save();
}
function openRewards() {
  if (!validRewardState(saved.reward)) prepareRewards();
  phase = saved.reward.status === 'finished' ? 'ended' : 'reward';
  paused = false;
  projectile = null;
  drag = null;
  $('result').classList.add('hidden');
  $('welcome').classList.add('hidden');
  $('pauseLayer').classList.add('hidden');
  hud();
  const dialog = $('rewardDialog');
  if (saved.reward.status === 'finished') {
    showEnding();
    return;
  }
  $('rewardChoose').classList.remove('hidden');
  $('rewardEnding').classList.add('hidden');
  dialog.setAttribute('aria-labelledby','rewardHeading');
  selectedReward = null;
  $('rewardCards').innerHTML = saved.reward.candidates.map((id,index) => {
    const item = findReward(id);
    return `<button class="reward-card ${item.cat}" data-reward="${item.id}" aria-pressed="false"><span class="reward-number">0${index+1} <span>${item.cat === 'gold'?'金渐层':'蓝猫'}</span></span><span class="toy-frame"><img src="${item.image}" alt="${item.name}的3D立体手办" decoding="async"></span><span class="toy-type">${item.type}</span><h3>${item.name}</h3><p>${item.description}</p><span class="reward-pick">选择这位伙伴 <span>＋</span></span></button>`;
  }).join('');
  $('rewardHint').textContent = '点击你喜欢的手办，再确认收藏。';
  $('confirmReward').textContent = '请选择一款手办';
  $('confirmReward').disabled = true;
  document.querySelectorAll('[data-reward]').forEach(button => {
    button.onclick = () => chooseReward(button.dataset.reward);
  });
  if (!dialog.open) dialog.showModal();
  setStatus('十关通关！选择一款纪念手办，完成这次冒险。');
}
function chooseReward(id) {
  if (phase !== 'reward' || !saved.reward.candidates.includes(id)) return;
  selectedReward = id;
  const item = findReward(id);
  document.querySelectorAll('[data-reward]').forEach(button => {
    const selected = button.dataset.reward === id;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('.reward-pick').innerHTML = selected ? '已选择 <span>✓</span>' : '选择这位伙伴 <span>＋</span>';
  });
  $('rewardHint').textContent = `你选中了「${item.name}」。`;
  $('confirmReward').textContent = '确认收藏，结束冒险 →';
  $('confirmReward').disabled = false;
  tone(750,.12);
}
function confirmReward() {
  if (phase !== 'reward' || !selectedReward || !saved.reward.candidates.includes(selectedReward)) return;
  saved.reward = {...saved.reward,status:'finished',selected:selectedReward};
  save();
  showEnding();
  tone(880,.25);
}
function showEnding() {
  const item = findReward(saved.reward.selected);
  if (!item) return;
  phase = 'ended';
  paused = false;
  projectile = null;
  $('rewardChoose').classList.add('hidden');
  $('rewardEnding').classList.remove('hidden');
  $('endingToy').src = item.image;
  $('endingToy').alt = `${item.name}的3D立体手办，已收藏`;
  $('endingName').textContent = item.name;
  $('endingDescription').textContent = item.description;
  $('rewardDialog').setAttribute('aria-labelledby','endingName');
  if (!$('rewardDialog').open) $('rewardDialog').showModal();
  $('rewardDialog').scrollTop = 0;
  $('replayAdventure').focus({preventScroll:true});
  setStatus('纪念手办已收藏，本次游戏已结束。');
  hud();
}
function waitForImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = src;
    if (img.complete) resolve();
  });
}
async function playOpening(onComplete) {
  const sequence = ++openingSequence;
  clearTimeout(openingTimer);
  phase = 'intro';
  paused = false;
  projectile = null;
  $('opening').classList.remove('hidden','playing');
  $('openingCaption').textContent = '正在叫醒两位小英雄…';
  hud();
  // Begin the two-second scene only after the sprites are ready to appear.
  await Promise.all([waitForImage('assets/intro-cats.webp'),waitForImage('assets/forest.webp')]);
  if (sequence !== openingSequence) return;
  $('openingCaption').textContent = '击个掌，把快乐带进森林！';
  $('opening').classList.add('playing');
  openingTimer = setTimeout(() => {
    if (sequence !== openingSequence) return;
    $('opening').classList.add('hidden');
    $('opening').classList.remove('playing');
    phase = 'welcome';
    hud();
    onComplete();
  },2000);
}
function beginNewAdventure() {
  if (phase !== 'ended') return;
  delete saved.reward;
  save();
  selectedReward = null;
  $('rewardDialog').close();
  $('welcome').classList.add('hidden');
  playOpening(() => start(0));
}
$('confirmReward').onclick = confirmReward;
$('replayAdventure').onclick = beginNewAdventure;
$('rewardDialog').addEventListener('cancel',event => event.preventDefault());
// Older saves that have already completed the forest receive the new reward too.
if (saved.stars[9] && !validRewardState(saved.reward)) prepareRewards();
playOpening(() => {
  if (saved.stars[9] && validRewardState(saved.reward)) openRewards();
  else {setStatus('好伙伴已就位！选好角色，开始你的森林冒险。');$('startBtn').focus({preventScroll:true});}
});
