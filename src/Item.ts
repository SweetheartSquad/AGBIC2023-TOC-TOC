import { BtnItem } from './BtnItem';
import { getActiveScene } from './main';
import { Prop } from './Prop';

export class Item extends Prop {
	btn?: BtnItem;

	name: string;

	carrying?: string;

	constructor({
		use,
		label,
		carrying,
		...options
	}: ConstructorParameters<typeof Prop>[0] &
		Partial<ConstructorParameters<typeof BtnItem>[0]> & {
			label?: string;
			carrying?: string;
		}) {
		super({
			...options,
		});

		this.name = label || options.texture;
		this.carrying = carrying;
		this.btn = new BtnItem({
			gameObject: this,
			use: {
				undefined: ['goto:generic item'],
				[this.name]: ['goto:generic item'],
				other: ['goto:generic use'],
				...use,
			},
			label: label || this.name,
		});
		this.display.container.addChild(this.btn.display.container);
		this.display.container.interactiveChildren = true;
	}

	update(): void {
		super.update();
		if (this.btn) {
			this.btn.display.container.width = this.spr.width;
			this.btn.display.container.height = this.spr.height;
		}
	}

	pickup() {
		const scene = getActiveScene();
		if (!scene) return;
		scene.pickupItem(this);
	}
}
