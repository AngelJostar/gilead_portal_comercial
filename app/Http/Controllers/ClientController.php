<?php

namespace App\Http\Controllers;

use App\Support\Portal;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ClientController extends Controller
{
    use OrderData;

    public function show(Request $request)
    {
        $user = $request->attributes->get('portalAccount');
        $center = $user->center_id;
        $contacts = DB::table('center_contacts')->where('center_id', $center)->orderBy('label')->get()
            ->map(fn ($contact) => ['id' => $contact->id, 'kind' => $contact->kind, 'label' => $contact->label, 'detail' => $contact->detail,
                'patientName' => $contact->patient_name, 'profile' => json_decode($contact->profile ?: '{}', true), 'version' => $contact->profile_version, 'supplierId' => $contact->supplier_id]);
        $treatments = DB::table('center_treatments as t')->join('center_contacts as p', fn ($join) => $join->on('p.id', '=', 't.patient_id')->on('p.center_id', '=', 't.center_id'))
            ->join('center_contacts as d', fn ($join) => $join->on('d.id', '=', 't.doctor_id')->on('d.center_id', '=', 't.center_id'))
            ->join('center_contacts as s', fn ($join) => $join->on('s.id', '=', 't.distributor_id')->on('s.center_id', '=', 't.center_id'))
            ->where('t.center_id', $center)->select('t.*', 'p.label as patient', 'p.patient_name as patientName', 'p.detail as patientDetail', 'd.label as doctor', 's.label as distributor')
            ->orderByDesc('t.day')->orderByDesc('t.rowid')->get();
        return response()->json([
            'center' => DB::table('client_centers')->where('id', $center)->value('name'), 'contacts' => $contacts,
            'treatments' => $treatments, 'suppliers' => $this->activeSuppliers()->orderBy('sp.name')->get(),
            'orders' => $this->readOrders('center', $center),
        ]);
    }

    public function contact(Request $request)
    {
        $center = $request->attributes->get('portalAccount')->center_id;
        $data = $request->validate([
            'requestId' => ['required', 'uuid'], 'kind' => ['required', 'in:patient,doctor,distributor'],
            'label' => ['nullable', 'string', 'max:140'], 'patientName' => ['nullable', 'string', 'max:140'],
            'detail' => ['nullable', 'string', 'max:180'], 'supplierId' => ['nullable', 'string', 'max:64'],
        ]);
        if (DB::table('center_contacts')->where('center_id', $center)->where('id', $data['requestId'])->exists()) return response()->json(['id' => $data['requestId']]);
        if ($data['kind'] === 'distributor') {
            $supplier = $this->activeSuppliers()->where('sp.id', $data['supplierId'])->first();
            abort_unless($supplier, 400, 'Selecciona un distribuidor con una cuenta activa.');
            DB::table('center_contacts')->upsert([['id' => (string) Str::uuid(), 'center_id' => $center, 'kind' => 'distributor', 'label' => $supplier->name, 'detail' => $data['detail'] ?? '', 'supplier_id' => $supplier->id]], ['center_id', 'kind', 'label'], ['detail', 'supplier_id']);
            $id = DB::table('center_contacts')->where('center_id', $center)->where('kind', 'distributor')->where('supplier_id', $supplier->id)->where('label', $supplier->name)->value('id');
            abort_unless($id, 409, 'Este contacto ya está vinculado a otra empresa.');
            return response()->json(['id' => $id], 201);
        }
        $label = trim($data['label'] ?? '');
        abort_if($label === '', 422, 'Revisa los campos obligatorios y su longitud.');
        abort_if(DB::table('center_contacts')->where('center_id', $center)->where('kind', $data['kind'])->whereRaw('label = ? COLLATE NOCASE', [$label])->exists(), 409, 'Ya hay un registro con ese nombre o folio.');
        DB::table('center_contacts')->insert(['id' => $data['requestId'], 'center_id' => $center, 'kind' => $data['kind'], 'label' => $label,
            'detail' => trim($data['detail'] ?? ''), 'patient_name' => $data['kind'] === 'patient' ? trim($data['patientName'] ?? '') : null]);
        return response()->json(['id' => $data['requestId']], 201);
    }

    public function treatment(Request $request)
    {
        $user = $request->attributes->get('portalAccount');
        $data = $request->validate([
            'requestId' => ['required', 'uuid'], 'day' => ['required', 'date_format:Y-m-d'], 'supplierId' => ['required', 'string', 'max:64'],
            'medication' => ['required', 'in:Trodelvy'], 'name' => ['required', 'string', 'max:140'], 'quantity' => ['required', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:700'], 'patient' => ['nullable', 'string', 'max:80'], 'doctor' => ['nullable', 'string', 'max:80'],
            'patientRecord' => ['nullable', 'array'], 'doctorRecord' => ['nullable', 'array'],
        ]);
        $existing = $this->findOrder($data['requestId'], $user->center_id);
        if ($existing) return response()->json(['id' => $data['requestId'], 'orderId' => $existing->id, 'folio' => Portal::folio($existing->id)]);
        $supplier = $this->activeSuppliers()->where('sp.id', $data['supplierId'])->first();
        abort_unless($supplier, 400, 'Selecciona un distribuidor con una cuenta activa.');
        try {
            DB::transaction(function () use ($data, $user, $supplier): void {
                $patient = $this->saveTreatmentContact($user->center_id, 'patient', $data, $data['requestId']);
                $doctor = $this->saveTreatmentContact($user->center_id, 'doctor', $data, $data['requestId']);
                DB::table('center_contacts')->upsert([['id' => (string) Str::uuid(), 'center_id' => $user->center_id, 'kind' => 'distributor', 'label' => $supplier->name, 'detail' => '', 'supplier_id' => $supplier->id]], ['center_id', 'kind', 'label'], ['supplier_id']);
                $distributor = DB::table('center_contacts')->where('center_id', $user->center_id)->where('kind', 'distributor')->where('supplier_id', $supplier->id)->where('label', $supplier->name)->value('id');
                abort_unless($distributor, 409, 'No se pudo vincular el distribuidor.');
                DB::table('center_treatments')->insert(['id' => $data['requestId'], 'center_id' => $user->center_id, 'patient_id' => $patient, 'doctor_id' => $doctor,
                    'distributor_id' => $distributor, 'day' => $data['day'], 'name' => trim($data['name']), 'medication' => 'Trodelvy', 'quantity' => trim($data['quantity']), 'notes' => trim($data['notes'] ?? '')]);
                $orderId = DB::table('supply_orders')->insertGetId(['treatment_id' => $data['requestId'], 'supplier_id' => $supplier->id, 'created_at' => time()]);
                DB::table('supply_events')->insert(['id' => (string) Str::uuid(), 'order_id' => $orderId, 'status' => 'Solicitada', 'actor_id' => $user->id, 'created_at' => time()]);
            });
        } catch (QueryException $error) {
            $stored = $this->findOrder($data['requestId'], $user->center_id);
            if (! $stored) throw $error;
        }
        $order = $this->findOrder($data['requestId'], $user->center_id);
        abort_unless($order, 409, 'No se pudo asociar el folio a esta solicitud.');
        return response()->json(['id' => $data['requestId'], 'orderId' => $order->id, 'folio' => Portal::folio($order->id)], 201);
    }

    private function findOrder(string $treatment, string $center): ?object
    {
        return DB::table('supply_orders as o')->join('center_treatments as t', 't.id', '=', 'o.treatment_id')->where('t.id', $treatment)->where('t.center_id', $center)->select('o.id')->first();
    }

    private function saveTreatmentContact(string $center, string $kind, array $data, string $requestId): string
    {
        $draft = $data[$kind.'Record'] ?? null;
        $selectedId = $draft['id'] ?? ($data[$kind] ?? null);
        $existing = $selectedId ? DB::table('center_contacts')->where('id', $selectedId)->where('center_id', $center)->where('kind', $kind)->first() : null;
        if ($selectedId && ! $existing) abort(400, 'El registro seleccionado no pertenece al centro.');
        if (! $draft) { abort_unless($existing, 400, 'Selecciona o registra al paciente y al médico.'); return $existing->id; }
        if ($existing && ($draft['version'] ?? null) !== $existing->profile_version) abort(409, 'La ficha cambió. Actualiza para usar sus datos vigentes.');
        $patient = $kind === 'patient';
        $label = trim($draft['label'] ?? '') ?: ($existing->label ?? 'P-'.strtoupper(substr($requestId, 0, 13)));
        $patientName = $patient ? trim($draft['patientName'] ?? '') : null;
        if ($patient && ! $existing && $patientName === '') abort(422, 'Indica el nombre o alias del paciente.');
        if (! $patient && $label === '') abort(422, 'Indica el nombre del médico.');
        $profile = $this->validateProfile($kind, $draft['profile'] ?? []);
        $contactId = $existing->id ?? $requestId.'-'.$kind;
        $duplicate = DB::table('center_contacts')->where('center_id', $center)->where('kind', $kind)->whereRaw('label = ? COLLATE NOCASE', [$label])->where('id', '!=', $contactId)->exists();
        abort_if($duplicate, 409, $patient ? 'El folio ya existe. Selecciona al paciente registrado.' : 'El médico ya existe. Selecciona su ficha registrada.');
        $values = ['label' => $label, 'patient_name' => $patientName, 'detail' => trim($draft['detail'] ?? ''), 'profile' => json_encode($profile, JSON_UNESCAPED_UNICODE), 'profile_version' => $requestId];
        if ($existing) DB::table('center_contacts')->where('id', $contactId)->where('center_id', $center)->update($values);
        else DB::table('center_contacts')->insert(['id' => $contactId, 'center_id' => $center, 'kind' => $kind, ...$values]);
        return $contactId;
    }

    private function validateProfile(string $kind, mixed $values): array
    {
        abort_unless(is_array($values), 400, 'Ficha inválida.');
        $fields = $kind === 'patient' ? [
            'birthDate'=>10,'sex'=>32,'phone'=>30,'altPhone'=>30,'email'=>180,'language'=>140,'street'=>140,'neighborhood'=>140,'city'=>140,'state'=>140,'postalCode'=>5,
            'emergencyName'=>140,'relationship'=>140,'emergencyPhone'=>30,'referrer'=>140,'service'=>140,'coverage'=>140,'policy'=>140,'authorization'=>140,'diagnosis'=>500,'allergies'=>500,'observations'=>700,
        ] : ['license'=>40,'specialtyLicense'=>40,'subspecialty'=>140,'staffCode'=>80,'institution'=>140,'department'=>140,'office'=>140,'position'=>140,'email'=>180,'phone'=>30,'extension'=>12,'mobile'=>30,'address'=>220,'city'=>140,'state'=>140,'postalCode'=>5,'officeHours'=>140,'observations'=>700];
        $clean = [];
        foreach ($fields as $key => $max) {
            $value = trim((string) ($values[$key] ?? ''));
            if ($value === '') continue;
            abort_if(mb_strlen($value) > $max, 422, 'Revisa los campos obligatorios y su longitud.');
            if ($key === 'birthDate') abort_if(! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) || $value > date('Y-m-d'), 400, 'Revisa la fecha de nacimiento.');
            if ($key === 'email') abort_unless(filter_var($value, FILTER_VALIDATE_EMAIL), 400, 'Revisa el correo electrónico.');
            if ($key === 'postalCode') abort_unless(preg_match('/^\d{5}$/', $value), 400, 'El código postal debe tener cinco dígitos.');
            if ($key === 'sex') abort_unless(in_array($value, ['Femenino','Masculino','Otro','Sin especificar'], true), 400, 'Revisa el campo Sexo registrado.');
            $clean[$key] = $value;
        }
        return $clean;
    }
}
