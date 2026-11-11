<?php

namespace App\Http\Middleware;

use App\Support\Portal;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PortalRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $account = $request->attributes->get('portalAccount');
        if (! $account || ! in_array($account->role, $roles, true)) {
            return $request->is('api/*') ? response()->json(['error' => 'Sección reservada.'], 403) : redirect(Portal::landing($account?->role ?? ''));
        }
        return $next($request);
    }
}
