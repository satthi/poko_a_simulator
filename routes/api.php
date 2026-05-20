<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\BlocksMasterController;

Route::apiResource('projects', ProjectController::class);
Route::apiResource('blocks-masters', BlocksMasterController::class);
