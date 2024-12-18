const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan'); // For logging
const os = require('os');

// Middleware setup
app.use(cors());
app.use(bodyParser.json());

// Add logging middleware
app.use(morgan('combined'));

// Configure rate limiters
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

const activeUsersLimiter = rateLimit({
    windowMs: 5 * 1000, // 5 seconds
    max: 1, // 1 request per 5 seconds
    message: {
        success: false,
        message: 'Please wait before updating active users again.'
    }
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/active-users', activeUsersLimiter);

// In-memory storage with backup
let activeUsers = Math.floor(Math.random() * (900 - 400) + 400); // Random between 400-900
let users = {};
let scores = {};
let cachedLeaderboard = null;
let lastLeaderboardUpdate = 0;
const CACHE_DURATION = 5000; // 5 seconds

// Monitoring variables
let startTime = Date.now();
let requestCount = 0;

// Serve static files
app.use(express.static(path.join('/var/www/flappy-bird')));

// Health monitoring endpoint
app.get('/api/health', (req, res) => {
    const health = {
        uptime: process.uptime(),
        responseTime: process.hrtime(),
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: process.memoryUsage(),
            usagePercentage: (process.memoryUsage().heapUsed / os.totalmem() * 100).toFixed(2)
        },
        cpu: os.loadavg(),
        requestCount,
        activeConnections: Object.keys(users).length,
        timestamp: Date.now()
    };
    res.json(health);
});

// Active users endpoints with caching
app.get('/api/active-users', (req, res) => {
    requestCount++;
    res.json({ activeUsers });
});

app.post('/api/update-active-users', (req, res) => {
    requestCount++;
    const { change } = req.body;
    
    if (change !== undefined) {
        // Calculate new value
        let newCount = activeUsers + change;
        
        // Add small random variation
        newCount += Math.floor(Math.random() * 6) - 3; // -3 to +3
        
        // Ensure within bounds
        newCount = Math.min(Math.max(newCount, 400), 900);
        
        // Update the actual value
        activeUsers = newCount;
        
        res.json({ 
            success: true, 
            activeUsers,
            previousCount: activeUsers,
            change: change,
            finalCount: newCount
        });
    } else {
        res.status(400).json({ 
            success: false, 
            message: "Invalid request",
            currentCount: activeUsers 
        });
    }
});

// Score submission with validation
app.post('/api/submit-score', (req, res) => {
    requestCount++;
    const { username, score } = req.body;

    if (!username || typeof score !== 'number') {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid score submission" 
        });
    }

    // Only update if it's a higher score
    if (!scores[username] || score > scores[username]) {
        scores[username] = score;
        // Invalidate leaderboard cache
        cachedLeaderboard = null;
    }

    res.json({ 
        success: true, 
        message: "Score submitted successfully",
        highScore: scores[username]
    });
});

// Leaderboard endpoint with caching
app.get('/api/leaderboard', (req, res) => {
    requestCount++;
    const now = Date.now();
    
    // Return cached leaderboard if fresh
    if (cachedLeaderboard && (now - lastLeaderboardUpdate) < CACHE_DURATION) {
        return res.json({ leaderboard: cachedLeaderboard });
    }

    // Generate new leaderboard
    const leaderboard = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([username, score]) => ({ username, score }));

    // Update cache
    cachedLeaderboard = leaderboard;
    lastLeaderboardUpdate = now;

    res.json({ leaderboard });
});

// Check if username is available
app.post('/api/check-username', (req, res) => {
    const { username, currentUsername } = req.body;
    
    // If user is trying to keep their current name, that's allowed
    if (username === currentUsername) {
        return res.json({ available: true });
    }
    
    // Check if username exists in scores object
    const exists = Object.keys(scores).includes(username);
    
    res.json({ available: !exists });
});

// Update username
app.post('/api/update-username', (req, res) => {
    const { oldUsername, newUsername } = req.body;
    
    // If trying to update to the same name, just return success
    if (oldUsername === newUsername) {
        return res.json({ 
            success: true, 
            message: "Username unchanged" 
        });
    }

    // Check if new username already exists
    if (Object.keys(scores).includes(newUsername)) {
        return res.json({ 
            success: false, 
            message: "Username already taken" 
        });
    }

    // Update score if it exists
    if (scores[oldUsername] !== undefined) {
        const score = scores[oldUsername];
        scores[newUsername] = score;
        delete scores[oldUsername];
    }

    // Update users object if necessary
    Object.keys(users).forEach(key => {
        if (users[key].username === oldUsername) {
            users[key].username = newUsername;
        }
    });

    // Invalidate leaderboard cache
    cachedLeaderboard = null;

    res.json({ 
        success: true, 
        message: "Username updated successfully" 
    });
});

// Periodic monitoring logs
const monitoringInterval = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
    const rssMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);

    console.log(`\n=== Server Monitoring [${new Date().toISOString()}] ===`);
    console.log(`Memory Usage:`);
    console.log(`- RSS: ${rssMB}MB`);
    console.log(`- Heap Used: ${heapUsedMB}MB`);
    console.log(`- Heap Total: ${heapTotalMB}MB`);
    console.log(`Active Users: ${Object.keys(users).length}`);
    console.log(`Request Count: ${requestCount}`);
    console.log(`Uptime: ${((Date.now() - startTime) / 1000 / 60).toFixed(2)} minutes`);
    console.log(`CPU Load Avg: ${os.loadavg().map(load => load.toFixed(2))}`);
    console.log('=====================================\n');
}, 60000); // Log every minute

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error:`, err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    clearInterval(monitoringInterval);
    // Add any cleanup code here
    process.exit(0);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
    console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
    // Optionally implement notification system here
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
    // Optionally implement notification system here
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
    console.log('Server monitoring active. Check logs for periodic updates.');
});