import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAAl85IvWatbWiLl7MkCNydknJsttGGktk",
    authDomain: "fire-apsk.firebaseapp.com",
    databaseURL: "https://fire-apsk-default-rtdb.firebaseio.com",
    projectId: "fire-apsk",
    storageBucket: "fire-apsk.firebasestorage.app",
    messagingSenderId: "694099610438",
    appId: "1:694099610438:web:92d00fce314b8b0e49b347",
    measurementId: "G-27X628E1ZL"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ==========================================
// 2. AUTHENTICATION & SECURITY FIREWALL
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('profile-email').innerText = user.email;
        document.getElementById('profile-uid').innerText = user.uid;
        console.log(`[AUTH] Session Active: ${user.email}`);
    } else {
        console.warn("[AUTH] No active session. Redirecting to security gate...");
        window.location.replace("../index.html");
    }
});

const settingsModal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('open-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const logoutBtn = document.getElementById('logout-btn');

openSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.add('hidden');
});

logoutBtn.addEventListener('click', () => {
    logoutBtn.innerText = "TERMINATING...";
    logoutBtn.style.opacity = "0.7";
    signOut(auth).then(() => {
        console.log("[AUTH] Session terminated manually.");
    }).catch((error) => {
        console.error("[AUTH] Logout Error:", error);
        logoutBtn.innerText = "TERMINATE SESSION";
        logoutBtn.style.opacity = "1";
    });
});

// ==========================================
// 3. GLOBAL STATE, TELEGRAM & AUDIO ENGINE
// ==========================================
const TELEGRAM_BOT_TOKEN = "8964544391:AAEDtjzoFpDmOqKa6R_ylMO7o-BexdPJcgI"; 
const TELEGRAM_CHAT_ID = "8013348506"; 
const activeTelegramAlarms = new Set();

const fireAlarmAudio = new Audio('https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg');
fireAlarmAudio.loop = true; 
let isAlarmPlaying = false;

document.body.addEventListener('click', () => {
    if (fireAlarmAudio.currentTime === 0 && !isAlarmPlaying) {
        fireAlarmAudio.play().then(() => {
            fireAlarmAudio.pause();
            console.log("[AUDIO] System Unlocked. Ready to sound alarm.");
        }).catch(err => console.log("[AUDIO] Waiting for interaction."));
    }
}, { once: true });

const zoneDirectory = {
    "zone_1a": { 
        name: "Lobby", level: "Level 1, South Wing", mapX: "10%", mapY: "15%", 
        miniMapUrl: "maps/assets/zone_1a.png", reticleX: "80%", reticleY: "30%",
        adjacent: ["zone_5c"] 
    },
    "zone_4b": { 
        name: "Server Room", level: "Level 4, North Wing", mapX: "70%", mapY: "55%", 
        miniMapUrl: "maps/assets/zone_4b.png", reticleX: "65%", reticleY: "40%",
        adjacent: ["zone_5c", "zone_8d"] 
    },
    "zone_5c": { 
        name: "Chemical Storage", level: "Level 5, East Wing", mapX: "25%", mapY: "65%", 
        miniMapUrl: "maps/assets/zone_5c.png", reticleX: "20%", reticleY: "75%",
        adjacent: ["zone_1a", "zone_4b"] 
    },
    "zone_8d": { 
        name: "Executive Suite", level: "Level 8, Tower A", mapX: "45%", mapY: "80%", 
        miniMapUrl: "assets/exec-suite-minimap.png", reticleX: "50%", reticleY: "50%",
        adjacent: ["zone_4b"] 
    }
};

const zoneHistories = { "global": { temp: Array(7).fill(25), smoke: Array(7).fill(5) } }; 
let currentSelectedZone = null;
let activeThreatsGlobal = {};
let worstThreatGlobal = null;

// ==========================================
// 4. CHART.JS CONFIGURATION
// ==========================================
Chart.defaults.color = '#86868b'; // Apple subtle gray
Chart.defaults.font.family = "'Product Sans', 'Plus Jakarta Sans', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

