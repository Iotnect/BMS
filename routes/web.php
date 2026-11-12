<?php

use App\Http\Controllers\BmsController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');
Route::post('/demo-login', [BmsController::class, 'demoLogin'])->middleware('throttle:6,1')->name('demo.login');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [BmsController::class, 'index'])->name('dashboard');
    foreach (['analytics', 'equipment', 'alarms', 'schedules', 'commissioning', 'reports', 'activity', 'preferences', 'integrations'] as $view) {
        Route::get('/'.$view, [BmsController::class, 'index'])->defaults('view', $view)->name('bms.'.$view);
    }
    Route::post('/alarms/{alarm}/acknowledge', [BmsController::class, 'acknowledge'])->name('bms.acknowledge');
    Route::patch('/equipment/{equipment}', [BmsController::class, 'equipment'])->name('bms.equipment.update');
    Route::post('/schedules', [BmsController::class, 'saveSchedule'])->name('bms.schedules.store');
    Route::put('/schedules/{schedule}', [BmsController::class, 'saveSchedule'])->name('bms.schedules.update');
    Route::delete('/schedules/{schedule}', [BmsController::class, 'deleteSchedule'])->name('bms.schedules.delete');
    Route::post('/commissioning', [BmsController::class, 'saveIssue'])->name('bms.commissioning.store');
    Route::put('/commissioning/{issue}', [BmsController::class, 'saveIssue'])->name('bms.commissioning.update');
    Route::put('/preferences', [BmsController::class, 'settings'])->name('bms.preferences.update');
    Route::get('/reports/energy.csv', [BmsController::class, 'export'])->name('bms.export');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
