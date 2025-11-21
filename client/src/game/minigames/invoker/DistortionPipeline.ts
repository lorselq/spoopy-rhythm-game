import Phaser from "phaser";

export class DistortionPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  intensity = 0;
  private elapsed = 0;

  constructor(game: Phaser.Game) {
    super({
      game,
      renderTarget: true,
      fragShader: /* glsl */ `
        precision mediump float;
        uniform sampler2D uMainSampler;
        varying vec2 outTexCoord;
        uniform float time;
        uniform float intensity;

        // Simple hash-based random
        float rand(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = outTexCoord;
          float wave = sin((uv.y * 18.0) + time * 14.0) * 0.02 * intensity;
          float wave2 = sin((uv.y * 32.0) - time * 18.0) * 0.01 * intensity;
          uv.x += wave + wave2;

          // Slight vertical wobble
          uv.y += sin((uv.x * 24.0) + time * 10.0) * 0.005 * intensity;

          // Wrap the UV to avoid sampling outside
          uv = mod(uv, 1.0);

          vec4 color = texture2D(uMainSampler, uv);

          // Static noise overlay
          float noise = rand(uv * (128.0 + time * 10.0));
          float grain = (noise - 0.5) * 0.4 * intensity;
          color.rgb += grain;

          // Brightness flicker
          float flicker = 0.85 + rand(vec2(time * 5.0, uv.y)) * 0.3 * intensity;
          color.rgb *= flicker;

          gl_FragColor = color;
        }
      `,
    });
  }

  step(delta: number) {
    this.elapsed += delta / 1000;
    this.set1f("time", this.elapsed);
    this.set1f("intensity", this.intensity);
  }
}
