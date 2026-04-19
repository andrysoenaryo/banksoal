<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChapterController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\QuestionPackageController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\UserController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::get('/auth/forgot-password/confirm', [AuthController::class, 'confirmForgotPassword']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/me/change-password', [AuthController::class, 'changePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/menus/navigation', [MenuController::class, 'navigation']);
    Route::get('/menus/tree', [MenuController::class, 'tree']);
    Route::put('/menus/reorder', [MenuController::class, 'reorder']);
    Route::apiResource('menus', MenuController::class);

    Route::apiResource('subjects', SubjectController::class);
    Route::apiResource('chapters', ChapterController::class);
    Route::get('/questions/import-template', [QuestionController::class, 'importTemplate']);
    Route::get('/questions/import-template/docx', [QuestionController::class, 'importTemplateDocx']);
    Route::post('/questions/import', [QuestionController::class, 'import']);
    Route::post('/questions/import-docx/preview', [QuestionController::class, 'previewImportDocx']);
    Route::post('/questions/import-docx', [QuestionController::class, 'importDocx']);
    Route::apiResource('questions', QuestionController::class);
    Route::apiResource('roles', RoleController::class)->except(['show']);
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
    Route::apiResource('users', UserController::class);
    Route::get('/question-packages', [QuestionPackageController::class, 'index']);
    Route::post('/question-packages/generate', [QuestionPackageController::class, 'store']);
    Route::get('/question-packages/{questionPackage}', [QuestionPackageController::class, 'show']);
    Route::put('/question-packages/{questionPackage}', [QuestionPackageController::class, 'update']);
    Route::get('/question-packages/{questionPackage}/rule-questions', [QuestionPackageController::class, 'ruleQuestionEditor']);
    Route::post('/question-packages/{questionPackage}/rules', [QuestionPackageController::class, 'addRule']);
    Route::put('/question-packages/{questionPackage}/items', [QuestionPackageController::class, 'updateItems']);
    Route::get('/question-packages/{questionPackage}/export/excel', [QuestionPackageController::class, 'exportExcel']);
    Route::get('/question-packages/{questionPackage}/export/pdf', [QuestionPackageController::class, 'exportPdf']);
    Route::get('/question-packages/{questionPackage}/export/word', [QuestionPackageController::class, 'exportWord']);
    Route::delete('/question-packages/{questionPackage}', [QuestionPackageController::class, 'destroy']);
});
