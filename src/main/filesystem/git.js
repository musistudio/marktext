import simpleGit from 'simple-git'
import path from 'path'

export const getGit = (path) => {
  return simpleGit(path, { binary: 'git' })
}

export const cloneTheme = (repoUrl, dest) => {
  let repoName = repoUrl.split('/').pop()
  repoName = repoName.slice(0, repoName.lastIndexOf('.'))
  const git = getGit(dest)
  return git.clone(repoUrl, path.join(dest, repoName))
}

export const checkNewVersion = async (dest) => {
  const git = getGit(dest)
  return git.fetch()
}

export const updateTheme = (repoUrl, dest) => {
  const git = getGit(dest)
  return git.pull()
}
