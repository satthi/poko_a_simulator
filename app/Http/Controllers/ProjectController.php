<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * Get all projects
     */
    public function index()
    {
        return Project::all()->map(function ($project) {
            return [
                'id' => $project->id,
                'title' => $project->title,
                'size_x' => $project->size_x,
                'size_y' => $project->size_y,
                'size_z' => $project->size_z,
                'created_at' => $project->created_at,
                'updated_at' => $project->updated_at,
            ];
        });
    }

    /**
     * Create a new project
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'size_x' => 'required|integer|min:1',
            'size_y' => 'required|integer|min:1',
            'size_z' => 'required|integer|min:1',
        ]);

        $project = Project::create([
            ...$validated,
            'block_data' => [],
        ]);

        return [
            'id' => $project->id,
            'title' => $project->title,
            'size_x' => $project->size_x,
            'size_y' => $project->size_y,
            'size_z' => $project->size_z,
            'created_at' => $project->created_at,
            'updated_at' => $project->updated_at,
        ];
    }

    /**
     * Get a single project
     */
    public function show($id)
    {
        $project = Project::findOrFail($id);
        return [
            'id' => $project->id,
            'title' => $project->title,
            'size_x' => $project->size_x,
            'size_y' => $project->size_y,
            'size_z' => $project->size_z,
            'block_data' => $project->block_data ?? [],
            'created_at' => $project->created_at,
            'updated_at' => $project->updated_at,
        ];
    }

    /**
     * Update a project
     */
    public function update(Request $request, $id)
    {
        $project = Project::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'block_data' => 'sometimes|array',
        ]);

        $project->update($validated);

        return [
            'id' => $project->id,
            'title' => $project->title,
            'size_x' => $project->size_x,
            'size_y' => $project->size_y,
            'size_z' => $project->size_z,
            'block_data' => $project->block_data ?? [],
            'created_at' => $project->created_at,
            'updated_at' => $project->updated_at,
        ];
    }

    /**
     * Delete a project
     */
    public function destroy($id)
    {
        $project = Project::findOrFail($id);
        $project->delete();
        return ['message' => 'Project deleted successfully'];
    }
}
