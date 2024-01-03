export namespace Bear {
  // If no other tag is provided, DEFAULT_PARENT_TAG is automatically added and is also prepended to provided tags.
  // E.g., leadership -> 'omnivore/leadership'.
  // Read about nested tags here: https://bear.app/faq/nested-tags/
  const DEFAULT_PARENT_TAG = 'omnivore'

  const prepareTags = (tags: string[], parentTag: string): string[] => {
    if (tags.length === 0) {
      tags.push(parentTag)
    } else {
      tags.forEach((element, index) => {
        tags[index] = encodeURIComponent(`${parentTag}/${element}`);
      });
    }

    return tags
  }

  function execute(cmd: string, args: string[]) {
    return new Promise(function (resolve, reject) {
      args.unshift(cmd)
      const proc = Bun.spawn(args, {
        onExit(proc, exitCode, signalCode, error) {
          if (error !== undefined) {
            reject(error)
          }

          resolve(exitCode)
        }
      });
    });
  }

  export const open = async () => {
    return await execute('open', ['--hide', '--background', 'bear://'])
  }

  export const createNote = async (title: string, tags: string[], parentTag: string = DEFAULT_PARENT_TAG) => {
    title = encodeURIComponent(title)
    tags = prepareTags(tags, parentTag)

    const callbackUrl = `bear://x-callback-url/create?title=${title}&tags=${tags.join(',')}&open_note=no&clipboard=no&new_window=no&float=no&show_window=no&pin=no&edit=no&timestamp=no`
    return await execute('open', ['--hide', '--background', callbackUrl])
  }

  export const appendToNote = async (title: string, tags: string[], text: string, parentTag: string = DEFAULT_PARENT_TAG) => {
    title = encodeURIComponent(title)
    text = encodeURIComponent(text)
    tags = prepareTags(tags, parentTag)

    const callbackUrl = `bear://x-callback-url/add-text?text=${text}&title=${title}&selected=no&mode=append&open_note=yes&open_note=no&new_window=no&show_window=no&edit=no&edit=no&clipboard=no`
    return await execute('open', ['--hide', '--background', callbackUrl])
  }

  export namespace Markdown {
    export const h2 = (text: string): string => {
      return `## ${text}`
    }
    
    export const bold = (text: string): string => {
      return `**${text}**`
    }

    export const underline = (text: string): string => {
      return `~${text}~`
    }
    
    export const link = (text: string, url: string): string => {
      return `[${text}](${url})`
    }
    
    export const italic = (text: string): string => {
      return `*${text}*`
    }
    
    export const mark = (text: string): string => {
      return `==${text}==`
    }
    
    export const quote = (text: string): string => {
      return `> ${text}`
    }
  }
}
