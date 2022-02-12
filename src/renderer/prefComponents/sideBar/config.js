import GeneralIcon from '@/assets/icons/pref_general.svg'
import EditorIcon from '@/assets/icons/pref_editor.svg'
import MarkdownIcon from '@/assets/icons/pref_markdown.svg'
import ThemeIcon from '@/assets/icons/pref_theme.svg'
import ImageIcon from '@/assets/icons/pref_image.svg'
import ImageUploaderIcon from '@/assets/icons/pref_image_uploader.svg'
import SpellIcon from '@/assets/icons/pref_spellcheck.svg'
import GithubIcon from '@/assets/icons/pref_github.svg'

import preferences from '../../../main/preferences/schema'

export const category = [{
  name: 'General',
  label: 'general',
  icon: GeneralIcon,
  path: '/preference/general'
}, {
  name: 'Editor',
  label: 'editor',
  icon: EditorIcon,
  path: '/preference/editor'
}, {
  name: 'Markdown',
  label: 'markdown',
  icon: MarkdownIcon,
  path: '/preference/markdown'
}, {
  name: 'Spelling',
  label: 'spelling',
  icon: SpellIcon,
  path: '/preference/spelling'
}, {
  name: 'Theme',
  label: 'theme',
  icon: ThemeIcon,
  path: '/preference/theme'
}, {
  name: 'Image',
  label: 'image',
  icon: ImageIcon,
  path: '/preference/image'
}, {
  name: 'Image Uploader',
  label: 'imageUploader',
  icon: ImageUploaderIcon,
  path: '/preference/imageUploader'
}, {
  name: 'GitHub Page',
  label: 'githubPage',
  icon: GithubIcon,
  path: '/preference/githubPage'
}]

export const searchContent = Object.keys(preferences).map(k => {
  const { description, enum: emums } = preferences[k]
  let [category, preference] = description.split('--')
  if (Array.isArray(emums)) {
    preference += ` optional values: ${emums.join(', ')}`
  }
  return {
    category,
    preference
  }
})
  .filter(({ category: ca }) => category.some(c => c.label === ca.toLowerCase()))
