// Entries stay in the form until the infusion and both records are committed together.
function contactEditor(kind,contacts){
  const patient=kind==='patient';
  const noun=patient?'Paciente':'Médico';
  const records=contacts.filter(r=>r.kind===kind);
  const source=document.createElement('section');
  source.className='capture-section';
  const blank={id:null,version:null,label:'',patientName:'',detail:'',profile:{}};
  const drafts=new Map();
  let selection='new';
  const options=records.map(r=>'<option value="'+escapeHtml(r.id)+'">'+escapeHtml(patient&&r.patientName?r.patientName+' · '+r.label:r.label)+'</option>').join('');
  source.innerHTML='<h3>'+noun+(patient?'':' tratante')+'</h3><label class="field source-label">Ficha de '+noun.toLowerCase()+
    '<select class="record-source" required>'+
    '<option value="new">Registrar '+(patient?'nuevo paciente':'nuevo médico')+'</option>'+options+'</select></label><div class="record-fields"></div>';
  const selector=source.querySelector('.record-source');
  const body=source.querySelector('.record-fields');
  selector.value=selection;

  function control(def,value=''){
    const attrs=' data-key="'+def.key+'" maxlength="'+def.max+'"';
    let el;
    if(def.type==='select'){
      el='<select'+attrs+'><option value="">Seleccionar</option>'+def.choices.map(v=>'<option'+(v===value?' selected':'')+'>'+escapeHtml(v)+'</option>').join('')+'</select>';
    }else if(def.type==='textarea'){
      el='<textarea rows="2"'+attrs+'>'+escapeHtml(value)+'</textarea>';
    }else{
      const extra=def.type==='postal'?' inputmode="numeric" pattern="[0-9]{5}"':def.type==='date'?' max="'+new Date().toISOString().slice(0,10)+'"':'';
      el='<input type="'+(def.type==='postal'?'text':def.type)+'"'+attrs+extra+' value="'+escapeHtml(value)+'">';
    }
    return field(def.label,el,def.type==='textarea');
  }
  function base(key,label,value,required=false,placeholder=''){
    return field(label,'<input data-base="'+key+'" maxlength="'+(key==='detail'?180:140)+'" value="'+escapeHtml(value||'')+'" placeholder="'+escapeHtml(placeholder)+'"'+(required?' required':'')+'>');
  }
  function read(){
    if(!selection)return null;
    const original=records.find(r=>r.id===selection)||blank;
    const row={id:original.id,version:original.version,profile:{}};
    for(const input of body.querySelectorAll('[data-base]'))row[input.dataset.base]=input.value.trim();
    for(const input of body.querySelectorAll('[data-key]'))if(input.value.trim())row.profile[input.dataset.key]=input.value.trim();
    return row;
  }
  function draw(){
    if(!selection){body.replaceChildren();return;}
    const row=drafts.get(selection)||records.find(r=>r.id===selection)||blank;
    const identity=patient
      ?base('patientName','Nombre completo o alias',row.patientName,selection==='new')+
       base('label','Folio del paciente',row.label,false,'Automático si se deja vacío')+
       base('detail','Referencia del expediente',row.detail)
      :base('label','Nombre completo del médico',row.label,true)+base('detail','Especialidad',row.detail);
    body.innerHTML='<div class="fields identity">'+identity+'</div>'+fichas[kind].map(group=>
      '<details><summary>'+escapeHtml(group.title)+'</summary><div class="fields">'+
      group.fields.map(def=>control(def,row.profile?.[def.key]||'')).join('')+'</div></details>').join('');
  }
  selector.onchange=()=>{
    if(selection)drafts.set(selection,read());
    selection=selector.value;draw();
  };
  source.addEventListener('invalid',event=>{
    const group=event.target.closest('details');
    if(group)group.open=true;
  },true);
  draw();
  return {element:source,read};
}

function fichaDetails(contact){
  const kind=contact.kind;
  const info=kind==='patient'?[['Nombre o alias',contact.patientName],['Folio',contact.label],['Referencia del expediente',contact.detail]]:
    [['Nombre completo',contact.label],['Especialidad',contact.detail]];
  for(const group of fichas[kind])for(const f of group.fields)if(contact.profile?.[f.key])info.push([f.label,contact.profile[f.key]]);
  return '<dl class="order-detail">'+info.filter(([,value])=>value).map(([label,value])=>
    '<div><dt>'+escapeHtml(label)+'</dt><dd>'+escapeHtml(value)+'</dd></div>').join('')+'</dl>';
}
