const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Karte: 1 = Hecke, 2 = Händler-Stand, 0 = Gehweg
const MAP = [,
 ,
 ,
 ,
 ,
 ,
 ,
 ,
 ,
    [1,1,1,1,1,1,1,1,1,1]
];
const MAP_SIZE = 10;
const TILE_SIZE = 64;

// Spieler-Daten
const player = {
    x: 96, y: 96, angle: 0.5,
    fov: Math.PI / 3, speed: 2, rotSpeed: 0.04,
    coins: 20,
    inventory: { Tomato: 0, Pumpkin: 0 },
    selectedSeed: null
};

const crops = [];

const CROP_TYPES = {
    Tomato: { growTime: 6000, sellValue: 12, color: "#e74c3c", size: 0.4 },
    Pumpkin: { growTime: 12000, sellValue: 28, color: "#e67e22", size: 0.6 }
};

let isShopOpen = false;
const keys = {};

// Steuerung abfangen
window.addEventListener("keydown", e => {
    if (isShopOpen && e.key.toLowerCase() !== 'p') return;
    keys[e.key.toLowerCase()] = true;
    
    if (e.key.toLowerCase() === 'e') handleInteraction();
    if (e.key.toLowerCase() === 'p') toggleShop(!isShopOpen);
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function toggleShop(open) {
    isShopOpen = open;
    document.getElementById("shop-modal").style.display = open ? "block" : "none";
    if(open) Object.keys(keys).forEach(k => keys[k] = false); 
}

function buySeed(type, cost) {
    if (player.coins >= cost) {
        player.coins -= cost;
        player.inventory[type]++;
        player.selectedSeed = type; 
        updateUI();
    } else {
        alert("Nicht genug Münzen!");
    }
}

function updateUI() {
    document.getElementById("coins-display").innerText = player.coins;
    document.getElementById("inv-display").innerText = `🍅x${player.inventory.Tomato} 🎃x${player.inventory.Pumpkin}`;
    document.getElementById("holding-display").innerText = player.selectedSeed ? `${player.selectedSeed === 'Tomato' ? 'Tomate' : 'Kürbis'}-Samen` : "Leere Hände";
}

function handleInteraction() {
    const lookX = player.x + Math.cos(player.angle) * 40;
    const lookY = player.y + Math.sin(player.angle) * 40;
    const gridX = Math.floor(lookX / TILE_SIZE);
    const gridY = Math.floor(lookY / TILE_SIZE);

    // 1. Am Shop-Stand? Open Shop
    if (MAP[gridY] && MAP[gridY][gridX] === 2) {
        toggleShop(true);
        return;
    }

    // 2. Ernten, falls reif
    let harvestedItem = false;
    for (let i = crops.length - 1; i >= 0; i--) {
        const c = crops[i];
        const dist = Math.hypot(player.x - c.x, player.y - c.y);
        if (dist < 40 && c.stage === "Grown") {
            player.coins += CROP_TYPES[c.type].sellValue;
            crops.splice(i, 1);
            harvestedItem = true;
            updateUI();
            break;
        }
    }
    if (harvestedItem) return;

    // 3. Pflanzen platzieren
    if (player.selectedSeed && MAP[gridY] && MAP[gridY][gridX] === 0) {
        const crowded = crops.some(c => Math.floor(c.x/TILE_SIZE) === gridX && Math.floor(c.y/TILE_SIZE) === gridY);
        if (!crowded && player.inventory[player.selectedSeed] > 0) {
            player.inventory[player.selectedSeed]--;
            crops.push({
                x: gridX * TILE_SIZE + 32,
                y: gridY * TILE_SIZE + 32,
                type: player.selectedSeed,
                plantedAt: Date.now(),
                stage: "Sprout"
            });
            if (player.inventory[player.selectedSeed] === 0) player.selectedSeed = null;
            updateUI();
        }
    }
}

function update() {
    const now = Date.now();
    crops.forEach(c => {
        const elapsed = now - c.plantedAt;
        const totalNeeded = CROP_TYPES[c.type].growTime;
        if (elapsed >= totalNeeded) c.stage = "Grown";
        else if (elapsed >= totalNeeded / 2) c.stage = "Growing";
    });

    if (isShopOpen) return;

    if (keys["a"] || keys["arrowleft"]) player.angle -= player.rotSpeed;
    if (keys["d"] || keys["arrowright"]) player.angle += player.rotSpeed;

    let moveX = 0, moveY = 0;
    if (keys["w"] || keys["arrowup"]) {
        moveX = Math.cos(player.angle) * player.speed;
        moveY = Math.sin(player.angle) * player.speed;
    }
    if (keys["s"] || keys["arrowdown"]) {
        moveX = -Math.cos(player.angle) * player.speed;
        moveY = -Math.sin(player.angle) * player.speed;
    }

    const newXGrid = Math.floor((player.x + moveX) / TILE_SIZE);
    const newYGrid = Math.floor((player.y + moveY) / TILE_SIZE);

    if (MAP[Math.floor(player.y / TILE_SIZE)][newXGrid] === 0) player.x += moveX;
    if (MAP[newYGrid][Math.floor(player.x / TILE_SIZE)] === 0) player.y += moveY;

    // HUD-Aufforderungen logik
    const lookX = player.x + Math.cos(player.angle) * 40;
    const lookY = player.y + Math.sin(player.angle) * 40;
    const gX = Math.floor(lookX / TILE_SIZE);
    const gY = Math.floor(lookY / TILE_SIZE);
    const prompt = document.getElementById("action-prompt");

    if (MAP[gY] && MAP[gY][gX] === 2) {
        prompt.innerText = "Drücke E um den Shop zu öffnen";
        prompt.style.display = "block";
    } else {
        let nearCrop = crops.find(c => Math.hypot(player.x - c.x, player.y - c.y) < 40);
        if (nearCrop) {
            prompt.innerText = nearCrop.stage === "Grown" ? `Drücke E zum Ernten & Verkaufen (${nearCrop.type === 'Tomato' ? 'Tomate' : 'Kürbis'})!` : `Warte auf Reife...`;
            prompt.style.display = "block";
        } else if (player.selectedSeed && MAP[gY] && MAP[gY][gX] === 0) {
            prompt.innerText = `Drücke E zum Pflanzen`;
            prompt.style.display = "block";
        } else {
            prompt.style.display = "none";
        }
    }
}

function draw() {
    // Himmel und Boden zeichnen
    ctx.fillStyle = "#a1caf1"; ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
    ctx.fillStyle = "#1e824c"; ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    const numRays = canvas.width;
    const halfFov = player.fov / 2;

    // 3D-Raycasting Engine
    for (let i = 0; i < numRays; i++) {
        const rayAngle = player.angle - halfFov + (i / numRays) * player.fov;
        let distance = 0, hitWall = false, wallType = 1;
        const cos = Math.cos(rayAngle), sin = Math.sin(rayAngle);

        while (!hitWall && distance < 500) {
            distance += 2;
            const cX = Math.floor((player.x + cos * distance) / TILE_SIZE);
            const cY = Math.floor((player.y + sin * distance) / TILE_SIZE);

            if (cX < 0 || cX >= MAP_SIZE || cY < 0 || cY >= MAP_SIZE) {
                hitWall = true; distance = 500;
            } else if (MAP[cY][cX] > 0) {
                hitWall = true;
                wallType = MAP[cY][cX];
            }
        }

        const corrDist = distance * Math.cos(rayAngle - player.angle);
        const wallH = Math.min(canvas.height, (TILE_SIZE * canvas.height) / corrDist);

        const shade = Math.max(20, Math.min(150, 180 - corrDist * 0.35));
        if (wallType === 2) {
            ctx.fillStyle = `rgb(${shade}, ${shade * 0.6}, 0)`; // Händler-Stand (Gold/Braun)
        } else {
            ctx.fillStyle = `rgb(0, ${shade}, 0)`; // Hecke (Grün)
        }
        ctx.fillRect(i, (canvas.height - wallH) / 2, 1, wallH);
    }

    // 3D-Sprites für die Pflanzen rendern (Billboarding)
    const sortedSprites = [...crops].map(c => {
        const dx = c.x - player.x, dy = c.y - player.y;
        return {
            ...c,
            sx: dx * Math.sin(player.angle) - dy * Math.cos(player.angle),
            sy: dx * Math.cos(player.angle) + dy * Math.sin(player.angle)
        };
    }).filter(s => s.sy > 8).sort((a, b) => b.sy - a.sy);

    sortedSprites.forEach(sprite => {
        const viewX = (canvas.width / 2) + (sprite.sx / sprite.sy) * (canvas.width / (player.fov * 1.5));
        const baseSize = (TILE_SIZE * canvas.height) / sprite.sy;
        const typeCfg = CROP_TYPES[sprite.type];
        const sizeMod = sprite.stage === "Sprout" ? 0.15 : sprite.stage === "Growing" ? 0.3 : typeCfg.size;
        const renderRadius = (baseSize / 2) * sizeMod;

        if (viewX > -renderRadius && viewX < canvas.width + renderRadius) {
            const drawY = (canvas.height / 2) + (baseSize / 4);
            
            if (sprite.stage === "Sprout") {
                ctx.fillStyle = "#8b5a2b"; 
                ctx.beginPath(); ctx.arc(viewX, drawY, renderRadius, 0, Math.PI, true); ctx.fill();
            } else if (sprite.stage === "Growing") {
                ctx.fillStyle = "#2ecc71"; 
                ctx.fillRect(viewX - 3, drawY - renderRadius, 6, renderRadius);
            } else {
                ctx.fillStyle = typeCfg.color;
                ctx.beginPath(); ctx.arc(viewX, drawY - renderRadius/2, renderRadius, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "#27ae60"; ctx.fillRect(viewX - 2, drawY - renderRadius * 1.4, 4, 6);
            }
        }
    });
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Spielstart initialisieren
updateUI();
gameLoop();
