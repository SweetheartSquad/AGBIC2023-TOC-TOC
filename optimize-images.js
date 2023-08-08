/* eslint-disable @typescript-eslint/no-var-requires */
const { ImagePool } = require('@squoosh/lib');
const { execSync } = require('child_process');
const glob = require('glob');

const imagePool = new ImagePool();
const globPattern = process.argv[2] || '*';

(async () => {
	const files = glob.sync(`src/**/${globPattern}.{png,jpg}`);
	// eslint-disable-next-line no-restricted-syntax
	for (const file of files) {
		try {
			execSync(
				`node --no-experimental-fetch --max-old-space-size=2048 ./optimize-image "${file}"`,
				{
					stdio: 'inherit',
				}
			);
		} catch (err) {
			console.error(err);
		}
	}

	await imagePool.close();
})()
	.then(() => {
		console.log('✅');
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
