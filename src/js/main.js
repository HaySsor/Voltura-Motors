import '../scss/styles.scss'
import * as bootstrap from 'bootstrap'

let carsCache = null
let selectedCar = null
let optionHandlersAbort = null
let imageSwapAbort = null

async function fetchCars(jsonPath = `${import.meta.env.BASE_URL}cars.json`) {
    if (carsCache) return carsCache
    const res = await fetch(jsonPath)
    if (!res.ok) throw new Error(`Failed to load ${jsonPath}`)
    carsCache = await res.json()
    return carsCache
}

function carCardHTML(car) {
    const firstImg = Array.isArray(car.images) && car.images[0] ? car.images[0] : null
    const src = firstImg?.src || `${import.meta.env.BASE_URL}assets/images/car.png`
    const alt = firstImg?.alt || car.name
    return `
    <div class="car-card-item">
      <img src="${src}" alt="${alt}" />
      <div class="car-card-box">
        <div class="price-box">
          <span class="car-name">${car.name}</span>
          <span class="car-price">od ${car.price}</span>
          <span class="car-range">${car.drive} • ${car.range} range</span>
        </div>
        <button 
          data-id="${car.id}" 
          data-bs-toggle="modal" 
          data-bs-target="#carModal" 
          class="btn btn-brand-color-secondary">
          Sprawdź
        </button>
      </div>
    </div>
  `
}

function enableModalImageSwap(modalSelector = '#carModal') {
    const modalEl = document.querySelector(modalSelector)
    if (!modalEl) return
    if (imageSwapAbort) imageSwapAbort.abort()
    imageSwapAbort = new AbortController()
    const { signal } = imageSwapAbort
    const mainImg = modalEl.querySelector('.modal-images-box-main')
    const grid = modalEl.querySelector('.modal-images-grid')
    if (!mainImg || !grid) return
    grid.addEventListener('click', (e) => {
        const clicked = e.target.closest('.grid-image img')
        if (!clicked) return
        mainImg.src = clicked.src
        mainImg.alt = clicked.alt || ''
    }, { signal })
}

function normalizeCarOptions(car) {
    const versions = Array.isArray(car.versions) && car.versions.length ? car.versions : ['Podstawowa','Sport','Performance']
    const colors = Array.isArray(car.colors) && car.colors.length ? car.colors : [
        { name: 'Czerwony', value: '#d00000' },
        { name: 'Niebieski', value: '#0652ff' },
        { name: 'Żółty', value: '#ffd60a' }
    ]
    let accessories = Array.isArray(car.accessories) ? car.accessories.slice(0,3) : []
    if (!accessories.length) accessories = ['Koła zimowe','Akcesoria','Bagażnik dachowy']
    return { versions, colors, accessories }
}

function renderOptionLists(modalEl, car) {
    const { versions, colors, accessories } = normalizeCarOptions(car)
    selectedCar = { id: car.id, model: car.name, version: versions[0], color: colors[0], accessories: [] }

    const versionsBox = modalEl.querySelector('.modal-option-box .version-list[aria-label="Wybierz wersję"]')
    const colorsBox   = modalEl.querySelector('.modal-option-box .version-color-list[aria-label="Wybierz kolor"]')
    const accBox      = modalEl.querySelector('.modal-option-box .version-list[aria-label="Wybierz dodatki"]')

    if (versionsBox) {
        versionsBox.setAttribute('role','listbox')
        versionsBox.dataset.selectMode = 'single'
        versionsBox.dataset.kind = 'version'
        versionsBox.innerHTML = versions.map((v,i)=>(
            `<button type="button" class="version-item${i===0?' active-version':''}" 
               role="option" aria-selected="${i===0?'true':'false'}" 
               tabindex="${i===0?'0':'-1'}" data-version="${v}">
         ${v}
       </button>`
        )).join('')
    }

    if (colorsBox) {
        colorsBox.setAttribute('role','listbox')
        colorsBox.dataset.selectMode = 'single'
        colorsBox.dataset.kind = 'color'
        colorsBox.innerHTML = colors.map((c,i)=>(
            `<button type="button" class="color-version${i===0?' color-active-version':''}" 
               role="option" aria-selected="${i===0?'true':'false'}"
               tabindex="${i===0?'0':'-1'}"
               aria-label="${c.name}"
               data-color-name="${c.name}" data-color-value="${c.value}"
               style="--version-color:${c.value}">
      </button>`
        )).join('')
    }

    if (accBox) {
        accBox.setAttribute('role','listbox')
        accBox.setAttribute('aria-multiselectable','true')
        accBox.dataset.selectMode = 'multi'
        accBox.dataset.kind = 'accessory'
        accBox.innerHTML = accessories.map((a,i)=>(
            `<button type="button" class="version-item" 
               role="option" aria-selected="false" 
               tabindex="${i===0?'0':'-1'}" data-accessory="${a}">
         ${a}
       </button>`
        )).join('')
    }
}

