export const TODAY='2026-11-06';
export const sites={
 A:{name:'Sede A',state:'Ciudad de México',lab:'Laboratorio A',receiver:'Unidad A',owner:'Enlace A',daily:18,lead:5,reserve:30},
 B:{name:'Sede B',state:'Estado de México',lab:'Laboratorio B',receiver:'Unidad B',owner:'Enlace B',daily:10,lead:5,reserve:20}
};
export const labels={receipt:'Recibir muestra',resolve:'Resolver diagnóstico',repeat:'Repetir prueba',visit:'Primera atención',report:'Notificación oficial',deliver:'Entregar tamizaje',inform:'Entregar dictamen',recheck:'Reevaluación'};
export const results=['No reactivo','Reactivo','Inválido'];
const demoNames=new Map([
 ['PX-DEMO-001','Mariana Ortega'],
 ['PX-DEMO-002','Daniel Salgado'],
 ['PX-DEMO-003','Valeria Mendoza'],
 ['PX-DEMO-004','Sofía Ramírez'],
 ['PX-DEMO-005','Andrés Navarro'],
 ['PX-DEMO-006','Lucía Herrera']
]);
export const demoPatientName=folio=>demoNames.get(folio)||'';
export const lotNumber=lot=>lot.code||lot.id;
export function initial(){
 const layout=[['001','A','No reactivo','No aplica'],['002','B','Reactivo','Pendiente'],['003','A','Reactivo','Confirmado'],['004','B','Inválido','Pendiente'],['005','A','Reactivo','Confirmado'],['006','B','Reactivo','Descartado']];
 const episodes=layout.map(([id,site,result,decision])=>({id:'SIM-'+id,patientRef:'PX-DEMO-'+id,patientAlias:demoPatientName('PX-DEMO-'+id),site,origin:site,jornada:'J-'+site,created:'2026-11-'+({'001':'04','002':'05','003':'03','004':'05','005':'02','006':'02'}[id]),result,decision,consent:'CONS-'+id,tests:[{result,site,lot:site==='A'?'A-100':'B-201',date:'2026-11-'+({'001':'04','002':'05','003':'03','004':'05','005':'02','006':'02'}[id])}],events:[],interrupted:false}));
 const st={version:1,episodes,tasks:[],samples:[{id:'M-002',episode:'SIM-002',status:'En tránsito',receiver:'Laboratorio B'}],lots:[
 {id:'A-100',openingQty:108,site:'A',qty:105,expiry:'2027-02-10',status:'Liberado'},{id:'A-101',openingQty:20,site:'A',qty:20,expiry:'2026-12-12',status:'Cuarentena'},
 {id:'B-201',openingQty:98,site:'B',qty:95,expiry:'2027-04-20',status:'Liberado'},{id:'B-202',openingQty:10,site:'B',qty:10,expiry:'2026-10-31',status:'Liberado'}],
 jornadas:[{id:'J-A',site:'A',name:'Jornada urbana',date:TODAY,goal:18,status:'Abierta'},{id:'J-B',site:'B',name:'Brigada comunitaria',date:TODAY,goal:12,status:'Abierta'}],requests:[],moves:[]};
 episodes.forEach(ep=>{
  event(ep,'Prueba aplicada · '+ep.result,ep.created);
  if(ep.result!=='Inválido')addTask(st,ep,'deliver',ep.created,'Sede '+ep.site,{ref:'ENT-'+ep.id,date:ep.created});
  if(['Confirmado','Descartado'].includes(ep.decision)){
   addTask(st,ep,'resolve',ep.created,sites[ep.site].lab,{ref:'INF-'+ep.id,date:ep.id==='SIM-005'?'2026-11-03':'2026-11-04'});
   addTask(st,ep,'inform','2026-11-04',sites[ep.site].owner,{ref:'ENT-D'+ep.id,date:'2026-11-04'});
  }
  if(ep.decision==='Confirmado'){
   addTask(st,ep,'report','2026-11-04','Epidemiología '+ep.site,{ref:'NOT-'+ep.id,date:'2026-11-04'});
   addTask(st,ep,'visit',ep.id==='SIM-005'?'2026-11-05':'2026-11-07',sites[ep.site].receiver,ep.id==='SIM-005'?{ref:'ATN-05',date:'2026-11-05'}:null);
  }
  if(ep.id==='SIM-002'){addTask(st,ep,'resolve',TODAY,sites.B.owner);addTask(st,ep,'receipt','2026-11-05',sites.B.lab);}
  if(ep.id==='SIM-004')addTask(st,ep,'repeat',TODAY,'Sede B');
 });
 return st;
}
export function addTask(st,ep,type,due=TODAY,owner=sites[ep.site].owner,proof=null){
 const open=st.tasks.find(t=>t.ep===ep.id&&t.type===type&&!t.proof);
 if(open)return open;
 const t={id:'T-'+(st.tasks.length+1),ep:ep.id,type,due,owner,proof};st.tasks.push(t);return t;
}
export function event(ep,text,date=TODAY){ep.events.push({text,date});}
export function done(st,ep,type){return st.tasks.some(t=>t.ep===ep.id&&t.type===type&&t.proof);}
export function usable(l){return l.expiry>=TODAY&&l.status==='Liberado'?l.qty:0;}
export function phase(st,ep){
 if(ep.interrupted)return 'Interrumpido';
 if(ep.result==='Declinado')return 'Oferta declinada';
 if(st.tasks.some(t=>t.ep===ep.id&&!t.proof))return 'En seguimiento';
 return 'Completo';
}
export function ttl(t){return t.proof?'Acreditada':t.due<TODAY?'Vencida':t.due===TODAY?'Hoy':'Programada';}
export function patientIdentity(ep,patientRef,patientAlias=''){
  const value=String(patientRef||'').trim();
  if(!value||value.length>75)throw Error('Registra el folio del paciente al que se aplica la prueba.');
  ep.patientRef=value;
  ep.patientAlias=String(patientAlias||'').trim().slice(0,75);
}

