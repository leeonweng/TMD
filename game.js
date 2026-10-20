/**
 * 投石戰車探究與拋物線攻城挑戰小遊戲
 * 依據國小科技領域教案《拋物線上的科學家：投石戰車探究與角度大解密》研發
 */

class CatapultGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Physics & Simulation params
    this.angle = 45; // degrees
    this.power = 25; // m/s initial speed
    this.projectileType = 'clay'; // 'pingpong', 'clay', 'marble'
    this.gravity = 9.8;
    this.scale = 4.5; // pixels per meter
    
    // Origin of catapult (ground x, y)
    this.groundY = 0;
    this.catapultX = 120;
    
    // State
    this.mode = 'challenge'; // 'challenge' or 'lab'
    this.score = 0;
    this.level = 1;
    this.shotsLeft = 5;
    this.isLaunching = false;
    this.armAngle = 0; // arm rotation during launch
    this.armTargetAngle = 0;
    
    // Current projectile
    this.projectile = null;
    
    // History trails (for lab mode)
    this.trails = []; // array of { points: [{x, y}], color, label }
    this.records = []; // trial records for data table
    
    // Particles
    this.particles = [];
    
    // Target Castle / Bullseye
    this.target = { x: 380, y: 0, width: 45, height: 60, active: true };
    
    // Audio Context (Synthesized SFX)
    this.audioCtx = null;
    
    this.initAudio();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.setNewTarget();
    this.loop();
  }

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  ensureAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playLaunchSound() {
    if (!this.audioCtx) return;
    this.ensureAudio();
    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.18);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  }

  playHitSound() {
    if (!this.audioCtx) return;
    this.ensureAudio();
    const ctx = this.audioCtx;
    
    // Noise buffer for explosion
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.35);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start();
    noise.stop(ctx.currentTime + 0.4);
  }

  playWinSound() {
    if (!this.audioCtx) return;
    this.ensureAudio();
    const ctx = this.audioCtx;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.28);
    });
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = 420 * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = 420;
    this.groundY = this.height - 50;
    if (this.target) {
      this.target.y = this.groundY - this.target.height;
    }
  }

  setNewTarget() {
    const minDistance = 250;
    const maxDistance = Math.min(this.width - 90, 800);
    this.target.x = minDistance + Math.random() * (maxDistance - minDistance);
    this.target.width = 40 + Math.random() * 20;
    this.target.height = 50 + Math.random() * 30;
    this.target.y = this.groundY - this.target.height;
    this.target.active = true;
  }

  setAngle(deg) {
    this.angle = Math.max(10, Math.min(85, deg));
    document.getElementById('angleInput').value = this.angle;
    document.getElementById('angleVal').textContent = `${this.angle}°`;
  }

  setPower(val) {
    this.power = Math.max(10, Math.min(45, val));
    document.getElementById('powerInput').value = this.power;
    document.getElementById('powerVal').textContent = `${this.power} m/s`;
  }

  setProjectile(type) {
    this.projectileType = type;
    document.querySelectorAll('.proj-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
  }

  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    const infoPanel = document.getElementById('challengeInfo');
    if (infoPanel) {
      infoPanel.style.display = mode === 'challenge' ? 'flex' : 'none';
    }
  }

  launch() {
    if (this.isLaunching || (this.mode === 'challenge' && this.shotsLeft <= 0)) {
      return;
    }
    this.ensureAudio();
    this.playLaunchSound();
    
    this.isLaunching = true;
    this.armAngle = 0;
    this.armTargetAngle = (this.angle * Math.PI) / 180;
    
    // Material characteristics
    let mass = 1.0;
    let drag = 0.001;
    let color = '#f59e0b';
    let label = '黏土球';
    let radius = 7;

    if (this.projectileType === 'pingpong') {
      mass = 0.3;
      drag = 0.004; // large air resistance
      color = '#ffffff';
      label = '乒乓球';
      radius = 8;
    } else if (this.projectileType === 'marble') {
      mass = 2.5;
      drag = 0.0004; // small air resistance, heavy
      color = '#38bdf8';
      label = '彈珠';
      radius = 6;
    }

    const rad = (this.angle * Math.PI) / 180;
    const v0 = this.power;
    const vx = v0 * Math.cos(rad);
    const vy = -v0 * Math.sin(rad);

    // Pivot point of arm in canvas space
    const pivotX = this.catapultX + 15;
    const pivotY = this.groundY - 35;
    const armLength = 40;
    const startX = pivotX + armLength * Math.cos(rad);
    const startY = pivotY - armLength * Math.sin(rad);

    this.projectile = {
      x: startX,
      y: startY,
      vx: vx,
      vy: vy,
      startX: startX,
      startY: startY,
      mass: mass,
      drag: drag,
      color: color,
      label: label,
      radius: radius,
      trail: [{ x: startX, y: startY }],
      maxHeight: 0,
      startTime: performance.now(),
      alive: true
    };

    if (this.mode === 'challenge') {
      this.shotsLeft--;
      this.updateUI();
    }

    if (typeof showToast === 'function') {
      showToast(`🚀 投石發射！初速 ${this.power} m/s · 角度 ${this.angle}° (${label})`);
    }
  }

  createExplosion(x, y, color = '#f97316') {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: 2 + Math.random() * 4,
        color: i % 2 === 0 ? color : '#facc15',
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  }

  updatePhysics(dt) {
    if (!this.projectile || !this.projectile.alive) return;

    const p = this.projectile;
    
    // Physics integration
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const dragForce = 0.5 * p.drag * speed * speed;
    const ax = -(dragForce * (p.vx / speed)) / p.mass;
    const ay = (this.gravity + (dragForce * (p.vy / speed)) / p.mass);

    p.vx += ax * dt;
    p.vy += ay * dt;

    p.x += p.vx * this.scale * dt;
    p.y += p.vy * this.scale * dt;

    p.trail.push({ x: p.x, y: p.y });

    // Track max height
    const currentHeight = (this.groundY - p.y) / this.scale;
    if (currentHeight > p.maxHeight) {
      p.maxHeight = currentHeight;
    }

    // Check collision with Target (in Challenge Mode)
    if (this.mode === 'challenge' && this.target.active) {
      if (
        p.x >= this.target.x &&
        p.x <= this.target.x + this.target.width &&
        p.y >= this.target.y &&
        p.y <= this.target.y + this.target.height
      ) {
        // Hit target!
        this.target.active = false;
        p.alive = false;
        const addScore = 100 * this.level;
        this.score += addScore;
        this.createExplosion(p.x, p.y, '#22c55e');
        this.playHitSound();
        this.playWinSound();
        this.logTrial(p, true);

        if (typeof showToast === 'function') {
          showToast(`🎯 完美命中靶心！得分 +${addScore}，晉級下一關！`);
        }
        
        setTimeout(() => {
          this.level++;
          this.shotsLeft = Math.min(5, this.shotsLeft + 3);
          this.setNewTarget();
          this.updateUI();
        }, 1200);
        return;
      }
    }

    // Check hit ground
    if (p.y >= this.groundY - p.radius) {
      p.y = this.groundY - p.radius;
      p.alive = false;
      this.createExplosion(p.x, p.y, '#cbd5e1');
      this.playHitSound();
      
      const distance = (p.x - p.startX) / this.scale;
      this.logTrial(p, false);

      // Save trail in lab mode
      this.trails.push({
        points: [...p.trail],
        color: p.color,
        label: `${p.label} ${this.angle}° (${distance.toFixed(1)}m)`
      });

      if (this.mode === 'challenge' && this.shotsLeft === 0 && this.target.active) {
        setTimeout(() => {
          alert(`挑戰結束！您的最終得分是：${this.score} 分！可以點選「重新開始」再次挑戰！`);
        }, 300);
      }
    }
  }

  logTrial(p, hit) {
    const flightTime = ((performance.now() - p.startTime) / 1000).toFixed(2);
    const distance = Math.max(0, (p.x - p.startX) / this.scale).toFixed(1);
    const maxH = Math.max(0, p.maxHeight).toFixed(1);

    const record = {
      id: this.records.length + 1,
      angle: this.angle,
      power: this.power,
      material: p.label,
      distance: distance,
      height: maxH,
      time: flightTime,
      result: hit ? '🎯 擊中目標' : '落入地面'
    };

    this.records.unshift(record);
    this.updateRecordTable();
    this.isLaunching = false;
  }

  updateRecordTable() {
    const tbody = document.getElementById('recordTableBody');
    if (!tbody) return;
    tbody.innerHTML = this.records.slice(0, 10).map(r => `
      <tr>
        <td><strong>#${r.id}</strong></td>
        <td>${r.angle}°</td>
        <td>${r.power} m/s</td>
        <td><span class="badge-pill" style="font-size:0.75rem">${r.material}</span></td>
        <td style="font-weight:600; color:var(--color-primary)">${r.distance} m</td>
        <td>${r.height} m</td>
        <td>${r.time} s</td>
        <td>${r.result.includes('🎯') ? '<span style="color:#10b981;font-weight:700">'+r.result+'</span>' : r.result}</td>
      </tr>
    `).join('');
  }

  clearTrails() {
    this.trails = [];
    this.records = [];
    this.updateRecordTable();
    if (typeof showToast === 'function') {
      showToast('🧹 實驗室軌跡與測試數據已清空');
    }
  }

  resetGame() {
    this.score = 0;
    this.level = 1;
    this.shotsLeft = 5;
    this.trails = [];
    this.projectile = null;
    this.isLaunching = false;
    this.setNewTarget();
    this.updateUI();
    if (typeof showToast === 'function') {
      showToast('🔄 遊戲關卡已重設為第 1 關');
    }
  }

  updateUI() {
    const scoreEl = document.getElementById('gameScore');
    const shotsEl = document.getElementById('gameShots');
    const levelEl = document.getElementById('gameLevel');
    if (scoreEl) scoreEl.textContent = this.score;
    if (shotsEl) shotsEl.textContent = this.shotsLeft;
    if (levelEl) levelEl.textContent = this.level;
  }

  drawCatapult() {
    const ctx = this.ctx;
    const x = this.catapultX;
    const gy = this.groundY;

    // Wheels
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(x - 25, gy - 10, 10, 0, Math.PI * 2);
    ctx.arc(x + 25, gy - 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Wooden Chassis
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x - 35, gy - 22, 70, 12);
    ctx.strokeRect(x - 35, gy - 22, 70, 12);

    // Vertical Frame & Triangular Support
    ctx.beginPath();
    ctx.moveTo(x - 15, gy - 22);
    ctx.lineTo(x + 10, gy - 48);
    ctx.lineTo(x + 25, gy - 22);
    ctx.closePath();
    ctx.fillStyle = '#d97706';
    ctx.fill();
    ctx.stroke();

    // Pivot Pin
    const pivotX = x + 10;
    const pivotY = gy - 45;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Catapult Lever Arm
    ctx.save();
    ctx.translate(pivotX, pivotY);
    const drawAngle = -((this.angle * Math.PI) / 180);
    ctx.rotate(drawAngle);

    // Arm wood
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-10, -4, 46, 8);
    ctx.strokeStyle = '#451a03';
    ctx.strokeRect(-10, -4, 46, 8);

    // Bucket (Basket) at tip
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(36, -3, 8, Math.PI, 0, false);
    ctx.fill();
    ctx.stroke();

    // Ready projectile in bucket if not launched
    if (!this.projectile || !this.projectile.alive) {
      let color = '#f59e0b';
      if (this.projectileType === 'pingpong') color = '#ffffff';
      if (this.projectileType === 'marble') color = '#38bdf8';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(36, -7, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // Elastic band (Rubber band)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 30, gy - 22);
    const armTipX = pivotX + 28 * Math.cos(drawAngle);
    const armTipY = pivotY + 28 * Math.sin(drawAngle);
    ctx.lineTo(armTipX, armTipY);
    ctx.stroke();
  }

  drawTarget() {
    if (!this.target.active) return;
    const ctx = this.ctx;
    const t = this.target;

    // Castle structure
    ctx.fillStyle = '#64748b';
    ctx.fillRect(t.x, t.y, t.width, t.height);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(t.x, t.y, t.width, t.height);

    // Battlements (Castle crenels)
    ctx.fillStyle = '#475569';
    const crenelWidth = t.width / 4;
    ctx.fillRect(t.x, t.y - 8, crenelWidth, 8);
    ctx.fillRect(t.x + crenelWidth * 2, t.y - 8, crenelWidth, 8);

    // Bullseye banner
    const targetCenterY = t.y + t.height / 2;
    const targetCenterX = t.x + t.width / 2;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(targetCenterX, targetCenterY, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(targetCenterX, targetCenterY, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(targetCenterX, targetCenterY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Distance marker
    const dist = Math.round((t.x - this.catapultX) / this.scale);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${dist}m 靶心`, t.x + t.width / 2, t.y - 14);
  }

  drawEnvironment() {
    const ctx = this.ctx;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    if (isDark) {
      sky.addColorStop(0, '#0b1329');
      sky.addColorStop(1, '#1e293b');
    } else {
      sky.addColorStop(0, '#e0f2fe');
      sky.addColorStop(1, '#f8fafc');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.groundY);

    // Distance Grid lines (every 10 meters)
    ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let d = 10; d <= 150; d += 10) {
      const px = this.catapultX + d * this.scale;
      if (px > this.width) break;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, this.groundY);
      ctx.stroke();

      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${d}m`, px, this.groundY + 16);
    }
    ctx.setLineDash([]);

    // Ground
    ctx.fillStyle = isDark ? '#166534' : '#86efac';
    ctx.fillRect(0, this.groundY, this.width, 8);
    ctx.fillStyle = isDark ? '#1e293b' : '#64748b';
    ctx.fillRect(0, this.groundY + 8, this.width, this.height - this.groundY - 8);
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawEnvironment();

    // Draw past trails (Lab mode)
    this.trails.forEach((trail, i) => {
      this.ctx.strokeStyle = trail.color;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([2, 2]);
      this.ctx.beginPath();
      trail.points.forEach((pt, idx) => {
        if (idx === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      });
      this.ctx.stroke();
    });
    this.ctx.setLineDash([]);

    // Draw active target in Challenge Mode
    if (this.mode === 'challenge') {
      this.drawTarget();
    }

    // Draw catapult
    this.drawCatapult();

    // Draw active flying projectile & trail
    if (this.projectile && this.projectile.alive) {
      const p = this.projectile;
      
      // Live trail
      this.ctx.strokeStyle = p.color;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      p.trail.forEach((pt, idx) => {
        if (idx === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      });
      this.ctx.stroke();

      // Ball
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }

    // Draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.2; // gravity
      pt.life -= pt.decay;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      this.ctx.fillStyle = pt.color;
      this.ctx.globalAlpha = pt.life;
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }
  }

  loop() {
    const now = performance.now();
    const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.05);
    this.lastTime = now;

    this.updatePhysics(dt);
    this.render();

    requestAnimationFrame(() => this.loop());
  }
}

// Global game instance
let game = null;
function initCatapultGame() {
  if (!game) {
    game = new CatapultGame('catapultCanvas');
  }
}
