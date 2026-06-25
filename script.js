const startScreen = document.getElementById("screen-start");
const gameScreen = document.getElementById("screen-game");
const endScreen = document.getElementById("screen-end");
const startButton = document.getElementById("start-btn");
const pauseButton = document.getElementById("pause-btn");
const restartButton = document.getElementById("restart-btn");
const playAgainButton = document.getElementById("play-again-btn");
const scoreText = document.getElementById("score");
const livesText = document.getElementById("lives");
const contaminationMeter = document.getElementById("contamination-meter");
const timerText = document.getElementById("timer");
const levelText = document.getElementById("level");
const endTitle = document.getElementById("end-title");
const endDescription = document.getElementById("end-description");
const finalScoreText = document.getElementById("final-score");
const playfield = document.getElementById("playfield");
const bucketElements = Array.from(document.querySelectorAll(".jerry-can"));
const gameTip = document.getElementById("game-tip");

const MAX_LIVES = 3;
const MAX_CONTAMINATION = 100;
const GAME_DURATION = 30;
const BASE_SPAWN_MS = 1100;
const MIN_SPAWN_MS = 520;
const BASE_SPEED = 96;
const SPEED_INCREASE = 12;
const BAD_BASE_CHANCE = 0.22;

let score = 0;
let lives = MAX_LIVES;
let contamination = 0;
let timeLeft = GAME_DURATION;
let level = 1;
let spawnRate = BASE_SPAWN_MS;
let spawnTimer = 0;
let lastFrameTime = 0;
let isPlaying = false;
let isPaused = false;
let gameOver = false;
let droplets = [];
let badProbability = BAD_BASE_CHANCE;
let comboStreak = 0;
let bucketZones = [];
let shakeTimeout = null;

function goToScreen(target) {
    startScreen.classList.toggle("hidden", target !== "start");
    gameScreen.classList.toggle("hidden", target !== "game");
    endScreen.classList.toggle("hidden", target !== "end");
}

function setTip(visible, text) {
    gameTip.style.display = visible ? "block" : "none";
    gameTip.textContent = text || "";
}

function initGame() {
    score = 0;
    lives = MAX_LIVES;
    contamination = 0;
    timeLeft = GAME_DURATION;
    level = 1;
    spawnRate = BASE_SPAWN_MS;
    spawnTimer = 0;
    lastFrameTime = 0;
    isPlaying = false;
    isPaused = false;
    gameOver = false;
    droplets.forEach(drop => drop.element.remove());
    droplets = [];
    badProbability = BAD_BASE_CHANCE;
    comboStreak = 0;
    updateHud();
    pauseButton.disabled = true;
    setTip(false, "");
    updateBucketZones();
}

function updateBucketZones() {
    bucketZones = bucketElements.map(bucket => {
        const rect = bucket.getBoundingClientRect();
        const parentRect = playfield.getBoundingClientRect();
        return {
            left: rect.left - parentRect.left,
            right: rect.right - parentRect.left,
            top: rect.top - parentRect.top,
            bottom: rect.bottom - parentRect.top,
        };
    });
}

function updateHud() {
    scoreText.textContent = score;
    livesText.textContent = lives;
    timerText.textContent = `${Math.max(0, Math.ceil(timeLeft))}s`;
    levelText.textContent = level;
    const percent = Math.min(100, contamination);
    contaminationMeter.style.width = `${percent}%`;
    contaminationMeter.style.background = percent > 66
        ? "linear-gradient(90deg, #ffb547, #ff5f5f)"
        : "linear-gradient(90deg, #ffc907, #ff8c8c)";
}

function startGame() {
    if (isPlaying) return;
    initGame();
    goToScreen("game");
    updateBucketZones();
    isPlaying = true;
    isPaused = false;
    gameOver = false;
    pauseButton.disabled = false;
    pauseButton.textContent = "Pause";
    setTip(false, "");
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    initGame();
    goToScreen("game");
    updateBucketZones();
    isPlaying = true;
    isPaused = false;
    gameOver = false;
    pauseButton.disabled = false;
    pauseButton.textContent = "Pause";
    setTip(false, "");
    lastFrameTime = performance.now();
}

function pauseGame() {
    if (!isPlaying || gameOver) return;
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? "Resume" : "Pause";
    if (isPaused) {
        setTip(true, "Game paused. Press resume to continue.");
    } else {
        setTip(false, "");
    }
}

function showEndScreen(win) {
    goToScreen("end");
    endTitle.textContent = win ? "You Win!" : "You Lose";
    endDescription.textContent = win
        ? "Your jerry cans are full and the water is safe!"
        : "The polluted water won this round. Try again to rescue more.";
    finalScoreText.textContent = score;
    if (win) {
        triggerConfetti();
    }
}

function triggerConfetti() {
    const count = 80;
    const colors = [
        "#ffd963",
        "#ff6f6f",
        "#7ec9ff",
        "#a4e5c3",
        "#fff27d",
        "#ff9ff9",
    ];

    for (let i = 0; i < count; i += 1) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        const width = 8 + Math.random() * 10;
        const height = 14 + Math.random() * 14;
        const startLeft = Math.random() * 100;
        const startTop = -Math.random() * 8;

        piece.style.width = `${width}px`;
        piece.style.height = `${height}px`;
        piece.style.left = `${startLeft}%`;
        piece.style.top = `${startTop}%`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = `${1.2 + Math.random() * 1.2}s`;
        piece.style.animationDelay = `${Math.random() * 0.4}s`;
        piece.style.transform = `rotate(${Math.random() * 360}deg)`;
        piece.style.opacity = `${0.85 + Math.random() * 0.1}`;

        endScreen.appendChild(piece);
        setTimeout(() => piece.remove(), 2400);
    }
}

