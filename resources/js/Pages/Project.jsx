import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    Alert,
    Box,
    Button,
    Card,
    Container,
    Dialog,
    DialogContent,
    Divider,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    Remove as RemoveIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    Save as SaveIcon,
    OpenInFull as OpenInFullIcon,
} from '@mui/icons-material';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const CELL_PX = 32;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.4;
const AUTOSAVE_DELAY_MS = 8000;
const PREVIEW_VIEWPORT_PX = 360;
const PREVIEW_BASE_CELL_PX = 16;
const TARGET_VISIBLE_CELLS = 20;
const GRID_GAP_PX = 1;
const EDIT_WINDOW_CELLS = 50;
const MINIMAP_PX = 220;
const SMALL_3D_MAX_BLOCKS = 20000;
const LARGE_3D_MAX_BLOCKS = 120000;
const CHECKER_BG =
    'repeating-conic-gradient(#f3f4f6 0% 25%, #ffffff 0% 50%) 50% / 12px 12px';

const normalizeBlockData = (blockData, fallbackSize) => {
    const boundsFromSize = {
        minX: 0,
        maxX: Math.max(0, (fallbackSize?.size_x ?? 1) - 1),
        minY: 0,
        maxY: Math.max(0, (fallbackSize?.size_y ?? 1) - 1),
        minZ: 0,
        maxZ: Math.max(0, (fallbackSize?.size_z ?? 1) - 1),
    };

    if (!blockData || typeof blockData !== 'object' || Array.isArray(blockData)) {
        const legacyCells = {};
        if (Array.isArray(blockData)) {
            blockData.forEach((item) => {
                if (!item) {
                    return;
                }
                const key = `${Number(item.x)},${Number(item.y)},${Number(item.z)}`;
                const blockId = Number(item.blockId);
                if (Number.isFinite(blockId) && blockId > 0) {
                    legacyCells[key] = blockId;
                }
            });
        }

        return {
            version: 1,
            cells: legacyCells,
            bounds: boundsFromSize,
        };
    }

    const bounds = {
        minX: Number(blockData?.bounds?.minX ?? boundsFromSize.minX),
        maxX: Number(blockData?.bounds?.maxX ?? boundsFromSize.maxX),
        minY: Number(blockData?.bounds?.minY ?? boundsFromSize.minY),
        maxY: Number(blockData?.bounds?.maxY ?? boundsFromSize.maxY),
        minZ: Number(blockData?.bounds?.minZ ?? boundsFromSize.minZ),
        maxZ: Number(blockData?.bounds?.maxZ ?? boundsFromSize.maxZ),
    };

    if (bounds.minX > bounds.maxX) {
        [bounds.minX, bounds.maxX] = [bounds.maxX, bounds.minX];
    }
    if (bounds.minY > bounds.maxY) {
        [bounds.minY, bounds.maxY] = [bounds.maxY, bounds.minY];
    }
    if (bounds.minZ > bounds.maxZ) {
        [bounds.minZ, bounds.maxZ] = [bounds.maxZ, bounds.minZ];
    }

    return {
        version: 1,
        cells: { ...(blockData.cells ?? {}) },
        bounds,
    };
};

const coordKey = (x, y, z) => `${x},${y},${z}`;

