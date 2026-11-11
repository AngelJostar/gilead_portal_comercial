<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['portal.auth' => \App\Http\Middleware\PortalAuthenticated::class, 'portal.role' => \App\Http\Middleware\PortalRole::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $exception, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) return response()->json(['error' => collect($exception->errors())->flatten()->first() ?: 'Revisa los datos capturados.'], 422);
        });
        $exceptions->render(function (HttpExceptionInterface $exception, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) return response()->json(['error' => $exception->getMessage() ?: 'No se pudo completar la operación.'], $exception->getStatusCode());
        });
    })->create();
