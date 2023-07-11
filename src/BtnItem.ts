import { Btn } from './Btn';
import { GameObject } from './GameObject';
import { getActiveScene } from './main';

export class BtnItem extends Btn {
	private cycles: { [key: string]: number } = {};

	use: {
		undefined: string[];
		other: string[];
		[key: string]: string[];
	};

	constructor({
		gameObject,
		use,
		label,
	}: {
		gameObject: GameObject;
		use: BtnItem['use'];
		label: string;
	}) {
		super(() => {
			const scene = getActiveScene();
			if (!scene) return;
			scene.player.canMove = false;
			scene.strand.gameObject = gameObject;
			const item = scene.carrying?.name;
			let key = `${item}`;
			let say = this.use[key];

			// nothing specific to say, so go to other
			if (!say) {
				key = 'other';
				say = this.use.other;
			}

			// nothing to say, so go to global generic use
			if (!say) {
				scene.strand.goto('generic use');
				scene.loseItem();
				return;
			}

			const cycle = this.cycles[key] || 0;
			this.cycles[key] = cycle + 1;
			const currentSay = say[cycle % say.length];
			if (currentSay.startsWith('goto:')) {
				scene.strand.goto(currentSay.replace('goto:', ''));
			} else {
				// just say the line and lose the item
				scene.dialogue.say(currentSay, [
					{ text: '', action: () => scene.dialogue.close() },
				]);
				scene.loseItem();
			}
		}, label);
		this.use = use;
	}
}