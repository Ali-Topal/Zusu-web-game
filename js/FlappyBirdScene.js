import assets from './assets.js';
import FlappyBird from './FlappyBird.js';

class FlappyBirdScene extends Phaser.Scene {
	constructor() {
		super("FlappyBird");
	}

	preload() {
		let game = this;

		this.load.audio('backgroundMusic', 'assets/background-music.mp3');
		this.load.audio('flapSound', 'assets/flap.mp3');
		this.load.audio('hitSound', 'assets/hit.mp3');
		this.load.audio('pointSound', 'assets/point.mp3');

		// scene assets
		this.load.image(assets.scene.background.day, 'assets/background-day.png');
		this.load.image(assets.scene.background.night, 'assets/background-night.png');
		this.load.spritesheet(assets.scene.ground, 'assets/ground-sprite.png', {
			frameWidth: 672, // Doubled from 336
			frameHeight: 320 // Doubled from 160
		});

		this.load.image(assets.scene.startGame, 'assets/startgame.png');
		this.load.image(assets.scene.gameOver, 'assets/gameover.png');
		this.load.image(assets.scene.restartGame, 'assets/restart-button.png');
		this.load.image(assets.scene.leaderboardButtonGameOver, 'assets/leaderboard-button-game-over.png');

		[assets.obstacle.pipe.green, assets.obstacle.pipe.red].forEach(function (pipe) {
			game.load.image(pipe.top, `assets/${pipe.top}.png`);
			game.load.image(pipe.bottom, `assets/${pipe.bottom}.png`);
		});

		Object.keys(assets.bird).forEach(function (key) {
			let bird = assets.bird[key].name;
			game.load.spritesheet(bird, `assets/${bird}-sprite.png`, {
				frameWidth: 84, //bird sprite size
				frameHeight: 84 //bird sprite size
			});
		});
		this.load.image(assets.scoreboard.score, 'assets/score.png');
	}

	create() {
		let game = this;

		this.username = localStorage.getItem('flappyUsername');
    	if (!this.username) {
        	this.generateUsername();
    	}
	
		// Add a flag to track leaderboard visibility
		this.isLeaderboardVisible = false;
	
		// Create the leaderboard button after game over (initially hidden)
		this.leaderboardButtonGameOver = this.add.image(assets.scene.width * 2, 650, assets.scene.leaderboardButtonGameOver).setInteractive();
		this.leaderboardButtonGameOver.setScale(2); 
		this.leaderboardButtonGameOver.setDepth(100);
		this.leaderboardButtonGameOver.visible = false;
		this.leaderboardButtonGameOver.on('pointerdown', () => {
			this.toggleLeaderboard();
		});
	
		// Set the range for active users (matching server constraints)
		this.minUsers = 100;
		this.maxUsers = 500;
	
		// Create a text object to display the active user count
		this.activeUsersText = this.add.text(180, 0, 'Active Players: 0', {
			fontFamily: 'Arial',
			fontSize: '24px', 
			fill: '#ffffff',
			stroke: '#000',
			strokeThickness: 8, 
			strokeLinecap: 'square',
			shadow: {
				offsetX: 5, 
				offsetY: 6, 
				color: '#000',
				blur: 0,
				stroke: true,
				fill: true
			}
		});
	
		this.activeUsersText.setDepth(80);
	
		// Function to fetch active users from the server
		this.fetchActiveUsers = async () => {
			try {
				const response = await fetch('https://zusu.xyz/api/active-users');
				const data = await response.json();
				this.activeUsersText.setText(`Active Players: ${data.activeUsers}`);
			} catch (error) {
				console.error('Error fetching active users:', error);
			}
		};
	
		// Function to update server with random user count changes
		this.updateActiveUsers = async () => {
			try {
				const change = Phaser.Math.Between(-2, 2);
				
				const response = await fetch('https://zusu.xyz/api/update-active-users', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ change })
				});
				
