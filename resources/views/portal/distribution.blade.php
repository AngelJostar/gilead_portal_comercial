<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#f6f8f5"><title>Distribución · Portal Gilead</title>
  <link rel="stylesheet" href="./distribucion/panel.css">

<link rel="stylesheet" href="./portal/shell.css"><script type="module" src="./portal/users.js"></script><meta name="csrf-token" content="{{ csrf_token() }}"><script src="/portal/laravel.js"></script><script defer src="/vendor/alpine.min.js"></script><script>window.portalAccount=@json($portalAccount);</script><script defer src="./portal/session.js"></script></head>
<body data-module="distribucion" x-data>
  <script src="./portal/shell.js"></script>
  <main class="shell">
    <div class="mast"><div><div class="crumb"><a href="./modulos.html">Portal comercial</a><i data-icon="chevron"></i>Distribución</div>
      <h1>Distribución</h1><p>Seguimiento de pacientes, entregas e inventarios por punto de atención.</p></div>
      <button class="primary" data-action="movement"><i data-icon="plus"></i>Registrar movimiento</button></div>

    <div id="content"></div>
    <footer><span>Gilead · Distribución</span><span>Datos ficticios · Cambios guardados en el servidor</span></footer>
  </main>
  <dialog id="dialog" aria-labelledby="dialog-title"><header><div><small id="dialog-context"></small><h2 id="dialog-title"></h2></div><button class="icon-button" aria-label="Cerrar" data-action="close"><i data-icon="x"></i></button></header><div id="dialog-content"></div></dialog>
  <div id="toast" role="status" aria-live="polite"></div>
  <script type="module" src="./distribucion/panel.js"></script>
</body></html>
