import { Container, Box } from '@mui/material';

export default function Project({ projectId }) {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box>
                <h1>プロジェクト詳細 (ID: {projectId})</h1>
                <p>2D エディタと 3D ビューアはここに配置されます</p>
            </Box>
        </Container>
    );
}
