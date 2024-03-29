window.initSheet = function() {

  //////////////////////////////////////////////////////////////////////
  // Utilities

  elem = document.createElement.bind(document)
  let alphabet = 'abcdefghijklmnopqrstuvwxyz'


  //////////////////////////////////////////////////////////////////////
  // Shared State

  let [rows, cols] = [Atom(10).label('rows'), Atom(10).label('cols')]
  let selectedIndex = Atom().label('selectedIndex')
  let isEditing = Atom(false).label('isEditing')


  //////////////////////////////////////////////////////////////////////
  // Cell Evaluation

  let env = {eval, Math}
  window.env = env
  for (let k of Object.getOwnPropertyNames(Math)) { env[k] = Math[k] }
  let evalEnv = new Proxy(env, {
    has(c, key) { return c[key] != null },
    get(c, key) { 
      let val = c[key], result = val?.result
      let ret = result ? result() : val
      if (ret instanceof Error) { throw ret }
      return ret
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
  }).label('fx:change-table-class')


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
      cell.formula = Atom().label(`${index}.formula`)
      cell.result = Calc(() => evalCell(cell.formula())).label(`${index}.result`)
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
      }).label('fx:update-cell-display')

      // Cell DOM setup
      cell.input = input
      cell.title = `${index}`
      cell.dataset.index = `${index}`
      cell.tabIndex = (r * cols.peek()) + c
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
        cell.edit()
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
          let nextTabIndex = (cell.tabIndex + 1) % (rows.peek() * cols.peek())
          document.querySelector(`[tabindex="${nextTabIndex}"]`)?.edit?.()
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
  }).label('fx:change-rows')
  Effect(() => {
    colRule.selectorText = `td:nth-child(n+${cols()+1})`
  }).label('fx:change-cols')

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


