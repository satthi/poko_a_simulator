import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    Alert,
    Box,
    Button,
    Card,
    Container,
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
} from '@mui/icons-material';

const CELL_PX = 32;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.4;
const AUTOSAVE_DELAY_MS = 8000;
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

export default function Project({ projectId }) {
    const [project, setProject] = useState(null);
    const [blockData, setBlockData] = useState(null);
    const [historyState, setHistoryState] = useState({ stack: [], index: -1 });
    const [masters, setMasters] = useState([]);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [hoverCoord, setHoverCoord] = useState(null);
    const [currentZ, setCurrentZ] = useState(0);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
    const [autoSaveMessage, setAutoSaveMessage] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const dragState = useRef({ panning: false, lastX: 0, lastY: 0, moved: false });
    const drawState = useRef({ drawing: false, changed: false, lastKey: null });
    const latestBlockDataRef = useRef(null);

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
                setMasters(Array.isArray(mastersData) ? mastersData : []);
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

    const getBlockForCell = (x, y, z) => {
        const id = Number(blockData?.cells?.[coordKey(x, y, z)] ?? 0);
        return mastersById.get(id) ?? null;
    };

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
        setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
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

    const renderPlane = (z, { clickable, title, compact = false }) => {
        const size = compact ? 18 : CELL_PX;

        return (
            <Card sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {title}
                </Typography>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${xList.length}, ${size}px)`,
                        gap: '1px',
                        backgroundColor: '#cbd5e1',
                        border: '1px solid #94a3b8',
                        width: 'fit-content',
                    }}
                >
                    {yList.map((y) => xList.map((x) => {
                        const block = getBlockForCell(x, y, z);
                        const isCurrentLayer = z === currentZ;
                        const blockColor = block?.color ?? null;
                        const showStrongBorder = blockColor ? isLightHexColor(blockColor) : false;
                        const isGuideLine = !!hoverCoord && (x === hoverCoord.x || y === hoverCoord.y);
                        const isGuidePoint = !!hoverCoord && (x === hoverCoord.x && y === hoverCoord.y);
                        const isAdjacentPlane = z !== currentZ;
                        return (
                            <Box
                                key={`${x}-${y}-${z}`}
                                onMouseDown={(e) => {
                                    if (!clickable || e.button !== 0) {
                                        return;
                                    }
                                    e.stopPropagation();
                                    startDrawingAt(x, y, z);
                                    setHoverCoord({ x, y });
                                }}
                                onMouseEnter={() => {
                                    if (clickable) {
                                        setHoverCoord({ x, y });
                                        drawAt(x, y, z);
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
                                    ].filter(Boolean).join(', '),
                                    cursor: clickable ? 'pointer' : 'default',
                                }}
                            />
                        );
                    }))}
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
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>配置ブロック</Typography>
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

                <Card sx={{ p: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>領域操作（各軸の両方向）</Typography>
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

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: '7fr 3fr' },
                        gap: 2,
                        alignItems: 'start',
                    }}
                >
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
                        </Stack>

                        <Box
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

                    <Stack spacing={2}>
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
                    </Stack>
                </Box>
            </Stack>
        </Container>
    );
}
