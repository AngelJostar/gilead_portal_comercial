<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DistributionController;
use App\Http\Controllers\PortalController;
use App\Http\Controllers\ScreeningController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UserController;
use App\Support\Portal;
use Illuminate\Support\Facades\Route;

Route::get('/login', [AuthController::class, 'create'])->name('login');
Route::post('/api/login', [AuthController::class, 'store'])->middleware('throttle:20,5');

Route::middleware('portal.auth')->group(function () {
    Route::get('/', [PortalController::class, 'home']);
    Route::post('/api/logout', [AuthController::class, 'destroy']);
    Route::get('/api/me', [PortalController::class, 'me']);

    Route::middleware('portal.role:'.implode(',', [Portal::SUPER,Portal::ADMIN,'Analista','Operador']))->group(function () {
        Route::get('/modulos.html', fn (\Illuminate\Http\Request $request) => app(PortalController::class)->page($request, 'modules'));
        Route::get('/index.html', fn (\Illuminate\Http\Request $request) => app(PortalController::class)->page($request, 'dashboard'));
        Route::get('/tamizaje.html', fn (\Illuminate\Http\Request $request) => app(PortalController::class)->page($request, 'screening'));
        Route::get('/api/screening', [ScreeningController::class, 'show']);
        Route::put('/api/screening', [ScreeningController::class, 'update']);
        Route::get('/distribucion.html', fn (\Illuminate\Http\Request $request) => app(PortalController::class)->page($request, 'distribution'));
        Route::get('/api/distribution', [DistributionController::class, 'show']);
        Route::put('/api/distribution', [DistributionController::class, 'update']);
    });
    Route::middleware('portal.role:'.Portal::SUPER.','.Portal::ADMIN)->group(function () {
        Route::get('/api/users', [UserController::class, 'index']); Route::post('/api/users', [UserController::class, 'store']);
        Route::post('/api/users/{id}', [UserController::class, 'update']); Route::post('/api/users/{id}/access', [UserController::class, 'access']);
    });
    Route::middleware('portal.role:'.Portal::CLIENT)->group(function () {
        Route::get('/cliente.html', fn (\Illuminate\Http\Request $request) => app(PortalController::class)->page($request, 'client'));
        Route::get('/api/client', [ClientController::class, 'show']); Route::post('/api/client/contacts', [ClientController::class, 'contact']); Route::post('/api/client/treatments', [ClientController::class, 'treatment']);
    });
    Route::middleware('portal.role:'.Portal::SUPPLIER)->group(function () {
        Route::get('/proveedor.html', fn (\Illuminate\Http\Request $request) => app(PortalController::class)->page($request, 'supplier'));
        Route::get('/api/supplier', [SupplierController::class, 'show']); Route::post('/api/supplier/orders/{order}/events', [SupplierController::class, 'event']);
    });
});
