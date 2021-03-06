const log = console.log;
import test from "ava";
import chalk from "chalk";
import {
  parse,
  readConfig,
  getTransformedConfig,
  chooseConfig,
  printTransformedConfig,
  parseConfig,
  parseTransformedConfig,
  parseOldRepoFormat,
  parseNewRepoFormat,
  modernizeOldConfig
} from "../src/parse";
import path from "path";
import is from "@sindresorhus/is";
import { printMirror } from "tacker";

//TODO: Write parseConfig test

const sandboxDir = path.join(__dirname, "../", "sandbox");
const newConfigFile = path.join(sandboxDir, ".repogen.json");
const oldConfigFile = path.join(sandboxDir, ".repogen.js");
const oldConfig = {
  provider: "alechp",
  repospacePath: "sandbox",
  repositories: [
    { servexyz: "get-pkg-prop" },
    { servexyz: "tacker" },
    { servexyz: "paths-exist" }
  ]
};
const newConfig = {
  dir: "sandbox",
  repos: [
    { servexyz: "get-pkg-prop" },
    { servexyz: "tacker" },
    { servexyz: "paths-exist" }
  ]
};

test.before(t => {
  process.env.rgAuthHost = undefined; // --> Will not work; "undefined" not undefined
  process.env.rgAuthHost = null; // --> Will not work; "null" not null
  process.env.rgAuthHost = "alechp"; // --> Proper config
  delete process.env.rgAuthHost; // --> Works as expected; use this to ensure rgAuthHost isn't set
});

test(`${chalk.cyan("readConfig")} reads both ${chalk.underline(
  ".repogen.js"
)} and ${chalk.underline(
  ".repogen.json"
)}; have identical repositories objects`, async t => {
  let cNew = await readConfig(newConfigFile);
  let cOld = await readConfig(oldConfigFile);
  let cNewRepos = cNew.repos[2];
  let cOldRepos = cOld.repositories[2];
  // printMirror({ cNewRepos }, "magenta", "grey");
  // printMirror({ cOldRepos }, "magenta", "grey");
  t.deepEqual(cNewRepos, cOldRepos);
});

const testGetTransformedConfigStrings = (t, oCfg) => {
  const { repoRemoteUri, symPath, repoPath } = oCfg;
  // printTransformedConfig(oCfg)
  if (is.nullOrUndefined(process.env.rgAuthHost)) {
    t.true(repoRemoteUri === "https://github.com/servexyz/paths-exist");
  } else {
    t.true(
      repoRemoteUri === `git@${process.env.rgAuthHost}:servexyz/paths-exist`
    );
  }
  t.true(symPath.endsWith("sandbox/paths-exist"));
  t.true(repoPath.endsWith("sandbox/.repositories/paths-exist"));
};

test(`${chalk.cyan("getTransformedConfig")} produces ${chalk.underline(
  "(1)"
)} object consisting of ${chalk.underline("(3)")} strings`, t => {
  let oCfg = getTransformedConfig(
    "github.com",
    "servexyz",
    "paths-exist",
    sandboxDir
  );
  testGetTransformedConfigStrings(t, oCfg);
});

test(`${chalk.cyan(
  "parseOldRepoFormat"
)} produces three correct strings`, t => {
  const oCfg = parseOldRepoFormat(
    "github.com",
    { servexyz: "paths-exist" },
    sandboxDir
  );
  testGetTransformedConfigStrings(t, oCfg);
});

test(`${chalk.cyan(
  "parseOldRepoFormat"
)} returns null if oRepoKV or szRootDir are undefined`, t => {
  t.true(is.nullOrUndefined(parseOldRepoFormat()));
});

test(`${chalk.cyan("parseNewRepoFormat")} produces ${chalk.underline(
  "2"
)} correct strings`, t => {
  const cFull = {
    plat: "github.com",
    space: "servexyz",
    repo: "paths-exist",
    dir: "",
    sym: "paths-exist"
  };
  const cPartial = {
    space: "servexyz",
    repo: "paths-exist",
    sym: "paths-exist"
  };
  const oCfgFull = parseNewRepoFormat(cFull, sandboxDir);
  const oCfgPartial = parseNewRepoFormat(cPartial, sandboxDir);
  // printMirror({ oCfgFull }, "magenta", "grey");
  // printMirror({ oCfgPartial }, "magenta", "grey");
  testGetTransformedConfigStrings(t, oCfgFull);
  testGetTransformedConfigStrings(t, oCfgPartial);
});

test(`${chalk.cyan("parseOldRepoFormat")} produces  ${chalk.underline(
  "1"
)} correct string`, t => {
  const cOld = {
    servexyz: "paths-exist"
  };
  const oCfgOld = parseOldRepoFormat("github.com", cOld, sandboxDir);
  // printMirror({ oCfgOld }, "magenta", "grey");
  testGetTransformedConfigStrings(t, oCfgOld);
});

test(`${chalk.cyan("parseConfig")} produces three strings: ${chalk.underline(
  "repoRemoteUri"
)}, ${chalk.underline("symPath")}, ${chalk.underline("repoPath")}`, async t => {
  try {
    let config = await readConfig(newConfigFile);
    let parsed = await parseConfig(config);
    t.true(is.array(parsed));
    for await (let c of parsed) {
      let { repoRemoteUri, symPath, repoPath } = await c;
      t.true(is.string(repoRemoteUri));
      t.true(is.string(symPath));
      t.true(is.string(repoPath));
    }
  } catch (e) {
    t.fail(e);
  }
});

test(`${chalk.cyan("modernizeOldConfig")} sets ${chalk.underline.grey(
  "process.env.rgAuthHost"
)} and returns a JSON config`, t => {
  t.plan(2);
  let modernizedConfig = modernizeOldConfig(oldConfig);
  t.is(process.env.rgAuthHost, oldConfig.provider);
  t.deepEqual(modernizedConfig, newConfig);
});
// //TODO: Write "chooseConfig" test
test(`${chalk.cyan(
  "parse"
)} return is the same for new config & old config`, async t => {
  let cOld = await parse(oldConfig);
  // printMirror({ cOld }, "magenta", "grey");
  let cNew = await parse(newConfig);
  // printMirror({ cNew }, "magenta", "grey");
  t.is(cOld.repoRemoteUri, cNew.repoRemoteUri);
});

test(`${chalk.cyan("chooseConfig")} picks .repogen.json`, async t => {
  let config = await chooseConfig();
  // printMirror({ config }, "blue", "red");
  t.true(is.object(config[0]));
  t.true(is.string(config[1]));
});
test(`${chalk.cyan("parse(undefined)")} returns ${chalk.underline(
  ".repogen.json config"
)}`, async t => {
  let configFromParse = await parse();
  let configFromRead = await readConfig(newConfigFile);
  let configFromParseConfig = await parseConfig(configFromRead);
  // printMirror({ configFromParse }, "magenta", "red");
  // printMirror({ configFromRead }, "magenta", "red");
  // printMirror({ configFromParseConfig }, "magenta", "red");
  t.deepEqual(configFromParse, configFromParseConfig);
});

// ? repogen-demo:
//TODO: Create a test for when rgAuthHost is present (ie. private + public repos)
//TODO: Create a test for when rgAuthHost is absent (ie. public repos)
