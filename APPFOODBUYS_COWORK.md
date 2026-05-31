# 🍕 AppFoodBuys - Guía Completa Cowork

**Objetivo:** Aplicación web de gastos compartidos de comida para 2 personas.

**Stack:** HTML5 + CSS3 + JS vanilla + Google Sheets + Google Apps Script + GitHub Pages

---

## 📋 PASO 1: Crear Google Apps Script API

### 1.1 Crear Google Sheet Base
1. Abre Google Drive
2. Nuevo > Google Sheet > Nombre: `AppFoodBuys_Data`
3. Comparte con la otra persona (permisos Editor)

### 1.2 Crear Hojas
Renombra/agrega estas 4 hojas:

**Hoja 1: `Compras`**
```
Encabezados:
A: Fecha
B: Persona
C: Alimento
D: Cantidad
E: Unidad
F: Costo
G: Categoría
H: Precio_Unitario
I: Tienda
```

**Hoja 2: `Inventario`**
```
A: Alimento
B: Cantidad
C: Unidad
D: Fecha_Última_Compra
E: Stock_Mínimo
F: Consumo_Diario_Estimado
```

**Hoja 3: `Catálogo`**
```
A: Alimento_ID
B: Nombre
C: Categoría
D: Cal_100g
E: Proteína_g
F: Carbohidratos_g
G: Grasas_g
```

**Hoja 4: `Config`**
```
A: Clave | B: Valor
Presupuesto_Mensual | 2000
Personas | Pancho, [Otro]
Categorías | Despensa,Vegetales,Lácteos,Carne,Agua,Tortillas,Golosinas
```

### 1.3 Crear Google Apps Script
1. En la Sheet > **Extensiones > Apps Script**
2. Reemplaza todo por este código:

```javascript
// code.gs

const SHEET_NAME_COMPRAS = 'Compras';
const SHEET_NAME_INVENTARIO = 'Inventario';
const SHEET_NAME_CATALOGO = 'Catálogo';
const SHEET_NAME_CONFIG = 'Config';

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'getGastos') {
      const sheet = ss.getSheetByName(SHEET_NAME_COMPRAS);
      const data = sheet.getDataRange().getValues();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getInventario') {
      const sheet = ss.getSheetByName(SHEET_NAME_INVENTARIO);
      const data = sheet.getDataRange().getValues();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getCatalogo') {
      const sheet = ss.getSheetByName(SHEET_NAME_CATALOGO);
      const data = sheet.getDataRange().getValues();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getConfig') {
      const sheet = ss.getSheetByName(SHEET_NAME_CONFIG);
      const data = sheet.getDataRange().getValues();
      const config = {};
      for (let i = 1; i < data.length; i++) {
        config[data[i][0]] = data[i][1];
      }
      return ContentService.createTextOutput(JSON.stringify(config))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({error: 'Acción no reconocida'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.action === 'addGasto') {
      const sheet = ss.getSheetByName(SHEET_NAME_COMPRAS);
      sheet.appendRow([
        new Date(data.fecha),
        data.persona,
        data.alimento,
        parseFloat(data.cantidad),
        data.unidad,
        parseFloat(data.costo),
        data.categoria,
        data.precioUnitario || '',
        data.tienda || ''
      ]);
      
      // Actualizar inventario
      actualizarInventario(data.alimento, data.cantidad, data.unidad);
      
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === 'updateInventario') {
      const sheet = ss.getSheetByName(SHEET_NAME_INVENTARIO);
      const data2d = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data2d.length; i++) {
        if (data2d[i][0] === data.alimento) {
          sheet.getRange(i + 1, 2).setValue(parseFloat(data.cantidad));
          sheet.getRange(i + 1, 4).setValue(new Date());
          break;
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({error: 'Acción no válida'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function actualizarInventario(alimento, cantidad, unidad) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_INVENTARIO);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === alimento) {
      const cantidadActual = parseFloat(data[i][1]) || 0;
      const cantidadNueva = cantidadActual + parseFloat(cantidad);
      sheet.getRange(i + 1, 2).setValue(cantidadNueva);
      sheet.getRange(i + 1, 4).setValue(new Date());
      break;
    }
  }
}
```

3. Guarda (Ctrl+S)
4. Haz click en **Implementar > Nuevo tipo de implementación**
5. Tipo: **App web**
6. Ejecutar como: Tu usuario
7. Quién puede acceder: **Cualquiera**
8. Click **Implementar**
9. **COPIA LA URL PÚBLICA** (la necesitas)

---

## 🗂️ PASO 2: Crear Archivos Locales

