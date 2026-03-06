const canvas = document.getElementById("driving-canvas");
const context = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const statusMessageElement = document.getElementById("status-message");

const BEST_KEY = "cat-dash-rally-best";
const ROAD_MARGIN = 54;
const ROAD_WIDTH = canvas.width - (ROAD_MARGIN * 2);
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
const PLAYER_Y = canvas.height - 148;
const SKYLINE = [
    { x: -8, width: 56, height: 130 },
    { x: 42, width: 40, height: 96 },
    { x: 76, width: 74, height: 160 },
    { x: 148, width: 52, height: 112 },
    { x: 194, width: 64, height: 182 },
    { x: 252, width: 48, height: 118 },
    { x: 296, width: 78, height: 150 },
    { x: 366, width: 60, height: 104 },
];
const TRAFFIC_COLORS = ["#ff6f59", "#6ee7ff", "#f6bd60", "#84dcc6", "#f28482", "#9b89ff"];
const TRAFFIC_ACCENTS = ["#ffe7d6", "#d9faff", "#fff1c9", "#d8fff5", "#ffe1e1", "#f2ecff"];

const state = {
    running: false,
    gameOver: false,
    score: 0,
    bestScore: Number.parseInt(window.localStorage.getItem(BEST_KEY) || "0", 10),
    speed: 5.2,
    roadOffset: 0,
    lightOffset: 0,
    spawnTimer: 0,
    player: {
        lane: 1,
        x: 0,
        y: PLAYER_Y,
        width: 64,
        height: 114,
        lean: 0,
    },
    traffic: [],
};

bestScoreElement.textContent = String(state.bestScore);

function laneCenter(lane) {
    return ROAD_MARGIN + (LANE_WIDTH * lane) + (LANE_WIDTH / 2);
}

function currentScore() {
    return Math.floor(state.score);
}

function updateScoreDisplay() {
    scoreElement.textContent = String(currentScore());
}

function syncBestScore() {
    const score = currentScore();

    if (score <= state.bestScore) {
        return;
    }

    state.bestScore = score;
    window.localStorage.setItem(BEST_KEY, String(state.bestScore));
    bestScoreElement.textContent = String(state.bestScore);
}

function resetGame() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.speed = 5.2;
    state.roadOffset = 0;
    state.lightOffset = 0;
    state.spawnTimer = 0;
    state.player.lane = 1;
    state.player.x = laneCenter(1);
    state.player.lean = 0;
    state.traffic = [];
    updateScoreDisplay();
    statusMessageElement.textContent = "Press Enter to roll out.";
}

function startGame() {
    if (state.gameOver) {
        resetGame();
    }

    if (!state.running) {
        state.running = true;
        statusMessageElement.textContent = "Traffic is live. Stay smooth and keep moving.";
    }
}

function setLane(nextLane) {
    state.player.lane = Math.max(0, Math.min(LANE_COUNT - 1, nextLane));
}

function steer(direction) {
    if (state.gameOver) {
        return;
    }

    setLane(state.player.lane + direction);

    if (!state.running) {
        statusMessageElement.textContent = "Lane ready. Press Enter to roll out.";
    }
}

function snapToLane(lane) {
    if (state.gameOver) {
        return;
    }

    setLane(lane);

    if (!state.running) {
        statusMessageElement.textContent = "Lane ready. Press Enter to roll out.";
    }
}

function update() {
    const targetX = laneCenter(state.player.lane);
    const deltaX = targetX - state.player.x;
    state.player.x += deltaX * 0.18;
    state.player.lean = deltaX * 0.014;

    if (!state.running || state.gameOver) {
        return;
    }

    state.speed = Math.min(11.8, 5.2 + (currentScore() * 0.018));
    state.roadOffset = (state.roadOffset + (state.speed * 1.8)) % 76;
    state.lightOffset = (state.lightOffset + (state.speed * 0.9)) % 180;
    state.spawnTimer += 1;

    const dynamicSpawnInterval = Math.max(26, 72 - Math.floor(currentScore() / 24));

    if (state.spawnTimer >= dynamicSpawnInterval) {
        state.spawnTimer = 0;
        spawnTraffic();
    }

    state.score += state.speed * 0.12;
    updateScoreDisplay();
    syncBestScore();

    for (const car of state.traffic) {
        car.y += state.speed + car.speedOffset;
        car.x = laneCenter(car.lane);

        if (!car.passed && car.y - (car.height / 2) > state.player.y + (state.player.height / 2)) {
            car.passed = true;
            state.score += 14;
            updateScoreDisplay();
            syncBestScore();
        }
    }

    state.traffic = state.traffic.filter((car) => car.y - (car.height / 2) < canvas.height + 80);

    if (hitsTraffic()) {
        endGame();
    }
}