function spawnDroplet() {
    const drop = document.createElement("button");
    drop.type = "button";
    drop.className = "droplet";
    const isBad = Math.random() < badProbability;
    const size = Math.floor(Math.random() * 18) + 52;
    const speed = BASE_SPEED + level * SPEED_INCREASE + Math.random() * 28;
    const x = Math.random() * Math.max(1, playfield.clientWidth - size - 24) + 12;
    const dropData = {
        id: `drop-${Date.now()}-${Math.random()}`,
        x,
        y: -size,
        size,
        speed,
        type: isBad ? "bad" : "clean",
        element: drop,
    };

    drop.style.position = "absolute";
    drop.style.width = `${size}px`;
    drop.style.height = `${size}px`;
    drop.style.left = `${x}px`;
    drop.style.top = `-${size}px`;
    drop.style.zIndex = "2";
    drop.classList.toggle("bad", isBad);
    drop.classList.toggle("clean", !isBad);
    drop.innerHTML = `<span>${isBad ? "!" : "💧"}</span>`;
    drop.setAttribute("aria-label", isBad ? "Polluted drop, click to destroy" : "Clean drop, let it reach the jerry can");
    drop.addEventListener("click", () => handleDropletClick(dropData));
    playfield.appendChild(drop);
    droplets.push(dropData);
}

function handleDropletClick(drop) {
    if (!isPlaying || isPaused || gameOver) return;

    if (drop.type === "bad") {
        score += 20;
        comboStreak += 1;
        createTextPop(drop.x + drop.size / 2, drop.y + drop.size / 2, "+20", "hit");
    } else {
        score = Math.max(0, score - 10);
        comboStreak = 0;
        createTextPop(drop.x + drop.size / 2, drop.y + drop.size / 2, "-10", "miss");
    }

    removeDroplet(drop);
    updateHud();
}

function createTextPop(x, y, text, type) {
    const label = document.createElement("span");
    label.className = `effect ${type}`;
    label.textContent = text;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    playfield.appendChild(label);
    requestAnimationFrame(() => label.style.opacity = "1");
    setTimeout(() => label.remove(), 700);
}

function removeDroplet(drop) {
    drop.element.remove();
    droplets = droplets.filter(item => item.id !== drop.id);
}

function updateDifficulty() {
    const survived = GAME_DURATION - timeLeft;
    level = Math.min(6, Math.floor(survived / 12) + 1);
    spawnRate = Math.max(MIN_SPAWN_MS, BASE_SPAWN_MS - level * 90);
    badProbability = Math.min(0.7, BAD_BASE_CHANCE + level * 0.08);
}

function checkCollision(drop) {
    const centerX = drop.x + drop.size / 2;
    return bucketZones.findIndex(zone => centerX >= zone.left && centerX <= zone.right);
}

function updateDroplets(delta) {
    const bucketTriggerY = playfield.clientHeight - 110;

    droplets.slice().forEach(drop => {
        drop.y += (drop.speed * delta) / 1000;
        drop.element.style.top = `${drop.y}px`;
        drop.element.style.left = `${drop.x}px`;

        if (drop.y + drop.size >= bucketTriggerY) {
            const bucketIndex = checkCollision(drop);
            if (bucketIndex !== -1) {
                if (drop.type === "clean") {
                    const bonus = 15 + comboStreak * 2;
                    score += bonus;
                    comboStreak += 1;
                    createTextPop(drop.x + drop.size / 2, bucketTriggerY, `+${bonus}`, "hit");
                    animateBucket(bucketIndex);
                } else {
                    lives -= 1;
                    contamination += 16;
                    comboStreak = 0;
                    createTextPop(drop.x + drop.size / 2, bucketTriggerY, "Contaminated!", "error");
                    shakePlayfield();
                }
                removeDroplet(drop);
                updateHud();
                return;
            }
        }

        if (drop.y > playfield.clientHeight + drop.size) {
            if (drop.type === "bad") {
                lives -= 1;
                contamination += 8;
                comboStreak = 0;
                createTextPop(drop.x + drop.size / 2, playfield.clientHeight - 24, "Missed!", "error");
                shakePlayfield();
            }
            removeDroplet(drop);
            updateHud();
        }
    });
}

function animateBucket(index) {
    const bucket = bucketElements[index];
    bucket.classList.add("active");
    setTimeout(() => bucket.classList.remove("active"), 420);
}

function shakePlayfield() {
    playfield.classList.add("shake");
    clearTimeout(shakeTimeout);
    shakeTimeout = setTimeout(() => playfield.classList.remove("shake"), 260);
}

function gameLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const delta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    if (isPlaying && !isPaused && !gameOver) {
        spawnTimer += delta;
        timeLeft -= delta / 1000;

        if (spawnTimer >= spawnRate) {
            spawnTimer = 0;
            spawnDroplet();
        }

        updateDifficulty();
        updateDroplets(delta);
        updateHud();

        if (lives <= 0 || contamination >= MAX_CONTAMINATION) {
            gameOver = true;
            isPlaying = false;
            showEndScreen(false);
        } else if (timeLeft <= 0) {
            gameOver = true;
            isPlaying = false;
            showEndScreen(true);
        }
    }

    requestAnimationFrame(gameLoop);
}

function handleKeyboard(event) {
    if (event.key.toLowerCase() === "p") pauseGame();
    if (event.key.toLowerCase() === "r") startGame();
}

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", pauseGame);
restartButton.addEventListener("click", restartGame);
playAgainButton.addEventListener("click", restartGame);
document.addEventListener("keydown", handleKeyboard);
window.addEventListener("resize", updateBucketZones);

initGame();
requestAnimationFrame(gameLoop);
