<?php

namespace App\Events;

use App\Models\ExamSession;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Dikirim setiap kali status sesi ujian berubah (mulai, blokir,
 * buka blokir, selesai). Dipakai oleh Live Monitor admin agar
 * berjalan real-time via WebSocket tanpa polling.
 */
class ExamSessionUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  string  $type  start | blocked | unblocked | finished
     */
    public function __construct(
        public ExamSession $session,
        public string $type,
    ) {
    }

    public function broadcastOn(): array
    {
        // Channel privat: hanya admin yang berhak mendengarkan data peserta
        return [new PrivateChannel('admin.monitor')];
    }

    public function broadcastWith(): array
    {
        $session = $this->session->loadMissing(['user:id,name,email', 'exam:id,title']);

        return [
            'type' => $this->type,
            'exam_id' => $session->exam_id,
            'session' => [
                'id' => $session->id,
                'exam_id' => $session->exam_id,
                'exam_title' => $session->exam?->title,
                'user_id' => $session->user_id,
                'user_name' => $session->user?->name,
                'user_email' => $session->user?->email,
                'status' => $session->status,
                'cheat_count' => $session->cheat_count,
                'started_at' => $session->started_at?->toIso8601String(),
                'finished_at' => $session->finished_at?->toIso8601String(),
            ],
        ];
    }
}
