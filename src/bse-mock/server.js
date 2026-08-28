const { app } = require('./index');

const port = Number(process.env.BSE_MOCK_PORT || process.env.PORT || 4000);
app.listen(port, () => console.log(`[BSE-Mock] API Server running at http://localhost:${port}`));
