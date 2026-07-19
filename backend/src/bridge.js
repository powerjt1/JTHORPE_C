"use strict";

/** Shared HTTP helper for talking to the Python SQLite bridge (db/). */

var config = require("./config").config;

async function bridgeFetch(path, options) {
  var url = config.dbBridgeUrl.replace(/\/$/, "") + path;
  var headers = Object.assign({ "Content-Type": "application/json" }, (options && options.headers) || {});
  if (config.dbToken) headers["X-DB-Token"] = config.dbToken;
  var res = await fetch(url, Object.assign({}, options, { headers: headers }));
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    throw new Error("db bridge " + path + " failed (" + res.status + "): " + (data.error || ""));
  }
  return data;
}

module.exports = { bridgeFetch: bridgeFetch };
