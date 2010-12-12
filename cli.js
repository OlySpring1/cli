#!/usr/bin/env node
;(function () { // wrapper in case we're in module_context mode
var log = require("./lib/utils/log")
log.waitForConfig()
log.info("ok", "it worked if it ends with")

if (__filename.match(/Cellar\/npm\/[^\/]+\/libexec\/cli.js$/)
    ||process.execPath.match(/Cellar\/node\/[^\/]+\/bin\/node$/)) {
  log.warn("This program is not compatible with Homebrew."
          +"\n   brew rm npm ; brew rm node"
          +"\nThen use one of the techniques in this gist instead:"
          +"\nhttps://gist.github.com/579814", "brew incompatible")
}


var fs = require("./lib/utils/graceful-fs")
  , path = require("path")
  , sys = require("./lib/utils/sys")
  , npm = require("./npm")
  , ini = require("./lib/utils/ini")
  , rm = require("./lib/utils/rm-rf")
  , errorHandler = require("./lib/utils/error-handler")

  // supported commands.
  , argv = process.argv.slice(2)
  , arg = ""

  , conf = {}
  , key
  , arglist = []
  , command
  , flagsDone

log.verbose(argv, "cli")

while (arg = argv.shift()) {
  if (!key && (arg.match(/^-+[h?]$/i) || arg.match(/^-+help$/i))) arg = "--usage"
  if (!key && arg.match(/^-d+$/i)) {
    // -d --loglevel info
    // -dd --loglevel verbose
    // -ddd --loglevel silly
    key = "loglevel"
    switch (arg.length) {
      case 2: arg = "info"
        break
      case 3: arg = "verbose"
        break
      default: arg = "silly"
    }
  }
  if (!command && (npm.commands.hasOwnProperty(arg))) {
    if (key) {
      conf[key] = true
      key = null
    }
    command = arg
  } else if (!flagsDone && arg.substr(0, 2) === "--") {
    if (key) conf[key] = true
    key = arg.substr(2)
    if (key === "usage") conf[key] = true, key = null
    flagsDone = (key === "")
  } else if (key) {
    conf[key] = arg
    key = null
  } else arglist.push(arg)
}
if (key) conf[key] = true
if (conf.noreg) conf.registry = null
npm.argv = arglist

var vindex = arglist.indexOf("-v")
  , printVersion = vindex !== -1 || conf.version
if (printVersion) {
  console.log(npm.version)
  return
} else log("npm@"+npm.version, "using")
log("node@"+process.version, "using")

// make sure that this version of node works with this version of npm.
var semver = require("./lib/utils/semver")
  , nodeVer = process.version
  , reqVer = npm.nodeVersionRequired
if (reqVer && !semver.satisfies(nodeVer, reqVer)) {
  errorHandler(new Error(
    "npm doesn't work with node " + nodeVer + "\nRequired: node@" + reqVer), true)
}

process.on("uncaughtException", errorHandler)

if (!command) conf.usage = true

if (conf.usage && command !== "help") {
  arglist.unshift(command)
  command = "help"
}

// now actually fire up npm and run the command.
// this is how to use npm programmatically:
conf._exit = true
npm.load(conf, function (er) {
  if (er) return errorHandler(er)
  npm.commands[command](arglist, errorHandler)
})
})()
