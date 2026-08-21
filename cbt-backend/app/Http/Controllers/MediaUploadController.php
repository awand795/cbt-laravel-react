<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class MediaUploadController extends Controller
{
    /**
     * POST /api/media/upload
     * Upload an image or file for question media.
     */
    public function upload(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => ['required', 'file', 'max:5120', 'mimes:jpg,jpeg,png,gif,webp,svg,pdf'],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'File tidak valid. Format yang didukung: jpg, png, gif, webp, svg, pdf. Maks 5MB.',
                'data' => ['errors' => $e->errors()],
            ], 422);
        }

        $file = $request->file('file');
        $path = $file->store('question-media', 'public');

        $url = Storage::disk('public')->url($path);

        return response()->json([
            'success' => true,
            'message' => 'File berhasil diupload.',
            'data' => [
                'url' => $url,
                'path' => $path,
                'filename' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
            ],
        ], 201);
    }

    /**
     * DELETE /api/media/{path}
     * Delete an uploaded media file.
     */
    public function destroy(string $path): JsonResponse
    {
        $fullPath = "question-media/{$path}";

        if (! Storage::disk('public')->exists($fullPath)) {
            return response()->json([
                'success' => false,
                'message' => 'File tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        Storage::disk('public')->delete($fullPath);

        return response()->json([
            'success' => true,
            'message' => 'File berhasil dihapus.',
            'data' => null,
        ]);
    }
}
