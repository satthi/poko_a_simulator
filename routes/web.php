<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Home');
});

Route::get('/projects', function () {
    return Inertia::render('Projects');
});

Route::get('/projects/{id}', function ($id) {
    return Inertia::render('Project', ['projectId' => $id]);
});

Route::get('/blocks-masters', function () {
    return Inertia::render('BlocksMaster');
});
