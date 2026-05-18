<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Index');
});

Route::get('/projects/{id}', function ($id) {
    return Inertia::render('Project', ['projectId' => $id]);
});
