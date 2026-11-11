/* The header and navigation are shared by all three module entry points. */
(() => {
  const modules = {
    infusion: { title: 'Centro de Infusión', navId: 'infusion-sections', first: 'Dashboard' },
    tamizaje: { title: 'Tamizaje', navId: 'sections', first: 'Mi bandeja' },
    distribucion: { title: 'Distribución', navId: 'navigation', first: 'Resumen' }
  };
  const current = document.body.dataset.module;
  const {title, navId, first} = modules[current];
  const header = document.createElement('header');
  header.className = 'portal-header';
  header.innerHTML = `
    <button type="button" id="toggle" class="shell-control" aria-label="Abrir menú" aria-expanded="false" aria-controls="portal-menu">
      <span class="hamburger" aria-hidden="true"></span><span>Menú</span>
    </button>
    <span class="shell-path"><span>${title}</span><span class="shell-slash">/</span><strong id="crumb">${first}</strong></span>
    <a href="./modulos.html" id="moduleHomeBtn" class="shell-control" aria-label="Volver a módulos"><svg class="modules-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="2" width="5.5" height="5.5" rx="1"/><rect x="10" y="2" width="5.5" height="5.5" rx="1"/><rect x="2" y="10" width="5.5" height="5.5" rx="1"/></svg>Módulos</a>
    <span class="shell-demo">Entorno demo</span>
    ${current === 'infusion' ? '<button type="button" id="help" class="shell-help" aria-label="Ayuda">?</button>' : ''}
    <div class="account-wrap"><button id="accountButton" class="shell-avatar" aria-label="Cuenta de usuario" aria-expanded="false" aria-controls="accountMenu"></button>
      <div id="accountMenu" class="shell-account" hidden><strong></strong>
        <small id="sessionStatus">Sesión activa · Demostración</small><button id="sessionAction" type="button">Cerrar sesión</button>
      </div>
    </div>`;
  const menu = document.createElement('dialog');
  menu.id = 'portal-menu';
  menu.setAttribute('aria-labelledby', 'menu-title');
  menu.innerHTML = `<div class="menu-brand"><span class="menu-leaf" aria-hidden="true"></span>
    <div><strong>gilead</strong><small>Portal comercial</small></div>
    <button class="menu-close" type="button" aria-label="Cerrar menú">×</button></div>
    <h2 id="menu-title">${title}</h2>
    <nav id="${navId}" class="module-sections" aria-label="Secciones de ${title}"></nav>
    <div class="menu-profile"><b></b><span><strong></strong><small></small></span></div>`;
  document.body.append(header, menu);
  const user=window.portalAccount;
  const initials=user.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
  header.querySelector('#accountButton').textContent=initials;
  header.querySelector('#accountButton').setAttribute('aria-label','Cuenta de '+user.name);
  header.querySelector('#accountMenu strong').textContent=user.name;
  header.querySelector('#sessionStatus').textContent=user.role+' · Sesión activa';
  menu.querySelector('.menu-profile>b').textContent=initials;
  menu.querySelector('.menu-profile strong').textContent=user.name;
  menu.querySelector('.menu-profile small').textContent=user.role;
  const nav = menu.querySelector('nav');
  if (current === 'infusion') {
    const template = document.querySelector('#infusion-navigation');
    nav.append(template.content.cloneNode(true));
  }
  const trigger = header.querySelector('#toggle');
  trigger.onclick = () => {
    menu.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    (nav.querySelector('[aria-current="page"], .active') || menu.querySelector('.menu-close')).focus();
  };
  menu.querySelector('.menu-close').onclick = () => menu.close();
  nav.addEventListener('click', event => { if (event.target.closest('a,button')) menu.close(); });
  menu.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  });
  menu.addEventListener('click', event => {
    if (event.target !== menu) return;
    const rect = menu.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX >= rect.right ||
        event.clientY < rect.top || event.clientY >= rect.bottom) menu.close();
  });
  const account = header.querySelector('.account-wrap');
  const profile = account.querySelector('#accountMenu');
  const accountButton = account.querySelector('#accountButton');
  function displayAccount(open) {
    profile.hidden = !open;
    accountButton.setAttribute('aria-expanded', String(open));
  }
  accountButton.onclick = () => displayAccount(profile.hidden);
  document.addEventListener('click', event => {
    if (!account.contains(event.target)) displayAccount(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !profile.hidden) { displayAccount(false); accountButton.focus(); }
  });
  account.querySelector('#sessionAction').onclick=()=>window.portalLogout();
})();
