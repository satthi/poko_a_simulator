import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import {
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Container,
    Box,
} from '@mui/material';

export default function Index() {
    const [projects, setProjects] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        size_x: 10,
        size_y: 10,
        size_z: 10,
    });
    const [loading, setLoading] = useState(true);

    // プロジェクト一覧を取得
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects');
            const data = await response.json();
            setProjects(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            setLoading(false);
        }
    };

    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData({
            title: '',
            size_x: 10,
            size_y: 10,
            size_z: 10,
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'title' ? value : parseInt(value) || 0,
        }));
    };

    const handleCreateProject = async () => {
        if (!formData.title.trim()) {
            alert('プロジェクト名を入力してください');
            return;
        }

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const newProject = await response.json();
                setProjects([...projects, newProject]);
                handleCloseDialog();
            } else {
                alert('プロジェクト作成に失敗しました');
            }
        } catch (error) {
            console.error('Failed to create project:', error);
            alert('エラーが発生しました');
        }
    };

    const handleDeleteProject = async (id) => {
        if (window.confirm('このプロジェクトを削除しますか？')) {
            try {
                const response = await fetch(`/api/projects/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                    },
                });

                if (response.ok) {
                    setProjects(projects.filter(p => p.id !== id));
                } else {
                    alert('削除に失敗しました');
                }
            } catch (error) {
                console.error('Failed to delete project:', error);
                alert('エラーが発生しました');
            }
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>ぽこあポケモン シミュレーター</h1>
                <Button variant="contained" color="primary" onClick={handleOpenDialog}>
                    新規プロジェクト作成
                </Button>
            </Box>

            {/* 新規プロジェクト作成ダイアログ */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>新規プロジェクト作成</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        fullWidth
                        label="プロジェクト名"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="幅 (X)"
                        name="size_x"
                        type="number"
                        value={formData.size_x}
                        onChange={handleInputChange}
                        margin="normal"
                        inputProps={{ min: 1 }}
                    />
                    <TextField
                        fullWidth
                        label="奥行き (Y)"
                        name="size_y"
                        type="number"
                        value={formData.size_y}
                        onChange={handleInputChange}
                        margin="normal"
                        inputProps={{ min: 1 }}
                    />
                    <TextField
                        fullWidth
                        label="高さ (Z)"
                        name="size_z"
                        type="number"
                        value={formData.size_z}
                        onChange={handleInputChange}
                        margin="normal"
                        inputProps={{ min: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>キャンセル</Button>
                    <Button onClick={handleCreateProject} variant="contained" color="primary">
                        作成
                    </Button>
                </DialogActions>
            </Dialog>

            {/* プロジェクト一覧 */}
            {loading ? (
                <p>読み込み中...</p>
            ) : projects.length === 0 ? (
                <p>プロジェクトがまだ作成されていません。</p>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell>プロジェクト名</TableCell>
                                <TableCell align="center">サイズ (X×Y×Z)</TableCell>
                                <TableCell align="center">作成日時</TableCell>
                                <TableCell align="center">操作</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {projects.map(project => (
                                <TableRow key={project.id}>
                                    <TableCell>
                                        <Link href={`/projects/${project.id}`} style={{ color: '#1976d2', textDecoration: 'none' }}>
                                            {project.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell align="center">
                                        {project.size_x} × {project.size_y} × {project.size_z}
                                    </TableCell>
                                    <TableCell align="center">
                                        {new Date(project.created_at).toLocaleDateString('ja-JP')}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteProject(project.id)}
                                        >
                                            削除
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
}
