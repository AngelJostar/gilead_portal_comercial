import {lotInventory,recordLotMovement,NEW_LOT,movementTypes} from './lotes.js';
import {TODAY,sites,labels,results,initial,addTask,event,done,usable,phase,ttl,createEpisode,closeTask,stats,patientIdentity,lotNumber} from './model.js';
const $=s=>document.querySelector(s);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 users:'M4 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2 M13 8a3 3 0 1 1-6 0 3 3 0 1 1 6 0z M17 6a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 3 5',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 plus:'M12 5v14 M5 12h14',tray:'M4 5h16l2 12v2H2v-2z M3 14h5l2 3h4l2-3h5',
 calendar:'M4 6h16v15H4z M8 3v5 M16 3v5 M4 11h16',folder:'M3 6h7l2 2h9v12H3z',
 route:'M5 7h10a4 4 0 0 1 0 8H9 M7 12l-3 3 3 3 M5 4v6',
 box:'m3 7 9-4 9 4-9 5-9-5 M3 7v10l9 5 9-5V7 M12 12v10',
 chart:'M4 3v17h17 M8 16v-4 M13 16V6 M18 16v-7',search:'M16 16l5 5 M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
 clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z M12 7v5l3 2',
 alert:'m12 3 10 17H2z M12 9v4 M12 16v1',arrow:'M5 12h14 M14 6l6 6-6 6',
 check:'m5 12 4 4L19 6',pin:'M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0z M14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z'};
