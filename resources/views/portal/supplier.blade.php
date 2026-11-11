<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Órdenes de surtimiento · Distribuidor</title><meta name="csrf-token" content="{{ csrf_token() }}"><script src="/portal/laravel.js"></script><script defer src="/vendor/alpine.min.js"></script><script>window.portalAccount=@json($portalAccount);</script>
<link rel="stylesheet" href="./pedidos/portal.css"><link rel="stylesheet" href="./pedidos/estilo.css">
<script defer src="./pedidos/detalle.js"></script><script defer src="./proveedor/panel.js"></script><script defer src="./portal/session.js"></script></head>
<body x-data>
<header class="top"><span class="brand"><i aria-hidden="true"></i>gilead</span><span class="profile">Portal del distribuidor</span>
<div class="session"><span id="account"></span><button id="logout">Cerrar sesión</button></div></header>
<main><section class="head"><div><small id="supplierName">Distribuidor</small><h1>Órdenes de surtimiento</h1></div><button id="reload">Actualizar</button></section>
<nav id="states" aria-label="Filtrar por estado"></nav>
<section class="panel"><header class="panel-head"><div><h2>Órdenes asignadas</h2><span id="count"></span></div></header>
<div class="search"><input id="query" type="search" placeholder="Buscar folio, centro o paciente" aria-label="Buscar órdenes"></div>
<div class="scroll" id="list"></div></section></main>
<dialog id="order" aria-labelledby="title"><header><h2 id="title"></h2><button class="close" aria-label="Cerrar">×</button></header><div id="detail"></div></dialog>
<div id="feedback" role="status"></div></body></html>
