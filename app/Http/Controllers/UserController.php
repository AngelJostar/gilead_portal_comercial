<?php

namespace App\Http\Controllers;

use App\Support\Portal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $actor = $request->attributes->get('portalAccount');
        $users = DB::table('portal_accounts as a')
            ->leftJoin('center_memberships as m', 'm.user_id', '=', 'a.id')
            ->leftJoin('client_centers as c', 'c.id', '=', 'm.center_id')
            ->leftJoin('supplier_members as sm', 'sm.user_id', '=', 'a.id')
            ->leftJoin('suppliers as sp', 'sp.id', '=', 'sm.supplier_id')
            ->select('a.*', 'm.center_id', 'c.name as center', 'sp.name as supplier')->orderBy('a.name')->get()
            ->map(function ($user) {
                return [...Portal::publicUser($user), 'center' => $user->center, 'supplier' => $user->supplier,
                    'status' => ! $user->enabled ? 'Inactivo' : ($user->credential ? 'Activo' : 'Pendiente de acceso')];
            });
        return response()->json(['users' => $users, 'canToggle' => $actor->role === Portal::SUPER]);
    }

    public function store(Request $request)
    {
        $actor = $request->attributes->get('portalAccount');
        $data = $this->validated($request, null, $actor);
        $id = (string) Str::uuid();
        DB::transaction(function () use ($data, $id): void {
            DB::table('portal_accounts')->insert(['id' => $id, 'name' => $data['name'], 'username' => $data['username'], 'email' => $data['email'], 'role' => $data['role'], 'credential' => Hash::make($data['password'])]);
            if ($data['role'] === Portal::CLIENT) {
                $normalized = Portal::normalize($data['center']);
                DB::table('client_centers')->insertOrIgnore(['id' => (string) Str::uuid(), 'name' => $data['center'], 'normalized_name' => $normalized]);
                DB::table('center_memberships')->insert(['user_id' => $id, 'center_id' => DB::table('client_centers')->where('normalized_name', $normalized)->value('id')]);
            }
            if ($data['role'] === Portal::SUPPLIER) {
                $normalized = Portal::normalize($data['supplier']);
                DB::table('suppliers')->insertOrIgnore(['id' => (string) Str::uuid(), 'name' => $data['supplier'], 'normalized_name' => $normalized]);
                DB::table('supplier_members')->insert(['user_id' => $id, 'supplier_id' => DB::table('suppliers')->where('normalized_name', $normalized)->value('id')]);
            }
        });
        return response()->json(['id' => $id], 201);
    }

    public function update(Request $request, string $id)
    {
        $actor = $request->attributes->get('portalAccount');
        $target = DB::table('portal_accounts')->where('id', $id)->first();
        abort_unless($target, 404, 'Usuario desconocido.');
        $data = $this->validated($request, $target, $actor);
        DB::table('portal_accounts')->where('id', $id)->update([
            'name' => $data['name'], 'email' => $data['email'], 'role' => $data['role'],
            'version' => DB::raw('version + '.($target->role === $data['role'] ? '0' : '1')),
        ]);
        return response()->json(['id' => $id]);
    }

    public function access(Request $request, string $id)
    {
        $actor = $request->attributes->get('portalAccount');
        abort_unless($actor->role === Portal::SUPER, 403, 'Solo el superadministrador puede cambiar el acceso.');
        $data = $request->validate(['enabled' => ['required', 'boolean']]);
        abort_unless(DB::table('portal_accounts')->where('id', $id)->exists(), 404, 'Usuario desconocido.');
        DB::table('portal_accounts')->where('id', $id)->where('enabled', '!=', $data['enabled'])->update(['enabled' => $data['enabled'], 'version' => DB::raw('version + 1')]);
        return response()->json(['enabled' => $data['enabled']]);
    }

    private function validated(Request $request, ?object $target, object $actor): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'], 'email' => ['nullable', 'email', 'max:180'],
            'role' => ['required', 'string', 'in:'.implode(',', Portal::ROLES)],
            'username' => [$target ? 'nullable' : 'required', 'string', 'max:65', 'regex:/^[a-zA-Z0-9._-]{2,65}$/'],
            'password' => [$target ? 'nullable' : 'required', 'string', 'min:8', 'max:256'],
            'center' => ['nullable', 'string', 'max:140'], 'supplier' => ['nullable', 'string', 'max:140'],
        ]);
        $data['email'] = $data['email'] ? mb_strtolower(trim($data['email']), 'UTF-8') : null;
        if (($data['role'] === Portal::SUPER || $target?->role === Portal::SUPER) && $actor->role !== Portal::SUPER) abort(403, 'Perfil reservado.');
        if ($target && ($target->id === 'guillermo' || $target->id === 'alejandro' || in_array($target->role, [Portal::CLIENT, Portal::SUPPLIER], true) || in_array($data['role'], [Portal::CLIENT, Portal::SUPPLIER], true)) && $data['role'] !== $target->role) abort(400, 'El tipo de este perfil es fijo.');
        if ($target && $actor->role !== Portal::SUPER && ($target->id === $actor->id || $target->role === Portal::ADMIN) && $target->role !== $data['role']) abort(403, 'Solo el superadministrador puede cambiar este rol.');
        $duplicate = DB::table('portal_accounts')->when($target, fn ($q) => $q->where('id', '!=', $target->id))->where('email', $data['email'])->exists();
        if ($data['email'] && $duplicate) abort(409, 'Ya existe un usuario con ese correo.');
        if (! $target) {
            $data['username'] = mb_strtolower($data['username'], 'UTF-8');
            if (DB::table('portal_accounts')->where('username', $data['username'])->exists()) abort(409, 'El nombre de usuario ya existe.');
            if ($data['role'] === Portal::CLIENT && empty(trim($data['center'] ?? ''))) abort(422, 'Indica el centro de infusión.');
            if ($data['role'] === Portal::SUPPLIER && empty(trim($data['supplier'] ?? ''))) abort(422, 'Indica la empresa distribuidora.');
        }
        return $data;
    }
}
