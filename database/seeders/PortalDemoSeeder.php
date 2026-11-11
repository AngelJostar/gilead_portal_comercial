<?php

namespace Database\Seeders;

use App\Support\Portal;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PortalDemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            DB::table('portal_accounts')->insertOrIgnore([
                ['id'=>'guillermo','name'=>'Guillermo','username'=>'guillermo','email'=>null,'role'=>Portal::SUPER,'credential'=>Hash::make('Demo2026')],
                ['id'=>'alejandro','name'=>'Alejandro Martínez Galván','username'=>'alejandro','email'=>'alejandro.martinez@gilead.com','role'=>Portal::ADMIN,'credential'=>Hash::make('Demo')],
                ['id'=>'demo-centro','name'=>'Centro de Infusión Demo','username'=>'centro','email'=>null,'role'=>Portal::CLIENT,'credential'=>Hash::make('Demo')],
                ['id'=>'fernanda','name'=>'Fernanda Ruiz Torres','username'=>null,'email'=>'fernanda.ruiz@gilead.com','role'=>'Analista','credential'=>null],
                ['id'=>'carlos','name'=>'Carlos Mendoza Pérez','username'=>null,'email'=>'carlos.mendoza@gilead.com','role'=>'Operador','credential'=>null],
                ['id'=>'lucia','name'=>'Lucía Herrera Soto','username'=>null,'email'=>'lucia.herrera@gilead.com','role'=>'Analista','credential'=>null],
                ['id'=>'demo-distribuidor','name'=>'Distribuidor Demo','username'=>'distribuidor','email'=>null,'role'=>Portal::SUPPLIER,'credential'=>Hash::make('Demo')],
            ]);
            DB::table('client_centers')->insertOrIgnore(['id'=>'demo-infusion','name'=>'Centro de Infusión Demo','normalized_name'=>'centro de infusión demo']);
            DB::table('center_memberships')->insertOrIgnore(['user_id'=>'demo-centro','center_id'=>'demo-infusion']);
            DB::table('suppliers')->insertOrIgnore(['id'=>'dist-demo','name'=>'Distribuidora Demo Gilead','normalized_name'=>'distribuidora demo gilead']);
            DB::table('supplier_members')->insertOrIgnore(['user_id'=>'demo-distribuidor','supplier_id'=>'dist-demo']);
        });
    }
}
