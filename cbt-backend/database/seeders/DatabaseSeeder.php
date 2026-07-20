<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Subject;
use App\Models\Exam;
use App\Models\Question;
use App\Models\Option;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Users
        User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@cbt.com',
            'password' => Hash::make('password'),
            'role' => 'admin'
        ]);
        User::create([
            'name' => 'Guru Matematika',
            'email' => 'guru@cbt.com',
            'password' => Hash::make('password'),
            'role' => 'teacher'
        ]);
        User::create([
            'name' => 'Siswa Teladan',
            'email' => 'siswa@cbt.com',
            'password' => Hash::make('password'),
            'role' => 'student'
        ]);

        // Subject
        $subject = Subject::create(['name' => 'Matematika Dasar']);

        // Exam
        $exam = Exam::create([
            'subject_id' => $subject->id,
            'title' => 'Ujian Akhir Semester Matematika',
            'duration_minutes' => 60,
            'status' => 'published',
            'start_time' => now()->subDay(),
            'end_time' => now()->addDays(7),
        ]);

        // Question 1
        $q1 = Question::create([
            'exam_id' => $exam->id,
            'type' => 'pg',
            'question_text' => 'Berapakah 5 x 5?',
        ]);
        Option::create(['question_id' => $q1->id, 'option_text' => '10', 'is_correct' => false]);
        Option::create(['question_id' => $q1->id, 'option_text' => '20', 'is_correct' => false]);
        Option::create(['question_id' => $q1->id, 'option_text' => '25', 'is_correct' => true]);
        Option::create(['question_id' => $q1->id, 'option_text' => '30', 'is_correct' => false]);

        // Question 2
        $q2 = Question::create([
            'exam_id' => $exam->id,
            'type' => 'pg',
            'question_text' => 'Siapa penemu Teori Relativitas?',
        ]);
        Option::create(['question_id' => $q2->id, 'option_text' => 'Isaac Newton', 'is_correct' => false]);
        Option::create(['question_id' => $q2->id, 'option_text' => 'Albert Einstein', 'is_correct' => true]);
        Option::create(['question_id' => $q2->id, 'option_text' => 'Nikola Tesla', 'is_correct' => false]);
        Option::create(['question_id' => $q2->id, 'option_text' => 'Thomas Edison', 'is_correct' => false]);
    }
}
