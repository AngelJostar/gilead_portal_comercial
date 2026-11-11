<?php

namespace App\Http\Controllers;

use App\Support\Portal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    use OrderData;

    public function show(Request $request)
    {
        $user = $request->attributes->get('portalAccount');
        $supplier = DB::table('suppliers as s')->join('supplier_members as m', 'm.supplier_id', '=', 's.id')->where('m.user_id', $user->id)->select('s.id', 's.name')->first();
        abort_unless($supplier, 403, 'La cuenta no tiene una empresa asignada.');
        return response()->json(['supplier' => $supplier->name, 'orders' => $this->readOrders('supplier', $supplier->id)]);
    }

    public function event(Request $request, int $order)
    {
        $user = $request->attributes->get('portalAccount');
        $supplierId = DB::table('supplier_members')->where('user_id', $user->id)->value('supplier_id');
        abort_unless(DB::table('supply_orders')->where('id', $order)->where('supplier_id', $supplierId)->exists(), 404, 'Orden desconocida.');
        $data = $request->validate(['requestId' => ['required','uuid'], 'status' => ['required','in:Registrada,Surtida,Entregada'], 'reference' => ['required','string','max:100'], 'lot' => ['nullable','string','max:80'], 'notes' => ['nullable','string','max:450']]);
        $stage = array_search($data['status'], Portal::STAGES, true);
        if ($data['status'] === 'Surtida' && empty(trim($data['lot'] ?? ''))) abort(422, 'Indica el lote de Trodelvy.');
        if (DB::table('supply_events')->where('id', $data['requestId'])->where('order_id', $order)->where('status', $data['status'])->exists()) return response()->json(['status' => $data['status']]);
        $current = DB::table('supply_events')->where('order_id', $order)->orderByDesc('rowid')->value('status');
        abort_unless($current === Portal::STAGES[$stage - 1], 409, 'El estado cambió. Actualiza la orden para continuar.');
        DB::table('supply_events')->insert(['id' => $data['requestId'], 'order_id' => $order, 'status' => $data['status'], 'reference' => trim($data['reference']), 'lot' => trim($data['lot'] ?? '') ?: null, 'notes' => trim($data['notes'] ?? '') ?: null, 'actor_id' => $user->id, 'created_at' => time()]);
        return response()->json(['status' => $data['status']], 201);
    }
}