function saveAndClose(modalEl, label) {
    if (!selectedCar) return
    try {
        localStorage.setItem('selectedCar', JSON.stringify(selectedCar))
        const stored = JSON.parse(localStorage.getItem('selectedCar') || 'null')
        console.log(`Saved (${label}):`, stored)
    } catch (e) { console.error('localStorage error:', e) }
    document.activeElement?.blur()
}

function wireOptionHandlers(modalEl) {
    if (optionHandlersAbort) optionHandlersAbort.abort()
    optionHandlersAbort = new AbortController()
    const { signal } = optionHandlersAbort

    const updateRoving = (container, next) => {
        container.querySelectorAll('[role="option"]').forEach(el=>{ el.tabIndex = -1 })
        next.tabIndex = 0
        next.focus()
    }

    const selectSingle = (container, optionEl) => {
        container.querySelectorAll('[role="option"]').forEach(el=>{
            el.setAttribute('aria-selected','false')
            el.classList.remove('active-version','color-active-version')
        })
        optionEl.setAttribute('aria-selected','true')
        if (container.dataset.kind === 'version') optionEl.classList.add('active-version')
        if (container.dataset.kind === 'color')   optionEl.classList.add('color-active-version')
        updateRoving(container, optionEl)
        if (container.dataset.kind === 'version') selectedCar.version = optionEl.dataset.version
        else if (container.dataset.kind === 'color') selectedCar.color = { name: optionEl.dataset.colorName, value: optionEl.dataset.colorValue }
    }

    const toggleMulti = (container, optionEl) => {
        const name = optionEl.dataset.accessory
        const isSelected = optionEl.getAttribute('aria-selected') === 'true'
        optionEl.setAttribute('aria-selected', isSelected ? 'false' : 'true')
        optionEl.classList.toggle('active-version', !isSelected)
        if (!selectedCar.accessories) selectedCar.accessories = []
        if (isSelected) selectedCar.accessories = selectedCar.accessories.filter(x=>x!==name)
        else selectedCar.accessories.push(name)
        updateRoving(container, optionEl)
    }

    modalEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[role="option"]')
        if (!btn) return
        const container = btn.closest('[role="listbox"]')
        if (!container) return
        if (container.dataset.selectMode === 'single') selectSingle(container, btn)
        else toggleMulti(container, btn)
    }, { signal })

    modalEl.addEventListener('keydown', (e) => {
        const current = e.target.closest('[role="option"]')
        if (!current) return
        const container = current.closest('[role="listbox"]')
        if (!container) return
        const options = Array.from(container.querySelectorAll('[role="option"]'))
        const idx = options.indexOf(current)
        const move = (d) => { const next = options[(idx + d + options.length) % options.length]; updateRoving(container, next) }
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown': e.preventDefault(); move(1); break
            case 'ArrowLeft':
            case 'ArrowUp':   e.preventDefault(); move(-1); break
            case 'Home':      e.preventDefault(); updateRoving(container, options[0]); break
            case 'End':       e.preventDefault(); updateRoving(container, options[options.length-1]); break
            case ' ':
            case 'Enter':     e.preventDefault(); if (container.dataset.selectMode === 'single') selectSingle(container, current); else toggleMulti(container, current); break
            default: break
        }
    }, { signal })

    const saveBtn = modalEl.querySelector('.modal-footer .btn.btn-primary')
    const findBtn = modalEl.querySelector('.modal-info-box-options .btn.btn-brand-color-primary')
    if (saveBtn) saveBtn.addEventListener('click', () => saveAndClose(modalEl, 'Save'), { signal })
    if (findBtn) findBtn.addEventListener('click', () => saveAndClose(modalEl, 'Find'), { signal })

    modalEl.addEventListener('hidden.bs.modal', () => {
        if (optionHandlersAbort) optionHandlersAbort.abort()
        if (imageSwapAbort) imageSwapAbort.abort()
    }, { signal })
}

