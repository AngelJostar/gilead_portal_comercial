<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class Portal
{
    public const SUPER = 'Superadministrador';
    public const ADMIN = 'Administrador';
    public const CLIENT = 'Centro de Infusión';
    public const SUPPLIER = 'Distribuidor';
    public const ROLES = [self::SUPER, self::ADMIN, 'Analista', 'Operador', self::CLIENT, self::SUPPLIER];
    public const STAGES = ['Solicitada', 'Registrada', 'Surtida', 'Entregada'];

    public static function account(Request $request): ?object
    {
        $id = $request->session()->get('portal_user_id');
        if (! $id) return null;

        $account = DB::table('portal_accounts as a')
            ->leftJoin('center_memberships as m', 'm.user_id', '=', 'a.id')
            ->select('a.*', 'm.center_id')->where('a.id', $id)->where('a.enabled', true)->first();
        if ($account && (int) $request->session()->get('portal_user_version') !== (int) $account->version) return null;
        return $account;
    }

    public static function publicUser(object $user): array
    {
        return [
            'id' => $user->id, 'name' => $user->name, 'username' => $user->username,
            'email' => $user->email, 'role' => $user->role, 'enabled' => (bool) $user->enabled,
            'centerId' => $user->center_id ?? null,
            'last' => $user->last_seen ? date('Y-m-d', (int) $user->last_seen) : '—',
        ];
    }

    public static function landing(string $role): string
    {
        return match ($role) {
            self::CLIENT => '/cliente.html', self::SUPPLIER => '/proveedor.html', default => '/modulos.html',
        };
    }

    public static function normalize(string $value): string
    {
        return mb_strtolower(preg_replace('/\s+/u', ' ', trim($value)), 'UTF-8');
    }

    public static function folio(int $id): string { return 'OS-'.str_pad((string) $id, 6, '0', STR_PAD_LEFT); }
}
