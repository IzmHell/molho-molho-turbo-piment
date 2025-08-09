/**
 * Entry point for the Molho Molho: Turbo Piment prototype. This file
 * implements a tiny game engine on top of the HTML5 Canvas API. Because
 * external dependencies cannot be downloaded in this environment, we do not
 * rely on Phaser or other third‑party frameworks. Instead we show how
 * you might structure a simple 2D fighting prototype using plain
 * TypeScript. The finished game will eventually migrate to Phaser once
 * dependencies can be installed.
 */

// We import nothing here; all work is done via the browser APIs.

import assets from './assets';

/** A utility function to create an image from a data URI. */
function loadDataImage(dataUri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = dataUri;
  });
}

/** Represents a fighter on screen. Each fighter has a position,
 * velocity and simple behaviour. */
class Fighter {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  facing: number = 1; // 1 = right, -1 = left
  onGround: boolean = false;
  constructor(public img: HTMLImageElement, x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  update(dt: number) {
    // Apply gravity
    this.vy += 600 * dt;
    // Integrate velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Simple ground collision at y = 150
    if (this.y + this.img.height * 2 >= 150) {
      this.y = 150 - this.img.height * 2;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // Flip horizontally based on facing direction
    if (this.facing < 0) {
      ctx.scale(-1, 1);
      ctx.drawImage(this.img, -this.x - this.img.width * 2, this.y, this.img.width * 2, this.img.height * 2);
    } else {
      ctx.drawImage(this.img, this.x, this.y, this.img.width * 2, this.img.height * 2);
    }
    ctx.restore();
  }
}

/** Main game class managing state, input, update loop and rendering. */
class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bg!: HTMLImageElement;
  private fighterImg!: HTMLImageElement;
  private player!: Fighter;
  private cpu!: Fighter;
  private keys: Record<string, boolean> = {};
  private state: 'loading' | 'vs' | 'fight' = 'loading';
  private lastTime: number = 0;
  constructor() {
    // Create and insert the canvas into the document body. We set
    // CSS styles on the canvas element via index.html to ensure
    // nearest‑neighbour scaling. The logical resolution is kept small
    // (320×180) and we upscale via CSS.
    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 180;
    this.ctx = this.canvas.getContext('2d')!;
    document.body.appendChild(this.canvas);
    // Ensure pixel art scaling
    this.ctx.imageSmoothingEnabled = false;
    // Keyboard input handling
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (this.state === 'vs' && e.code === 'Space') {
        this.state = 'fight';
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    // Start loading assets
    this.loadAssets();
  }
  private async loadAssets() {
    // Load embedded images via data URIs. See assets.ts for definitions.
    this.bg = await loadDataImage(assets.marketSky);
    this.fighterImg = await loadDataImage(assets.pimentRougeIdle0);
    // Create fighters
    this.player = new Fighter(this.fighterImg, 60, 50);
    this.cpu = new Fighter(this.fighterImg, 220, 50);
    this.cpu.facing = -1;
    // Switch to VS state when loaded
    this.state = 'vs';
    // Start the game loop
    requestAnimationFrame((t) => this.loop(t));
  }
  private loop(timestamp: number) {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }
  private update(dt: number) {
    if (this.state === 'fight') {
      // Player input: A/D for horizontal movement, W for jump
      this.player.vx = 0;
      if (this.keys['KeyA']) {
        this.player.vx = -120;
        this.player.facing = -1;
      } else if (this.keys['KeyD']) {
        this.player.vx = 120;
        this.player.facing = 1;
      }
      if (this.keys['KeyW'] && this.player.onGround) {
        this.player.vy = -250;
      }
      this.player.update(dt);
      // CPU AI: move towards the player horizontally
      const dx = this.player.x - this.cpu.x;
      this.cpu.vx = Math.abs(dx) > 40 ? (dx > 0 ? 80 : -80) : 0;
      this.cpu.facing = this.cpu.vx >= 0 ? 1 : -1;
      // Random jumps for CPU
      if (this.cpu.onGround && Math.random() < 0.01) {
        this.cpu.vy = -250;
      }
      this.cpu.update(dt);
    }
  }
  private draw() {
    // Clear screen
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Draw background
    if (this.bg) {
      this.ctx.drawImage(this.bg, 0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.state === 'vs') {
      // Draw ready text
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '16px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Ready? Press SPACE', this.canvas.width / 2, this.canvas.height / 2);
    }
    if (this.state === 'fight') {
      // Draw fighters
      this.player.draw(this.ctx);
      this.cpu.draw(this.ctx);
    }
  }
}

// Instantiate and run the game immediately. The script is loaded after
// the body so DOM elements are available.
new Game();
