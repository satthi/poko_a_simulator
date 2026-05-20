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

        $initialBlockData = [
            'version' => 1,
            'cells' => [],
            'bounds' => [
                'minX' => 0,
                'maxX' => $validated['size_x'] - 1,
                'minY' => 0,
                'maxY' => $validated['size_y'] - 1,
                'minZ' => 0,
                'maxZ' => $validated['size_z'] - 1,
            ],
        ];

        $project = Project::create([
            ...$validated,
            'block_data' => $initialBlockData,
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
        $normalizedBlockData = $this->normalizeBlockData($project);

        return [
            'id' => $project->id,
            'title' => $project->title,
            'size_x' => $project->size_x,
            'size_y' => $project->size_y,
            'size_z' => $project->size_z,
            'block_data' => $normalizedBlockData,
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

        if (array_key_exists('block_data', $validated)) {
            $validated['block_data'] = $this->normalizeBlockData($project, $validated['block_data']);
        }

        $project->update($validated);

        return [
            'id' => $project->id,
            'title' => $project->title,
            'size_x' => $project->size_x,
            'size_y' => $project->size_y,
            'size_z' => $project->size_z,
            'block_data' => $this->normalizeBlockData($project),
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

    /**
     * Normalize block_data to sparse-map format.
     */
    private function normalizeBlockData(Project $project, ?array $inputData = null): array
    {
        $data = $inputData ?? ($project->block_data ?? []);

        $defaultBounds = [
            'minX' => 0,
            'maxX' => max(0, (int) $project->size_x - 1),
            'minY' => 0,
            'maxY' => max(0, (int) $project->size_y - 1),
            'minZ' => 0,
            'maxZ' => max(0, (int) $project->size_z - 1),
        ];

        $cells = [];

        // New format: { cells: { "x,y,z": blockId | { type: "subcell_group", subcells: [...] } }, bounds: {...} }
        if (isset($data['cells']) && is_array($data['cells'])) {
            foreach ($data['cells'] as $key => $cellValue) {
                if (!is_string($key) || !preg_match('/^-?\d+,-?\d+,-?\d+$/', $key)) {
                    continue;
                }

                // Check if cellValue is an object type (array in PHP)
                if (is_array($cellValue)) {
                    $type = $cellValue['type'] ?? null;
                    
                    // Handle block_with_subcells
                    if ($type === 'block_with_subcells' && isset($cellValue['blockId'])) {
                        $blockId = (int) $cellValue['blockId'];
                        $rawSubcells = $cellValue['subcells'] ?? null;
                        
                        if (is_array($rawSubcells)) {
                            $normalizedSubcells = array_fill(0, 4, null);
                            $hasAnySubcell = false;

                            for ($i = 0; $i < 4; $i++) {
                                $rawSubcell = $rawSubcells[$i] ?? null;
                                if (!is_array($rawSubcell)) {
                                    continue;
                                }

                                $masterId = (int) ($rawSubcell['masterId'] ?? 0);
                                if ($masterId <= 0) {
                                    continue;
                                }

                                $rotation = (int) ($rawSubcell['rotation'] ?? 0);
                                $rotation = (($rotation % 360) + 360) % 360;

                                $normalizedSubcells[$i] = [
                                    'masterId' => $masterId,
                                    'rotation' => $rotation,
                                ];
                                $hasAnySubcell = true;
                            }

                            if ($hasAnySubcell) {
                                $cells[$key] = [
                                    'type' => 'block_with_subcells',
                                    'blockId' => $blockId,
                                    'subcells' => $normalizedSubcells,
                                ];
                            } else if ($blockId > 0) {
                                $cells[$key] = $blockId;
                            }
                        }
                        continue;
                    }
                    
                    // Handle subcell_group
                    if ($type !== 'subcell_group') {
                        continue;
                    }

                    $rawSubcells = $cellValue['subcells'] ?? null;
                    if (!is_array($rawSubcells)) {
                        continue;
                    }

                    $normalizedSubcells = array_fill(0, 4, null);
                    $hasAnySubcell = false;

                    for ($i = 0; $i < 4; $i++) {
                        $rawSubcell = $rawSubcells[$i] ?? null;
                        if (!is_array($rawSubcell)) {
                            continue;
                        }

                        $masterId = (int) ($rawSubcell['masterId'] ?? 0);
                        if ($masterId <= 0) {
                            continue;
                        }

                        $rotation = (int) ($rawSubcell['rotation'] ?? 0);
                        $rotation = (($rotation % 360) + 360) % 360;

                        $normalizedSubcells[$i] = [
                            'masterId' => $masterId,
                            'rotation' => $rotation,
                        ];
                        $hasAnySubcell = true;
                    }

                    if ($hasAnySubcell) {
                        $cells[$key] = [
                            'type' => 'subcell_group',
                            'subcells' => $normalizedSubcells,
                        ];
                    }
                } else {
                    // Regular blockId (integer type)
                    $normalizedBlockId = (int) $cellValue;
                    if ($normalizedBlockId > 0) {
                        $cells[$key] = $normalizedBlockId;
                    }
                }
            }
        }

        // Legacy format: [ { x, y, z, blockId }, ... ]
        if (empty($cells) && array_is_list($data)) {
            foreach ($data as $item) {
                if (!is_array($item)) {
                    continue;
                }

                $x = isset($item['x']) ? (int) $item['x'] : null;
                $y = isset($item['y']) ? (int) $item['y'] : null;
                $z = isset($item['z']) ? (int) $item['z'] : null;
                $blockId = isset($item['blockId']) ? (int) $item['blockId'] : null;

                if ($x === null || $y === null || $z === null || $blockId === null || $blockId <= 0) {
                    continue;
                }

                $cells["{$x},{$y},{$z}"] = $blockId;
            }
        }

        $bounds = $defaultBounds;
        if (isset($data['bounds']) && is_array($data['bounds'])) {
            $bounds = [
                'minX' => isset($data['bounds']['minX']) ? (int) $data['bounds']['minX'] : $defaultBounds['minX'],
                'maxX' => isset($data['bounds']['maxX']) ? (int) $data['bounds']['maxX'] : $defaultBounds['maxX'],
                'minY' => isset($data['bounds']['minY']) ? (int) $data['bounds']['minY'] : $defaultBounds['minY'],
                'maxY' => isset($data['bounds']['maxY']) ? (int) $data['bounds']['maxY'] : $defaultBounds['maxY'],
                'minZ' => isset($data['bounds']['minZ']) ? (int) $data['bounds']['minZ'] : $defaultBounds['minZ'],
                'maxZ' => isset($data['bounds']['maxZ']) ? (int) $data['bounds']['maxZ'] : $defaultBounds['maxZ'],
            ];
        }

        if ($bounds['minX'] > $bounds['maxX']) {
            [$bounds['minX'], $bounds['maxX']] = [$bounds['maxX'], $bounds['minX']];
        }
        if ($bounds['minY'] > $bounds['maxY']) {
            [$bounds['minY'], $bounds['maxY']] = [$bounds['maxY'], $bounds['minY']];
        }
        if ($bounds['minZ'] > $bounds['maxZ']) {
            [$bounds['minZ'], $bounds['maxZ']] = [$bounds['maxZ'], $bounds['minZ']];
        }

        return [
            'version' => 1,
            'cells' => $cells,
            'bounds' => $bounds,
        ];
    }
}
