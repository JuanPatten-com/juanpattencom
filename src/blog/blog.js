$$('article sup[id^=fnref] a').forEach(link => {
  let footnote = $(link.attr('href'))
  tippy(link, {
    allowHTML: true,
    interactive: true,
    appendTo: () => document.body,
    theme: 'jrpat',
    content: footnote.innerHTML
  })
})

