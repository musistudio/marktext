import fse from 'fs-extra'
import fs from 'fs'
import path from 'path'
import EventEmitter from 'events'
import Store from 'electron-store'
import { BrowserWindow, ipcMain, nativeTheme } from 'electron'
import log from 'electron-log'
import { isWindows } from '../config'
import { hasSameKeys } from '../utils'
import schema from './schema'
import { downloader } from '../filesystem/downloader'

const PREFERENCES_FILE_NAME = 'preferences'

class Preference extends EventEmitter {
  /**
   * @param {AppPaths} userDataPath The path instance.
   *
   * NOTE: This throws an exception when validation fails.
   *
   */
  constructor (paths) {
    // TODO: Preferences should not loaded if global.MARKTEXT_SAFE_MODE is set.
    super()

    const { preferencesPath } = paths
    this.preferencesPath = preferencesPath
    this.hasPreferencesFile = fs.existsSync(path.join(this.preferencesPath, `./${PREFERENCES_FILE_NAME}.json`))
    this.store = new Store({
      schema,
      name: PREFERENCES_FILE_NAME
    })

    this.staticPath = path.join(__static, 'preference.json')
    this.init()
  }

  init = () => {
    let defaultSettings = null
    try {
      defaultSettings = fse.readJsonSync(this.staticPath)

      // Set best theme on first application start.
      if (nativeTheme.shouldUseDarkColors) {
        defaultSettings.theme = 'dark'
      }
    } catch (err) {
      log(err)
    }

    if (!defaultSettings) {
      throw new Error('Can not load static preference.json file')
    }

    // I don't know why `this.store.size` is 3 when first load, so I just check file existed.
    if (!this.hasPreferencesFile) {
      this.store.set(defaultSettings)
    } else {
      // Because `this.getAll()` will return a plainObject, so we can not use `hasOwnProperty` method
      // const plainObject = () => Object.create(null)
      const userSetting = this.getAll()
      // Update outdated settings
      const requiresUpdate = !hasSameKeys(defaultSettings, userSetting)
      const userSettingKeys = Object.keys(userSetting)
      const defaultSettingKeys = Object.keys(defaultSettings)

      if (requiresUpdate) {
        // remove outdated settings
        for (const key of userSettingKeys) {
          if (!defaultSettingKeys.includes(key)) {
            delete userSetting[key]
          }
        }
        // add new setting options
        for (const key in defaultSettings) {
          if (!userSettingKeys.includes(key)) {
            userSetting[key] = defaultSettings[key]
          }
        }
        this.store.set(userSetting)
      }
    }

    this._listenForIpcMain()
  }

  getAll () {
    return this.store.store
  }

  setItem (key, value) {
    ipcMain.emit('broadcast-preferences-changed', { [key]: value })
    return this.store.set(key, value)
  }

  getItem (key) {
    return this.store.get(key)
  }

  /**
   * Change multiple setting entries.
   *
   * @param {Object.<string, *>} settings A settings object or subset object with key/value entries.
   */
  setItems (settings) {
    if (!settings) {
      log.error('Cannot change settings without entires: object is undefined or null.')
      return
    }

    Object.keys(settings).forEach(key => {
      this.setItem(key, settings[key])
    })
  }

  getPreferedEol () {
    const endOfLine = this.getItem('endOfLine')
    if (endOfLine === 'lf') {
      return 'lf'
    }
    return endOfLine === 'crlf' || isWindows ? 'crlf' : 'lf'
  }

  exportJSON () {
    // todo
  }

  importJSON () {
    // todo
  }

  _listenForIpcMain () {
    ipcMain.on('mt::ask-for-user-preference', e => {
      const win = BrowserWindow.fromWebContents(e.sender)
      win.webContents.send('mt::user-preference', this.getAll())
    })
    ipcMain.on('mt::set-user-preference', (e, settings) => {
      this.setItems(settings)
    })
    ipcMain.on('mt::cmd-toggle-autosave', e => {
      this.setItem('autoSave', !!this.getItem('autoSave'))
    })

    ipcMain.on('set-user-preference', settings => {
      this.setItems(settings)
    })

    ipcMain.on('mt::download-theme', (e, themeUrl) => {
      console.log({ themeUrl })
      downloader(themeUrl, path.join(this.preferencesPath, 'themes/'))
      // console.log(themeUrl, this.preferencesPath)
    })
  }
}

export default Preference
