import {PRODUCTS,balance,usedFor,hasSource} from './model.js';
import {esc,fmt,dateLabel,select,field,input,button} from './ui.js';

export function renderForm({s,kind,params,today,episodes,point,doctor,product,entryLabel}){
 const $=selector=>document.querySelector(selector);
 const pItems=s.points.map(p=>[p.id,p.name]),dItems=s.doctors.map(d=>[d.id,d.name+' · '+d.site]),patItems=s.patients.map(p=>[p.id,p.id+' · '+doctor(p.doctor)]);
 const sel=(name,label,entries,val='',wide=false)=>field(name,label,select(name,entries,val),wide);
 const dateField=()=>field('date','Fecha de registro',input('date','date',today,'max="'+esc(today)+'"'));
 const qtyField=()=>field('qty','Cantidad en unidades',input('qty','number','1','min="1" max="1000000" step="1"'));
 const assignment=(doc='',pt='')=>sel('doctor','Médico tratante',dItems,doc)+sel('point','Punto de atención',pItems,pt);
 const show=(heading,context,fields,submit,wire,help='')=>({heading,context,wire,
  html:'<form id="edit-form">'+(help?'<p class="help">'+esc(help)+'</p>':'')+'<div class="fields">'+fields+'</div><p id="form-error" class="error" role="alert"></p><div class="dialog-actions">'+button('close','Cancelar','','secondary')+'<button class="primary" type="submit">'+esc(submit)+'</button></div></form>'});
 const wide=id=>'<div class="wide fields" id="'+id+'"></div>';
 if(kind==='patient'){
  const available=episodes.filter(e=>e.decision==='Confirmado'&&!hasSource(s,e.id)).map(e=>[e.id,e.id+' · Sede '+e.site]);
  return show('Nuevo paciente','Pacientes',field('folio','Origen',select('folio',[['','Alta directa'],...available],'',false),true)+assignment(),'Crear número de paciente',null,'El sistema asigna un número único. Puedes seleccionar un folio confirmado o registrar un alta directa.');
 }
 if(kind==='link'){
  return show('Vincular '+params.folio,'Tamizaje · Dictamen confirmado',
   sel('mode','Asignación',[['new','Crear nuevo número de paciente'],['existing','Vincular con paciente existente']],'new',true)+wide('link-fields'),'Vincular paciente',()=>{
    const update=()=>{$('#link-fields').innerHTML=$('#f-mode').value==='new'?assignment():sel('existing','Paciente registrado',[['','Selecciona un paciente'],...patItems],'',true);};
    $('#f-mode').onchange=update;update();
   });
 }
 if(kind==='assignment'){
  const p=s.patients.find(p=>p.id===params.patient);
  return show('Cambiar asignación',p.id,assignment(p.doctor,p.point),'Guardar asignación',null,'El historial conserva el punto y el médico anteriores.');
 }
 if(kind==='doctor'||kind==='point'){
  const isPoint=kind==='point';
  const nameField=field('name',isPoint?'Nombre del punto':'Nombre del médico',input('name','text','','maxlength="80"'),true);
  return show(isPoint?'Agregar punto':'Agregar médico',isPoint?'Red e inventarios':'Médicos tratantes',nameField+(isPoint?sel('type','Tipo de punto',['Farmacia','Distribuidor'])+field('city','Ciudad o entidad',input('city','text','','maxlength="80"')):field('site','Unidad de atención',input('site','text','','maxlength="80"'),true)),isPoint?'Agregar punto':'Agregar médico');
 }
 if(kind==='use'){
  const deliveries=s.moves.filter(m=>m.type==='Entrega'&&usedFor(s,m.id)<m.qty);
  const patients=s.patients.filter(p=>deliveries.some(m=>m.patient===p.id)&&(!params.patient||params.patient===p.id));
  if(!patients.length)return {heading:'Registrar consumo',context:params.patient||'Consumos',html:'<p class="help">No hay entregas con unidades pendientes de reportar. Registra una entrega para este paciente.</p><div class="dialog-actions">'+button('close','Cerrar','','secondary')+'</div>'};
  return show('Registrar consumo','Consumos',sel('patient','Paciente',patients.map(p=>[p.id,p.id+' · '+doctor(p.doctor)]),params.patient||patients[0].id,true)+wide('use-deliveries')+dateField()+qtyField()+'<p class="wide help" id="remaining"></p>','Registrar consumo',()=>{
   function showBalance(){
    const m=deliveries.find(m=>m.id===$('#f-move').value);
    const remaining=m.qty-usedFor(s,m.id);
    $('#remaining').textContent=point(m.from)+' · '+doctor(m.doctor)+' · '+remaining+' unidades pendientes de reportar.';
    $('#f-qty').max=remaining;$('#f-date').min=m.date;
   }
   function showDeliveries(){
    const items=deliveries.filter(m=>m.patient===$('#f-patient').value).reverse();
    $('#use-deliveries').innerHTML=sel('move','Entrega y lote',items.map(m=>[m.id,m.id+' · '+entryLabel(m)+' · '+dateLabel(m.date)]),'',true);
    $('#f-move').onchange=showBalance;showBalance();
   }
   $('#f-patient').onchange=showDeliveries;showDeliveries();
  });
 }
 const defaultType=params.type||'Entrega';
 return show('Registrar movimiento','Desplazamientos',sel('type','Tipo de movimiento',['Entrega','Traspaso','Entrada'],defaultType,true)+wide('route-fields')+dateField()+qtyField()+wide('lot-fields')+wide('new-lot-fields')+'<p class="wide help" id="move-info"></p>','Guardar movimiento',()=>{
  const type=$('#f-type'),date=$('#f-date'),quantity=$('#f-qty');
  function showLotFields(){
   const previously=$('#f-lot')?.value||'';
   let items;
   if(type.value==='Entrada'){
    items=s.lots.filter(l=>l.expiry>=date.value).map(l=>[l.id,product(l.product)+' · '+l.code]);
    items.push(['new','Registrar un lote nuevo']);
   }else{
    const from=$('#f-from').value;
    items=s.lots.map(l=>[l,balance(s,from,l.id,date.value)]).filter(([l,n])=>n>0&&l.expiry>=date.value)
     .map(([l,n])=>[l.id,product(l.product)+' · '+l.code+' · '+fmt(n)+' u.']);
    if(!items.length)items=[['','Sin lotes disponibles']];
   }
   $('#lot-fields').innerHTML=sel('lot','Producto y lote',items,previously,true);
   $('#f-lot').onchange=showLotDetail;showLotDetail();
  }
  function showLotDetail(){
   const lotId=$('#f-lot').value,lot=s.lots.find(l=>l.id===lotId);
   $('#new-lot-fields').innerHTML=lotId==='new'?sel('product','Producto',PRODUCTS.map(p=>[p.id,p.name]))+field('code','Código de lote',input('code','text','','maxlength="40"'))+field('expiry','Caducidad',input('expiry','date','','min="'+esc(date.value)+'"')):'';
   const stock=type.value==='Entrada'||!lot?null:balance(s,$('#f-from').value,lot.id,date.value);
   quantity.max=stock===null?'1000000':String(stock);
   const notes=type.value==='Traspaso'?'El traspaso registra la salida y la entrada por la misma cantidad.':type.value==='Entrega'?'La entrega descuenta existencias en el punto que despacha.':'La entrada suma existencias al punto receptor.';
   $('#move-info').textContent=notes+(lot?' Caducidad: '+dateLabel(lot.expiry)+'.':'');
  }
  function fillRoute(){
   const p=s.patients.find(p=>p.id===params.patient)||s.patients[0];
   let fields='';
   if(type.value==='Entrega'){
    fields=sel('patient','Paciente',patItems,p.id,true)+sel('from','Punto que entrega',pItems,p.point)+sel('doctor','Médico de esta entrega',dItems,p.doctor);
   }else if(type.value==='Traspaso'){
    fields=sel('from','Punto de origen',pItems)+sel('to','Punto de destino',pItems.filter(([id])=>id!==pItems[0][0]));
   }else fields=sel('to','Punto que recibe',pItems,params.to||pItems[0][0],true);
   $('#route-fields').innerHTML=fields;
   if(type.value==='Entrega')$('#f-patient').onchange=()=>{
    const p=s.patients.find(p=>p.id===$('#f-patient').value);
    $('#f-from').value=p.point;$('#f-doctor').value=p.doctor;showLotFields();
   };
   if(type.value!=='Entrada')$('#f-from').onchange=()=>{
    if(type.value==='Traspaso'){
     const dest=$('#f-to'),previous=dest.value;dest.innerHTML='';
     for(const [id,name] of pItems)if(id!==$('#f-from').value)dest.add(new Option(name,id,false,id===previous));
    }
    showLotFields();
   };
   showLotFields();
  }
  type.onchange=fillRoute;date.onchange=showLotFields;fillRoute();
 });
}

