const assets = {
    bird: {
        red: { 
            name: 'bird-red',
            clapWings: 'red-clap-wings',
            stop: 'red-stop'
        },
        blue: {
            name: 'bird-blue',
            clapWings: 'blue-clap-wings',
            stop: 'blue-stop'
        },
        yellow: {
            name: 'bird-yellow',
            clapWings: 'yellow-clap-wings',
            stop: 'yellow-stop'
        }
    },
    obstacle: {
        pipe: {
            green: {
                top: 'pipe-green-top',
                bottom: 'pipe-green-bottom'
            },
            red: {
                top: 'pipe-red-top',
                bottom: 'pipe-red-bottom'
            }
        }
    },
    scene: {
        width: 144,
        background: {
            day: 'background-day',
            night: 'background-night'
        },
        ground: 'ground',
        gameOver: 'game-over',
        restartGame: 'restart-button',
        startGame: 'start-game',
        leaderboardButton: 'leaderboard-button', // Leaderboard button asset (top left)
        leaderboardButtonGameOver: 'leaderboard-button-game-over' // Leaderboard button after game over

    },
    scoreboard: {
        width: 25,
        base: 'number',
        score: 'score'
    },
    animation: {
        ground: {
            moving: 'moving-ground',
            stop: 'stop-ground'
        }
    },

    buttons: {
        button1: 'button1-image',
        button2: 'button2-image',   
        button3: 'button3-image',
        button4: 'button4-image'
    },
    
}

export default assets;