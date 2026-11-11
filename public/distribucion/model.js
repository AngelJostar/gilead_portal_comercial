// Each movement holds a product lot and a quantity in dispensing units.
export const PRODUCTS = [
  {id:'P-A',name:'Producto A'}, {id:'P-B',name:'Producto B'}, {id:'P-C',name:'Producto C'}
];
export const STORE_KEY = 'gilead.distribucion.demo.v1';

function requireValue(value, message) { if (!value) throw new Error(message); }
function positive(value) {
  const n = Number(value);
  requireValue(Number.isSafeInteger(n) && n > 0 && n <= 1000000, 'La cantidad debe ser un entero entre 1 y 1,000,000.');
  return n;
}
function dateOk(date, today) {
  requireValue(/^\d{4}-\d\d-\d\d$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date+'T12:00:00Z').toISOString().slice(0,10) === date && date <= today, 'Selecciona una fecha válida hasta el corte del piloto.');
}
const nextId = (items,prefix) => prefix+'-'+String(Math.max(0,...items.map(x=>Number(x.id.split('-').pop())))+1).padStart(4,'0');
export function initial(episodes) {
  const points = [
    {id:'RED-0001', name:'Distribuidora Central', type:'Distribuidor', city:'Ciudad de México'},
    {id:'RED-0002', name:'Farmacia Alameda', type:'Farmacia', city:'Ciudad de México'},
    {id:'RED-0003', name:'Farmacia del Valle', type:'Farmacia', city:'Ciudad de México'},
    {id:'RED-0004', name:'Distribuidora Oriente', type:'Distribuidor', city:'Estado de México'}
  ];
  const doctors = [{id:'MED-0001',name:'Dra. Elena Ríos',site:'Unidad A'},{id:'MED-0002',name:'Dr. Manuel Vega',site:'Unidad B'},{id:'MED-0003',name:'Dra. Isabel León',site:'Unidad A'}];
  const patients = [1,2,3,4].map((n,i)=>({
    id:'DIS-000'+n, doctor:doctors[i%3].id,point:points[[1,2,3,1][i]].id,
    created:i===3?'2026-11-05':'2026-06-01',sources:i===3&&episodes.some(e=>e.id==='SIM-005'&&e.decision==='Confirmado')?['SIM-005']:[],visits:[]
  }));
  const lots = [{id:'LOT-0001',code:'AL26-01',product:'P-A',expiry:'2027-05-30'},
    {id:'LOT-0002',code:'BE26-02',product:'P-B',expiry:'2027-08-31'},
    {id:'LOT-0003',code:'CE26-03',product:'P-C',expiry:'2027-03-31'}];
  const state = {version:1,points,doctors,patients,lots,moves:[],uses:[]};
  function add(type,date,lot,qty,from='',to='',patient='') {
    const doctor=patients.find(p=>p.id===patient)?.doctor || '';
    const m={id:nextId(state.moves,'MOV'),type,date,lot:lots[lot].id,qty,from,to,patient,doctor};
    state.moves.push(m);return m;
  }
  lots.forEach((l,i)=>{
    add('Entrada','2026-06-01',i,[180,145,104][i],'',points[0].id);
    for(const [j,quantity] of [[1,[54,33,18][i]],[2,[39,28,15][i]],[3,[21,24,32][i]]])
      add('Traspaso','2026-06-02',i,quantity,points[0].id,points[j].id);
  });
  function dispense(i,date,lot,qty,used,usedDate){
    const p=patients[i],m=add('Entrega',date,lot,qty,p.point,'',p.id);
    if(used)state.uses.push({id:nextId(state.uses,'CON'),date:usedDate,move:m.id,qty:used});
  }
  dispense(0,'2026-06-12',0,7,6,'2026-06-20');dispense(1,'2026-06-21',1,5,4,'2026-06-28');
  dispense(2,'2026-07-07',2,10,9,'2026-07-25');dispense(0,'2026-07-14',0,7,6,'2026-07-24');
  dispense(1,'2026-08-03',1,9,8,'2026-08-26');dispense(0,'2026-08-17',0,10,9,'2026-08-27');
  dispense(2,'2026-09-05',2,12,11,'2026-09-26');dispense(1,'2026-09-12',1,6,5,'2026-09-25');
  dispense(0,'2026-10-09',0,12,10,'2026-10-30');dispense(2,'2026-10-18',1,10,9,'2026-10-29');
  dispense(1,'2026-11-02',0,8,3,'2026-11-05');dispense(3,'2026-11-05',2,6,2,'2026-11-06');
  return state;
}
export const usedFor = (s,id) => s.uses.filter(u=>u.move===id).reduce((total,u)=>total+u.qty,0);
export function balance(s,point,lot,asOf='9999-12-31') {
  return s.moves.filter(m=>m.lot===lot && m.date<=asOf).reduce((n,m)=>n+(m.to===point?m.qty:0)-(m.from===point?m.qty:0),0);
}
export const hasSource = (s,folio) => s.patients.find(p=>p.sources.includes(folio));
export function linkSource(s,patient,folio,episodes) {
  requireValue(episodes.some(e=>e.id===folio&&e.decision==='Confirmado'), 'El folio debe tener un dictamen confirmado en Tamizaje.');
  const existing=hasSource(s,folio);
  requireValue(!existing || existing.id===patient.id,'Este folio ya se vinculó a otro paciente.');
  if(!existing)patient.sources.push(folio);
}
function checkAssignment(s,doctor,point) {
  requireValue(s.doctors.some(d=>d.id===doctor),'Selecciona un médico tratante.');
  requireValue(s.points.some(p=>p.id===point),'Selecciona un punto de atención.');
}
export function newPatient(s,fields,episodes,today) {
  checkAssignment(s,fields.doctor,fields.point);
  const p={id:nextId(s.patients,'DIS'),created:today,doctor:fields.doctor,point:fields.point,sources:[],visits:[]};
  if(fields.folio)linkSource(s,p,fields.folio,episodes);
  s.patients.push(p);return p;
}
export function assign(s,id,doctor,point,today) {
  const p=s.patients.find(p=>p.id===id);requireValue(p,'Paciente no encontrado.');
  checkAssignment(s,doctor,point);
  requireValue(doctor!==p.doctor||point!==p.point,'Selecciona un médico o un punto diferente.');
  p.visits.push({date:today,from:p.point,to:point,oldDoctor:p.doctor,doctor});
  p.doctor=doctor;p.point=point;
}
export function recordMove(s,f,today) {
  dateOk(f.date,today);
  const qty=positive(f.qty),type=f.type;
  requireValue(['Entrada','Traspaso','Entrega'].includes(type),'Selecciona el tipo de movimiento.');
  const from=type==='Entrada'?'':f.from,to=type==='Entrega'?'':f.to;
  const validPoint=id=>s.points.some(p=>p.id===id);
  if(type!=='Entrada')requireValue(validPoint(from),'Selecciona el punto de origen.');
  if(type!=='Entrega')requireValue(validPoint(to),'Selecciona el punto receptor.');
  requireValue(from!==to,'El origen y el destino deben ser diferentes.');
  let lot=s.lots.find(l=>l.id===f.lot),newLot=null;
  if(type==='Entrada'&&f.lot==='new'){
    const code=(f.code||'').trim().toUpperCase();
    requireValue(code.length>0&&code.length<=40&&PRODUCTS.some(p=>p.id===f.product),'Indica el producto y el código de lote.');
    requireValue(/^\d{4}-\d\d-\d\d$/.test(f.expiry||'') && !Number.isNaN(Date.parse(f.expiry)) && new Date(f.expiry+'T12:00:00Z').toISOString().slice(0,10)===f.expiry,'Indica la caducidad del lote.');
    lot=s.lots.find(l=>l.product===f.product&&l.code.toUpperCase()===code);
    if(lot)requireValue(lot.expiry===f.expiry,'Este lote ya existe con otra caducidad.');
    else{newLot={id:nextId(s.lots,'LOT'),code,product:f.product,expiry:f.expiry};lot=newLot;}
  }
  requireValue(lot,'Selecciona un lote.');
  requireValue(lot.expiry>=f.date,'El lote está vencido en la fecha del movimiento.');
  if(from){
    const dates=new Set([f.date,...s.moves.filter(m=>m.lot===lot.id&&m.date>f.date&&(m.from===from||m.to===from)).map(m=>m.date)]);
    requireValue([...dates].every(date=>balance(s,from,lot.id,date)>=qty),'Existencias insuficientes en el punto de origen para esa fecha.');
  }
  const patient=type==='Entrega'?s.patients.find(p=>p.id===f.patient):null;
  if(type==='Entrega')requireValue(patient&&patient.created<=f.date,'Elige un paciente dado de alta en la fecha de entrega.');
  const doctor=patient?(type==='Entrega'&&f.doctor?f.doctor:patient.doctor):'';
  if(patient)requireValue(s.doctors.some(d=>d.id===doctor),'Selecciona un médico tratante.');
  if(newLot)s.lots.push(lot);
  const m={id:nextId(s.moves,'MOV'),type,date:f.date,qty,lot:lot.id,from,to,patient:patient?.id||'',doctor};
  s.moves.push(m);return m;
}
export function recordUse(s,f,today) {
  dateOk(f.date,today);
  const qty=positive(f.qty),m=s.moves.find(m=>m.type==='Entrega'&&m.id===f.move);
  requireValue(m&&m.date<=f.date,'Selecciona una entrega anterior o igual a la fecha del consumo.');
  requireValue(qty<=m.qty-usedFor(s,m.id),'El consumo supera la cantidad pendiente de esa entrega.');
  const u={id:nextId(s.uses,'CON'),move:m.id,date:f.date,qty};s.uses.push(u);return u;
}
export function addContact(s,kind,name,extra,type='') {
  name=(name||'').trim();extra=(extra||'').trim();
  requireValue(name&&extra&&name.length<=80&&extra.length<=80,'Completa los campos con un máximo de 80 caracteres.');
  const isPoint=kind==='point',list=isPoint?s.points:s.doctors;
  requireValue(!list.some(x=>x.name.toLocaleLowerCase('es-MX')===name.toLocaleLowerCase('es-MX')&&(isPoint?x.city:x.site).toLocaleLowerCase('es-MX')===extra.toLocaleLowerCase('es-MX')),'Ya existe un registro con ese nombre y ubicación.');
  if(isPoint)requireValue(['Farmacia','Distribuidor'].includes(type),'Selecciona el tipo de punto.');
  const item=isPoint?{id:nextId(list,'RED'),name,city:extra,type}:{id:nextId(list,'MED'),name,site:extra};
  list.push(item);return item;
}
