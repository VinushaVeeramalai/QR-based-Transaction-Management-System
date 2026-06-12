/* ==========================================================================
   SmartCash ATM Client controller
   ========================================================================== */

// Application State
let currentScreen = 1;
let transactionData = {
    amount: 0,
    accountType: '',
    method: '', // 'Card' or 'QR'
    cardNumber: '',
    userName: ''
};

let pinInput = "";
let customAmountInput = "";
let soundEnabled = true;
let audioCtx = null;

// Initialize System on load
window.addEventListener('DOMContentLoaded', () => {
    // Reset session in backend on start
    resetSession();
    updateCardSlotIndicator('ready');
    generateQRVisual();
});

// Reset Session
function resetSession() {
    fetch('/api/cancel', { method: 'POST' });
    transactionData = { amount: 0, accountType: '', method: '', cardNumber: '', userName: '' };
    pinInput = "";
    customAmountInput = "";
    document.getElementById('amount-input-val').innerText = "0";
    clearPinBullets();
    
    // Reset receipt paper
    document.getElementById('atm-receipt').classList.remove('dispensed');
    
    // Close cash shutter
    document.getElementById('cash-shutter').classList.remove('open');
    document.getElementById('cash-tray').innerHTML = "";
    
    // Set card slot indicator
    updateCardSlotIndicator('ready');
}

// 8 Screen State Machine
function goToScreen(screenIndex) {
    // Play transition sound
    playBeep(60, 600, 'triangle');
    
    // Hide all screens
    const screens = document.querySelectorAll('.screen-state');
    screens.forEach(s => s.classList.remove('active'));
    
    // Show requested screen
    const targetScreen = document.getElementById(`screen-state-${screenIndex}`) || getScreenElementByIndex(screenIndex);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenIndex;
    }

    // Screen dynamic actions
    if (screenIndex === 1) {
        resetSession();
    } else if (screenIndex === 5) {
        // Verification Screen
        const pinPane = document.getElementById('verification-card-pane');
        const qrPane = document.getElementById('verification-qr-pane');
        
        if (transactionData.method === 'Card') {
            pinPane.classList.remove('hidden');
            qrPane.classList.add('hidden');
            pinInput = "";
            clearPinBullets();
        } else {
            pinPane.classList.add('hidden');
            qrPane.classList.remove('hidden');
            generateQRVisual();
        }
    } else if (screenIndex === 6) {
        // Trigger verification simulation
        runVerifyingProcess();
    } else if (screenIndex === 8) {
        // Auto reset to Welcome screen after 4 seconds
        setTimeout(() => {
            if (currentScreen === 8) {
                goToScreen(1);
            }
        }, 4000);
    }
}

// Helper to get screen by number
function getScreenElementByIndex(index) {
    switch(index) {
        case 1: return document.getElementById('screen-welcome');
        case 2: return document.getElementById('screen-amount');
        case 3: return document.getElementById('screen-account-type');
        case 4: return document.getElementById('screen-method');
        case 5: return document.getElementById('screen-verification');
        case 6: return document.getElementById('screen-verifying');
        case 7: return document.getElementById('screen-result');
        case 8: return document.getElementById('screen-thankyou');
        default: return null;
    }
}

// ==========================================================================
// Card Slot & Verification Interactions
// ==========================================================================

function insertDemoCard(cardNumber, holderName) {
    if (currentScreen !== 1) return;
    
    playBeep(120, 480, 'sine');
    updateCardSlotIndicator('loading');
    
    // Call Card Auth API
    fetch('/api/auth/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_number: cardNumber })
    })
    .then(res => {
        if (res.ok) return res.json();
        throw new Error('Card rejected');
    })
    .then(data => {
        if (data.success) {
            transactionData.cardNumber = cardNumber;
            transactionData.userName = data.name;
            
            // Set light to solid blue
            updateCardSlotIndicator('inserted');
            
            // Move to amount input screen
            setTimeout(() => {
                goToScreen(2);
            }, 800);
        }
    })
    .catch(err => {
        updateCardSlotIndicator('error');
        playDeclinedBeep();
        setTimeout(() => {
            updateCardSlotIndicator('ready');
        }, 2000);
    });
}

function insertCustomCard() {
    const cardInput = document.getElementById('custom-card-num');
    const val = cardInput.value;
    if (val.length !== 16 || isNaN(val)) {
        updateCardSlotIndicator('error');
        playDeclinedBeep();
        setTimeout(() => {
            updateCardSlotIndicator('ready');
        }, 2000);
        return;
    }
    insertDemoCard(val, "Valued Customer");
    cardInput.value = "";
}

