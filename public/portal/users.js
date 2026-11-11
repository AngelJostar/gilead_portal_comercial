const template = `
<section class="users">
  <div class="heading">
    <div>
      <div class="eyebrow">Seguridad y acceso</div>
      <h1>Usuarios administrativos</h1>
      <p>Administra quién puede acceder al portal y con qué nivel de permisos.</p>
    </div>
    <div class="row">
      <button class="btn" id="exportAdmins">⇩ Descargar datos</button>
      <button class="btn primary" id="newAdmin">＋ Agregar usuario</button>
    </div>
  </div>
  <div class="grid summary">
    <div class="card sum">
      <small>Usuarios registrados</small>
      <b id="adminTotal">0</b>
    </div>
    <div class="card sum">
      <small>Acceso activo</small>
      <b id="adminActive">0</b>
    </div>
    <div class="card sum">
      <small>Pendientes de acceso</small>
      <b id="adminPending">0</b>
    </div>
    <div class="card sum">
      <small>Roles disponibles</small>
      <b>6</b>
    </div>
  </div>
  <div class="mini" style="margin-bottom:12px">Los cambios de acceso se aplican a toda la plataforma.</div>
  <div class="card tablecard">
    <div class="tablebar">
      <div class="row">
        <div class="searchwrap">
          <input class="search" id="adminSearch" placeholder="Buscar por nombre o correo">
        </div>
        <select class="select" id="adminRoleFilter">
          <option value="">Todos los roles</option>
          <option>Superadministrador</option>
          <option>Centro de Infusión</option>
          <option>Distribuidor</option>
          <option>Administrador</option>
          <option>Analista</option>
          <option>Operador</option>
        </select>
        <select class="select" id="adminStatusFilter">
          <option value="">Todos los estados</option>
          <option>Activo</option>
          <option>Pendiente de acceso</option>
          <option>Inactivo</option>
        </select>
      </div>
      <span class="mini">Accesos al portal comercial</span>
    </div>
    <div class="tablewrap">
      <table id="adminTable">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Correo electrónico</th>
            <th>Rol administrativo</th>
            <th>Estado</th>
            <th>Último acceso</th>
            <th>Acceso a la plataforma</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
    <div class="tablefoot">
      <span id="adminFoot">Usuarios del portal</span>
      <span>Permisos asignados por rol</span>
    </div>
  </div>
</section>
<dialog id="adminModal" aria-labelledby="adminModalTitle">
  <div class="modal">
    <div class="modalhead">
      <div>
        <h2 id="adminModalTitle">Agregar usuario administrativo</h2>
        <p>Define su identidad y nivel de acceso al portal.</p>
      </div>
      <button class="btn" id="adminClose" type="button">×</button>
    </div>
    <form id="adminForm">
      <div class="modalbody">
        <div class="form">
          <div class="field">
            <label for="admin-field-name">Nombre completo *</label>
            <input required name="name" placeholder="Nombre y apellidos" id="admin-field-name">
          </div>
          <div class="field">
            <label for="admin-field-email">Correo electrónico</label>
            <input type="email" name="email" placeholder="nombre@empresa.com" id="admin-field-email">
          </div>
          <div class="field full">
            <label for="admin-field-role">Rol administrativo *</label>
            <select required name="role" id="admin-field-role">
              <option value="">Selecciona un rol</option>
              <option>Superadministrador</option>
          <option>Centro de Infusión</option>
          <option>Distribuidor</option>
          <option>Administrador</option>
              <option>Analista</option>
              <option>Operador</option>
            </select>
          </div>
          <div class="field new-credential"><label for="new-username">Nombre de usuario *</label><input name="username" id="new-username" maxlength="65" autocomplete="off"></div>
          <div class="field new-credential"><label for="new-password">Contraseña inicial *</label><input name="password" id="new-password" type="password" minlength="8" maxlength="256" autocomplete="new-password"></div>
          <div class="field full" id="centerField" hidden><label for="center-name">Centro de infusión *</label><input name="center" id="center-name" list="centerNames" placeholder="Nombre del centro"><datalist id="centerNames"></datalist></div>
          <div class="field full" id="supplierField" hidden><label for="supplierName">Empresa distribuidora *</label><input name="supplier" id="supplierName" list="supplierNames" placeholder="Nombre de la distribuidora"><datalist id="supplierNames"></datalist></div>
        </div>
        <p class="mini" style="margin:14px 0 0">Las cuentas de centro solo tienen acceso a los registros del centro asignado.</p>
      </div>
      <p id="form-error" role="alert"></p><div class="modalfoot">
        <button class="btn" type="button" id="adminCancel">Cancelar</button>
        <button class="btn primary" id="adminSave">Guardar usuario</button>
      </div>
    </form>
  </div>
</dialog>
`;