function icon(key){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[key]+'"/></svg>';}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const sections=[['bandeja','Mi bandeja','tray'],['jornadas','Jornadas y sedes','calendar'],['episodios','Episodios','folder'],['muestras','Muestras y referencias','route'],['inventario','Inventario','box'],['indicadores','Indicadores','chart'],['usuarios','Usuarios administrativos','users']];
let st=initial(),revision=0,saving=false;
let site='',search='',deadline='',owner='',tab='',timer;
let role=sessionStorage.getItem('gilead.tamizaje.vista')||'operacion';
function visibleSections(){return sections.filter(([id])=>role==='operacion'||id===(role==='nacional'?'indicadores':'muestras'));}
$('#demo-view').value=role;
$('#demo-view').onchange=e=>{role=e.target.value;sessionStorage.setItem('gilead.tamizaje.vista',role);site='';$('#site-filter').value='';const dest=visibleSections()[0][0];activate(dest);if(location.hash!=='#'+dest)location.hash=dest;};
const selected=()=>st.episodes.filter(e=>!site||e.site===site);
const here=id=>st.episodes.find(e=>e.id===id);
const date=v=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(v+'T12:00:00Z')).replace('.','');
function options(values,active=''){return values.map(x=>{const [v,label]=Array.isArray(x)?x:[x,x];return '<option value="'+safe(v)+'" '+(v===active?'selected':'')+'>'+safe(label)+'</option>';}).join('');}
function chip(txt){const k=({'Vencida':'red','Hoy':'gold','Programada':'blue','En tránsito':'blue','Pendiente':'gold','Inválido':'gold','Reactivo':'gold','Confirmado':'green','Completo':'green','Publicada':'blue','Abierta':'green','Recibida':'green','Solicitada':'gold','Rechazada':'red','Vencido':'red','Cuarentena':'gold','Liberado':'green','Acreditada':'green','Interrumpido':'gold'})[txt]||'';return '<span class="chip '+k+'">'+safe(txt)+'</span>';}
function btn(action,label,id='',kind='smallbtn'){return '<button type="button" class="'+kind+'" data-action="'+action+'" data-id="'+safe(id)+'">'+safe(label)+'</button>';}
function table(head,rows){return '<div class="scroll"><table class="tbl screen-table"><thead><tr>'+head.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(row=>'<tr>'+row.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+head.length+'" class="empty">Sin registros para esta selección.</td></tr>')+'</tbody></table></div>';}
const ref=id=>btn('episode',id,id,'rowlink ref');
const head=(t,sub='',action='')=>'<div class="panel-head"><div><h2>'+t+'</h2>'+(sub?'<p>'+sub+'</p>':'')+'</div>'+action+'</div>';
function toast(msg){$('#message').textContent=msg;clearTimeout(timer);timer=setTimeout(()=>$('#message').textContent='',3200);}
async function persist(next,expectedRevision){
 const response=await fetch('/api/screening',{method:'PUT',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({expectedRevision,data:next})});
 const body=await response.json().catch(()=>({}));
 if(response.status===409){st=body.data||st;revision=body.revision??revision;render();throw Error(body.error||'Los datos cambiaron en otra sesión.');}
 if(!response.ok)throw Error(body.message||body.error||'No fue posible guardar los cambios.');
 st=body.data;revision=body.revision;render();
}
async function commit(fn,msg){
 if(saving){toast('Espera a que termine el guardado anterior.');return {ok:false};}
 const next=structuredClone(st);
 try{const out=fn(next);const expectedRevision=revision;saving=true;st=next;render();await persist(next,expectedRevision);if(msg)toast(msg);return {out,ok:true};}
 catch(e){const err=$('#drawer[open] .err');if(err)err.textContent=e.message;else toast(e.message);return {ok:false};}
 finally{saving=false;}
}
function nav(t){if(!sections.some(x=>x[0]===t))t='bandeja';if(location.hash!=='#'+t){location.hash=t;return;}activate(t);}
function activate(t){const visible=visibleSections();tab=visible.some(x=>x[0]===t)?t:visible[0][0];search='';owner='';deadline='';render();}
window.addEventListener('hashchange',()=>activate(location.hash.slice(1)));
$('#site-filter').innerHTML=options([['','Todas las sedes'],...Object.entries(sites).map(([id,s])=>[id,s.name])]);$('#site-filter').onchange=e=>{site=e.target.value;search='';owner='';render();};
function cascade(v){return '<div class="side"><div class="over">Cohorte del piloto</div><h2>Ruta de atención</h2>'+[['Tamizajes aplicados',v.screened],['Tamizajes reactivos',v.reactive],['Confirmaciones',v.confirmed],['Primeras atenciones',v.linked]].map(([t,n])=>'<div class="barline"><div><span>'+t+'</span><b>'+n+'</b></div><span class="track"><i style="width:'+Math.round(100*n/(v.screened||1))+'%"></i></span></div>').join('')+btn('nav','Ver indicadores →','indicadores','anchor')+'</div>';}
function siteBox(){return '<div class="box mini-panel"><h3>Sedes del piloto</h3>'+Object.entries(sites).filter(([id])=>!site||id===site).map(([id,s])=>'<div class="mini-row"><span>'+s.name+'</span><small>'+s.state+'</small></div>').join('')+'</div>';}
function metric(items){return '<div class="metricrow">'+items.map(([n,t,ic,cl])=>'<div class="metric"><span class="sym '+(cl||'')+'">'+icon(ic)+'</span><div><strong>'+n+'</strong><small>'+t+'</small></div></div>').join('')+'</div>';}
function toolbar(extra=''){return '<div class="tool"><label class="search">'+icon('search')+'<input id="query" aria-label="Buscar" placeholder="Buscar folio o acción" value="'+safe(search)+'"></label>'+extra+'</div>';}
function taskRows(tasks){
 const q=search.trim().toLocaleLowerCase('es');return tasks.filter(t=>(!deadline||ttl(t)===deadline)&&(!owner||t.owner===owner)&&[t.ep,labels[t.type],t.owner].join(' ').toLocaleLowerCase('es').includes(q)).sort((a,b)=>a.due.localeCompare(b.due)||a.ep.localeCompare(b.ep)).map(t=>[ref(t.ep)+'<small>Sede '+here(t.ep).site+'</small>',btn('task',labels[t.type],t.id,'rowlink')+'<small>'+safe(t.owner)+'</small>',chip(ttl(t))+'<small>'+date(t.due)+'</small>']);
}
function bandeja(){
 const es=selected(), tasks=st.tasks.filter(t=>!t.proof&&es.some(e=>e.id===t.ep&&!e.interrupted)),rows=taskRows(tasks);
 return metric([[tasks.length,'Tareas abiertas','tray'],[tasks.filter(t=>ttl(t)==='Vencida').length,'Vencidas','alert','red'],[tasks.filter(t=>ttl(t)==='Hoy').length,'Vencen hoy','clock','warn'],[tasks.filter(t=>ttl(t)==='Programada').length,'Programadas','calendar']])+'<div class="work"><section class="box">'+head('Mi bandeja','Pendientes de seguimiento por folio y responsable.')+toolbar('<select id="deadline" aria-label="Vencimiento">'+options([['','Vencimiento'],'Vencida','Hoy','Programada'],deadline)+'</select><select id="owner" aria-label="Responsable">'+options([['','Responsable'],...[...new Set(tasks.map(t=>t.owner))].sort()],owner)+'</select>')+table(['Folio','Acción pendiente','Vencimiento'],rows)+'<div class="boxfoot">'+rows.length+' de '+tasks.length+' tareas abiertas</div></section><aside class="asides">'+cascade(stats(st,es))+siteBox()+'</aside></div>';
}
function episodios(){const eps=selected().filter(e=>[e.id,e.result,e.decision,phase(st,e)].join(' ').toLowerCase().includes(search.toLowerCase()));return '<section class="box">'+head('Episodios','Cada folio conserva sus pruebas, tareas y evidencias.')+toolbar()+table(['Folio','Sede','Tamizaje vigente','Dictamen','Seguimiento'],eps.map(e=>[ref(e.id)+'<small>'+date(e.created)+'</small>',sites[e.site].name,safe(e.result),safe(e.decision),chip(phase(st,e))]))+'</section>';}
function jornadaIndicators(jornada) {
  const completed = st.episodes.filter(ep => ep.jornada === jornada.id && ep.tests.length > 0);
  const remaining = Math.max(0, jornada.goal - completed.length);
  const outcomes = ['Reactivo', 'No reactivo', 'Inválido'];
  const resultTiles = outcomes.map(outcome => {
    const count = completed.filter(ep => ep.result === outcome).length;
    return `<div class="shift-stat"><dt>${outcome}</dt><dd>${count}</dd></div>`;
  }).join('');
  return `<dl class="shift-stats" aria-label="Tamizajes de la jornada">
    <div class="shift-stat shift-progress">
      <dt>Total realizados</dt><dd>${completed.length}</dd>
      <dt>Disponibles (por realizar)</dt><dd>${remaining}</dd>
    </div>${resultTiles}
  </dl>`;
}

