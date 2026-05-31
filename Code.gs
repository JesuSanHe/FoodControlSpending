// ============================================================
//  KitchenSync — Google Apps Script (Code.gs)
//  Pega este código en un nuevo proyecto de Apps Script
//  vinculado a tu Google Spreadsheet.
//
//  Estructura de la hoja de cálculo:
//    Hoja "Registros"  — historial de compras
//    Hoja "Inventario" — estado actual de la despensa
//
//  Despliegue:
//    Extensiones → Apps Script → Implementar → Nueva implementación
//    Tipo: Aplicación web
//    Ejecutar como: Yo
//    Quién tiene acceso: Cualquier usuario
//    → Copiar la URL y pegarla en config.js como SCRIPT_URL
// ============================================================

// Zona horaria — ajusta según tu país
const TZ = 'America/Mexico_City';

// Cabeceras de las hojas
const HEADERS_REGISTROS  = ['ID','Fecha','Usuario','Tienda','Producto','Categoría','Unidad','Cantidad','PrecioUnitario','Total','FechaVencimiento','FechaRegistro'];
const HEADERS_INVENTARIO = ['Producto','Categoría','Unidad','Cantidad','StockMin','FechaVencimiento','UltimaCompra','Tienda','UltimoPrecio'];

// ------------------------------------------------------------------
// Punto de entrada GET — maneja TODAS las operaciones (lectura y escritura)
// Se usa GET para evitar problemas de CORS preflight con Apps Script.
// ------------------------------------------------------------------
function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'getRegistros':   result = getRegistros(e.parameter);   break;
      case 'getInventario':  result = getInventario();              break;
      case 'getDashboard':   result = getDashboard(e.parameter);   break;
      case 'saveCompra':     result = saveCompra(e.parameter);     break;
      case 'updateStock':    result = updateStock(e.parameter);    break;
      default:               result = { error: 'Acción desconocida: ' + action };
    }

    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }

  return output;
}

// ------------------------------------------------------------------
// GET: Registros
// Parámetros: periodo (semana|mes|todo), usuario (todos|Jesús|Lilian)
// ------------------------------------------------------------------
function getRegistros(params) {
  const sheet = getOrCreateSheet('Registros', HEADERS_REGISTROS);
  if (sheet.getLastRow() <= 1) return { registros: [] };

  const data  = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS_REGISTROS.length).getValues();
  let registros = data.map(row => ({
    id:              row[0],
    fecha:           row[1] ? Utilities.formatDate(new Date(row[1]), TZ, 'yyyy-MM-dd') : '',
    usuario:         row[2],
    tienda:          row[3],
    producto:        row[4],
    categoria:       row[5],
    unidad:          row[6],
    cantidad:        parseFloat(row[7]) || 0,
    precioUnitario:  parseFloat(row[8]) || 0,
    total:           parseFloat(row[9]) || 0,
    fechaVencimiento: row[10] ? Utilities.formatDate(new Date(row[10]), TZ, 'yyyy-MM-dd') : '',
    fechaRegistro:   row[11] ? Utilities.formatDate(new Date(row[11]), TZ, 'yyyy-MM-dd') : '',
  })).filter(r => r.producto);

  // Filtro por periodo
  const periodo = (params && params.periodo) || 'todo';
  if (periodo !== 'todo') {
    const now    = new Date();
    const cutoff = new Date();
    if (periodo === 'semana') cutoff.setDate(now.getDate() - 7);
    else if (periodo === 'mes') cutoff.setMonth(now.getMonth() - 1);
    registros = registros.filter(r => r.fecha && new Date(r.fecha) >= cutoff);
  }

  // Filtro por usuario
  const usuario = (params && params.usuario) || 'todos';
  if (usuario !== 'todos') {
    registros = registros.filter(r => r.usuario === usuario);
  }

  return { registros };
}

