const $=id=>document.getElementById(id);
const views={
  tratamientos:{title:'Tratamientos'},
  pacientes:{title:'Pacientes',kind:'patient',single:'paciente',field:'Folio del paciente',detail:'Referencia del centro'},
  medicos:{title:'Médicos',kind:'doctor',single:'médico',field:'Nombre del médico',detail:'Especialidad'},
  distribuidores:{title:'Distribuidores',kind:'distributor',single:'distribuidor',field:'Nombre del distribuidor',detail:'Referencia de contacto'}
};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=null,section='tratamientos',messageTimer;
function message(text){$('feedback').textContent=text;clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('feedback').textContent='',3600);}
async function api(url,body){
  const response=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
  if(response.status===401){location.replace('/login');throw Error('Sesión terminada');}
  const value=await response.json();if(!response.ok)throw Error(value.error||'Error al guardar.');return value;
}
async function refresh(){state=await api('/api/client');$('center').textContent=state.center;render();}
function table(columns,rows){
  return '<table><thead><tr>'+columns.map(s=>'<th>'+escapeHtml(s)+'</th>').join('')+'</tr></thead><tbody>'+
    rows.map(row=>'<tr>'+row.map(value=>'<td>'+value+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
function matches(values){
  const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return normalize(values.join(' ')).includes(normalize($('search').value.trim()));
}
function render(){
  section=Object.hasOwn(views,location.hash.slice(1))?location.hash.slice(1):'tratamientos';
  const view=views[section];
  document.querySelectorAll('nav a').forEach(a=>a.hash==='#'+section?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  $('viewTitle').textContent=view.title;$('addRecord').hidden=!view.kind;
  if(!state)return;
  let rows,cols;
  if(view.kind){
    $('addRecord').textContent='Registrar '+view.single;
    const items=state.contacts.filter(x=>x.kind===view.kind && matches([x.label,x.detail,x.patientName]));
    cols=view.kind==='patient'?['Folio','Nombre del paciente',view.detail,'Acciones']:[view.field,view.detail,'Acciones'];
    rows=items.map(x=>{
      const ficha=view.kind==='distributor'?'':'<button class="link" data-profile="'+escapeHtml(x.id)+'">Ver ficha</button>';
      const actions='<div class="record-actions">'+ficha+'<button class="link" data-history="'+escapeHtml(x.id)+'">Ver tratamientos</button></div>';
      return [escapeHtml(x.label),...(view.kind==='patient'?[escapeHtml(x.patientName||'—')]:[]),escapeHtml(x.detail||'—'),actions];
    });
  }else{
    cols=['Fecha de infusión','Tratamiento','Paciente','Distribuidor','Orden de surtimiento'];
    rows=state.treatments.map(t=>({t,order:state.orders.find(o=>o.treatmentId===t.id)}))
      .filter(({t,order})=>matches([t.day,t.name,t.medication,t.patient,t.patientName,t.doctor,t.distributor,order?.folio,order?.status]))
      .map(({t,order})=>[escapeHtml(t.day),pair(t.name,t.medication+' · '+t.quantity),pair(t.patientName||t.patient,t.patientName?t.patient:t.patientDetail||''),
        escapeHtml(t.distributor),order?'<div class="paired"><button class="order-link" data-order="'+order.id+'">'+escapeHtml(order.folio)+'</button>'+SupplyView.badge(order.status)+'</div>':'Registro previo · sin orden']);

  }
  $('count').textContent=rows.length+' registros';$('content').innerHTML=rows.length?table(cols,rows):'<p class="empty">Sin registros para esta vista.</p>';
}
function pair(label,detail){return '<div class="paired"><strong>'+escapeHtml(label)+'</strong><small>'+escapeHtml(detail)+'</small></div>';}
function openDialog(title,content){
  $('dialogTitle').textContent=title;$('dialogContent').innerHTML=content;
  if(!$('entry').open)$('entry').showModal();
}
function field(label,input,full=false){return '<label class="field'+(full?' full':'')+'">'+label+input+'</label>';}
const input=(name,max,required=true)=>'<input name="'+name+'" maxlength="'+max+'" '+(required?'required':'')+'>';
function form(title,fields,path,after,submitLabel='Guardar'){
  openDialog(title,'<form><div class="fields">'+fields+'</div><p class="error" role="alert"></p><div class="actions"><button type="button" data-cancel>Cancelar</button><button class="primary">'+escapeHtml(submitLabel)+'</button></div></form>');
  const node=$('dialogContent').querySelector('form');
  const requestId=crypto.randomUUID();
  node.querySelector('[data-cancel]').onclick=()=>$('entry').close();
  node.onsubmit=async e=>{
    e.preventDefault();
    const save=node.querySelector('.primary');save.disabled=true;
    try{
      const result=await api(path,{...Object.fromEntries(new FormData(node)),requestId});
      await refresh();$('entry').close();message(result.folio?'Orden '+result.folio+' generada':'Registro guardado');after?.(result);
    }catch(error){node.querySelector('.error').textContent=error.message;}
    finally{save.disabled=false;}
  };
}
function supplierSelect(){
  return '<select name="supplierId" required><option value="">Seleccionar distribuidor</option>'+
    state.suppliers.map(s=>'<option value="'+escapeHtml(s.id)+'">'+escapeHtml(s.name)+'</option>').join('')+'</select>';
}
function contactForm(view,after){
  const isDistributor=view.kind==='distributor';
  if(isDistributor&&!state.suppliers.length){message('Pide a un administrador que registre una cuenta de distribuidor.');return;}
  const identity=isDistributor?field('Distribuidor del portal',supplierSelect(),true):field(view.field,input('label',140),true);
  const patient=view.kind==='patient'?field('Nombre del paciente o alias',input('patientName',140),true):'';
  form('Registrar '+view.single,'<input type="hidden" name="kind" value="'+view.kind+'">'+
    identity+patient+field(view.detail+' (opcional)',input('detail',180,false),true),'/api/client/contacts',after);
}
function showOrder(id){
  const order=state.orders.find(o=>o.id===Number(id));
  if(order)openDialog('Orden '+order.folio,SupplyView.details(order));
}
function newTreatment(){
  if(!state)return;
  const patient=contactEditor('patient',state.contacts);
  const doctor=contactEditor('doctor',state.contacts);
  const today=new Date();
  today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
  const noSupplier=!state.suppliers.length;
  const fields=field('Medicamento','<input readonly name="medication" value="Trodelvy">')+
    field('Fecha prevista de infusión','<input type="date" name="day" required value="'+today.toISOString().slice(0,10)+'">')+
    field('Tratamiento solicitado','<input name="name" value="Infusión de Trodelvy" maxlength="140" required>')+
    field('Cantidad y unidad solicitadas',input('quantity',80))+
    field('Distribuidor que surtirá la orden',supplierSelect(),true)+
    field('Notas del centro (opcional)','<textarea name="notes" maxlength="700"></textarea>',true);
  openDialog('Nueva infusión','<form class="infusion-form" autocomplete="off"><div class="contact-sections"></div>'+
    '<section class="capture-section"><h3>Infusión y surtimiento</h3><div class="fields">'+fields+'</div>'+
    (noSupplier?'<p class="error">Se requiere un distribuidor activo para generar la orden.</p>':'')+'</section>'+
    '<footer class="capture-foot"><p class="error" role="alert"></p><div class="actions"><button type="button" data-cancel>Cancelar</button>'+
    '<button class="primary" type="submit"'+(noSupplier?' disabled':'')+'>Generar orden de surtimiento</button></div></footer></form>');
  const form=$('dialogContent').querySelector('form'),requestId=crypto.randomUUID();
  form.querySelector('.contact-sections').append(patient.element,doctor.element);
  form.querySelector('[data-cancel]').onclick=()=>$('entry').close();
  form.onsubmit=async event=>{
    event.preventDefault();
    const save=form.querySelector('[type=submit]'),error=form.querySelector('[role=alert]');
    save.disabled=true;error.textContent='';
    try{
      const payload={...Object.fromEntries(new FormData(form)),requestId,patientRecord:patient.read(),doctorRecord:doctor.read()};
      const result=await api('/api/client/treatments',payload);
      await refresh();
      $('entry').close();location.hash='tratamientos';
      message('Orden '+result.folio+' generada');showOrder(result.orderId);
    }catch(problem){error.textContent=problem.message;}
    finally{save.disabled=noSupplier;}
  };
}
$('content').onclick=e=>{
  const ficha=e.target.closest('[data-profile]');
  if(ficha){const record=state.contacts.find(c=>c.id===ficha.dataset.profile);if(record)openDialog(record.kind==='patient'?'Ficha del paciente':'Ficha del médico',fichaDetails(record));return;}
  const order=e.target.closest('[data-order]');if(order){showOrder(order.dataset.order);return;}
  const id=e.target.closest('[data-history]')?.dataset.history;if(!id)return;
  const item=state.contacts.find(x=>x.id===id);
  const treatments=state.treatments.filter(t=>t[item.kind+'_id']===item.id);
  openDialog('Tratamientos · '+item.label,treatments.length?table(['Fecha','Tratamiento','Medicamento','Cantidad'],
    treatments.map(t=>[t.day,t.name,t.medication,t.quantity].map(escapeHtml))):'<p>Sin tratamientos vinculados.</p>');
};
$('account').textContent=window.portalAccount.name;
$('logout').onclick=()=>window.portalLogout();
$('addRecord').onclick=()=>contactForm(views[section]);$('newTreatment').onclick=newTreatment;
$('entry').querySelector('.close').onclick=()=>$('entry').close();
$('search').oninput=render;window.addEventListener('hashchange',()=>{$('search').value='';render();});
render();refresh().catch(err=>message(err.message));

$('reload').onclick=()=>refresh().catch(error=>message(error.message));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(error=>message(error.message));});
