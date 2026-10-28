/**
 * 投石戰車探究與拋物線攻城挑戰小遊戲
 * 依據國小科技領域教案《拋物線上的科學家：投石戰車探究與角度大解密》研發
 * 實體工程設計：本組專屬雷切卡榫投石戰車（3mm 椴木層積板、三段限位卡槽 45°/60°/75°、止擋橫桿、前後雙輪輻條、高張力橡皮筋動力）
 */

class CatapultGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Physics & Simulation params
    this.angle = 45; // degrees (45°, 60°, 75°)
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
    
    // Mechanical Lever Arm Motion State (本組專屬雷切機構運動系統)
    // States: 'ready' (cocked back, rubber band stretched), 'swinging' (rapid acceleration), 'recoil' (impacts stopper bar with damped vibration), 'stopped', 'resetting' (smooth reload)
    this.armState = 'ready';
    this.cockedAngleRad = -0.32; // ~ -18.3° (cocked position)
    this.currentArmAngleRad = this.cockedAngleRad;
    this.targetLaunchAngleRad = (this.angle * Math.PI) / 180;
    this.swingTime = 0;
    this.swingDuration = 0.13; // seconds for swift forward stroke
    this.recoilTime = 0;
    this.recoilAmplitude = 0.09; // radians vibration amplitude
    this.resetTime = 0;
    this.resetDuration = 0.45; // seconds to smoothly return to cocked
    this.pendingProjectile = null; // held in cup until arm strikes stopper crossbar
    
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
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.14);
    
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.16);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  }

  playWoodClackSound() {
    if (!this.audioCtx) return;
    this.ensureAudio();
    const ctx = this.audioCtx;
    
    // Layer 1: High-Q sharp impulse noise simulating basswood collision
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.012));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1400, ctx.currentTime);
    bandpass.Q.setValueAtTime(3.8, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.75, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start();

    // Layer 2: Woody body resonance thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.07);
    
    oscGain.gain.setValueAtTime(0.35, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  playHitSound() {
    if (!this.audioCtx) return;
    this.ensureAudio();
    const ctx = this.audioCtx;
    
    // Noise buffer for explosion
    const bufferSize = Math.floor(ctx.sampleRate * 0.4);
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
    const h = window.innerWidth >= 1024 ? 480 : 420;
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = h * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = h;
    this.groundY = this.height - 50;
    if (this.target) {
      this.target.y = this.groundY - this.target.height;
    }
  }

  setNewTarget() {
    const minDistance = 250;
    const maxDistance = Math.min(this.width - 100, Math.max(800, this.width * 0.85));
    this.target.x = minDistance + Math.random() * (maxDistance - minDistance);
    this.target.width = 40 + Math.random() * 20;
    this.target.height = 50 + Math.random() * 30;
    this.target.y = this.groundY - this.target.height;
    this.target.active = true;
  }

  setAngle(deg) {
    this.angle = Math.max(10, Math.min(85, deg));
    this.targetLaunchAngleRad = (this.angle * Math.PI) / 180;
    if (this.armState === 'stopped') {
      this.currentArmAngleRad = this.targetLaunchAngleRad;
    }
    const angleInput = document.getElementById('angleInput');
    const angleVal = document.getElementById('angleVal');
    if (angleInput) angleInput.value = this.angle;
    if (angleVal) angleVal.textContent = `${this.angle}°`;
  }

  setPower(val) {
    this.power = Math.max(10, Math.min(45, val));
    const powerInput = document.getElementById('powerInput');
    const powerVal = document.getElementById('powerVal');
    if (powerInput) powerInput.value = this.power;
    if (powerVal) powerVal.textContent = `${this.power} m/s`;
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
    if (this.isLaunching || this.armState === 'swinging' || (this.mode === 'challenge' && this.shotsLeft <= 0)) {
      return;
    }
    this.ensureAudio();
    this.playLaunchSound();
    
    this.isLaunching = true;
    this.armState = 'swinging';
    this.swingTime = 0;
    this.targetLaunchAngleRad = (this.angle * Math.PI) / 180;
    
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

    const rad = this.targetLaunchAngleRad;
    const v0 = this.power;
    const vx = v0 * Math.cos(rad);
    const vy = -v0 * Math.sin(rad);

    // Pivot point of arm in canvas space (laser-cut assembly alignment)
    const pivotX = this.catapultX + 8;
    const pivotY = this.groundY - 44;
    const armLength = 68; // matches load arm length to cup
    const startX = pivotX + armLength * Math.cos(rad);
    const startY = pivotY - armLength * Math.sin(rad);

    this.pendingProjectile = {
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
      showToast(`投石發射！初速 ${this.power} m/s · 仰角 ${this.angle}° (${label})`);
    }
  }

  updateArm(dt) {
    if (this.armState === 'swinging') {
      this.swingTime += dt;
      const progress = Math.min(1.0, this.swingTime / this.swingDuration);
      // Accelerated swing driven by rubber band tension torque: E(t) = t^1.8
      const ease = Math.pow(progress, 1.8);
      this.currentArmAngleRad = this.cockedAngleRad + (this.targetLaunchAngleRad - this.cockedAngleRad) * ease;

      if (progress >= 1.0) {
        // Impact with active stopper bar!
        this.armState = 'recoil';
        this.recoilTime = 0;
        this.currentArmAngleRad = this.targetLaunchAngleRad;
        this.playWoodClackSound();

        // Release projectile at tangential velocity at the exact impact moment
        if (this.pendingProjectile) {
          this.pendingProjectile.startTime = performance.now();
          this.projectile = this.pendingProjectile;
          this.pendingProjectile = null;
        }
      }
    } else if (this.armState === 'recoil') {
      this.recoilTime += dt;
      // High-frequency damped wood vibration recoil
      const decay = Math.exp(-20 * this.recoilTime);
      const vibration = Math.sin(60 * this.recoilTime) * this.recoilAmplitude * decay;
      this.currentArmAngleRad = this.targetLaunchAngleRad - Math.abs(vibration);

      if (this.recoilTime > 0.35) {
        this.armState = 'stopped';
        this.currentArmAngleRad = this.targetLaunchAngleRad;
      }
    } else if (this.armState === 'resetting') {
      this.resetTime += dt;
      const progress = Math.min(1.0, this.resetTime / this.resetDuration);
      // Smooth cubic ease return to cocked position
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      this.currentArmAngleRad = this.targetLaunchAngleRad + (this.cockedAngleRad - this.targetLaunchAngleRad) * ease;

      if (progress >= 1.0) {
        this.armState = 'ready';
        this.currentArmAngleRad = this.cockedAngleRad;
        this.isLaunching = false;
      }
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
          showToast(`完美命中靶心！得分 +${addScore}，晉級下一關！`);
        }
        
        // Schedule mechanical arm to smoothly reload for next stage
        setTimeout(() => {
          if (this.armState === 'stopped' || this.armState === 'recoil') {
            this.armState = 'resetting';
            this.resetTime = 0;
          }
        }, 650);

        setTimeout(() => {
          this.level++;
          this.shotsLeft = Math.min(5, this.shotsLeft + 3);
          this.setNewTarget();
          this.updateUI();
        }, 1300);
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

      // Schedule mechanical arm to reload smoothly
      setTimeout(() => {
        if (this.armState === 'stopped' || this.armState === 'recoil') {
          this.armState = 'resetting';
          this.resetTime = 0;
        }
      }, 500);

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
      result: hit ? '擊中目標' : '落入地面'
    };

    this.records.unshift(record);
    this.updateRecordTable();
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
        <td>${r.result.includes('擊中目標') ? '<span style="color:var(--color-success);font-weight:700">'+r.result+'</span>' : r.result}</td>
      </tr>
    `).join('');
  }

  clearTrails() {
    this.trails = [];
    this.records = [];
    this.updateRecordTable();
    if (typeof showToast === 'function') {
      showToast('實驗室軌跡與測試數據已清空');
    }
  }

  resetGame() {
    this.score = 0;
    this.level = 1;
    this.shotsLeft = 5;
    this.trails = [];
    this.projectile = null;
    this.pendingProjectile = null;
    this.isLaunching = false;
    this.armState = 'ready';
    this.currentArmAngleRad = this.cockedAngleRad;
    this.setNewTarget();
    this.updateUI();
    if (typeof showToast === 'function') {
      showToast('遊戲關卡已重設為第 1 關');
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
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Group specs coordinates
    const pivotX = x + 8;
    const pivotY = gy - 44;
    const loadArmLen = 68;
    const anchorX = x + 48;
    const anchorY = gy - 24;

    // 1. High-Tension Rubber Band (連線：擺臂後端施力孔 至 前置錨定柱)
    // Short effort arm extends 16px backwards relative to arm orientation:
    const curAngle = this.currentArmAngleRad;
    const effortX = pivotX - 16 * Math.cos(curAngle);
    const effortY = pivotY + 16 * Math.sin(curAngle);

    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    const midX = (anchorX + effortX) / 2;
    const midY = (anchorY + effortY) / 2 + 3;
    ctx.quadraticCurveTo(midX, midY, effortX, effortY);
    ctx.stroke();
    ctx.restore();

    // 2. Chassis Base (榫卯底盤 - 3mm 椴木雷切卡榫工法)
    ctx.save();
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    // Main longitudinal chassis beam
    ctx.fillRect(x - 45, gy - 24, 100, 14);
    ctx.strokeRect(x - 45, gy - 24, 100, 14);

    // Finger joint / tenon notches
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 20, gy - 22, 10, 10);
    ctx.fillRect(x + 15, gy - 22, 10, 10);
    ctx.fillRect(x + 36, gy - 22, 10, 10);
    ctx.restore();

    // 3. Front Rubber Band Anchor Post (金屬/木質固定柱)
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.fillRect(anchorX - 3, anchorY - 8, 6, 12);
    ctx.strokeRect(anchorX - 3, anchorY - 8, 6, 12);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(anchorX, anchorY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Laser-Cut Side Plate (雷切側支架 - 240×140mm 弧形外廓，含 45°/60°/75° 角度卡槽)
    ctx.save();
    ctx.fillStyle = isDark ? '#d97706' : '#fef3c7';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x - 22, gy - 24);
    ctx.lineTo(x + 42, gy - 24);
    ctx.lineTo(x + 42, gy - 40);
    // Curved arched top containing angle notches
    ctx.quadraticCurveTo(x + 38, gy - 74, pivotX - 5, gy - 74);
    ctx.quadraticCurveTo(x - 22, gy - 62, x - 22, gy - 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Notches for 75°, 60°, 45°
    const slotRadius = 38;
    const angles = [75, 60, 45];
    angles.forEach(deg => {
      const aRad = (deg * Math.PI) / 180;
      const notchX1 = pivotX + (slotRadius - 7) * Math.cos(aRad);
      const notchY1 = pivotY - (slotRadius - 7) * Math.sin(aRad);
      const notchX2 = pivotX + (slotRadius + 5) * Math.cos(aRad);
      const notchY2 = pivotY - (slotRadius + 5) * Math.sin(aRad);
      
      ctx.beginPath();
      ctx.moveTo(notchX1, notchY1);
      ctx.lineTo(notchX2, notchY2);
      ctx.strokeStyle = deg === this.angle ? '#2563eb' : '#78350f';
      ctx.lineWidth = deg === this.angle ? 4 : 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Mini angle markings on plate
      ctx.fillStyle = deg === this.angle ? '#1d4ed8' : '#92400e';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      const textX = pivotX + (slotRadius + 14) * Math.cos(aRad);
      const textY = pivotY - (slotRadius + 14) * Math.sin(aRad) + 3;
      ctx.fillText(`${deg}°`, textX, textY);
    });

    // Active Stopper Crossbar Pin (止擋橫桿插銷)
    const activeRad = this.targetLaunchAngleRad;
    const stopPinX = pivotX + slotRadius * Math.cos(activeRad);
    const stopPinY = pivotY - slotRadius * Math.sin(activeRad);
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(stopPinX, stopPinY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(stopPinX - 1.5, stopPinY - 1.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Rotating Catapult Lever Arm (一體成型雷切主臂 - 施力臂:抗力臂 = 1:4)
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(-this.currentArmAngleRad);

    // Effort arm (rear short lever: length 20px)
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-20, -4, 20, 8, 3);
    } else {
      ctx.rect(-20, -4, 20, 8);
    }
    ctx.fill();
    ctx.stroke();

    // Tension hole on short arm
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(-16, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Load arm (front long lever: length 68px)
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(0, -4, 68, 8, 3);
    } else {
      ctx.rect(0, -4, 68, 8);
    }
    ctx.fill();
    ctx.stroke();

    // Laser cut weight-reducing slots / tenon details on arm
    ctx.fillStyle = isDark ? '#1e293b' : '#fef3c7';
    ctx.fillRect(16, -2, 14, 4);
    ctx.fillRect(36, -2, 14, 4);

    // Payload Basket / Cup at the end of load arm
    ctx.fillStyle = '#92400e';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(68, -4, 9, Math.PI, 0, false);
    ctx.lineTo(77, 4);
    ctx.lineTo(59, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw projectile inside cup if not yet launched
    if (this.armState === 'ready' || this.armState === 'swinging' || !this.projectile || !this.projectile.alive) {
      if (!this.projectile || !this.projectile.alive || this.armState === 'swinging') {
        let pColor = '#f59e0b';
        let pRadius = 6;
        if (this.projectileType === 'pingpong') { pColor = '#ffffff'; pRadius = 7; }
        else if (this.projectileType === 'marble') { pColor = '#38bdf8'; pRadius = 5.5; }
        
        ctx.fillStyle = pColor;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(68, -9, pRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();

    // 6. Axle Pivot Point (支點金屬軸心)
    ctx.save();
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pivotX - 1.5, pivotY - 1.5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. Dual 4-Spoke Wooden Wheels (前後雙輪 4 輻條結構)
    const drawSpokeWheel = (wx, wy) => {
      ctx.save();
      // Outer rim
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(wx, wy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4 Crossed spokes
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(wx - 10, wy); ctx.lineTo(wx + 10, wy);
      ctx.moveTo(wx, wy - 10); ctx.lineTo(wx, wy + 10);
      ctx.moveTo(wx - 7, wy - 7); ctx.lineTo(wx + 7, wy + 7);
      ctx.moveTo(wx - 7, wy + 7); ctx.lineTo(wx + 7, wy - 7);
      ctx.stroke();

      // Inner hub
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wx, wy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Axle center pin
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(wx, wy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawSpokeWheel(x - 32, gy - 12);
    drawSpokeWheel(x + 40, gy - 12);

    // 8. STEM Leverage Annotations (支點、施力點、負載點、限位卡槽) in Lab Mode
    if (this.mode === 'lab') {
      ctx.save();
      ctx.font = 'bold 11px sans-serif';

      // Pivot badge
      ctx.fillStyle = '#0284c7';
      ctx.fillText('支點 (Pivot)', pivotX - 35, pivotY - 12);

      // Effort badge
      ctx.fillStyle = '#dc2626';
      ctx.fillText('施力點 (Effort)', effortX - 42, effortY + 16);

      // Load badge (near tip of arm)
      const tipX = pivotX + loadArmLen * Math.cos(curAngle);
      const tipY = pivotY - loadArmLen * Math.sin(curAngle);
      ctx.fillStyle = '#16a34a';
      ctx.fillText('負載點 (Load)', tipX + 8, tipY - 8);

      // Stopper crossbar note
      ctx.fillStyle = '#2563eb';
      ctx.fillText(`止擋橫桿 (${this.angle}°)`, stopPinX + 8, stopPinY + 4);

      ctx.restore();
    }
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

    // Draw catapult with laser-cut components & mechanical arm
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

    this.updateArm(dt);
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
