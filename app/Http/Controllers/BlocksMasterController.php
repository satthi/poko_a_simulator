<?php

namespace App\Http\Controllers;

use App\Models\BlocksMaster;
use Illuminate\Http\Request;

class BlocksMasterController extends Controller
{
    /**
     * Get all blocks masters.
     */
    public function index()
    {
        return BlocksMaster::all();
    }

    /**
     * Store a newly created block master.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:blocks_master',
            'type' => 'required|string|max:100',
            'color' => 'required|string|regex:/^#[0-9A-F]{6}$/i',
            'opacity' => 'required|integer|min:0|max:100',
        ]);

        return BlocksMaster::create($validated);
    }

    /**
     * Get a specific block master.
     */
    public function show(BlocksMaster $blocksMaster)
    {
        return $blocksMaster;
    }

    /**
     * Update the specified block master.
     */
    public function update(Request $request, BlocksMaster $blocksMaster)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:blocks_master,name,' . $blocksMaster->id,
            'type' => 'required|string|max:100',
            'color' => 'required|string|regex:/^#[0-9A-F]{6}$/i',
            'opacity' => 'required|integer|min:0|max:100',
        ]);

        $blocksMaster->update($validated);
        return $blocksMaster;
    }

    /**
     * Delete the specified block master.
     */
    public function destroy(BlocksMaster $blocksMaster)
    {
        $blocksMaster->delete();
        return response()->json(['message' => 'Block master deleted successfully'], 200);
    }
}
