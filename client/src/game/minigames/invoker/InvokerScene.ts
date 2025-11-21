import Phaser from "phaser";
import {
  type InvokerPiece,
  type InvokerState,
  type PieceColor,
  type Quadrant,
} from "./InvokerTypes";
import { type InvokerConfig, defaultInvokerConfig } from "./InvokerConfig";
import {
  createInitialInvokerState,
  handleInvokerInput,
  updateInvokerState,
} from "./InvokerLogic";

export interface InvokerSceneCallbacks {
  onGameEnd?: () => void;
  onDifficultyChange?: (difficulty: number) => void;
  onScoreChange?: (score: number) => void;
}

interface CircleSprites {
  [key: string]: Phaser.GameObjects.Graphics;
}

export class InvokerScene extends Phaser.Scene {
  private config: InvokerConfig = defaultInvokerConfig;
  private callbacks: InvokerSceneCallbacks = {};
  private state: InvokerState = createInitialInvokerState();
  private trackWidth = 120;
  private pieces: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private circleSprites: Record<PieceColor, CircleSprites> = {
    red: {},
    green: {},
    yellow: {},
    blue: {},
  };
  private glitchOverlay?: Phaser.GameObjects.Graphics;

  constructor() {
    super("InvokerScene");
  }

  init(data: { config?: InvokerConfig; callbacks?: InvokerSceneCallbacks }) {
    this.config = data.config ?? defaultInvokerConfig;
    this.callbacks = data.callbacks ?? {};
    this.state = createInitialInvokerState(this.config);
  }