function jornadas() {
  const shifts = st.jornadas.filter(j => !site || j.site === site);
  const cards = shifts.map(j => {
    const sede = sites[j.site];
    const action = j.status === 'Cerrada' ? '' :
      btn('shift-status', j.status === 'Abierta' ? 'Cerrar jornada' : 'Abrir jornada', j.id);
    return `<article class="unit shift-unit">${chip(j.status)}<h3>${safe(j.name)}</h3>
      <p>${sede.name} · ${sede.state} · ${date(j.date)}</p>
      <p>Meta de la jornada: ${j.goal} episodios</p>
      ${jornadaIndicators(j)}
      <p>${sede.lab} · ${sede.receiver}</p>
      <div class="actions">${action}</div></article>`;
  }).join('');
  return '<section class="box">'+head('Jornadas y sedes','Programación, capacidad y responsables por sede.',
    btn('add-shift','Crear jornada'))+'<div class="cards">'+cards+'</div></section>';
}

function muestras(){const es=selected(),ids=es.map(e=>e.id);
 if(role==='transporte')return '<section class="box">'+head('Remisiones de transporte','Entregas y recepción por laboratorio.')+table(['Muestra','Remisión','Destino','Custodia','Acción'],st.samples.filter(s=>ids.includes(s.episode)).map(s=>[safe(s.id),safe(s.ref||'REM-002'),safe(s.receiver),chip(s.status),s.status==='En tránsito'&&!s.custodia?btn('transport','Registrar entrega',s.id):safe(s.custodia||'—')]))+'</section>';
 return '<section class="box">'+head('Muestras','Seguimiento de remisiones y acuses.',btn('ship','Registrar envío'))+table(['Muestra','Folio','Destino','Estado','Acción'],st.samples.filter(s=>ids.includes(s.episode)).map(s=>{const t=st.tasks.find(t=>t.ep===s.episode&&t.type==='receipt'&&!t.proof);return [safe(s.id),ref(s.episode),safe(s.receiver),chip(s.status),s.status==='En tránsito'&&t?btn('task','Registrar recepción',t.id):'—'];}))+'</section><section class="box" style="margin-top:16px">'+head('Referencias a primera atención','La unidad receptora acredita la asistencia.')+table(['Folio','Unidad receptora','Situación','Acción'],es.filter(e=>e.decision==='Confirmado').map(e=>{const t=st.tasks.find(t=>t.ep===e.id&&t.type==='visit');return [ref(e.id),safe(t?.owner||sites[e.site].receiver),chip(t?.proof?'Acreditada':e.cita||'Pendiente'),t&&!t.proof?'<div class="inline">'+btn('appt','Gestionar cita',e.id)+btn('task','Acreditar',t.id)+'</div>':'—'];}))+'</section>';}