export function consume(st,ep,lotId,result){
 if(!results.includes(result))throw Error('Selecciona una lectura válida.');
 const l=st.lots.find(x=>x.id===lotId&&x.site===ep.site);
 if(!l||usable(l)<1)throw Error('El lote seleccionado no tiene existencias utilizables.');
 l.qty--;ep.result=result;ep.tests.push({result,site:l.site,lot:lotId,date:TODAY});event(ep,'Prueba aplicada · '+result+' · '+lotNumber(l));
 st.moves.push({site:ep.site,lot:l.id,qty:-1,type:'Aplicación',ref:ep.id,date:TODAY});
 if(result==='Inválido'){ep.decision='Pendiente';addTask(st,ep,'repeat',TODAY,'Sede '+ep.site);}
 else {
  ep.decision=result==='Reactivo'?'Pendiente':'No aplica';
  addTask(st,ep,'deliver',TODAY,'Sede '+ep.site);
  if(result==='Reactivo')addTask(st,ep,'resolve',TODAY,sites[ep.site].owner);
 }
}
export function createEpisode(st,{jornada,consent,ref,lot,result,patientRef,patientAlias}){
 const j=st.jornadas.find(x=>x.id===jornada&&x.status==='Abierta'&&x.date<=TODAY);
 if(!j)throw Error('Selecciona una jornada abierta.');
 if(consent==='Sí'&&!ref.trim())throw Error('Registra la referencia del consentimiento ficticio.');
 const id='SIM-'+String(Math.max(0,...st.episodes.map(e=>Number(e.id.split('-')[1])))+1).padStart(3,'0');
 const ep={id,site:j.site,origin:j.site,jornada,created:TODAY,consent:consent==='Sí'?ref:'Declinado',result:'Declinado',decision:'No aplica',tests:[],events:[],interrupted:false};
 if(consent==='Sí'){patientIdentity(ep,patientRef,patientAlias);consume(st,ep,lot,result);}else event(ep,'Oferta declinada · sin prueba');
 st.episodes.push(ep);return id;
}
export function closeTask(st,taskId,{ref,date,decision,lot,result,author,protocol,patientRef,patientAlias,review=false,outcome='Recibida'}){
 const t=st.tasks.find(x=>x.id===taskId);if(!t||t.proof)throw Error('La tarea ya fue atendida.');
 const ep=st.episodes.find(x=>x.id===t.ep);
 if(ep.interrupted)throw Error('Reabre el seguimiento antes de atender esta tarea.');
 if(!ref.trim()||!date||date<ep.created||date>TODAY)throw Error('Indica una referencia y una fecha entre la apertura del folio y el corte del piloto.');
 if(t.type==='resolve'&&st.samples.some(s=>s.episode===ep.id&&s.status==='En tránsito'))throw Error('El laboratorio debe registrar la recepción de la muestra primero.');
 if(t.type==='resolve'&&!['Confirmado','Descartado','Inconcluso'].includes(decision))throw Error('Selecciona el dictamen del profesional.');
 if(t.type==='resolve'&&(!author?.trim()||!protocol?.trim()))throw Error('Registra el autor y la versión de algoritmo del informe.');
 t.proof=t.type==='resolve'?{ref:ref.trim(),date,author:author.trim(),protocol:protocol.trim()}:{ref:ref.trim(),date};event(ep,labels[t.type]+' · '+ref,date);
 if(t.type==='repeat'){
   if(!ep.patientRef)patientIdentity(ep,patientRef,patientAlias);
   consume(st,ep,lot,result);
 }
 if(t.type==='deliver'&&review)addTask(st,ep,'recheck',TODAY,sites[ep.site].owner);
 if(t.type==='receipt'){
  const s=st.samples.find(x=>x.episode===ep.id&&x.status==='En tránsito');if(!s)throw Error('No hay una muestra en tránsito para este folio.');
  s.status=outcome;
  if(outcome==='Rechazada'){event(ep,'Muestra rechazada · gestionar nueva remisión');addTask(st,ep,'recheck',TODAY,sites[ep.site].owner);}
 }
 if(t.type==='resolve'){
  ep.decision=decision;
  if(decision==='Inconcluso')addTask(st,ep,'resolve',TODAY,sites[ep.site].owner);
  else addTask(st,ep,'inform',TODAY,sites[ep.site].owner);
  if(decision==='Confirmado'){
   addTask(st,ep,'report',TODAY,'Epidemiología '+ep.site);
   addTask(st,ep,'visit',TODAY,sites[ep.site].receiver);
  }
 }
}
export function stats(st,eps){
 const valid=eps.filter(e=>e.tests.some(t=>t.result!=='Inválido'));
 const screened=eps.filter(e=>e.tests.length);
 const reactive=valid.filter(e=>e.tests.find(t=>t.result!=='Inválido')?.result==='Reactivo');
 const confirmed=reactive.filter(e=>e.decision==='Confirmado');
 return {screened:screened.length,valid:valid.length,reactive:reactive.length,resolved:reactive.filter(e=>['Confirmado','Descartado'].includes(e.decision)).length,confirmed:confirmed.length,linked:confirmed.filter(e=>done(st,e,'visit')).length,reported:confirmed.filter(e=>done(st,e,'report')).length};
}