const gaugeNeedle = {
    id: 'gaugeNeedle',
    afterDatasetDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        const meta = chart.getDatasetMeta(0);
        const arc = meta.data[0];
        const cx = arc.x, cy = arc.y;
        const outerRadius = arc.outerRadius, innerRadius = arc.innerRadius;
        const currentAngle = arc.startAngle + arc.circumference;
        
        ctx.translate(cx, cy); ctx.rotate(currentAngle);
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(outerRadius - 8, 0); ctx.lineTo(0, 4);
        ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(255, 255, 255, 0.5)'; ctx.fill();
        ctx.shadowBlur = 0; 
        
        ctx.beginPath(); ctx.arc(0, 0, innerRadius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#1c1c1e'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        
        ctx.beginPath(); ctx.arc(0, 0, innerRadius * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3b30'; ctx.fill(); ctx.restore();
    }
};

const ctxGauge = document.getElementById('tempGauge').getContext('2d');
const gaugeGradient = ctxGauge.createLinearGradient(0, 0, 150, 0);
gaugeGradient.addColorStop(0, '#ff3b30'); 
gaugeGradient.addColorStop(0.5, '#ff9900'); 
gaugeGradient.addColorStop(1, '#ffcc00'); 

const tempGauge = new Chart(ctxGauge, {
    type: 'doughnut',
    data: { datasets: [{ data: [0, 180], backgroundColor: [gaugeGradient, 'rgba(255,255,255,0.05)'], borderWidth: 0, cutout: '75%', circumference: 180, rotation: 270 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 800, easing: 'easeOutQuart' } },
    plugins: [gaugeNeedle]
});

const createGradient = (ctx, colorHex) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 110);
    gradient.addColorStop(0, `${colorHex}80`); gradient.addColorStop(1, `${colorHex}00`); 
    return gradient;
};

