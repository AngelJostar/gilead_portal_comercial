(() => {
  const account=window.portalAccount;
  const previous=sessionStorage.getItem('portal-account-id');
  if(previous!==account.id){
    const purge=Object.keys(sessionStorage).filter(k=>k.startsWith('gilead.')||k==='gileadAdminUsers');
    purge.forEach(k=>sessionStorage.removeItem(k));
    sessionStorage.setItem('portal-account-id',account.id);
  }
  let checking=false;
  async function refreshSession(){
    if(checking||document.visibilityState==='hidden')return;
    checking=true;
    try {
      const response=await fetch('/api/me',{cache:'no-store'});
      if(response.status===401||response.status===403)location.replace('/login');
      else if(response.ok){
        const current=await response.json();
        if(current.id!==account.id||current.role!==account.role||current.centerId!==account.centerId)
          location.replace('/login');
      }
    } finally { checking=false; }
  }
  window.portalLogout=async()=>{
    const response=await fetch('/api/logout',{method:'POST'});
    if(response.ok){sessionStorage.removeItem('portal-account-id');location.replace('/login');}
  };
  for(const event of ['focus','pageshow'])window.addEventListener(event,refreshSession);
  document.addEventListener('visibilitychange',refreshSession);
  setInterval(refreshSession,10000);
})();
