import { mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const target = path.resolve(root, 'dist');
if (target !== path.join(root, 'dist')) throw new Error('Unexpected build target');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const name of ['index.html', 'styles.css', 'motion.css', 'career-flow.css', 'app.js', 'motion.js', 'career-model.js', 'career-flow.js', 'career-quiz.js', 'pie-chart.js', 'hero3d.js', 'space3d.js', 'space-theme.css', 'scroll-motion.js', 'favicon.svg', 'data', 'assets', 'vendor']) await cp(path.join(root, name), path.join(target, name), { recursive: true });
console.log('Built static site in dist/');
