import {TODAY,initial as initialScreening} from '../tamizaje/model.js';
import {PRODUCTS,initial,balance,usedFor,hasSource,newPatient,linkSource,assign,recordMove,recordUse,addContact} from './model.js';
import {esc,fmt,dateLabel,icon,button,tag,table,title,options,detailGrid,segments,num,sum,newest} from './ui.js';
import {renderForm} from './forms.js';

const $ = s => document.querySelector(s);
const sections=[['resumen','Resumen','chart'],['pacientes','Pacientes','users'],['desplazamientos','Desplazamientos','route'],['consumos','Consumos','use'],['medicos','Médicos','med'],['inventarios','Red e inventarios','box'],['usuarios','Usuarios administrativos','users']];
function readEpisodes(){
  if(screening.version!==1||!Array.isArray(screening.episodes))throw Error('No se pudo leer el registro de Tamizaje.');
  return screening.episodes;
}
let s,screening=initialScreening(),distributionRevision=0,active='',segment='',query='',filter='',selectedPoint='',timer,formConfig,saving=false;
const content=$('#content'),dialog=$('#dialog');
const point=id=>s.points.find(p=>p.id===id)?.name||'—';
const doctor=id=>s.doctors.find(d=>d.id===id)?.name||'—';
const product=id=>PRODUCTS.find(p=>p.id===id)?.name||'—';
const lot=id=>s.lots.find(l=>l.id===id);
const patientLink=id=>button('patient',id,id);
const entryLabel=m=>product(lot(m.lot).product)+' · '+lot(m.lot).code;
const fromTo=(m)=>m.type==='Entrada'?'Recepción → '+point(m.to):m.type==='Traspaso'?point(m.from)+' → '+point(m.to):point(m.from)+' → '+m.patient;
const totalAt=(id)=>s.lots.reduce((a,l)=>a+balance(s,id,l.id),0);
const textMatch=(...values)=>values.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>t.classList.remove('show'),3000);}
function context(){return '<div class="context"><span class="demo">Piloto de demostración</span><span>Corte · '+esc(dateLabel(TODAY))+'</span></div>';}
function filters(label,items,placeholder){
  return '<div class="filters"><input type="search" id="query" aria-label="'+esc(placeholder)+'" placeholder="'+esc(placeholder)+'" value="'+esc(query)+'">'+
    (items?'<select id="filter" aria-label="'+esc(label)+'">'+options([['',label],...items],filter)+'</select>':'')+'</div>';
}
function monthChart(){
 const months=Array.from({length:6},(_,i)=>{const d=new Date(TODAY+'T12:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-5+i);const key=d.toISOString().slice(0,7);
  return {label:new Intl.DateTimeFormat('es-MX',{month:'short',timeZone:'UTC'}).format(d).replace('.',''),out:sum(s.moves.filter(m=>m.type==='Entrega'&&m.date.startsWith(key))),used:sum(s.uses.filter(u=>u.date.startsWith(key)))};});
 const max=Math.max(4,Math.ceil(Math.max(...months.map(m=>Math.max(m.out,m.used)))/4)*4);
 let svg='';
 for(let i=0;i<=4;i++){const y=142-30*i;svg+='<line x1="28" x2="590" y1="'+y+'" y2="'+y+'" stroke="#ffffff" stroke-opacity=".14"/><text x="20" y="'+(y+3)+'" text-anchor="end" fill="#c2d3c9" font-size="10">'+(i*max/4)+'</text>';}
 months.forEach((m,i)=>{const x=67+94*i;
  [[m.out,'#9fe3bb',-15],[m.used,'#59ad8d',2]].forEach(([value,color,offset])=>{const h=value*120/max;svg+='<rect x="'+(x+offset)+'" y="'+(142-h)+'" width="14" height="'+h+'" rx="3" fill="'+color+'"><title>'+esc(m.label+' · '+value+' unidades '+(offset<0?'entregadas':'consumidas'))+'</title></rect>';});
  svg+='<text x="'+x+'" y="161" text-anchor="middle" fill="#cadae0" font-size="11">'+esc(m.label)+'</text>';});
 const desc=months.map(m=>m.label+' '+m.out+' entregadas, '+m.used+' consumidas').join('. ');
 return '<div class="chart"><svg role="img" aria-label="'+esc(desc)+'" viewBox="0 0 600 170" preserveAspectRatio="none">'+svg+'</svg></div>';
}
function overview(){
 const metrics=[['users','Pacientes',s.patients.length,'En seguimiento'],['send','Unidades entregadas',sum(s.moves.filter(m=>m.type==='Entrega')),'Salidas a pacientes'],['use','Consumo reportado',sum(s.uses),'Unidades registradas'],['box','Existencias',s.points.reduce((n,p)=>n+totalAt(p.id),0),'Unidades en la red']];
 const metricsHtml='<div class="metrics">'+metrics.map(([k,label,n,note])=>'<div class="metric"><header>'+icon(k)+esc(label)+'</header><strong>'+fmt(n)+'</strong><small>'+esc(note)+'</small></div>').join('')+'</div>';
 const pts=[...s.points].map(p=>({...p,onHand:totalAt(p.id)})).sort((a,b)=>b.onHand-a.onHand);
 const stock='<section class="panel padded"><div class="panel-title"><div><h2>Existencias por punto</h2><p class="sub">Unidades en farmacias y distribuidores</p></div>'+icon('box')+'</div><div class="balances">'+pts.slice(0,4).map(p=>'<div class="balance-item"><div class="balance-row">'+button('point',p.name,p.id)+'<b>'+fmt(p.onHand)+'</b></div><div class="track"><i style="width:'+p.onHand/Math.max(1,pts[0].onHand)*100+'%"></i></div></div>').join('')+'</div><div class="section-foot">'+button('nav','Ver todos los inventarios','inventarios','link-btn','arrow')+'</div></section>';
 const pending=readEpisodes().filter(e=>e.decision==='Confirmado'&&!hasSource(s,e.id));
 const inbox='<section class="panel padded"><div class="panel-title"><div><h2>Vinculación de pacientes</h2><p class="sub">Folios confirmados en Tamizaje</p></div>'+icon('link')+'</div>'+(!pending.length?'<p class="empty">Todos los folios confirmados están vinculados.</p>':pending.slice(0,3).map(e=>'<div class="activity-item"><div><b>'+esc(e.id)+'</b><small>Sede '+esc(e.site)+' · '+esc(dateLabel(e.created))+'</small></div><div style="margin-left:auto">'+button('link','Vincular',e.id)+'</div></div>').join(''))+'<div class="section-foot">'+button('inbox','Ver folios de tamizaje','','link-btn','arrow')+'</div></section>';
 const events=newest([...s.moves.map(m=>({date:m.date,type:m.type,n:m.qty,detail:fromTo(m),icon:m.type==='Traspaso'?'route':m.type==='Entrega'?'send':'enter'})),...s.uses.map(u=>{const m=s.moves.find(m=>m.id===u.move);return {date:u.date,type:'Consumo',n:u.qty,detail:m.patient+' · '+point(m.from),icon:'use'};})]).slice(0,4);
 return metricsHtml+'<div class="grid"><section class="panel padded chart-panel"><div class="panel-title"><div><h2>Entregas y consumos</h2><p class="sub">Unidades por mes · últimos seis meses</p></div><div class="legend"><span class="key"><i style="background:#9fe3bb"></i>Entregadas</span><span class="key"><i style="background:#59ad8d"></i>Consumidas</span></div></div>'+monthChart()+'</section>'+stock+'</div><div class="grid below"><section class="panel padded"><div class="panel-title"><h2>Actividad reciente</h2>'+button('nav','Ver movimientos','desplazamientos')+'</div>'+events.map(e=>'<div class="activity-item"><span class="event-icon">'+icon(e.icon)+'</span><div><b>'+esc(e.type)+' · '+fmt(e.n)+' u.</b><small>'+esc(e.detail)+'</small></div><time>'+esc(dateLabel(e.date))+'</time></div>').join('')+'</section>'+inbox+'</div>';
}
function patients(){
 const tabs=segments([['registro','Pacientes registrados'],['folios','Folios de tamizaje']],segment);
 if(segment==='folios'){
  const list=readEpisodes().filter(e=>e.decision==='Confirmado'||(e.result==='Reactivo'&&['Pendiente','Inconcluso'].includes(e.decision))).map(e=>({...e,patient:hasSource(s,e.id)}));
  const rows=list.filter(e=>textMatch(e.id,e.patient?.id,'Sede '+e.site)&&(!filter||(filter==='linked'?e.patient:filter==='available'?e.decision==='Confirmado'&&!e.patient:e.decision!=='Confirmado')));
  return title('Folios de tamizaje','Vincula un dictamen confirmado a un número de paciente.')+tabs+'<section class="panel">'+filters('Todos los estados',[['available','Por vincular'],['linked','Vinculados'],['pending','En confirmación']],'Buscar folio o paciente')+table(['Folio','Sede de tamizaje','Dictamen','Paciente','Acción'],rows.map(e=>[esc(e.id),'Sede '+esc(e.site),tag(e.decision==='Confirmado'?'Confirmado':'En confirmación',e.decision==='Confirmado'?'':'warm'),e.patient?patientLink(e.patient.id):'—',e.patient?tag('Vinculado'):e.decision==='Confirmado'?button('link','Vincular',e.id):'Pendiente de dictamen']))+'</section>';
 }
 const rows=s.patients.filter(p=>textMatch(p.id,doctor(p.doctor),point(p.point),p.sources.join(' '))&&(!filter||p.point===filter));
 return title('Pacientes','Consulta el origen, el médico tratante y el historial de cada paciente.',button('new-patient','Nuevo paciente','','secondary','plus'))+tabs+'<section class="panel">'+filters('Todos los puntos',s.points.map(p=>[p.id,p.name]),'Buscar paciente, folio o médico')+table(['Paciente','Origen','Médico tratante','Punto asignado','Entregado','Consumido'],rows.map(p=>{
 const deliveries=s.moves.filter(m=>m.patient===p.id);
 return [patientLink(p.id),p.sources.length?esc(p.sources.join(', ')):tag('Alta directa','neutral'),esc(doctor(p.doctor)),esc(point(p.point)),fmt(sum(deliveries))+' u.',fmt(deliveries.reduce((n,m)=>n+usedFor(s,m.id),0))+' u.'];}))+ '<div class="table-note">'+rows.length+' pacientes</div></section>';
}
function movementRows(rows){
 return table(['Fecha','Movimiento','Producto / lote','Origen','Destino','Unidades','Médico de entrega'],newest(rows).map(m=>[esc(dateLabel(m.date)),tag(m.type,m.type==='Traspaso'?'neutral':''),'<b>'+esc(product(lot(m.lot).product))+'</b><small>'+esc(lot(m.lot).code)+'</small>',m.from?esc(point(m.from)):'Recepción externa',m.patient?patientLink(m.patient):esc(point(m.to)),num(m.qty),esc(doctor(m.doctor))]));
}
function movements(){
 if(segment==='pacientes'){
  const visits=s.patients.flatMap(p=>p.visits.filter(v=>v.from!==v.to).map(v=>({...v,id:p.id})));
  return title('Desplazamientos','Consulta los movimientos de producto y los cambios de punto de los pacientes.')+segments([['producto','Producto'],['pacientes','Pacientes']],segment)+'<section class="panel">'+filters('Todos los puntos',s.points.map(p=>[p.id,p.name]),'Buscar paciente o punto')+table(['Fecha','Paciente','Punto anterior','Nuevo punto','Médico tratante'],newest(visits.filter(v=>(!filter||v.from===filter||v.to===filter)&&textMatch(v.id,point(v.from),point(v.to)))).map(v=>[esc(dateLabel(v.date)),patientLink(v.id),esc(point(v.from)),esc(point(v.to)),esc(doctor(v.doctor))]),'Los cambios de punto se registran al reasignar la atención desde la ficha del paciente.')+'</section>';
 }
 const rows=s.moves.filter(m=>(!filter||m.type===filter)&&textMatch(m.id,m.patient,fromTo(m),entryLabel(m),doctor(m.doctor)));
 return title('Desplazamientos','Rastrea cada entrada, traspaso y entrega por punto, paciente y lote.')+segments([['producto','Producto'],['pacientes','Pacientes']],segment)+'<section class="panel">'+filters('Todos los movimientos',['Entrada','Traspaso','Entrega'],'Buscar paciente, punto o lote')+movementRows(rows)+'</section>';
}
function useTable(rows){
 return table(['Fecha','Paciente','Producto / lote','Unidades','Entrega','Punto de entrega','Médico tratante'],newest(rows).map(u=>{const m=s.moves.find(m=>m.id===u.move);return [esc(dateLabel(u.date)),patientLink(m.patient),esc(entryLabel(m)),num(u.qty),esc(m.id),esc(point(m.from)),esc(doctor(m.doctor))];}),'Aún no hay consumos reportados para esta selección.');
}
function uses(){
 const rows=s.uses.filter(u=>{const m=s.moves.find(m=>m.id===u.move);return (!filter||m.from===filter)&&textMatch(m.patient,m.id,entryLabel(m),point(m.from),doctor(m.doctor));});
 return title('Consumos','Unidades reportadas por paciente, vinculadas a una entrega específica.',button('use','Registrar consumo','','secondary','plus'))+'<section class="panel">'+filters('Todos los puntos',s.points.map(p=>[p.id,p.name]),'Buscar paciente, producto o entrega')+useTable(rows)+'</section>';
}
function doctors(){
 const rows=s.doctors.filter(d=>textMatch(d.name,d.site,d.id));
 return title('Médicos tratantes','Consulta los pacientes asignados y las entregas asociadas a cada médico.',button('new-doctor','Agregar médico','','secondary','plus'))+'<section class="panel">'+filters('',null,'Buscar médico o unidad')+table(['Médico tratante','Unidad','Pacientes asignados','Unidades entregadas','Detalle'],rows.map(d=>[esc(d.name),esc(d.site),num(s.patients.filter(p=>p.doctor===d.id).length),num(sum(s.moves.filter(m=>m.doctor===d.id))),button('doctor','Ver detalle',d.id)]))+'</section>';
}
function inventory(){
 const points=s.points.filter(p=>textMatch(p.name,p.city,p.id)&&(!filter||p.type===filter));
 const p=points.find(p=>p.id===selectedPoint)||points[0];
 const cards=points.map(pt=>'<button class="panel cat-card '+(p?.id===pt.id?'selected':'')+'" data-action="point" data-id="'+esc(pt.id)+'" aria-pressed="'+(p?.id===pt.id)+'"><div class="pair"><h3>'+esc(pt.name)+'</h3>'+tag(pt.type,'neutral')+'</div><small class="sub">'+esc(pt.city)+'</small><strong>'+fmt(totalAt(pt.id))+' <small class="sub">unidades</small></strong></button>').join('');
 let details='';
 if(p){
  const lots=s.lots.filter(l=>s.moves.some(m=>m.lot===l.id&&(m.to===p.id||m.from===p.id)));
  details='<section class="panel below"><div class="panel-title section-head"><div><h2>'+esc(p.name)+'</h2><p class="sub">Inventario por producto y lote</p></div>'+button('receipt','Registrar entrada',p.id,'secondary','plus')+'</div>'+table(['Producto','Lote','Caducidad','Entradas','Salidas','Existencias','Estado'],lots.map(l=>{
  const moves=s.moves.filter(m=>m.lot===l.id),n=balance(s,p.id,l.id);
  return [esc(product(l.product)),esc(l.code),esc(dateLabel(l.expiry)),num(sum(moves.filter(m=>m.to===p.id))),num(sum(moves.filter(m=>m.from===p.id))),num(n),tag(l.expiry<TODAY?'Vencido':n?'Disponible':'Sin existencias',l.expiry<TODAY?'warm':n?'':'neutral')];}),'Este punto aún no ha recibido producto.')+'</section><section class="panel below"><div class="section-head"><h2>Movimientos del punto</h2></div>'+movementRows(s.moves.filter(m=>m.to===p.id||m.from===p.id))+'</section>';
 }
 return title('Red e inventarios','Selecciona una farmacia o distribuidor para consultar sus lotes y movimientos.',button('new-point','Agregar punto','','secondary','plus'))+'<section class="panel" style="margin-bottom:13px">'+filters('Todos los tipos',['Farmacia','Distribuidor'],'Buscar punto o ubicación')+'</section><div class="cat-grid">'+cards+'</div>'+(details||'<p class="empty">No se encontraron puntos.</p>');
}
const views={resumen:overview,pacientes:patients,desplazamientos:movements,consumos:uses,medicos:doctors,inventarios:inventory};
function render(){
 $('#navigation').innerHTML=sections.map(([id,name,k])=>'<a class="section-tab '+(id===active?'active':'')+'" href="#'+id+'" '+(id===active?'aria-current="page"':'')+'>'+icon(k)+esc(name)+'</a>').join('');
 const showUsers=active==='usuarios';
 $('.mast').hidden=showUsers;
 $('#crumb').textContent=sections.find(([id])=>id===active)[1];
 if(showUsers){content.replaceChildren(document.createElement('portal-users'));return;}
 content.innerHTML=context()+views[active]();
}
function navigate(id,part=''){
 if(!sections.some(([v])=>v===id))id='resumen';
 const hash='#'+id+(part?'/'+part:'');
 if(location.hash!==hash){location.hash=hash;return;}
 activate();
}
function activate(){
 const [id,sub]=location.hash.slice(1).split('/');
 const page=sections.some(([v])=>v===id)?id:'resumen';
 if(active!==page||sub!==segment){query='';filter='';}
 active=page;segment=page==='pacientes'?(sub==='folios'?'folios':'registro'):page==='desplazamientos'?(sub==='pacientes'?'pacientes':'producto'):'';
 render();
}
function openDialog(heading,context,html){
 $('#dialog-title').textContent=heading;$('#dialog-context').textContent=context;
 $('#dialog-content').innerHTML=html;
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
}
function detail(id){
 const p=s.patients.find(p=>p.id===id);if(!p)return;
 const deliveries=s.moves.filter(m=>m.patient===id);
 const consumed=deliveries.reduce((n,m)=>n+usedFor(s,m.id),0);
 const sourceText=p.sources.length?p.sources.map(f=>esc(f)+' · '+esc(readEpisodes().find(e=>e.id===f)?.decision||'Folio de origen')).join('<br>'):'Alta directa';
 openDialog(id,'Ficha del paciente',detailGrid([['Origen',sourceText],['Fecha de alta',esc(dateLabel(p.created))],['Médico tratante',esc(doctor(p.doctor))],['Punto asignado',esc(point(p.point))],['Unidades entregadas',fmt(sum(deliveries))],['Consumo reportado',fmt(consumed)]])+
 '<div class="dialog-actions">'+button('assignment','Cambiar asignación',id,'secondary')+button('patient-use','Registrar consumo',id,'secondary')+button('deliver','Registrar entrega',id,'primary')+'</div><h3 class="detail-h">Entregas</h3>'+table(['Fecha','Punto / médico','Lote','Entregado','Consumido'],newest(deliveries).map(m=>[esc(dateLabel(m.date)),esc(point(m.from))+'<small>'+esc(doctor(m.doctor))+'</small>',esc(entryLabel(m)),num(m.qty),num(usedFor(s,m.id))]),'Este paciente aún no tiene entregas.')+'<h3 class="detail-h">Consumos reportados</h3>'+useTable(s.uses.filter(u=>deliveries.some(m=>m.id===u.move)))+
 '<h3 class="detail-h">Cambios de atención</h3>'+table(['Fecha','Punto anterior → nuevo','Médico anterior → nuevo'],newest(p.visits).map(v=>[esc(dateLabel(v.date)),esc(point(v.from)+' → '+point(v.to)),esc(doctor(v.oldDoctor)+' → '+doctor(v.doctor))]),'Sin cambios de asignación.'));
}
function doctorDetail(id){
 const d=s.doctors.find(d=>d.id===id);if(!d)return;
 const patients=s.patients.filter(p=>p.doctor===id),moves=s.moves.filter(m=>m.doctor===id);
 openDialog(d.name,'Médico tratante',detailGrid([['Unidad',esc(d.site)],['Pacientes asignados',fmt(patients.length)],['Unidades entregadas',fmt(sum(moves))],['Consumo de esas entregas',fmt(moves.reduce((n,m)=>n+usedFor(s,m.id),0))]])+'<h3 class="detail-h">Pacientes asignados</h3>'+table(['Paciente','Punto de atención'],patients.map(p=>[patientLink(p.id),esc(point(p.point))]))+'<h3 class="detail-h">Entregas</h3>'+movementRows(moves));
}
function showForm(kind,params={}){
 formConfig={kind,params};
 const form=renderForm({s,kind,params,today:TODAY,episodes:readEpisodes(),point,doctor,product,entryLabel});
 openDialog(form.heading,form.context,form.html);
 form.wire?.();
}
const handlers={
 close:()=>dialog.close(),nav:id=>navigate(id),segment:id=>navigate(active,id),inbox:()=>navigate('pacientes','folios'),
 point:id=>{selectedPoint=id;if(active==='inventarios')render();else navigate('inventarios');},patient:detail,doctor:doctorDetail,
 movement:()=>showForm('movement'),receipt:id=>showForm('movement',{type:'Entrada',to:id}),deliver:id=>showForm('movement',{type:'Entrega',patient:id}),
 'new-patient':()=>showForm('patient'),link:folio=>showForm('link',{folio}),use:()=>showForm('use'),'patient-use':patient=>showForm('use',{patient}),
 assignment:patient=>showForm('assignment',{patient}),'new-doctor':()=>showForm('doctor'),'new-point':()=>showForm('point')
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el&&handlers[el.dataset.action])handlers[el.dataset.action](el.dataset.id);});
content.addEventListener('input',e=>{if(e.target.id==='query'){const caret=e.target.selectionStart;query=e.target.value;render();const box=$('#query');box.focus();box.setSelectionRange(caret,caret);}});
content.addEventListener('change',e=>{if(e.target.id==='filter'){filter=e.target.value;render();}});
async function persistDistribution(next,expectedRevision=distributionRevision){
 const response=await fetch('/api/distribution',{method:'PUT',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({expectedRevision,data:next})});
 const body=await response.json().catch(()=>({}));
 if(response.status===409){s=body.data||s;distributionRevision=body.revision??distributionRevision;if(active)render();throw Error(body.error||'Los datos cambiaron en otra sesión.');}
 if(!response.ok)throw Error(body.message||body.error||'No fue posible guardar Distribución.');
 s=body.data;distributionRevision=body.revision;
}
async function saveForm(f){
 if(saving)throw Error('Espera a que termine el guardado anterior.');
 const draft=structuredClone(s),episodes=readEpisodes();
 let msg='',patientToOpen='';
 switch(formConfig.kind){
 case 'patient':{const p=newPatient(draft,f,episodes,TODAY);patientToOpen=p.id;msg='Paciente '+p.id+' registrado.';break;}
 case 'link':{
   const folio=formConfig.params.folio;
   if(f.mode==='existing'){
     const p=draft.patients.find(p=>p.id===f.existing);
     if(!p)throw Error('Selecciona un paciente registrado.');
     linkSource(draft,p,folio,episodes);patientToOpen=p.id;
   }else{patientToOpen=newPatient(draft,{...f,folio},episodes,TODAY).id;}
   msg=folio+' vinculado a '+patientToOpen+'.';break;}
 case 'assignment':assign(draft,formConfig.params.patient,f.doctor,f.point,TODAY);patientToOpen=formConfig.params.patient;msg='Asignación actualizada.';break;
 case 'movement':{const m=recordMove(draft,f,TODAY);msg=m.id+' · '+m.type+' registrada.';patientToOpen=formConfig.params.patient||'';break;}
 case 'use':{const u=recordUse(draft,f,TODAY);msg='Consumo '+u.id+' registrado.';patientToOpen=formConfig.params.patient||'';break;}
 case 'point':{const p=addContact(draft,'point',f.name,f.city,f.type);selectedPoint=p.id;msg='Punto agregado.';break;}
 case 'doctor':addContact(draft,'doctor',f.name,f.site);msg='Médico agregado.';break;
 }
 saving=true;
 try{await persistDistribution(draft);dialog.close();render();if(patientToOpen)detail(patientToOpen);toast(msg);}
 finally{saving=false;}
}
dialog.addEventListener('submit',async e=>{e.preventDefault();if(!e.target.matches('#edit-form'))return;
 try{await saveForm(Object.fromEntries(new FormData(e.target)));}catch(err){const target=$('#form-error');if(target)target.textContent=err.message;else toast(err.message);}
});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('hashchange',activate);
window.addEventListener('pageshow',e=>{if(e.persisted)boot();});
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
async function boot(){
 try{
  const [screenResponse,distributionResponse]=await Promise.all([
   fetch('/api/screening',{headers:{'Accept':'application/json'}}),
   fetch('/api/distribution',{headers:{'Accept':'application/json'}})
  ]);
  const [screenBody,distributionBody]=await Promise.all([screenResponse.json(),distributionResponse.json()]);
  if(!screenResponse.ok)throw Error(screenBody.error||'No se pudo leer Tamizaje.');
  if(!distributionResponse.ok)throw Error(distributionBody.error||'No se pudo leer Distribución.');
  screening=screenBody.data||initialScreening();
  distributionRevision=distributionBody.revision||0;
  if(distributionBody.data)s=distributionBody.data;
  else await persistDistribution(initial(readEpisodes()),0);
  activate();
  const folio=new URLSearchParams(location.search).get('folio');
  if(folio){const p=hasSource(s,folio);if(p)detail(p.id);else if(readEpisodes().some(e=>e.id===folio&&e.decision==='Confirmado'))showForm('link',{folio});}
 }catch(err){content.textContent=err.message;}
}
boot();

