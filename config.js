// ============================================================
//  KitchenSync — Configuración
//  Edita este archivo para personalizar la app.
// ============================================================

const CONFIG = {
  // URL del Web App de Google Apps Script.
  // Después de desplegar el Code.gs, pega aquí la URL generada.
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzZ2FvDQbooMMdq5pkTJLqNugKhaQeagUChJDuEUE58GFW3Cfgr-SJtv0cSnBpRLCdAsA/exec',

  // Nombres de los dos usuarios de la app
  USUARIOS: ['Jesús', 'Lilian'],

  // Días antes de vencimiento para mostrar alerta amarilla
  DIAS_ALERTA_VENCIMIENTO: 7,

  // Nombre visible de la app
  APP_NAME: 'KitchenSync',

  // Categorías de productos con color e ícono (Material Symbols)
  CATEGORIAS: [
    { nombre: 'Frutas',                    color: '#e91e63', icono: 'nutrition'      },
    { nombre: 'Verduras y Hortalizas',     color: '#4caf50', icono: 'eco'            },
    { nombre: 'Cereales y Tubérculos',     color: '#ff9800', icono: 'grain'          },
    { nombre: 'Pastas y Panadería',        color: '#ff5722', icono: 'bakery_dining'  },
    { nombre: 'Carnes y Aves',             color: '#f44336', icono: 'set_meal'       },
    { nombre: 'Pescados y Mariscos',       color: '#2196f3', icono: 'phishing'       },
    { nombre: 'Huevos y Lácteos',          color: '#ffc107', icono: 'egg'            },
    { nombre: 'Embutidos y Carnes Frías',  color: '#9c27b0', icono: 'lunch_dining'   },
    { nombre: 'Leguminosas',               color: '#795548', icono: 'grass'          },
    { nombre: 'Grasas y Semillas',         color: '#607d8b', icono: 'spa'            },
    { nombre: 'Condimentos y Básicos',     color: '#009688', icono: 'science'        },
    { nombre: 'Ultraprocesados y Snacks',  color: '#ff6f00', icono: 'cookie'         },
    { nombre: 'Bebidas',                   color: '#03a9f4', icono: 'local_cafe'     },
  ],

  // Unidades de medida disponibles en el formulario
  UNIDADES: ['kg', 'g', 'L', 'mL', 'piezas', 'paquete', 'lata', 'bolsa', 'caja'],
};
