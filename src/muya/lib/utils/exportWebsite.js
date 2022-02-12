import { marked } from 'marked'
import Prism from 'prismjs'
import katex from 'katex'
import 'katex/dist/contrib/mhchem.min.js'
import loadRenderer from '../renderers'
import exportStyle from '../assets/styles/exportStyle.css'
import highlightCss from 'prismjs/themes/prism.css'
import katexCss from 'katex/dist/katex.css'
import footerHeaderCss from '../assets/styles/headerFooterStyle.css'
import { EXPORT_DOMPURIFY_CONFIG } from '../config'
import { sanitize, unescapeHtml } from '../utils'
import { validEmoji } from '../ui/emojis'

export const getSanitizeHtml = (markdown, options) => {
  const html = marked(markdown, options)
  return sanitize(html, EXPORT_DOMPURIFY_CONFIG, false)
}

const DIAGRAM_TYPE = [
  'mermaid',
  'flowchart',
  'sequence',
  'vega-lite'
]

class ExportWebsite {
  constructor (markdown, muya) {
    this.markdown = markdown
    this.muya = muya
    this.exportContainer = null
    this.mathRendererCalled = false
  }

  async renderMermaid () {
    const codes = this.exportContainer.querySelectorAll('code.language-mermaid')
    for (const code of codes) {
      const preEle = code.parentNode
      const mermaidContainer = document.createElement('div')
      mermaidContainer.innerHTML = code.innerHTML
      mermaidContainer.classList.add('mermaid')
      preEle.replaceWith(mermaidContainer)
    }
    const mermaid = await loadRenderer('mermaid')
    // We only export light theme, so set mermaid theme to `default`, in the future, we can choose whick theme to export.
    mermaid.initialize({
      theme: 'default'
    })
    mermaid.init(undefined, this.exportContainer.querySelectorAll('div.mermaid'))
    if (this.muya) {
      mermaid.initialize({
        theme: this.muya.options.mermaidTheme
      })
    }
  }

  async renderDiagram () {
    const selector = 'code.language-vega-lite, code.language-flowchart, code.language-sequence'
    const RENDER_MAP = {
      flowchart: await loadRenderer('flowchart'),
      sequence: await loadRenderer('sequence'),
      'vega-lite': await loadRenderer('vega-lite')
    }
    const codes = this.exportContainer.querySelectorAll(selector)
    for (const code of codes) {
      const rawCode = unescapeHtml(code.innerHTML)
      const functionType = /sequence/.test(code.className) ? 'sequence' : (/flowchart/.test(code.className) ? 'flowchart' : 'vega-lite')
      const render = RENDER_MAP[functionType]
      const preParent = code.parentNode
      const diagramContainer = document.createElement('div')
      diagramContainer.classList.add(functionType)
      preParent.replaceWith(diagramContainer)
      const options = {}
      if (functionType === 'sequence') {
        Object.assign(options, { theme: this.muya.options.sequenceTheme })
      } else if (functionType === 'vega-lite') {
        Object.assign(options, {
          actions: false,
          tooltip: false,
          renderer: 'svg',
          theme: 'latimes' // only render light theme
        })
      }
      try {
        if (functionType === 'flowchart' || functionType === 'sequence') {
          const diagram = render.parse(rawCode)
          diagramContainer.innerHTML = ''
          diagram.drawSVG(diagramContainer, options)
        } if (functionType === 'vega-lite') {
          await render(diagramContainer, JSON.parse(rawCode), options)
        }
      } catch (err) {
        diagramContainer.innerHTML = '< Invalid Diagram >'
      }
    }
  }

  mathRenderer = (math, displayMode) => {
    this.mathRendererCalled = true

    try {
      return katex.renderToString(math, {
        displayMode
      })
    } catch (err) {
      return displayMode
        ? `<pre class="multiple-math invalid">\n${math}</pre>\n`
        : `<span class="inline-math invalid" title="invalid math">${math}</span>`
    }
  }

