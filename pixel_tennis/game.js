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
    playHit() {
        if (!this.init || this.isMuted) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }
    playScore() {
        if (!this.init || this.isMuted) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.8, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(this.ctx.currentTime + 0.5);
    }
}
const audio = new Chiptune();

// --- Game Logic ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 300; canvas.height = 400;

class Game {
    constructor() {
        this.state = 'menu'; this.score = 0; this.aiScore = 0;
        this.player = { x: 150, y: 350, w: 20, h: 20, speed: 150, swing: 0 };
        this.ai = { x: 150, y: 50, w: 20, h: 20, speed: 100 };
        this.ball = { x: 150, y: 200, vx: 0, vy: 150, r: 4 };
        this.keys = {};
        
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
            if (e.code === 'Space' && this.state === 'playing') { this.player.swing = 0.2; }
        });
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        document.getElementById('startBtn').onclick = () => { audio.setup(); audio.resume(); this.startGame(); };
        document.getElementById('retryBtn').onclick = () => { audio.resume(); this.startGame(); };
        const muteBtn = document.getElementById('muteBtn');
        muteBtn.onclick = () => { muteBtn.innerText = audio.toggleMute() ? "AUDIO: OFF" : "AUDIO: ON"; };

        this.lastTime = performance.now(); requestAnimationFrame(this.loop.bind(this));
    }

    startGame() {
        this.score = 0; this.aiScore = 0;
        this.resetBall(1);
        this.state = 'playing'; document.getElementById('scoreDisplay').innerText = `${this.aiScore} - ${this.score}`;
        document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
        document.getElementById('hud').classList.add('active');
    }

    resetBall(dir) {
        this.ball = { x: 150, y: 200, vx: (Math.random()*100 - 50), vy: 150 * dir, r: 4 };
    }

    loop(time) {
        requestAnimationFrame(this.loop.bind(this));
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        if (this.state === 'playing') {
            // Player Movement
            if (this.keys['ArrowLeft']) this.player.x -= this.player.speed * dt;
            if (this.keys['ArrowRight']) this.player.x += this.player.speed * dt;
            if (this.keys['ArrowUp']) this.player.y -= this.player.speed * dt;
            if (this.keys['ArrowDown']) this.player.y += this.player.speed * dt;
            
            this.player.x = Math.max(0, Math.min(300-this.player.w, this.player.x));
            this.player.y = Math.max(200, Math.min(400-this.player.h, this.player.y)); // Bottom half
            if(this.player.swing > 0) this.player.swing -= dt;

            // AI Movement
            if(this.ball.vy < 0) { // Ball moving to AI
                if (this.ai.x + this.ai.w/2 < this.ball.x - 10) this.ai.x += this.ai.speed * dt;
                if (this.ai.x + this.ai.w/2 > this.ball.x + 10) this.ai.x -= this.ai.speed * dt;
            } else { // Return to center
                if (this.ai.x + this.ai.w/2 < 140) this.ai.x += this.ai.speed * dt;
                if (this.ai.x + this.ai.w/2 > 160) this.ai.x -= this.ai.speed * dt;
            }
            this.ai.x = Math.max(0, Math.min(300-this.ai.w, this.ai.x));

            // Ball Physics
            this.ball.x += this.ball.vx * dt;
            this.ball.y += this.ball.vy * dt;

            if(this.ball.x < 0 || this.ball.x > 300) { this.ball.vx *= -1; audio.playHit(); }

            // Player hit
            if (this.ball.vy > 0 && this.player.swing > 0 && Math.abs(this.ball.x - (this.player.x + this.player.w/2)) < 30 && Math.abs(this.ball.y - (this.player.y + this.player.h/2)) < 30) {
                this.ball.vy *= -1.1;
                this.ball.vx += (this.ball.x - (this.player.x + this.player.w/2)) * 5;
                audio.playHit(); this.player.swing = 0;
            }

            // AI Hit
            if (this.ball.vy < 0 && Math.abs(this.ball.x - (this.ai.x + this.ai.w/2)) < 20 && Math.abs(this.ball.y - (this.ai.y + this.ai.h/2)) < 20) {
                this.ball.vy *= -1.1;
                this.ball.vx += (this.ball.x - (this.ai.x + this.ai.w/2)) * 5;
                audio.playHit();
            }

            // Score
            if(this.ball.y < 0) { this.score++; audio.playScore(); this.resetBall(1); }
            if(this.ball.y > 400) { this.aiScore++; audio.playScore(); this.resetBall(-1); }

            document.getElementById('scoreDisplay').innerText = `${this.aiScore} - ${this.score}`;

            if(this.score >= 5 || this.aiScore >= 5) {
                this.state = 'dead';
                setTimeout(() => {
                    document.getElementById('finalScore').innerText = this.score >= 5 ? 'YOU WIN!' : 'YOU LOSE';
                    document.getElementById('game-over').classList.add('active');
                }, 1000);
            }
        }

        this.draw();
    }

    draw() {
        ctx.fillStyle = '#00aa00'; ctx.fillRect(0, 0, canvas.width, canvas.height); // Grass
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, 260, 360); // Court
        ctx.beginPath(); ctx.moveTo(20, 200); ctx.lineTo(280, 200); ctx.stroke(); // Net

        if (this.state === 'playing' || this.state === 'dead') {
            // Player
            ctx.fillStyle = '#0000ff'; ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
            if(this.player.swing > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(this.player.x + 10, this.player.y - 10, 5, 20); } // Racket
            
            // AI
            ctx.fillStyle = '#ff0000'; ctx.fillRect(this.ai.x, this.ai.y, this.ai.w, this.ai.h);
            
            // Ball
            ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI*2); ctx.fill();
        }
    }
}
window.onload = () => new Game();