Crea esta estructura en `C:\Users\Admin\Documents\AppFoodBuys\app-gastos\`:

```
app-gastos/
├── index.html
├── styles.css
├── script.js
├── config.js
└── README.md
```

---

## 💾 PASO 3: Código de los Archivos

### **config.js**
```javascript
// REEMPLAZA ESTA URL CON LA TUYA DE GOOGLE APPS SCRIPT
const API_URL = 'https://script.google.com/macros/d/[TU_ID]/usercontent/deploy/a[VERSION_ID]/';

const CATEGORIAS = [
  'Despensa',
  'Vegetales y Frutas',
  'Lácteos',
  'Carne y Huevo',
  'Agua',
  'Tortillas',
  'Golosinas'
];

const PERSONAS = ['Pancho', 'Otro'];

const UNIDADES = ['kg', 'g', 'L', 'ml', 'pieza', 'docena', 'caja'];
```

### **index.html**
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AppFoodBuys - Gastos Compartidos</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>🍕 AppFoodBuys</h1>
      <p>Control de gastos compartidos de comida</p>
    </header>

    <nav class="tabs">
      <button class="tab-btn active" data-tab="registro">📝 Registro</button>
      <button class="tab-btn" data-tab="dashboard">📊 Dashboard</button>
      <button class="tab-btn" data-tab="inventario">📦 Inventario</button>
    </nav>

    <!-- TAB: REGISTRO -->
    <section id="registro" class="tab-content active">
      <div class="card">
        <h2>Registrar Gasto</h2>
        <form id="gastoForm">
          <div class="form-group">
            <label for="fecha">Fecha:</label>
            <input type="date" id="fecha" required>
          </div>

          <div class="form-group">
            <label for="persona">Persona:</label>
            <select id="persona" required>
              <option value="">Selecciona</option>
            </select>
          </div>

          <div class="form-group">
            <label for="alimento">Alimento:</label>
            <input type="text" id="alimento" placeholder="Ej: Tomate" required>
          </div>

          <div class="form-group">
            <label for="cantidad">Cantidad:</label>
            <input type="number" id="cantidad" step="0.1" placeholder="2" required>
          </div>

          <div class="form-group">
            <label for="unidad">Unidad:</label>
            <select id="unidad" required>
              <option value="">Selecciona</option>
            </select>
          </div>

          <div class="form-group">
            <label for="categoria">Categoría:</label>
            <select id="categoria" required>
              <option value="">Selecciona</option>
            </select>
          </div>

          <div class="form-group">
            <label for="costo">Costo ($):</label>
            <input type="number" id="costo" step="0.01" placeholder="50.00" required>
          </div>

          <div class="form-group">
            <label for="tienda">Tienda (opcional):</label>
            <input type="text" id="tienda" placeholder="Soriana, Oxxo, etc">
          </div>

          <button type="submit" class="btn-primary">💾 Guardar Gasto</button>
        </form>
      </div>

      <!-- Últimos gastos -->
      <div class="card">
        <h2>Últimos Registros</h2>
        <div id="ultimosGastos" class="gastos-list"></div>
      </div>
    </section>

    <!-- TAB: DASHBOARD -->
    <section id="dashboard" class="tab-content">
      <div class="filters">
        <label>Desde: <input type="date" id="filterFechaDesde"></label>
        <label>Hasta: <input type="date" id="filterFechaHasta"></label>
        <label>Persona: 
          <select id="filterPersona">
            <option value="">Todos</option>
          </select>
        </label>
        <button onclick="actualizarDashboard()" class="btn-secondary">Filtrar</button>
      </div>

      <div class="dashboard-grid">
        <div class="card stats">
          <h3>Total Período</h3>
          <div class="stat-value" id="totalPeriodo">$0</div>
        </div>

        <div class="card stats">
          <h3>Promedio por Compra</h3>
          <div class="stat-value" id="promedioPorCompra">$0</div>
        </div>

        <div class="card stats">
          <h3>Compras Registradas</h3>
          <div class="stat-value" id="totalCompras">0</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <h3>Gastos por Categoría</h3>
          <canvas id="chartCategoria"></canvas>
        </div>

        <div class="card">
          <h3>Gastos por Persona</h3>
          <canvas id="chartPersona"></canvas>
        </div>
      </div>

      <div class="card">
        <h3>Tendencia de Gastos (últimos 30 días)</h3>
        <canvas id="chartTendencia"></canvas>
      </div>

      <!-- Stock Bajo -->
      <div class="card alert">
        <h3>⚠️ Stock Bajo</h3>
        <div id="stockBajo"></div>
      </div>
    </section>

    <!-- TAB: INVENTARIO -->
    <section id="inventario" class="tab-content">
      <div class="card">
        <h2>Inventario Actual</h2>
        <div id="inventarioTable"></div>
      </div>
    </section>
  </div>

  <script src="config.js"></script>
  <script src="script.js"></script>
</body>
</html>
```