				const data = await response.json();
				if (data.success) {
					this.activeUsersText.setText(`Active Players: ${data.activeUsers}`);
				}
			} catch (error) {
				console.error('Error updating active users:', error);
			}
		};
	
		// Initially fetch the active users count
		this.fetchActiveUsers();
	
		// Periodically update the active users count every 5 seconds
		this.time.addEvent({
			delay: 5000,
			callback: this.updateActiveUsers,
			callbackScope: this,
			loop: true
		});
	
		// Play background music with looping enabled and volume set to 50%
		this.backgroundMusic = this.sound.add('backgroundMusic', {
			volume: 0.5,
			loop: true 
		});
	
		// Wait for user interaction to start the music
		this.input.once('pointerdown', () => {
			this.backgroundMusic.play();
			console.log('Background music started after user interaction');
		});
	
		// Handle tab visibility change
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				if (!this.backgroundMusic.isPlaying) {
					this.backgroundMusic.play();
				}
			}
		});
	
		// Create a group for the backgrounds
		this.backgroundGroup = this.add.group();
	
		// Create multiple background instances that will scroll
		this.backgrounds = [];
		const bgWidth = this.textures.get(assets.scene.background.day).getSourceImage().width;
	
		// Create two pairs of backgrounds (day and night)
		for (let i = 0; i < 2; i++) {
			// Create day background
			const bgDay = this.add.image(i * bgWidth, 360, assets.scene.background.day);
			bgDay.setOrigin(0, 0.5);
			this.backgrounds.push(bgDay);
			this.backgroundGroup.add(bgDay);
	
			// Create night background
			const bgNight = this.add.image((i + 2) * bgWidth, 360, assets.scene.background.night);
			bgNight.setOrigin(0, 0.5);
			this.backgrounds.push(bgNight);
			this.backgroundGroup.add(bgNight);
		}
	
		// Set background scroll speed
		this.backgroundScrollSpeed = 0.5;
	
		this.gaps = this.physics.add.group();
		this.pipes = this.physics.add.group();
	
		// birds animation
		Object.keys(assets.bird).forEach(function (key) {
			game.anims.create({
				key: assets.bird[key].clapWings,
				frames: game.anims.generateFrameNumbers(assets.bird[key].name, {
					start: 0,
					end: 2
				}),
				frameRate: 8,
				repeat: -1
			});
	
			game.anims.create({
				key: assets.bird[key].stop,
				frames: [{
					key: assets.bird[key].name,
					frame: 1
				}],
				frameRate: 20
			});
		});
	
		// ground 
		this.ground = this.physics.add.sprite(assets.scene.width * 2, 936, assets.scene.ground);
		this.ground.setCollideWorldBounds(true);
		this.ground.setDepth(20);
		this.ground.setSize(0, 300, 0, 0).setOffset(0, 8);
	
		this.anims.create({
			key: assets.animation.ground.moving,
			frames: this.anims.generateFrameNumbers(assets.scene.ground, {
				start: 0,
				end: 2
			}),
			frameRate: 15,
			repeat: -1
		});
	
		this.anims.create({
			key: assets.animation.ground.moving,
			frames: [{
				key: assets.scene.ground,
				frame: 0
			}],
			frameRate: 20
		});
	
		// start, over, repeat
		this.start = this.add.image(assets.scene.width * 2, 312, assets.scene.startGame);
		this.start.setScale(2);
		this.start.setDepth(30);
		this.start.visible = false;
	
		this.gameOver = this.add.image(assets.scene.width * 2, 140, assets.scene.gameOver);
		this.gameOver.setScale(2);
		this.gameOver.setDepth(20);
		this.gameOver.visible = false;
	
		this.restart = this.add.image(assets.scene.width * 2, 560, assets.scene.restartGame).setInteractive();
		this.restart.setScale(2);
		this.restart.setDepth(20);
		this.restart.visible = false;
		this.restart.on('pointerdown', () => this.restartGame(this));
	
		this.scoreboard = this.add.image(assets.scene.width * 2, 360, assets.scoreboard.score);
		this.scoreboard.scale = 1;
		this.scoreboard.setDepth(30);
	
		this.scoreTxt = this.add.text(assets.scene.width * 2, 80, '0', {
			fontFamily: 'font1',
			fontSize: '76px',
			fill: '#fff',
			stroke: '#000',
			strokeThickness: 8,
			strokeLinecap: 'square',
			shadow: {
				offsetX: 5,
				offsetY: 6,
				color: '#000',
				blur: 0,
				stroke: true,
				fill: true
			}
		});
		this.scoreTxt.setDepth(30);
		this.scoreTxt.setOrigin(0.5);
		this.scoreTxt.alpha = 0;
	
		this.scored = this.add.text(assets.scene.width * 2 + 2, 340, '0', { //340
			fontFamily: 'font1',
			fontSize: '48px',  //36px
			fill: '#fff',
			stroke: '#000',
			strokeThickness: 6,
		});
		this.scored.setDepth(30);
		this.scored.setOrigin(0.5);
	
		this.bestScore = this.add.text(assets.scene.width * 2 + 2, 460, '0', { //420
			fontFamily: 'font1',
			fontSize: '48px',
			fill: '#fff',
			stroke: '#000',
			strokeThickness: 6,
		});
		this.bestScore.setDepth(30);
		this.bestScore.setOrigin(0.5, 0.5);
	
		this.initGame();
	}

	// Add a method to handle background scrolling
	scrollBackgrounds() {
		if (!this.hasGameStarted || this.isGameOver) return;

		// Move each background
		for (let bg of this.backgrounds) {
			bg.x -= this.backgroundScrollSpeed;

			// Get the width of the current background
			const width = bg.width;

			// If the background has moved completely off screen to the left
			if (bg.x <= -width) {
				// Find the rightmost background
				let rightmostX = -Infinity;
				for (let other of this.backgrounds) {
					rightmostX = Math.max(rightmostX, other.x);
				}
				// Place this background right after the rightmost one
				bg.x = rightmostX + width;
			}
		}
	}

	generateUsername() {
		const generateNumber = () => {
			return Math.floor(10000 + Math.random() * 90000).toString();
		};
	
		const username = `User${generateNumber()}`;
		this.username = username;
		localStorage.setItem('flappyUsername', username);
	}

	updateActiveUsers() {
		// Fetch the active users count from the server
		fetch('https://zusu.xyz/api/active-users')
			.then(response => response.json())
			.then(data => {
				// Update the active users count text on the screen
				this.currentUsers = data.activeUsers;
				this.activeUsersText.setText(`Active Players: ${this.currentUsers}`);
			})
			.catch(error => {
				console.error('Error fetching active users:', error);
			});
	}

	toggleLeaderboard() {
		// Toggle the leaderboard visibility
		if (this.isLeaderboardVisible) {
			// If the leaderboard is visible, hide it
			this.hideLeaderboard();
		} else {
			// If the leaderboard is not visible, fetch and show it
			this.showLeaderboard();
		}
	}

	showLeaderboard() {
		// Fetch the leaderboard data from the server
		fetch('https://zusu.xyz/api/leaderboard')
			.then(response => response.json())
			.then(data => {
				console.log('Leaderboard:', data.leaderboard);
				this.displayLeaderboard(data.leaderboard);
				// Disable the restart button when the leaderboard is shown
				this.restart.disableInteractive();
			})
			.catch(error => {
				console.error('Error fetching leaderboard:', error);
			});
	}

	hideLeaderboard() {
		this.isLeaderboardVisible = false;
	
		// Destroy the leaderboard backdrop
		if (this.leaderboardBackdrop) {
			this.leaderboardBackdrop.destroy();
			this.leaderboardBackdrop = null;
		}
	
		// Destroy the header text
		if (this.headerText) {
			this.headerText.destroy();
			this.headerText = null;
		}
	
		// Destroy all score texts
		if (this.scoreTexts) {
			this.scoreTexts.forEach(text => text.destroy());
			this.scoreTexts = [];
		}
	
		// Destroy separator line if it exists
		if (this.separatorLine) {
			this.separatorLine.destroy();
			this.separatorLine = null;
		}
	
		// Destroy user score text if it exists
		if (this.userScoreText) {
			this.userScoreText.destroy();
			this.userScoreText = null;
		}
	
		// Re-enable the restart button
		this.restart.setInteractive();
	}
	
	displayLeaderboard(leaderboard) {
		this.isLeaderboardVisible = true;
	
		// Create backdrop
		this.leaderboardBackdrop = this.add.graphics();
		this.leaderboardBackdrop.fillStyle(0x000000, 0.8);
		this.leaderboardBackdrop.fillRect(0, 0, this.sys.game.config.width, 720);
		this.leaderboardBackdrop.setDepth(99);
	
		// Initialize array to store score texts
		this.scoreTexts = [];
	
		// Create header text
		this.headerText = this.add.text(this.sys.game.config.width / 2, 200, 'TOP SCORES', {
			fontFamily: 'font1',
			fontSize: '48px',
			fill: '#fff',
			stroke: '#000',
			strokeThickness: 8
		}).setOrigin(0.5).setDepth(100);
	
		// Find current user's position and score
		const currentUserEntry = leaderboard.find(entry => entry.username === this.username);
		const currentUserPosition = leaderboard.findIndex(entry => entry.username === this.username) + 1;
	
		// Display top 5 scores
		let yPosition = 280;
		const entrySpacing = 50;
	
		// Show top 5 scores
		leaderboard.slice(0, 5).forEach((entry, index) => {
			const isCurrentUser = entry.username === this.username;
			const textColor = isCurrentUser ? '#FFD700' : '#FFFFFF';
	
			const scoreText = this.add.text(
				this.sys.game.config.width / 2,
				yPosition + (index * entrySpacing),
				`${index + 1}. ${entry.username}: ${entry.score}`,
				{
					fontFamily: 'font1',
					fontSize: '36px',
					fill: textColor,
					stroke: '#000',
					strokeThickness: 8
				}
			).setOrigin(0.5).setDepth(100);
	
			this.scoreTexts.push(scoreText);
		});
	
		// If current user is not in top 5 but has a score, show their score below
		if (currentUserEntry && currentUserPosition > 5) {
			// Add separator line
			this.separatorLine = this.add.graphics();
			this.separatorLine.lineStyle(2, 0xFFFFFF, 1);
			this.separatorLine.lineBetween(
				this.sys.game.config.width / 2 - 200,
				yPosition + (5 * entrySpacing),
				this.sys.game.config.width / 2 + 200,
				yPosition + (5 * entrySpacing)
			).setDepth(100);
	
			// Add user's score below separator
			this.userScoreText = this.add.text(
				this.sys.game.config.width / 2,
				yPosition + (5.5 * entrySpacing),
				`${currentUserPosition}. ${currentUserEntry.username}: ${currentUserEntry.score}`,
				{
					fontFamily: 'font1',
					fontSize: '36px',
					fill: '#00FF00',
					stroke: '#000',
					strokeThickness: 8
				}
			).setOrigin(0.5).setDepth(100);
		}
	}

	update(time, delta) {
		if (this.isGameOver) return;
		if (!this.hasGameStarted) return;

		this.scrollBackgrounds();

		// Restrict the bird from flying above the screen
		if (this.flappyBird.y <= 40) {
			this.flappyBird.y = 40; 
		}

		this.flappyBird.falls();

		this.pipes.children.iterate(function (pipe) {
			if (pipe == undefined) return;
			if (pipe.x < -100) pipe.destroy();
			else pipe.setVelocityX(-170); ///////////////////////
		});

		this.gaps.children.iterate(function (gap) {
			gap.body.setVelocityX(-170);//////////////////////////
		});

		this.nextPipes++;

		if (this.nextPipes === 150) { ///////////////////////////
			this.makePipes();
			this.nextPipes = 0;
		}
	}

	initGame() {
		this.nextPipes = 0;
		this.score = 0;
		this.isGameOver = false;
		this.currentPipe = assets.obstacle.pipe.green;

		this.start.visible = true;
		this.gameOver.visible = false;
		this.scoreboard.visible = false;
		this.scored.visible = false;
		this.bestScore.visible = false;
		this.backgrounds.forEach(bg => {
			bg.visible = true;
		});
		this.currentPipe = assets.obstacle.pipe.green;
		this.flappyBird = new FlappyBird(this, 120, 400);
		// Set custom size for the bird's hitbox (width, height)
		this.flappyBird.body.setSize(64, 64);  // These are default dimensions, adjust them as needed
		// Set an offset for the hitbox (x, y), useful if the sprite has padding or transparent areas
		this.flappyBird.body.setOffset(10, 16);  // Adjust the offset as needed

		// controls: works for mobile too
		this.input.on('pointerdown', function () {
			console.log("Pointer down event received!");
			this.flapBird();
		}, this);

		this.physics.add.collider(this.flappyBird, this.ground, this.hitBird, null, this);
		this.physics.add.overlap(this.flappyBird, this.pipes, this.hitBird, null, this);
		this.physics.add.overlap(this.flappyBird, this.gaps, this.updateScore, null, this);
		this.ground.anims.play(assets.animation.ground.moving, true);
	}

	flapBird() {
		if (this.isGameOver) return;
		if (!this.hasGameStarted) this.startGame();
		this.flappyBird.flap();
		this.sound.play('flapSound', { volume: 0.2 });
	}

	saveScore() {
		let bestScore = parseInt(localStorage.getItem('bestScore'));
		if (bestScore) {
			localStorage.setItem('bestScore', Math.max(this.score, bestScore));
			this.bestScore.setText(bestScore);
		} else {
			localStorage.setItem('bestScore', this.score);
			this.bestScore.setText(0);
		}
		this.scored.setText(this.score);
		this.scored.visible = true;
		this.bestScore.visible = true;
	}

	hitBird() {
		// Check if the death sound has already been played
        if (!this.hasPlayedDeathSound) {
            this.sound.play('hitSound', { volume: 0.4 });
            this.hasPlayedDeathSound = true; 

			// Submit the score to the server
			fetch('https://zusu.xyz/api/submit-score', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ username: this.username, score: this.score })
			})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					console.log('Score submitted successfully:', this.score);
				}
			})
			.catch(error => console.error('Error submitting score:', error));
        }
		// stop the pipes
		this.pipes.children.iterate(function (pipe) {
			if (pipe == undefined) return;
			pipe.setVelocityX(0);
		});

		// Stop background scrolling by setting game over flag
		this.isGameOver = true;
		this.hasGameStarted = false;
		

		this.leaderboardButtonGameOver.visible = true;
		this.saveScore();
		this.isGameOver = true;
		this.scoreboard.visible = true;
		this.hasGameStarted = false;
		this.flappyBird.die();
		this.ground.anims.stop(assets.animation.ground.moving, true);
		this.gameOver.visible = true;
		this.restart.visible = true;
		this.scoreTxt.setText('');
	}

	restartGame(scene) {
		// Hide leaderboard button
		scene.leaderboardButtonGameOver.visible = false;
		
		// Reset death sound flag
		this.hasPlayedDeathSound = false;
		
		// Clear existing game elements
		scene.pipes.clear(true, true);
		scene.gaps.clear(true, true);
		scene.flappyBird.destroy();
		
		// Hide UI elements
		scene.gameOver.visible = false;
		scene.scoreboard.visible = false;
		scene.restart.visible = false;
		
		// Reset score
		scene.scoreTxt.setText('0');
		
		// Reset background positions
		const bgWidth = this.textures.get(assets.scene.background.day).getSourceImage().width;
		this.backgrounds.forEach((bg, index) => {
			if (index < 2) { // First two are day backgrounds
				bg.x = (index % 2) * bgWidth;
			} else { // Last two are night backgrounds
				bg.x = ((index % 2) + 2) * bgWidth;
			}
		});
	
		// Reset scrolling speed
		this.backgroundScrollSpeed = 0.5;
		
		// Hide leaderboard if it's visible
		if (this.isLeaderboardVisible) {
			this.hideLeaderboard();
		}
		
		// Reset any active timers or events if necessary
		
		// Re-initialize the game
		scene.initGame();
	}

	updateScore(_, gap) {
		this.score++;
		gap.destroy();

		if (this.score == 20) {
				this.currentPipe = assets.obstacle.pipe.red;
		}
		
		setTimeout(() => {
			this.sound.play('pointSound', { volume: 0.2 });
			this.scoreTxt.setText(this.score);
		}, 400);
	}

	startGame() {
		this.scoreTxt.alpha = 1;
		this.hasGameStarted = true;
		this.start.visible = false;
		this.makePipes();
	}

	makePipes() {
		if (!this.hasGameStarted) return;
		if (this.isGameOver) return;

		const top = Phaser.Math.Between(-200, 30); //adjust maximum deviation from centre
		const gap = this.add.line(600, top + 425, 0, 0, 0, 210); //gap between pipes hitbox
		this.gaps.add(gap);
		gap.body.allowGravity = false;
		gap.visible = false;

		const pipeTop = this.pipes.create(650, top, this.currentPipe.top).setImmovable(true);
		pipeTop.body.allowGravity = false;

		const pipeBottom = this.pipes.create(650, top + 850, this.currentPipe.bottom).setImmovable(true); //adjust gap between pipes
		pipeBottom.body.allowGravity = false;
	}
}

export default FlappyBirdScene;
