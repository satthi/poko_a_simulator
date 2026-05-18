<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name') }}</title>
    <style>
        body { font-family: sans-serif; margin: 2rem; }
        h1 { color: #333; }
        p { color: #666; }
    </style>
</head>
<body>
    <h1>Laravel 12 セットアップ完了</h1>
    <p>Inertia.js + React は後で設定します。</p>
    <p>開発時は以下でホットリロード対応：</p>
    <pre>npm run dev</pre>
</body>
</html>