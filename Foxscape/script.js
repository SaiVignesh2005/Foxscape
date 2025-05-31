const canvas = document.getElementById('canvasFox');
const ctx = canvas.getContext('2d');

const width = canvas.width = 600;
const height = canvas.height = 600;
const spriteWidth = 575;
const spriteHeight = 523;
const slownessFactor = 5;
let gameFrame = 0;
let playerState = 'run';
let isGameOver = false;

let hasStarted = false;
window.addEventListener('click', () => {
    if (!hasStarted) {
        hasStarted = true;
        isAnimating = true;
        animate();
    }
});

const foxImage = new Image();
foxImage.src = 'assets/fox.png';

const spriteAnimations = [];
const animationStates = [
    { name: 'idle', frames: 7 },
    { name: 'jump', frames: 7 },
    { name: 'fall', frames: 7 },
    { name: 'run', frames: 9 },
    { name: 'dizzy', frames: 11 },
    { name: 'sit', frames: 5 },
    { name: 'roll', frames: 7 },
    { name: 'bite', frames: 7 },
    { name: 'ko', frames: 12 },
    { name: 'getHit', frames: 4 }
];

const layerFiles = [
    { src: 'assets/layer-1.png', name: 'layer1', speed: 0.2 },
    { src: 'assets/layer-2.png', name: 'layer2', speed: 0.4 },
    { src: 'assets/layer-3.png', name: 'layer3', speed: 0.6 },
    //{src : 'assets/layer-4.png', name: 'layer4' , speed : 0.8},
    { src: 'assets/layer-5.png', name: 'layer5', speed: 1.0 }
];

const obstacles = [
    { src: 'assets/trunk.png', name: 'trunk', speed: 2, scored: false, width: 60, height: 60 },
    { src: 'assets/bigTrunk.png', name: 'bigTrunk', speed: 2, scored: false, width: 60, height: 240 },
    { src: 'assets/spike.png', name: 'spike', speed: 2, scored: false, width: 60, height: 60 }
];

let activeObstacles = [];

function getRandomTime(min, max) {
    return Math.random() * (max - min) + min;
}

let nextObstacleTime = Date.now() + getRandomTime(1000, 2000);
let nextBigTrunkTime = Date.now() + getRandomTime(10000, 15000);

let gameOverTime = 0;
const restartDelay = 1000;

function spawnRandomObstacle() {
    const currentTime = Date.now();

    if (currentTime < nextObstacleTime) return;

    let possibleObstacles = ['trunk', 'spike'];
    if (currentTime > nextBigTrunkTime) {
        possibleObstacles.push('bigTrunk');
    }

    const randomObstacleName = possibleObstacles[Math.floor(Math.random() * possibleObstacles.length)];

    if (randomObstacleName === 'bigTrunk') {
        nextBigTrunkTime = currentTime + getRandomTime(10000, 12000);
    }
    nextObstacleTime = currentTime + getRandomTime(1500, 6000);

    const img = new Image();
    img.src = obstacles.find(obstacle => obstacle.name === randomObstacleName).src;
    const obstacleWidth = obstacles.find(obstacle => obstacle.name === randomObstacleName).width;
    const obstacleHeight = obstacles.find(obstacle => obstacle.name === randomObstacleName).height;

    activeObstacles.push({
        name: randomObstacleName,
        img: img,
        x: width,
        y: height - obstacleHeight - 100,
        speed: obstacles.find(obstacle => obstacle.name === randomObstacleName).speed,
        width: obstacleWidth,
        height: obstacleHeight
    });

    console.log(`Spawned obstacle: ${randomObstacleName}`);
}

const layers = layerFiles.map(layer => {
    const img = new Image();
    img.src = layer.src;
    return {
        img: img,
        name: layer.name,
        speed: layer.speed,
        x: 0
    };
});

animationStates.forEach((state, index) => {
    let frames = {
        loc: []
    };
    for (let j = 0; j < state.frames; j++) {
        let positionX = j * spriteWidth;
        let positionY = index * spriteHeight;
        frames.loc.push({ x: positionX, y: positionY });
    }
    spriteAnimations[state.name] = frames;
});

function detectCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

const gravity = 0.5;
let y = 392;
let velocityY = 0;
let isJumping = false;