function spawnTraffic() {
    const openLanes = [];

    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
        const laneBlocked = state.traffic.some((car) => car.lane === lane && car.y < 220);

        if (!laneBlocked) {
            openLanes.push(lane);
        }
    }

    const primaryChoices = openLanes.length > 0 ? openLanes : [0, 1, 2];
    const primaryLane = pickOne(primaryChoices);
    state.traffic.push(createTrafficCar(primaryLane, -randomInt(140, 240)));

    if (currentScore() > 120 && Math.random() < 0.2) {
        const secondaryChoices = [0, 1, 2].filter((lane) => lane !== primaryLane);
        const secondaryLane = pickOne(secondaryChoices);
        state.traffic.push(createTrafficCar(secondaryLane, -randomInt(320, 460)));
    }
}

function createTrafficCar(lane, y) {
    const isTruck = Math.random() < 0.28;
    const colorIndex = randomInt(0, TRAFFIC_COLORS.length - 1);

    return {
        lane,
        x: laneCenter(lane),
        y,
        width: isTruck ? 68 : 58,
        height: isTruck ? 130 : 102,
        color: TRAFFIC_COLORS[colorIndex],
        accent: TRAFFIC_ACCENTS[colorIndex],
        speedOffset: isTruck ? randomInt(0, 2) * 0.18 : 0.4 + (Math.random() * 1.4),
        passed: false,
    };
}

function hitsTraffic() {
    const playerBox = getHitbox(state.player, 0.32, 0.36);

    return state.traffic.some((car) => overlaps(playerBox, getHitbox(car, 0.32, 0.38)));
}

function getHitbox(entity, widthFactor, heightFactor) {
    return {
        left: entity.x - (entity.width * widthFactor),
        right: entity.x + (entity.width * widthFactor),
        top: entity.y - (entity.height * heightFactor),
        bottom: entity.y + (entity.height * heightFactor),
    };
}

function overlaps(first, second) {
    return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}

function endGame() {
    state.running = false;
    state.gameOver = true;
    syncBestScore();
    statusMessageElement.textContent = "Crash. Press R to reset or Enter to try again.";
}

function draw() {
    drawSky();
    drawSkyline();
    drawRoad();
    drawShoulderLights();
    drawTraffic();
    drawPlayer();

    if (!state.running && !state.gameOver) {
        drawOverlay("Cat Dash Rally", "Press Enter or click to drive");
    }

    if (state.gameOver) {
        drawOverlay("Traffic jam", `Score ${currentScore()}  Best ${state.bestScore}`);
    }
}

function drawSky() {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#091833");
    gradient.addColorStop(0.38, "#17375d");
    gradient.addColorStop(0.72, "#35556d");
    gradient.addColorStop(1, "#f18a5f");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const glow = context.createRadialGradient(canvas.width - 72, 92, 12, canvas.width - 72, 92, 108);
    glow.addColorStop(0, "rgba(255, 205, 136, 0.82)");
    glow.addColorStop(1, "rgba(255, 205, 136, 0)");
    context.fillStyle = glow;
    context.fillRect(canvas.width - 180, 0, 180, 220);
}

function drawSkyline() {
    const horizon = 212;
    context.save();
    context.translate(0, horizon);

    for (const building of SKYLINE) {
        const towerGradient = context.createLinearGradient(building.x, 0, building.x, -building.height);
        towerGradient.addColorStop(0, "#101526");
        towerGradient.addColorStop(1, "#1e2740");
        context.fillStyle = towerGradient;
        context.fillRect(building.x, -building.height, building.width, building.height);

        context.fillStyle = "rgba(255, 210, 145, 0.48)";
        for (let y = -building.height + 12; y < -18; y += 18) {
            for (let x = building.x + 7; x < building.x + building.width - 8; x += 12) {
                if ((x + y) % 3 !== 0) {
                    context.fillRect(x, y, 5, 8);
                }
            }
        }
    }

    context.restore();
}