  // render pure html by marked
  async renderHtml (toc) {
    this.mathRendererCalled = false
    let html = marked(this.markdown, {
      superSubScript: this.muya ? this.muya.options.superSubScript : false,
      footnote: this.muya ? this.muya.options.footnote : false,
      isGitlabCompatibilityEnabled: this.muya ? this.muya.options.isGitlabCompatibilityEnabled : false,
      highlight (code, lang) {
        // Language may be undefined (GH#591)
        if (!lang) {
          return code
        }

        if (DIAGRAM_TYPE.includes(lang)) {
          return code
        }

        const grammar = Prism.languages[lang]
        if (!grammar) {
          console.warn(`Unable to find grammar for "${lang}".`)
          return code
        }
        return Prism.highlight(code, grammar, lang)
      },
      emojiRenderer (emoji) {
        const validate = validEmoji(emoji)
        if (validate) {
          return validate.emoji
        } else {
          return `:${emoji}:`
        }
      },
      mathRenderer: this.mathRenderer,
      tocRenderer () {
        if (!toc) {
          return ''
        }
        return toc
      }
    })

    html = sanitize(html, EXPORT_DOMPURIFY_CONFIG, false)

    const exportContainer = this.exportContainer = document.createElement('div')
    exportContainer.classList.add('ag-render-container')
    exportContainer.innerHTML = html
    document.body.appendChild(exportContainer)

    // render only render the light theme of mermaid and diragram...
    await this.renderMermaid()
    await this.renderDiagram()
    let result = exportContainer.innerHTML
    exportContainer.remove()

    // hack to add arrow marker to output html
    const pathes = document.querySelectorAll('path[id^=raphael-marker-]')
    const def = '<defs style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0);">'
    result = result.replace(def, () => {
      let str = ''
      for (const path of pathes) {
        str += path.outerHTML
      }
      return `${def}${str}`
    })
    this.exportContainer = null
    return result
  }

  /**
   * Get HTML with style
   *
   * @param {*} options Document options
   */
  async generate (options) {
    const { title } = options
    const html = this._prepareHtml(await this.renderHtml(options.toc), options)
    const themeUrl = 'https://github.com/Brainote/NexT/archive/refs/heads/main.zip'
    console.log(themeUrl)

    const highlightCssStyle = highlightCss
    const katexCssStyle = this.mathRendererCalled ? katexCss : ''
    this.mathRendererCalled = false
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${sanitize(title || '', EXPORT_DOMPURIFY_CONFIG, true)}</title>
  <style>${highlightCssStyle}</style>
  <style>${katexCssStyle}</style>
  <style>${exportStyle}</style>
</head>
<body>
  ${html}
</body>
</html>`
  }

  /**
   * @private
   *
   * @param {string} html The converted HTML text.
   * @param {*} options The export options.
   */
  _prepareHtml (html, options) {
    const { header, footer } = options
    const appendHeaderFooter = !!header || !!footer
    if (!appendHeaderFooter) {
      return createMarkdownArticle(html)
    }

    if (!options.extraCss) {
      options.extraCss = footerHeaderCss
    } else {
      options.extraCss = footerHeaderCss + options.extraCss
    }

    let output = HF_TABLE_START
    if (header) {
      output += createTableHeader(options)
    }

    if (footer) {
      output += HF_TABLE_FOOTER
      output = createRealFooter(options) + output
    }

    output = output + createTableBody(html) + HF_TABLE_END
    return sanitize(output, EXPORT_DOMPURIFY_CONFIG, false)
  }
}

// Variables and function to generate the header and footer.
const HF_TABLE_START = '<table class="page-container">'
const createTableBody = html => {
  return `<tbody><tr><td>
  <div class="main-container">
    ${createMarkdownArticle(html)}
  </div>
</td></tr></tbody>`
}
const HF_TABLE_END = '</table>'

/// The header at is shown at the top.
const createTableHeader = options => {
  const { header, headerFooterStyled } = options
  const { type, left, center, right } = header
  let headerClass = type === 1 ? 'single' : ''
  headerClass += getHeaderFooterStyledClass(headerFooterStyled)
  return `<thead class="page-header ${headerClass}"><tr><th>
  <div class="hf-container">
    <div class="header-content-left">${left}</div>
    <div class="header-content">${center}</div>
    <div class="header-content-right">${right}</div>
  </div>
</th></tr></thead>`
}

/// Fake footer to reserve space.
const HF_TABLE_FOOTER = `<tfoot class="page-footer-fake"><tr><td>
  <div class="hf-container">
    &nbsp;
  </div>
</td></tr></tfoot>`

/// The real footer at is shown at the bottom.
const createRealFooter = options => {
  const { footer, headerFooterStyled } = options
  const { type, left, center, right } = footer
  let footerClass = type === 1 ? 'single' : ''
  footerClass += getHeaderFooterStyledClass(headerFooterStyled)
  return `<div class="page-footer ${footerClass}">
  <div class="hf-container">
    <div class="footer-content-left">${left}</div>
    <div class="footer-content">${center}</div>
    <div class="footer-content-right">${right}</div>
  </div>
</div>`
}

/// Generate the mardown article HTML.
const createMarkdownArticle = html => {
  return `<article class="markdown-body">${html}</article>`
}

/// Return the class whether a header/footer should be styled.
const getHeaderFooterStyledClass = value => {
  if (value === undefined) {
    // Prefer theme settings.
    return ''
  }
  return !value ? ' simple' : ' styled'
}

export default ExportWebsite
