const { startApiService } = require('./services/api/apiService');
const { waStart } = require('./services/wa-bot/waStart');
require('dotenv').config();

const PORT = process.env.SERVICE_PORT || 4000;

// Start Services
startApiService(PORT);
waStart();