function drawRoad() {
    const shoulderGradient = context.createLinearGradient(0, 0, 0, canvas.height);
    shoulderGradient.addColorStop(0, "#2b2440");
    shoulderGradient.addColorStop(1, "#140f1f");
    context.fillStyle = shoulderGradient;
    context.fillRect(ROAD_MARGIN - 24, 0, ROAD_WIDTH + 48, canvas.height);

    const roadGradient = context.createLinearGradient(0, 0, 0, canvas.height);
    roadGradient.addColorStop(0, "#343847");
    roadGradient.addColorStop(1, "#171b24");
    context.fillStyle = roadGradient;
    context.fillRect(ROAD_MARGIN, 0, ROAD_WIDTH, canvas.height);

    context.fillStyle = "rgba(255, 255, 255, 0.04)";
    context.fillRect(ROAD_MARGIN + 12, 0, ROAD_WIDTH - 24, canvas.height);

    context.fillStyle = "#ffb85c";
    context.fillRect(ROAD_MARGIN - 7, 0, 7, canvas.height);
    context.fillRect(ROAD_MARGIN + ROAD_WIDTH, 0, 7, canvas.height);

    context.save();
    context.setLineDash([40, 26]);
    context.lineDashOffset = -state.roadOffset;
    context.lineWidth = 6;
    context.strokeStyle = "rgba(255, 244, 214, 0.78)";

    for (let lane = 1; lane < LANE_COUNT; lane += 1) {
        const x = ROAD_MARGIN + (LANE_WIDTH * lane);
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
    }

    context.restore();
}

function drawShoulderLights() {
    for (let index = 0; index < 7; index += 1) {
        const y = (((index * 128) + state.lightOffset) % (canvas.height + 120)) - 60;
        drawShoulderLight(ROAD_MARGIN - 22, y);
        drawShoulderLight(canvas.width - ROAD_MARGIN + 22, y + 26);
    }
}

