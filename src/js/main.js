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
    const src = firstImg?.src || './assets/images/car.png'
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
    const versionWrap = modalEl.querySelectorAll('.modal-option-box .version-list')[0]
    if (versionWrap) versionWrap.innerHTML = versions.map((v,i)=>`<div class="version-item ${i===0?'active-version':''}" data-version="${v}">${v}</div>`).join('')
    const colorWrap = modalEl.querySelector('.version-color-list')
    if (colorWrap) colorWrap.innerHTML = colors.map((c,i)=>`<div class="color-version ${i===0?'color-active-version':''}" data-color-name="${c.name}" data-color-value="${c.value}" style="--version-color:${c.value}"></div>`).join('')
    const lists = modalEl.querySelectorAll('.modal-option-box .version-list')
    const accessoriesWrap = lists[1]
    if (accessoriesWrap) accessoriesWrap.innerHTML = accessories.map(a=>`<div class="version-item" data-accessory="${a}">${a}</div>`).join('')
}

function saveSelectedCarAndClose(modalEl, logLabel = 'selectedCar') {
    if (!selectedCar) return
    try {
        localStorage.setItem('selectedCar', JSON.stringify(selectedCar))
        const stored = JSON.parse(localStorage.getItem('selectedCar') || 'null')
        console.log(`Saved to localStorage (${logLabel}):`, stored)
    } catch (e) {
        console.error('localStorage error:', e)
    }
    document.activeElement?.blur()
}

function wireOptionHandlers(modalEl) {
    if (optionHandlersAbort) optionHandlersAbort.abort()
    optionHandlersAbort = new AbortController()
    const { signal } = optionHandlersAbort
    modalEl.addEventListener('click', (e) => {
        const verEl = e.target.closest('.version-item[data-version]')
        if (!verEl) return
        const list = verEl.parentElement
        list.querySelectorAll('.version-item').forEach(el=>el.classList.remove('active-version'))
        verEl.classList.add('active-version')
        selectedCar.version = verEl.dataset.version
    }, { signal })
    modalEl.addEventListener('click', (e) => {
        const colEl = e.target.closest('.color-version[data-color-value]')
        if (!colEl) return
        const list = colEl.parentElement
        list.querySelectorAll('.color-version').forEach(el=>el.classList.remove('color-active-version'))
        colEl.classList.add('color-active-version')
        selectedCar.color = { name: colEl.dataset.colorName, value: colEl.dataset.colorValue }
    }, { signal })
    modalEl.addEventListener('click', (e) => {
        const accEl = e.target.closest('.version-item[data-accessory]')
        if (!accEl) return
        const name = accEl.dataset.accessory
        const idx = selectedCar.accessories.indexOf(name)
        if (idx >= 0) { selectedCar.accessories.splice(idx,1); accEl.classList.remove('active-version') }
        else { selectedCar.accessories.push(name); accEl.classList.add('active-version') }
    }, { signal })

    const saveBtn = modalEl.querySelector('.modal-footer .btn.btn-primary')
    saveBtn?.addEventListener('click', () => {
        saveSelectedCarAndClose(modalEl, 'selectedCar')
    }, { signal })

    const findBtn = modalEl.querySelector('.modal-info-box-options .btn.btn-brand-color-primary')
    findBtn?.addEventListener('click', () => {
        saveSelectedCarAndClose(modalEl, 'selectedCar via Find')
    }, { signal })

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
    const first = images[0] || { src: 'assets/images/hero-image.png', alt: car.name }
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

async function renderCars({ jsonPath = './cars.json', containerSelector = '[data-card-list]', data = null } = {}) {
    const container = document.querySelector(containerSelector)
    if (!container) throw new Error(`Container ${containerSelector} not found`)
    const cars = data || await fetchCars(jsonPath)
    if (!cars.length) {
        container.innerHTML = `
      <div class="alert alert-warning" role="alert">
        Brak wyników dla wybranych filtrów.
      </div>
    `
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
    return {
        type,
        drive,
        minPrice: Number.isNaN(minRaw) ? null : minRaw,
        maxPrice: Number.isNaN(maxRaw) ? null : maxRaw
    }
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