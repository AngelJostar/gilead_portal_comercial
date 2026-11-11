(() => {
  const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stages=['Solicitada','Registrada','Surtida','Entregada'];
  function badge(status){
    return '<span class="order-status s'+stages.indexOf(status)+'">'+safe(status)+'</span>';
  }
  function details(o){
    const fields=[['Centro solicitante',o.center],['Paciente',o.patientName||o.patient],['Folio del paciente',o.patient],
      ['Médico tratante',o.doctor],['Fecha de infusión',o.day],['Tratamiento solicitado',o.treatment],
      ['Medicamento',o.medication],['Cantidad solicitada',o.quantity],['Distribuidor asignado',o.supplier]];
    const history=o.events.map(event=>{
      const stamp=new Date(event.at*1000).toLocaleString('es-MX');
      const caption={Registrada:'Folio del distribuidor',Surtida:'Remisión',Entregada:'Acuse de entrega'}[event.status];
      return '<li><strong>'+safe(event.status)+'</strong><small>'+safe(stamp)+' · '+safe(event.actor)+'</small>'+
        (event.reference?'<div>'+safe(caption)+': '+safe(event.reference)+'</div>':'')+
        (event.lot?'<div>Lote: '+safe(event.lot)+'</div>':'')+
        (event.notes?'<div>'+safe(event.notes)+'</div>':'')+'</li>';
    }).join('');
    return '<div class="order-head">'+badge(o.status)+'</div><dl class="order-detail">'+fields.map(([label,value])=>
      '<div><dt>'+safe(label)+'</dt><dd>'+safe(value)+'</dd></div>').join('')+'</dl><h3>Seguimiento</h3><ol class="order-events">'+history+'</ol>';
  }
  window.SupplyView={stages,badge,details,safe};
})();
