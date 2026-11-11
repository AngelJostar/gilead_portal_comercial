import {TODAY,sites,usable,lotNumber,demoPatientName} from './model.js';

// Each test consumes one kit, even when an invalid test is repeated.
// Inventory movements of type Aplicación describe those same tests.
export function lotInventory(state,lot){
  const applications=[];
  for(const episode of state.episodes){
    episode.tests.forEach((test,index)=>{
      if(test.lot!==lot.id || (test.site && test.site!==lot.site))return;
      applications.push({
        date:test.date,episode:episode.id,patient:episode.patientRef||'',
        alias:episode.patientAlias||demoPatientName(episode.patientRef),result:test.result,attempt:index+1
      });
    });
  }
  applications.sort((a,b)=>a.date.localeCompare(b.date)||a.episode.localeCompare(b.episode)||a.attempt-b.attempt);
  const movements=state.moves.filter(move=>move.site===lot.site&&move.lot===lot.id);
  const receipts=movements.filter(move=>move.type==='Entrada');
  const exits=movements.filter(move=>move.type==='Control'||move.type==='Merma');
  const received=receipts.reduce((sum,m)=>sum+m.qty,0);
  const otherUsed=exits.reduce((sum,m)=>sum-m.qty,0);
  // Older session snapshots recorded on-hand stock and subsequent movements,
  // but did not store a separate opening balance.
  const opening=lot.openingQty??(lot.qty+applications.length+otherUsed-received);
  return {opening,received,entered:opening+received,used:applications.length,
    otherUsed,remaining:lot.qty,applications,exits};
}

export const NEW_LOT=':nuevo:';
export const movementTypes=['Entrada','Control','Merma','Cuarentena','Liberar'];

function incomingLot(state,values,scope){
  const code=(values.code||'').trim();
  const site=scope||values.lotSite;
  const expiry=values.expiry||'';
  if(!code||code.length>75)throw Error('Indica el número del nuevo lote.');
  if(!Object.hasOwn(sites,site))throw Error('Selecciona la sede que recibe el lote.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(expiry)||!Number.isFinite(Date.parse(expiry))||
    new Date(expiry).toISOString().slice(0,10)!==expiry)throw Error('Indica una caducidad válida.');
  if(!['Liberado','Cuarentena'].includes(values.status))throw Error('Selecciona el estado del lote.');
  const normalize=value=>value.trim().normalize('NFC').toLocaleUpperCase('es-MX');
  if(state.lots.some(l=>l.site===site&&normalize(lotNumber(l))===normalize(code)))
    throw Error('El lote ya existe en esta sede. Selecciónalo en la lista para sumar las unidades.');
  return {id:'lote/'+site+'/'+encodeURIComponent(normalize(code)),code,site,expiry,status:values.status,openingQty:0,qty:0};
}

export function recordLotMovement(state,values,{site='',receivingSite=''}={}){
  const {type}=values,ref=(values.ref||'').trim(),creating=values.lot===NEW_LOT;
  if(!ref)throw Error('Indica el folio del movimiento.');
  if(!movementTypes.includes(type))throw Error('Selecciona un movimiento válido.');
  if((creating||receivingSite)&&type!=='Entrada')throw Error('El movimiento debe ser una entrada.');
  if(state.moves.some(m=>m.type===type&&m.ref===ref))throw Error('Este movimiento ya se registró.');
  const scope=receivingSite||site;
  const lot=creating?incomingLot(state,values,scope):state.lots.find(l=>l.id===values.lot);
  if(!lot||(scope&&lot.site!==scope))throw Error('Selecciona un lote de la sede indicada.');
  const statusOnly=type==='Cuarentena'||type==='Liberar';
  const units=statusOnly?0:Number(values.qty);
  if(!statusOnly&&(!Number.isSafeInteger(units)||units<1||units>100000))
    throw Error('Registra un número entero de piezas entre 1 y 100000.');
  if(type==='Liberar'&&lot.expiry<TODAY)throw Error('No se puede liberar un lote vencido.');
  if(type==='Control'&&usable(lot)<units)throw Error('Existencias utilizables insuficientes.');
  const delta=type==='Entrada'?units:statusOnly?0:-units;
  if(lot.qty+delta<0)throw Error('Cantidad superior al saldo físico.');
  const request=receivingSite&&state.requests.find(r=>r.site===receivingSite&&!r.closed);
  if(receivingSite){
    if(!request)throw Error('Sin solicitud abierta.');
    if(lot.status!=='Liberado'||lot.expiry<TODAY)throw Error('Para cubrir la reposición, el lote debe estar liberado y vigente.');
  }

  if(creating)state.lots.push(lot);
  if(statusOnly)lot.status=type==='Liberar'?'Liberado':'Cuarentena';
  lot.qty+=delta;
  state.moves.push({site:lot.site,lot:lot.id,qty:delta,type,ref,date:TODAY});
  if(request){request.closed=true;request.ref=ref;}
  return lot.id;
}
