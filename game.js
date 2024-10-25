import FlappyBirdScene from './js/FlappyBirdScene.js';

// Debug to check if the game is loading
console.log("Game script is running.");

// Ensure that both the Phaser game and HTML buttons work correctly
window.onload = function() {
    // Debug to check if window.onload is triggered
    console.log("window.onload triggered");

    // Phaser Game Configuration
    var config = {
        type: Phaser.AUTO,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: {
                    y: 600
                },
                debug: false
            }
        },

        audio: {
            disableWebAudio: false  // Web Audio API is enabled
        },

        dom: {
            createContainer: true  // Enable DOM elements
        },

        scale: {
            mode: Phaser.Scale.FIT,
            parent: 'game-container',
            width: 576, // Game width
            height: 1024, // Game height
            autoCenter: Phaser.Scale.CENTER_BOTH,
            autoRound: true,
            expandParent: true,
            min: {
                width: 288,
                height: 512
            },
            max: {
                width: 768,
                height: 1366
            }
        },
        pixelArt: true,
        scene : [ FlappyBirdScene ],
        autoFocus: true,
        input: {
            activePointers: 2,
            touch: {
                capture: true,
                maxTouchPoints: 2
            }
        },
        // Key config for tab focus handling
        visibility: {
            activeWhenHidden: true  // This ensures the game and audio stay active when the tab loses focus
        }
    };

    // Debug to check if Phaser is initializing
    console.log("Initializing Phaser...");

    // Create Phaser game instance
    var game = new Phaser.Game(config);

    // Add click event listeners for the external HTML buttons
    addButtonClickListeners();
};

// Function to add event listeners to HTML buttons
function addButtonClickListeners() {
    // Debug to check if function is called
    console.log("Adding event listeners to buttons...");

    const button1 = document.getElementById('button1');
    const button2 = document.getElementById('button2');
    const button3 = document.getElementById('button3');
    const button4 = document.getElementById('button4');

    // Debugging: Check if buttons are found
    if (button1) {
        console.log("Button 1 found in DOM");
        button1.onclick = function() {
            console.log("Button 1 clicked");
            window.open('https://tenor.com/en-GB/view/two-black-people-gif-27160499', '_blank');  // Redirect to the first link
        };
    } else {
        console.error("Button 1 not found in DOM");
    }

    if (button2) {
        console.log("Button 2 found in DOM");
        button2.onclick = function() {
            console.log("Button 2 clicked");
            window.open('https://tenor.com/en-GB/view/two-black-people-gif-27160499', '_blank'); // Redirect to the second link
        };
    } else {
        console.error("Button 2 not found in DOM");
    }

    if (button3) {
        console.log("Button 3 found in DOM");
        button3.onclick = function() {
            console.log("Button 3 clicked");
            window.open('https://tenor.com/en-GB/view/two-black-people-gif-27160499', '_blank'); // Redirect to the second link
        };
    } else {
        console.error("Button 3 not found in DOM");
    }

    if (button4) {
        button4.onclick = async function () {
            console.log('Airdrop button clicked');

            // Prompt the user for their wallet address
            const walletAddress = prompt('Enter crypto wallet address to receive the airdrop:');

            if (walletAddress) {
                // Send the wallet address to the server to store and generate a username
                const response = await fetch('http://localhost:3000/api/airdrop', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ walletAddress }),
                });

                const data = await response.json();
                if (data.success) {
                    alert(`Thank you! Your unique username is: ${data.username}`);
                }
            }
        };
    }
}
