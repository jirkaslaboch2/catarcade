const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const statusMessageElement = document.getElementById("status-message");

const state = {
    running: false,
    gameOver: false,
    score: 0,
    bestScore: Number.parseInt(window.localStorage.getItem("flappy-flask-best") || "0", 10),
    groundOffset: 0,
    bird: {
        x: 110,
        y: 260,
        velocity: 0,
        radius: 18,
        gravity: 0.42,
        lift: -7.6,
        maxFall: 10,
    },
    pipes: [],
    spawnTimer: 0,
    spawnInterval: 92,
};

const world = {
    width: canvas.width,
    height: canvas.height,
    groundHeight: 118,
    pipeWidth: 74,
    pipeGap: 172,
    pipeSpeed: 2.8,
    cloudBands: [
        { y: 88, speed: 0.12, size: 38 },
        { y: 150, speed: 0.22, size: 30 },
        { y: 226, speed: 0.16, size: 26 },
    ],
};

bestScoreElement.textContent = String(state.bestScore);

function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.groundOffset = 0;
    state.spawnTimer = 0;
    state.pipes = [];
    state.bird.y = world.height * 0.4;
    state.bird.velocity = 0;
    scoreElement.textContent = "0";
    statusMessageElement.textContent = "Press space to launch.";
}

function startGame() {
    if (state.gameOver) {
        resetGame();
    }

    if (!state.running) {
        state.running = true;
        statusMessageElement.textContent = "Thread the gaps. Stay off the pipes.";
    }

    flap();
}

function flap() {
    state.bird.velocity = state.bird.lift;
}

function update() {
    if (!state.running || state.gameOver) {
        return;
    }

    state.spawnTimer += 1;
    state.groundOffset = (state.groundOffset + world.pipeSpeed) % 32;

    if (state.spawnTimer >= state.spawnInterval) {
        state.spawnTimer = 0;
        spawnPipe();
    }

    state.bird.velocity = Math.min(state.bird.velocity + state.bird.gravity, state.bird.maxFall);
    state.bird.y += state.bird.velocity;

    for (const pipe of state.pipes) {
        pipe.x -= world.pipeSpeed;

        if (!pipe.passed && pipe.x + world.pipeWidth < state.bird.x) {
            pipe.passed = true;
            state.score += 1;
            scoreElement.textContent = String(state.score);
        }
    }

    state.pipes = state.pipes.filter((pipe) => pipe.x + world.pipeWidth > -10);

    if (hitsBounds() || hitsPipe()) {
        endGame();
    }
}

function spawnPipe() {
    const minTop = 90;
    const maxTop = world.height - world.groundHeight - world.pipeGap - 90;
    const gapTop = randomBetween(minTop, maxTop);

    state.pipes.push({
        x: world.width + 24,
        topHeight: gapTop,
        bottomY: gapTop + world.pipeGap,
        passed: false,
    });
}

function hitsBounds() {
    return state.bird.y - state.bird.radius <= 0 || state.bird.y + state.bird.radius >= world.height - world.groundHeight;
}

function hitsPipe() {
    return state.pipes.some((pipe) => {
        const withinPipeX = state.bird.x + state.bird.radius > pipe.x && state.bird.x - state.bird.radius < pipe.x + world.pipeWidth;

        if (!withinPipeX) {
            return false;
        }

        const hitsTop = state.bird.y - state.bird.radius < pipe.topHeight;
        const hitsBottom = state.bird.y + state.bird.radius > pipe.bottomY;
        return hitsTop || hitsBottom;
    });
}

function endGame() {
    state.gameOver = true;
    state.running = false;
    state.bestScore = Math.max(state.bestScore, state.score);
    window.localStorage.setItem("flappy-flask-best", String(state.bestScore));
    bestScoreElement.textContent = String(state.bestScore);
    statusMessageElement.textContent = "Crash. Press R to reset or flap to try again.";
}

function draw() {
    drawSky();
    drawSun();
    drawClouds();
    drawPipes();
    drawGround();
    drawBird();

    if (!state.running && !state.gameOver) {
        drawOverlay("Tap to begin", "Space, click, or tap to flap");
    }

    if (state.gameOver) {
        drawOverlay("You crashed", `Score ${state.score}  Best ${state.bestScore}`);
    }
}

function drawSky() {
    const gradient = context.createLinearGradient(0, 0, 0, world.height);
    gradient.addColorStop(0, "#9be7ff");
    gradient.addColorStop(0.55, "#5cced6");
    gradient.addColorStop(1, "#2d998f");
    context.fillStyle = gradient;
    context.fillRect(0, 0, world.width, world.height);
}

