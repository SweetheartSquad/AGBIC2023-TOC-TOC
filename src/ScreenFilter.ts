import { Rectangle, Texture, WRAP_MODES } from 'pixi.js';
import { CustomFilter } from './CustomFilter';
import { game, resource } from './Game';
import { size } from './config';
import { getActiveScene } from './main';
import { contrastDiff, lerp, reduceGrayscale } from './utils';

type Uniforms = {
	whiteout: number;
	invert: number;
	curTime: number;
	camPos: [number, number];
	fg: [number, number, number];
	bg: [number, number, number];
	ditherGridMap: Texture;
};

export class ScreenFilter extends CustomFilter<Uniforms> {
	targetPalette: [[number, number, number], [number, number, number]];

	constructor(uniforms?: Partial<Uniforms>) {
		const texDitherGrid = resource<Texture>('ditherGrid');
		if (!texDitherGrid) throw new Error('Could not find ditherGrid');
		texDitherGrid.baseTexture.wrapMode = WRAP_MODES.REPEAT;
		super(resource<string>('postprocess.frag'), {
			whiteout: 0,
			invert: 0,
			curTime: 0,
			camPos: [0, 0],
			fg: [255, 255, 255],
			bg: [0, 0, 0],
			ditherGridMap: texDitherGrid,
			...uniforms,
		});
		this.targetPalette = [this.uniforms.bg, this.uniforms.fg];
		window.screenFilter = this;
		this.padding = 0;
		this.autoFit = false;
		game.app.stage.filters = [this];
		game.app.stage.filterArea = new Rectangle(0, 0, size.x, size.y);
	}

	reload() {
		game.app.stage.filters = null;
		const n = new ScreenFilter({
			whiteout: this.uniforms.whiteout,
			invert: this.uniforms.invert,
			curTime: this.uniforms.curTime,
			camPos: this.uniforms.camPos,
			fg: this.uniforms.fg,
			bg: this.uniforms.bg,
		});
		window.screenFilter = n;
		game.app.stage.filters = [n];
		const scene = getActiveScene();
		if (scene) scene.screenFilter = n;
		this.destroy();
	}

	palette(bg = this.uniforms.bg, fg = this.uniforms.fg) {
		this.targetPalette = [
			bg.map((i) => i) as [number, number, number],
			fg.map((i) => i) as [number, number, number],
		];
	}

	randomizePalette() {
		do {
			let fg = new Array(3)
				.fill(0)
				.map(() => Math.floor(Math.random() * 255)) as [number, number, number];
			let bg = new Array(3)
				.fill(0)
				.map(() => Math.floor(Math.random() * 255)) as [number, number, number];
			// reduce chance of darker fg than bg
			if (
				fg.reduce(reduceGrayscale, 0) < bg.reduce(reduceGrayscale, 0) &&
				Math.random() > 0.33
			) {
				[fg, bg] = [bg, fg];
			}
			this.palette(bg, fg);
		} while (contrastDiff(this.targetPalette[0], this.targetPalette[1]) < 50);
	}

	paletteToString() {
		return JSON.stringify(
			this.targetPalette.map((i) => i.map((c) => Math.floor(c)))
		);
	}

	update() {
		const [bg, fg] = this.targetPalette;
		this.uniforms.fg = fg.map((i, idx) =>
			lerp(this.uniforms.fg[idx], i, 0.1)
		) as [number, number, number];
		this.uniforms.bg = bg.map((i, idx) =>
			lerp(this.uniforms.bg[idx], i, 0.1)
		) as [number, number, number];
		document.body.style.backgroundColor = `rgb(${this.uniforms.bg
			.map((i) => Math.floor(i))
			.join(',')})`;
	}
}
