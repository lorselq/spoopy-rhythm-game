import Phaser from "phaser";
import { InvokerScene, type InvokerSceneCallbacks } from "./InvokerScene";
import { type InvokerConfig, defaultInvokerConfig } from "./InvokerConfig";

export class InvokerController {
  private game?: Phaser.Game;
  private container?: HTMLDivElement;
  private config: InvokerConfig;
  private callbacks: InvokerSceneCallbacks;

  constructor(
    container: HTMLDivElement,
    config: InvokerConfig = defaultInvokerConfig,
    callbacks: InvokerSceneCallbacks = {}
  ) {
    this.container = container;
    this.config = config;
    this.callbacks = callbacks;
  }

  start() {
    if (this.game) return;
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      width: this.config.tracks * 140,
      height: this.config.screenHeight,
      parent: this.container,
      backgroundColor: "#0b0d12",
      scene: [InvokerScene],
      physics: { default: "arcade" },
    });
    this.game.scene.start("InvokerScene", {
      config: this.config,
      callbacks: this.callbacks,
    });
  }

  pause() {
    const scene = this.getScene();
    if (scene) {
      scene.scene.pause();
    }
  }

  resume() {
    const scene = this.getScene();
    if (scene) {
      scene.scene.resume();
    }
  }

  end() {
    if (this.game) {
      this.game.destroy(true);
      this.game = undefined;
    }
  }

  private getScene(): Phaser.Scene | undefined {
    if (!this.game) return undefined;
    return this.game.scene.getScene("InvokerScene");
  }
}
