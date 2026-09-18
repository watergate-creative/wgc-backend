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
          // Check for .js replacement
          let targetPath = p.resolve(dir, imp);
          if (targetPath.endsWith('.js')) {
            targetPath = targetPath.replace(/\.js$/, '.ts');
          }
          if (!fs.existsSync(targetPath)) {
            console.log(`[!] Missing or case mismatch: ${imp} in ${filePath}`);
            console.log(`    Looked for: ${targetPath}`);
          }
        }
      }
    }
  }
}

check('src');
