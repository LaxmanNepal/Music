/* SOUTH MUSIC — YouTube discovery adapter. Metadata/discovery only. Never extracts audio. */
(function(){'use strict';
const cfg=window.SOUTH_MUSIC_CONFIG||{};const key=String(cfg.youtubeApiKey||'').trim();const base='https://www.googleapis.com/youtube/v3';
function cache(k){try{const x=JSON.parse(localStorage.getItem('southYouTube:'+k)||'null');return x&&Date.now()-x.at<600000?x.data:null}catch(_){return null}}
function save(k,d){try{localStorage.setItem('southYouTube:'+k,JSON.stringify({at:Date.now(),data:d}))}catch(_){}return d}
async function search(q,maxResults=12){if(!key||!q)return[];const ck='search:'+q+':'+maxResults,h=cache(ck);if(h)return h;try{const u=new URL(base+'/search');u.search=new URLSearchParams({part:'snippet',q,type:'video',maxResults:String(maxResults),key});const r=await fetch(u,{credentials:'omit'});if(!r.ok)throw Error('YouTube '+r.status);const j=await r.json();const out=(j.items||[]).map(x=>({id:'youtube-'+x.id.videoId,title:x.snippet.title,artistName:x.snippet.channelTitle,artistId:null,albumId:null,language:null,genres:[],moods:[],durationSeconds:0,artwork:x.snippet.thumbnails&&((x.snippet.thumbnails.high||x.snippet.thumbnails.medium||x.snippet.thumbnails.default).url)||null,audio:null,source:{provider:'YouTube',url:'https://www.youtube.com/watch?v='+x.id.videoId,license:null,streamingAllowed:false,discoveryOnly:true},external:{youtubeVideoId:x.id.videoId,watchUrl:'https://www.youtube.com/watch?v='+x.id.videoId}}));return save(ck,out)}catch(_){return[]}}
window.SOUTH_YOUTUBE={isConfigured:()=>!!key,search};
})();
