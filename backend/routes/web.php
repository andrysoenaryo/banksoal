<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

Route::get('/{any?}', function () {
    $spaIndexPath = public_path('index.html');

    if (File::exists($spaIndexPath)) {
        return response()->file($spaIndexPath);
    }

    return view('welcome');
})->where('any', '^(?!api).*$');
