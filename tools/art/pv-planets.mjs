// Dev preview: planet tiles + a test grid (output dir = argv[2], planet = argv[3]).
import { preview } from './preview.mjs';
import { buildLandTiles, renderLand } from '../../src/art/tilemap.js';
const [out, name] = process.argv.slice(2);
const t = buildLandTiles(name);
preview(`${out}/${name}-tiles.png`, [...t.ground, t.path, t.rough, t.cliff, ...t.hazard.slice(0, 4), ...Object.values(t.props)], { n: 3, cols: 8 });
const grid = [
  'GGGGGGGGGGGG',
  'GGXGGGGGGGGG',
  'PPPPPPPGGGGG',
  'GGGGGGPGGXGG',
  'GGHHHHBHHHGG',
  'GGHHHHBHHHGG',
  'GGGGGGPPPPPP',
  'GGXGGGGGGGGG',
];
preview(`${out}/${name}-grid.png`, [renderLand(grid, t, 0)], { n: 2 });