function jump() {
    if (!isJumping) {
        velocityY = -15;
        isJumping = true;
        playerState = 'jump';
    }
}

let isRolling = false;
let rollCooldown = false;
let cooldownRatio = 0;
const BASE_DEPLETION = 0.0015;

let rollTimeoutID = null;

function roll() {
    if (rollCooldown || isRolling) return;

    isRolling = true;
    playerState = 'roll';

    rollTimeoutID = setTimeout(() => {
        isRolling = false;
        playerState = 'run';

        rollCooldown = true;
        cooldownRatio = 1.0;
    }, 3000);
}

window.addEventListener('keydown', e => {
    if (e.key === 'p' && !isGameOver) {
        roll();
    }
});

let score = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
if (isNaN(highScore)) {
    highScore = 0;
}

let scoreText = document.createElement('div');
scoreText.style.position = "absolute";
scoreText.style.top = "40px";
scoreText.style.left = "50px";
scoreText.style.padding = "8px 16px";
scoreText.style.background = "rgba(0, 0, 0, 0.73)";
scoreText.style.color = "#fff";
scoreText.style.fontSize = "20px";
scoreText.style.fontFamily = "monospace";
scoreText.style.borderRadius = "8px";
scoreText.style.zIndex = "1000";
scoreText.innerHTML = `Score: 0<br> High Score: ${highScore}`;
document.body.appendChild(scoreText);

function update() {
    if (isRolling) {
        playerState = 'roll';
        let position = Math.floor((gameFrame / slownessFactor) % spriteAnimations['roll'].loc.length);
        let frameX = spriteWidth * position;
        let frameY = spriteAnimations['roll'].loc[position].y;
        ctx.drawImage(foxImage, frameX, frameY, spriteWidth, spriteHeight, 0, 392, spriteWidth * 0.2, spriteHeight * 0.2);
        return;
    } else if (isJumping) {
        velocityY += gravity;
        y += velocityY;

        if (velocityY < 0) playerState = 'jump';
        else if (velocityY > 0) playerState = 'fall';

        if (y >= 392) {
            y = 392;
            velocityY = 0;
            isJumping = false;
            playerState = 'run';
        }
    } else playerState = 'run';
}

window.addEventListener('keydown', e => {
    if (e.key === ' ') {
        if (isRolling && !isGameOver) {
            clearTimeout(rollTimeoutID);
            isRolling = false;
            playerState = 'jump';
            jump();
            rollCooldown = true;
            cooldownRatio = 0.5;
        } else {
            jump();
        }
    }
});