// ------------------------------------------------------------------
// GET: Inventario
// ------------------------------------------------------------------
function getInventario() {
  const sheet = getOrCreateSheet('Inventario', HEADERS_INVENTARIO);
  if (sheet.getLastRow() <= 1) return { inventario: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS_INVENTARIO.length).getValues();
  const inventario = data.map(row => ({
    producto:        row[0],
    categoria:       row[1],
    unidad:          row[2],
    cantidad:        parseFloat(row[3]) || 0,
    stockMin:        parseFloat(row[4]) || 1,
    fechaVencimiento: row[5] ? Utilities.formatDate(new Date(row[5]), TZ, 'yyyy-MM-dd') : '',
    ultimaCompra:    row[6] ? Utilities.formatDate(new Date(row[6]), TZ, 'yyyy-MM-dd') : '',
    tienda:          row[7],
    ultimoPrecio:    parseFloat(row[8]) || 0,
  })).filter(r => r.producto);

  return { inventario };
}

// ------------------------------------------------------------------
// GET: Dashboard — KPIs + categorías + historial + alertas + precios
// Parámetros: periodo (semana|mes|todo)
// ------------------------------------------------------------------
function getDashboard(params) {
  const periodo   = (params && params.periodo) || 'mes';
  const regPeriod = getRegistros({ periodo }).registros;
  const regTodo   = getRegistros({ periodo: 'todo' }).registros;
  const inv       = getInventario().inventario;

  // KPIs del periodo seleccionado
  const gastoTotal  = regPeriod.reduce((s, r) => s + r.total, 0);
  const gastoJesus  = regPeriod.filter(r => r.usuario === 'Jesús') .reduce((s, r) => s + r.total, 0);
  const gastoLilian = regPeriod.filter(r => r.usuario === 'Lilian').reduce((s, r) => s + r.total, 0);
  const viajes      = new Set(regPeriod.map(r => `${r.fecha}|${r.usuario}|${r.tienda}`)).size;

  // Distribución por categoría (periodo)
  const catMap = {};
  regPeriod.forEach(r => {
    const k = r.categoria || 'Otros';
    catMap[k] = (catMap[k] || 0) + r.total;
  });
  const categorias = Object.entries(catMap)
    .map(([nombre, total]) => ({ nombre, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // Historial con granularidad dinámica según período
  let historial = [];
  const now = new Date();

  if (periodo === 'semana') {
    // Últimos 7 días
    const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(now);
      fecha.setDate(now.getDate() - i);
      const gasto = regTodo
        .filter(r => r.fecha === Utilities.formatDate(fecha, TZ, 'yyyy-MM-dd'))
        .reduce((s, r) => s + r.total, 0);
      historial.push({ label: dias[6 - i], gasto: Math.round(gasto * 100) / 100 });
    }
  } else if (periodo === 'mes') {
    // Últimas 4 semanas
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - (i + 1) * 7);
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      const gasto = regTodo
        .filter(r => r.fecha && new Date(r.fecha) >= start && new Date(r.fecha) < end)
        .reduce((s, r) => s + r.total, 0);
      historial.push({ label: `Semana ${4 - i}`, gasto: Math.round(gasto * 100) / 100 });
    }
  } else {
    // Período 'todo' — últimos 12 meses
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    for (let i = 11; i >= 0; i--) {
      const mes = (now.getMonth() - i + 12) % 12;
      const año = now.getFullYear() - Math.floor((now.getMonth() - i) / 12);
      const primerDia = new Date(año, mes, 1);
      const ultimoDia = new Date(año, mes + 1, 0);
      const gasto = regTodo
        .filter(r => r.fecha && new Date(r.fecha) >= primerDia && new Date(r.fecha) <= ultimoDia)
        .reduce((s, r) => s + r.total, 0);
      historial.push({ label: meses[mes], gasto: Math.round(gasto * 100) / 100 });
    }
  }

  // Comparador de precios — último precio por producto×tienda
  const precios = {};
  regTodo.forEach(r => {
    if (!r.producto || !r.tienda) return;
    const prod = r.producto.toLowerCase().trim();
    if (!precios[prod]) precios[prod] = { nombre: r.producto, tiendas: {} };
    const prev = precios[prod].tiendas[r.tienda];
    if (!prev || new Date(r.fecha) > new Date(prev.fecha)) {
      precios[prod].tiendas[r.tienda] = { precio: r.precioUnitario, unidad: r.unidad, fecha: r.fecha };
    }
  });

  // Alertas: vencimiento próximo y agotados
  const hoy = new Date();
  const porVencer = inv.filter(i => {
    if (!i.fechaVencimiento) return false;
    const diff = (new Date(i.fechaVencimiento) - hoy) / 86400000;
    return diff >= 0 && diff <= 7;
  });
  const agotados = inv.filter(i => i.cantidad <= 0);

  return {
    kpis: {
      gastoTotal:     Math.round(gastoTotal  * 100) / 100,
      gastoJesus:     Math.round(gastoJesus  * 100) / 100,
      gastoLilian:    Math.round(gastoLilian * 100) / 100,
      promedioPersona: Math.round((gastoTotal / 2) * 100) / 100,
      viajes,
      balance:        Math.round((gastoJesus - gastoLilian) * 100) / 100,
    },
    categorias,
    historial,
    precios,
    alertas: { porVencer, agotados },
  };
}

