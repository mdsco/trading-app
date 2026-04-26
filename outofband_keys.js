"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const yaml = require("js-yaml");

const WINDOWS = process.platform === "win32";

class InsecureKeyPermissionsError extends Error {
  constructor(filePath, mode) {
    super(`Insecure permissions on ${filePath} (${mode}); expected 0600 or 0400`);
    this.name = "InsecureKeyPermissionsError";
  }
}

class CredentialsNotFoundError extends Error {
  constructor(dir) {
    super(`No credentials file found in ${dir} (looked for <NODE_ENV>.yaml and master.yaml)`);
    this.name = "CredentialsNotFoundError";
  }
}

function loadConfig(appRoot) {
  const configFile = path.join(appRoot, "config", "outofband_keys.json");
  if (!fs.existsSync(configFile)) return {};
  return JSON.parse(fs.readFileSync(configFile, "utf8"));
}

function xdgConfigHome() {
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}

function resolveBaseDir(keyDirEnv) {
  const appOverride = (process.env[keyDirEnv] || "").trim();
  if (appOverride) return appOverride;

  const globalBase = (process.env.RAILS_OUTOFBAND_BASE_DIR || "").trim();
  if (globalBase) return globalBase;

  return WINDOWS ? process.env.APPDATA : xdgConfigHome();
}

function enforcePermissions(filePath) {
  if (WINDOWS) return;

  const mode = fs.statSync(filePath).mode & 0o777;
  const ownerOnly = (mode & 0o077) === 0;
  const readable  = (mode & 0o400) !== 0;

  if (!ownerOnly || !readable) {
    const modeStr = "0" + mode.toString(8);
    throw new InsecureKeyPermissionsError(filePath, modeStr);
  }
}

function findCredentialsFile(dir, nodeEnv) {
  const candidates = [`${nodeEnv}.yaml`, "master.yaml"];
  for (const name of candidates) {
    const filePath = path.join(dir, name);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

/**
 * Loads credentials from an out-of-band directory.
 *
 * @param {object} [options]
 * @param {string} [options.appRoot]   - App root for config lookup (default: process.cwd())
 * @param {string} [options.appName]   - Fallback directory name when rootSubdir is not configured
 * @param {string} [options.nodeEnv]   - Environment name (default: NODE_ENV || "development")
 * @returns {object} Parsed credentials
 */
function loadCredentials({ appRoot, appName, nodeEnv } = {}) {
  appRoot  = appRoot  || process.cwd();
  nodeEnv  = nodeEnv  || process.env.NODE_ENV || "development";
  appName  = appName  || path.basename(appRoot);

  const config = loadConfig(appRoot);

  const keyDirEnv       = config.keyDirEnv       || "RAILS_CREDENTIALS_KEY_DIR";
  const rootSubdir      = config.rootSubdir       || appName;
  const credentialsSubdir = Object.prototype.hasOwnProperty.call(config, "credentialsSubdir")
    ? config.credentialsSubdir
    : "credentials";

  const base = resolveBaseDir(keyDirEnv);
  const dirParts = [base, rootSubdir];
  if (credentialsSubdir) dirParts.push(credentialsSubdir);
  const credentialsDir = path.join(...dirParts);

  const filePath = findCredentialsFile(credentialsDir, nodeEnv);
  if (!filePath) throw new CredentialsNotFoundError(credentialsDir);

  enforcePermissions(filePath);

  const raw = fs.readFileSync(filePath, "utf8");
  return yaml.load(raw);
}

module.exports = { loadCredentials, InsecureKeyPermissionsError, CredentialsNotFoundError };
