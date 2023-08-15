// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

const src = fs.readFileSync('./hints.txt', { encoding: 'utf8' });

const lines = src
	.trim()
	.split(/[\r\n]+/)
	.filter((i) => i);

const hints = [{ summary: 'hints', detail: [] }];
const stack = [hints[0]];

const tail = (a) => a[a.length - 1];

// eslint-disable-next-line no-restricted-syntax
for (const l of lines) {
	const [, tabs, hint] = l.split(/(^\t*)(.*$)/);
	const depth = tabs.length + 1;
	if (depth > stack.length) {
		stack.push(tail(tail(stack).detail));
	}
	while (depth < stack.length) {
		stack.pop();
	}
	tail(stack).detail.push({ summary: hint, detail: [] });
}

/* eslint-disable indent */
const renderHint = (hint, depth) => {
	const t = '\t'.repeat(depth);
	return hint.detail.length > 0
		? `
${t}<details>
${t}	<summary>${hint.summary}</summary>
${t}	<ul>${hint.detail
				.map(
					(d) => `
${t}		<li>${renderHint(d, depth + 3)}
${t}		</li>`
				)
				.join('')}
${t}	</ul>
${t}</details>`
		: `
${t}${hint.summary}`;
};
/* eslint-enable indent */

const doc = `
<!doctype html>
<html lang="en">

<head>
	<meta charset="utf-8" />
	<title>TOC TOC hints</title>
	<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
	<meta name="theme-color" content="#e4b4d7">

	<style>
		html {
			background: #e4b4d7;
			color: #0b0a1d;
			font-family: 'font', 'Courier New', Courier, monospace;
		}

		ul {
			margin: 0;
			padding: 0;
			list-style: none;
			margin-inline-start: 0.5em;
		}

		li {
			font-style: italic;
		}

		details {
			font-style: initial;
			border: solid 1px transparent;
		}

		details[open] {
			border-left-color: #42214d;
			border-top-color: #42214d;
		}

		summary {
			cursor: pointer;
			color: #42214d;
			padding: 0.25rem;
		}

		summary:hover,
		summary:focus {
			color: inherit;
			background-color: rgba(255, 255, 255, 0.2);
		}
	</style>
</head>

<body>
	<h1>TOC TOC hints</h1>

	<p>This is a list of hints for <a href="https://sweetheartsquad.itch.io/toc-toc">TOC TOC</a>. These hints start out vague and get more specific the deeper you expand in order to try to help you get unstuck while trying to avoid spoiling full solutions.</p>

	${renderHint(hints[0], 1)}

</body>

</html>
`;

fs.writeFileSync('./hints.html', doc, { encoding: 'utf-8' });
