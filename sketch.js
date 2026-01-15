let creatures = [];
let feedbackEffects = []; 
let maxCreatures = 80;    
let mouseKillRadius = 60; 

// --- 可爱表情库 ---
let cuteEmojis = ["^_^", ">_<", "o.o", "♥", "✨", ":3", "UwU", "★", "啵", "Q_Q"];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Helvetica');
  
  userStartAudio(); 
  
  // 初始生成
  for (let i = 0; i < 15; i++) {
    creatures.push(new Creature(random(width), random(height)));
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(245, 247, 250); 
  drawGrid(); // 绘制网格

  // 绘制鼠标杀伤圈 
  push();
  fill(255, 50, 50, 20); 
  stroke(255, 50, 50, 150); 
  strokeWeight(2);
  circle(mouseX, mouseY, mouseKillRadius * 2); 
  pop();

  // 1. 更新与绘制生物
  for (let i = creatures.length - 1; i >= 0; i--) {
    let c = creatures[i];
    
    c.reactToMouse();      
    c.checkCollision(creatures); 
    c.update();            
    c.display();
    
    if (c.isDead()) {
      creatures.splice(i, 1);
    }
  }
  
  // 2. 更新与绘制特效
  for (let i = feedbackEffects.length - 1; i >= 0; i--) {
    let fx = feedbackEffects[i];
    fx.update();
    fx.display();
    if (fx.isDone()) {
      feedbackEffects.splice(i, 1);
    }
  }
  
  // 3. 绘制UI界面
  drawUI();
}

function mousePressed() {
  userStartAudio();

  if (creatures.length < maxCreatures) {
    // --- 修改点 A：传入鼠标坐标，根据位置播放生成音效 ---
    playSpawnSound(mouseX, mouseY); 
    
    for(let i=0; i<3; i++){
      let spawnOffset = random(mouseKillRadius + 10, mouseKillRadius + 30);
      let angle = random(TWO_PI);
      let sx = mouseX + cos(angle) * spawnOffset;
      let sy = mouseY + sin(angle) * spawnOffset;
      
      sx = constrain(sx, 20, width - 20);
      sy = constrain(sy, 60, height - 20);

      creatures.push(new Creature(sx, sy));
    }
  } else {
    feedbackEffects.push(new FeedbackFX(mouseX, mouseY, "FULL!", color(255, 50, 50), 32));
    // 满员警告音效（固定低频）
    playPopSound(mouseX, mouseY, true); 
  }
}

// --- 修改点 B：全新的音效逻辑 ---

// 1. 生成音效：根据点击位置改变波形和频率
function playSpawnSound(x, y) {
  let osc = new p5.Oscillator(); 
  let env = new p5.Envelope();
  
  // Y 轴控制声音长度：上方短促(0.1s)，下方较长(0.4s)
  let decayTime = map(y, 0, height, 0.1, 0.4);
  env.setADSR(0.01, decayTime, 0.1, 0.1); 
  env.setRange(0.15, 0); // 音量
  
  // X 轴控制频率和波形类型
  let freq;
  
  if (x < width * 0.33) {
    // [左侧区域]：低沉圆润 (Sine)
    osc.setType('sine');
    freq = map(x, 0, width * 0.33, 200, 400); // 200Hz - 400Hz
  } else if (x < width * 0.66) {
    // [中间区域]：清脆明亮 (Triangle)
    osc.setType('triangle');
    freq = map(x, width * 0.33, width * 0.66, 400, 800); // 400Hz - 800Hz
  } else {
    // [右侧区域]：电子锯齿 (Sawtooth)
    osc.setType('sawtooth');
    freq = map(x, width * 0.66, width, 800, 1200); // 800Hz - 1200Hz
    env.setRange(0.08, 0); // 锯齿波比较响，降低一点音量
  }

  osc.freq(freq); 
  osc.start();
  env.play(osc, 0, 0.1);
  
  // 稍后停止，节省资源
  setTimeout(() => osc.stop(), (decayTime + 0.2) * 1000);
}

// 2. 消除音效：根据生物位置改变
function playPopSound(x, y, isError = false) {
  let osc = new p5.Oscillator(); 
  let env = new p5.Envelope();
  
  if (isError) {
    // 错误音效（容量满）
    osc.setType('square');
    osc.freq(150);
    env.setADSR(0.01, 0.2, 0, 0.1);
  } else {
    // 正常消除音效
    env.setADSR(0.001, 0.1, 0, 0.1); 
    
    // 根据位置决定基础频率
    let baseFreq = map(x, 0, width, 300, 800);
    osc.freq(baseFreq);
    
    // 不同区域使用不同波形
    if (x > width / 2) osc.setType('square'); // 右边是方波
    else osc.setType('sine');                 // 左边是正弦波
    
    // 频率滑落效果 (Pew~ Pew~)
    osc.freq(50, 0.15); 
  }

  env.setRange(0.2, 0); 
  osc.amp(env);
  osc.start();
  env.play();
  setTimeout(() => osc.stop(), 200);
}

// 辅助函数：绘制背景网格
function drawGrid() {
  stroke(220, 230, 240);
  strokeWeight(1);
  for (let x = 0; x < width; x += 40) line(x, 0, x, height);
  for (let y = 0; y < height; y += 40) line(0, y, width, y);
  
  // --- 可选：绘制声音区域的隐形提示 ---
  /*
  noStroke();
  fill(0, 0, 255, 5); rect(0, 0, width/3, height); // 左侧提示
  fill(0, 255, 0, 5); rect(width/3, 0, width/3, height); // 中间提示
  fill(255, 0, 0, 5); rect(width*2/3, 0, width/3, height); // 右侧提示
  */
}

