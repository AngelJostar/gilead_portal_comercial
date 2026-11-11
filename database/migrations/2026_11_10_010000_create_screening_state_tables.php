<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('screening_states', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->unsignedBigInteger('revision')->default(0);
            $table->json('payload');
            $table->string('updated_by');
            $table->timestamps();
            $table->foreign('updated_by')->references('id')->on('portal_accounts');
        });

        Schema::create('screening_state_changes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('revision')->unique();
            $table->string('actor_id');
            $table->timestamp('created_at');
            $table->foreign('actor_id')->references('id')->on('portal_accounts');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('screening_state_changes');
        Schema::dropIfExists('screening_states');
    }
};