function updateCardSlotIndicator(state) {
    const light = document.getElementById('card-light');
    const text = document.getElementById('card-slot-instruction');
    
    light.className = 'card-entry-light';
    
    if (state === 'ready') {
        light.classList.add('pulsing');
        text.innerText = "Insert Card";
    } else if (state === 'loading') {
        light.classList.add('pulsing');
        text.innerText = "Reading Card...";
    } else if (state === 'inserted') {
        light.classList.add('inserted');
        text.innerText = "Card Authorized";
    } else if (state === 'error') {
        light.classList.add('error');
        text.innerText = "Invalid Card";
    }
}

// ==========================================================================
// ATM Flow Steps Configuration
// ==========================================================================

// Screen 2: Amount Selection
function quickSelectAmount(val) {
    customAmountInput = val.toString();
    document.getElementById('amount-input-val').innerText = parseFloat(customAmountInput).toLocaleString();
    playBeep(80, 520, 'sine');
}

function confirmAmount() {
    const val = parseFloat(customAmountInput);
    if (!val || val <= 0 || val % 10 !== 0) {
        playDeclinedBeep();
        alert("Please enter a valid amount in multiples of $10.");
        return;
    }
    transactionData.amount = val;
    goToScreen(3); // Go to Account Type
}

// Screen 3: Account Type
function selectAccountType(type) {
    transactionData.accountType = type;
    goToScreen(4); // Go to Choose Method
}

// Screen 4: Choose Method
function selectMethod(method) {
    transactionData.method = method;
    goToScreen(5); // Go to Verification (PIN/QR)
}

// Screen 5: QR Simulation Authentication
function simulateQRScan() {
    const simSelect = document.getElementById('qr-sim-user');
    const [cardNum, pin] = simSelect.value.split('|');
    
    transactionData.cardNumber = cardNum;
    // Store credentials inside withdrawal payload to verify QR simulation
    transactionData.qrPin = pin;
    
    goToScreen(6); // Go to verifying loader
}

// Screen 6: Processing Loader Simulation
function runVerifyingProcess() {
    const statuses = [
        "Connecting to central banking network...",
        "Validating account credentials...",
        "Checking balance and limits...",
        "Authorizing withdrawal...",
        "Preparing cash vault..."
    ];
    
    let currentLogIndex = 0;
    const statusText = document.getElementById('verifying-status');
    
    const statusInterval = setInterval(() => {
        if (currentLogIndex < statuses.length - 1) {
            currentLogIndex++;
            statusText.innerText = statuses[currentLogIndex];
            playBeep(40, 580, 'triangle');
        }
    }, 600);

    // Prepare API Request payload
    let payload = {
        amount: transactionData.amount,
        account_type: transactionData.accountType,
        method: transactionData.method
    };

    if (transactionData.method === 'QR') {
        payload.card_number = transactionData.cardNumber;
        payload.pin = transactionData.qrPin;
    }

    // Call withdrawal API
    fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        clearInterval(statusInterval);
        setTimeout(() => {
            showResult(data);
        }, 1200);
    })
    .catch(err => {
        clearInterval(statusInterval);
        showResult({ success: false, message: "System error connection timed out." });
    });
}