// UI 绘制逻辑
function drawUI() {
  noStroke();
  fill(255, 255, 255, 230);
  rect(0, 0, width, 50);
  fill(0, 10);
  rect(0, 50, width, 2);

  let ratio = creatures.length / maxCreatures;
  let barWidth = 150;
  let barHeight = 10;
  let barX = width - barWidth - 20; 
  let barY = 20;                   
  
  if (ratio > 0.8) {
    barX += random(-2, 2); 
    barY += random(-2, 2);
  }

  push(); 
  textAlign(RIGHT, CENTER); 
  textSize(12);
  let labelX = barX - 8; 
  let labelY = barY + barHeight / 2; 

  if (ratio > 0.8) {
    fill(255, 100, 100);
    text("警告！！！", labelX, labelY); 
  } else {
    fill(100);
    text("容量", labelX, labelY); 
  }
  pop(); 

  fill(230);
  rect(barX, barY, barWidth, barHeight, 5);
  let cColor = lerpColor(color(100, 200, 255), color(255, 100, 100), ratio);
  fill(cColor);
  rect(barX, barY, barWidth * ratio, barHeight, 5);

  fill(50, 80, 100); 
  textAlign(LEFT, CENTER); 
  textSize(14);
  text("🎵 左侧=气泡音 | 中间=钟声 | 右侧=电子音", 20, 25); // 更新 UI 提示
  text("🖱️ 点击 = 投放", 380, 25);
  text("💥 圆圈 = 消除", 500, 25);
}

// --- 生物类 ---
class Creature {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(2);
    this.acc = createVector(0, 0);
    this.r = random(25, 40); 
    this.color = color(random(100, 180), random(180, 240), random(200, 255)); 
    this.killed = false; 
    this.maxSpeed = 10; 
    this.spawnTimer = 60; 
    this.emojiCooldown = 0; 
  }
  
  reactToMouse() {
    let mouse = createVector(mouseX, mouseY);
    let d = this.pos.dist(mouse);
    
    if (this.spawnTimer <= 0 && d < mouseKillRadius + this.r) {
      this.killed = true; 
      feedbackEffects.push(new FeedbackFX(this.pos.x, this.pos.y, "POP!", color(255, 100, 50), 24));
      
      // --- 修改点 C：消除时传入当前坐标，产生空间感音效 ---
      playPopSound(this.pos.x, this.pos.y); 
    } 
    else if (d < mouseKillRadius + 140) { 
      let flee = p5.Vector.sub(this.pos, mouse);
      flee.setMag(1.5); 
      this.acc.add(flee);
    }
  }

  checkCollision(others) {
    for (let other of others) {
      if (other !== this) {
        let d = this.pos.dist(other.pos);
        let minDist = this.r + other.r;
        
        if (d < minDist) {
          let pushVec = p5.Vector.sub(this.pos, other.pos);
          pushVec.setMag(0.5);
          this.acc.add(pushVec);

          if (this.emojiCooldown === 0) {
            if (random(1) < 0.15) {
              let emoji = random(cuteEmojis);
              let midX = (this.pos.x + other.pos.x) / 2;
              let midY = (this.pos.y + other.pos.y) / 2;
              let fxColor = color(80, 120, 180); 
              
              feedbackEffects.push(new FeedbackFX(midX, midY, emoji, fxColor, 18));
              this.emojiCooldown = 60; 
            } else {
              this.emojiCooldown = 5; 
            }
          }
        }
      }
    }
  }
  
  update() {
    if (this.spawnTimer > 0) this.spawnTimer--;
    if (this.emojiCooldown > 0) this.emojiCooldown--;

    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
    
    this.vel.mult(0.95);
    
    if (this.pos.x < this.r || this.pos.x > width - this.r) this.vel.x *= -1;
    if (this.pos.y < 50 + this.r || this.pos.y > height - this.r) this.vel.y *= -1;
  }
  
  display() {
    let angle = this.vel.heading();
    let speed = this.vel.mag();
    
    let stretch = map(speed, 0, this.maxSpeed, 1.0, 1.3);
    let squash = 1.0 / stretch;
    
    push();
    translate(this.pos.x, this.pos.y);
    
    if (this.spawnTimer > 0) {
      drawingContext.globalAlpha = 0.6;
    }

    push();
    rotate(angle); 
    noStroke();
    
    fill(this.color);
    ellipse(0, 0, this.r * 2 * stretch, this.r * 2 * squash);
    pop();
    
    let angleToMouse = atan2(mouseY - this.pos.y, mouseX - this.pos.x);
    fill(0); 
    let eyeOffset = this.r * 0.4;
    let eyeX = cos(angleToMouse) * (this.r * 0.25);
    let eyeY = sin(angleToMouse) * (this.r * 0.25);
    let eyeSize = this.r * 0.3; 
    
    circle(-eyeOffset + eyeX, -5 + eyeY, eyeSize); 
    circle(eyeOffset + eyeX, -5 + eyeY, eyeSize);  
    
    pop();
    drawingContext.globalAlpha = 1.0; 
  }
  
  isDead() {
    return this.killed;
  }
}

class FeedbackFX {
  constructor(x, y, txt, col, size = 16) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-0.5, 0.5), -1.5); 
    this.alpha = 255;
    this.txt = txt;
    this.col = col;
    this.size = size;
  }
  
  update() {
    this.pos.add(this.vel);
    this.alpha -= 6; 
  }
  
  display() {
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), this.alpha);
    textAlign(CENTER);
    textSize(this.size);
    textStyle(BOLD);
    text(this.txt, this.pos.x, this.pos.y);
    textStyle(NORMAL);
  }
  
  isDone() {
    return this.alpha < 0;
  }
}