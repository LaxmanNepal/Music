const APP_ROOT=new URL('../',import.meta.url).pathname.replace(/\/$/,'/');
const target=sessionStorage.getItem('southMusicRedirect');
if(target&&location.pathname===APP_ROOT){sessionStorage.removeItem('southMusicRedirect');history.replaceState({},'',target)}

const NativeAudio=window.Audio;
const RESUME_KEY='southMusicResumeBySource';
const readResume=()=>{try{return JSON.parse(localStorage.getItem(RESUME_KEY)||'{}')}catch{return {}}};
const writeResume=v=>{try{localStorage.setItem(RESUME_KEY,JSON.stringify(v))}catch{}};
const nativeSrc=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');

window.Audio=function(){
  const a=new NativeAudio();
  a.id='south-audio';
  a.preload='metadata';
  a.style.display='none';
  a.setAttribute('aria-hidden','true');
  if(!document.getElementById('south-audio'))document.body.appendChild(a);

  let sourceKey='';
  let restored=false;
  let lastSaved=0;
  const save=()=>{
    if(!sourceKey||!Number.isFinite(a.currentTime)||a.currentTime<=0)return;
    const map=readResume();
    map[sourceKey]={position:a.currentTime,duration:Number.isFinite(a.duration)?a.duration:0,lastPlayed:new Date().toISOString()};
    writeResume(map);
    lastSaved=a.currentTime;
  };
  if(nativeSrc){
    Object.defineProperty(a,'src',{
      configurable:true,
      enumerable:true,
      get:()=>nativeSrc.get.call(a),
      set:value=>{
        sourceKey=String(value||'');
        restored=false;
        nativeSrc.set.call(a,value);
      }
    });
  }
  a.addEventListener('loadedmetadata',()=>{
    if(restored||!sourceKey)return;
    restored=true;
    const item=readResume()[sourceKey];
    const duration=a.duration||0;
    if(item&&item.position>3&&(!duration||item.position<duration-5)){
      try{a.currentTime=Math.min(item.position,Math.max(0,duration-5||item.position))}catch{}
    }
  });
  a.addEventListener('timeupdate',()=>{if(Math.abs(a.currentTime-lastSaved)>=5)save()});
  a.addEventListener('pause',save);
  a.addEventListener('ended',()=>{if(sourceKey){const map=readResume();delete map[sourceKey];writeResume(map)}});
  a.addEventListener('error',save);
  window.addEventListener('pagehide',save,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save()},{passive:true});
  const storedVolume=Number(localStorage.getItem('southMusicVolume'));
  if(Number.isFinite(storedVolume)&&storedVolume>=0&&storedVolume<=1)a.volume=storedVolume;
  return a;
};
window.Audio.prototype=NativeAudio.prototype;
