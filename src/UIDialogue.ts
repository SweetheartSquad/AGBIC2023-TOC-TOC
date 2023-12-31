import {
	Container,
	NineSlicePlane,
	Rectangle,
	Sprite,
	Text,
	TextMetrics,
	TextStyle,
	Texture,
	utils,
} from 'pixi.js';
import Strand from 'strand-core';
import { sfx } from './Audio';
import { game } from './Game';
import { GameObject } from './GameObject';
import { Animator } from './Scripts/Animator';
import { Display } from './Scripts/Display';
import { Toggler } from './Scripts/Toggler';
import { Transform } from './Scripts/Transform';
import { Tween, TweenManager } from './Tweens';
import { size } from './config';
import { fontDialogue, fontPrompt } from './font';
import { KEYS, keys } from './input-keys';
import { getActiveScene, getInput, mouse } from './main';
import { clamp, lerp, relativeMouse, smartify, tex, zero } from './utils';

const rateRange = 0.2;
const rateQuestionMultiplier = 1.4;
const questionInflectionRange = 6;
const volumeBase = 0.75;
const volumeExclamation = 1;
const exclamationInflectionRange = 10;

export class UIDialogue extends GameObject {
	padding = {
		top: 10,
		bottom: 10,
		left: 10,
		right: 10,
	};

	sprScrim: Sprite;

	tweenScrim?: Tween;

	tweens: Tween[] = [];

	sprBg: NineSlicePlane;

	transform: Transform;

	display: Display;

	toggler: Toggler;

	isOpen: boolean;

	textText: Text;

	textPrompt: Text & utils.EventEmitter;

	fnPrompt?: () => void;

	choices: (Text & utils.EventEmitter)[];

	selected: number | undefined;

	containerChoices: Container;

	sprChoices: Sprite;

	strText: string;

	strPrompt: string;

	strand: Strand;

	pos: number;

	private posTime: number;

	private posDelay: number;

	voice = 'Default' as string | undefined;

	progress() {
		return this.sprBg.alpha;
	}

	constructor(strand: Strand) {
		super();

		this.strand = strand;
		this.isOpen = false;
		this.scripts.push((this.transform = new Transform(this)));
		this.scripts.push((this.display = new Display(this)));
		this.display.container.interactiveChildren = true;
		this.sprScrim = new Sprite(Texture.WHITE);
		this.sprScrim.name = 'scrim';
		this.sprScrim.tint = 0x000000;
		this.sprScrim.width = size.x;
		this.sprScrim.height = size.y;
		this.sprScrim.alpha = 1;
		const texBg = tex('dialogueBg');
		this.sprBg = new NineSlicePlane(
			texBg,
			texBg.width / 2,
			texBg.height / 2,
			texBg.width / 2,
			texBg.height / 2
		);
		this.sprScrim.name = 'dialogueBg';
		this.transform.x = 0;

		this.scripts.push((this.toggler = new Toggler(this)));
		this.toggler.container.x += size.x / 2;
		this.toggler.container.y = size.y / 2;

		this.strText = '';
		this.strPrompt = '';
		this.pos = 0;
		this.posTime = 0;
		this.posDelay = 1;
		this.selected = undefined;
		this.textText = new Text(this.strText, { ...fontDialogue });
		this.textPrompt = new Text(this.strPrompt, fontPrompt);
		this.textPrompt.alpha = 0;
		this.textPrompt.anchor.x = this.textPrompt.anchor.y = 0.5;
		this.display.container.addChild(this.textPrompt);
		this.display.container.accessible = true;
		this.display.container.on('pointerdown', (event) => {
			if (event && event.button !== mouse.LEFT) return;
			if (this.isOpen) this.complete();
		});
		this.containerChoices = new Container();
		this.containerChoices.alpha = 0;
		this.sprChoices = new Sprite(tex('blank'));
		this.sprChoices.name = 'choicesBg';
		this.scripts.push(
			new Animator(this, { spr: this.sprChoices, freq: 1 / 400 })
		);
		this.sprChoices.anchor.x = 0;
		this.sprChoices.anchor.y = 0;
		this.containerChoices.addChild(this.sprChoices);
		this.containerChoices.x = 0;
		this.choices = [];
		window.text = this.textText;
		this.textText.y = 0;
		this.textText.x = 0;
		this.textText.anchor.x = this.textText.anchor.y = 0.5;
		this.textText.style.wordWrap = true;
		this.textText.style.wordWrapWidth =
			size.x -
			this.padding.right -
			this.padding.left -
			this.sprBg.texture.width;

		this.display.container.addChild(this.sprScrim);
		this.display.container.addChild(this.sprBg);
		this.display.container.addChild(this.toggler.container);
		this.display.container.addChild(this.textText);
		this.display.container.addChild(this.containerChoices);

		game.app.stage.addChild(this.display.container);

		this.sprBg.alpha = 0;
		this.init();
	}