// Screen 7: Result Output
function showResult(data) {
    const successPane = document.getElementById('result-success-pane');
    const failedPane = document.getElementById('result-failed-pane');
    
    successPane.classList.add('hidden');
    failedPane.classList.add('hidden');
    
    if (data.success) {
        successPane.classList.remove('hidden');
        
        // Populate Receipt Info
        document.getElementById('receipt-user').innerText = data.transaction.user_name;
        document.getElementById('receipt-amount').innerText = `$${data.transaction.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('receipt-account').innerText = data.transaction.account_type;
        document.getElementById('receipt-method').innerText = data.transaction.method;
        document.getElementById('receipt-balance').innerText = `$${data.transaction.new_balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('receipt-time').innerText = data.transaction.timestamp;
        
        // Dispense hardware elements
        dispenseCash(data.transaction.amount);
        dispenseReceipt();
        playSuccessBeep();
        
    } else {
        failedPane.classList.remove('hidden');
        document.getElementById('result-error-msg').innerText = data.message;
        playDeclinedBeep();
    }
    
    goToScreen(7);
}

// Cancel Transaction
function cancelTransaction() {
    playDeclinedBeep();
    goToScreen(1);
}

// ==========================================================================
// Peripheral Animations (Cash Dispensing & Receipts)
// ==========================================================================

function dispenseCash(amount) {
    const shutter = document.getElementById('cash-shutter');
    const tray = document.getElementById('cash-tray');
    
    // Open Shutter
    shutter.classList.add('open');
    
    // Play cash dispensing mechanical sound
    playMotorSound();
    
    // Generate bill graphics
    // Dispense up to 5 bills depending on amount (e.g., in $20/$50 bills)
    const billCount = Math.min(Math.ceil(amount / 50), 5);
    
    tray.innerHTML = "";
    
    for (let i = 0; i < billCount; i++) {
        setTimeout(() => {
            const bill = document.createElement('div');
            bill.className = 'cash-bill';
            // Offset angles to look like a messy pile of cash
            const rot = (Math.random() * 8 - 4).toFixed(1);
            const skew = (Math.random() * 6 - 3).toFixed(1);
            bill.style.transform = `rotate(${rot}deg) skew(${skew}deg)`;
            
            bill.innerHTML = `
                <div class="bill-border" onclick="collectCash(this)">
                    <span>$</span>
                    <div class="bill-center">
                        <i class="fa-solid fa-money-bill-wave"></i>
                        <div>SMARTCASH</div>
                    </div>
                    <span>$</span>
                </div>
            `;
            
            tray.appendChild(bill);
            
            // Force browser reflow to trigger CSS transitions
            bill.offsetHeight;
            bill.classList.add('ejected');
            
            playBeep(100, 350, 'square'); // quick flutter
        }, i * 200);
    }
}

function collectCash(billElement) {
    const bill = billElement.closest('.cash-bill');
    bill.classList.remove('ejected');
    bill.classList.add('collected');
    
    // Register Cha-ching Sound
    playCashRegisterSound();
    
    setTimeout(() => {
        bill.remove();
        // If tray is empty, close the shutter
        const tray = document.getElementById('cash-tray');
        if (tray.children.length === 0) {
            document.getElementById('cash-shutter').classList.remove('open');
        }
    }, 1000);
}

function dispenseReceipt() {
    const paper = document.getElementById('atm-receipt');
    setTimeout(() => {
        paper.classList.add('dispensed');
        // Click to pull paper
        paper.onclick = () => {
            paper.classList.remove('dispensed');
            playBeep(100, 700, 'triangle');
        };
    }, 1500);
}

// ==========================================================================
// Virtual & Hardware Inputs Controllers
// ==========================================================================

// Map side buttons depending on current active screen
function pressSideButton(side, index) {
    if (currentScreen === 2) {
        // Amount Selection options
        if (side === 'left') {
            if (index === 1) quickSelectAmount(20);
            if (index === 2) quickSelectAmount(50);
            if (index === 3) quickSelectAmount(100);
        } else {
            if (index === 1) quickSelectAmount(200);
            if (index === 2) quickSelectAmount(500);
            if (index === 3) confirmAmount();
        }
    } else if (currentScreen === 3) {
        // Account Type options
        if (side === 'left') {
            if (index === 1) selectAccountType('Savings');
            if (index === 2) selectAccountType('Checking');
        } else {
            if (index === 1) selectAccountType('Credit');
        }
    }
}

// Physical numerical keypad keys
function pressKeypad(key) {
    playBeep(80, 500, 'sine');
    
    if (currentScreen === 2) {
        // Enter Amount Screen
        if (key === 'clear') {
            customAmountInput = "";
            document.getElementById('amount-input-val').innerText = "0";
        } else if (key === 'cancel') {
            cancelTransaction();
        } else if (key === 'enter') {
            confirmAmount();
        } else if (!isNaN(key)) {
            // Cap custom withdrawal amount at $10,000 for sanity
            if (customAmountInput.length < 5) {
                customAmountInput += key;
                document.getElementById('amount-input-val').innerText = parseFloat(customAmountInput).toLocaleString();
            }
        }
    } else if (currentScreen === 5 && transactionData.method === 'Card') {
        // PIN Entry Screen
        if (key === 'clear') {
            pinInput = "";
            clearPinBullets();
        } else if (key === 'cancel') {
            cancelTransaction();
        } else if (key === 'enter') {
            submitPIN();
        } else if (!isNaN(key)) {
            if (pinInput.length < 4) {
                pinInput += key;
                fillPinBullets(pinInput.length);
                if (pinInput.length === 4) {
                    // Automatically submit PIN on 4 digits for swift interaction
                    setTimeout(submitPIN, 400);
                }
            }
        }
    }
}

// PIN operations
function fillPinBullets(length) {
    clearPinBullets();
    for (let i = 1; i <= length; i++) {
        document.getElementById(`bullet-${i}`).classList.add('filled');
    }
}
function clearPinBullets() {
    for (let i = 1; i <= 4; i++) {
        const bullet = document.getElementById(`bullet-${i}`);
        if (bullet) bullet.classList.remove('filled');
    }
}

function submitPIN() {
    if (pinInput.length !== 4) {
        playDeclinedBeep();
        return;
    }
    
    // Call PIN Authentication API
    fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
    })
    .then(res => {
        if (res.ok) return res.json();
        throw new Error('Incorrect PIN');
    })
    .then(data => {
        if (data.success) {
            goToScreen(6); // Go to verifying loader
        }
    })
    .catch(err => {
        playDeclinedBeep();
        clearPinBullets();
        pinInput = "";
        
        // Flash slot red
        const light = document.getElementById('card-light');
        light.className = 'card-entry-light error';
        setTimeout(() => {
            light.className = 'card-entry-light inserted';
        }, 1500);
        
        alert("Incorrect PIN. Please try again.");
    });
}

