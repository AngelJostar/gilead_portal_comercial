<?php

namespace Tests\Feature;

use Database\Seeders\PortalDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DistributionPersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PortalDemoSeeder::class);
    }

    public function test_distribution_is_shared_and_audited(): void
    {
        $this->withPortalSession('guillermo')->putJson('/api/distribution', [
            'expectedRevision' => 0,
            'data' => $this->state(),
        ])->assertOk()->assertJsonPath('revision', 1);

        $this->withPortalSession('alejandro')->getJson('/api/distribution')
            ->assertOk()
            ->assertJsonPath('data.points.0.id', 'RED-0001')
            ->assertJsonPath('data.patients.0.id', 'DIS-0001');

        $this->assertDatabaseHas('distribution_states', ['id' => 1, 'revision' => 1, 'updated_by' => 'guillermo']);
        $this->assertDatabaseHas('distribution_state_changes', ['revision' => 1, 'actor_id' => 'guillermo']);
    }

    public function test_stale_distribution_update_is_rejected(): void
    {
        $this->withPortalSession('guillermo')->putJson('/api/distribution', [
            'expectedRevision' => 0, 'data' => $this->state(),
        ])->assertOk();

        $stale = $this->state();
        $stale['points'][0]['name'] = 'Nombre obsoleto';
        $this->withPortalSession('alejandro')->putJson('/api/distribution', [
            'expectedRevision' => 0, 'data' => $stale,
        ])->assertConflict()
            ->assertJsonPath('revision', 1)
            ->assertJsonPath('data.points.0.name', 'Distribuidora Central');
    }

    public function test_distribution_respects_portal_roles(): void
    {
        $this->withPortalSession('demo-centro')->getJson('/api/distribution')->assertForbidden();
        $this->withPortalSession('demo-distribuidor')->getJson('/api/distribution')->assertForbidden();
    }

    private function withPortalSession(string $id): static
    {
        return $this->withSession(['portal_user_id' => $id, 'portal_user_version' => 1]);
    }

    private function state(): array
    {
        return [
            'version' => 1,
            'points' => [['id' => 'RED-0001', 'name' => 'Distribuidora Central', 'type' => 'Distribuidor', 'city' => 'Ciudad de México']],
            'doctors' => [['id' => 'MED-0001', 'name' => 'Dra. Elena Ríos', 'site' => 'Unidad A']],
            'patients' => [['id' => 'DIS-0001', 'doctor' => 'MED-0001', 'point' => 'RED-0001', 'created' => '2026-06-01', 'sources' => [], 'visits' => []]],
            'lots' => [], 'moves' => [], 'uses' => [],
        ];
    }
}