function drawSun() {
    context.save();
    context.fillStyle = "rgba(255, 238, 173, 0.88)";
    context.beginPath();
    context.arc(world.width - 82, 90, 34, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

function drawClouds() {
    context.save();
    context.fillStyle = "rgba(255, 255, 255, 0.78)";

    for (const band of world.cloudBands) {
        for (let index = 0; index < 4; index += 1) {
            const x = ((index * 150) + (performance.now() * band.speed)) % (world.width + 120) - 60;
            drawCloud(x, band.y + (index % 2) * 12, band.size);
        }
    }

    context.restore();
}

function drawCloud(x, y, size) {
    context.beginPath();
    context.arc(x, y, size * 0.52, Math.PI * 0.5, Math.PI * 1.5);
    context.arc(x + size * 0.52, y - size * 0.36, size * 0.46, Math.PI, Math.PI * 1.9);
    context.arc(x + size, y, size * 0.52, Math.PI * 1.5, Math.PI * 0.5);
    context.closePath();
    context.fill();
}

function drawPipes() {
    for (const pipe of state.pipes) {
        drawPipe(pipe.x, 0, pipe.topHeight, true);
        drawPipe(pipe.x, pipe.bottomY, world.height - world.groundHeight - pipe.bottomY, false);
    }
}

function drawPipe(x, y, height, flipCap) {
    context.save();
    const pipeGradient = context.createLinearGradient(x, y, x + world.pipeWidth, y);
    pipeGradient.addColorStop(0, "#1d6f42");
    pipeGradient.addColorStop(0.55, "#37a35f");
    pipeGradient.addColorStop(1, "#195b37");
    context.fillStyle = pipeGradient;
    context.fillRect(x, y, world.pipeWidth, height);

    context.fillStyle = "#7cd992";
    const capY = flipCap ? height - 22 : y;
    context.fillRect(x - 6, capY, world.pipeWidth + 12, 22);

    context.fillStyle = "rgba(255, 255, 255, 0.12)";
    context.fillRect(x + 8, y + 8, 10, Math.max(height - 16, 0));
    context.restore();
}

function drawGround() {
    const groundTop = world.height - world.groundHeight;
    const dirtGradient = context.createLinearGradient(0, groundTop, 0, world.height);
    dirtGradient.addColorStop(0, "#8a5a44");
    dirtGradient.addColorStop(1, "#5b3a29");

    context.fillStyle = "#8ed081";
    context.fillRect(0, groundTop - 18, world.width, 18);

    context.fillStyle = dirtGradient;
    context.fillRect(0, groundTop, world.width, world.groundHeight);

    context.strokeStyle = "rgba(44, 95, 49, 0.6)";
    context.lineWidth = 4;
    for (let x = -32 + state.groundOffset; x < world.width + 32; x += 32) {
        context.beginPath();
        context.moveTo(x, groundTop - 18);
        context.lineTo(x + 16, groundTop);
        context.stroke();
    }
}

function drawBird() {
    context.save();
    context.translate(state.bird.x, state.bird.y);
    context.rotate(Math.max(-0.35, Math.min(1.0, state.bird.velocity * 0.05)));

    context.fillStyle = "#ffca3a";
    context.beginPath();
    context.arc(0, 0, state.bird.radius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#f79824";
    context.beginPath();
    context.ellipse(-4, 4, 11, 8, 0.35, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ff7b00";
    context.beginPath();
    context.moveTo(16, 2);
    context.lineTo(30, 8);
    context.lineTo(16, 13);
    context.closePath();
    context.fill();

    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(7, -7, 6.5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#172026";
    context.beginPath();
    context.arc(9, -7, 2.5, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#d97706";
    context.lineWidth = 5;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-6, 0);
    context.quadraticCurveTo(-18, -12 - state.bird.velocity, -12, 12);
    context.stroke();
    context.restore();
}

function drawOverlay(title, subtitle) {
    context.save();
    context.fillStyle = "rgba(6, 19, 33, 0.45)";
    context.fillRect(18, 20, world.width - 36, world.height - 56);

    context.fillStyle = "rgba(12, 24, 39, 0.8)";
    roundRect(52, 190, world.width - 104, 180, 24);
    context.fill();

    context.textAlign = "center";
    context.fillStyle = "#f4f1e8";
    context.font = "700 34px Syne";
    context.fillText(title, world.width / 2, 258);
    context.fillStyle = "#c8d7e2";
    context.font = "400 16px Space Mono";
    context.fillText(subtitle, world.width / 2, 296);
    context.restore();
}

function roundRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function loop() {
    update();
    draw();
    window.requestAnimationFrame(loop);
}

function handleInput(event) {
    if (event) {
        event.preventDefault();
    }

    startGame();
}

window.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "ArrowUp") {
        handleInput(event);
    }

    if (event.code === "KeyR") {
        resetGame();
    }
});

canvas.addEventListener("pointerdown", handleInput);

resetGame();
window.requestAnimationFrame(loop);