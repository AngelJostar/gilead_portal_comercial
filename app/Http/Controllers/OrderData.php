<?php

namespace App\Http\Controllers;

use App\Support\Portal;
use Illuminate\Support\Facades\DB;

trait OrderData
{
    private function readOrders(string $scope, string $id): array
    {
        $orders = DB::table('supply_orders as o')->join('center_treatments as t', 't.id', '=', 'o.treatment_id')
            ->join('client_centers as c', 'c.id', '=', 't.center_id')->join('center_contacts as p', 'p.id', '=', 't.patient_id')
            ->join('center_contacts as d', 'd.id', '=', 't.doctor_id')->join('suppliers as sp', 'sp.id', '=', 'o.supplier_id')
            ->select('o.id', 'o.treatment_id as treatmentId', 't.day', 't.name as treatment', 't.medication', 't.quantity', 'c.name as center', 'p.label as patient', 'p.patient_name as patientName', 'd.label as doctor', 'sp.name as supplier')
            ->when($scope === 'center', fn ($q) => $q->where('t.center_id', $id), fn ($q) => $q->where('o.supplier_id', $id))->orderByDesc('o.id')->get();
        $events = DB::table('supply_events as e')->join('portal_accounts as a', 'a.id', '=', 'e.actor_id')
            ->join('supply_orders as o', 'o.id', '=', 'e.order_id')->join('center_treatments as t', 't.id', '=', 'o.treatment_id')
            ->select('e.order_id', 'e.status', 'e.reference', 'e.lot', 'e.notes', 'e.created_at as at', 'a.name as actor')
            ->when($scope === 'center', fn ($q) => $q->where('t.center_id', $id), fn ($q) => $q->where('o.supplier_id', $id))->orderBy('e.rowid')->get()->groupBy('order_id');
        return $orders->map(function ($order) use ($events) {
            $history = $events->get($order->id, collect())->map(fn ($event) => (array) $event)->values()->all();
            return [...(array) $order, 'folio' => Portal::folio($order->id), 'status' => end($history)['status'] ?? 'Solicitada', 'events' => $history];
        })->all();
    }

    private function activeSuppliers()
    {
        return DB::table('suppliers as sp')->select('sp.id', 'sp.name')->whereExists(function ($q) {
            $q->selectRaw('1')->from('supplier_members as m')->join('portal_accounts as a', 'a.id', '=', 'm.user_id')
                ->whereColumn('m.supplier_id', 'sp.id')->where('a.enabled', true)->where('a.role', Portal::SUPPLIER);
        });
    }
}