function inventory(){
 const ls=st.lots.filter(l=>!site||l.site===site);
 const rows=ls.map(l=>{
   const report=lotInventory(st,l);
   const status=l.expiry<TODAY?'Vencido':l.status;
   return [safe(lotNumber(l)),sites[l.site].name,date(l.expiry)+' '+l.expiry.slice(0,4),
     chip(status),report.entered,report.used,report.otherUsed,report.remaining,usable(l),
     btn('lot-detail','Detalle',l.id)];
 });
 const inventoryTable=table(['Lote','Sede','Caducidad','Estado','Ingresadas','Utilizadas','Otras salidas','Remanentes','Utilizables','Detalle'],rows);
 return '<section class="box lot-inventory">'+head('Inventario','Piezas por lote. Las utilizadas corresponden a pruebas aplicadas a pacientes.',btn('lot-move','Registrar movimiento'))+
   inventoryTable+'</section><section class="box" style="margin-top:16px">'+head('Reposición por sede','Consumo diario × días de reposición + reserva de seguridad.')+'<div class="cards">'+Object.entries(sites).filter(([id])=>!site||id===site).map(([id,s])=>{const qty=ls.filter(l=>l.site===id).reduce((v,l)=>v+usable(l),0),threshold=s.daily*s.lead+s.reserve,r=st.requests.find(x=>x.site===id&&!x.closed);return '<article class="unit"><div class="over">'+s.name+'</div><h3>'+qty+' pruebas utilizables</h3><p>Punto de reorden: '+threshold+' pruebas.</p><div class="actions">'+(r?btn('receive-stock','Recibir reposición',id):qty<=threshold?btn('reorder','Solicitar reposición',id):chip('Suficiente'))+'</div></article>';}).join('')+'</div></section>';
}
function unlinkedPatient(episodeId){
  return '<span>Folio no registrado</span><details class="lot-patient"><summary>Vincular paciente</summary>'+
    '<form data-patient-link="'+safe(episodeId)+'">'+patientFields()+
    '<button class="smallbtn" type="submit">Guardar folio</button><div class="err" role="alert"></div></form></details>';
}
function lotDetail(id){
  const lot=st.lots.find(l=>l.id===id&&(!site||l.site===site));
  if(!lot||!visibleSections().some(([section])=>section==='inventario'))return;
  const report=lotInventory(st,lot);
  const totals=[['Ingresadas',report.entered],['Utilizadas',report.used],['Remanentes',report.remaining]];
  let html='<p class="lot-caption">'+safe(sites[lot.site].name)+' · Caducidad '+safe(date(lot.expiry))+' '+safe(lot.expiry.slice(0,4))+'</p>'+
    '<dl class="lot-totals">'+totals.map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+value+'</dd></div>').join('')+'</dl>'+
    '<h3 class="sectionline">Aplicaciones por paciente</h3>';
  if(report.used){
    html+=table(['Pieza','Fecha','Paciente','Episodio','Aplicación','Resultado'],report.applications.map((a,index)=>[
      index+1,date(a.date)+' '+safe(a.date.slice(0,4)),a.patient?'<b>'+safe(a.alias||a.patient)+'</b>'+(a.alias?'<small>'+safe(a.patient)+'</small>':''):unlinkedPatient(a.episode),
      safe(a.episode),a.attempt===1?'Inicial':'Repetición '+(a.attempt-1),chip(a.result)
    ]));
  }else html+='<p class="hint">Este lote aún no tiene piezas aplicadas a pacientes.</p>';
  html+='<p class="lot-note">Existencia inicial: '+report.opening+' · Entradas posteriores: '+report.received+' · Otras salidas: '+report.otherUsed+'</p>';
  if(report.exits.length)html+='<h3 class="sectionline">Controles y mermas</h3>'+table(['Movimiento','Referencia','Piezas'],report.exits.map(m=>[safe(m.type),safe(m.ref),-m.qty]));
  showDialog('Inventario · Detalle del lote','Lote '+lotNumber(lot),html);
  dlg.classList.add('lot-detail');
  dlg.dataset.lotId=id;
  $('#close-dialog').focus();
}
function indicadores(){const es=selected(),s=stats(st,es),goal=st.jornadas.filter(j=>j.date<=TODAY&&(!site||j.site===site)).reduce((a,j)=>a+j.goal,0);const kpis=[['Avance frente a meta',s.screened,goal,'episodios aplicados / meta de jornadas'],['Resolución diagnóstica',s.resolved,s.reactive,'reactivos resueltos / reactivos'],['Primera atención',s.linked,s.confirmed,'atenciones acreditadas / confirmados'],['Notificación oficial',s.reported,s.confirmed,'constancias / confirmados']];return '<section class="box">'+head('Indicadores','Cohorte del piloto al 6 de noviembre de 2026. Una repetición conserva el mismo episodio.')+'<div class="cards">'+kpis.map(([t,n,d,desc])=>'<article class="unit"><h3>'+t+'</h3><div class="ratio">'+(d?Math.round(n/d*100)+'%':'—')+'</div><p>'+n+' de '+d+' · '+desc+'</p></article>').join('')+'</div></section>';}
const renderers={bandeja,jornadas,episodios,muestras,inventario:inventory,indicadores};
function render(){
 $('#new-screen').hidden=role!=='operacion';
 $('#sections').innerHTML=visibleSections().map(([id,title,ic])=>'<button type="button" data-action="nav" data-id="'+id+'" class="'+(tab===id?'active':'')+'" '+(tab===id?'aria-current="page"':'')+'>'+icon(ic)+title+'</button>').join('');
 const showUsers=tab==='usuarios';
 $('.mast').hidden=showUsers;
 $('.context').hidden=showUsers;
 $('#crumb').textContent=sections.find(([id])=>id===tab)[1];
 if(showUsers){$('#content').replaceChildren(document.createElement('portal-users'));return;}
 $('#content').innerHTML=renderers[tab]();
 const q=$('#query');if(q)q.oninput=()=>{search=q.value;render();$('#query').focus();$('#query').setSelectionRange(search.length,search.length);};
 const de=$('#deadline');if(de)de.onchange=()=>{deadline=de.value;render();};const ow=$('#owner');if(ow)ow.onchange=()=>{owner=ow.value;render();};
}
const dlg=$('#drawer');
function showDialog(kicker,title,html){
 dlg.classList.remove('lot-detail');
 $('#dialog-kicker').textContent=kicker;$('#dialog-title').textContent=title;$('#dialog-content').innerHTML=html;
 if(!dlg.open)dlg.showModal();dlg.scrollTop=0;
}
$('#dialog-content').addEventListener('submit',event=>{
  const form=event.target;
  if(!form.matches('form[data-patient-link]')||!dlg.classList.contains('lot-detail'))return;
  event.preventDefault();
  const lotId=dlg.dataset.lotId;
  const fields=new FormData(form);
  const result=commit(next=>{
    const episode=next.episodes.find(e=>e.id===form.dataset.patientLink);
    if(!episode||!episode.tests.some(t=>t.lot===lotId)||episode.patientRef)
      throw Error('Esta aplicación ya no admite vinculación.');
    patientIdentity(episode,fields.get('patientRef'),fields.get('patientAlias'));
  },'Paciente vinculado al episodio');
  if(result.ok)lotDetail(lotId);
});
$('#close-dialog').onclick=()=>dlg.close();dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});
function field(label,control,wide=false){return '<label class="field'+(wide?' full':'')+'">'+label+control+'</label>';}
function select(name,vals,active='',required=true){return '<select name="'+name+'" '+(required?'required':'')+'>'+options(vals,active)+'</select>';}
function input(name,placeholder='',value='',type='text',extra=''){return '<input name="'+name+'" type="'+type+'" value="'+safe(value)+'" placeholder="'+safe(placeholder)+'" required maxlength="75" '+extra+'>';}
function form(title,body,label,submit,kicker='Piloto de demostración'){
 showDialog(kicker,title,'<form id="edit-form"><div class="formgrid">'+body+'</div><p class="err" role="alert"></p><div class="formfooter"><button class="secondary" type="button" data-action="dismiss">Cancelar</button><button class="primary">'+label+'</button></div></form>');
 $('#edit-form').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));submit(f);};
}
async function act(fn,msg,after){const res=await commit(fn,msg);if(res.ok){if(after)after(res.out);else dlg.close();}}
const trials=s=>st.lots.filter(l=>l.site===s&&usable(l)>0).map(l=>[l.id,lotNumber(l)+' · '+usable(l)+' disponibles']);
function patientFields(){
 return field('Folio del paciente',input('patientRef','Ej. PX-007'))+
   field('Nombre o alias (opcional)','<input name="patientAlias" maxlength="75" placeholder="Alias de demostración">');
}
function newTest(){
 const js=st.jornadas.filter(j=>j.status==='Abierta'&&j.date<=TODAY&&(!site||j.site===site));if(!js.length){toast('Abre una jornada en la sede seleccionada.');return;}
 form('Nuevo tamizaje',field('Jornada',select('jornada',js.map(j=>[j.id,j.name+' · '+sites[j.site].name])),true)+field('Consentimiento escrito',select('consent',['Sí','Declinado']),true)+'<div id="apply-fields" class="full grid2">'+patientFields()+field('Referencia del consentimiento',input('ref','Ej. CONS-SIM-007'),true)+field('Lote',select('lot',trials(js[0].site)))+field('Lectura',select('result',results))+'</div><p class="dialog-note full">Usa únicamente referencias ficticias. La prueba registrada descuenta una unidad del lote.</p>','Guardar episodio',f=>act(n=>createEpisode(n,{...f,ref:f.ref||''}),'Episodio guardado',episode));
 const f=$('#edit-form');f.jornada.onchange=()=>f.lot.innerHTML=options(trials(js.find(j=>j.id===f.jornada.value).site));f.consent.onchange=()=>{const off=f.consent.value!=='Sí';$('#apply-fields').style.display=off?'none':'';for(const el of $('#apply-fields').querySelectorAll('input,select'))el.disabled=off;};
}
$('#new-screen').onclick=newTest;
function episode(id){
 const ep=here(id);if(!ep)return;const tasks=st.tasks.filter(t=>t.ep===id),open=tasks.filter(t=>!t.proof);
 const distribution=ep.decision==='Confirmado'?'<a class="smallbtn" href="./distribucion.html?folio='+encodeURIComponent(ep.id)+'#pacientes/folios">Abrir en Distribución</a>':'';
 const pending=open.map(t=>'<div class="taskbox"><b>'+labels[t.type]+'</b> '+chip(ttl(t))+'<br><small>'+safe(t.owner)+' · '+date(t.due)+'</small><div class="actions">'+btn('task','Atender',t.id)+btn('assign','Reasignar',t.id)+'</div></div>').join('');
 const history=tasks.filter(t=>t.proof).map(t=>'<div class="event"><b>'+labels[t.type]+'</b> · '+date(t.proof.date)+' · '+safe(t.proof.ref)+'</div>').join('');
 showDialog('Ficha del episodio',id,'<div class="inline">'+chip(phase(st,ep))+'<span class="caption">'+sites[ep.site].name+' · Apertura '+date(ep.created)+'</span></div><div class="dialog-note">Tamizaje: <b>'+safe(ep.result)+'</b> · Dictamen: <b>'+safe(ep.decision)+'</b></div>'+distribution+'<h3 class="sectionline">Acciones pendientes</h3>'+(pending||'<p class="hint">Sin tareas pendientes.</p>')+'<h3 class="sectionline">Pruebas aplicadas</h3>'+ep.tests.map(t=>'<div class="event">'+date(t.date)+' · '+safe(t.result)+' · Lote '+safe(lotNumber(st.lots.find(l=>l.id===t.lot)||{id:t.lot}))+'</div>').join('')+'<h3 class="sectionline">Evidencias e historial</h3><div class="tasksroll">'+history+ep.events.slice().reverse().map(ev=>'<div class="event">'+date(ev.date)+' · '+safe(ev.text)+'</div>').join('')+'</div><div class="actions">'+(ep.result!=='Declinado'&&!ep.interrupted&&open.length?btn('interrupt','Interrumpir seguimiento',id):'')+(ep.interrupted?btn('resume','Reabrir seguimiento',id):'')+(!ep.interrupted&&ep.result!=='Declinado'&&open.length?btn('transfer',ep.transfer?'Acusar traslado':'Trasladar folio',id):'')+'</div>');
}
function editTask(id){
 const t=st.tasks.find(x=>x.id===id);if(!t)return;const ep=here(t.ep);
 if(ep.interrupted){episode(ep.id);toast('El seguimiento está interrumpido.');return;}
 const proofName={visit:'Constancia de asistencia de la unidad',report:'Constancia del trámite oficial',resolve:'Referencia del informe autorizado',receipt:'Acuse o motivo de rechazo',deliver:'Constancia de entrega privada',repeat:'Referencia de la repetición'}[t.type]||'Referencia de evidencia';
 let extra='';
 if(t.type==='repeat')extra=(ep.patientRef?'':patientFields())+field('Lote',select('lot',trials(ep.site)))+field('Nueva lectura',select('result',results));
 if(t.type==='resolve')extra=field('Resolución del informe',select('decision',[['','Seleccionar resolución'],'Confirmado','Descartado','Inconcluso']),true)+field('Autor ficticio del dictamen',input('author','Equipo de laboratorio'))+field('Versión de algoritmo',input('protocol','Código del procedimiento'));
 if(t.type==='receipt')extra=field('Estado de recepción',select('outcome',['Recibida','Rechazada']),true);
 if(t.type==='deliver'&&ep.result==='No reactivo')extra=field('Reevaluación indicada',select('recheck',['No','Sí']),true);
 form(labels[t.type],'<p class="hint full">'+safe(t.owner)+' · Vence '+date(t.due)+'</p>'+extra+field(proofName,input('ref','Referencia ficticia'),true)+field('Fecha de evidencia',input('date','',TODAY,'date','max="'+TODAY+'" min="'+ep.created+'"'),true),t.type==='visit'?'Acreditar atención':'Guardar evidencia',f=>act(n=>closeTask(n,id,{...f,review:f.recheck==='Sí'}),'Evidencia registrada',()=>episode(ep.id)),ep.id);
}
function assign(id){
 const t=st.tasks.find(x=>x.id===id),ep=here(t.ep);form('Reasignar tarea',field('Responsable',input('owner','Función o equipo',t.owner),true)+field('Nuevo vencimiento',input('due','',t.due,'date','min="'+ep.created+'"'),true)+field('Motivo de reasignación',input('reason','Ej. Cambio de turno'),true),'Guardar reasignación',f=>act(n=>{if(!f.owner.trim()||!f.reason.trim())throw Error('Completa el responsable y el motivo.');const nt=n.tasks.find(x=>x.id===id);event(n.episodes.find(x=>x.id===ep.id),'Reasignación de '+nt.owner+' a '+f.owner+' · Vencimiento anterior '+nt.due+' · '+f.reason);nt.owner=f.owner.trim();nt.due=f.due;},'Tarea reasignada',()=>episode(ep.id)),ep.id);
}
function shiftForm(){form('Crear jornada',field('Nombre de la jornada',input('name','Nombre de la jornada ficticia'),true)+field('Sede',select('site',Object.entries(sites).map(([v,s])=>[v,s.name]),site))+field('Fecha',input('date','',TODAY,'date','min="'+TODAY+'"'))+field('Meta de episodios',input('goal','',12,'number','min="1" max="10000"'),true),'Guardar jornada',f=>act(n=>{if(!f.name.trim())throw Error('Indica un nombre.');n.jornadas.push({id:'J-'+(n.jornadas.length+1),site:f.site,name:f.name.trim(),date:f.date,goal:Number(f.goal),status:'Programada'});},'Jornada programada'));}
function shiftStatus(id){const j=st.jornadas.find(x=>x.id===id),close=j.status==='Abierta';form(close?'Cerrar jornada':'Abrir jornada','<p class="hint full">'+(close?'Las tareas de seguimiento continúan en la bandeja después del cierre.':'Las altas estarán disponibles a partir de la fecha de la jornada.')+'</p>'+field(close?'Referencia del cierre de turno':'Responsable del turno',input('ref','Referencia ficticia'),true),close?'Confirmar cierre':'Abrir jornada',f=>act(n=>{if(!f.ref.trim())throw Error('Completa la referencia.');const r=n.jornadas.find(x=>x.id===id);if(!close&&r.date>TODAY)throw Error('La jornada está programada después de la fecha de corte.');r.status=close?'Cerrada':'Abierta';r.lastRef=f.ref;},'Jornada actualizada'),j.name);}
function ship(){
 const eps=selected().filter(e=>e.result==='Reactivo'&&['Pendiente','Inconcluso'].includes(e.decision)&&!e.interrupted&&!st.samples.some(s=>s.episode===e.id&&s.status==='En tránsito'));if(!eps.length){toast('Sin folios pendientes de diagnóstico disponibles para envío.');return;}
 form('Registrar envío',field('Folio',select('ep',eps.map(e=>e.id)),true)+field('Remisión ficticia',input('ref','Ej. REM-018'),true),'Registrar salida',f=>act(n=>{if(!f.ref.trim())throw Error('Indica la remisión.');const ep=n.episodes.find(e=>e.id===f.ep);n.samples.push({id:'M-'+String(n.samples.length+10).padStart(3,'0'),episode:f.ep,receiver:sites[ep.site].lab,status:'En tránsito',ref:f.ref});addTask(n,ep,'receipt',TODAY,sites[ep.site].lab);event(ep,'Muestra enviada · '+f.ref);},'Muestra en tránsito'));}
