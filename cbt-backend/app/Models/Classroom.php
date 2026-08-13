<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Classroom extends Model
{
    protected $table = 'classes';

    protected $fillable = ['name', 'code'];

    public function students(): HasMany
    {
        return $this->hasMany(User::class, 'class_id');
    }

    public function exams(): BelongsToMany
    {
        return $this->belongsToMany(Exam::class, 'exam_class', 'class_id', 'exam_id');
    }
}