	destroy() {
		this.tweens.forEach((t) => TweenManager.abort(t));
		game.app.stage.removeChild(this.display.container);
		super.destroy();
	}

	update(): void {
		super.update();
		this.textText.alpha = this.sprBg.alpha;
		const shouldPrompt = !this.isOpen && !!this.fnPrompt;
		this.textPrompt.alpha = lerp(
			this.textPrompt.alpha,
			shouldPrompt ? 1 : 0,
			0.2
		);
		this.display.container.interactive = this.isOpen;

		const relativeMousePos = relativeMouse();
		this.textPrompt.x = relativeMousePos.x;
		this.textPrompt.y = relativeMousePos.y + this.textPrompt.height;

		// keep prompt inside screen
		if (
			this.textPrompt.x + this.textPrompt.width / 2 >
			size.x - this.padding.right
		) {
			this.textPrompt.x =
				size.x - this.padding.right - this.textPrompt.width / 2;
		} else if (
			this.textPrompt.x - this.textPrompt.width / 2 <
			this.padding.left
		) {
			this.textPrompt.x = this.padding.left + this.textPrompt.width / 2;
		}
		if (
			this.textPrompt.y + this.textPrompt.height / 2 >
			size.y - this.padding.bottom
		) {
			this.textPrompt.y =
				size.y - this.padding.bottom - this.textPrompt.height / 2;
		} else if (
			this.textPrompt.y - this.textPrompt.height / 2 <
			this.padding.top
		) {
			this.textPrompt.y = this.padding.top + this.textPrompt.height / 2;
		}

		const input = getInput();

		if (!this.isOpen && input.interact) {
			this.textPrompt.emit('pointerdown');
		}

		this.containerChoices.alpha = lerp(
			this.containerChoices.alpha,
			this.isOpen && this.pos > this.strText.length ? 1 : 0,
			0.2
		);

		// early return (still opening)
		if (this.progress() < 0.9) return;

		if (this.isOpen && this.choices.length) {
			// make single option clickable from anywhere
			if (this.choices.length === 1) {
				const p = this.choices[0].toGlobal({ x: 0, y: 0 });
				this.choices[0].hitArea = new Rectangle(-p.x, -p.y, size.x, size.y);
			}

			if (this.containerChoices.alpha > 0.5) {
				if (input.justMoved.y) {
					if (this.selected !== undefined) {
						this.choices[this.selected].alpha = 1;
					}
					if (this.selected === undefined) {
						this.selected = 0;
					} else if (input.justMoved.y > 0) {
						this.selected =
							this.selected < this.choices.length - 1 ? this.selected + 1 : 0;
					} else if (input.justMoved.y < 0) {
						this.selected =
							this.selected > 0 ? this.selected - 1 : this.choices.length - 1;
					}
					this.choices[this.selected].alpha = 0.75;
					sfx('voiceDefault');
				} else if (input.interact && this.selected !== undefined) {
					this.choices[this.selected].emit('click');
				} else if (input.interact && this.choices.length === 1) {
					this.choices[0].emit('click');
				} else if (input.interact) {
					this.complete();
				} else {
					this.choices
						.find((_, idx) => keys.isJustDown(KEYS.ONE + idx))
						?.emit('click');
				}
			} else if (input.interact) {
				this.complete();
			}
		}

		this.posTime += game.app.ticker.deltaTime;
		const prevPos = this.pos;
		while (this.posTime > this.posDelay) {
			this.pos += 1;
			this.posTime -= this.posDelay;
		}
		if (prevPos !== this.pos) {
			const letter = this.strText?.[this.pos]?.replace(/[^\w]/, '');
			if (this.pos % 2 && letter && this.voice !== 'None') {
				const rate =
					((letter.charCodeAt(0) % 30) / 30) * rateRange + (1 - rateRange);
				let nextQuestion = this.strText.indexOf('?', this.pos) - this.pos;
				if (nextQuestion <= 0) nextQuestion = 1;
				else
					nextQuestion = lerp(
						rateQuestionMultiplier,
						1,
						clamp(0, nextQuestion / questionInflectionRange, 1)
					);
				let nextExclamation = this.strText.indexOf('!', this.pos) - this.pos;
				if (nextExclamation <= 0) nextExclamation = volumeBase;
				else
					nextExclamation = lerp(
						volumeExclamation,
						volumeBase,
						clamp(0, nextExclamation / exclamationInflectionRange, 1)
					);
				sfx(`voice${this.voice}`, {
					rate: rate * nextQuestion,
					volume: nextExclamation,
				});
			}
			this.textText.text = Array.from(this.strText).slice(0, this.pos).join('');
		}

		// position text over active gameobject
		const scene = getActiveScene();
		const target = scene?.strand.gameObject?.getScript(Display);
		const targetPos = target?.container.toGlobal(zero);
		if (targetPos) {
			const { x, y } = targetPos;
			const w2 = this.textText.width / 2;
			const h2 = this.textText.height / 2;
			if (x + w2 > size.x - this.padding.right - this.sprBg.texture.width / 2) {
				this.textText.x =
					size.x - this.padding.right - this.sprBg.texture.width / 2 - w2;
			} else if (x - w2 < this.padding.left + this.sprBg.texture.width / 2) {
				this.textText.x = this.padding.left + this.sprBg.texture.width / 2 + w2;
			} else {
				this.textText.x = x;
			}
			if (y + h2 > size.y - this.padding.bottom) {
				this.textText.y = size.y - this.padding.bottom - h2;
			} else if (y - h2 < this.padding.top) {
				this.textText.y = this.padding.top + h2;
			} else {
				this.textText.y = y;
			}
		}
		this.sprBg.x =
			this.textText.x - (this.textText.width + this.sprBg.texture.width) / 2;
		this.sprBg.width = this.strText
			? this.textText.width + this.sprBg.texture.width
			: 0;
		this.sprBg.y =
			this.textText.y - (this.textText.height + this.sprBg.texture.height) / 2;
		this.sprBg.height = this.strText
			? this.textText.height + this.sprBg.texture.height
			: 0;
	}