// Generate stylized vector block graphic for simulated QR
function generateQRVisual() {
    const graphic = document.getElementById('qr-graphic');
    if (!graphic) return;
    
    // Generates a grid representing a QR Code
    let html = `<div style="display:grid; grid-template-columns: repeat(21, 1fr); width:100%; height:100%; background:#fff; gap:1.5px; padding:2px;">`;
    
    // Pre-calculated index grids representing finder patterns
    const finderPatterns = [
        // Top Left finder
        0,1,2,3,4,5,6, 21,27, 42,44,45,46,48, 63,65,66,67,69, 84,90, 105,106,107,108,109,110,111,
        // Top Right finder
        14,15,16,17,18,19,20, 35,41, 56,58,59,60,62, 77,79,80,81,83, 98,104, 119,120,121,122,123,124,125,
        // Bottom Left finder
        294,295,296,297,298,299,300, 315,321, 336,338,339,340,342, 357,359,360,361,363, 378,384, 399,400,401,402,403,404,405
    ];
    
    for (let i = 0; i < 441; i++) {
        let isBlack = Math.random() > 0.45;
        
        // Force finder patterns
        const row = Math.floor(i / 21);
        const col = i % 21;
        
        // Top-left finder (7x7)
        if (row < 7 && col < 7) {
            isBlack = (row === 0 || row === 6 || col === 0 || col === 6 || (row >= 2 && row <= 4 && col >= 2 && col <= 4));
        }
        // Top-right finder (7x7)
        else if (row < 7 && col >= 14) {
            isBlack = (row === 0 || row === 6 || col === 14 || col === 20 || (row >= 2 && row <= 4 && col >= 16 && col <= 18));
        }
        // Bottom-left finder (7x7)
        else if (row >= 14 && col < 7) {
            isBlack = (row === 14 || row === 20 || col === 0 || col === 6 || (row >= 16 && row <= 18 && col >= 2 && col <= 4));
        }
        
        html += `<div style="background-color: ${isBlack ? '#000' : '#fff'}; border-radius: 1px;"></div>`;
    }
    
    html += `</div>`;
    graphic.innerHTML = html;
}

// ==========================================================================
// Web Audio API Sound Generator
// ==========================================================================

function toggleAudio() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('audio-toggle');
    if (soundEnabled) {
        btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> ATM Sounds: ON`;
        btn.style.color = '#fff';
    } else {
        btn.innerHTML = `<i class="fa-solid fa-volume-xmark"></i> ATM Sounds: OFF`;
        btn.style.color = '#718096';
    }
}

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playBeep(duration = 80, frequency = 500, type = 'sine') {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + duration/1000);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration/1000);
    } catch(e) {
        // Fallback or ignored browser permissions blocks
    }
}

function playDeclinedBeep() {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(140, now + 0.1);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(now + 0.25);
    } catch(e) {}
}

function playSuccessBeep() {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        const now = audioCtx.currentTime;
        
        const playTone = (freq, start, dur) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(0.08, now + start);
            gain.gain.exponentialRampToValueAtTime(0.005, now + start + dur);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + start);
            osc.stop(now + start + dur);
        };
        
        playTone(523.25, 0, 0.1); // C5
        playTone(659.25, 0.1, 0.1); // E5
        playTone(783.99, 0.2, 0.15); // G5
        playTone(1046.50, 0.35, 0.3); // C6
    } catch(e) {}
}

function playMotorSound() {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        const now = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(80, now);
        osc1.frequency.linearRampToValueAtTime(120, now + 0.5);
        osc1.frequency.linearRampToValueAtTime(100, now + 1.2);
        
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(82, now);
        osc2.frequency.linearRampToValueAtTime(122, now + 0.5);
        osc2.frequency.linearRampToValueAtTime(102, now + 1.2);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
    } catch(e) {}
}

function playCashRegisterSound() {
    if (!soundEnabled) return;
    try {
        initAudioContext();
        const now = audioCtx.currentTime;
        
        // Bell sound
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(now + 0.4);
        
        // Quick shuffle sound
        const noise = audioCtx.createOscillator();
        const noiseGain = audioCtx.createGain();
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(200, now);
        noise.frequency.linearRampToValueAtTime(80, now + 0.1);
        noiseGain.gain.setValueAtTime(0.08, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        noise.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noise.start();
        noise.stop(now + 0.15);
    } catch(e) {}
}
