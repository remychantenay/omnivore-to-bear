import { Article, getArticles, Highlight, HighlightType } from './omnivore';
import { Bear } from './bear';
import { DB } from './db';

export enum Header {
	ArticleDetails = 'Article Details',
	Links = 'Links',
	Highlights = 'Highlights',
	Notebook = 'Notebook',
}

const formatHighlight = (highlight: Highlight): string | undefined => {
  var text: string = '\n\n'

  if (highlight.quote) {
    const segments = highlight.quote.split('\n')
    for (let i = 0; i < segments.length; i++) {
      var seg = segments[i]
      if (seg !== "") {
        // Lists do not play nice with Bear's highlighter (which we use).
        if (seg.startsWith('* ')) seg = seg.replaceAll('* ', '• ')
        text += Bear.Markdown.quote(Bear.Markdown.italic(Bear.Markdown.mark(seg)))
        text += '\n'
      }
    }
  }

  if (highlight.annotation) {
    text += Bear.Markdown.bold(Bear.Markdown.underline('Note:'))
    text += ` ${highlight.annotation}`
  }
    
  return text
}

const PAGE_SIZE = 50
const ENDPOINT = 'https://api-prod.omnivore.app/api/graphql'
const QUERY = 'has:highlights'

var query = QUERY

console.log('📖 Starting omnivore-to-bear...')

if (!Bear.open) throw new Error('Could not reach out to Bear, please check it is installed.')

// Note: this could be improved using a 3pl.
const apiKey = Bun.argv.find((v) => v.includes('--api-key'))?.split('=')[1]
if (apiKey === undefined) throw new Error('Please provide your Omnivore API Key with --api-key')

const fromScratch = Bun.argv.find((v) => v.includes('--from-scratch'))?.split('=')[1]
if (fromScratch === "true") {
  DB.Truncate()
}

const archivedOnly = Bun.argv.find((v) => v.includes('--archived-only'))?.split('=')[1]
if (archivedOnly === "true") {
  query += ' in:archive'
}

const parentTag = Bun.argv.find((v) => v.includes('--parent-tag'))?.split('=')[1]

for (
let hasNextPage = true, articles: Article[] = [], after = 0;
  hasNextPage;
  after += PAGE_SIZE
) {
    ;[articles, hasNextPage] = await getArticles(
      apiKey,
      after, PAGE_SIZE,
      '',
      query,
      false,
      'highlightedMarkdown',
      ENDPOINT
    )

    console.log(`Exporting ${articles.length} articles.`)

    for (const article of articles) {
      if (DB.Get(article.id)) {
        console.log(`Already exported: "${article.title}"`)
        continue
      }

      var tags: string[] = []
      if (article.labels !== undefined) {
        tags = article.labels.map((val) => val.name)
      }

      var res = await Bear.createNote(article.title, tags, parentTag)
      if (res !== 0) throw new Error(`Unable to create note "${article.title}" in Bear: ${res}`)

      DB.Create(article.id, article.title)

      // Article Details.
      var noteContent: string = `${Bear.Markdown.h2(Header.ArticleDetails)}\n`
      if (article.siteName) noteContent += `${Bear.Markdown.bold('Site')}: ${article.siteName}\n`
      if (article.author) noteContent += `${Bear.Markdown.bold('Author(s)')}: ${article.author}\n`
      if (article.description) noteContent += `${Bear.Markdown.bold('Description')}: ${article.description}\n`

      // Links.
      noteContent += `\n${Bear.Markdown.h2(Header.Links)}\n`
      noteContent += `${Bear.Markdown.link('Link to original', article.originalArticleUrl)}\n`

      let deeplink = `omnivore://read/${article.id}`
      noteContent += `${Bear.Markdown.link('Deeplink', deeplink)}\n`

      if (article.highlights !== undefined) {
        const highlights = article.highlights.filter((hl) => hl.type == HighlightType.Highlight)
        if (highlights.length > 0) {
          // Highlights.
          noteContent += `\n${Bear.Markdown.h2(Header.Highlights)}`
          for (let i = 0; i < highlights.length; i++) {
            noteContent += formatHighlight(highlights[i])
          }
        }

        const notes = article.highlights.filter((hl) => hl.type == HighlightType.Note)
        if (notes.length > 0) {
          // Notes.
          noteContent += `\n\n${Bear.Markdown.h2(Header.Notebook)}\n`
          for (let i = 0; i < notes.length; i++) {
            noteContent += `${notes[i].annotation}`
          }
        }
      }

      noteContent += '\n---'

      res = await Bear.appendToNote(article.title, tags, noteContent, parentTag)
      if (res !== 0) throw new Error(`Unable to add content to note "${article.title}" in Bear: ${res}`)

      console.log(`✅ Successfully exported: "${article.title}"`)

      // The error below is just here to facilitate quick testing.
      // throw new Error('This is not an error. This is just to abort javascript')
  }
}