	say(text: string, actions?: { text: string; action: () => void }[]) {
		text = smartify(text);
		// make punctuation delay a lot
		text = text.replace(
			/([.!?]"?)(\s)/g,
			'$1\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B$2'
		);
		// make cut-off dashes delay a lot
		text = text.replace(
			/([-–⁠—])(\s)/g,
			'$1\u200B\u200B\u200B\u200B\u200B\u200B\u200B\u200B$2'
		);
		// make commas delay a bit
		text = text.replace(/(,"?)(\s)/g, '$1\u200B\u200B\u200B\u200B$2');
		this.selected = undefined;

		this.strText = TextMetrics.measureText(
			text,
			// needed bc `measureText` doesn't allow a partial, but the style might be
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			this.textText.style || new TextStyle(fontDialogue),
			true
		)
			.lines.join('\n')
			.trimEnd();

		this.textText.text = '';
		this.display.container.accessibleHint = text;
		this.choices.forEach((i) => i.destroy());
		this.containerChoices.removeChild(this.sprChoices);
		this.choices = (actions || []).map((i, idx, a) => {
			const choiceText = i.text || getActiveScene()?.t('choiceDefault');
			const strText = smartify(
				a.length > 1 ? `${idx + 1}. ${choiceText}` : choiceText
			);
			const t = new Text(strText, {
				...this.textText.style,
				wordWrapWidth: (this.textText.style.wordWrapWidth || 0) - 2,
			});
			t.accessible = true;
			t.accessibleHint = strText;
			if (a.length === 1) {
				t.accessibleTitle = 'continue';
				t.alpha = 0;
			} else {
				t.accessibleTitle = (idx + 1).toString(10);
			}
			t.interactive = true;
			t.cursor = 'pointer';
			t.tabIndex = 0;

			t.on('pointerover', () => {
				if (t.alpha) t.alpha = 0.75;
				this.selected = idx;
			});
			t.on('mouseover', () => {
				if (t.alpha) t.alpha = 0.75;
				this.selected = idx;
			});
			t.on('pointerout', () => {
				if (t.alpha) t.alpha = 1;
				this.selected = undefined;
			});
			t.on('mouseout', () => {
				if (t.alpha) t.alpha = 1;
				this.selected = undefined;
			});
			t.on('click', (event) => {
				if (event && event.button !== undefined && event.button !== mouse.LEFT)
					return;
				if (this.containerChoices.alpha > 0.5) {
					if (this.choices.length > 1) {
						// @ts-ignore
						getActiveScene().strand.lastChoice = i.text;
					}
					i.action();
				}
			});
			t.on('tap', () => {
				if (this.containerChoices.alpha > 0.5) {
					if (this.choices.length > 1) {
						// @ts-ignore
						getActiveScene().strand.lastChoice = i.text;
					}
					i.action();
				}
			});
			t.anchor.x = 0;
			if (idx > 0) {
				t.y +=
					this.containerChoices.children[idx - 1].y +
					(this.containerChoices.children[idx - 1] as Text).height;
			}
			this.containerChoices.addChild(t);
			return t;
		});
		this.containerChoices.y = 0;

		this.containerChoices.alpha = 0.0;
		if (this.choices.length > 0) {
			this.display.container.addChild(this.containerChoices); // always put choices on top
		}
		this.sprChoices.width =
			this.containerChoices.width - (fontDialogue.padding ?? 0) * 2;
		this.sprChoices.height =
			this.containerChoices.height - (fontDialogue.padding ?? 0) * 2;
		this.sprChoices.x = 0;
		this.sprChoices.y = 0;
		this.sprChoices.width += Math.abs(this.sprChoices.x) * 2;
		this.sprChoices.height += Math.abs(this.sprChoices.y) * 2;
		this.containerChoices.addChildAt(this.sprChoices, 0);

		this.open();
		this.pos = 0;
		this.posTime = 0;
	}

	show(...args: Parameters<Toggler['show']>) {
		return this.toggler.show(...args);
	}

	prompt(
		label: string = this.strPrompt,
		action: (() => void) | undefined = undefined
	) {
		this.strPrompt = label;
		this.textPrompt.text = this.textPrompt.accessibleHint = label;
		this.fnPrompt = action;
	}

	complete() {
		if (this.pos >= this.strText.length) return;
		this.pos = this.strText.length;
		this.textText.text = this.strText;
	}

	private open() {
		if (!this.isOpen) {
			this.isOpen = true;
			this.tweens.forEach((t) => TweenManager.abort(t));
			this.tweens.length = 0;
			this.sprBg.width = 0;
			this.sprBg.height = 0;
			this.sprBg.alpha = 1;
		}
	}

	close() {
		if (this.isOpen) {
			this.choices.forEach((i) => {
				i.interactive = false;
				i.destroy();
			});
			this.choices = [];
			this.isOpen = false;
			this.tweens.forEach((t) => TweenManager.abort(t));
			this.tweens.length = 0;
			this.tweens.push(TweenManager.tween(this.sprBg, 'alpha', 0, 300));
		}
	}

	scrim(amount: number, duration?: number) {
		if (this.tweenScrim) TweenManager.abort(this.tweenScrim);
		if (duration) {
			this.tweenScrim = TweenManager.tween(
				this.sprScrim,
				'alpha',
				amount,
				duration
			);
		} else {
			this.sprScrim.alpha = amount;
		}
	}
}