const buildChartConfig = (ctx, colorHex) => ({
    type: 'line',
    data: { labels: ['-30s', '-25s', '-20s', '-15s', '-10s', '-5s', 'Now'], datasets: [{ data: [0, 0, 0, 0, 0, 0, 0], borderColor: colorHex, backgroundColor: createGradient(ctx, colorHex), borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: colorHex, pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: [0, 0, 0, 0, 0, 0, 5], pointHoverRadius: 7 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 1200, easing: 'easeOutQuart' } },
});

const tempChart = new Chart(document.getElementById('tempChart').getContext('2d'), buildChartConfig(document.getElementById('tempChart').getContext('2d'), '#ff3b30'));
const smokeChart = new Chart(document.getElementById('smokeChart').getContext('2d'), buildChartConfig(document.getElementById('smokeChart').getContext('2d'), '#ffffff'));

// ==========================================
// 5. 3D HOVER EFFECTS & TELEMETRY ENGINE
// ==========================================
function attachHoverEffects() {
    document.querySelectorAll('.glass-panel').forEach(panel => {
        panel.addEventListener('mousemove', (e) => {
            const rect = panel.getBoundingClientRect();
            const rotateX = (((e.clientY - rect.top) - rect.height / 2) / (rect.height / 2)) * -2; 
            const rotateY = (((e.clientX - rect.left) - rect.width / 2) / (rect.width / 2)) * 2;
            panel.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        panel.addEventListener('mouseleave', () => panel.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)');
    });
}
attachHoverEffects();

function processTelemetry(temp, smoke, zoneKey) {
    const zoneInfo = zoneDirectory[zoneKey] || { name: "Unknown Zone", level: "Unknown", mapX: "50%", mapY: "50%" };
    const state = { zoneId: zoneKey, isGlobal: false, severityScore: 0, severity: "NORMAL", fireType: "None Detected", alarmLevel: "ALL ZONES CLEAR", systemStatus: "STANDBY", suppressionStatus: "ARMED", sprinklerStatus: "READY", evacuationStatus: "SECURE", alertStatus: "NONE", locationDetails: `${zoneInfo.level},<br>${zoneInfo.name}`, mapX: zoneInfo.mapX, mapY: zoneInfo.mapY, temp: temp, smoke: smoke, isSpreadRisk: false };

    if (temp >= 70 || smoke >= 60) {
        state.severityScore = 2; state.severity = "CRITICAL"; state.alarmLevel = `LEVEL 4 | ${zoneKey.toUpperCase().replace('_', ' ')}: ${zoneInfo.name.toUpperCase()}`; state.systemStatus = "ALARM ACTIVE"; state.suppressionStatus = "ACTIVATED (INERGEN)"; state.sprinklerStatus = `DEPLOYED (${zoneKey.toUpperCase()})`; state.evacuationStatus = "EVACUATION INITIATED"; state.alertStatus = "FDNY NOTIFIED";
        if (temp > 100 && smoke > 80) state.fireType = "Electrical (Class E) - Severe";
        else if (smoke > 70 && temp < 80) state.fireType = "Smoldering / Cable Fire (Class A/E)";
        else state.fireType = "Rapid Combustion (Class B/C)";
    } else if (temp >= 45 || smoke >= 25) {
        state.severityScore = 1; state.severity = "WARNING"; state.alarmLevel = `LEVEL 2 | INVESTIGATING ${zoneKey.toUpperCase()}`; state.systemStatus = "PRE-ALARM"; state.suppressionStatus = "STANDBY"; state.sprinklerStatus = "STANDBY"; state.evacuationStatus = "PREPARE"; state.alertStatus = "SECURITY DISPATCHED"; state.fireType = "Overheating Detected";
    }
    return state;
}

// ==========================================
// 6. RIGHT PANEL RENDERER
// ==========================================
function updateRightPanel(threat) {
    if (!threat) return;

    const detailsHeader = document.querySelector('.telemetry-card .panel-header');
    if (threat.isGlobal) detailsHeader.innerHTML = `<span class="icon">🏢</span> BUILDING WIDE OVERVIEW`;
    else detailsHeader.innerHTML = `<span class="icon">📍</span> ZONE INSPECTOR: ${threat.zoneId.toUpperCase()}`;

    document.getElementById('fireTypeText').innerText = threat.fireType;
    document.getElementById('sysStatusText').innerText = threat.systemStatus;
    document.getElementById('supStatusText').innerText = threat.suppressionStatus;
    document.getElementById('spkStatusText').innerText = threat.sprinklerStatus;
    document.getElementById('evacStatusText').innerText = threat.evacuationStatus;
    document.getElementById('alertStatusText').innerText = threat.alertStatus;

    const sysHeader = document.getElementById('sysHeaderIcon');
    const tempElement = document.getElementById('tempText');
    const smokeElement = document.getElementById('smokeText');

    if (threat.severity === "CRITICAL") {
        tempElement.innerText = `${threat.temp.toFixed(1)}°C (Critical)`; tempElement.className = 'data-value text-red pulse-text'; tempElement.style.color = '';
        smokeElement.innerText = `${threat.smoke.toFixed(1)}% (High)`;
        document.getElementById('sysStatusText').className = "data-value text-red pulse-text";
        sysHeader.className = "panel-header text-red"; sysHeader.style.color = ''; sysHeader.innerHTML = `<span class="icon">⚠️</span> CRITICAL STATUS`;
    } else if (threat.isSpreadRisk) {
        tempElement.innerText = `${threat.temp.toFixed(1)}°C (Nominal)`; tempElement.className = 'data-value pulse-text'; tempElement.style.color = '#ffcc00'; 
        smokeElement.innerText = `${threat.smoke.toFixed(1)}% (Nominal)`;
        document.getElementById('sysStatusText').className = "data-value pulse-text"; document.getElementById('sysStatusText').style.color = "#ffcc00";
        sysHeader.className = "panel-header"; sysHeader.style.color = "#ffcc00"; sysHeader.innerHTML = `<span class="icon">🔮</span> PREDICTIVE WARNING`;
    } else if (threat.severity === "WARNING") {
        tempElement.innerText = `${threat.temp.toFixed(1)}°C (Warning)`; tempElement.className = 'data-value pulse-text'; tempElement.style.color = '#ff9900'; 
        smokeElement.innerText = `${threat.smoke.toFixed(1)}% (Elevated)`;
        document.getElementById('sysStatusText').className = "data-value pulse-text"; document.getElementById('sysStatusText').style.color = "#ff9900";
        sysHeader.className = "panel-header"; sysHeader.style.color = "#ff9900"; sysHeader.innerHTML = `<span class="icon">🔍</span> INVESTIGATING`;
    } else {
        tempElement.innerText = `${threat.temp.toFixed(1)}°C (Normal)`; tempElement.className = 'data-value'; tempElement.style.color = ''; 
        smokeElement.innerText = `${threat.smoke.toFixed(1)}% (Clear)`;
        document.getElementById('sysStatusText').className = "data-value"; document.getElementById('sysStatusText').style.color = '';
        sysHeader.className = "panel-header text-green"; sysHeader.style.color = ''; sysHeader.innerHTML = `<span class="icon">✓</span> STATUS`;
    }

    const historyKey = threat.isGlobal ? "global" : threat.zoneId;
    if (zoneHistories[historyKey]) {
        tempChart.data.datasets[0].data = [...zoneHistories[historyKey].temp]; tempChart.update('none'); 
        smokeChart.data.datasets[0].data = [...zoneHistories[historyKey].smoke]; smokeChart.update('none');
        const currentTemp = zoneHistories[historyKey].temp[6];
        const clampedTemp = Math.min(currentTemp, 180); 
        tempGauge.data.datasets[0].data = [clampedTemp, 180 - clampedTemp]; tempGauge.update('none');
    }
}

// ==========================================
// 7. FIREBASE LIVE LISTENER & MASTER RENDER
// ==========================================
const sensorsRef = ref(db, 'sensors');
onValue(sensorsRef, (snapshot) => {
    const allZonesData = snapshot.val();
    if (!allZonesData) return;

    activeThreatsGlobal = {}; worstThreatGlobal = null;
    let highestScore = -1, highestTemp = -1, currentGlobalMaxTemp = 25, currentGlobalMaxSmoke = 5, activeThreatCount = 0;

    for (const [zoneKey, zoneInfo] of Object.entries(zoneDirectory)) {
        const rawData = allZonesData[zoneKey] || {}; 
        
        // 🔥 SAFE PARSER: Guarantees a real number even if Firebase data is missing
        const safeTemp = parseFloat(rawData.temperature ?? rawData.temp ?? 25);
        const safeSmoke = parseFloat(rawData.smoke ?? 5);

        const decisions = processTelemetry(safeTemp, safeSmoke, zoneKey);
        activeThreatsGlobal[zoneKey] = decisions;

        if (decisions.severityScore > 0) activeThreatCount++;
        if (decisions.temp > currentGlobalMaxTemp) currentGlobalMaxTemp = decisions.temp;
        if (decisions.smoke > currentGlobalMaxSmoke) currentGlobalMaxSmoke = decisions.smoke;

        if (!zoneHistories[zoneKey]) zoneHistories[zoneKey] = { temp: Array(7).fill(25), smoke: Array(7).fill(5) };
        zoneHistories[zoneKey].temp.shift(); zoneHistories[zoneKey].temp.push(decisions.temp);
        zoneHistories[zoneKey].smoke.shift(); zoneHistories[zoneKey].smoke.push(decisions.smoke);

        if (decisions.severityScore > highestScore || (decisions.severityScore === highestScore && decisions.temp > highestTemp)) {
            highestScore = decisions.severityScore; highestTemp = decisions.temp; worstThreatGlobal = decisions;
        }
    }

    // Predictive AI: Map Structural Risks
    for (const [zoneKey, threat] of Object.entries(activeThreatsGlobal)) {
        if (threat.severity === "CRITICAL") {
            const adjacents = zoneDirectory[zoneKey].adjacent || [];
            adjacents.forEach(adjId => {
                const adjThreat = activeThreatsGlobal[adjId];
                if (adjThreat && adjThreat.severity !== "CRITICAL") {
                    adjThreat.isSpreadRisk = true; adjThreat.severityScore = Math.max(adjThreat.severityScore, 0.5); 
                    adjThreat.alarmLevel = `PREDICTIVE RISK: PROXIMITY TO ${zoneKey.toUpperCase()}`;
                    adjThreat.systemStatus = "STRUCTURAL VULNERABILITY"; adjThreat.fireType = "High Ignition Risk";
                }
            });
        }
    }

    zoneHistories["global"].temp.shift(); zoneHistories["global"].temp.push(currentGlobalMaxTemp);
    zoneHistories["global"].smoke.shift(); zoneHistories["global"].smoke.push(currentGlobalMaxSmoke);

    // Telegram Alerts
    for (const [zoneKey, threat] of Object.entries(activeThreatsGlobal)) {
        if (threat.severity === "CRITICAL" && !activeTelegramAlarms.has(zoneKey)) {
            activeTelegramAlarms.add(zoneKey); triggerTelegramAlert(zoneKey, threat); 
        } else if (threat.severity !== "CRITICAL" && activeTelegramAlarms.has(zoneKey)) {
            activeTelegramAlarms.delete(zoneKey); 
        }
    }

    // Audio Alarms
    let hasCriticalFire = Object.values(activeThreatsGlobal).some(threat => threat.severity === "CRITICAL");
    if (hasCriticalFire && !isAlarmPlaying) {
        fireAlarmAudio.play().catch(e => console.log("[AUDIO BLOCKED] Need user interaction."));
        isAlarmPlaying = true;
    } else if (!hasCriticalFire && isAlarmPlaying) {
        fireAlarmAudio.pause(); fireAlarmAudio.currentTime = 0; isAlarmPlaying = false;
    }

    let globalOverview = null;
    if (activeThreatCount > 0) {
        globalOverview = { zoneId: "global", isGlobal: true, severity: worstThreatGlobal.severity, temp: currentGlobalMaxTemp, smoke: currentGlobalMaxSmoke, fireType: activeThreatCount > 1 ? `${activeThreatCount} Active Fire Zones Detected` : worstThreatGlobal.fireType, systemStatus: "BUILDING ALARM ACTIVE", suppressionStatus: activeThreatCount > 1 ? "MULTIPLE SYSTEMS ACTIVATED" : worstThreatGlobal.suppressionStatus, sprinklerStatus: activeThreatCount > 1 ? `${activeThreatCount} ZONES DEPLOYED` : worstThreatGlobal.sprinklerStatus, evacuationStatus: worstThreatGlobal.severity === "CRITICAL" ? "FULL EVACUATION INITIATED" : "STANDBY", alertStatus: "EMERGENCY SERVICES EN ROUTE" };
    } else {
        globalOverview = processTelemetry(25, 5, 'zone_1a'); globalOverview.isGlobal = true; globalOverview.zoneId = "global"; globalOverview.systemStatus = "ALL SYSTEMS NORMAL";
    }

    const dynamicNodesContainer = document.getElementById('dynamicNodesContainer');
    dynamicNodesContainer.innerHTML = ''; 

    // Render Nodes & CCTV
    for (const [zoneKey, threat] of Object.entries(activeThreatsGlobal)) {
        if (threat.severityScore === 0) continue; 
        let themeColor = '#ff9900', headerText = 'WARNING:', pulseAnim = '';
        if (threat.severity === "CRITICAL") { themeColor = '#ff3b30'; headerText = 'ACTIVE ALARM:'; pulseAnim = '<div class="pulse-ring"></div>'; } 
        else if (threat.isSpreadRisk) { themeColor = '#ffcc00'; headerText = 'PREDICTIVE RISK:'; pulseAnim = '<div class="pulse-ring" style="border-color: #ffcc00; animation-duration: 2s;"></div>'; }

        const isCritical = threat.severity === "CRITICAL"; const isOpenClass = (currentSelectedZone === zoneKey) ? 'open' : '';
        const miniMapUrl = zoneDirectory[threat.zoneId].miniMapUrl || 'assets/default-room.png'; const retX = zoneDirectory[threat.zoneId].reticleX || '50%'; const retY = zoneDirectory[threat.zoneId].reticleY || '50%';
        let transformOrigin = "top left", topOffset = "15px", leftOffset = "15px", rightOffset = "auto", bottomOffset = "auto";
        if (parseFloat(threat.mapX) > 50) { transformOrigin = "top right"; leftOffset = "auto"; rightOffset = "15px"; }
        if (parseFloat(threat.mapY) > 50) { transformOrigin = transformOrigin.replace("top", "bottom"); topOffset = "auto"; bottomOffset = "15px"; }

        let cctvContent = threat.temp > 100 ? `<div class="cctv-offline">SIGNAL LOST<br>THERMAL OVERLOAD</div>` : `<div class="cctv-wrapper ${isCritical ? 'cctv-glitch' : ''}"><img class="cctv-feed" src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80" alt="CCTV Feed"><div class="cctv-scanlines"></div><div class="cctv-overlay"><div class="cctv-rec"><div class="rec-dot"></div> REC</div><div class="cctv-time">CAM_${threat.zoneId.toUpperCase()}</div></div></div>`;

        dynamicNodesContainer.innerHTML += `<div class="map-marker-group" style="top: ${threat.mapY}; left: ${threat.mapX};">
            <div class="pin-label">${threat.zoneId.toUpperCase()}</div>
            <div class="spatial-pin" style="background: ${themeColor}; color: ${themeColor};" onclick="toggleOriginCard('${threat.zoneId}')">${pulseAnim}</div>
            <div class="origin-card ${isOpenClass}" id="origin-card-${threat.zoneId}" style="transform-origin: ${transformOrigin}; top: ${topOffset}; bottom: ${bottomOffset}; left: ${leftOffset}; right: ${rightOffset};">
                <div class="oc-header" style="color: ${themeColor};">${headerText}</div>
                <div class="oc-sub">${threat.alarmLevel}</div>
                <div class="oc-loc-label">LOCATION:</div>
                <div class="oc-loc-text">${threat.locationDetails.replace('<br>', ', ')}</div>
                <div class="mini-map-box" style="background-image: url('${miniMapUrl}');"><div class="target-reticle" style="top: ${retY}; left: ${retX};"></div></div>
                <div class="cctv-container">${cctvContent}</div>
                <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 12px; color: #86868b;">
                    <span>Temp: <strong style="color:${themeColor}">${threat.temp.toFixed(1)}°C</strong></span>
                    <span>Smoke: <strong>${threat.smoke.toFixed(1)}%</strong></span>
                </div>
                ${isCritical ? `<button class="trigger-protocol-btn" onclick="openProtocolModal('${threat.zoneId}')">⚠️ VIEW SURVIVAL PROTOCOL</button>` : ''}
            </div>
        </div>`;
    }

    if (currentSelectedZone) updateRightPanel(activeThreatsGlobal[currentSelectedZone]);
    else updateRightPanel(globalOverview);
    window.updateRoutingLayer();
});

// ==========================================
// 8. MAP CLICKS & TELEGRAM LOGIC
// ==========================================
window.toggleOriginCard = function(zoneId) {
    const clickedCard = document.getElementById('origin-card-' + zoneId);
    const isAlreadyOpen = clickedCard && clickedCard.classList.contains('open');
    document.querySelectorAll('.origin-card.open').forEach(card => card.classList.remove('open'));
    
    if (!isAlreadyOpen) { if(clickedCard) clickedCard.classList.add('open'); currentSelectedZone = zoneId; } 
    else { currentSelectedZone = null; }

    if (currentSelectedZone) updateRightPanel(activeThreatsGlobal[currentSelectedZone]);
    else updateRightPanel({ isGlobal: true, severity: "CRITICAL", temp: zoneHistories["global"].temp[6], smoke: zoneHistories["global"].smoke[6], fireType: "Recalculating Building State...", systemStatus: "BUILDING ALARM ACTIVE", suppressionStatus: "SYSTEMS ACTIVE", sprinklerStatus: "DEPLOYED", evacuationStatus: "FULL EVACUATION", alertStatus: "EMERGENCY SERVICES NOTIFIED" });
    window.updateRoutingLayer();
};

setInterval(() => {
    let targetZone = currentSelectedZone;
    if (!targetZone && worstThreatGlobal) targetZone = worstThreatGlobal.isGlobal ? "global" : worstThreatGlobal.zoneId;
    if (!targetZone || !zoneHistories[targetZone]) return;
    const baseTemp = zoneHistories[targetZone].temp[6];
    let liveAnimatedTemp = Math.max(0, Math.min(baseTemp + ((Math.random() * 1.6) - 50), 180));
    tempGauge.data.datasets[0].data = [liveAnimatedTemp, 180 - liveAnimatedTemp]; tempGauge.update(); 
}, 800); 

async function triggerTelegramAlert(zoneId, threatData) {
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.includes("YOUR_ACTUAL_BOT_TOKEN")) return;
    const message = `🚨 <b>CRITICAL FIRE ALARM</b> 🚨\n\n<b>Zone:</b> ${zoneId.toUpperCase()}\n<b>Location:</b> ${threatData.locationDetails.replace('<br>', ', ')}\n<b>Temp:</b> ${threatData.temp.toFixed(1)}°C\n<b>Smoke:</b> ${threatData.smoke.toFixed(1)}%\n\n<i>System Armed. Evacuation Protocols Initiated.</i>`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`)}`;
    try {
        const response = await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" }) });
        if (response.ok) console.log(`[TELEGRAM SUCCESS] 📱 Alert sent to your phone via Proxy!`);
    } catch (error) { console.error("[TELEGRAM ERROR] Proxy routing failed:", error); }
}

// ==========================================
// 9. DYNAMIC EVACUATION ROUTER (L-SHAPES)
// ==========================================
window.updateRoutingLayer = function() {
    const existingLayer = document.querySelector('.routing-layer');
    if (existingLayer) existingLayer.remove();
    if (!currentSelectedZone || !zoneDirectory[currentSelectedZone]) return;

    const zoneInfo = zoneDirectory[currentSelectedZone];
    const threat = activeThreatsGlobal[currentSelectedZone];
    if (threat && threat.severity === "CRITICAL") return; 

    const startX = parseFloat(zoneInfo.mapX); const startY = parseFloat(zoneInfo.mapY);
    let turnY = startY + 25; if (turnY > 90) turnY = 90;
    const exitX = (startX < 50) ? 0 : 100;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "routing-layer");
    svg.style.position = "absolute"; svg.style.top = "0"; svg.style.left = "0"; svg.style.width = "100%"; svg.style.height = "100%"; svg.style.pointerEvents = "none"; svg.style.zIndex = "10";

    const line1 = document.createElementNS(svgNS, "line");
    line1.setAttribute("x1", `${startX}%`); line1.setAttribute("y1", `${startY}%`); line1.setAttribute("x2", `${startX}%`); line1.setAttribute("y2", `${turnY}%`);
    line1.setAttribute("class", "evac-route-anim"); line1.style.stroke = "#34c759"; line1.style.strokeWidth = "3px"; line1.style.strokeDasharray = "12 12"; line1.style.fill = "none";
    svg.appendChild(line1);

    const line2 = document.createElementNS(svgNS, "line");
    line2.setAttribute("x1", `${startX}%`); line2.setAttribute("y1", `${turnY}%`); line2.setAttribute("x2", `${exitX}%`); line2.setAttribute("y2", `${turnY}%`);
    line2.setAttribute("class", "evac-route-anim"); line2.style.stroke = "#34c759"; line2.style.strokeWidth = "3px"; line2.style.strokeDasharray = "12 12"; line2.style.fill = "none";
    svg.appendChild(line2);

    const mapContainer = document.getElementById('dynamicNodesContainer');
    if (mapContainer) mapContainer.appendChild(svg);
};

// ==========================================
// 10. EMERGENCY SURVIVAL PROTOCOL LOGIC
// ==========================================
window.openProtocolModal = function(zoneId) {
    const modal = document.getElementById('protocol-modal');
    const title = document.getElementById('protocol-zone-title');
    title.innerText = `COMPROMISED SECTOR: ${zoneId.toUpperCase()}`;
    modal.classList.remove('hidden');
};

const closeProtocolBtn = document.getElementById('close-protocol');
if (closeProtocolBtn) {
    closeProtocolBtn.addEventListener('click', () => {
        document.getElementById('protocol-modal').classList.add('hidden');
    });
}

const ackBtn = document.getElementById('ack-btn');
if (ackBtn) {
    ackBtn.addEventListener('click', () => {
        document.getElementById('protocol-modal').classList.add('hidden');
        console.log("[SYSTEM] Admin acknowledged evacuation protocols.");
    });
}

// ==========================================
// 11. PROGRESSIVE WEB APP (PWA) REGISTRATION
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('[PWA] Service Worker registered securely.', registration.scope);
            })
            .catch(error => {
                console.error('[PWA] Service Worker registration failed:', error);
            });
    });
}