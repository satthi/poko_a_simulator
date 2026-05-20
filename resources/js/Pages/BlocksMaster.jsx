import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import {
    Container,
    Card,
    TextField,
    Button,
    Box,
    Typography,
    Slider,
    Stack,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';

// ブロックのタイプ定義
const BLOCK_TYPES = [
    { value: 'block', label: 'ブロック' },
    { value: 'decoration', label: '装飾品' },
];

export default function BlocksMasterList() {
    const [blocks, setBlocks] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        color: '#000000',
        opacity: 100,
    });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    // マウント時にブロック一覧を取得
    useEffect(() => {
        fetchBlocks();
    }, []);

    const fetchBlocks = async () => {
        try {
            const response = await fetch('/api/blocks-masters');
            const data = await response.json();
            setBlocks(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('ブロック一覧の取得に失敗しました');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleColorChange = (e) => {
        setFormData(prev => ({
            ...prev,
            color: e.target.value,
        }));
    };

    const handleOpacityChange = (e, value) => {
        setFormData(prev => ({
            ...prev,
            opacity: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId 
                ? `/api/blocks-masters/${editingId}` 
                : '/api/blocks-masters';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '送信に失敗しました');
            }

            setSuccess(editingId ? 'ブロックを更新しました' : 'ブロックを追加しました');
            setFormData({
                name: '',
                type: '',
                color: '#000000',
                opacity: 100,
            });
            setEditingId(null);
            await fetchBlocks();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (block) => {
        setFormData({
            name: block.name,
            type: block.type,
            color: block.color,
            opacity: block.opacity,
        });
        setEditingId(block.id);
    };

    const handleDeleteClick = (id) => {
        setDeleteTargetId(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        setDeleteDialogOpen(false);
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`/api/blocks-masters/${deleteTargetId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('削除に失敗しました');
            }

            setSuccess('ブロックを削除しました');
            await fetchBlocks();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setDeleteTargetId(null);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: '',
            type: '',
            color: '#000000',
            opacity: 100,
        });
        setEditingId(null);
    };

    const getTypeLabel = (typeValue) => {
        const type = BLOCK_TYPES.find(t => t.value === typeValue);
        return type ? type.label : typeValue;
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Link href="/">
                    <IconButton color="primary" title="TOP画面に戻る">
                        <ArrowBackIcon />
                    </IconButton>
                </Link>
                <Typography variant="h4" component="h1">
                    ブロックマスタ管理
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Stack spacing={4}>
                {/* 登録フォーム */}
                <Card sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {editingId ? 'ブロック編集' : '新規ブロック登録'}
                    </Typography>

                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            {/* ブロック名 */}
                            <TextField
                                fullWidth
                                label="ブロック名"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="例: 赤いレンガ"
                            />

                            {/* タイプ */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    タイプ <span style={{ color: '#d32f2f' }}>*</span>
                                </Typography>
                                <Select
                                    fullWidth
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    required
                                    displayEmpty
                                >
                                    <MenuItem value="" disabled>
                                        タイプを選択してください
                                    </MenuItem>
                                    {BLOCK_TYPES.map(type => (
                                        <MenuItem key={type.value} value={type.value}>
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Box>

                            {/* 色選択 */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    色 (HEXコード)
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <TextField
                                        type="color"
                                        value={formData.color}
                                        onChange={handleColorChange}
                                        sx={{ width: 100 }}
                                        inputProps={{ style: { cursor: 'pointer' } }}
                                    />
                                    <TextField
                                        value={formData.color}
                                        onChange={handleColorChange}
                                        size="small"
                                        sx={{ width: 150 }}
                                        placeholder="#000000"
                                    />
                                </Box>
                            </Box>

                            {/* 透過率 */}
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle2">
                                        透過率
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        {formData.opacity}%
                                    </Typography>
                                </Box>
                                <Slider
                                    value={formData.opacity}
                                    onChange={handleOpacityChange}
                                    min={0}
                                    max={100}
                                    step={1}
                                    marks
                                />
                            </Box>

                            {/* プレビュー */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    プレビュー
                                </Typography>
                                <Box
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        backgroundColor: formData.color,
                                        opacity: formData.opacity / 100,
                                        border: '1px solid #ccc',
                                    }}
                                />
                            </Box>

                            {/* ボタン */}
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading}
                                >
                                    {editingId ? '更新' : '登録'}
                                </Button>
                                {editingId && (
                                    <Button
                                        variant="outlined"
                                        onClick={handleCancel}
                                        disabled={loading}
                                    >
                                        キャンセル
                                    </Button>
                                )}
                            </Box>
                        </Stack>
                    </Box>
                </Card>

                {/* ブロック一覧 */}
                <Card>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell>ブロック名</TableCell>
                                    <TableCell>タイプ</TableCell>
                                    <TableCell>色</TableCell>
                                    <TableCell width={120}>透過率</TableCell>
                                    <TableCell width={120} align="center">操作</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {blocks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                            ブロックがまだ登録されていません
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    blocks.map(block => (
                                        <TableRow key={block.id}>
                                            <TableCell>{block.name}</TableCell>
                                            <TableCell>{getTypeLabel(block.type)}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                    <Box
                                                        sx={{
                                                            width: 30,
                                                            height: 30,
                                                            backgroundColor: block.color,
                                                            opacity: block.opacity / 100,
                                                            border: '1px solid #ccc',
                                                        }}
                                                    />
                                                    <Typography variant="body2">
                                                        {block.color}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{block.opacity}%</TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEdit(block)}
                                                    color="primary"
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteClick(block.id)}
                                                    color="error"
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            </Stack>

            {/* 削除確認ダイアログ */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>削除確認</DialogTitle>
                <DialogContent>
                    このブロックを削除してもよろしいですか?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                    >
                        削除
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
