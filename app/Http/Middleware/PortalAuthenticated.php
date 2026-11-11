<?php

namespace App\Http\Middleware;

use App\Support\Portal;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PortalAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        $account = Portal::account($request);
        if (! $account) {
            $request->session()->forget(['portal_user_id', 'portal_user_version']);
            return $request->is('api/*') ? response()->json(['error' => 'Inicia sesión para continuar.'], 401) : redirect('/login');
        }
        $request->attributes->set('portalAccount', $account);
        return $next($request);
    }
}
