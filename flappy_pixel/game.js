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
    playFlap() {
        if (!this.init || this.isMuted) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }
    playScore() {
        if (!this.init || this.isMuted) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    }
    playHit() {
        if (!this.init || this.isMuted) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.5);
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
        this.state = 'menu';
        this.score = 0;
        this.bird = { y: 200, vy: 0, r: 8 };
        this.pipes = [];
        this.pipeTimer = 0;
        
        window.addEventListener('keydown', e => {
            if (e.code === 'Space') {
                e.preventDefault();
                if(this.state === 'playing') { this.bird.vy = -300; audio.playFlap(); }
            }
        });

        document.getElementById('startBtn').onclick = () => { audio.setup(); audio.resume(); this.startGame(); };
        document.getElementById('retryBtn').onclick = () => { audio.resume(); this.startGame(); };
        const muteBtn = document.getElementById('muteBtn');
        muteBtn.onclick = () => { muteBtn.innerText = audio.toggleMute() ? "AUDIO: OFF" : "AUDIO: ON"; };

        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    startGame() {
        this.score = 0;
        this.bird.y = 200; this.bird.vy = 0;
        this.pipes = [];
        this.pipeTimer = 0;
        this.state = 'playing';
        document.getElementById('scoreDisplay').innerText = this.score;
        document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
        document.getElementById('hud').classList.add('active');
    }

    loop(time) {
        requestAnimationFrame(this.loop.bind(this));
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        if (this.state === 'playing') {
            // Bird physics
            this.bird.vy += 1000 * dt; // Gravity
            this.bird.y += this.bird.vy * dt;

            // Pipes
            this.pipeTimer += dt;
            if(this.pipeTimer > 1.5) {
                this.pipeTimer = 0;
                const gapY = Math.random() * 200 + 100;
                this.pipes.push({ x: 300, gapY: gapY, passed: false });
            }

            for(let i=this.pipes.length-1; i>=0; i--) {
                let p = this.pipes[i];
                p.x -= 150 * dt;
                
                // Collision
                const pWidth = 40; const gapSize = 100;
                if(100 + this.bird.r > p.x && 100 - this.bird.r < p.x + pWidth) {
                    if(this.bird.y - this.bird.r < p.gapY - gapSize/2 || this.bird.y + this.bird.r > p.gapY + gapSize/2) {
                        this.die();
                    }
                }
                
                // Score
                if(!p.passed && p.x + pWidth < 100) {
                    p.passed = true;
                    this.score++;
                    document.getElementById('scoreDisplay').innerText = this.score;
                    audio.playScore();
                }
                
                if(p.x < -pWidth) this.pipes.splice(i, 1);
            }

            // Floor / Ceiling
            if(this.bird.y > 400 || this.bird.y < 0) this.die();
        }

        this.draw();
    }

    die() {
        this.state = 'dead'; audio.playHit();
        setTimeout(() => {
            document.getElementById('finalScore').innerText = this.score;
            document.getElementById('game-over').classList.add('active');
        }, 1000);
    }

    draw() {
        ctx.fillStyle = '#71c5cf'; ctx.fillRect(0, 0, canvas.width, canvas.height); // Sky
        
        if(this.state === 'playing' || this.state === 'dead') {
            // Pipes
            ctx.fillStyle = '#74bf2e';
            const gapSize = 100; const pWidth = 40;
            this.pipes.forEach(p => {
                ctx.fillRect(p.x, 0, pWidth, p.gapY - gapSize/2);
                ctx.fillRect(p.x, p.gapY + gapSize/2, pWidth, 400);
                
                // Pipe caps
                ctx.fillStyle = '#558c22';
                ctx.fillRect(p.x-2, p.gapY - gapSize/2 - 20, pWidth+4, 20);
                ctx.fillRect(p.x-2, p.gapY + gapSize/2, pWidth+4, 20);
                ctx.fillStyle = '#74bf2e';
            });
            
            // Bird
            ctx.save();
            ctx.translate(100, this.bird.y);
            ctx.rotate(Math.min(Math.PI/4, Math.max(-Math.PI/4, this.bird.vy * 0.005)));
            ctx.fillStyle = '#f2b322';
            ctx.fillRect(-this.bird.r, -this.bird.r, this.bird.r*2, this.bird.r*2); // Body
            ctx.fillStyle = '#fff'; ctx.fillRect(2, -4, 4, 4); // Eye
            ctx.fillStyle = '#000'; ctx.fillRect(4, -2, 2, 2); // Pupil
            ctx.fillStyle = '#f25022'; ctx.fillRect(this.bird.r, 0, 6, 4); // Beak
            ctx.restore();
            
            // Ground (animated)
            ctx.fillStyle = '#ded895';
            ctx.fillRect(0, 380, 300, 20);
            ctx.fillStyle = '#73bf2e';
            ctx.fillRect(0, 380, 300, 5);
        }
    }
}
window.onload = () => new Game();
