<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6faf7"><title>Tamizaje · Portal Gilead</title>
<link rel="stylesheet" href="./tamizaje/panel.css">
<link rel="stylesheet" href="./portal/shell.css"><script type="module" src="./portal/users.js"></script><meta name="csrf-token" content="{{ csrf_token() }}"><script src="/portal/laravel.js"></script><script defer src="/vendor/alpine.min.js"></script><script>window.portalAccount=@json($portalAccount);</script><script defer src="./portal/session.js"></script></head><body data-module="tamizaje" x-data>
<script src="./portal/shell.js"></script>
<main class="shell"><div class="mast"><div><div class="crumb"><a href="./modulos.html">Portal comercial</a><span>›</span>Tamizaje</div><h1>Tamizaje</h1><p>Seguimiento de pruebas de VIH y vinculación a la atención en México.</p></div><button class="primary" id="new-screen"><span data-icon="plus"></span>Nuevo tamizaje</button></div>

<div class="context"><span class="pilot"><i></i>Piloto de demostración</span><strong>06 nov 2026</strong><label for="demo-view" class="sr">Vista de demostración</label><select id="demo-view"><option value="operacion">Vista operativa</option><option value="nacional">Coordinación nacional</option><option value="transporte">Transporte</option></select><label for="site-filter" class="sr">Filtrar por sede</label><select id="site-filter"></select></div>
<div id="content"></div><footer class="foot"><span>Gilead · Tamizaje</span><span>Datos ficticios · Cambios guardados en el servidor</span></footer></main>
<dialog id="drawer" aria-labelledby="dialog-title"><div class="dialog-frame"><header class="dialog-header"><div><div class="over" id="dialog-kicker"></div><h2 id="dialog-title"></h2></div><button class="iconbtn" id="close-dialog" aria-label="Cerrar">×</button></header><div id="dialog-content"></div></div></dialog>
<div id="message" class="toast" role="status"></div><script type="module" src="./tamizaje/panel.js"></script></body></html>
