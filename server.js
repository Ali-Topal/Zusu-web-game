const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

// Use CORS to allow requests from your frontend
app.use(cors());

// Use BodyParser to parse JSON request bodies
app.use(bodyParser.json());

// Serve static files (e.g., your index.html, game files)
app.use(express.static(path.join('/var/www/flappy-bird')));


// Routes for serving the frontend (index.html)
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));

});

// In-memory storage (for now, can use a database later)
let activeUsers = 650; // Default number of active users
let users = {}; // Store wallet addresses and usernames
let scores = {}; // Store user high scores by their unique username

// API endpoint to get the current active users count
app.get('/api/active-users', (req, res) => {
    res.json({ activeUsers });
});

// API endpoint to update the active users count
app.post('/api/update-active-users', (req, res) => {
    const { change } = req.body;
    if (change) {
        activeUsers += change;

        // Ensure the active users count stays within a reasonable range
        if (activeUsers < 400) activeUsers = 400;
        if (activeUsers > 900) activeUsers = 900;

        res.json({ success: true, activeUsers });
    } else {
        res.status(400).json({ success: false, message: "Invalid request" });
    }
});

// API endpoint to store wallet address and generate a random username
app.post('/api/airdrop', (req, res) => {
    const { walletAddress } = req.body;

    // Generate a random username
    const username = `ZUSU${Math.floor(1000 + Math.random() * 9000)}`;

    // Store the wallet address and username
    users[walletAddress] = { username, walletAddress };
    
    res.json({ success: true, username });
});

// API endpoint to submit the user score
app.post('/api/submit-score', (req, res) => {
    const { username, score } = req.body;

    // Only update the score if it's higher than the existing score
    if (!scores[username] || score > scores[username]) {
        scores[username] = score;
    }

    res.json({ 
        success: true, 
        message: "Score submitted successfully",
        highScore: scores[username]  // Return the user's high score
    });
});

// API endpoint to retrieve leaderboard (top 5 scores)
app.get('/api/leaderboard', (req, res) => {
    // Sort users by score and return the top 5
    const leaderboard = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([username, score]) => ({ username, score }));

    res.json({ leaderboard });
});

// API endpoint to check username availability
app.post('/api/check-username', (req, res) => {
    const { username } = req.body;
    const isAvailable = !Object.values(users).some(user => user.username === username);
    res.json({ available: isAvailable });
});

// Start the server and listen on port 3000 or process.env.port
const port = process.env.port || 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
