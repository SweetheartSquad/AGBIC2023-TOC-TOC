import type { ITextStyle } from 'pixi.js';

export const fontDialogue: Partial<ITextStyle> = {
	fontFamily: 'font',
	fontSize: 8,
	padding: 16,
	fill: 0xffffff,
	align: 'left',
	lineHeight: 8 * 1.25,
	letterSpacing: 0,
};
export const fontPrompt: Partial<ITextStyle> = {
	fontFamily: 'font',
	fontSize: 8,
	padding: 16,
	fill: 0xffffff,
	align: 'center',
	lineHeight: 8 * 1.25,
	letterSpacing: 0,
	stroke: 0,
	strokeThickness: 2,
};
export const fontIngame: Partial<ITextStyle> = {
	fontFamily: 'font',
	fontSize: 8,
	padding: 16,
	fill: 0xffffff,
	align: 'center',
	lineHeight: 8 * 1.25,
	letterSpacing: 0,
	stroke: 0,
	strokeThickness: 2,
};