### **styles.css**
```css
:root {
  --primary: #4a90e2;
  --success: #2ecc71;
  --warning: #f39c12;
  --danger: #e74c3c;
  --gray-dark: #2c3e50;
  --gray-light: #ecf0f1;
  --gray-border: #bdc3c7;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 10px;
  color: var(--gray-dark);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
  padding: 20px;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 5px;
}

.header p {
  font-size: 1.1rem;
  opacity: 0.9;
}

/* TABS */
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.tab-btn {
  padding: 12px 20px;
  border: none;
  background: white;
  color: var(--primary);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.tab-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.tab-btn.active {
  background: var(--primary);
  color: white;
}

.tab-content {
  display: none;
  animation: fadeIn 0.3s ease;
}

.tab-content.active {
  display: block;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* CARDS */
.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.card h2, .card h3 {
  margin-bottom: 15px;
  color: var(--gray-dark);
}

/* FORMS */
.form-group {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 5px;
  color: var(--gray-dark);
}

.form-group input,
.form-group select {
  padding: 10px;
  border: 2px solid var(--gray-border);
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

/* BUTTONS */
.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--primary);
  color: white;
  width: 100%;
}

.btn-primary:hover {
  background: #3a7bc8;
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--gray-light);
  color: var(--gray-dark);
}

.btn-secondary:hover {
  background: var(--gray-border);
}

/* DASHBOARD */
.filters {
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filters label {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filters input, .filters select {
  padding: 8px;
  border: 1px solid var(--gray-border);
  border-radius: 4px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stats {
  text-align: center;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--primary);
  margin-top: 10px;
}

.alert {
  background: #fff3cd;
  border-left: 4px solid var(--warning);
}

.alert h3 {
  color: var(--warning);
}

/* GASTOS LIST */
.gastos-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.gasto-item {
  background: var(--gray-light);
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid var(--primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gasto-info {
  flex: 1;
}

.gasto-alimento {
  font-weight: 600;
  color: var(--gray-dark);
}

.gasto-detalles {
  font-size: 0.9rem;
  color: #7f8c8d;
}

.gasto-costo {
  font-size: 1.3rem;
  font-weight: bold;
  color: var(--success);
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .header h1 {
    font-size: 1.8rem;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .filters {
    flex-direction: column;
  }

  .filters input, .filters select, .filters label {
    width: 100%;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .tabs {
    gap: 5px;
  }

  .tab-btn {
    padding: 10px 15px;
    font-size: 0.9rem;
  }
}
```