function populateCarModal(car) {
    const modalEl = document.getElementById('carModal')
    if (!modalEl) return
    const title = modalEl.querySelector('.modal-title')
    if (title) title.textContent = `${car.name} – Szczegóły modelu`
    const images = Array.isArray(car.images) ? car.images.slice(0,3) : []
    const mainImg = modalEl.querySelector('.modal-images-box-main')
    const first = images[0] || { src: `${import.meta.env.BASE_URL}assets/images/hero-image.png`, alt: car.name }
    if (mainImg) { mainImg.src = first.src; mainImg.alt = first.alt || '' }
    const gridHolders = modalEl.querySelectorAll('.modal-images-grid .grid-image')
    gridHolders.forEach((holder,i)=>{
        holder.innerHTML=''
        const imgObj = images[i]
        if (!imgObj) { holder.style.display='none'; return }
        holder.style.display=''
        const img=document.createElement('img')
        img.alt = imgObj.alt || `${car.name} ${i+1}`
        img.src = imgObj.src
        holder.appendChild(img)
    })
    const priceEl = modalEl.querySelector('.modal-info-box .car-price')
    if (priceEl && car.price) priceEl.textContent = car.price
    const setDetail = (labelText, value) => {
        const row = Array.from(modalEl.querySelectorAll('.modal-details-row')).find(r=>r.querySelector('.details-label')?.textContent.trim()===labelText)
        if (row) { const v=row.querySelector('.details-value'); if (v) v.textContent = value || '—' }
    }
    setDetail('0–100 km/h', car.acceleration)
    setDetail('Maksymalna prędkość', car.topSpeed)
    setDetail('Ładowanie', car.charging)
    setDetail('Pojemność bagażnika', car.trunkCapacity)
    setDetail('Gwarancja', car.warranty)
    renderOptionLists(modalEl, car)
    wireOptionHandlers(modalEl)
    enableModalImageSwap()
    bootstrap.Modal.getOrCreateInstance(modalEl).show()
}

function parsePriceToNumber(str) {
    const cleaned = String(str || '').replace(/[^\d]/g,'').trim()
    if (!cleaned) return NaN
    return Number(cleaned)
}

async function renderCars({ jsonPath = `${import.meta.env.BASE_URL}cars.json`, containerSelector = '[data-card-list]', data = null } = {}) {
    const container = document.querySelector(containerSelector)
    if (!container) throw new Error(`Container ${containerSelector} not found`)
    const cars = data || await fetchCars(jsonPath)
    if (!cars.length) {
        container.innerHTML = `<div class="alert alert-warning" role="alert">Brak wyników dla wybranych filtrów.</div>`
        return
    }
    container.innerHTML = cars.map(carCardHTML).join('')
}

function collectFilterValues() {
    const typeSel = document.querySelector('.car-filters .auto-type')
    const typeVal = (typeSel ? typeSel.value : 'ALL')?.trim()
    const type = typeVal && typeVal !== 'ALL' ? typeVal : null
    const driveSel = document.querySelector('.car-filters .auto-drive')
    const driveVal = (driveSel ? driveSel.value : 'ALL')?.trim()
    const drive = driveVal && driveVal !== 'ALL' ? driveVal.toUpperCase() : null
    const priceInputs = document.querySelectorAll('.car-filters .price-wrapper input')
    const minRaw = parsePriceToNumber(priceInputs?.[0]?.value)
    const maxRaw = parsePriceToNumber(priceInputs?.[1]?.value)
    return { type, drive, minPrice: Number.isNaN(minRaw) ? null : minRaw, maxPrice: Number.isNaN(maxRaw) ? null : maxRaw }
}

function applyFilters(cars, { type, drive, minPrice, maxPrice }) {
    return cars.filter(c => {
        if (type && String(c.type).trim() !== type) return false
        if (drive && String(c.drive || '').toUpperCase().trim() !== drive) return false
        const p = parsePriceToNumber(c.price)
        if (!Number.isNaN(p)) {
            if (minPrice != null && p < minPrice) return false
            if (maxPrice != null && p > maxPrice) return false
        }
        return true
    })
}

function populateDriveSelectFromData(cars) {
    const driveSel = document.querySelector('.car-filters .auto-drive')
    if (!driveSel) return
    const drives = Array.from(new Set(cars.map(c=>String(c.drive||'').toUpperCase().trim()).filter(Boolean)))
    driveSel.innerHTML = `<option value="ALL" selected>Wszystkie</option>` + drives.map(d=>`<option value="${d}">${d}</option>`).join('')
}

document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.car-card-item button[data-id]')
    if (!btn) return
    e.preventDefault()
    try {
        const id = Number(btn.dataset.id)
        const cars = await fetchCars()
        const car = cars.find(c => Number(c.id) === id)
        if (!car) throw new Error('Car not found')
        populateCarModal(car)
    } catch (err) {
        console.error('Modal open error:', err)
    }
})

document.addEventListener('DOMContentLoaded', async () => {
    const cars = await fetchCars()
    populateDriveSelectFromData(cars)
    await renderCars({ data: cars })
    const filterBtn = document.querySelector('.car-filters .btn.btn-brand-color-primary')
    if (filterBtn) {
        filterBtn.addEventListener('click', async (e) => {
            e.preventDefault()
            const all = await fetchCars()
            const f = collectFilterValues()
            const filtered = applyFilters(all, f)
            await renderCars({ data: filtered })
        })
    }
})
