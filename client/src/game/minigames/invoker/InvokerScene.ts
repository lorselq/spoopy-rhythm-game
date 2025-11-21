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
import { DistortionPipeline } from "./DistortionPipeline";

export interface InvokerSceneCallbacks {
  onGameEnd?: () => void;
  onDifficultyChange?: (difficulty: number) => void;
  onScoreChange?: (score: number) => void;
}

export class InvokerScene extends Phaser.Scene {
  private config: InvokerConfig = defaultInvokerConfig;
  private callbacks: InvokerSceneCallbacks = {};
  private state: InvokerState = createInitialInvokerState();
  private trackWidth = 120;
  private pieces: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private circleContainers: Map<number, Phaser.GameObjects.Container> = new Map();
  private quadrantSprites: Map<number, Record<Quadrant, Phaser.GameObjects.Graphics>> =
    new Map();
  private circleBaseX = 80;
  private circleSpacing = 90;
  private circleY = 80;
  private distortionPipeline?: DistortionPipeline;
  private glitchTween?: Phaser.Tweens.Tween;
  private staticNoise?: Phaser.GameObjects.Graphics;
  private staticNoiseTimer?: Phaser.Time.TimerEvent;

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
    this.circleSpacing = 110;
    this.circleBaseX = this.scale.width / 2 - this.circleSpacing;
    this.circleY = Math.min(
      this.config.screenHeight - 70,
      this.config.collectionLineY + 140
    );
    if (this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      if (!this.game.renderer.getPipeline("distortion")) {
        this.game.renderer.addPipeline(
          "distortion",
          new DistortionPipeline(this.game)
        );
      }
      this.distortionPipeline = this.game.renderer.getPipeline(
        "distortion"
      ) as DistortionPipeline;
      this.distortionPipeline.intensity = 0;
      this.cameras.main.setPostPipeline("distortion");
    }

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
    const meterWidth = 220;
    const x = this.scale.width - 20;
    const y = 30;
    const bg = this.add.rectangle(x, y, meterWidth, 12, 0x222222);
    bg.setOrigin(1, 0.5);
    const fill = this.add.rectangle(x, y, 0, 12, 0x5fb2ff);
    fill.setOrigin(1, 0.5);
    this.events.on("updateDifficulty", (value: number) => {
      fill.width = meterWidth * value;
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

  private colorForQuadrant(quadrant: Quadrant): PieceColor {
    switch (quadrant) {
      case "upperRight":
        return "red";
      case "lowerLeft":
        return "green";
      case "lowerRight":
        return "yellow";
      case "upperLeft":
      default:
        return "blue";
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

  private cloneCircleProgress(
    progress: InvokerState["circleProgress"]
  ): InvokerState["circleProgress"] {
    return progress.map((circle) => ({
      id: circle.id,
      quadrants: { ...circle.quadrants },
    }));
  }

  private flashCapture(
    container: Phaser.GameObjects.Container,
    quadrant: Quadrant
  ) {
    const flash = this.add.graphics({ x: container.x, y: container.y });
    const color = this.colorToHex(this.colorForQuadrant(quadrant));
    flash.lineStyle(3, color, 0.85);
    flash.strokeCircle(0, 0, 34);
    flash.setAlpha(0.9);
    this.tweens.add({
      targets: flash,
      scale: 1.2,
      alpha: 0,
      duration: 200,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  private flashCircleCompletion(circleId: number) {
    const container = this.circleContainers.get(circleId);
    if (!container) return;

    const glow = this.add.graphics({ x: container.x, y: container.y });
    glow.fillStyle(0xffffff, 0.12);
    glow.fillCircle(0, 0, 46);
    glow.lineStyle(3, 0xffffff, 0.6);
    glow.strokeCircle(0, 0, 32);

    this.tweens.add({
      targets: [container, glow],
      alpha: 0,
      scale: 1.2,
      duration: 260,
      ease: "Cubic.easeIn",
      onComplete: () => {
        glow.destroy();
        container.destroy();
        this.circleContainers.delete(circleId);
        this.quadrantSprites.delete(circleId);
      },
    });
  }

  private syncCircles(previousProgress: InvokerState["circleProgress"]) {
    const capturedEvent = this.state.events.captured;
    this.state.events.completedCircleIds.forEach((id) =>
      this.flashCircleCompletion(id)
    );

    const desiredIds = new Set(this.state.circleProgress.map((c) => c.id));
    this.circleContainers.forEach((container, id) => {
      if (!desiredIds.has(id) && !this.state.events.completedCircleIds.includes(id)) {
        container.destroy();
        this.circleContainers.delete(id);
        this.quadrantSprites.delete(id);
      }
    });

    this.state.circleProgress.forEach((circle, index) => {
      const targetX = this.circleBaseX + index * this.circleSpacing;
      let container = this.circleContainers.get(circle.id);
      if (!container) {
        container = this.add.container(targetX + this.circleSpacing * 0.35, this.circleY);
        this.circleContainers.set(circle.id, container);
        this.quadrantSprites.set(circle.id, {} as Record<Quadrant, Phaser.GameObjects.Graphics>);
        container.setAlpha(0);
        this.tweens.add({
          targets: container,
          x: targetX,
          alpha: 1,
          duration: 200,
          ease: "Cubic.easeOut",
        });
      } else if (container.x !== targetX) {
        this.tweens.add({
          targets: container,
          x: targetX,
          duration: 200,
          ease: "Cubic.easeOut",
        });
      }

      const quadrants = this.quadrantSprites.get(circle.id)!;
      (Object.keys(circle.quadrants) as Quadrant[]).forEach((quadrant) => {
        let g = quadrants[quadrant];
        if (!g) {
          g = this.add.graphics();
          quadrants[quadrant] = g;
          container?.add(g);
        }
        const filled = circle.quadrants[quadrant];
        const color = this.colorToHex(this.colorForQuadrant(quadrant));
        g.clear();
        g.lineStyle(2, color, 0.35);
        g.fillStyle(filled ? color : 0x0c101b, filled ? 0.9 : 0.12);
        const start = this.quadrantStartAngle(quadrant);
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, 28, start, start + Math.PI / 2, false);
        g.closePath();
        if (filled) {
          g.fillPath();
        } else {
          g.strokePath();
        }

        const prevCircle = previousProgress.find((c) => c.id === circle.id);
        const wasFilled = prevCircle?.quadrants[quadrant] ?? false;
        const isCapturedQuadrant =
          capturedEvent?.circleId === circle.id &&
          capturedEvent.quadrant === quadrant;
        if (container && (filled && !wasFilled || isCapturedQuadrant)) {
          this.flashCapture(container, quadrant);
        }
      });
    });
  }

  private ensureStaticNoiseLayer() {
    if (this.staticNoise) return;
    this.staticNoise = this.add.graphics({ x: 0, y: 0 });
    this.staticNoise.setScrollFactor(0);
    this.staticNoise.setDepth(1000);
    this.staticNoise.setVisible(false);
  }

  private redrawStaticNoise() {
    if (!this.staticNoise) return;
    this.staticNoise.clear();
    for (let i = 0; i < 120; i++) {
      const width = 4 + Math.random() * 14;
      const height = 1 + Math.random() * 10;
      const x = Math.random() * this.scale.width;
      const y = Math.random() * this.scale.height;
      const alpha = 0.15 + Math.random() * 0.45;
      this.staticNoise.fillStyle(0xffffff, alpha);
      this.staticNoise.fillRect(x, y, width, height);
    }
    this.staticNoise.setBlendMode(Phaser.BlendModes.SCREEN);
    this.staticNoise.setAlpha(0.9);
  }

  private triggerDistortionEffect() {
    if (!this.distortionPipeline) return;

    this.ensureStaticNoiseLayer();
    this.glitchTween?.stop();
    this.staticNoiseTimer?.remove(false);

    this.distortionPipeline.intensity = 1;
    this.cameras.main.shake(750, 0.012, true);

    this.staticNoise?.setVisible(true);
    this.redrawStaticNoise();
    this.staticNoiseTimer = this.time.addEvent({
      delay: 45,
      repeat: Math.ceil(750 / 45),
      callback: () => this.redrawStaticNoise(),
    });

    this.glitchTween = this.tweens.add({
      targets: this.distortionPipeline,
      intensity: 0,
      duration: 750,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (!this.distortionPipeline) return;
        this.distortionPipeline.intensity = 0;
        this.staticNoise?.setVisible(false);
        this.staticNoiseTimer?.remove(false);
        this.staticNoiseTimer = undefined;
      },
    });
  }

  update(_time: number, delta: number) {
    this.distortionPipeline?.step(delta);
    const previousDifficulty = this.state.difficulty.value;
    const previousProgress = this.cloneCircleProgress(
      this.state.circleProgress
    );
    const carriedEvents = this.state.events;
    const updatedState = updateInvokerState(
      this.state,
      delta,
      undefined,
      this.config
    );
    const frameEvents = {
      completedCircleIds: [
        ...carriedEvents.completedCircleIds,
        ...updatedState.events.completedCircleIds,
      ],
      captured: updatedState.events.captured ?? carriedEvents.captured,
      blueGlitch: updatedState.events.blueGlitch || carriedEvents.blueGlitch,
      overCollection:
        updatedState.events.overCollection || carriedEvents.overCollection,
    };

    this.state = { ...updatedState, events: frameEvents };

    if (this.state.events.overCollection || this.state.events.blueGlitch) {
      this.triggerDistortionEffect();
    }
    if (previousDifficulty !== this.state.difficulty.value) {
      this.events.emit("updateDifficulty", this.state.difficulty.value);
      this.callbacks.onDifficultyChange?.(this.state.difficulty.value);
    }
    if (this.state.events.completedCircleIds.length) {
      this.callbacks.onScoreChange?.(this.state.score);
    }

    this.syncPieces();
    this.syncCircles(previousProgress);

    this.state = {
      ...this.state,
      events: {
        completedCircleIds: [],
        captured: undefined,
        blueGlitch: false,
        overCollection: false,
      },
    };
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
