const fs = require('fs-extra')
const path = require('path')
const toml = require('toml')
const merge = require('lodash.merge')

const defaultLang = 'en'
const langDir = path.join(__dirname, '/../lang/')
const fallbackLang = path.join(__dirname, '/../lang/en.toml')

function loadLangFile (lang) {
  const filePath = path.join(langDir, `${lang}.toml`)
  if (fs.existsSync(filePath)) {
    return toml.parse(fs.readFileSync(filePath, 'utf-8'))
  } else {
    return {}
  }
}

function loadFallbackLang () {
  if (fs.existsSync(fallbackLang)) {
    return toml.parse(fs.readFileSync(fallbackLang, 'utf-8'))
  } else {
    return {}
  }
}

function mergeLangs (target, source) {
  return merge({}, target, source)
}

function getLang (req) {
  const lang = req.acceptsLanguages(...Object.keys(langs)) || defaultLang
  return lang
}

function setLang (req, res, next) {
  const lang = getLang(req)
  req.lang = lang
  res.locals.lang = lang

  const langFile = loadLangFile(lang)
  const fallbackFile = loadFallbackLang()

  res.locals.translations = mergeLangs(fallbackFile, langFile)

  next()
}

module.exports = {
  setLang,
  getLang,
  loadLangFile,
  loadFallbackLang,
  mergeLangs
}