  create() {
    this.trackWidth = this.scale.width / this.config.tracks;
    this.drawTracks();
    this.createDifficultyMeter();
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        this.state = { ...this.state, paused: !this.state.paused };
        return;
      }
      if (event.code === "Enter" && this.state.paused) {
        this.callbacks.onGameEnd?.();
        return;
      }
      this.state = handleInvokerInput(this.state, event.code, this.config);
      this.callbacks.onScoreChange?.(this.state.score);
      this.callbacks.onDifficultyChange?.(this.state.difficulty.value);
    });
  }

  private drawTracks() {
    for (let i = 0; i < this.config.tracks; i++) {
      const g = this.add.graphics();
      const x = i * this.trackWidth + this.trackWidth / 2;
      g.lineStyle(2, 0x888888, 0.7);
      g.strokeRect(
        x - this.trackWidth / 2 + 8,
        0,
        this.trackWidth - 16,
        this.config.screenHeight
      );
      const hitLine = this.add.graphics();
      hitLine.lineStyle(4, 0xffffff, 0.9);
      hitLine.lineBetween(
        x - this.trackWidth / 2 + 8,
        this.config.collectionLineY,
        x + this.trackWidth / 2 - 8,
        this.config.collectionLineY
      );
    }
  }

  private createDifficultyMeter() {
    const bg = this.add.rectangle(20, this.config.screenHeight - 20, 200, 12, 0x222222);
    bg.setOrigin(0, 0.5);
    const fill = this.add.rectangle(20, this.config.screenHeight - 20, 0, 12, 0x5fb2ff);
    fill.setOrigin(0, 0.5);
    this.events.on("updateDifficulty", (value: number) => {
      fill.width = 200 * value;
      fill.fillColor = Phaser.Display.Color.GetColor(
        95 + Math.floor(60 * value),
        178,
        255 - Math.floor(60 * value)
      );
    });
  }

  private renderPiece(piece: InvokerPiece) {
    const g = this.add.graphics();
    const color = this.colorToHex(piece.color);
    const x = piece.trackId * this.trackWidth + this.trackWidth / 2;
    g.fillStyle(color, 1);
    const radius = 32;
    const startAngle = this.quadrantStartAngle(piece.quadrant);
    g.beginPath();
    g.moveTo(x, piece.currentY);
    g.arc(x, piece.currentY, radius, startAngle, startAngle + Math.PI / 2, false);
    g.closePath();
    g.fillPath();
    this.pieces.set(piece.id, g);
  }

  private quadrantStartAngle(quadrant: Quadrant) {
    switch (quadrant) {
      case "upperLeft":
        return -Math.PI;
      case "upperRight":
        return -Math.PI / 2;
      case "lowerRight":
        return 0;
      case "lowerLeft":
      default:
        return Math.PI / 2;
    }
  }

  private colorToHex(color: PieceColor) {
    switch (color) {
      case "red":
        return 0xcf5b73;
      case "green":
        return 0x7fc97f;
      case "yellow":
        return 0xfddc5c;
      case "blue":
      default:
        return 0x74a9ff;
    }
  }

  private renderCircles() {
    const colors: PieceColor[] = ["red", "green", "yellow", "blue"];
    colors.forEach((color, index) => {
      const baseX = 80 + index * 90;
      const baseY = 80;
      (Object.keys(this.state.circleProgress[color].quadrants) as Quadrant[]).forEach(
        (quadrant) => {
          const key = `${color}-${quadrant}`;
          this.circleSprites[color][key]?.destroy();
          const g = this.add.graphics({ x: baseX, y: baseY });
          g.lineStyle(2, 0xffffff, 0.25);
          g.fillStyle(
            this.state.circleProgress[color].quadrants[quadrant]
              ? this.colorToHex(color)
              : 0x000000,
            this.state.circleProgress[color].quadrants[quadrant] ? 0.9 : 0.2
          );
          const start = this.quadrantStartAngle(quadrant);
          g.beginPath();
          g.moveTo(0, 0);
          g.arc(0, 0, 28, start, start + Math.PI / 2, false);
          g.closePath();
          if (this.state.circleProgress[color].quadrants[quadrant]) {
            g.fillPath();
          } else {
            g.strokePath();
          }
          this.circleSprites[color][key] = g;
        }
      );
    });
  }

  private triggerGlitch() {
    if (this.glitchOverlay) {
      this.glitchOverlay.destroy();
    }
    this.glitchOverlay = this.add.graphics();
    this.glitchOverlay.fillStyle(0xffffff, 0.12);
    this.glitchOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
    this.glitchOverlay.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: this.glitchOverlay,
      alpha: 0,
      duration: 200,
      onComplete: () => this.glitchOverlay?.destroy(),
    });
  }

  update(_time: number, delta: number) {
    const previousDifficulty = this.state.difficulty.value;
    this.state = updateInvokerState(this.state, delta, undefined, this.config);

    if (this.state.events.blueGlitch) {
      this.triggerGlitch();
    }
    if (previousDifficulty !== this.state.difficulty.value) {
      this.events.emit("updateDifficulty", this.state.difficulty.value);
      this.callbacks.onDifficultyChange?.(this.state.difficulty.value);
    }
    if (this.state.events.completedColors.length) {
      this.callbacks.onScoreChange?.(this.state.score);
    }

    this.syncPieces();
    this.renderCircles();
  }

  private syncPieces() {
    const seen = new Set<string>();
    this.state.pieces.forEach((piece) => {
      seen.add(piece.id);
      const sprite = this.pieces.get(piece.id);
      if (!sprite) {
        this.renderPiece(piece);
      } else {
        sprite.clear();
        const color = this.colorToHex(piece.color);
        const x = piece.trackId * this.trackWidth + this.trackWidth / 2;
        const radius = 32;
        const startAngle = this.quadrantStartAngle(piece.quadrant);
        sprite.fillStyle(color, 1);
        sprite.beginPath();
        sprite.moveTo(x, piece.currentY);
        sprite.arc(x, piece.currentY, radius, startAngle, startAngle + Math.PI / 2);
        sprite.closePath();
        sprite.fillPath();
      }
    });

    Array.from(this.pieces.entries()).forEach(([id, sprite]) => {
      if (!seen.has(id)) {
        sprite.destroy();
        this.pieces.delete(id);
      }
    });
  }
}
