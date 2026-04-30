// --- 8-Bit Audio Engine ---
class Chiptune {
    constructor() { this.ctx = null; this.master = null; this.isMuted = false; this.init = false; }
    setup() {
        if (this.init) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.3;
        this.master.connect(this.ctx.destination); this.init = true;
    }
    resume() { if (this.ctx) this.ctx.resume(); }
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.master) this.master.gain.value = this.isMuted ? 0 : 0.3;
        return this.isMuted;
    }
    playKick() {
        if (!this.init || this.isMuted) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.8, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }
    playCheer() {
        if (!this.init || this.isMuted) return;
        const bufferSize = this.ctx.sampleRate * 1.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 800;
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.2);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);
        noise.connect(filter); filter.connect(gain); gain.connect(this.master); noise.start();
    }
    playWhistle() {
        if (!this.init || this.isMuted) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime); gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(this.ctx.currentTime + 0.3);
    }
}
const audio = new Chiptune();

// --- Game Logic ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 300;

class Game {
    constructor() {
        this.state = 'menu'; this.score = 0; this.attempts = 5;
        this.ball = null; this.goalie = { x: 180, y: 100, w: 40, h: 40, speed: 150, dir: 1 };
        this.aimX = 200; this.aimDir = 1;
        this.keys = {};
        
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.state === 'playing' && !this.ball) this.kick();
            }
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        document.getElementById('startBtn').onclick = () => { audio.setup(); audio.resume(); this.startGame(); };
        document.getElementById('retryBtn').onclick = () => { audio.resume(); this.startGame(); };
        const muteBtn = document.getElementById('muteBtn');
        muteBtn.onclick = () => { muteBtn.innerText = audio.toggleMute() ? "AUDIO: OFF" : "AUDIO: ON"; };

        this.lastTime = performance.now(); requestAnimationFrame(this.loop.bind(this));
    }

    startGame() {
        this.score = 0; this.attempts = 5; this.ball = null;
        this.state = 'playing'; document.getElementById('scoreDisplay').innerText = `GOALS: ${this.score}/${this.attempts}`;
        document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
        document.getElementById('hud').classList.add('active');
        audio.playWhistle();
    }

    kick() {
        audio.playKick();
        const destX = this.aimX;
        this.ball = { x: 200, y: 260, targetX: destX, targetY: 100, progress: 0 };
    }

    loop(time) {
        requestAnimationFrame(this.loop.bind(this));
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        if (this.state === 'playing') {
            // Goalie logic
            this.goalie.x += this.goalie.speed * this.goalie.dir * dt;
            if (this.goalie.x > 260) { this.goalie.x = 260; this.goalie.dir = -1; }
            if (this.goalie.x < 100) { this.goalie.x = 100; this.goalie.dir = 1; }

            if (!this.ball) {
                // Aiming
                this.aimX += 300 * this.aimDir * dt;
                if(this.aimX > 320) { this.aimX = 320; this.aimDir = -1; }
                if(this.aimX < 80) { this.aimX = 80; this.aimDir = 1; }
            } else {
                // Ball travel
                this.ball.progress += 2 * dt;
                if (this.ball.progress >= 1.0) {
                    this.ball.progress = 1.0;
                    this.attempts--;
                    
                    // Check collision with goalie
                    const bx = this.ball.targetX;
                    const by = this.ball.targetY;
                    if (bx > this.goalie.x - 10 && bx < this.goalie.x + this.goalie.w + 10 && by > this.goalie.y - 10 && by < this.goalie.y + this.goalie.h + 10) {
                        // Saved!
                        audio.playKick(); // Thud
                    } else if (bx > 100 && bx < 300) {
                        // Goal!
                        this.score++; audio.playCheer();
                    } else {
                        // Miss
                        audio.playWhistle();
                    }
                    
                    document.getElementById('scoreDisplay').innerText = `GOALS: ${this.score} LEFT: ${this.attempts}`;
                    
                    if(this.attempts <= 0) {
                        this.state = 'dead';
                        setTimeout(() => {
                            document.getElementById('finalScore').innerText = `${this.score} / 5`;
                            document.getElementById('game-over').classList.add('active');
                        }, 1500);
                    } else {
                        setTimeout(() => { this.ball = null; this.goalie.speed += 20; }, 1000);
                    }
                    this.ball.progress = 1.1; // Freeze ball
                }
            }
        }

        this.draw();
    }

    draw() {
        ctx.fillStyle = '#006600'; ctx.fillRect(0, 0, canvas.width, canvas.height); // Grass
        
        // Goal Net
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
        ctx.strokeRect(100, 60, 200, 100);
        ctx.lineWidth = 1; ctx.strokeStyle = '#888';
        for(let i=100; i<300; i+=10) { ctx.beginPath(); ctx.moveTo(i, 60); ctx.lineTo(i, 160); ctx.stroke(); }
        for(let i=60; i<160; i+=10) { ctx.beginPath(); ctx.moveTo(100, i); ctx.lineTo(300, i); ctx.stroke(); }

        // Penalty Box
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
        ctx.strokeRect(50, 160, 300, 140);
        ctx.beginPath(); ctx.arc(200, 260, 5, 0, Math.PI*2); ctx.fill(); // Penalty spot

        if (this.state === 'playing' || this.state === 'dead') {
            // Goalie
            ctx.fillStyle = '#ff0000'; ctx.fillRect(this.goalie.x, this.goalie.y, this.goalie.w, this.goalie.h);

            if (!this.ball) {
                // Aim target
                ctx.fillStyle = '#ffff00'; ctx.fillRect(this.aimX - 5, 100, 10, 10);
                // Ball on spot
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(200, 260, 10, 0, Math.PI*2); ctx.fill();
            } else {
                // Flying ball (scales down as it flies)
                if(this.ball.progress <= 1.0) {
                    const bx = 200 + (this.ball.targetX - 200) * this.ball.progress;
                    const by = 260 + (this.ball.targetY - 260) * this.ball.progress - Math.sin(this.ball.progress * Math.PI) * 50; // arc
                    const size = 10 - (this.ball.progress * 5);
                    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, size, 0, Math.PI*2); ctx.fill();
                } else {
                    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.ball.targetX, this.ball.targetY, 5, 0, Math.PI*2); ctx.fill();
                }
            }
        }
    }
}
window.onload = () => new Game();