function appointment(id){
 const ep=here(id);form('Gestionar cita',field('Situación',select('status',['Solicitada','Agendada','Inasistencia','Receptor alterno']),true)+field('Fecha de la gestión o cita',input('date','',TODAY,'date'),true)+field('Referencia institucional',input('ref','Referencia ficticia'),true),'Guardar gestión',f=>act(n=>{if(!f.ref.trim())throw Error('Indica la referencia.');const e=n.episodes.find(x=>x.id===id);e.cita=f.status;event(e,'Referencia '+f.status.toLowerCase()+' · '+f.date+' · '+f.ref);},'Gestión registrada. La asistencia sigue pendiente.'),ep.id);
}
function transfer(id){const ep=here(id);if(ep.transfer){form('Acusar traslado','<p class="hint full">Destino: '+sites[ep.transfer].name+'.</p>'+field('Acuse de la sede receptora',input('ref','Referencia ficticia'),true),'Aceptar traslado',f=>act(n=>{if(!f.ref.trim())throw Error('Indica el acuse.');const e=n.episodes.find(q=>q.id===id),old=e.site;e.site=e.transfer;delete e.transfer;event(e,'Traslado '+sites[old].name+' a '+sites[e.site].name+' · '+f.ref);n.tasks.filter(t=>t.ep===id&&!t.proof).forEach(t=>{if(t.type==='receipt')return;t.owner=({report:'Epidemiología '+e.site,resolve:sites[e.site].lab,visit:sites[e.site].receiver,deliver:sites[e.site].name,repeat:sites[e.site].name})[t.type]||sites[e.site].owner;});},'Traslado acreditado',()=>episode(id)),id);return;}
 form('Trasladar folio',field('Sede receptora',select('dest',Object.entries(sites).filter(([v])=>v!==ep.site).map(([v,s])=>[v,s.name])),true)+field('Referencia del envío',input('ref','Referencia ficticia'),true),'Solicitar traslado',f=>act(n=>{if(!f.ref.trim())throw Error('Indica la referencia.');const e=n.episodes.find(q=>q.id===id);e.transfer=f.dest;event(e,'Traslado solicitado a '+sites[f.dest].name+' · '+f.ref);},'En espera del acuse receptor',()=>episode(id)),id);
}
function pause(id,resume){form(resume?'Reabrir seguimiento':'Interrumpir seguimiento',field('Motivo',input('reason','Motivo ficticio'),true),'Guardar cambio',f=>act(n=>{if(!f.reason.trim())throw Error('Indica el motivo.');const ep=n.episodes.find(e=>e.id===id);if(!resume&&n.tasks.some(t=>t.ep===id&&t.type==='report'&&!t.proof))throw Error('La notificación oficial pendiente debe permanecer activa.');ep.interrupted=!resume;event(ep,(resume?'Seguimiento reabierto':'Seguimiento interrumpido')+' · '+f.reason);},'Seguimiento actualizado',()=>episode(id)),id);}
function lotMove(receivingSite=''){
  const scope=receivingSite||site;
  const available=st.lots.filter(lot=>(!scope||lot.site===scope)&&
    (!receivingSite||(lot.status==='Liberado'&&lot.expiry>=TODAY)));
  const choices=available.map(lot=>[lot.id,lotNumber(lot)+' · '+sites[lot.site].name]);
  choices.push([NEW_LOT,'＋ Nuevo lote']);
  const siteOptions=scope?[[scope,sites[scope].name]]:
    [['','Selecciona una sede'],...Object.entries(sites).map(([id,s])=>[id,s.name])];
  const statusOptions=receivingSite?['Liberado']:['Liberado','Cuarentena'];
  const newFields='<fieldset class="new-lot-fields full" disabled hidden>'+
    field('Número de lote',input('code','Ej. MX-2026-01'),true)+
    field('Sede de recepción',select('lotSite',siteOptions,scope))+
    field('Caducidad',input('expiry','','','date',receivingSite?'min="'+TODAY+'"':''))+
    field('Estado al recibir',select('status',statusOptions),true)+'</fieldset>';
  form(receivingSite?'Recibir reposición':'Movimiento de inventario',
    field('Lote',select('lot',choices),true)+newFields+
    field('Movimiento',select('type',receivingSite?['Entrada']:movementTypes))+
    field('Unidades',input('qty','',1,'number','min="1" max="100000" step="1"'))+
    field('Folio del movimiento',input('ref','Referencia ficticia'),true),'Guardar movimiento',
    values=>act(next=>recordLotMovement(next,values,{site,receivingSite}),'Inventario actualizado'));
  const formNode=$('#edit-form');
  const controls=formNode.elements;
  const fields=formNode.querySelector('.new-lot-fields');
  function syncFields(){
    const creating=controls.lot.value===NEW_LOT;
    fields.hidden=!creating;fields.disabled=!creating;
    if(creating)controls.type.value='Entrada';
    for(const option of controls.type.options)option.disabled=creating&&option.value!=='Entrada';
    controls.qty.disabled=['Cuarentena','Liberar'].includes(controls.type.value);
  }
  controls.lot.onchange=()=>{syncFields();if(!fields.hidden)controls.code.focus();};
  controls.type.onchange=syncFields;
  syncFields();
}
function transport(id){form('Entrega al laboratorio',field('Referencia de entrega',input('ref','Acuse ficticio'),true),'Guardar entrega',f=>act(n=>{if(!f.ref.trim())throw Error('Indica una referencia de entrega.');const sample=n.samples.find(s=>s.id===id);sample.custodia=f.ref.trim();const ep=n.episodes.find(e=>e.id===sample.episode);event(ep,'Entrega de transporte documentada · '+sample.custodia);},'Entrega registrada. El laboratorio debe acusar recepción.'),id);}
const handlers={transport,nav,episode,task:editTask,assign,'add-shift':shiftForm,'shift-status':shiftStatus,ship,appt:appointment,'lot-detail':lotDetail,'lot-move':()=>lotMove(),'receive-stock':lotMove,reorder:id=>act(n=>{if(n.requests.some(r=>r.site===id&&!r.closed))throw Error('Ya existe una solicitud abierta.');n.requests.push({site:id,date:TODAY,closed:false});},'Reposición solicitada'),transfer,interrupt:id=>pause(id,false),resume:id=>pause(id,true),dismiss:()=>dlg.close()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)handlers[b.dataset.action]?.(b.dataset.id);});
async function boot(){
 try{
  const response=await fetch('/api/screening',{headers:{'Accept':'application/json'}});
  const body=await response.json();
  if(!response.ok)throw Error(body.error||'No fue posible cargar Tamizaje.');
  revision=body.revision||0;
  if(body.data)st=body.data;
  else await persist(st,0);
 }catch(e){toast(e.message);}
 activate(location.hash.slice(1));
}
boot();
