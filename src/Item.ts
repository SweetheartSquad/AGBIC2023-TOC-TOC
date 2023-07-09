import { Btn } from './Btn';
import { getActiveScene } from './main';
import { Prop } from './Prop';

export class Item extends Prop {
	btn?: Btn;

	name: string;

	constructor({
		passage,
		label,
		...options
	}: ConstructorParameters<typeof Prop>[0] & {
		label?: string;
		passage?: string;
	}) {
		super({
			...options,
		});

		this.name = label || options.texture;
		this.btn = new Btn(() => {
			const scene = getActiveScene();
			if (!scene) return;
			scene.strand.gameObject = this;
			scene.strand.goto(passage || 'generic item');
		}, this.name);
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

	// useWith() {
	// 	const scene = getActiveScene();
	// 	if (!scene) return;
	// 	if (scene.carrying === this) {
	// 		scene.carrying = undefined;
	// 		scene.sprCarrying.texture = tex('blank');
	// 	}
	// }
}
