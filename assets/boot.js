const APP_ROOT=new URL('../',import.meta.url).pathname.replace(/\/$/,'/');
const target=sessionStorage.getItem('southMusicRedirect');if(target&&location.pathname===APP_ROOT){sessionStorage.removeItem('southMusicRedirect');history.replaceState({},'',target)}
const NativeAudio=window.Audio;window.Audio=function(){const a=new NativeAudio();a.id='south-audio';a.preload='metadata';a.style.display='none';if(!document.getElementById('south-audio'))document.body.appendChild(a);return a};window.Audio.prototype=NativeAudio.prototype;
