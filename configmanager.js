const fs   = require('fs-extra')
const { LoggerUtil } = require('helios-core')
const os   = require('os')
const path = require('path')

const CONFIG_FILE = 'helios-config.json'
const DEFAULT_CONFIG = {
  "app": {
    "name": "Helios",
    "version": "1.0.0"
  },
  "window": {
    "width": 800,
    "height": 600
  }
}

let userConfig = {}
let isConfigLoaded = false

function getConfig () {
  if (!isConfigLoaded) {
    loadConfig()
  }
  return userConfig
}

function loadConfig () {
  const configPath = path.join(os.homedir(), CONFIG_FILE)
  try {
    userConfig = fs.readJsonSync(configPath)
    LoggerUtil.info(`Loaded config from ${configPath}`)
  } catch (err) {
    LoggerUtil.warn(`Could not load config, using default. Error: ${err.message}`)
    userConfig = DEFAULT_CONFIG
  }
  isConfigLoaded = true
}

function saveConfig (newConfig) {
  const configPath = path.join(os.homedir(), CONFIG_FILE)
  userConfig = { ...userConfig, ...newConfig }
  fs.writeJsonSync(configPath, userConfig, { spaces: 2 })
  LoggerUtil.info(`Saved config to ${configPath}`)
}

module.exports = {
  getConfig,
  saveConfig
}
