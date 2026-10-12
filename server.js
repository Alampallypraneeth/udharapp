// Root entrypoint forwarding to backend/server.js
const path = require('path');
process.chdir(path.join(__dirname, 'backend'));
require('./backend/server.js');