class PortalUsers extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({mode:'open'});
    root.innerHTML = '<link rel="stylesheet" href="./portal/users.css">' + template + '<p role="status" class="feedback"></p>';
    function notify(message) { root.querySelector('.feedback').textContent = message; }
    function esc(value) {
      const text = document.createElement('span');
      text.textContent = String(value ?? '');
      return text.innerHTML;
    }
    function status(value) {
      return '<span class="status '+(value === 'Activo'?'active':'other')+'">'+esc(value)+'</span>';
    }
    function csv(file, rows) {
      const lines = rows.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(','));
      const url = URL.createObjectURL(new Blob(['\ufeff'+lines.join('\r\n')], {type:'text/csv;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = file;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url),1000);
    }
    const control = id => root.getElementById(id);
    const form=control('adminForm'),modal=control('adminModal');
    const actor=window.portalAccount;
    const superuser=actor.role==='Superadministrador';
    let editingId=null, users=[];
    async function request(path,body) {
      const response=await fetch(path,body===undefined?{cache:'no-store'}:{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
      });
      if(response.status===401){location.replace('/login');throw Error('Sesión terminada.');}
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'No se pudo guardar el cambio.');
      return result;
    }
    async function refresh(){
      try{users=(await request('/api/users')).users;render();}
      catch(error){notify(error.message);}
    }
    function render() {
      const search = control('adminSearch').value.trim().toLocaleLowerCase('es');
      const role = control('adminRoleFilter').value;
      const state = control('adminStatusFilter').value;
      const visible = users.filter(user => (!role || user.role === role) &&
        (!state || user.status === state) &&
        (user.name+' '+(user.email||'')+' '+(user.username||'')).toLocaleLowerCase('es').includes(search));
      const body = control('adminTable').tBodies[0];
      body.replaceChildren();
      for (const user of visible) {
        const row = body.insertRow();
        for (const value of [user.name,user.email||'—',user.role,user.status,user.last]) {
          row.insertCell().textContent = value;
        }
        row.cells[3].innerHTML = status(user.status);
        const access=row.insertCell();
        if(superuser){
          const button=document.createElement('button');
          button.type='button';
          button.className='access-switch';
          button.setAttribute('role','switch');
          button.setAttribute('aria-checked',String(user.enabled));
          button.setAttribute('aria-label','Acceso de '+user.name);
          button.textContent=user.enabled?'Activo':'Inactivo';
          button.onclick=async()=>{
            if(user.id===actor.id && user.enabled && !confirm('Si inactivas tu propia cuenta, tu sesión terminará. Para reactivarla necesitarás otro superadministrador activo. ¿Continuar?'))return;
            button.disabled=true;
            try{
              await request('/api/users/'+encodeURIComponent(user.id)+'/access',{enabled:!user.enabled});
              if(user.id===actor.id){location.replace('/login');return;}
              await refresh();
            }catch(error){notify(error.message);}
            finally{button.disabled=false;}
          };
          access.append(button);
        }else access.textContent=user.enabled?'Activo':'Inactivo';
        const actions=row.insertCell();
        if(superuser||user.role!=='Superadministrador'){
          const edit=document.createElement('button');
          edit.type='button';edit.textContent='Editar';edit.onclick=()=>openEditor(user);
          actions.append(edit);
        }
      }
      if (!visible.length) {
        const cell = body.insertRow().insertCell();
        cell.colSpan = 7;
        cell.textContent = 'No encontramos usuarios con esos filtros.';
      }
      control('adminTotal').textContent = users.length;
      control('adminActive').textContent = users.filter(u => u.enabled).length;
      control('adminPending').textContent = users.filter(u => u.status === 'Pendiente de acceso').length;
      control('adminFoot').textContent = `Mostrando ${visible.length} de ${users.length} usuarios`;
    }

    function syncForm() {
      const isClient=form.elements.role.value==='Centro de Infusión';
      const isSupplier=form.elements.role.value==='Distribuidor';
      control('supplierField').hidden=!isSupplier;
      form.elements.supplier.required=isSupplier;
      form.elements.supplier.readOnly=!!editingId;
      control('centerField').hidden=!isClient;
      form.elements.center.required=isClient;
      form.elements.center.readOnly=!!editingId;
      for(const field of root.querySelectorAll('.new-credential')){
        field.hidden=!!editingId;
        field.querySelector('input').required=!editingId;
      }
    }
    function openEditor(user=null) {
      editingId=user?.id||null;
      form.reset();
      for(const field of ['name','email','role','center','supplier'])form.elements[field].value=user?.[field]||'';
      const options=form.elements.role.options;
      for(const opt of options){
        opt.disabled=(opt.value==='Superadministrador'&&!superuser) ||
          (!!user && ['Centro de Infusión','Distribuidor'].includes(opt.value) && user.role!==opt.value);
      }
      form.elements.role.disabled=!!user&&(['alejandro','guillermo'].includes(user.id)||['Centro de Infusión','Distribuidor'].includes(user.role));
      control('adminModalTitle').textContent=user?'Editar usuario':'Agregar usuario';
      control('adminSave').textContent=user?'Guardar cambios':'Crear cuenta';
      control('supplierNames').replaceChildren(...[...new Set(users.map(u=>u.supplier).filter(Boolean))].map(name=>new Option(name)));
      control('centerNames').replaceChildren(...[...new Set(users.map(u=>u.center).filter(Boolean))].map(name=>new Option(name)));
      control('form-error').textContent='';
      syncForm();modal.showModal();
    }
    form.elements.role.onchange=syncForm;
    form.onsubmit=async event=>{
      event.preventDefault();
      const data=Object.fromEntries(new FormData(form));
      data.role=form.elements.role.value;
      control('adminSave').disabled=true;
      try{
        await request(editingId?'/api/users/'+encodeURIComponent(editingId):'/api/users',data);
        modal.close();form.reset();await refresh();notify('Cambios guardados');
      }catch(error){control('form-error').textContent=error.message;}
      finally{control('adminSave').disabled=false;}
    };
    control('newAdmin').onclick=()=>openEditor();
    control('adminClose').onclick=control('adminCancel').onclick=()=>modal.close();
    control('adminSearch').oninput=render;
    control('adminRoleFilter').onchange=control('adminStatusFilter').onchange=render;
    control('exportAdmins').onclick=()=>csv('usuarios-administrativos.csv',[
      ['Nombre','Correo','Rol','Estado','Último acceso'],...users.map(u=>[u.name,u.email||'',u.role,u.status,u.last])
    ]);
    this.refresh=refresh;
    this.refresh();
  }
}
customElements.define('portal-users',PortalUsers);
