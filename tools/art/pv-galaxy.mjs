// Dev preview: planet globes, cruiser, nebula, medals -> PNGs in the scratch dir given as argv[2].
import { preview } from './preview.mjs';
import { planetFrames, cruiser, nebula } from '../../src/art/galaxy.js';
import { medal } from '../../src/art/medals.js';
import { ACHIEVEMENTS } from '../../src/data/meta.js';
const out = process.argv[2] || '.';
for (const p of ['kamino', 'geonosis', 'kashyyyk', 'umbara', 'mustafar']) {
  preview(`${out}/planet-${p}.png`, planetFrames(p, 56, 8), { n: 4, cols: 8 });
}
preview(`${out}/planet-big.png`, planetFrames('mustafar', 112, 2), { n: 3, cols: 2 });
preview(`${out}/cruiser.png`, cruiser(), { n: 4 });
preview(`${out}/nebula.png`, [nebula(240, 135)], { n: 3, bg: '#0c0b15' });
preview(`${out}/medals.png`, ACHIEVEMENTS.flatMap((a) => [medal(a.id)]), { n: 4, cols: 10 });
preview(`${out}/medals-locked.png`, ACHIEVEMENTS.slice(0, 5).map((a) => medal(a.id, false)), { n: 4, cols: 10 });
