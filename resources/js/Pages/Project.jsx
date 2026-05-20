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
    const [masters, setMasters] = useState([]);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [currentZ, setCurrentZ] = useState(0);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const dragState = useRef({ panning: false, lastX: 0, lastY: 0, moved: false });

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
        if (!blockData) {
            return;
        }

        const key = coordKey(x, y, z);
        setBlockData((prev) => {
            const nextCells = { ...prev.cells };
            if (selectedBlockId === null) {
                delete nextCells[key];
            } else {
                nextCells[key] = Number(selectedBlockId);
            }
            return {
                ...prev,
                cells: nextCells,
            };
        });
    };

    const adjustBound = (direction, mode) => {
        if (!blockData) {
            return;
        }

        setBlockData((prev) => {
            const nextBounds = { ...prev.bounds };

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
                return prev;
            }

            const filteredCells = {};
            Object.entries(prev.cells).forEach(([key, blockId]) => {
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

            return {
                ...prev,
                bounds: nextBounds,
                cells: filteredCells,
            };
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

    const saveProject = async () => {
        if (!blockData) {
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ block_data: blockData }),
            });

            if (!response.ok) {
                throw new Error('保存に失敗しました');
            }

            setSuccess('ブロック配置を保存しました');
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

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
                        return (
                            <Box
                                key={`${x}-${y}-${z}`}
                                onClick={() => {
                                    if (!clickable || dragState.current.moved) {
                                        return;
                                    }
                                    placeBlock(x, y, z);
                                }}
                                title={`x:${x}, y:${y}, z:${z}`}
                                sx={{
                                    width: size,
                                    height: size,
                                    background: blockColor ? blockColor : CHECKER_BG,
                                    opacity: block ? Math.max(0.1, Number(block.opacity ?? 100) / 100) : 1,
                                    border: isCurrentLayer ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                    boxShadow: showStrongBorder ? 'inset 0 0 0 1px #334155' : 'none',
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
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={saveProject}
                        disabled={saving}
                    >
                        保存
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
                    </Stack>

                    <Box
                        onWheel={onWheel}
                        onMouseDown={onPanStart}
                        onMouseMove={onPanMove}
                        onMouseUp={onPanEnd}
                        onMouseLeave={onPanEnd}
                        sx={{
                            overflow: 'hidden',
                            border: '1px solid #d0d7de',
                            borderRadius: 1,
                            backgroundColor: '#f8fafc',
                            height: 520,
                            cursor: dragState.current.panning ? 'grabbing' : 'grab',
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

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                        {renderPlane(currentZ + 1, {
                            clickable: false,
                            title: `上の平面 (Z=${currentZ + 1})`,
                            compact: true,
                        })}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        {renderPlane(currentZ - 1, {
                            clickable: false,
                            title: `下の平面 (Z=${currentZ - 1})`,
                            compact: true,
                        })}
                    </Box>
                </Stack>
            </Stack>
        </Container>
    );
}
