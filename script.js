document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    const labelEl = document.getElementById('label');

    // --- URL Parameter Parser ---
    function parseURLParams() {
        const params = new URLSearchParams(window.location.search);
        let labelText = params.get('label');
        let labelColorParam = params.get('label-color');
        let timerColorParam = params.get('color');
        let flashEnabled = params.get('flash');
        let labelSize = params.get('size');
        let timerStartOnly = params.get('timer-start');
        let startTimeParam = params.get('start-time'); // NEW PARAMETER

        // 1. Handle Label Text
        if (labelText) {
            labelText = decodeURIComponent(labelText);
            labelEl.textContent = labelText;
            labelEl.classList.add('visible');
        }

        // 2. Handle Timer Color
        if (timerColorParam) {
            timerColorParam = timerColorParam.replace('#', '');
            if (/^[0-9A-Fa-f]{6}$/.test(timerColorParam)) {
                const hexColor = `#${timerColorParam}`;
                document.documentElement.style.setProperty('--theme-color', hexColor);
                document.body.style.textShadow = `0 0 30px ${hexColor}33`;
            }
        }

        // 3. Handle Label Color
        if (labelColorParam) {
            labelColorParam = labelColorParam.replace('#', '');
            if (/^[0-9A-Fa-f]{6}$/.test(labelColorParam)) {
                labelEl.style.color = `#${labelColorParam}`;
            }
        }

        // 4. Handle Size
        if (labelSize) {
            const parsedSize = parseInt(labelSize, 10);
            if (!isNaN(parsedSize) && parsedSize > 0) {
                labelEl.style.fontSize = `${parsedSize}px`;
            } else {
                labelEl.style.fontSize = `32px`; 
            }
        }

        // 5. Handle Flash
        if (flashEnabled !== null && flashEnabled !== 'false') {
            labelEl.dataset.flashEnabled = 'true';
        }

        // 6. Handle Timer-Start Only
        if (timerStartOnly !== null && timerStartOnly !== 'false') {
            labelEl.dataset.timerStartOnly = 'true';
            labelEl.style.opacity = '0';
        }

        // 7. Handle Start-Time (NEW: seconds based input)
        if (startTimeParam) {
            const seconds = parseInt(startTimeParam, 10);
            if (!isNaN(seconds) && seconds >= 0) {
                // Convert seconds to milliseconds
                totalMillis = seconds * 1000;
                totalStartMillis = totalMillis;
                // Automatically start the timer
                setTimeout(() => startTimer(), 100); // Small delay to ensure DOM is ready
            }
        }
    }
    
    parseURLParams();

    // --- Timer Logic ---

    let totalMillis = 0; 
    let totalStartMillis = 0;
    let cursorIndex = 0;
    let isSetting = false;
    
    let state = 'idle';
    let intervalId = null;

    // --- Flash Logic Manager ---
    function manageFlashState() {
        const flashEnabled = labelEl.dataset.flashEnabled === 'true';
        const timerStartOnly = labelEl.dataset.timerStartOnly === 'true';

        labelEl.classList.remove('flash');
        labelEl.style.opacity = '1'; 

        if (!flashEnabled) return;

        if (timerStartOnly) {
            const isTimeChanged = totalMillis < totalStartMillis;
            const isActive = (state === 'running' || (state === 'paused' && isTimeChanged));

            if (isActive) {
                labelEl.style.opacity = '1'; 
                labelEl.classList.add('flash');
            } else {
                labelEl.style.opacity = '0';
            }
        } else {
            labelEl.classList.add('flash');
        }
    }

    // --- Rendering Logic ---

    function render() {
        let ms = totalMillis;
        if (ms < 0) ms = 0;

        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const remainingMs = ms % 1000;

        let digits = [
            Math.floor(h / 10), 
            h % 10,             
            Math.floor(m / 10), 
            m % 10,             
            Math.floor(s / 10), 
            s % 10              
        ];

        const msStr = remainingMs.toString().padStart(3, '0');

        let html = `
            <span class="digit-pair">
                <span id="d0">${digits[0]}</span><span id="d1">${digits[1]}</span>
            </span>
            <span class="separator-colon">:</span>
            <span class="digit-pair">
                <span id="d2">${digits[2]}</span><span id="d3">${digits[3]}</span>
            </span>
            <span class="separator-colon">:</span>
            <span class="digit-pair">
                <span id="d4">${digits[4]}</span><span id="d5">${digits[5]}</span>
            </span>
            <span class="separator-ms">.</span>
            <span class="ms-part">${msStr}</span>
        `;
        
        display.innerHTML = html;

        if (isSetting) {
            const currentDigitEl = document.getElementById(`d${cursorIndex}`);
            for(let i=0; i<6; i++) {
                document.getElementById(`d${i}`).classList.remove('blink');
            }
            if(currentDigitEl) currentDigitEl.classList.add('blink');
        } else {
            for(let i=0; i<6; i++) {
                document.getElementById(`d${i}`).classList.remove('blink');
            }
        }

        manageFlashState();
    }

    // --- Core Math Logic ---

    function incrementDigit() {
        let totalSeconds = Math.floor(totalMillis / 1000);
        let h = Math.floor(totalSeconds / 3600);
        let m = Math.floor((totalSeconds % 3600) / 60);
        let s = totalSeconds % 60;

        let digits = [
            Math.floor(h / 10), h % 10,
            Math.floor(m / 10), m % 10,
            Math.floor(s / 10), s % 10
        ];

        if (cursorIndex === 0) {
            digits[0] = (digits[0] + 1) % 10;
        } else if (cursorIndex === 2 || cursorIndex === 4) {
            digits[cursorIndex] = (digits[cursorIndex] + 1);
            if (digits[cursorIndex] > 5) digits[cursorIndex] = 0;
        } else {
            digits[cursorIndex] = (digits[cursorIndex] + 1) % 10;
        }

        h = digits[0] * 10 + digits[1];
        m = digits[2] * 10 + digits[3];
        s = digits[4] * 10 + digits[5];
        const remainingMs = totalMillis % 1000;
        totalMillis = (h * 3600000) + (m * 60000) + (s * 1000) + remainingMs;
        totalStartMillis = totalMillis; 
        
        render();
    }

    function decrementDigit() {
        let totalSeconds = Math.floor(totalMillis / 1000);
        let h = Math.floor(totalSeconds / 3600);
        let m = Math.floor((totalSeconds % 3600) / 60);
        let s = totalSeconds % 60;

        let digits = [
            Math.floor(h / 10), h % 10,
            Math.floor(m / 10), m % 10,
            Math.floor(s / 10), s % 10
        ];

        if (cursorIndex === 0) {
            digits[0] = (digits[0] - 1 + 10) % 10;
        } else if (cursorIndex === 2 || cursorIndex === 4) {
            digits[cursorIndex] = (digits[cursorIndex] - 1);
            if (digits[cursorIndex] < 0) digits[cursorIndex] = 5;
        } else {
            digits[cursorIndex] = (digits[cursorIndex] - 1 + 10) % 10;
        }

        h = digits[0] * 10 + digits[1];
        m = digits[2] * 10 + digits[3];
        s = digits[4] * 10 + digits[5];
        const remainingMs = totalMillis % 1000;
        totalMillis = (h * 3600000) + (m * 60000) + (s * 1000) + remainingMs;
        totalStartMillis = totalMillis; 
        
        render();
    }

    // --- Timer Logic ---

    function startTimer() {
        if (state === 'running') return;
        if (totalMillis === 0 && state !== 'paused') return;

        if (state === 'idle') {
            totalStartMillis = totalMillis;
        }

        if (isSetting) {
            isSetting = false;
        }

        state = 'running';
        let lastTimestamp = performance.now();

        intervalId = setInterval(() => {
            const now = performance.now();
            const delta = now - lastTimestamp;
            lastTimestamp = now;

            totalMillis -= delta;

            if (totalMillis <= 0) {
                totalMillis = 0;
                clearInterval(intervalId);
                state = 'idle';
                render();
                return;
            }
            render();
        }, 10);
    }

    function pauseTimer() {
        if (state === 'running') {
            clearInterval(intervalId);
            state = 'paused';
            render(); 
        } else if (state === 'paused') {
            lastTimestamp = performance.now();
            startTimer();
        }
    }

    function resetTimer() {
        clearInterval(intervalId);
        state = 'idle';
        isSetting = false;
        totalMillis = totalStartMillis; 
        render(); 
    }

    // --- Keyboard Controls ---

    document.addEventListener('keydown', (e) => {
        const key = e.key;

        if (key === 's' || key === 'S') {
            e.preventDefault();
            if (state === 'running' || state === 'paused') return; 

            isSetting = !isSetting;
            if (isSetting) {
                cursorIndex = 0;
            }
            render();
            return;
        }

        if (isSetting) {
            e.preventDefault(); 
            
            if (key === 'ArrowLeft' && cursorIndex > 0) {
                cursorIndex--;
                render();
            } else if (key === 'ArrowRight' && cursorIndex < 5) {
                cursorIndex++;
                render();
            } else if (key === 'ArrowUp') {
                incrementDigit();
            } else if (key === 'ArrowDown') {
                decrementDigit();
            } 
            return;
        }

        if (key === ' ') {
            e.preventDefault();
            if (state === 'running' || state === 'paused') {
                pauseTimer();
            } else if (state === 'idle') {
                startTimer();
            }
        }

        if ((key === 'r' || key === 'R')) {
            resetTimer();
        }
    });

    render();
});
