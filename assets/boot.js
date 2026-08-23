const target=sessionStorage.getItem('southMusicRedirect');if(target&&location.pathname==='/music/'){sessionStorage.removeItem('southMusicRedirect');history.replaceState({},'',target)}
