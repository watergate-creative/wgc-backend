const fs = require('fs');
const p = require('path');

function check(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const dirent of files) {
    if (dirent.isDirectory()) {
      check(p.join(dir, dirent.name));
    } else if (dirent.name.endsWith('.ts')) {
      const filePath = p.join(dir, dirent.name);
      const content = fs.readFileSync(filePath, 'utf8');
      const importRegex = /from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const imp = match[1];
        if (imp.startsWith('.')) {
          let targetPath = p.resolve(dir, imp);
          if (targetPath.endsWith('.js')) {
            targetPath = targetPath.replace(/\.js$/, '.ts');
          } else {
            targetPath = targetPath + '.ts';
          }
          
          if (!fs.existsSync(targetPath)) {
             // Maybe it's a directory index?
             if (fs.existsSync(targetPath.replace(/\.ts$/, ''))) {
                // it's a dir
             } else {
                console.log(`[!] Not found: ${targetPath} (from ${filePath})`);
             }
          } else {
             // check exact case
             const dirName = p.dirname(targetPath);
             const baseName = p.basename(targetPath);
             const actualFiles = fs.readdirSync(dirName);
             if (!actualFiles.includes(baseName)) {
                console.log(`[!] CASE MISMATCH: ${imp} in ${filePath}`);
                console.log(`    Expected: ${baseName}, but actual file is different case!`);
             }
          }
        }
      }
    }
  }
}

check('src');
