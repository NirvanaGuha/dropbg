// Publish dist/ to the gh-pages branch with a single force-pushed commit.
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
const sh = (c) => execSync(c, { stdio: 'inherit' });
if (!existsSync('dist/index.html')) throw new Error('run vite build first');
writeFileSync('dist/.nojekyll', '');
const remote = execSync('git remote get-url origin').toString().trim();
sh('rm -rf dist/.git && git -C dist init -q -b gh-pages && git -C dist add -A && git -C dist -c user.name=deploy -c user.email=deploy@dropbg commit -q -m "deploy $(date -u +%FT%TZ)"');
sh(`git -C dist push -f ${remote} gh-pages:gh-pages`);
console.log('deployed');
