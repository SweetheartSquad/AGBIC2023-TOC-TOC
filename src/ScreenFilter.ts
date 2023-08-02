import { Rectangle, Texture, WRAP_MODES } from 'pixi.js';
import { CustomFilter } from './CustomFilter';
import { game, resource } from './Game';
import { size } from './config';
import { getActiveScene } from './main';
import { contrastDiff, reduceGrayscale } from './utils';

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
		this.uniforms.bg = bg;
		this.uniforms.fg = fg;
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
		} while (contrastDiff(this.uniforms.bg, this.uniforms.fg) < 50);
	}

	paletteToString() {
		return JSON.stringify(
			[this.uniforms.bg, this.uniforms.fg].map((i) =>
				i.map((c) => Math.floor(c))
			)
		);
	}

	update() {
		document.body.style.backgroundColor = `rgb(${this.uniforms.bg
			.map((i) => Math.floor(i))
			.join(',')})`;
	}
}
