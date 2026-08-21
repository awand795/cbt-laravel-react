<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exam extends Model
{    protected $fillable = [
        'subject_id', 'created_by', 'title', 'description', 'duration_minutes', 'start_time', 'end_time', 'status',
        'exam_pin', 'instructions', 'max_attempts', 'allow_late_entry',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
        ];
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ExamSession::class);
    }

    public function classrooms(): BelongsToMany
    {
        return $this->belongsToMany(Classroom::class, 'exam_class', 'exam_id', 'class_id');
    }

    /**
     * Ujian terlihat oleh kelas tertentu? `true` jika belum ditetapkan ke
     * kelas mana pun (berarti berlaku untuk semua siswa).
     */
    public function isVisibleToStudent(?User $user): bool
    {
        if (! $user || ! $user->class_id) {
            return $this->classrooms()->count() === 0;
        }

        return $this->classrooms()->count() === 0
            || $this->classrooms()->whereKey($user->class_id)->exists();
    }
}
