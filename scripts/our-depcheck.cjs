const depcheck = require('depcheck');

const options = {
  // tests will use devDependencies from the root package.json; ignore them
  ignorePatterns: ["/test/**", "/dist/**", "/lib/**", "vite.config.ts"],
  // dynamic imports from the web should be ignored
  ignoreMatches: ["https:*"]
};

depcheck(process.cwd(), options).then((unused) => {
  let problem = false;

  if (unused.dependencies.length > 0) {
    console.log("Unused dependencies");
    for (const dep of unused.dependencies) {
      console.log(`  ${dep}`);
    }
    problem = true;
  }

  const missing = Object.keys(unused.missing);
  if (missing.length > 0) {
    console.log("Missing dependencies");
    for (const dep of missing) {
      console.log(`  ${dep}`);
    }
    problem = true;
  }

  // TODO: handle unused.invalidFiles and unused.invalidDirs?

  if (problem) {
    process.exitCode = 1;
  } else {
    console.log("No problems found by our-depcheck.cjs");
  }
});
