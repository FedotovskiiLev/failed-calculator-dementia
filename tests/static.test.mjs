import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const readme = fs.readFileSync(new URL("../README.md", import.meta.url), "utf8");
const readmeRu = fs.readFileSync(new URL("../README.ru.md", import.meta.url), "utf8");

test("production code does not execute user expressions through eval", () => {
  const codeOnly = app
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  assert.doesNotMatch(codeOnly, /\beval\s*\(/);
  assert.doesNotMatch(codeOnly, /\bnew\s+Function\s*\(/);
});

test("all direct $(id) references exist in index.html", () => {
  const htmlIds = new Set(
    [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])
  );

  const jsIds = new Set(
    [...app.matchAll(/\$\("([^"]+)"\)/g)].map(match => match[1])
  );

  const missing = [...jsIds].filter(id => !htmlIds.has(id));
  assert.deepEqual(missing, []);
});

test("HTML contains no duplicate ids", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test("README project structure matches key repository files", () => {
  for (const name of [
    "index.html",
    "style.css",
    "app.js",
    "README.md",
    "README.ru.md",
    ".nojekyll"
  ]) {
    assert.match(readme, new RegExp(name.replace(".", "\\.")));
  }
});

test("both READMEs describe computation safety", () => {
  assert.match(readme, /Computation safety/);
  assert.match(readmeRu, /Защита от зависаний/);
});

test("visible build version is consistent", () => {
  const appVersion = app.match(/FAILED CALCULATOR ([0-9.]+)/)?.[1];
  const htmlVersions = [
    ...html.matchAll(/dementia build ([0-9.]+)/g)
  ].map(match => match[1]);

  assert.ok(appVersion, "app.js version header was not found");
  assert.ok(htmlVersions.length >= 2, "visible HTML build versions were not found");

  for (const version of htmlVersions) {
    assert.equal(version, appVersion);
  }
});

test("feature layer is loaded after the calculator runtime", () => {
  const appPos = html.indexOf('<script src="app.js"></script>');
  const featurePos = html.indexOf('src="js/features.js"');
  assert.ok(appPos >= 0);
  assert.ok(featurePos > appPos);
});

test("complex inspection functions are part of the expression language", () => {
  for (const name of ["re", "im", "conj", "arg"]) {
    assert.match(app, new RegExp(`\\"${name}\\"`));
  }
});
