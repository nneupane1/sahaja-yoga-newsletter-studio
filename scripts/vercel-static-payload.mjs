// npm run share:build first. Prints the public static files only, never local settings.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
const directory = path.resolve("share-dist");
function walk(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(item => {
    const absolute = path.join(folder, item.name);
    return item.isDirectory() ? walk(absolute) : [{ file: path.relative(directory, absolute).split(path.sep).join("/"), data: readFileSync(absolute).toString("base64"), encoding: "base64" }];
  });
}
const config = JSON.parse(readFileSync("vercel.json", "utf8"));
config.buildCommand = ""; config.installCommand = ""; config.outputDirectory = ".";
console.log(JSON.stringify({ target: "production", name: "newsletter-sahajayoga-munich", teamId: "nischal-neupanes-projects-2bf96b96", projectSettings: { framework: null, buildCommand: "", installCommand: "", outputDirectory: "." }, files: [...walk(directory), { file: "vercel.json", data: JSON.stringify(config), encoding: "utf-8" }] }));
