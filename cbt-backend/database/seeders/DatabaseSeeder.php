<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Subject;
use App\Models\Classroom;
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
        // Kelas
        $classA = Classroom::create(['name' => 'Kelas IX-A', 'code' => 'IX-A']);
        $classB = Classroom::create(['name' => 'Kelas IX-B', 'code' => 'IX-B']);

        User::create([
            'name' => 'Siswa Teladan',
            'email' => 'siswa@cbt.com',
            'password' => Hash::make('password'),
            'role' => 'student',
            'class_id' => $classA->id,
        ]);
        User::create([
            'name' => 'Siswa Kelas B',
            'email' => 'siswab@cbt.com',
            'password' => Hash::make('password'),
            'role' => 'student',
            'class_id' => $classB->id,
        ]);

        // Subject
        $subject = Subject::create(['name' => 'Matematika Dasar', 'code' => 'MTK']);

        // Exam — dimiliki oleh akun Guru agar bisa dikelola lewat panel guru,
        // khusus untuk Kelas IX-A (siswa kelas lain tidak melihat ujian ini)
        $teacher = User::where('email', 'guru@cbt.com')->first();
        $exam = Exam::create([
            'subject_id' => $subject->id,
            'created_by' => $teacher?->id,
            'title' => 'Ujian Akhir Semester Matematika',
            'description' => 'Ujian Akhir Semester ganjil — khusus Kelas IX-A.',
            'duration_minutes' => 60,
            'status' => 'published',
            'start_time' => now()->subDay(),
            'end_time' => now()->addDays(7),
        ]);
        $exam->classrooms()->attach($classA->id);

        // Question 1 — bobot 4 poin (skor akhir dihitung dari bobot)
        $q1 = Question::create([
            'exam_id' => $exam->id,
            'type' => 'pg',
            'question_text' => 'Berapakah 5 x 5?',
            'score' => 4,
        ]);
        Option::create(['question_id' => $q1->id, 'option_text' => '10', 'is_correct' => false]);
        Option::create(['question_id' => $q1->id, 'option_text' => '20', 'is_correct' => false]);
        Option::create(['question_id' => $q1->id, 'option_text' => '25', 'is_correct' => true]);
        Option::create(['question_id' => $q1->id, 'option_text' => '30', 'is_correct' => false]);

        // Question 2 — bobot 6 poin
        $q2 = Question::create([
            'exam_id' => $exam->id,
            'type' => 'pg',
            'question_text' => 'Siapa penemu Teori Relativitas?',
            'score' => 6,
        ]);
        Option::create(['question_id' => $q2->id, 'option_text' => 'Isaac Newton', 'is_correct' => false]);
        Option::create(['question_id' => $q2->id, 'option_text' => 'Albert Einstein', 'is_correct' => true]);
        Option::create(['question_id' => $q2->id, 'option_text' => 'Nikola Tesla', 'is_correct' => false]);
        Option::create(['question_id' => $q2->id, 'option_text' => 'Thomas Edison', 'is_correct' => false]);
    }
}