function drawShoulderLight(x, y) {
    context.save();
    context.fillStyle = "rgba(255, 192, 104, 0.12)";
    context.beginPath();
    context.arc(x, y, 18, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ffd38c";
    context.fillRect(x - 3, y - 12, 6, 24);
    context.restore();
}

function drawTraffic() {
    for (const car of state.traffic) {
        drawTrafficCar(car);
    }
}

function drawTrafficCar(car) {
    context.save();
    context.translate(car.x, car.y);

    context.shadowColor = "rgba(3, 10, 18, 0.28)";
    context.shadowBlur = 16;
    context.shadowOffsetY = 12;
    context.fillStyle = car.color;
    roundRect(-(car.width / 2), -(car.height / 2), car.width, car.height, 18);
    context.fill();

    context.shadowColor = "transparent";
    context.fillStyle = car.accent;
    roundRect(-(car.width / 2) + 8, -(car.height / 2) + 14, car.width - 16, 26, 10);
    context.fill();

    context.fillStyle = "rgba(255, 255, 255, 0.16)";
    roundRect(-(car.width / 2) + 10, -(car.height / 2) + 52, car.width - 20, 10, 6);
    context.fill();

    context.fillStyle = "#0f1320";
    context.fillRect(-(car.width / 2) - 4, -(car.height / 2) + 16, 6, 22);
    context.fillRect((car.width / 2) - 2, -(car.height / 2) + 16, 6, 22);
    context.fillRect(-(car.width / 2) - 4, (car.height / 2) - 38, 6, 22);
    context.fillRect((car.width / 2) - 2, (car.height / 2) - 38, 6, 22);

    context.fillStyle = "#ffd085";
    context.fillRect(-(car.width / 2) + 9, (car.height / 2) - 10, 12, 6);
    context.fillRect((car.width / 2) - 21, (car.height / 2) - 10, 12, 6);
    context.restore();
}

function drawPlayer() {
    const { x, y, width, height, lean } = state.player;

    context.save();
    context.translate(x, y);
    context.rotate(lean);

    context.shadowColor = "rgba(7, 11, 18, 0.32)";
    context.shadowBlur = 20;
    context.shadowOffsetY = 14;

    context.fillStyle = "#f7b538";
    roundRect(-(width / 2), -(height / 2), width, height, 20);
    context.fill();

    context.shadowColor = "transparent";
    context.fillStyle = "#ffd595";
    roundRect(-(width / 2) + 8, -(height / 2) + 18, width - 16, 28, 12);
    context.fill();

    context.fillStyle = "#ffe6bf";
    roundRect(-(width / 2) + 10, -(height / 2) + 54, width - 20, 30, 14);
    context.fill();

    context.fillStyle = "#f7b538";
    context.beginPath();
    context.moveTo(-18, -(height / 2) + 14);
    context.lineTo(-7, -(height / 2) - 14);
    context.lineTo(2, -(height / 2) + 16);
    context.closePath();
    context.fill();

    context.beginPath();
    context.moveTo(18, -(height / 2) + 14);
    context.lineTo(7, -(height / 2) - 14);
    context.lineTo(-2, -(height / 2) + 16);
    context.closePath();
    context.fill();

    context.fillStyle = "#ffcc96";
    context.beginPath();
    context.moveTo(-15, -(height / 2) + 17);
    context.lineTo(-8, -(height / 2) - 2);
    context.lineTo(-3, -(height / 2) + 17);
    context.closePath();
    context.fill();

    context.beginPath();
    context.moveTo(15, -(height / 2) + 17);
    context.lineTo(8, -(height / 2) - 2);
    context.lineTo(3, -(height / 2) + 17);
    context.closePath();
    context.fill();

    context.fillStyle = "#19212d";
    context.beginPath();
    context.arc(-10, -(height / 2) + 68, 4, 0, Math.PI * 2);
    context.arc(10, -(height / 2) + 68, 4, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#8b4d1f";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-4, -(height / 2) + 78);
    context.lineTo(-20, -(height / 2) + 74);
    context.moveTo(-4, -(height / 2) + 82);
    context.lineTo(-20, -(height / 2) + 84);
    context.moveTo(4, -(height / 2) + 78);
    context.lineTo(20, -(height / 2) + 74);
    context.moveTo(4, -(height / 2) + 82);
    context.lineTo(20, -(height / 2) + 84);
    context.stroke();

    context.fillStyle = "#ff9f68";
    context.beginPath();
    context.moveTo(0, -(height / 2) + 77);
    context.lineTo(-5, -(height / 2) + 85);
    context.lineTo(5, -(height / 2) + 85);
    context.closePath();
    context.fill();

    context.fillStyle = "#0f1320";
    context.fillRect(-(width / 2) - 5, -(height / 2) + 18, 7, 24);
    context.fillRect((width / 2) - 2, -(height / 2) + 18, 7, 24);
    context.fillRect(-(width / 2) - 5, (height / 2) - 40, 7, 24);
    context.fillRect((width / 2) - 2, (height / 2) - 40, 7, 24);

    context.fillStyle = "#ffe7a5";
    context.fillRect(-(width / 2) + 9, -(height / 2) + 8, 12, 7);
    context.fillRect((width / 2) - 21, -(height / 2) + 8, 12, 7);
    context.restore();
}

function drawOverlay(title, subtitle) {
    context.save();
    context.fillStyle = "rgba(8, 14, 24, 0.5)";
    context.fillRect(18, 20, canvas.width - 36, canvas.height - 56);

    context.fillStyle = "rgba(14, 20, 32, 0.84)";
    roundRect(52, 198, canvas.width - 104, 172, 24);
    context.fill();

    context.textAlign = "center";
    context.fillStyle = "#f4f1e8";
    context.font = "700 32px Syne";
    context.fillText(title, canvas.width / 2, 262);
    context.fillStyle = "#d8e1e8";
    context.font = "400 16px Space Mono";
    context.fillText(subtitle, canvas.width / 2, 300);
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

function pickOne(array) {
    return array[randomInt(0, array.length - 1)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function loop() {
    update();
    draw();
    window.requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "Space", "Enter", "KeyA", "KeyD", "KeyR"].includes(event.code)) {
        event.preventDefault();
    }

    if (event.code === "ArrowLeft" || event.code === "KeyA") {
        steer(-1);
    }

    if (event.code === "ArrowRight" || event.code === "KeyD") {
        steer(1);
    }

    if (event.code === "Enter" || event.code === "Space") {
        startGame();
    }

    if (event.code === "KeyR") {
        resetGame();
    }
});

canvas.addEventListener("pointerdown", (event) => {
    const bounds = canvas.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) * (canvas.width / bounds.width);

    if (!state.running || state.gameOver) {
        startGame();
        return;
    }

    const lane = Math.max(0, Math.min(LANE_COUNT - 1, Math.floor((relativeX - ROAD_MARGIN) / LANE_WIDTH)));
    snapToLane(lane);
});

resetGame();
window.requestAnimationFrame(loop);