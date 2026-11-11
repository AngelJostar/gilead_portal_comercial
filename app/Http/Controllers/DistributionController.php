<?php

namespace App\Http\Controllers;

use App\Models\DistributionState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DistributionController extends Controller
{
    public function show(): JsonResponse
    {
        $record = DistributionState::query()->find(1);

        return response()->json([
            'data' => $record?->payload,
            'revision' => $record?->revision ?? 0,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'expectedRevision' => ['required', 'integer', 'min:0'],
            'data' => ['required', 'array'],
            'data.version' => ['required', 'integer', 'in:1'],
            'data.points' => ['present', 'array', 'max:10000'],
            'data.doctors' => ['present', 'array', 'max:10000'],
            'data.patients' => ['present', 'array', 'max:100000'],
            'data.lots' => ['present', 'array', 'max:100000'],
            'data.moves' => ['present', 'array', 'max:250000'],
            'data.uses' => ['present', 'array', 'max:250000'],
        ]);

        $encoded = json_encode($validated['data'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (strlen($encoded) > 5_000_000) {
            throw ValidationException::withMessages(['data' => 'La información de Distribución excede el tamaño permitido.']);
        }

        $account = $request->attributes->get('portalAccount');
        $result = DB::transaction(function () use ($validated, $account) {
            $record = DistributionState::query()->lockForUpdate()->find(1);
            $currentRevision = $record?->revision ?? 0;

            if ($currentRevision !== $validated['expectedRevision']) {
                return null;
            }

            $nextRevision = $currentRevision + 1;
            $record ??= new DistributionState(['id' => 1]);
            $record->payload = $validated['data'];
            $record->revision = $nextRevision;
            $record->updated_by = $account->id;
            $record->save();

            DB::table('distribution_state_changes')->insert([
                'revision' => $nextRevision,
                'actor_id' => $account->id,
                'created_at' => now(),
            ]);

            return $record;
        }, 3);

        if (! $result) {
            $latest = DistributionState::query()->find(1);
            return response()->json([
                'error' => 'Distribución cambió en otra sesión. Se cargó la versión más reciente.',
                'data' => $latest?->payload,
                'revision' => $latest?->revision ?? 0,
            ], 409);
        }

        return response()->json([
            'data' => $result->payload,
            'revision' => $result->revision,
        ]);
    }
}