### **script.js**
```javascript
let gastosData = [];
let inventarioData = [];
let catalogoData = [];
let configData = {};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  setFechaHoy();
  cargarDatos();
  inicializarSelectsPersonas();
  inicializarSelectsCategorias();
  inicializarSelectsUnidades();
  setupTabs();
  document.getElementById('gastoForm').addEventListener('submit', agregarGasto);
});

// SET FECHA HOY
function setFechaHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = hoy;
  document.getElementById('filterFechaHasta').value = hoy;
  
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  document.getElementById('filterFechaDesde').value = hace30.toISOString().split('T')[0];
}

// CARGAR DATOS DE GOOGLE SHEETS
async function cargarDatos() {
  try {
    // Gastos
    const resGastos = await fetch(`${API_URL}?action=getGastos`);
    gastosData = await resGastos.json();

    // Inventario
    const resInventario = await fetch(`${API_URL}?action=getInventario`);
    inventarioData = await resInventario.json();

    // Catálogo
    const resCatalogo = await fetch(`${API_URL}?action=getCatalogo`);
    catalogoData = await resCatalogo.json();

    // Config
    const resConfig = await fetch(`${API_URL}?action=getConfig`);
    configData = await resConfig.json();

    console.log('✅ Datos cargados');
    mostrarUltimosGastos();
    mostrarInventario();
    actualizarDashboard();
  } catch (error) {
    console.error('❌ Error cargando datos:', error);
    alert('Error cargando datos. Verifica la URL de la API en config.js');
  }
}

// INICIALIZAR SELECTS
function inicializarSelectsPersonas() {
  const select = document.getElementById('persona');
  const selectFilter = document.getElementById('filterPersona');
  PERSONAS.forEach(p => {
    const opt1 = document.createElement('option');
    opt1.value = p;
    opt1.textContent = p;
    select.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = p;
    opt2.textContent = p;
    selectFilter.appendChild(opt2);
  });
}

function inicializarSelectsCategorias() {
  const select = document.getElementById('categoria');
  CATEGORIAS.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function inicializarSelectsUnidades() {
  const select = document.getElementById('unidad');
  UNIDADES.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u;
    opt.textContent = u;
    select.appendChild(opt);
  });
}

// TABS
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
      });

      document.getElementById(tabId).classList.add('active');
      btn.classList.add('active');
    });
  });
}

// AGREGAR GASTO
async function agregarGasto(e) {
  e.preventDefault();

  const fecha = document.getElementById('fecha').value;
  const persona = document.getElementById('persona').value;
  const alimento = document.getElementById('alimento').value;
  const cantidad = document.getElementById('cantidad').value;
  const unidad = document.getElementById('unidad').value;
  const categoria = document.getElementById('categoria').value;
  const costo = document.getElementById('costo').value;
  const tienda = document.getElementById('tienda').value;
  const precioUnitario = (costo / cantidad).toFixed(2);

  const payload = {
    action: 'addGasto',
    fecha,
    persona,
    alimento,
    cantidad: parseFloat(cantidad),
    unidad,
    costo: parseFloat(costo),
    categoria,
    tienda,
    precioUnitario
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      alert('✅ Gasto registrado correctamente');
      document.getElementById('gastoForm').reset();
      setFechaHoy();
      cargarDatos();
    } else {
      alert('❌ Error: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error enviando datos: ' + error.message);
  }
}

// MOSTRAR ÚLTIMOS GASTOS
function mostrarUltimosGastos() {
  const container = document.getElementById('ultimosGastos');
  container.innerHTML = '';

  // Saltar encabezado (fila 0)
  const gastos = gastosData.slice(1, 6).reverse();

  gastos.forEach(gasto => {
    const [fecha, persona, alimento, cantidad, unidad, costo, categoria] = gasto;
    const div = document.createElement('div');
    div.className = 'gasto-item';
    div.innerHTML = `
      <div class="gasto-info">
        <div class="gasto-alimento">${alimento}</div>
        <div class="gasto-detalles">${persona} • ${fecha} • ${cantidad}${unidad} • ${categoria}</div>
      </div>
      <div class="gasto-costo">$${parseFloat(costo).toFixed(2)}</div>
    `;
    container.appendChild(div);
  });
}

// MOSTRAR INVENTARIO
function mostrarInventario() {
  const container = document.getElementById('inventarioTable');
  container.innerHTML = '';

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="background: var(--gray-light);">
      <th style="padding: 10px; text-align: left; border-bottom: 2px solid var(--primary);">Alimento</th>
      <th style="padding: 10px; text-align: center; border-bottom: 2px solid var(--primary);">Cantidad</th>
      <th style="padding: 10px; text-align: center; border-bottom: 2px solid var(--primary);">Mínimo</th>
      <th style="padding: 10px; text-align: center; border-bottom: 2px solid var(--primary);">Estado</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  inventarioData.slice(1).forEach(row => {
    const [alimento, cantidad, unidad, fecha, minimo] = row;
    const cantNum = parseFloat(cantidad);
    const minimoNum = parseFloat(minimo) || 0;
    const estado = cantNum < minimoNum ? '⚠️ BAJO' : '✅ OK';
    const color = cantNum < minimoNum ? '#fff3cd' : '#d4edda';

    const tr = document.createElement('tr');
    tr.style.background = color;
    tr.innerHTML = `
      <td style="padding: 10px; border-bottom: 1px solid var(--gray-border);">${alimento}</td>
      <td style="padding: 10px; text-align: center; border-bottom: 1px solid var(--gray-border);">${cantNum.toFixed(2)} ${unidad}</td>
      <td style="padding: 10px; text-align: center; border-bottom: 1px solid var(--gray-border);">${minimoNum} ${unidad}</td>
      <td style="padding: 10px; text-align: center; border-bottom: 1px solid var(--gray-border);">${estado}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// DASHBOARD
