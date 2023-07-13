import { BtnItem } from './BtnItem';
import { Prop } from './Prop';

export class Hotspot extends Prop {
	name: string;

	btn?: BtnItem;

	use: ConstructorParameters<typeof Hotspot>[0]['use'];

	constructor({
		label,
		use,
		...options
	}: ConstructorParameters<typeof Prop>[0] &
		ConstructorParameters<typeof BtnItem>[0] & {
			label?: string;
		}) {
		super({
			...options,
		});

		this.name = label || options.texture;
		this.use = use;

		this.btn = new BtnItem({
			gameObject: this,
			use,
			label: this.name,
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
}
