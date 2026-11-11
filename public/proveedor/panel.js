const $=id=>document.getElementById(id);
const {safe,stages,badge,details}=window.SupplyView;
let orders=[],selected='Todas';
const actions={
  Solicitada:{next:'Registrada',button:'Registrar orden',reference:'Folio interno del distribuidor'},
  Registrada:{next:'Surtida',button:'Registrar surtimiento',reference:'Número de remisión'},
  Surtida:{next:'Entregada',button:'Confirmar entrega',reference:'Referencia del acuse de entrega'}
};
async function request(path,body){
  const response=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
  if(response.status===401){location.replace('/login');throw Error('Inicia sesión.');}
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'No se pudo actualizar la orden.');
  return result;
}
async function load(){
  const result=await request('/api/supplier');
  orders=result.orders;
  $('supplierName').textContent=result.supplier;
  renderList();
}
function renderList(){
  const query=$('query').value.trim().toLocaleLowerCase('es');
  const rows=orders.filter(o=>(selected==='Todas'||selected===o.status)&&
    [o.folio,o.center,o.patient,o.patientName,o.medication].join(' ').toLocaleLowerCase('es').includes(query));
  $('states').replaceChildren(...['Todas',...stages].map(stage=>{
    const a=document.createElement('a');a.href='#'+encodeURIComponent(stage);
    a.textContent=stage+(stage==='Todas'?'':' · '+orders.filter(o=>o.status===stage).length);
    if(stage===selected)a.setAttribute('aria-current','page');
    return a;
  }));
  $('count').textContent=rows.length+' '+(rows.length===1?'orden':'órdenes');
  if(!rows.length){$('list').innerHTML='<p class="empty">No hay órdenes para esta selección.</p>';return;}
  $('list').innerHTML='<table><thead><tr><th>Orden</th><th>Centro solicitante</th><th>Paciente</th><th>Medicamento</th><th>Infusión prevista</th><th>Estado</th></tr></thead><tbody>'+
    rows.map(o=>'<tr><td><button class="order-link" data-order="'+o.id+'">'+safe(o.folio)+'</button></td><td>'+safe(o.center)+'</td>'+
      '<td><div class="paired">'+safe(o.patientName||o.patient)+'<small>'+safe(o.patientName?o.patient:'')+'</small></div></td>'+
      '<td>'+safe(o.medication)+' · '+safe(o.quantity)+'</td><td>'+safe(o.day)+'</td><td>'+badge(o.status)+'</td></tr>').join('')+'</tbody></table>';
}
function openOrder(id){
  const o=orders.find(x=>x.id===id);if(!o)return;
  $('title').textContent='Orden '+o.folio;
  const action=actions[o.status];
  $('detail').innerHTML=details(o)+(action?
    '<form class="dialog-foot"><h3>'+safe(action.button)+'</h3><div class="fields">'+
    '<label class="field">'+safe(action.reference)+'<input name="reference" required maxlength="100"></label>'+
    (action.next==='Surtida'?'<label class="field">Lote de Trodelvy<input name="lot" required maxlength="80"></label>':'')+
    '<label class="field full">Observaciones (opcional)<textarea name="notes" maxlength="450"></textarea></label></div>'+
    '<p class="error" role="alert"></p><div class="actions"><button class="primary">'+safe(action.button)+'</button></div></form>':'');
  if(!$('order').open)$('order').showModal();
  if(!action)return;
  const form=$('detail').querySelector('form'),requestId=crypto.randomUUID();
  form.onsubmit=async e=>{
    e.preventDefault();
    const save=form.querySelector('button');save.disabled=true;
    try{
      await request('/api/supplier/orders/'+id+'/events',{...Object.fromEntries(new FormData(form)),status:action.next,requestId});
      await load();openOrder(id);
    }catch(error){form.querySelector('.error').textContent=error.message;save.disabled=false;}
  };
}
function changeFilter(){
  const hash=location.hash.slice(1);
  selected=stages.includes(hash)?hash:'Todas';renderList();
}
$('account').textContent=window.portalAccount.name;$('logout').onclick=()=>window.portalLogout();
$('list').onclick=e=>{const b=e.target.closest('[data-order]');if(b)openOrder(Number(b.dataset.order));};
$('order').querySelector('.close').onclick=()=>$('order').close();
$('reload').onclick=()=>load().catch(error=>$('feedback').textContent=error.message);
$('query').oninput=renderList;window.addEventListener('hashchange',changeFilter);
changeFilter();load().catch(error=>$('feedback').textContent=error.message);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('order').open)$('reload').click();});
