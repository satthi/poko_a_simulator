import { Container, Box, Card, CardContent, Typography, Button, Stack, Grid } from '@mui/material';
import { Link } from '@inertiajs/react';
import { Build as BuildIcon, Palette as PaletteIcon } from '@mui/icons-material';

export default function Home() {
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h3" component="h1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    ぽこあポケモン シミュレータ
                </Typography>
                <Typography variant="h6" color="textSecondary">
                    ブロック配置シミュレーションツール
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* プロジェクト */}
                <Grid item xs={12} sm={6}>
                    <Card
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'transform 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                            },
                        }}
                    >
                        <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                <BuildIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
                            </Box>
                            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                                プロジェクト
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                シミュレーションプロジェクトを作成・管理します。
                                サイズを設定してブロック配置を開始できます。
                            </Typography>
                            <Link href="/projects">
                                <Button
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                >
                                    プロジェクトへ
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </Grid>

                {/* ブロックマスタ管理 */}
                <Grid item xs={12} sm={6}>
                    <Card
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'transform 0.2s',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                            },
                        }}
                    >
                        <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                <PaletteIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                            </Box>
                            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                                ブロックマスタ管理
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                ブロックの種類を登録・管理します。
                                ブロック名、色、透過率を設定できます。
                            </Typography>
                            <Link href="/blocks-masters">
                                <Button
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                >
                                    ブロック管理へ
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}