let isAnimating = false;

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Background layers
    layers.forEach((layer, index) => {
        if (isGameOver && layer.name === 'layer5') {
            ctx.drawImage(layer.img, layer.x, 0, width, height);
            ctx.drawImage(layer.img, layer.x + width, 0, width, height);
        } else {
            layer.x = (layer.x - layer.speed) % width;
            ctx.drawImage(layer.img, layer.x, 0, width, height);
            ctx.drawImage(layer.img, layer.x + width, 0, width, height);
        }
    });

    if (!isGameOver) {

        update();

        // Obstacles
        for (let i = activeObstacles.length - 1; i >= 0; i--) {
            let speedMultiplier = (playerState === 'jump' || playerState === 'fall') ? 1.9 : 1.2;
            const ob = activeObstacles[i];
            ob.x -= ob.speed * speedMultiplier;
            ctx.drawImage(ob.img, ob.x, ob.y, ob.width, ob.height);
            if (ob.x + ob.width < 0) {
                activeObstacles.splice(i, 1);
            }
        }

        if (!isRolling) {
            let position = Math.floor((gameFrame / slownessFactor) % spriteAnimations[playerState].loc.length);
            let frameX = spriteWidth * position;
            let frameY = spriteAnimations[playerState].loc[position].y;
            ctx.drawImage(foxImage, frameX, frameY, spriteWidth, spriteHeight, 0, y, spriteWidth * 0.2, spriteHeight * 0.2);
        }

        gameFrame++;

        const foxRect = {
            x: 2,
            y: y,
            width: spriteWidth * 0.2 - 17,
            height: spriteHeight * 0.2
        };

        for (let i = activeObstacles.length - 1; i >= 0; i--) {
            const ob = activeObstacles[i];
            if (detectCollision(foxRect, ob)) {
                if (isRolling) {
                    ob.scored = true;
                    score++;
                    scoreText.innerHTML = `Score: ${score}<br> High Score: ${highScore}`;
                    activeObstacles.splice(i, 1);
                    clearTimeout(rollTimeoutID);
                    isRolling = false;
                    playerState = 'run';
                    rollCooldown = true;
                    cooldownRatio = 1.0;
                } else {
                    if (score > highScore) {
                        highScore = score;
                        localStorage.setItem('highScore', highScore);
                    }
                    scoreText.innerHTML = `Score: ${score}<br> High Score: ${highScore}`;
                    score = 0;
                    // activeObstacles = [];
                    isGameOver = true;
                    gameOverTime = Date.now();
                    break;
                }
            }
        }

        if (!isGameOver) {
            spawnRandomObstacle();
        }

        if (rollCooldown) {
            let speedMultiplier = (playerState === 'jump' || playerState === 'fall') ? 1.9 : 1.2;
            cooldownRatio -= BASE_DEPLETION * speedMultiplier;
            if (cooldownRatio <= 0) {
                cooldownRatio = 0;
                rollCooldown = false;
            }

            const barWidth = 150;
            const barHeight = 15;
            const x = width - barWidth - 20;
            const yPos = 20;

            ctx.fillStyle = '#444';
            ctx.fillRect(x, yPos, barWidth, barHeight);

            ctx.fillStyle = '#0f0';
            ctx.fillRect(x, yPos, barWidth * cooldownRatio, barHeight);

            ctx.strokeStyle = '#000';
            ctx.strokeRect(x, yPos, barWidth, barHeight);
        }

        activeObstacles.forEach(ob => {
            if (!ob.scored && ob.x + ob.width - 15 < foxRect.x) {
                ob.scored = true;
                score++;
                scoreText.innerHTML = `Score: ${score}<br> High Score: ${highScore}`;
            }
        });

    } else {
        playerState = 'dizzy';

        let position = Math.floor((gameFrame / slownessFactor) % spriteAnimations['dizzy'].loc.length);
        let frameX = spriteWidth * position;
        let frameY = spriteAnimations['dizzy'].loc[position].y;

        layers.forEach(layer => {
            ctx.drawImage(layer.img, layer.x, 0, width, height);
            ctx.drawImage(layer.img, layer.x + width, 0, width, height);
        });

        ctx.drawImage(foxImage, frameX, frameY, spriteWidth, spriteHeight, 0, 392, spriteWidth * 0.2, spriteHeight * 0.2);

        activeObstacles.forEach(ob => {
            ctx.drawImage(ob.img, ob.x, ob.y, ob.width, ob.height);
        });

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', width / 2, height / 2 - 20);
        ctx.font = '24px Arial';
        ctx.fillText('Press space key to Restart', width / 2, height / 2 + 20);

        gameFrame++;

    }

    requestAnimationFrame(animate);
}


function drawIdleScreen() {
    ctx.clearRect(0, 0, width, height);

    layers.forEach(layer => {
        ctx.drawImage(layer.img, 0, 0, width, height);
    });

    const frame = spriteAnimations['idle'].loc[0];
    ctx.drawImage(
        foxImage,
        frame.x,
        frame.y,
        spriteWidth,
        spriteHeight,
        0,
        y,
        spriteWidth * 0.2,
        spriteHeight * 0.2
    );

    if (!hasStarted) {
        requestAnimationFrame(drawIdleScreen);
    }
}

drawIdleScreen();

window.addEventListener('keydown', function (e) {
    if (e.key == ' ' && isGameOver) {
        if (Date.now() - gameOverTime < restartDelay) return;
        isGameOver = false;
        gameFrame = 0;
        playerState = 'run';
        activeObstacles = [];
        y = 392;
        velocityY = 0;
        isJumping = false;

        isRolling = false;
        rollCooldown = false;
        cooldownRatio = 0;
        playerState = 'run';

        highScore = Math.max(highScore, score);
        localStorage.setItem('highScore', highScore);
        score = 0;
        scoreText.innerHTML = `Score: 0<br> High Score: ${highScore}`;
    }
});
