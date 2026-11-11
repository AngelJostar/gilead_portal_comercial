<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Seleccionar módulo · Gilead</title>
  <meta name="csrf-token" content="{{ csrf_token() }}"><script src="/portal/laravel.js"></script><script defer src="/vendor/alpine.min.js"></script><script>window.portalAccount=@json($portalAccount);</script>
  <link rel="stylesheet" href="./portal/modulos.css">
  <script defer src="./portal/session.js"></script>
</head>
<body x-data>
<main class="entry-screen" id="moduleHome" aria-label="Seleccionar módulo"><div class="entry-wide"><div class="entry-top"><div><div class="entry-brand"><div class="mark">G</div><div><b>gilead</b><small>portal comercial</small></div></div><h1>Selecciona un módulo</h1><p class="entry-sub">Selecciona el panel al que quieres entrar.</p></div><span class="user-chip">●&nbsp; Sesión activa</span></div><div class="module-grid"><a class="module-card" href="./index.html"><span class="module-icon">✚</span><h2>Centro de Infusión</h2><p>Panel comercial y analítica del centro de infusión.</p><span class="module-open">Entrar al panel →</span></a><a class="module-card" href="./tamizaje.html"><span class="module-icon">⌕</span><h2>Tamizaje</h2><p>Seguimiento y control del tamizaje de pacientes.</p><span class="module-open">Abrir módulo →</span></a><a class="module-card" href="./distribucion.html"><span class="module-icon">⇢</span><h2>Distribución</h2><p>Pacientes, entregas e inventarios por punto de atención.</p><span class="module-open">Abrir módulo →</span></a></div><div class="entry-foot">Entorno de demostración · Información de ejemplo.</div><button class="btn module-back" id="logoutFromModules">Cerrar sesión</button></div></main>
<script>
  const firstName=window.portalAccount.name.trim().split(/\s+/)[0];
  document.querySelector('h1').textContent='Hola, '+firstName;
  document.querySelector('#logoutFromModules').onclick=()=>window.portalLogout();
</script>
</body></html>
