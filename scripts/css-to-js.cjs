const fs = require('fs');
const path = require('path');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

// This was almost entirely written by ChatGPT. Thanks ChatGPT!

async function convertCssToJs(srcDir, dstDir) {
  // Check if srcDir exists
  if (!fs.existsSync(srcDir)) {
    console.error(`Source directory "${srcDir}" does not exist.`);
    return;
  }

  // Check if dstDir exists, if not create it
  if (!fs.existsSync(dstDir)) {
    await mkdir(dstDir, { recursive: true });
  }

  const files = await readdir(srcDir, { withFileTypes: true });

  for (const file of files) {
    const srcFilePath = path.join(srcDir, file.name);
    const dstFilePath = path.join(dstDir, file.name);

    if (file.isDirectory()) {
      // If it's a directory, call the function recursively
      await convertCssToJs(srcFilePath, dstFilePath);
    } else if (file.isFile() && path.extname(file.name) === '.css') {
      // If it's a CSS file, convert it to JS
      const cssContent = await readFile(srcFilePath, 'utf8');
      // eslint-disable-next-line no-template-curly-in-string
      const cssContentEscaped = cssContent.replaceAll(/`|\$/g, (c) => `\${'${c}'}`);
      const jsContent = `export default String.raw\`${cssContentEscaped}\`;\n`;
      const jsFilePath = dstFilePath + '.js';

      await writeFile(jsFilePath, jsContent);
      console.log(`Converted: ${srcFilePath} -> ${jsFilePath}`);
    }
  }
}

// Get command-line arguments
const [,, srcDir, dstDir] = process.argv;

if (!srcDir || !dstDir) {
  console.error('Usage: node css-to-js.js <srcDir> <dstDir>');
  process.exit(1);
}

convertCssToJs(srcDir, dstDir)
  .catch((err) => {
    console.error('An error occurred:', err);
    process.exit(1);
  });
