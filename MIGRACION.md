# Gilead Portal Comercial · Laravel

Migración local del portal a Laravel 13, Blade, Alpine.js y MySQL.

## Ejecutar

```powershell
cd C:\laragon\www\Gilead_Portal_Comercial_Laravel
mysql -u root -e "CREATE DATABASE IF NOT EXISTS gilead_portal_comercial CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate --seed
php artisan serve
```

Abrir `http://127.0.0.1:8000/login`.

| Perfil | Usuario | Contraseña local |
| --- | --- | --- |
| Superadministrador | guillermo | Demo2026 |
| Administrador | alejandro | Demo |
| Centro de infusión | centro | Demo |
| Distribuidor | distribuidor | Demo |

Las contraseñas son únicamente para desarrollo local y deben sustituirse antes de cualquier despliegue.

## Arquitectura migrada

- Blade sirve las siete superficies del portal conservando el HTML y CSS de referencia.
- Alpine.js se carga localmente y controla el estado común de las vistas Blade.
- Laravel administra sesiones, CSRF, bloqueo por intentos, permisos y validación.
- MySQL conserva cuentas, centros, contactos, fichas, infusiones, órdenes, eventos y el estado operativo de Tamizaje y Distribución.
- Las API mantienen las rutas y formatos de la versión anterior para preservar la interfaz durante la transición.

Tamizaje y Distribución ya comparten sus registros entre usuarios autorizados. Los folios confirmados de Tamizaje alimentan la vinculación de pacientes en Distribución desde Laravel. Ambos módulos usan control de revisión para impedir que dos sesiones sobrescriban cambios silenciosamente.

## Verificar

```powershell
php artisan test
php artisan route:list --except-vendor
php artisan view:cache
```

Las pruebas siguen usando una base SQLite temporal en memoria. Esto las mantiene aisladas y no modifica los datos locales de MySQL.

El portal no depende de Vite para ejecutarse: Alpine y los recursos visuales se sirven desde `public/`. Vite permanece disponible para trabajo frontend futuro.
