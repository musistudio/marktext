import fs from 'fs'
import http from 'http'
import https from 'https'
import path from 'path'

export const downloader = (url, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  let fileName = url.split('/').pop()
  return new Promise((resolve, reject) => {
    let file = null
    const client = url.startsWith('https') ? https : http
    const request = client.get(url, response => {
      if (!file) {
        if (response.headers['content-disposition']) {
          fileName = response.headers['content-disposition'].split('filename=')[1]
        }
        file = fs.createWriteStream(path.join(dest, fileName))
      }
      response.pipe(file)
    })
    request.on('close', err => {
      if (err) return reject(err)
      if (file) {
        file.close(() => resolve())
      } else {
        resolve()
      }
    })
  })
}
