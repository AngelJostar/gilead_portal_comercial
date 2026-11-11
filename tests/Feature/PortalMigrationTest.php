<?php

namespace Tests\Feature;

use App\Support\Portal;
use Database\Seeders\PortalDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PortalMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PortalDemoSeeder::class);
    }

    public function test_login_and_blade_pages_keep_the_original_portal_contract(): void
    {
        $this->get('/login')->assertOk()->assertSee('Inicio de sesión')->assertSee('x-data', false);
        $this->post('/api/login', ['username' => 'guillermo', 'password' => 'Demo2026'])
            ->assertRedirect('/modulos.html')->assertSessionHas('portal_user_id', 'guillermo');
        $this->get('/modulos.html')->assertOk()->assertSee('Selecciona un módulo')->assertSee('window.portalAccount', false);
        $this->get('/api/users')->assertOk()->assertJsonPath('canToggle', true)->assertJsonCount(7, 'users');
    }

    public function test_roles_are_isolated(): void
    {
        $this->withPortalSession('demo-centro', 1)->get('/api/users')->assertForbidden();
        $this->withPortalSession('demo-distribuidor', 1)->get('/cliente.html')->assertRedirect('/proveedor.html');
        $this->withPortalSession('guillermo', 1)->get('/api/client')->assertForbidden();
    }

    public function test_center_creates_an_order_and_supplier_advances_it(): void
    {
        $requestId = (string) Str::uuid();
        $payload = [
            'requestId' => $requestId, 'day' => '2026-11-10', 'supplierId' => 'dist-demo', 'medication' => 'Trodelvy',
            'name' => 'Infusión de Trodelvy', 'quantity' => '1 vial', 'notes' => 'Prueba Laravel',
            'patientRecord' => ['label' => 'P-LARAVEL', 'patientName' => 'Paciente ficticio', 'detail' => '', 'profile' => ['state' => 'CDMX']],
            'doctorRecord' => ['label' => 'Dra. Prueba', 'detail' => 'Oncología', 'profile' => ['license' => '123456']],
        ];
        $created = $this->withPortalSession('demo-centro', 1)->postJson('/api/client/treatments', $payload)
            ->assertCreated()->assertJsonPath('folio', 'OS-000001')->json();
        $this->withPortalSession('demo-centro', 1)->postJson('/api/client/treatments', $payload)
            ->assertOk()->assertJsonPath('orderId', $created['orderId']);
        $this->withPortalSession('demo-distribuidor', 1)->getJson('/api/supplier')
            ->assertOk()->assertJsonPath('orders.0.status', 'Solicitada')->assertJsonPath('orders.0.patientName', 'Paciente ficticio');
        $this->withPortalSession('demo-distribuidor', 1)->postJson('/api/supplier/orders/1/events', [
            'requestId' => (string) Str::uuid(), 'status' => 'Registrada', 'reference' => 'REF-LARAVEL', 'lot' => '', 'notes' => '',
        ])->assertCreated()->assertJsonPath('status', 'Registrada');
        $this->withPortalSession('demo-centro', 1)->getJson('/api/client')->assertOk()->assertJsonPath('orders.0.status', 'Registrada');
        $this->assertDatabaseCount('supply_orders', 1);
    }

    private function withPortalSession(string $id, int $version): static
    {
        return $this->withSession(['portal_user_id' => $id, 'portal_user_version' => $version]);
    }
}
