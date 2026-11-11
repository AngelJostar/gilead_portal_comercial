<?php

namespace Tests\Feature;

use Database\Seeders\PortalDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScreeningPersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PortalDemoSeeder::class);
    }

    public function test_authorized_users_share_the_screening_state(): void
    {
        $state = $this->demoState();

        $this->withPortalSession('guillermo')->putJson('/api/screening', [
            'expectedRevision' => 0,
            'data' => $state,
        ])->assertOk()->assertJsonPath('revision', 1);

        $this->withPortalSession('alejandro')->getJson('/api/screening')
            ->assertOk()
            ->assertJsonPath('revision', 1)
            ->assertJsonPath('data.episodes.0.id', 'SIM-001');

        $this->assertDatabaseHas('screening_states', ['id' => 1, 'revision' => 1, 'updated_by' => 'guillermo']);
        $this->assertDatabaseHas('screening_state_changes', ['revision' => 1, 'actor_id' => 'guillermo']);
    }

    public function test_stale_updates_are_rejected_without_losing_the_latest_data(): void
    {
        $this->withPortalSession('guillermo')->putJson('/api/screening', [
            'expectedRevision' => 0,
            'data' => $this->demoState(),
        ])->assertOk();

        $stale = $this->demoState();
        $stale['episodes'][0]['result'] = 'Reactivo';

        $this->withPortalSession('alejandro')->putJson('/api/screening', [
            'expectedRevision' => 0,
            'data' => $stale,
        ])->assertConflict()
            ->assertJsonPath('revision', 1)
            ->assertJsonPath('data.episodes.0.result', 'No reactivo');
    }

    public function test_client_and_supplier_roles_cannot_access_screening_data(): void
    {
        $this->withPortalSession('demo-centro')->getJson('/api/screening')->assertForbidden();
        $this->withPortalSession('demo-distribuidor')->getJson('/api/screening')->assertForbidden();
    }

    private function withPortalSession(string $id): static
    {
        return $this->withSession(['portal_user_id' => $id, 'portal_user_version' => 1]);
    }

    private function demoState(): array
    {
        return [
            'version' => 1,
            'episodes' => [[
                'id' => 'SIM-001', 'patientRef' => 'PX-DEMO-001', 'site' => 'A', 'origin' => 'A',
                'jornada' => 'J-A', 'created' => '2026-11-04', 'result' => 'No reactivo',
                'decision' => 'No aplica', 'consent' => 'CONS-001', 'tests' => [], 'events' => [], 'interrupted' => false,
            ]],
            'tasks' => [], 'samples' => [], 'lots' => [], 'jornadas' => [], 'requests' => [], 'moves' => [],
        ];
    }
}