function actualizarDashboard() {
  const desde = new Date(document.getElementById('filterFechaDesde').value);
  const hasta = new Date(document.getElementById('filterFechaHasta').value);
  const personaFilter = document.getElementById('filterPersona').value;

  const gastosFiltrados = gastosData.slice(1).filter(gasto => {
    const fecha = new Date(gasto[0]);
    const persona = gasto[1];
    return fecha >= desde && fecha <= hasta && (!personaFilter || persona === personaFilter);
  });

  // Stats
  const total = gastosFiltrados.reduce((sum, g) => sum + parseFloat(g[5]), 0);
  const promedio = gastosFiltrados.length > 0 ? total / gastosFiltrados.length : 0;

  document.getElementById('totalPeriodo').textContent = '$' + total.toFixed(2);
  document.getElementById('promedioPorCompra').textContent = '$' + promedio.toFixed(2);
  document.getElementById('totalCompras').textContent = gastosFiltrados.length;

  // Gráficos
  crearGraficoCategoria(gastosFiltrados);
  crearGraficoPersona(gastosFiltrados);
  crearGraficoTendencia(gastosFiltrados);

  // Stock bajo
  mostrarStockBajo();
}

function crearGraficoCategoria(gastos) {
  const categorias = {};
  gastos.forEach(g => {
    const cat = g[6];
    categorias[cat] = (categorias[cat] || 0) + parseFloat(g[5]);
  });

  const ctx = document.getElementById('chartCategoria').getContext('2d');
  if (window.chartCat) window.chartCat.destroy();
  window.chartCat = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categorias),
      datasets: [{
        data: Object.values(categorias),
        backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function crearGraficoPersona(gastos) {
  const personas = {};
  gastos.forEach(g => {
    const pers = g[1];
    personas[pers] = (personas[pers] || 0) + parseFloat(g[5]);
  });

  const ctx = document.getElementById('chartPersona').getContext('2d');
  if (window.chartPers) window.chartPers.destroy();
  window.chartPers = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(personas),
      datasets: [{
        label: 'Gasto ($)',
        data: Object.values(personas),
        backgroundColor: '#4a90e2'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function crearGraficoTendencia(gastos) {
  const dias = {};
  gastos.forEach(g => {
    const fecha = g[0].split('T')[0];
    dias[fecha] = (dias[fecha] || 0) + parseFloat(g[5]);
  });

  const fechasOrdenadas = Object.keys(dias).sort();
  const totalesPorDia = fechasOrdenadas.map(f => dias[f]);

  const ctx = document.getElementById('chartTendencia').getContext('2d');
  if (window.chartTend) window.chartTend.destroy();
  window.chartTend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: fechasOrdenadas,
      datasets: [{
        label: 'Gasto por día ($)',
        data: totalesPorDia,
        borderColor: '#4a90e2',
        backgroundColor: 'rgba(74, 144, 226, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function mostrarStockBajo() {
  const container = document.getElementById('stockBajo');
  container.innerHTML = '';

  const bajo = inventarioData.slice(1).filter(inv => {
    const cantidad = parseFloat(inv[1]);
    const minimo = parseFloat(inv[4]) || 0;
    return cantidad < minimo;
  });

  if (bajo.length === 0) {
    container.innerHTML = '<p style="color: var(--success);">✅ Todo el inventario está en orden</p>';
    return;
  }

  bajo.forEach(inv => {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 10px; margin-bottom: 10px; background: #fff8e1; border-radius: 6px; border-left: 4px solid var(--warning);';
    div.innerHTML = `<strong>${inv[0]}</strong>: ${parseFloat(inv[1]).toFixed(2)}${inv[2]} (mínimo: ${parseFloat(inv[4])}${inv[2]})`;
    container.appendChild(div);
  });
}
```

---

## 🚀 PASO 4: Deploy

### Local Testing
```bash
cd C:\Users\Admin\Documents\AppFoodBuys\app-gastos
python -m http.server 8000
# O en PowerShell:
py -m http.server 8000
```
Abre: `http://localhost:8000`

### GitHub Pages
1. Crea repo: `app-gastos`
2. Sube los 4 archivos (index.html, styles.css, script.js, config.js)
3. Settings > Pages > Deploy from branch > main
4. Listo en: `https://[tu-usuario].github.io/app-gastos/`

---

## 🔧 TROUBLESHOOTING

**Error: "No se puede leer de Google Sheets"**
- Revisa que la URL en `config.js` sea correcta
- Abre la URL del Apps Script en navegador, debería mostrar un JSON

**Error: "Datos no se guardan"**
- Verifica que la Sheet esté compartida
- Check: ¿Apps Script está deployado? ¿URL pública?

**Gráficos no aparecen**
- Abre DevTools (F12), mira Console por errores

---

## 📚 REFERENCIAS

- [Google Apps Script Docs](https://developers.google.com/apps-script)
- [Chart.js Docs](https://www.chartjs.org)
- [GitHub Pages Docs](https://pages.github.com)
