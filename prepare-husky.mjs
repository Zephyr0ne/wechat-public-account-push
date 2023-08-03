import os from 'os';
import { series } from 'async';
import { exec } from 'child_process';

// windows、Linux平台
if (os.type() == 'Windows_NT' || os.type() == 'Linux') {
  series([() => exec('npm run prepare-husky-win')]);
}
// Mac平台
if (os.type() == 'Darwin') {
  series([() => exec('npm run prepare-husky-mac')]);
}
