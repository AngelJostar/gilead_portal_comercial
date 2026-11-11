<?php

namespace App\Http\Controllers;

use App\Support\Portal;
use Illuminate\Http\Request;

class PortalController extends Controller
{
    public function home(Request $request) { return redirect(Portal::landing($request->attributes->get('portalAccount')->role)); }
    public function me(Request $request) { return response()->json(Portal::publicUser($request->attributes->get('portalAccount'))); }
    public function page(Request $request, string $view) { return view('portal.'.$view, ['portalAccount' => Portal::publicUser($request->attributes->get('portalAccount'))]); }
}
