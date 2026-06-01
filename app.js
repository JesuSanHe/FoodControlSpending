// ============================================================
//  KitchenSync — app.js
//  Lógica completa de la SPA.
//  Depende de config.js (cargado antes en index.html).
// ============================================================

// ------------------------------------------------------------------
// Estado global
// ------------------------------------------------------------------
const state = {
  view:        'registro',          // 'registro' | 'inventario' | 'panel'
  cart:        [],                  // productos en el carrito actual
  currentUser: CONFIG.USUARIOS[0], // usuario seleccionado en registro
  inventario:  [],
  panel: {
    periodo:  'semana',            // 'semana' | 'mes' | 'todo'
    usuario:  'todos',
    data:     null,
  },
  loading: false,
};

// ------------------------------------------------------------------
// Helpers de formato
// ------------------------------------------------------------------
const fmt = {
  money:  v => '$' + Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  date:   s => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  today:  ()  => new Date().toISOString().slice(0, 10),
  daysTo: s   => s ? Math.round((new Date(s + 'T12:00:00') - new Date()) / 86400000) : null,
};

// Devuelve el color de la categoría o un gris por defecto
function catColor(nombre) {
  const c = CONFIG.CATEGORIAS.find(c => c.nombre === nombre);
  return c ? c.color : '#9e9e9e';
}
function catIcon(nombre) {
  const c = CONFIG.CATEGORIAS.find(c => c.nombre === nombre);
  return c ? c.icono : 'category';
}

// ------------------------------------------------------------------
// API — todas las peticiones son GET para evitar CORS preflight
// ------------------------------------------------------------------
async function apiGet(params = {}) {
  if (CONFIG.SCRIPT_URL === 'TU_URL_DE_APPS_SCRIPT_AQUÍ') {
    return { _demo: true };
  }
  const url = CONFIG.SCRIPT_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url);
  return res.json();
}

async function callSaveCompra(fecha, usuario, tienda, productos) {
  const params = {
    action:    'saveCompra',
    fecha,
    usuario,
    tienda,
    productos: encodeURIComponent(JSON.stringify(productos)),
  };
  return apiGet(params);
}

async function callUpdateStock(producto, delta) {
  return apiGet({ action: 'updateStock', producto, delta });
}

// ------------------------------------------------------------------
// Navegación
// ------------------------------------------------------------------
function showView(viewName) {
  state.view = viewName;

  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + viewName).classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });

  const titles = { registro: 'Registro de Compra', inventario: 'Inventario', panel: 'Panel de Análisis' };
  document.getElementById('topbar-title').textContent = titles[viewName];

  if (viewName === 'inventario' && state.inventario.length === 0) loadInventario();
  if (viewName === 'panel')      loadPanel();
}

// ------------------------------------------------------------------
// VISTA: REGISTRO
// ------------------------------------------------------------------
function initRegistro() {
  // Fecha por defecto = hoy
  document.getElementById('reg-fecha').value = fmt.today();

  // Selector de usuario
  const selUser = document.getElementById('reg-usuario');
  selUser.innerHTML = CONFIG.USUARIOS.map(u => `<option value="${u}">${u}</option>`).join('');
  selUser.value = state.currentUser;
  selUser.addEventListener('change', e => { state.currentUser = e.target.value; });

  // Selector de categoría
  const selCat = document.getElementById('reg-categoria');
  selCat.innerHTML = '<option value="">Categoría</option>' +
    CONFIG.CATEGORIAS.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');

  // Selector de unidad
  const selUnit = document.getElementById('reg-unidad');
  selUnit.innerHTML = CONFIG.UNIDADES.map(u => `<option value="${u}">${u}</option>`).join('');

  // Cálculo automático de precio unitario
  const inputCant = document.getElementById('reg-cantidad');
  const inputPrecio = document.getElementById('reg-precio');
  const spanTotal = document.getElementById('reg-total');
  const calcPrecioUnitario = () => {
    const cantidad = parseFloat(inputCant.value) || 0;
    const montoTotal = parseFloat(inputPrecio.value) || 0;
    const precioUnitario = cantidad > 0 ? montoTotal / cantidad : 0;
    spanTotal.textContent = fmt.money(precioUnitario);
  };
  inputCant.addEventListener('input', calcPrecioUnitario);
  inputPrecio.addEventListener('input', calcPrecioUnitario);

  // Botón agregar al carrito
  document.getElementById('btn-agregar').addEventListener('click', agregarAlCarrito);

  // Botón guardar compra
  document.getElementById('btn-guardar').addEventListener('click', guardarCompra);
}

