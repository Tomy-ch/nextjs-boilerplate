const fs = require("fs");
const yaml = require("js-yaml");

const tools = yaml.load(fs.readFileSync("tools.yaml", "utf8")).tools;

const replacements = [
  {
    file: ".makefiles/tools/setup.mk",
    rules: [
      {
        regex: /pnpm@[^ ]+/g,
        value: `pnpm@${tools.pnpm}`
      }
    ]
  }
];

for (const target of replacements) {
  if (!fs.existsSync(target.file)) {
    console.warn(`Skip (not found): ${target.file}`);
    continue;
  }

  console.log(`Processing: ${target.file}`);

  let content = fs.readFileSync(target.file, "utf8");

  for (const rule of target.rules) {
    content = content.replace(new RegExp(rule.regex, "g"), rule.value);
  }

  fs.writeFileSync(target.file, content);
}

console.log("All tool versions replaced.");
