<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('portal_accounts', function (Blueprint $table) {
            $table->string('id')->primary(); $table->string('name'); $table->string('username')->nullable()->unique();
            $table->string('email')->nullable()->unique(); $table->string('role'); $table->boolean('enabled')->default(true);
            $table->string('credential')->nullable(); $table->unsignedInteger('version')->default(1); $table->unsignedBigInteger('last_seen')->nullable();
        });
        Schema::create('portal_attempts', function (Blueprint $table) { $table->string('key')->primary(); $table->unsignedInteger('failures'); $table->unsignedBigInteger('since'); });
        Schema::create('client_centers', function (Blueprint $table) { $table->string('id')->primary(); $table->string('name'); $table->string('normalized_name')->unique(); });
        Schema::create('suppliers', function (Blueprint $table) { $table->string('id')->primary(); $table->string('name'); $table->string('normalized_name')->unique(); });
        Schema::create('center_memberships', function (Blueprint $table) { $table->string('user_id')->primary(); $table->string('center_id'); $table->foreign('user_id')->references('id')->on('portal_accounts'); $table->foreign('center_id')->references('id')->on('client_centers'); });
        Schema::create('supplier_members', function (Blueprint $table) { $table->string('user_id')->primary(); $table->string('supplier_id'); $table->foreign('user_id')->references('id')->on('portal_accounts'); $table->foreign('supplier_id')->references('id')->on('suppliers'); });
        Schema::create('center_contacts', function (Blueprint $table) {
            $table->string('id')->primary(); $table->string('center_id'); $table->string('kind'); $table->string('label'); $table->string('detail')->nullable();
            $table->string('patient_name')->nullable(); $table->string('supplier_id')->nullable(); $table->text('profile')->nullable(); $table->string('profile_version')->nullable();
            $table->unique(['center_id','kind','label'], 'center_contact_label'); $table->foreign('center_id')->references('id')->on('client_centers'); $table->foreign('supplier_id')->references('id')->on('suppliers');
        });
        Schema::create('center_treatments', function (Blueprint $table) {
            $table->string('id')->primary(); $table->string('center_id'); $table->string('patient_id'); $table->string('doctor_id'); $table->string('distributor_id');
            $table->date('day'); $table->string('name'); $table->string('medication'); $table->string('quantity'); $table->text('notes')->nullable();
            $table->foreign('center_id')->references('id')->on('client_centers'); $table->foreign('patient_id')->references('id')->on('center_contacts');
            $table->foreign('doctor_id')->references('id')->on('center_contacts'); $table->foreign('distributor_id')->references('id')->on('center_contacts');
        });
        Schema::create('supply_orders', function (Blueprint $table) { $table->id(); $table->string('treatment_id')->unique(); $table->string('supplier_id'); $table->unsignedBigInteger('created_at'); $table->foreign('treatment_id')->references('id')->on('center_treatments'); $table->foreign('supplier_id')->references('id')->on('suppliers'); });
        Schema::create('supply_events', function (Blueprint $table) {
            $table->string('id')->primary(); $table->unsignedBigInteger('order_id'); $table->string('status'); $table->string('reference')->nullable(); $table->string('lot')->nullable();
            $table->text('notes')->nullable(); $table->string('actor_id'); $table->unsignedBigInteger('created_at'); $table->unique(['order_id','status'], 'supply_order_step');
            $table->foreign('order_id')->references('id')->on('supply_orders'); $table->foreign('actor_id')->references('id')->on('portal_accounts');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supply_events'); Schema::dropIfExists('supply_orders'); Schema::dropIfExists('center_treatments');
        Schema::dropIfExists('center_contacts'); Schema::dropIfExists('supplier_members'); Schema::dropIfExists('center_memberships');
        Schema::dropIfExists('suppliers'); Schema::dropIfExists('client_centers'); Schema::dropIfExists('portal_attempts'); Schema::dropIfExists('portal_accounts');
    }
};
