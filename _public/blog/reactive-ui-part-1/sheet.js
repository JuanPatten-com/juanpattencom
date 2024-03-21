window.initSheet = function() {

  //////////////////////////////////////////////////////////////////////
  // Utilities

  elem = document.createElement.bind(document)
  let alphabet = 'abcdefghijklmnopqrstuvwxyz'


  //////////////////////////////////////////////////////////////////////
  // Shared State

  let [rows, cols] = [Atom(10), Atom(10)]
  let selectedIndex = Atom()
  let isEditing = Atom(false)


  //////////////////////////////////////////////////////////////////////
  // Cell Evaluation

  let env = {eval, Math}
  for (let k of Object.getOwnPropertyNames(Math)) { env[k] = Math[k] }
  let evalEnv = new Proxy(env, {
    has(c, key) { return c[key] != null },
    get(c, key) { 
      let val = c[key], result = val?.result
      return result ? result() : val
    }
  })
  function evalCell(code) { 
    if (!code) { return '' }
    try {
      with(evalEnv) { return eval(code) }
    } catch(e) {
      return e
    }
  }


  //////////////////////////////////////////////////////////////////////
  // Table

  let table = elem('table')

  Effect(() => {
    table.classList.toggle('selected', selectedIndex() != null)
    table.classList.toggle('editing', isEditing())
  })


  //////////////////////////////////////////////////////////////////////
  // Cells

  for (let r = 0; r < 26; r++) {
    let row = table.appendChild(elem('tr'))
    for (let c = 0; c < 26; c++) {
      let cell = row.appendChild(elem('td'))
      let input = cell.appendChild(elem('input'))
      let output = cell.appendChild(elem('div'))

      let rowIndex = `${r+1}`
      let colIndex = `${alphabet[c]}`
      let index = `${colIndex}${rowIndex}`

      // Cell reactive data
      env[index] = cell
      cell.formula = Atom()
      cell.result = Calc(() => evalCell(cell.formula()))
      Effect(() => {
        let isSelected = (selectedIndex() == index)
        cell.classList.toggle('selected', isSelected)
        cell.classList.toggle('editing', isSelected && isEditing())
        let result = cell.result()
        if (result instanceof Error) {
          output.innerHTML = `<div class=err title="${result}">‼️</div>`
        } else {
          output.innerText = cell.result()
        }
      })

      // Cell DOM setup
      cell.input = input
      cell.title = `${index}`
      cell.dataset.index = `${index}`
      cell.tabIndex = (r * cols) + c
      cell.edit = () => {
        cell.classList.add('editing')
        input.focus()
        input.select()
        selectedIndex.set(index)
        isEditing.set(true)
      }
      cell.finishEditing = () => {
        cell.formula.set(input.value)
        selectedIndex.set(null)
        isEditing.set(false)
      }
      cell.cancelEditing = () => {
        input.value = cell.formula.peek()
        selectedIndex.set(null)
        isEditing.set(false)
      }
      cell.addEventListener('click', e => {
        if (isEditing.peek()) { return }
        cell.edit()
      })
      cell.addEventListener('mousedown', e => {
        closeSidebar()
        if (isEditing.peek()) {
          e.preventDefault()
          e.stopPropagation()
          let selIdx = selectedIndex.peek()
          if (selIdx == index) { return }
          let selected = env[selIdx]
          if (selected) {
            document.execCommand('insertText', false, index)
          }
          return false
        }
      })

      // Input DOM setup
      input.setAttribute('autocorrect', 'off')
      input.setAttribute('autocapitalize', 'none')
      input.addEventListener('keydown', e => {
        if (e.key == 'Enter') {
          cell.finishEditing()
        }
        else if (e.key == 'Escape') {
          cell.cancelEditing()
          evt.preventDefault()
          evt.stopPropagation()
        }
        else if (e.key == 'Tab') {
          e.preventDefault()
          cell.finishEditing()
        }
      })
      input.addEventListener('blur', e => {
        if (isEditing.peek()) {
          cell.finishEditing()
        }
      })

      // Output DOM setup
      output.className = 'output'
    }
  }

  document.body.addEventListener('click', e => {
    if (e.target == document.body) {
      selectedIndex.set(null)
      closeSidebar()
    }
  })

  document.body.addEventListener('keydown', e => {
    if (e.target.tagName == 'INPUT') { return }
    if ((selectedIndex() != null) && !isEditing()) {
      isEditing.set(true)
    }
  })


  //////////////////////////////////////////////////////////////////////
  // Dimensions

  let dimSheet = document.getElementById('dimensions').sheet
  let rowRule = dimSheet.cssRules[0]
  let colRule = dimSheet.cssRules[1]
  Effect(() => {
    rowRule.selectorText = `tr:nth-child(n+${rows()+1})`
  })
  Effect(() => {
    colRule.selectorText = `td:nth-child(n+${cols()+1})`
  })

  let menu = document.getElementById('menu')
  let rowSlider = menu.querySelector('[name="rows"]')
  let colSlider = menu.querySelector('[name="cols"]')

  rowSlider.value = rows()
  colSlider.value = cols()

  rowSlider.addEventListener('input', e => {
    rows.set(parseInt(rowSlider.value, 10))
  })

  colSlider.addEventListener('input', e => {
    cols.set(parseInt(colSlider.value), 10)
  })

  function closeSidebar() {
    menu.removeAttribute('open')
  }


  //////////////////////////////////////////////////////////////////////
  // Ok, ready go!

  document.body.appendChild(table)

}