// ------------------------------------------------------------------
// WRITE: Guardar compra completa
// Params: fecha, usuario, tienda, productos (JSON string)
// ------------------------------------------------------------------
function saveCompra(params) {
  const { fecha, usuario, tienda, productos: prodStr } = params;
  if (!prodStr) return { error: 'Sin productos' };

  const productos = JSON.parse(decodeURIComponent(prodStr));
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const regSheet   = getOrCreateSheet('Registros', HEADERS_REGISTROS);
  const fechaRegistro = new Date();

  productos.forEach(p => {
    regSheet.appendRow([
      Utilities.getUuid(),
      new Date(fecha),
      usuario,
      tienda,
      p.nombre,
      p.categoria,
      p.unidad,
      p.cantidad,
      p.precioUnitario,
      p.total,
      p.fechaVencimiento ? new Date(p.fechaVencimiento) : '',
      fechaRegistro,
    ]);
    upsertInventario(ss, p, tienda, fecha);
  });

  return { success: true, guardados: productos.length };
}

// ------------------------------------------------------------------
// WRITE: Actualizar stock de un producto
// Params: producto (nombre), delta (número, puede ser negativo)
// ------------------------------------------------------------------
function updateStock(params) {
  const { producto, delta } = params;
  const sheet = getOrCreateSheet('Inventario', HEADERS_INVENTARIO);
  if (sheet.getLastRow() <= 1) return { error: 'Inventario vacío' };

  const nombres = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  const idx     = nombres.findIndex(n => n.toString().toLowerCase().trim() === producto.toLowerCase().trim());

  if (idx < 0) return { error: 'Producto no encontrado' };

  const row        = idx + 2;
  const actual     = parseFloat(sheet.getRange(row, 4).getValue()) || 0;
  const nueva      = Math.max(0, actual + parseFloat(delta));
  sheet.getRange(row, 4).setValue(nueva);

  return { success: true, cantidad: nueva };
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function getOrCreateSheet(name, headers) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function upsertInventario(ss, producto, tienda, fecha) {
  const sheet   = getOrCreateSheet('Inventario', HEADERS_INVENTARIO);
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    const nombres = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const idx     = nombres.findIndex(n => n.toString().toLowerCase().trim() === producto.nombre.toLowerCase().trim());

    if (idx >= 0) {
      const row    = idx + 2;
      const actual = parseFloat(sheet.getRange(row, 4).getValue()) || 0;
      sheet.getRange(row, 4).setValue(actual + parseFloat(producto.cantidad));
      if (producto.fechaVencimiento) sheet.getRange(row, 6).setValue(new Date(producto.fechaVencimiento));
      sheet.getRange(row, 7).setValue(new Date(fecha));
      sheet.getRange(row, 8).setValue(tienda);
      sheet.getRange(row, 9).setValue(producto.precioUnitario);
      return;
    }
  }

  // Producto nuevo
  sheet.appendRow([
    producto.nombre,
    producto.categoria,
    producto.unidad,
    producto.cantidad,
    1,
    producto.fechaVencimiento ? new Date(producto.fechaVencimiento) : '',
    new Date(fecha),
    tienda,
    producto.precioUnitario,
  ]);
}