function agregarAlCarrito() {
  const nombre   = document.getElementById('reg-nombre').value.trim();
  const cat      = document.getElementById('reg-categoria').value;
  const unidad   = document.getElementById('reg-unidad').value;
  const cantidad = parseFloat(document.getElementById('reg-cantidad').value) || 0;
  const montoTotal = parseFloat(document.getElementById('reg-precio').value) || 0;
  const venc     = document.getElementById('reg-vencimiento').value;

  if (!nombre)   return showToast('Ingresa el nombre del producto', 'error');
  if (!cat)      return showToast('Selecciona una categoría', 'error');
  if (cantidad <= 0) return showToast('Cantidad debe ser mayor a 0', 'error');
  if (montoTotal <= 0)   return showToast('Monto total debe ser mayor a 0', 'error');

  const precioUnitario = montoTotal / cantidad;
  state.cart.push({ nombre, categoria: cat, unidad, cantidad, precioUnitario, total: montoTotal, fechaVencimiento: venc });
  renderCart();

  // Limpiar campos del producto (mantener fecha, usuario, tienda)
  document.getElementById('reg-nombre').value      = '';
  document.getElementById('reg-cantidad').value    = '1';
  document.getElementById('reg-precio').value      = '';
  document.getElementById('reg-vencimiento').value = '';
  document.getElementById('reg-total').textContent  = fmt.money(0);
  document.getElementById('reg-nombre').focus();

  showToast(`"${nombre}" agregado al carrito`);
}

