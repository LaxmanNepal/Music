/* SOUTH MUSIC — merges the live Audius catalog into the existing static catalog.
 * This bridge keeps the existing app architecture intact while adding real live tracks.
 */
(function(){
  'use strict';
  const source=window.SOUTH_AUDIO_SOURCE;
  if(!source)return;
  const nativeFetch=window.fetch.bind(window);
  let songsPromise=null, artistsPromise=null;
  const mergeById=(local,live)=>{
    const out=[],seen=new Set();
    [...(live||[]),...(local||[])].forEach(x=>{if(!x||seen.has(x.id))return;seen.add(x.id);out.push(x)});
    return out;
  };
  const liveSongs=()=>songsPromise||(songsPromise=source.fetchAudiusTracks('').catch(()=>[]));
  const liveArtists=()=>artistsPromise||(artistsPromise=source.fetchAudiusArtists('').catch(()=>[]));
  window.SOUTH_MUSIC_LIVE={reload:()=>{songsPromise=null;artistsPromise=null}};
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const response=await nativeFetch(input,init);
    if(!response.ok||!/\/data\/(songs|artists)\.json(?:\?|$)/.test(url))return response;
    try{
      const local=await response.clone().json();
      if(/\/data\/songs\.json(?:\?|$)/.test(url)){
        const live=await liveSongs();
        return new Response(JSON.stringify(mergeById(local,live)),{status:200,headers:{'Content-Type':'application/json'}});
      }
      const live=await liveArtists();
      return new Response(JSON.stringify(mergeById(local,live)),{status:200,headers:{'Content-Type':'application/json'}});
    }catch(_){return response}
  };
})();
