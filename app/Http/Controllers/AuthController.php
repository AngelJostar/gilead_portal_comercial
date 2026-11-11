<?php

namespace App\Http\Controllers;

use App\Support\Portal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function create(Request $request)
    {
        if ($account = Portal::account($request)) return redirect(Portal::landing($account->role));
        return view('portal.login');
    }

    public function store(Request $request)
    {
        $credentials = $request->validate(['username' => ['required', 'string', 'max:100'], 'password' => ['required', 'string', 'max:256']]);
        $username = mb_strtolower(trim($credentials['username']), 'UTF-8');
        $key = hash('sha256', $request->ip().'|'.$username);
        $attempt = DB::table('portal_attempts')->where('key', $key)->first();
        if ($attempt && $attempt->failures >= 10 && $attempt->since > time() - 300) return back()->withErrors(['username' => 'Espera cinco minutos antes de intentarlo de nuevo.'])->onlyInput('username');
        $account = DB::table('portal_accounts')->where('username', $username)->first();
        if (! $account || ! $account->enabled || ! Hash::check($credentials['password'], $account->credential ?? '')) {
            $now = time();
            DB::table('portal_attempts')->upsert([['key' => $key, 'failures' => ($attempt && $attempt->since >= $now - 300) ? $attempt->failures + 1 : 1, 'since' => ($attempt && $attempt->since >= $now - 300) ? $attempt->since : $now]], ['key'], ['failures', 'since']);
            return back()->withErrors(['username' => 'Datos incorrectos o acceso inactivo.'])->onlyInput('username');
        }
        DB::transaction(function () use ($request, $account, $key): void {
            DB::table('portal_attempts')->where('key', $key)->delete();
            DB::table('portal_attempts')->where('since', '<', time() - 3600)->delete();
            DB::table('portal_accounts')->where('id', $account->id)->update(['last_seen' => time()]);
            $request->session()->regenerate();
            $request->session()->put(['portal_user_id' => $account->id, 'portal_user_version' => $account->version]);
        });
        return redirect(Portal::landing($account->role));
    }

    public function destroy(Request $request)
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->noContent();
    }
}