function renderCart() {
  const container = document.getElementById('cart-list');
  const btnGuardar = document.getElementById('btn-guardar');
  const spanCount  = document.getElementById('cart-count');
  const spanSub    = document.getElementById('cart-subtotal');

  const total = state.cart.reduce((s, i) => s + i.total, 0);
  spanCount.textContent = state.cart.length + (state.cart.length === 1 ? ' artículo' : ' artículos');
  spanSub.textContent   = fmt.money(total);
  btnGuardar.disabled   = state.cart.length === 0;

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-on-surface-variant gap-2">
        <span class="material-symbols-outlined text-4xl opacity-40">shopping_basket</span>
        <p class="text-body-sm">No hay productos en el carrito</p>
      </div>`;
    return;
  }

  container.innerHTML = state.cart.map((item, idx) => `
    <div class="flex items-center gap-3 py-2 border-b border-outline-variant last:border-0">
      <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${catColor(item.categoria)}"></div>
      <div class="flex-1 min-w-0">
        <p class="text-body-sm font-semibold text-on-surface truncate">${item.nombre}</p>
        <p class="text-label-sm text-on-surface-variant">${item.cantidad} ${item.unidad} × ${fmt.money(item.precioUnitario)}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-body-sm font-bold text-primary">${fmt.money(item.total)}</span>
        <button onclick="removeFromCart(${idx})" class="text-on-surface-variant hover:text-error active:scale-95 transition-transform">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>`).join('');
}

function removeFromCart(idx) {
  state.cart.splice(idx, 1);
  renderCart();
}

async function guardarCompra() {
  if (state.cart.length === 0) return;

  const fecha  = document.getElementById('reg-fecha').value;
  const usuario = document.getElementById('reg-usuario').value;
  const tienda  = document.getElementById('reg-tienda').value.trim();

  if (!fecha)  return showToast('Selecciona una fecha', 'error');
  if (!tienda) return showToast('Ingresa el lugar de compra', 'error');

  const btn = document.getElementById('btn-guardar');
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">autorenew</span> Guardando…';

  const res = await callSaveCompra(fecha, usuario, tienda, [...state.cart]);

  if (res.error) {
    showToast('Error: ' + res.error, 'error');
  } else {
    showToast(`✓ ${res._demo ? 'Modo demo: ' : ''}${state.cart.length} producto(s) guardados`);
    state.cart = [];
    renderCart();
    // Forzar recarga del inventario la próxima vez
    state.inventario = [];
    state.panel.data = null;
  }

  btn.disabled = false;
  btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">cloud_upload</span> Guardar Compra Completa';
}

// ------------------------------------------------------------------
// VISTA: INVENTARIO
// ------------------------------------------------------------------
async function loadInventario() {
  const container = document.getElementById('inv-list');
  container.innerHTML = renderSkeleton(4);

  const res = await apiGet({ action: 'getInventario' });

  if (res._demo) {
    state.inventario = demoInventario();
  } else if (res.error) {
    container.innerHTML = renderError(res.error);
    return;
  } else {
    state.inventario = res.inventario || [];
  }

  renderInventario();
}

function renderInventario() {
  updateInvStats();

  const filter = document.getElementById('inv-filter')?.value?.toLowerCase() || '';
  const catFilter = state.invCatFilter || 'todos';

  let items = state.inventario;
  if (filter)              items = items.filter(i => i.producto.toLowerCase().includes(filter));
  if (catFilter !== 'todos') items = items.filter(i => i.categoria === catFilter);

  // Ordenar: agotados al final, vencimiento próximo primero
  items.sort((a, b) => {
    const dA = fmt.daysTo(a.fechaVencimiento);
    const dB = fmt.daysTo(b.fechaVencimiento);
    if (a.cantidad <= 0 && b.cantidad > 0) return 1;
    if (b.cantidad <= 0 && a.cantidad > 0) return -1;
    if (dA !== null && dB !== null) return dA - dB;
    if (dA !== null) return -1;
    if (dB !== null) return 1;
    return a.producto.localeCompare(b.producto);
  });

  const container = document.getElementById('inv-list');

  if (items.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 text-on-surface-variant gap-2">
        <span class="material-symbols-outlined text-5xl opacity-30">inventory_2</span>
        <p class="text-body-sm">Sin productos en el inventario</p>
      </div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const days   = fmt.daysTo(item.fechaVencimiento);
    const agotado = item.cantidad <= 0;

    let badge = '';
    if (agotado) {
      badge = `<span class="text-[10px] px-2 py-0.5 rounded-full bg-error-container text-error font-bold">Agotado</span>`;
    } else if (days !== null && days <= CONFIG.DIAS_ALERTA_VENCIMIENTO) {
      const color = days <= 2 ? 'bg-error-container text-error' : 'bg-[#fff8e1] text-[#f57f17]';
      badge = `<span class="text-[10px] px-2 py-0.5 rounded-full ${color} font-bold flex items-center gap-1">
        <span class="material-symbols-outlined text-[12px]">schedule</span>
        Vence en ${days} día${days !== 1 ? 's' : ''}
      </span>`;
    } else if (item.fechaVencimiento) {
      badge = `<span class="text-[10px] text-on-surface-variant flex items-center gap-1">
        <span class="material-symbols-outlined text-[12px]">event</span>${fmt.date(item.fechaVencimiento)}
      </span>`;
    }

    return `
    <div class="flex items-start gap-3 py-3 border-b border-outline-variant last:border-0">
      <div class="w-3 h-3 rounded-full flex-shrink-0 mt-1.5" style="background:${catColor(item.categoria)}"></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-body-sm font-semibold text-on-surface">${item.producto}</p>
          <span class="text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">${item.categoria}</span>
        </div>
        <p class="text-label-sm text-on-surface-variant mt-0.5">
          ${agotado ? '<span class="text-error font-bold">Sin stock</span>' : `<span class="font-bold text-on-surface">${item.cantidad} ${item.unidad}</span>`}
        </p>
        <div class="mt-1 flex items-center gap-2 flex-wrap">${badge}</div>
        ${item.tienda ? `<p class="text-[10px] text-on-surface-variant mt-1">Última compra: ${item.tienda} · ${fmt.money(item.ultimoPrecio)}</p>` : ''}
      </div>
      <div class="flex flex-col gap-1">
        <button onclick="ajustarStock('${item.producto.replace(/'/g, "\\'")}', 1)"
          class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center active:scale-95 transition-transform">
          <span class="material-symbols-outlined text-[16px]">add</span>
        </button>
        <button onclick="ajustarStock('${item.producto.replace(/'/g, "\\'")}', -1)"
          class="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center active:scale-95 transition-transform"
          ${item.cantidad <= 0 ? 'disabled' : ''}>
          <span class="material-symbols-outlined text-[16px]">remove</span>
        </button>
      </div>
    </div>`;
  }).join('');
}

function updateInvStats() {
  const hoy = new Date();
  const enStock   = state.inventario.filter(i => i.cantidad > 0).length;
  const porVencer = state.inventario.filter(i => {
    if (!i.fechaVencimiento) return false;
    const d = fmt.daysTo(i.fechaVencimiento);
    return d !== null && d >= 0 && d <= CONFIG.DIAS_ALERTA_VENCIMIENTO;
  }).length;
  const agotados  = state.inventario.filter(i => i.cantidad <= 0).length;

  document.getElementById('stat-stock').textContent     = enStock;
  document.getElementById('stat-vencer').textContent    = porVencer;
  document.getElementById('stat-agotado').textContent   = agotados;
}

async function ajustarStock(producto, delta) {
  // Actualización optimista en UI
  const item = state.inventario.find(i => i.producto === producto);
  if (item) {
    item.cantidad = Math.max(0, item.cantidad + delta);
    updateInvStats();
    renderInventario();
  }
  // Sincronizar con Sheets
  await callUpdateStock(producto, delta);
}

function initInventario() {
  // Filtro de texto
  const inp = document.getElementById('inv-filter');
  inp.addEventListener('input', renderInventario);

  // Chips de categoría
  renderCatChips();

  // Botón lista de compras
  document.getElementById('btn-lista-compras').addEventListener('click', () => {
    const faltantes = state.inventario.filter(i => i.cantidad <= 0);
    if (faltantes.length === 0) return showToast('¡No hay productos agotados!');
    const lista = faltantes.map(i => `• ${i.producto}`).join('\n');
    alert('Lista de compras sugerida:\n\n' + lista);
  });
}

function renderCatChips() {
  const container = document.getElementById('inv-cat-chips');
  const cats = ['Todos', ...CONFIG.CATEGORIAS.map(c => c.nombre)];

  container.innerHTML = cats.map(c => `
    <button data-cat="${c.toLowerCase()}"
      class="cat-chip px-3 py-1 rounded-full text-label-sm whitespace-nowrap border transition-colors
             ${(state.invCatFilter || 'todos') === c.toLowerCase()
               ? 'bg-primary text-on-primary border-primary'
               : 'bg-surface border-outline-variant text-on-surface-variant'}"
      onclick="setCatFilter('${c}')">
      ${c}
    </button>`).join('');
}

function setCatFilter(cat) {
  state.invCatFilter = cat.toLowerCase();
  renderCatChips();
  renderInventario();
}

// ------------------------------------------------------------------
// VISTA: PANEL
// ------------------------------------------------------------------
async function loadPanel() {
  const container = document.getElementById('panel-content');
  container.innerHTML = renderSkeleton(6);

  const res = await apiGet({ action: 'getDashboard', periodo: state.panel.periodo, usuario: state.panel.usuario });

  if (res._demo) {
    state.panel.data = demoPanel();
  } else if (res.error) {
    container.innerHTML = renderError(res.error);
    return;
  } else {
    state.panel.data = res;
  }

  renderPanel();
}

function renderPanel() {
  const d = state.panel.data;
  if (!d) return;

  const { kpis, categorias, historial, alertas, precios } = d;

  // Datos del donut según filtro de usuario
  let donutData, donutLabel, donutTotal;
  if (state.panel.usuario === 'todos') {
    donutLabel  = 'Hogar';
    donutTotal  = kpis.gastoTotal;
    donutData   = [
      { label: CONFIG.USUARIOS[0], value: kpis.gastoJesus,  color: '#006948' },
      { label: CONFIG.USUARIOS[1], value: kpis.gastoLilian, color: '#03a9f4' },
    ];
  } else if (state.panel.usuario === CONFIG.USUARIOS[0].toLowerCase()) {
    donutLabel  = CONFIG.USUARIOS[0];
    donutTotal  = kpis.gastoJesus;
    donutData   = categorias.filter(c => c.total > 0).slice(0, 5).map((c, i) => ({
      label: c.nombre, value: c.total, color: catColor(c.nombre)
    }));
  } else {
    donutLabel  = CONFIG.USUARIOS[1];
    donutTotal  = kpis.gastoLilian;
    donutData   = categorias.filter(c => c.total > 0).slice(0, 5).map((c, i) => ({
      label: c.nombre, value: c.total, color: catColor(c.nombre)
    }));
  }

  // Balance entre personas
  const debe = kpis.balance >= 0 ? CONFIG.USUARIOS[1] : CONFIG.USUARIOS[0];
  const acreedor = kpis.balance >= 0 ? CONFIG.USUARIOS[0] : CONFIG.USUARIOS[1];
  const diffAbs = Math.abs(kpis.balance);

  document.getElementById('panel-content').innerHTML = `
    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 reveal-card">
      <div class="col-span-2 bg-surface-container-low border border-outline-variant p-4 rounded-xl">
        <span class="text-label-sm text-on-surface-variant">Gasto Total</span>
        <p class="text-display-lg text-primary font-bold mt-1">${fmt.money(kpis.gastoTotal)}</p>
      </div>
      <div class="bg-surface border border-outline-variant p-3 rounded-xl">
        <span class="material-symbols-outlined text-secondary">groups</span>
        <p class="text-label-sm text-on-surface-variant mt-1">Promedio / Persona</p>
        <p class="text-headline-sm font-bold">${fmt.money(kpis.promedioPersona)}</p>
      </div>
      <div class="bg-surface border border-outline-variant p-3 rounded-xl">
        <span class="material-symbols-outlined text-secondary">shopping_cart</span>
        <p class="text-label-sm text-on-surface-variant mt-1">Viajes de compra</p>
        <p class="text-headline-sm font-bold">${kpis.viajes}</p>
      </div>
    </div>

    <!-- Balance entre personas -->
    <div class="bg-surface border border-outline-variant p-4 rounded-xl reveal-card">
      <h3 class="text-label-md font-semibold text-on-surface mb-3 flex items-center gap-1">
        <span class="material-symbols-outlined text-primary text-[18px]">balance</span> Balance
      </h3>
      <div class="flex items-center justify-between">
        <div class="text-center">
          <p class="text-label-sm text-on-surface-variant">${CONFIG.USUARIOS[0]}</p>
          <p class="text-headline-sm font-bold text-on-surface">${fmt.money(kpis.gastoJesus)}</p>
          <p class="text-label-sm text-on-surface-variant">${Math.round(kpis.gastoTotal > 0 ? kpis.gastoJesus/kpis.gastoTotal*100 : 0)}%</p>
        </div>
        <div class="flex flex-col items-center">
          ${diffAbs > 0.01 ? `
          <p class="text-[10px] text-on-surface-variant">${debe} debe</p>
          <p class="text-headline-sm font-bold text-primary">${fmt.money(diffAbs / 2)}</p>
          <p class="text-[10px] text-on-surface-variant">a ${acreedor}</p>` :
          `<span class="text-primary text-[11px] font-bold">¡Par! 🎉</span>`}
        </div>
        <div class="text-center">
          <p class="text-label-sm text-on-surface-variant">${CONFIG.USUARIOS[1]}</p>
          <p class="text-headline-sm font-bold text-on-surface">${fmt.money(kpis.gastoLilian)}</p>
          <p class="text-label-sm text-on-surface-variant">${Math.round(kpis.gastoTotal > 0 ? kpis.gastoLilian/kpis.gastoTotal*100 : 0)}%</p>
        </div>
      </div>
    </div>

    <!-- Distribución de Gastos -->
    <div class="bg-surface border border-outline-variant p-4 rounded-xl reveal-card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-label-md font-semibold text-on-surface flex items-center gap-1">
          <span class="material-symbols-outlined text-primary text-[18px]">donut_small</span>
          Distribución de Gastos
        </h3>
      </div>
      <div class="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        ${['todos', CONFIG.USUARIOS[0], CONFIG.USUARIOS[1]].map((v, i) => {
          const labels = ['Todos', CONFIG.USUARIOS[0], CONFIG.USUARIOS[1]];
          return `<button onclick="setUsuarioPanel('${v}')"
            class="px-3 py-1 rounded-full text-label-sm whitespace-nowrap border transition-colors
                   ${state.panel.usuario === v ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-outline-variant text-on-surface-variant'}">
            ${labels[i]}
          </button>`;
        }).join('')}
      </div>
      ${renderDonutChart(donutData, donutTotal, donutLabel)}
    </div>

    <!-- Gasto por Categoría -->
    <div class="bg-surface border border-outline-variant p-4 rounded-xl reveal-card">
      <h3 class="text-label-md font-semibold text-on-surface mb-3 flex items-center gap-1">
        <span class="material-symbols-outlined text-primary text-[18px]">category</span> Por Categoría
      </h3>
      ${categorias.length === 0
        ? '<p class="text-body-sm text-on-surface-variant text-center py-4">Sin datos para este periodo</p>'
        : categorias.slice(0, 8).map(c => `
        <div class="flex items-center gap-2 mb-2">
          <div class="w-3 h-3 rounded-full flex-shrink-0" style="background:${catColor(c.nombre)}"></div>
          <div class="flex-1">
            <div class="flex justify-between mb-0.5">
              <span class="text-label-sm text-on-surface">${c.nombre}</span>
              <span class="text-label-sm font-bold text-on-surface">${fmt.money(c.total)}</span>
            </div>
            <div class="h-1.5 bg-surface-container rounded-full">
              <div class="h-full rounded-full" style="width:${categorias[0].total > 0 ? Math.round(c.total/categorias[0].total*100) : 0}%;background:${catColor(c.nombre)}"></div>
            </div>
          </div>
        </div>`).join('')
      }
    </div>

    <!-- Historial de Gasto -->
    <div class="bg-surface border border-outline-variant p-4 rounded-xl reveal-card">
      <h3 class="text-label-md font-semibold text-on-surface mb-3">Historial</h3>
      ${renderBarChart(historial, state.panel.periodo)}
    </div>

    <!-- Alertas -->
    ${renderAlertas(alertas, precios)}
  `;
}

function setUsuarioPanel(usuario) {
  state.panel.usuario = usuario;
  renderPanel();
}

function setPeriodoPanel(periodo) {
  state.panel.periodo = periodo;
  document.querySelectorAll('.periodo-chip').forEach(el => {
    el.classList.toggle('bg-primary', el.dataset.periodo === periodo);
    el.classList.toggle('text-on-primary', el.dataset.periodo === periodo);
    el.classList.toggle('bg-surface', el.dataset.periodo !== periodo);
    el.classList.toggle('border-outline-variant', el.dataset.periodo !== periodo);
    el.classList.toggle('text-on-surface-variant', el.dataset.periodo !== periodo);
  });
  loadPanel();
}

// ------------------------------------------------------------------
// Gráficas SVG
// ------------------------------------------------------------------
function renderDonutChart(segments, total, centerLabel) {
  const validSegs = segments.filter(s => s.value > 0);
  if (validSegs.length === 0 || total <= 0) {
    return '<p class="text-body-sm text-on-surface-variant text-center py-4">Sin datos</p>';
  }

  let offset = 0;
  const circles = validSegs.map(seg => {
    const pct = (seg.value / total) * 100;
    const el = `<circle cx="18" cy="18" fill="transparent" r="15.915"
      stroke="${seg.color}" stroke-width="4"
      stroke-dasharray="${pct.toFixed(2)} ${(100 - pct).toFixed(2)}"
      stroke-dashoffset="${-offset.toFixed(2)}"
      style="transition: stroke-dasharray 0.6s ease"/>`;
    offset += pct;
    return el;
  }).join('');

  const legend = validSegs.map(seg => `
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full" style="background:${seg.color}"></div>
        <span class="text-label-sm text-on-surface-variant">${seg.label}</span>
      </div>
      <span class="text-label-sm font-bold text-on-surface">${fmt.money(seg.value)}</span>
    </div>`).join('');

  return `
    <div class="flex flex-col items-center gap-4">
      <div class="relative w-40 h-40">
        <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">${circles}</svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-[10px] text-on-surface-variant">${centerLabel}</span>
          <span class="text-headline-sm font-bold text-on-surface">${fmt.money(total)}</span>
        </div>
      </div>
      <div class="flex flex-col gap-2 w-full">${legend}</div>
    </div>`;
}

function renderBarChart(historial, periodo) {
  if (!historial || historial.length === 0) {
    return '<p class="text-body-sm text-on-surface-variant text-center py-4">Sin datos</p>';
  }
  const maxGasto = Math.max(...historial.map(h => h.gasto), 1);
  const bars = historial.map((h, i) => {
    const pct = Math.round((h.gasto / maxGasto) * 100);
    const isLast = i === historial.length - 1;
    return `
      <div class="flex flex-col items-center gap-1">
        ${h.gasto > 0 ? `<span class="text-[8px] text-on-surface-variant">${fmt.money(h.gasto).replace('$','')}</span>` : ''}
        <div class="w-5 rounded-t-sm" style="height:${Math.max(pct, 4)}px; background:${isLast ? '#006948' : '#68dba9'}; transition: height 0.8s cubic-bezier(0.34,1.56,0.64,1)"></div>
        <span class="text-[9px] ${isLast ? 'text-primary font-bold' : 'text-on-surface-variant'}">${h.label}</span>
      </div>`;
  }).join('');

  return `<div class="h-36 flex items-end justify-between gap-1 px-1 overflow-x-auto">${bars}</div>`;
}

function renderAlertas(alertas, precios) {
  if (!alertas) return '';
  const { porVencer = [], agotados = [] } = alertas;

  let html = `<div class="space-y-3 reveal-card"><h3 class="text-label-md font-semibold text-on-surface">Alertas</h3>`;

  if (porVencer.length > 0) {
    html += `
      <div class="bg-[#fff8e1] border border-[#ffe082] p-3 rounded-xl flex gap-3">
        <span class="material-symbols-outlined text-[#f57f17]">schedule</span>
        <div>
          <p class="text-body-sm font-bold text-[#e65100]">Próximos a vencer</p>
          ${porVencer.map(i => `<p class="text-body-sm text-on-surface-variant">· ${i.producto} — vence ${fmt.date(i.fechaVencimiento)}</p>`).join('')}
        </div>
      </div>`;
  }

  if (agotados.length > 0) {
    html += `
      <div class="bg-error-container border border-error-container p-3 rounded-xl flex gap-3">
        <span class="material-symbols-outlined text-error">inventory_2</span>
        <div>
          <p class="text-body-sm font-bold text-on-error-container">Productos agotados</p>
          ${agotados.slice(0, 5).map(i => `<p class="text-body-sm text-on-surface-variant">· ${i.producto}</p>`).join('')}
          ${agotados.length > 5 ? `<p class="text-label-sm text-on-surface-variant">…y ${agotados.length - 5} más</p>` : ''}
        </div>
      </div>`;
  }

  // Comparador de precios
  const prodKeys = Object.keys(precios || {}).slice(0, 5);
  if (prodKeys.length > 0) {
    const priceRows = prodKeys.map(k => {
      const { nombre, tiendas } = precios[k];
      const sorted = Object.entries(tiendas).sort((a, b) => a[1].precio - b[1].precio);
      if (sorted.length < 2) return '';
      const [best, ...rest] = sorted;
      return `
        <div class="bg-surface-container-low border border-outline-variant p-3 rounded-xl mt-2">
          <p class="text-label-md font-bold text-on-surface mb-2">${nombre}</p>
          ${sorted.map(([tienda, info], i) => `
            <div class="flex justify-between items-center py-1 ${i === 0 ? 'text-primary' : 'text-on-surface'}">
              <span class="text-body-sm ${i === 0 ? 'font-bold' : ''}">${tienda}${i === 0 ? ' ★' : ''}</span>
              <span class="text-body-sm font-bold">${fmt.money(info.precio)}</span>
            </div>`).join('')}
        </div>`;
    }).filter(Boolean).join('');

    if (priceRows) {
      html += `
        <div>
          <h4 class="text-label-md font-semibold text-on-surface flex items-center gap-1 mt-1 mb-2">
            <span class="material-symbols-outlined text-primary text-[16px]">compare_arrows</span>
            Comparador de Precios
          </h4>
          ${priceRows}
        </div>`;
    }
  }

  if (porVencer.length === 0 && agotados.length === 0 && prodKeys.length === 0) {
    html += `<p class="text-body-sm text-on-surface-variant text-center py-4">Sin alertas activas 🎉</p>`;
  }

  html += '</div>';
  return html;
}

// ------------------------------------------------------------------
// Helpers UI
// ------------------------------------------------------------------
function renderSkeleton(n) {
  return Array(n).fill('').map(() =>
    `<div class="h-20 bg-surface-container rounded-xl animate-pulse mb-3"></div>`
  ).join('');
}

function renderError(msg) {
  return `<div class="flex flex-col items-center py-10 gap-2 text-error">
    <span class="material-symbols-outlined text-4xl">error</span>
    <p class="text-body-sm">Error: ${msg}</p>
    <button onclick="location.reload()" class="text-primary text-label-sm underline">Reintentar</button>
  </div>`;
}

let toastTimeout;
function showToast(msg, type = 'ok') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl text-body-sm font-semibold shadow-lg transition-all duration-300 opacity-0 pointer-events-none max-w-[90vw] text-center';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = toast.className.replace(/bg-\S+/g, '');
  toast.classList.add(type === 'error' ? 'bg-error' : 'bg-primary');
  toast.classList.add(type === 'error' ? 'text-on-error' : 'text-on-primary');
  toast.classList.remove('opacity-0');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('opacity-0'), 2500);
}

// ------------------------------------------------------------------
// Datos de demostración (cuando SCRIPT_URL no está configurado)
// ------------------------------------------------------------------
function demoInventario() {
  return [
    { producto: 'Leche Entera 1L',   categoria: 'Huevos y Lácteos',     unidad: 'L',       cantidad: 1,   stockMin: 2, fechaVencimiento: getFutureDate(2), ultimaCompra: '2025-05-10', tienda: 'Walmart',           ultimoPrecio: 28.5  },
    { producto: 'Pechuga de Pollo',  categoria: 'Carnes y Aves',         unidad: 'kg',      cantidad: 0.5, stockMin: 1, fechaVencimiento: getFutureDate(5), ultimaCompra: '2025-05-10', tienda: 'Carrefour',         ultimoPrecio: 89    },
    { producto: 'Arroz Largo 1kg',   categoria: 'Cereales y Tubérculos', unidad: 'paquete', cantidad: 2.4, stockMin: 1, fechaVencimiento: '',               ultimaCompra: '2025-05-01', tienda: 'Costco',            ultimoPrecio: 22    },
    { producto: 'Huevos',            categoria: 'Huevos y Lácteos',     unidad: 'piezas',  cantidad: 0,   stockMin: 12, fechaVencimiento: '',              ultimaCompra: '2025-04-28', tienda: 'Supermercado',      ultimoPrecio: 45    },
    { producto: 'Pan Integral',      categoria: 'Pastas y Panadería',   unidad: 'paquete', cantidad: 0.5, stockMin: 1, fechaVencimiento: getFutureDate(3), ultimaCompra: '2025-05-12', tienda: 'Panadería Local',   ultimoPrecio: 35    },
    { producto: 'Manzanas',          categoria: 'Frutas',               unidad: 'kg',      cantidad: 1.2, stockMin: 1, fechaVencimiento: getFutureDate(10), ultimaCompra: '2025-05-14', tienda: 'Mercado',          ultimoPrecio: 40    },
    { producto: 'Frijoles Negros',   categoria: 'Leguminosas',          unidad: 'kg',      cantidad: 0.8, stockMin: 0.5, fechaVencimiento: '',             ultimaCompra: '2025-05-01', tienda: 'Bodega Aurrerá',   ultimoPrecio: 28    },
    { producto: 'Aceite de Oliva',   categoria: 'Grasas y Semillas',    unidad: 'L',       cantidad: 0.7, stockMin: 0.5, fechaVencimiento: '',             ultimaCompra: '2025-04-20', tienda: 'Walmart',          ultimoPrecio: 120   },
  ];
}

function demoPanel() {
  return {
    kpis: { gastoTotal: 1240.50, gastoJesus: 806.32, gastoLilian: 434.18, promedioPersona: 620.25, viajes: 4, balance: 372.14 },
    categorias: [
      { nombre: 'Huevos y Lácteos',     total: 524.11 },
      { nombre: 'Carnes y Aves',        total: 248.10 },
      { nombre: 'Cereales y Tubérculos',total: 161.26 },
      { nombre: 'Frutas',               total: 120.95 },
      { nombre: 'Pastas y Panadería',   total: 86.08  },
    ],
    historial: [
      { label:'D1', gasto:120 }, { label:'D2', gasto:85 }, { label:'D3', gasto:140 },
      { label:'D4', gasto:95 }, { label:'D5', gasto:210 }, { label:'D6', gasto:105 },
      { label:'D7', gasto:160 }, { label:'D8', gasto:75 }, { label:'D9', gasto:130 },
      { label:'D10', gasto:180 }, { label:'D11', gasto:165 }, { label:'D12', gasto:140 },
      { label:'D13', gasto:125 }, { label:'D14', gasto:155 }, { label:'D15', gasto:190 },
      { label:'D16', gasto:110 }, { label:'D17', gasto:95 }, { label:'D18', gasto:145 },
      { label:'D19', gasto:170 }, { label:'D20', gasto:200 }, { label:'D21', gasto:85 },
      { label:'D22', gasto:130 }, { label:'D23', gasto:105 }, { label:'D24', gasto:160 },
      { label:'D25', gasto:175 }, { label:'D26', gasto:195 }, { label:'D27', gasto:140 },
      { label:'D28', gasto:120 }, { label:'D29', gasto:150 }, { label:'D30', gasto:210 },
    ],
    precios: {
      'leche entera': {
        nombre: 'Leche Entera 1L',
        tiendas: {
          'Walmart':           { precio: 28.90, unidad: 'L', fecha: '2025-05-12' },
          'Supermercado Local':{ precio: 24.50, unidad: 'L', fecha: '2025-05-10' },
          'Tienda de la Esquina':{ precio: 26.00, unidad: 'L', fecha: '2025-05-08' },
        },
      },
    },
    alertas: {
      porVencer: [
        { producto: 'Leche Entera 1L', fechaVencimiento: getFutureDate(2) },
        { producto: 'Pan Integral',    fechaVencimiento: getFutureDate(3) },
      ],
      agotados: [{ producto: 'Huevos' }],
    },
  };
}

function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------
// Inicialización
// ------------------------------------------------------------------
function init() {
  // Mostrar banner demo si no hay URL configurada
  if (CONFIG.SCRIPT_URL === 'TU_URL_DE_APPS_SCRIPT_AQUÍ') {
    document.getElementById('demo-banner').classList.remove('hidden');
  }

  initRegistro();
  initInventario();

  // Navegación bottom bar
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => showView(el.dataset.view));
  });

  // Chips de periodo en el panel
  document.querySelectorAll('.periodo-chip').forEach(el => {
    el.addEventListener('click', () => setPeriodoPanel(el.dataset.periodo));
  });

  // Mostrar vista inicial
  showView('registro');
}

document.addEventListener('DOMContentLoaded', init);
