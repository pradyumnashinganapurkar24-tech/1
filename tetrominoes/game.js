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
    playDrop() {
        if (!this.init || this.isMuted) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }
    playClear() {
        if (!this.init || this.isMuted) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    }
    playOver() {
        if (!this.init || this.isMuted) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(1, this.ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
        osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(this.ctx.currentTime + 0.8);
    }
}
const audio = new Chiptune();

// --- Game Logic ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const COLS = 10; const ROWS = 20; const TILE = 20; // 200x400
canvas.width = COLS * TILE; canvas.height = ROWS * TILE;

const SHAPES = [
    [],
    [[1,1,1,1]], // I
    [[1,1],[1,1]], // O
    [[0,1,1],[1,1,0]], // S
    [[1,1,0],[0,1,1]], // Z
    [[1,0,0],[1,1,1]], // J
    [[0,0,1],[1,1,1]], // L
    [[0,1,0],[1,1,1]]  // T
];
const COLORS = [null, '#00ffff', '#ffff00', '#00ff00', '#ff0000', '#0000ff', '#ffaa00', '#aa00ff'];

class Game {
    constructor() {
        this.state = 'menu';
        this.score = 0;
        this.board = [];
        this.keys = {};
        this.lastDrop = 0;
        this.dropRate = 500;
        
        window.addEventListener('keydown', e => {
            if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
            if(this.state!=='playing') return;
            if(e.code==='ArrowLeft') this.move(-1);
            if(e.code==='ArrowRight') this.move(1);
            if(e.code==='ArrowDown') this.drop();
            if(e.code==='ArrowUp') this.rotate();
            if(e.code==='Space') { while(this.moveDown()) {} this.lock(); } // Hard drop
        });

        document.getElementById('startBtn').onclick = () => { audio.setup(); audio.resume(); this.startGame(); };
        document.getElementById('retryBtn').onclick = () => { audio.resume(); this.startGame(); };
        const muteBtn = document.getElementById('muteBtn');
        muteBtn.onclick = () => { muteBtn.innerText = audio.toggleMute() ? "AUDIO: OFF" : "AUDIO: ON"; };

        requestAnimationFrame(this.loop.bind(this));
    }

    startGame() {
        this.score = 0;
        this.board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
        this.spawn();
        this.dropRate = 500;
        this.state = 'playing';
        document.getElementById('scoreDisplay').innerText = this.score;
        document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
        document.getElementById('hud').classList.add('active');
        this.lastDrop = performance.now();
    }

    spawn() {
        const typeId = Math.floor(Math.random()*7)+1;
        this.piece = {
            matrix: SHAPES[typeId],
            x: Math.floor(COLS/2)-1,
            y: 0,
            color: typeId
        };
        if(this.collide()) this.die();
    }

    collide() {
        for(let r=0; r<this.piece.matrix.length; r++) {
            for(let c=0; c<this.piece.matrix[r].length; c++) {
                if(this.piece.matrix[r][c] &&
                  (this.board[this.piece.y+r]===undefined ||
                   this.board[this.piece.y+r][this.piece.x+c]===undefined ||
                   this.board[this.piece.y+r][this.piece.x+c])) {
                    return true;
                }
            }
        }
        return false;
    }

    move(dir) { this.piece.x+=dir; if(this.collide()) this.piece.x-=dir; }
    
    rotate() {
        const mat = this.piece.matrix;
        const N = mat.length;
        const M = mat[0].length;
        let res = Array.from({length: M}, () => Array(N).fill(0));
        for(let r=0; r<N; r++) {
            for(let c=0; c<M; c++) {
                res[c][N-1-r] = mat[r][c];
            }
        }
        const oldMat = this.piece.matrix;
        this.piece.matrix = res;
        if(this.collide()) this.piece.matrix = oldMat;
    }

    drop() { if(this.moveDown()) this.lastDrop = performance.now(); }

    moveDown() {
        this.piece.y++;
        if(this.collide()) {
            this.piece.y--;
            this.lock();
            return false;
        }
        return true;
    }

    lock() {
        audio.playDrop();
        for(let r=0; r<this.piece.matrix.length; r++) {
            for(let c=0; c<this.piece.matrix[r].length; c++) {
                if(this.piece.matrix[r][c]) {
                    this.board[this.piece.y+r][this.piece.x+c] = this.piece.color;
                }
            }
        }
        // clear lines
        let lines = 0;
        outer: for(let r=ROWS-1; r>=0; r--) {
            for(let c=0; c<COLS; c++) {
                if(this.board[r][c] === 0) continue outer;
            }
            this.board.splice(r, 1);
            this.board.unshift(Array(COLS).fill(0));
            lines++;
            r++; // check this row again
        }
        if(lines>0) {
            audio.playClear();
            this.score += lines*100;
            this.dropRate = Math.max(100, this.dropRate - 20);
            document.getElementById('scoreDisplay').innerText = this.score;
        }
        this.spawn();
    }

    die() {
        this.state = 'dead'; audio.playOver();
        setTimeout(() => {
            document.getElementById('finalScore').innerText = this.score;
            document.getElementById('game-over').classList.add('active');
        }, 1000);
    }

    loop(time) {
        requestAnimationFrame(this.loop.bind(this));
        if (this.state === 'playing') {
            if(time - this.lastDrop > this.dropRate) {
                this.drop();
            }
        }
        this.draw();
    }

    draw() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const drawBlock = (r, c, colorIdx) => {
            if(!colorIdx) return;
            const x = c*TILE; const y = r*TILE;
            ctx.fillStyle = COLORS[colorIdx]; ctx.fillRect(x, y, TILE, TILE);
            ctx.strokeStyle = '#000'; ctx.strokeRect(x, y, TILE, TILE);
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, TILE, 4); ctx.fillRect(x, y, 4, TILE);
        };

        // Board
        for(let r=0; r<ROWS; r++) {
            for(let c=0; c<COLS; c++) drawBlock(r, c, this.board[r][c]);
        }
        // Piece
        if(this.state === 'playing') {
            for(let r=0; r<this.piece.matrix.length; r++) {
                for(let c=0; c<this.piece.matrix[r].length; c++) {
                    if(this.piece.matrix[r][c]) drawBlock(this.piece.y+r, this.piece.x+c, this.piece.color);
                }
            }
        }
    }
}
window.onload = () => new Game();
