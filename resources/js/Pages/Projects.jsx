import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import {
    Container,
    Card,
    CardContent,
    TextField,
    Button,
    Box,
    Typography,
    Stack,
    Alert,
    Grid,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, ArrowBack as ArrowBackIcon, Add as AddIcon } from '@mui/icons-material';

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        size_x: 10,
        size_y: 10,
        size_z: 5,
    });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    // マウント時にプロジェクト一覧を取得
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects');
            const data = await response.json();
            setProjects(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('プロジェクト一覧の取得に失敗しました');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.startsWith('size_') ? parseInt(value) || 0 : value,
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
                ? `/api/projects/${editingId}` 
                : '/api/projects';

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

            setSuccess(editingId ? 'プロジェクトを更新しました' : 'プロジェクトを作成しました');
            setFormData({
                title: '',
                size_x: 10,
                size_y: 10,
                size_z: 5,
            });
            setEditingId(null);
            await fetchProjects();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (project) => {
        setFormData({
            title: project.title,
            size_x: project.size_x,
            size_y: project.size_y,
            size_z: project.size_z,
        });
        setEditingId(project.id);
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
            const response = await fetch(`/api/projects/${deleteTargetId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('削除に失敗しました');
            }

            setSuccess('プロジェクトを削除しました');
            await fetchProjects();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setDeleteTargetId(null);
        }
    };

    const handleCancel = () => {
        setFormData({
            title: '',
            size_x: 10,
            size_y: 10,
            size_z: 5,
        });
        setEditingId(null);
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
                    プロジェクト管理
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Stack spacing={4}>
                {/* 登録フォーム */}
                <Card sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {editingId ? 'プロジェクト編集' : '新規プロジェクト作成'}
                    </Typography>

                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            {/* プロジェクト名 */}
                            <TextField
                                fullWidth
                                label="プロジェクト名"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                                placeholder="例: 庭園プロジェクト"
                            />

                            {/* サイズ入力 */}
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="幅 (X)"
                                        name="size_x"
                                        type="number"
                                        value={formData.size_x}
                                        onChange={handleInputChange}
                                        required
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="奥行き (Y)"
                                        name="size_y"
                                        type="number"
                                        value={formData.size_y}
                                        onChange={handleInputChange}
                                        required
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="高さ (Z)"
                                        name="size_z"
                                        type="number"
                                        value={formData.size_z}
                                        onChange={handleInputChange}
                                        required
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>
                            </Grid>

                            {/* ボタン */}
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading}
                                    startIcon={editingId ? <EditIcon /> : <AddIcon />}
                                >
                                    {editingId ? '更新' : '作成'}
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

                {/* プロジェクト一覧 */}
                {projects.length === 0 ? (
                    <Card sx={{ p: 3 }}>
                        <Typography color="textSecondary" align="center">
                            プロジェクトがまだ作成されていません
                        </Typography>
                    </Card>
                ) : (
                    <Grid container spacing={3}>
                        {projects.map(project => (
                            <Grid item xs={12} sm={6} md={4} key={project.id}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                                            {project.title}
                                        </Typography>
                                        <Stack spacing={1} sx={{ mb: 2 }}>
                                            <Typography variant="body2" color="textSecondary">
                                                幅: {project.size_x}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary">
                                                奥行き: {project.size_y}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary">
                                                高さ: {project.size_z}
                                            </Typography>
                                        </Stack>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Link href={`/projects/${project.id}`}>
                                                <Button variant="contained" size="small" fullWidth>
                                                    編集
                                                </Button>
                                            </Link>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEdit(project)}
                                                color="primary"
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteClick(project.id)}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Stack>

            {/* 削除確認ダイアログ */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>削除確認</DialogTitle>
                <DialogContent>
                    このプロジェクトを削除してもよろしいですか?
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
