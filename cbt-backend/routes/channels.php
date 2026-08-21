<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Channel otorisasi untuk real-time monitoring ujian. Hanya pengguna
| dengan peran admin yang boleh berlangganan (subscribe) ke channel
| "admin.monitor" — data peserta (nama, email, status sesi) tidak
| boleh bocor ke peran lain.
|
*/

Broadcast::channel('admin.monitor', function (User $user) {
    return $user->role === 'admin';
});