const cloneBlockData = (data) => JSON.parse(JSON.stringify(data));
const blockDataEquals = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const isEditableElement = (target) => {
    if (!target || !(target instanceof HTMLElement)) {
        return false;
    }

    const tagName = target.tagName.toLowerCase();
    return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

const isLightHexColor = (hex) => {
    if (typeof hex !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        return false;
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
    return luminance >= 190;
};

function BlocksScene({ blocks, bounds, interactive, maxBlocks }) {
    const sampledBlocks = useMemo(() => {
        if (!maxBlocks || blocks.length <= maxBlocks) {
            return blocks;
        }

        const step = Math.ceil(blocks.length / maxBlocks);
        return blocks.filter((_, index) => index % step === 0);
    }, [blocks, maxBlocks]);

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;

    const sizeX = Math.max(1, bounds.maxX - bounds.minX + 1);
    const sizeY = Math.max(1, bounds.maxY - bounds.minY + 1);
    const sizeZ = Math.max(1, bounds.maxZ - bounds.minZ + 1);
    const biggestSize = Math.max(sizeX, sizeY, sizeZ);
    const cameraDistance = Math.max(20, biggestSize * 1.25);

    return (
        <Canvas
            camera={{
                position: [centerX + cameraDistance, centerY + cameraDistance, centerZ + cameraDistance],
                near: 0.1,
                far: 10000,
                fov: 42,
            }}
        >
            <color attach="background" args={['#f8fafc']} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[20, 30, 10]} intensity={0.7} />
            <directionalLight position={[-20, 10, -10]} intensity={0.3} />

            {sampledBlocks.map((block) => (
                <mesh key={block.key} position={[block.x, block.y, block.z]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial
                        color={block.color}
                        transparent
                        opacity={block.opacity}
                    />
                </mesh>
            ))}

            <mesh position={[centerX, centerY, bounds.minZ - 0.55]} receiveShadow>
                <planeGeometry args={[sizeX + 2, sizeY + 2]} />
                <meshStandardMaterial color="#e2e8f0" />
            </mesh>

            <gridHelper
                args={[Math.max(sizeX, sizeY) + 2, Math.max(sizeX, sizeY) + 2, '#94a3b8', '#cbd5e1']}
                position={[centerX, centerY, bounds.minZ - 0.5]}
                rotation={[Math.PI / 2, 0, 0]}
            />

            <OrbitControls
                target={[centerX, centerY, centerZ]}
                enablePan={interactive}
                enableZoom
                enableRotate
                makeDefault
            />
        </Canvas>
    );
}

export default function Project({ projectId }) {
    const [project, setProject] = useState(null);
    const [blockData, setBlockData] = useState(null);
    const [historyState, setHistoryState] = useState({ stack: [], index: -1 });
    const [masters, setMasters] = useState([]);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [hoverCoord, setHoverCoord] = useState(null);
    const [viewOrigin, setViewOrigin] = useState({ x: 0, y: 0 });
    const [currentZ, setCurrentZ] = useState(0);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
    const [autoSaveMessage, setAutoSaveMessage] = useState('');
    const [isPreview3DOpen, setIsPreview3DOpen] = useState(false);
    const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState(false);
    const [isRangeFillMode, setIsRangeFillMode] = useState(false);
    const [rangeFillAnchor, setRangeFillAnchor] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const dragState = useRef({ panning: false, lastX: 0, lastY: 0, moved: false });
    const drawState = useRef({ drawing: false, changed: false, lastKey: null });
    const latestBlockDataRef = useRef(null);
    const mainViewportRef = useRef(null);
    const minimapCanvasRef = useRef(null);
    const hasInitializedViewportRef = useRef(false);

    const pushHistoryEntry = (nextData) => {
        setHistoryState((prev) => {
            const base = prev.stack.slice(0, prev.index + 1);
            let nextStack = [...base, cloneBlockData(nextData)];
            if (nextStack.length > 120) {
                nextStack = nextStack.slice(nextStack.length - 120);
            }

            return {
                stack: nextStack,
                index: nextStack.length - 1,
            };
        });
    };

    const updateBlockData = (mutator, { recordHistory = true } = {}) => {
        const prev = latestBlockDataRef.current;
        if (!prev) {
            return false;
        }

        const draft = cloneBlockData(prev);
        const next = mutator(draft);
        if (!next) {
            return false;
        }

        if (blockDataEquals(prev, next)) {
            return false;
        }

        latestBlockDataRef.current = next;
        setBlockData(next);
        if (recordHistory) {
            pushHistoryEntry(next);
        }
        return true;
    };

    const finishDrawing = () => {
        if (!drawState.current.drawing) {
            return;
        }

        if (drawState.current.changed && latestBlockDataRef.current) {
            pushHistoryEntry(latestBlockDataRef.current);
        }

        drawState.current = { drawing: false, changed: false, lastKey: null };
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');

            try {
                const [projectRes, mastersRes] = await Promise.all([
                    fetch(`/api/projects/${projectId}`),
                    fetch('/api/blocks-masters'),
                ]);

                if (!projectRes.ok) {
                    throw new Error('プロジェクト情報の取得に失敗しました');
                }
                if (!mastersRes.ok) {
                    throw new Error('ブロックマスタの取得に失敗しました');
                }

                const projectData = await projectRes.json();
                const mastersData = await mastersRes.json();
                const normalized = normalizeBlockData(projectData.block_data, projectData);

                setProject(projectData);
                setBlockData(normalized);
                latestBlockDataRef.current = normalized;
                setHistoryState({
                    stack: [cloneBlockData(normalized)],
                    index: 0,
                });
                setLastSavedSnapshot(JSON.stringify(normalized));
                setCurrentZ(normalized.bounds.minZ);
                setViewOrigin({ x: normalized.bounds.minX, y: normalized.bounds.minY });
                setMasters(Array.isArray(mastersData) ? mastersData : []);
                hasInitializedViewportRef.current = false;
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [projectId]);

    useEffect(() => {
        const endActions = () => {
            finishDrawing();
            dragState.current.panning = false;
        };

        window.addEventListener('mouseup', endActions);
        return () => {
            window.removeEventListener('mouseup', endActions);
        };
    }, []);

    const mastersById = useMemo(() => {
        const map = new Map();
        masters.forEach((m) => map.set(Number(m.id), m));
        return map;
    }, [masters]);

    const bounds = blockData?.bounds;
    const xList = useMemo(() => {
        if (!bounds) {
            return [];
        }
        const arr = [];
        for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
            arr.push(x);
        }
        return arr;
    }, [bounds]);

    const yList = useMemo(() => {
        if (!bounds) {
            return [];
        }
        const arr = [];
        for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
            arr.push(y);
        }
        return arr;
    }, [bounds]);

    const totalXCells = xList.length;
    const totalYCells = yList.length;
    const maxOriginX = bounds ? Math.max(bounds.minX, bounds.maxX - EDIT_WINDOW_CELLS + 1) : 0;
    const maxOriginY = bounds ? Math.max(bounds.minY, bounds.maxY - EDIT_WINDOW_CELLS + 1) : 0;

    useEffect(() => {
        if (!bounds) {
            return;
        }

        setViewOrigin((prev) => ({
            x: clamp(prev.x, bounds.minX, maxOriginX),
            y: clamp(prev.y, bounds.minY, maxOriginY),
        }));
    }, [bounds, maxOriginX, maxOriginY]);

    const visibleXList = useMemo(() => {
        if (!bounds) {
            return [];
        }

        const start = clamp(viewOrigin.x, bounds.minX, maxOriginX);
        const end = Math.min(bounds.maxX, start + EDIT_WINDOW_CELLS - 1);
        const arr = [];
        for (let x = start; x <= end; x += 1) {
            arr.push(x);
        }
        return arr;
    }, [bounds, viewOrigin.x, maxOriginX]);

    const visibleYList = useMemo(() => {
        if (!bounds) {
            return [];
        }

        const start = clamp(viewOrigin.y, bounds.minY, maxOriginY);
        const end = Math.min(bounds.maxY, start + EDIT_WINDOW_CELLS - 1);
        const arr = [];
        for (let y = start; y <= end; y += 1) {
            arr.push(y);
        }
        return arr;
    }, [bounds, viewOrigin.y, maxOriginY]);

    const chunkCountX = bounds ? Math.ceil(totalXCells / EDIT_WINDOW_CELLS) : 0;
    const chunkCountY = bounds ? Math.ceil(totalYCells / EDIT_WINDOW_CELLS) : 0;
    const activeChunkX = bounds ? Math.floor((viewOrigin.x - bounds.minX) / EDIT_WINDOW_CELLS) : 0;
    const activeChunkY = bounds ? Math.floor((viewOrigin.y - bounds.minY) / EDIT_WINDOW_CELLS) : 0;

    const moveChunk = (dx, dy) => {
        if (!bounds) {
            return;
        }

        setViewOrigin((prev) => ({
            x: clamp(prev.x + (dx * EDIT_WINDOW_CELLS), bounds.minX, maxOriginX),
            y: clamp(prev.y + (dy * EDIT_WINDOW_CELLS), bounds.minY, maxOriginY),
        }));
    };

    const jumpToChunk = (chunkX, chunkY) => {
        if (!bounds) {
            return;
        }

        const targetX = bounds.minX + (chunkX * EDIT_WINDOW_CELLS);
        const targetY = bounds.minY + (chunkY * EDIT_WINDOW_CELLS);
        setViewOrigin({
            x: clamp(targetX, bounds.minX, maxOriginX),
            y: clamp(targetY, bounds.minY, maxOriginY),
        });
    };

    useEffect(() => {
        if (loading || !bounds || !mainViewportRef.current || hasInitializedViewportRef.current) {
            return;
        }

        const viewport = mainViewportRef.current;
        const viewportWidth = Math.max(1, viewport.clientWidth - 24);
        const viewportHeight = Math.max(1, viewport.clientHeight - 24);

        const targetScaleX = viewportWidth / (TARGET_VISIBLE_CELLS * CELL_PX);
        const targetScaleY = viewportHeight / (TARGET_VISIBLE_CELLS * CELL_PX);
        const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(Math.min(targetScaleX, targetScaleY).toFixed(2))));

        setScale(nextScale);
        setOffset({ x: 16, y: 16 });
        hasInitializedViewportRef.current = true;
    }, [loading, bounds]);

    const placeBlock = (x, y, z) => {
        const key = coordKey(x, y, z);
        return updateBlockData((draft) => {
            if (selectedBlockId === null) {
                delete draft.cells[key];
            } else {
                draft.cells[key] = Number(selectedBlockId);
            }
            return draft;
        }, { recordHistory: false });
    };

    const startDrawingAt = (x, y, z) => {
        drawState.current = { drawing: true, changed: false, lastKey: null };
        const changed = placeBlock(x, y, z);
        drawState.current.changed = changed;
        drawState.current.lastKey = coordKey(x, y, z);
    };

    const drawAt = (x, y, z) => {
        if (!drawState.current.drawing) {
            return;
        }

        const key = coordKey(x, y, z);
        if (drawState.current.lastKey === key) {
            return;
        }

        const changed = placeBlock(x, y, z);
        if (changed) {
            drawState.current.changed = true;
            drawState.current.lastKey = key;
        }
    };

    const adjustBound = (direction, mode) => {
        updateBlockData((draft) => {
            const nextBounds = { ...draft.bounds };

            if (direction === 'minX') {
                nextBounds.minX += mode === 'expand' ? -1 : 1;
            }
            if (direction === 'maxX') {
                nextBounds.maxX += mode === 'expand' ? 1 : -1;
            }
            if (direction === 'minY') {
                nextBounds.minY += mode === 'expand' ? -1 : 1;
            }
            if (direction === 'maxY') {
                nextBounds.maxY += mode === 'expand' ? 1 : -1;
            }
            if (direction === 'minZ') {
                nextBounds.minZ += mode === 'expand' ? -1 : 1;
            }
            if (direction === 'maxZ') {
                nextBounds.maxZ += mode === 'expand' ? 1 : -1;
            }

            if (nextBounds.minX > nextBounds.maxX || nextBounds.minY > nextBounds.maxY || nextBounds.minZ > nextBounds.maxZ) {
                return draft;
            }

            const filteredCells = {};
            Object.entries(draft.cells).forEach(([key, blockId]) => {
                const [x, y, z] = key.split(',').map(Number);
                if (
                    x >= nextBounds.minX && x <= nextBounds.maxX &&
                    y >= nextBounds.minY && y <= nextBounds.maxY &&
                    z >= nextBounds.minZ && z <= nextBounds.maxZ
                ) {
                    filteredCells[key] = blockId;
                }
            });

            setCurrentZ((prevZ) => Math.min(nextBounds.maxZ, Math.max(nextBounds.minZ, prevZ)));

            draft.bounds = nextBounds;
            draft.cells = filteredCells;
            return draft;
        });
    };

    const clearCurrentPlane = () => {
        updateBlockData((draft) => {
            const nextCells = {};
            Object.entries(draft.cells).forEach(([key, blockId]) => {
                const [, , z] = key.split(',').map(Number);
                if (z !== currentZ) {
                    nextCells[key] = blockId;
                }
            });

            draft.cells = nextCells;
            return draft;
        });
    };

    const fillRectangleOnCurrentPlane = (start, end) => {
        updateBlockData((draft) => {
            const minX = Math.min(start.x, end.x);
            const maxX = Math.max(start.x, end.x);
            const minY = Math.min(start.y, end.y);
            const maxY = Math.max(start.y, end.y);

            for (let x = minX; x <= maxX; x += 1) {
                for (let y = minY; y <= maxY; y += 1) {
                    const key = coordKey(x, y, currentZ);
                    if (selectedBlockId === null) {
                        delete draft.cells[key];
                    } else {
                        draft.cells[key] = Number(selectedBlockId);
                    }
                }
            }

            return draft;
        });
    };

    const startRangeFillMode = () => {
        if (selectedBlockId === null) {
            setError('範囲塗りつぶしには配置ブロックを選択してください');
            return;
        }

        finishDrawing();
        setError('');
        setSuccess('範囲塗りつぶしモード: 開始点をクリックしてください');
        setRangeFillAnchor(null);
        setIsRangeFillMode(true);
    };

    const cancelRangeFillMode = () => {
        setIsRangeFillMode(false);
        setRangeFillAnchor(null);
    };

    const handleRangeFillClick = (x, y, z) => {
        if (!isRangeFillMode || z !== currentZ) {
            return false;
        }

        if (selectedBlockId === null) {
            setError('範囲塗りつぶしには配置ブロックを選択してください');
            return true;
        }

        if (!rangeFillAnchor) {
            setRangeFillAnchor({ x, y, z });
            setError('');
            setSuccess(`開始点を設定しました (${x}, ${y}, Z=${z})。終了点をクリックしてください`);
            return true;
        }

        fillRectangleOnCurrentPlane(rangeFillAnchor, { x, y, z });
        setError('');
        setSuccess(`範囲を塗りつぶしました: (${rangeFillAnchor.x}, ${rangeFillAnchor.y}) - (${x}, ${y})`);
        setRangeFillAnchor(null);
        setIsRangeFillMode(false);
        return true;
    };

    const getBlockForCell = (x, y, z) => {
        const id = Number(blockData?.cells?.[coordKey(x, y, z)] ?? 0);
        return mastersById.get(id) ?? null;
    };

    const blocksFor3D = useMemo(() => {
        if (!blockData?.cells) {
            return [];
        }

        return Object.entries(blockData.cells).map(([key, blockId]) => {
            const [x, y, z] = key.split(',').map(Number);
            const master = mastersById.get(Number(blockId));

            return {
                key,
                x,
                y,
                z,
                color: master?.color ?? '#94a3b8',
                opacity: Math.max(0.1, Number(master?.opacity ?? 100) / 100),
            };
        });
    }, [blockData, mastersById]);

    const onWheel = (e) => {
        e.preventDefault();
        const direction = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((prev) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number((prev + direction).toFixed(2)))));
    };

    const onPanStart = (e) => {
        if (!(e.shiftKey || e.button === 1)) {
            return;
        }

        e.preventDefault();
        finishDrawing();
        dragState.current = {
            panning: true,
            lastX: e.clientX,
            lastY: e.clientY,
            moved: false,
        };
    };

    const onPanMove = (e) => {
        if (!dragState.current.panning) {
            return;
        }

        const dx = e.clientX - dragState.current.lastX;
        const dy = e.clientY - dragState.current.lastY;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            dragState.current.moved = true;
        }

        dragState.current.lastX = e.clientX;
        dragState.current.lastY = e.clientY;
        const adjust = 1 / Math.max(0.35, scale);
        setOffset((prev) => ({ x: prev.x + (dx * adjust), y: prev.y + (dy * adjust) }));
    };

    const onPanEnd = () => {
        dragState.current.panning = false;
    };

    const undo = () => {
        setHistoryState((prev) => {
            if (prev.index <= 0) {
                return prev;
            }

            const nextIndex = prev.index - 1;
            const nextData = cloneBlockData(prev.stack[nextIndex]);
            latestBlockDataRef.current = nextData;
            setBlockData(nextData);
            return {
                ...prev,
                index: nextIndex,
            };
        });
    };

    const redo = () => {
        setHistoryState((prev) => {
            if (prev.index >= prev.stack.length - 1) {
                return prev;
            }

            const nextIndex = prev.index + 1;
            const nextData = cloneBlockData(prev.stack[nextIndex]);
            latestBlockDataRef.current = nextData;
            setBlockData(nextData);
            return {
                ...prev,
                index: nextIndex,
            };
        });
    };

    const canUndo = historyState.index > 0;
    const canRedo = historyState.index >= 0 && historyState.index < historyState.stack.length - 1;

    useEffect(() => {
        const onKeyDown = (event) => {
            if (!(event.ctrlKey || event.metaKey) || isEditableElement(event.target)) {
                return;
            }

            const key = event.key.toLowerCase();
            if (key === 'z') {
                event.preventDefault();
                if (event.shiftKey) {
                    if (canRedo) {
                        redo();
                    }
                    return;
                }

                if (canUndo) {
                    undo();
                }
                return;
            }

            if (key === 'y') {
                event.preventDefault();
                if (canRedo) {
                    redo();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [canUndo, canRedo]);

    const blockDataSnapshot = useMemo(() => JSON.stringify(blockData ?? {}), [blockData]);
    const isDirty = !!blockData && blockDataSnapshot !== lastSavedSnapshot;

    const saveProject = async ({ silent = false } = {}) => {
        const currentData = latestBlockDataRef.current;
        if (!currentData) {
            return false;
        }

        setSaving(true);
        if (!silent) {
            setError('');
            setSuccess('');
        }

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ block_data: currentData }),
            });

            if (!response.ok) {
                throw new Error('保存に失敗しました');
            }

            const nextSnapshot = JSON.stringify(currentData);
            setLastSavedSnapshot(nextSnapshot);

            if (silent) {
                const now = new Date();
                const hh = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                const ss = String(now.getSeconds()).padStart(2, '0');
                setAutoSaveMessage(`自動保存: ${hh}:${mm}:${ss}`);
            } else {
                setSuccess('ブロック配置を保存しました');
            }
            return true;
        } catch (e) {
            setError(e.message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (!blockData || loading || saving || !isDirty) {
            return undefined;
        }

        const timer = setTimeout(() => {
            saveProject({ silent: true });
        }, AUTOSAVE_DELAY_MS);

        return () => clearTimeout(timer);
    }, [blockData, loading, saving, isDirty]);

    useEffect(() => {
        if (!bounds || !minimapCanvasRef.current) {
            return;
        }

        const canvas = minimapCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        const width = MINIMAP_PX;
        const height = MINIMAP_PX;
        canvas.width = width;
        canvas.height = height;

        const rangeX = Math.max(1, bounds.maxX - bounds.minX + 1);
        const rangeY = Math.max(1, bounds.maxY - bounds.minY + 1);
        const scaleX = width / rangeX;
        const scaleY = height / rangeY;

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, width, height);

        Object.entries(blockData?.cells ?? {}).forEach(([key, blockId]) => {
            const [x, y, z] = key.split(',').map(Number);
            if (z !== currentZ) {
                return;
            }

            const master = mastersById.get(Number(blockId));
            const px = Math.floor((x - bounds.minX) * scaleX);
            const py = Math.floor((y - bounds.minY) * scaleY);
            const pw = Math.max(1, Math.ceil(scaleX));
            const ph = Math.max(1, Math.ceil(scaleY));

            ctx.fillStyle = master?.color ?? '#64748b';
            ctx.globalAlpha = Math.max(0.2, Number(master?.opacity ?? 100) / 100);
            ctx.fillRect(px, py, pw, ph);
            ctx.globalAlpha = 1;
        });

        const visibleMinX = visibleXList[0] ?? bounds.minX;
        const visibleMaxX = visibleXList[visibleXList.length - 1] ?? bounds.minX;
        const visibleMinY = visibleYList[0] ?? bounds.minY;
        const visibleMaxY = visibleYList[visibleYList.length - 1] ?? bounds.minY;

        const rectX = Math.floor((visibleMinX - bounds.minX) * scaleX);
        const rectY = Math.floor((visibleMinY - bounds.minY) * scaleY);
        const rectW = Math.max(2, Math.ceil((visibleMaxX - visibleMinX + 1) * scaleX));
        const rectH = Math.max(2, Math.ceil((visibleMaxY - visibleMinY + 1) * scaleY));

        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(rectX, rectY, rectW, rectH);
    }, [bounds, blockData, mastersById, currentZ, visibleXList, visibleYList]);

    const handleMinimapClick = (event) => {
        if (!bounds || !minimapCanvasRef.current) {
            return;
        }

        const rect = minimapCanvasRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const rangeX = Math.max(1, bounds.maxX - bounds.minX + 1);
        const rangeY = Math.max(1, bounds.maxY - bounds.minY + 1);
        const worldX = bounds.minX + Math.floor((clickX / rect.width) * rangeX);
        const worldY = bounds.minY + Math.floor((clickY / rect.height) * rangeY);

        const halfWindow = Math.floor(EDIT_WINDOW_CELLS / 2);
        setViewOrigin({
            x: clamp(worldX - halfWindow, bounds.minX, maxOriginX),
            y: clamp(worldY - halfWindow, bounds.minY, maxOriginY),
        });
    };

    const renderPlane = (z, { clickable, title, compact = false }) => {
        const sourceXList = visibleXList;
        const sourceYList = visibleYList;
        const shouldUseHoverGuide = (sourceXList.length * sourceYList.length) <= 2500;
        const size = compact ? PREVIEW_BASE_CELL_PX : CELL_PX;
        const previewTranslateRatio = PREVIEW_BASE_CELL_PX / CELL_PX;
        const compactShiftX = compact ? offset.x * previewTranslateRatio : 0;
        const compactShiftY = compact ? offset.y * previewTranslateRatio : 0;
        const compactScale = compact ? scale : 1;

        return (
            <Card sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {title}
                </Typography>
                <Box
                    sx={compact ? {
                        width: '100%',
                        height: PREVIEW_VIEWPORT_PX,
                        position: 'relative',
                        border: '1px solid #e2e8f0',
                        borderRadius: 1,
                        overflow: 'hidden',
                        backgroundColor: '#f8fafc',
                    } : undefined}
                >
                    <Box
                        sx={{
                            transform: compact
                                ? `translate(${compactShiftX}px, ${compactShiftY}px) scale(${compactScale})`
                                : 'none',
                            transformOrigin: '0 0',
                            position: compact ? 'absolute' : 'static',
                            top: compact ? 0 : 'auto',
                            left: compact ? 0 : 'auto',
                            display: 'grid',
                            gridTemplateColumns: `repeat(${sourceXList.length}, ${size}px)`,
                            gap: `${GRID_GAP_PX}px`,
                            backgroundColor: '#cbd5e1',
                            border: '1px solid #94a3b8',
                            width: 'fit-content',
                        }}
                    >
                        {sourceYList.map((y) => sourceXList.map((x) => {
                            const block = getBlockForCell(x, y, z);
                            const isCurrentLayer = z === currentZ;
                            const blockColor = block?.color ?? null;
                            const showStrongBorder = blockColor ? isLightHexColor(blockColor) : false;
                            const isGuideLine = shouldUseHoverGuide && !!hoverCoord && (x === hoverCoord.x || y === hoverCoord.y);
                            const isGuidePoint = shouldUseHoverGuide && !!hoverCoord && (x === hoverCoord.x && y === hoverCoord.y);
                            const isAdjacentPlane = z !== currentZ;
                            const isRangeAnchor = !!rangeFillAnchor && rangeFillAnchor.x === x && rangeFillAnchor.y === y && rangeFillAnchor.z === z;
                            return (
                                <Box
                                    key={`${x}-${y}-${z}`}
                                    onMouseDown={(e) => {
                                        if (!clickable || e.button !== 0 || e.shiftKey || dragState.current.panning) {
                                            return;
                                        }
                                        e.stopPropagation();
                                        if (handleRangeFillClick(x, y, z)) {
                                            if (shouldUseHoverGuide) {
                                                setHoverCoord({ x, y });
                                            }
                                            return;
                                        }
                                        startDrawingAt(x, y, z);
                                        if (shouldUseHoverGuide) {
                                            setHoverCoord({ x, y });
                                        }
                                    }}
                                    onMouseEnter={() => {
                                        if (clickable) {
                                            if (shouldUseHoverGuide) {
                                                setHoverCoord({ x, y });
                                            }
                                            if (!isRangeFillMode) {
                                                drawAt(x, y, z);
                                            }
                                        }
                                    }}
                                    title={`x:${x}, y:${y}, z:${z}`}
                                    sx={{
                                        width: size,
                                        height: size,
                                        background: blockColor ? blockColor : CHECKER_BG,
                                        opacity: block ? Math.max(0.1, Number(block.opacity ?? 100) / 100) : 1,
                                        border: isCurrentLayer ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                        boxShadow: [
                                            showStrongBorder ? 'inset 0 0 0 1px #334155' : null,
                                            isGuideLine ? 'inset 0 0 0 1px rgba(37, 99, 235, 0.45)' : null,
                                            isGuidePoint ? (isAdjacentPlane ? '0 0 0 2px rgba(217, 70, 239, 0.95) inset' : '0 0 0 2px rgba(37, 99, 235, 0.95) inset') : null,
                                            isRangeAnchor ? '0 0 0 2px rgba(234, 88, 12, 0.95) inset' : null,
                                        ].filter(Boolean).join(', '),
                                        cursor: clickable ? (isRangeFillMode ? 'crosshair' : 'pointer') : 'default',
                                    }}
                                />
                            );
                        }))}
                    </Box>
                </Box>
            </Card>
        );
    };

    if (loading) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Typography>読み込み中...</Typography>
            </Container>
        );
    }

    if (!project || !blockData || !bounds) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Alert severity="error">プロジェクトを読み込めませんでした</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Link href="/projects">
                        <IconButton color="primary" title="プロジェクト一覧に戻る">
                            <ArrowBackIcon />
                        </IconButton>
                    </Link>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h5">{project.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            プロジェクトID: {project.id}
                        </Typography>
                        {autoSaveMessage && (
                            <Typography variant="caption" color="text.secondary">
                                {autoSaveMessage}
                            </Typography>
                        )}
                    </Box>
                    <Button variant="outlined" onClick={undo} disabled={!canUndo}>Undo</Button>
                    <Button variant="outlined" onClick={redo} disabled={!canRedo}>Redo</Button>
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={saveProject}
                        disabled={saving}
                    >
                        {saving ? '保存中...' : '保存'}
                    </Button>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}

                <Card sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1">便利メニュー</Typography>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setIsUtilityMenuOpen((prev) => !prev)}
                        >
                            {isUtilityMenuOpen ? '非表示' : '表示'}
                        </Button>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        ブロック選択・領域操作・今後の便利ツールをここにまとめます
                    </Typography>

                    {isUtilityMenuOpen && (
                        <Stack spacing={2} sx={{ mt: 2 }}>
                            <Card variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>配置ブロック</Typography>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                    <Button
                                        variant={selectedBlockId === null ? 'contained' : 'outlined'}
                                        color="inherit"
                                        onClick={() => setSelectedBlockId(null)}
                                        startIcon={<RemoveIcon />}
                                    >
                                        消しゴム
                                    </Button>
                                    {masters.map((master) => (
                                        <Button
                                            key={master.id}
                                            variant={selectedBlockId === Number(master.id) ? 'contained' : 'outlined'}
                                            onClick={() => setSelectedBlockId(Number(master.id))}
                                            startIcon={(
                                                <Box
                                                    sx={{
                                                        width: 14,
                                                        height: 14,
                                                        borderRadius: '3px',
                                                        border: '1px solid #64748b',
                                                        background: master.color,
                                                        boxShadow: isLightHexColor(master.color) ? 'inset 0 0 0 1px #334155' : 'none',
                                                    }}
                                                />
                                            )}
                                            sx={{
                                                borderColor: '#94a3b8',
                                                color: '#0f172a',
                                                backgroundColor: selectedBlockId === Number(master.id) ? '#e2e8f0' : '#ffffff',
                                                '&:hover': {
                                                    backgroundColor: selectedBlockId === Number(master.id) ? '#cbd5e1' : '#f8fafc',
                                                    borderColor: '#64748b',
                                                },
                                            }}
                                        >
                                            {master.name}
                                        </Button>
                                    ))}
                                </Stack>
                            </Card>

                            <Card variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>領域操作（各軸の両方向）</Typography>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                    <Button size="small" onClick={() => adjustBound('minX', 'expand')}>X- 拡張</Button>
                                    <Button size="small" onClick={() => adjustBound('minX', 'shrink')}>X- 削除</Button>
                                    <Button size="small" onClick={() => adjustBound('maxX', 'expand')}>X+ 拡張</Button>
                                    <Button size="small" onClick={() => adjustBound('maxX', 'shrink')}>X+ 削除</Button>
                                    <Button size="small" onClick={() => adjustBound('minY', 'expand')}>Y- 拡張</Button>
                                    <Button size="small" onClick={() => adjustBound('minY', 'shrink')}>Y- 削除</Button>
                                    <Button size="small" onClick={() => adjustBound('maxY', 'expand')}>Y+ 拡張</Button>
                                    <Button size="small" onClick={() => adjustBound('maxY', 'shrink')}>Y+ 削除</Button>
                                    <Button size="small" onClick={() => adjustBound('minZ', 'expand')}>Z- 拡張</Button>
                                    <Button size="small" onClick={() => adjustBound('minZ', 'shrink')}>Z- 削除</Button>
                                    <Button size="small" onClick={() => adjustBound('maxZ', 'expand')}>Z+ 拡張</Button>
                                    <Button size="small" onClick={() => adjustBound('maxZ', 'shrink')}>Z+ 削除</Button>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                    範囲: X({bounds.minX}..{bounds.maxX}) / Y({bounds.minY}..{bounds.maxY}) / Z({bounds.minZ}..{bounds.maxZ})
                                </Typography>
                            </Card>

                            <Card variant="outlined" sx={{ p: 2, borderStyle: 'dashed' }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>便利ツール</Typography>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                    <Button
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        onClick={clearCurrentPlane}
                                    >
                                        現在の平面を全消し
                                    </Button>
                                    <Button
                                        size="small"
                                        variant={isRangeFillMode ? 'contained' : 'outlined'}
                                        onClick={isRangeFillMode ? cancelRangeFillMode : startRangeFillMode}
                                        disabled={selectedBlockId === null && !isRangeFillMode}
                                    >
                                        {isRangeFillMode ? '範囲塗りつぶしを終了' : '範囲塗りつぶし'}
                                    </Button>
                                </Stack>
                                {isRangeFillMode && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                        {!rangeFillAnchor
                                            ? `開始点をクリックしてください (Z=${currentZ})`
                                            : `開始点: (${rangeFillAnchor.x}, ${rangeFillAnchor.y}, Z=${rangeFillAnchor.z}) / 終了点をクリックしてください`}
                                    </Typography>
                                )}
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    ここにショートカット・変換ツール・定型配置などを追加できます
                                </Typography>
                            </Card>
                        </Stack>
                    )}
                </Card>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 7fr) minmax(320px, 3fr)' },
                        gap: 2,
                        alignItems: 'start',
                    }}
                >
                    <Stack spacing={2}>
                        <Card sx={{ p: 2 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle1">Zレイヤー</Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => setCurrentZ((z) => Math.max(bounds.minZ, z - 1))}
                                    disabled={currentZ <= bounds.minZ}
                                >
                                    <ExpandMoreIcon />
                                </IconButton>
                                <Typography>現在: {currentZ}</Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => setCurrentZ((z) => Math.min(bounds.maxZ, z + 1))}
                                    disabled={currentZ >= bounds.maxZ}
                                >
                                    <ExpandLessIcon />
                                </IconButton>

                                <Divider orientation="vertical" flexItem />

                                <Typography variant="body2">ズーム</Typography>
                                <IconButton size="small" onClick={() => setScale((s) => Math.max(MIN_SCALE, Number((s - 0.1).toFixed(2))))}>
                                    <ZoomOutIcon />
                                </IconButton>
                                <Typography variant="body2">{Math.round(scale * 100)}%</Typography>
                                <IconButton size="small" onClick={() => setScale((s) => Math.min(MAX_SCALE, Number((s + 0.1).toFixed(2))))}>
                                    <ZoomInIcon />
                                </IconButton>
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    Shift+ドラッグ で画面移動 / 左ドラッグ で連続配置
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    表示範囲: X({visibleXList[0]}..{visibleXList[visibleXList.length - 1]}) Y({visibleYList[0]}..{visibleYList[visibleYList.length - 1]})
                                </Typography>
                            </Stack>

                            <Box
                                ref={mainViewportRef}
                                onWheel={onWheel}
                                onMouseDown={onPanStart}
                                onMouseMove={onPanMove}
                                onMouseUp={onPanEnd}
                                onMouseLeave={onPanEnd}
                                onMouseDownCapture={() => setHoverCoord(null)}
                                sx={{
                                    overflow: 'hidden',
                                    border: '1px solid #d0d7de',
                                    borderRadius: 1,
                                    backgroundColor: '#f8fafc',
                                    height: 520,
                                    cursor: dragState.current.panning ? 'grabbing' : 'default',
                                }}
                            >
                                <Box
                                    sx={{
                                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                                        transformOrigin: '0 0',
                                        p: 2,
                                        width: 'fit-content',
                                    }}
                                >
                                    {renderPlane(currentZ, { clickable: true, title: `現在の平面 (Z=${currentZ})` })}
                                </Box>
                            </Box>
                        </Card>

                        <Card sx={{ p: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>エリアナビ (50x50)</Typography>
                            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                <Button size="small" onClick={() => moveChunk(-1, 0)}>←</Button>
                                <Button size="small" onClick={() => moveChunk(1, 0)}>→</Button>
                                <Button size="small" onClick={() => moveChunk(0, -1)}>↑</Button>
                                <Button size="small" onClick={() => moveChunk(0, 1)}>↓</Button>
                                <Typography variant="caption" sx={{ alignSelf: 'center' }}>
                                    チャンク {activeChunkX + 1}/{Math.max(1, chunkCountX)} , {activeChunkY + 1}/{Math.max(1, chunkCountY)}
                                </Typography>
                            </Stack>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${Math.max(1, chunkCountX)}, minmax(18px, 1fr))`,
                                    gap: '4px',
                                    mb: 1,
                                }}
                            >
                                {Array.from({ length: Math.max(1, chunkCountX * chunkCountY) }).map((_, idx) => {
                                    const cx = idx % Math.max(1, chunkCountX);
                                    const cy = Math.floor(idx / Math.max(1, chunkCountX));
                                    const active = cx === activeChunkX && cy === activeChunkY;
                                    return (
                                        <Button
                                            key={`chunk-${cx}-${cy}`}
                                            size="small"
                                            variant={active ? 'contained' : 'outlined'}
                                            onClick={() => jumpToChunk(cx, cy)}
                                            sx={{ minWidth: 0, p: 0.5, fontSize: '0.65rem' }}
                                        >
                                            {cx + 1}-{cy + 1}
                                        </Button>
                                    );
                                })}
                            </Box>
                            <Box
                                sx={{
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 1,
                                    width: MINIMAP_PX,
                                    height: MINIMAP_PX,
                                    overflow: 'hidden',
                                    mx: 'auto',
                                    cursor: 'pointer',
                                }}
                            >
                                <canvas
                                    ref={minimapCanvasRef}
                                    width={MINIMAP_PX}
                                    height={MINIMAP_PX}
                                    onClick={handleMinimapClick}
                                    style={{ display: 'block', width: `${MINIMAP_PX}px`, height: `${MINIMAP_PX}px` }}
                                />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                ミニマップクリックで該当地点へジャンプ
                            </Typography>
                        </Card>
                    </Stack>

                    <Stack spacing={2} sx={{ minWidth: 0 }}>

                        <Box>
                            {renderPlane(currentZ + 1, {
                                clickable: false,
                                title: `上の平面 (Z=${currentZ + 1})`,
                                compact: true,
                            })}
                        </Box>
                        <Box>
                            {renderPlane(currentZ - 1, {
                                clickable: false,
                                title: `下の平面 (Z=${currentZ - 1})`,
                                compact: true,
                            })}
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                            上下プレビューはメイン2Dのズーム・移動に連動します
                        </Typography>

                        <Card sx={{ p: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2">3Dプレビュー</Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<OpenInFullIcon />}
                                    onClick={() => setIsPreview3DOpen(true)}
                                >
                                    拡大
                                </Button>
                            </Box>
                            <Box
                                onClick={() => setIsPreview3DOpen(true)}
                                sx={{
                                    height: 220,
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                }}
                            >
                                <BlocksScene blocks={blocksFor3D} bounds={bounds} interactive={false} maxBlocks={SMALL_3D_MAX_BLOCKS} />
                            </Box>
                            {blocksFor3D.length > SMALL_3D_MAX_BLOCKS && (
                                <Typography variant="caption" color="text.secondary">
                                    描画負荷軽減のため3Dプレビューは間引いて表示中（{blocksFor3D.length.toLocaleString()}ブロック）
                                </Typography>
                            )}
                        </Card>
                    </Stack>
                </Box>

                <Dialog
                    open={isPreview3DOpen}
                    onClose={() => setIsPreview3DOpen(false)}
                    fullWidth
                    maxWidth="lg"
                >
                    <DialogContent sx={{ p: 2 }}>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>3Dシミュレーター（拡大表示）</Typography>
                        <Box sx={{ height: '70vh', border: '1px solid #cbd5e1', borderRadius: 1, overflow: 'hidden' }}>
                            <BlocksScene blocks={blocksFor3D} bounds={bounds} interactive maxBlocks={LARGE_3D_MAX_BLOCKS} />
                        </Box>
                    </DialogContent>
                </Dialog>
            </Stack>
        </Container>
    );
}
