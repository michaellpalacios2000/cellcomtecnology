// ╔══════════════════════════════════════════════════════════════╗
// ║           CellCom Tecnology — Sistema POS v1.0              ║
// ║                    js/config.js                              ║
// ║    Configuración central completa del Frontend               ║
// ║    Cieneguilla, Lima, Perú | Zona: America/Lima             ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ════════════════════════════════════════════════════════════════
// CONFIGURACIÓN PRINCIPAL DEL SISTEMA
// ════════════════════════════════════════════════════════════════

const APP_CONFIG = {

  // ── API Backend — Google Apps Script ─────────────────────────
  API_URL: 'https://script.google.com/macros/s/AKfycbw-scW1riXTTaGL12evRGXSVMS6KQNXuMIs-zQJ5C232_USeKVGmtBI034Saui3R6Xm/exec',

  // ── Información de la aplicación ─────────────────────────────
  APP_NAME:      'CellCom Tecnology',
  APP_SLOGAN:    'Tu tecnología, nuestra pasión',
  VERSION:       '1.0.0',
  BUILD:         '2025.07',
  DESCRIPCION:   'Sistema POS — Punto de Venta Integral',
  EMPRESA:       'CellCom Tecnology',
  CIUDAD:        'Cieneguilla',
  DEPARTAMENTO:  'Lima',
  PAIS:          'Perú',
  ZONA_HORARIA:  'America/Lima',
  MONEDA:        'S/',
  MONEDA_CODIGO: 'PEN',
  IDIOMA:        'es-PE',

  // ── Paleta de colores oficial CellCom ────────────────────────
  COLORES: {
    // Azules principales
    PRINCIPAL:       '#4A90D9',
    PRINCIPAL_DARK:  '#2E6DB4',
    PRINCIPAL_DARKER:'#1A4F8A',
    PRINCIPAL_LIGHT: '#7BB3E8',
    PRINCIPAL_SOFT:  '#EBF4FF',
    PRINCIPAL_GLASS: 'rgba(74,144,217,0.15)',

    // Blancos
    BLANCO:          '#FFFFFF',
    BLANCO_AZULADO:  '#F8FAFF',
    FONDO:           '#F0F6FF',

    // Textos
    TEXTO_DARK:      '#1A1A2E',
    TEXTO_MID:       '#4A5568',
    TEXTO_LIGHT:     '#718096',

    // Estados
    VERDE:           '#48BB78',
    VERDE_DARK:      '#276749',
    VERDE_SOFT:      '#F0FFF4',
    ROJO:            '#FC8181',
    ROJO_DARK:       '#C53030',
    ROJO_SOFT:       '#FFF5F5',
    NARANJA:         '#F6AD55',
    NARANJA_DARK:    '#C05621',
    NARANJA_SOFT:    '#FFFAF0',
    MORADO:          '#9F7AEA',
    MORADO_SOFT:     '#FAF5FF',

    // Gradientes
    GRADIENTE_PRINCIPAL: 'linear-gradient(135deg, #4A90D9, #2E6DB4)',
    GRADIENTE_OSCURO:    'linear-gradient(135deg, #1A4F8A, #2E6DB4)',
    GRADIENTE_VERDE:     'linear-gradient(135deg, #48BB78, #276749)',
    GRADIENTE_ROJO:      'linear-gradient(135deg, #FC8181, #C53030)'
  },

  // ── Claves de almacenamiento local ───────────────────────────
  STORAGE: {
    TOKEN:        'cellcom_token',
    USUARIO:      'cellcom_usuario',
    LOGIN_TIME:   'cellcom_login_time',
    PERMISOS:     'cellcom_permisos',
    TEMA:         'cellcom_tema',
    SIDEBAR:      'cellcom_sidebar',
    LAST_PAGE:    'cellcom_last_page',
    BLOQUEADO:    'cellcom_bloqueado',
    CARRITO:      'cellcom_carrito',
    CONFIG_LOCAL: 'cellcom_config_local'
  },

  // ── Configuración de sesión ───────────────────────────────────
  SESION: {
    HORAS:          12,
    MAX_INTENTOS:   5,
    BLOQUEO_MIN:    5,
    PIN_LONGITUD:   4,
    TOKEN_PREFIJO:  'CC360'
  },

  // ── Configuración del sistema ─────────────────────────────────
  SISTEMA: {
    ITEMS_POR_PAGINA:     15,
    DEBOUNCE_MS:          250,
    TIMEOUT_TOAST_MS:     3000,
    TIMEOUT_SESION_MS:    43200000,
    STOCK_ALERTA_MINIMO:  3,
    STOCK_CRITICO:        1,
    MAX_DESCUENTO_VEND:   0.15,
    DIAS_GARANTIA:        2,
    ADELANTO_SEPARADO:    0.50,
    ANIMACION_MS:         300
  },

  // ── Páginas del sistema ───────────────────────────────────────
  PAGINAS: {
    login: {
      titulo:  'Iniciar Sesión',
      icon:    '🔐',
      archivo: 'login.html',
      publica: true,
      roles:   ['Admin', 'Vendedor']
    },
    pos: {
      titulo:  'Punto de Venta',
      icon:    '🛒',
      archivo: 'pos.html',
      publica: false,
      roles:   ['Admin', 'Vendedor']
    },
    ventas: {
      titulo:  'Historial de Ventas',
      icon:    '📊',
      archivo: 'ventas.html',
      publica: false,
      roles:   ['Admin', 'Vendedor']
    },
    inventario: {
      titulo:  'Inventario',
      icon:    '📦',
      archivo: 'inventario.html',
      publica: false,
      roles:   ['Admin', 'Vendedor']
    },
    clientes: {
      titulo:  'Clientes',
      icon:    '👥',
      archivo: 'clientes.html',
      publica: false,
      roles:   ['Admin', 'Vendedor']
    },
    gastos: {
      titulo:  'Gastos y Compras',
      icon:    '💰',
      archivo: 'gastos.html',
      publica: false,
      roles:   ['Admin']
    },
    tesoreria: {
      titulo:  'Tesorería',
      icon:    '🏦',
      archivo: 'tesoreria.html',
      publica: false,
      roles:   ['Admin']
    },
    reportes: {
      titulo:  'Dashboard',
      icon:    '📈',
      archivo: 'reportes.html',
      publica: false,
      roles:   ['Admin']
    }
  },

  // ── Métodos de pago disponibles ───────────────────────────────
  METODOS_PAGO: [
    { id: 'Efectivo', nombre: 'Efectivo', icon: '💵', color: '#48BB78' },
    { id: 'Yape',     nombre: 'Yape',     icon: '📱', color: '#6B21A8' },
    { id: 'Plin',     nombre: 'Plin',     icon: '📲', color: '#0EA5E9' },
    { id: 'Tarjeta',  nombre: 'Tarjeta',  icon: '💳', color: '#1A1A2E' },
    { id: 'BCP',      nombre: 'BCP',      icon: '🏦', color: '#1E3A5F' }
  ],

  // ── Enumeraciones del sistema ─────────────────────────────────
  ENUMS: {
    ESTADO_PRODUCTO:  ['Activo', 'Inactivo', 'Merma'],
    ESTADO_VENTA:     ['Completada', 'Separada', 'Proforma'],
    ESTADO_RECLAMO:   ['Pendiente', 'En proceso', 'Resuelto', 'Rechazado'],
    ESTADO_CUENTA:    ['Activo', 'Inactivo', 'Suspendido'],
    PLATAFORMA_ADS:   ['Facebook', 'TikTok', 'Instagram', 'Google'],
    BANCO:            ['Yape', 'Plin', 'BCP', 'Efectivo', 'Tarjeta'],
    ROL:              ['Admin', 'Vendedor']
  },

  // ── Roles y permisos ──────────────────────────────────────────
  ROLES: {
    ADMIN: {
      nombre:   'Admin',
      icon:     '👑',
      permisos: [
        'ver_costos', 'ver_ganancias', 'ver_dashboard',
        'ver_todas_ventas', 'gestionar_productos',
        'gestionar_usuarios', 'gestionar_gastos',
        'gestionar_tesoreria', 'gestionar_campanas',
        'gestionar_compras', 'reimprimir_notas',
        'ver_reportes', 'editar_precios',
        'ver_mermas', 'gestionar_mermas',
        'realizar_ventas', 'ver_sus_ventas',
        'buscar_clientes', 'crear_clientes'
      ]
    },
    VENDEDOR: {
      nombre:   'Vendedor',
      icon:     '🧑‍💼',
      permisos: [
        'realizar_ventas', 'ver_sus_ventas',
        'registrar_mermas', 'buscar_clientes',
        'crear_clientes', 'reimprimir_sus_notas',
        'registrar_ventas_perdidas'
      ]
    }
  },

  // ── Configuración PWA ─────────────────────────────────────────
  PWA: {
    NAME:             'CellCom Tecnology',
    SHORT_NAME:       'CellCom POS',
    DESCRIPTION:      'Sistema POS — CellCom Tecnology',
    THEME_COLOR:      '#4A90D9',
    BACKGROUND_COLOR: '#0F2044',
    DISPLAY:          'standalone',
    ORIENTATION:      'any',
    START_URL:        '/cellcomtecnology/'
  },

  // ── URLs del repositorio ──────────────────────────────────────
  URLS: {
    BASE:     'https://michaellpalacios2000.github.io/cellcomtecnology/',
    LOGIN:    'https://michaellpalacios2000.github.io/cellcomtecnology/login.html',
    POS:      'https://michaellpalacios2000.github.io/cellcomtecnology/pos.html',
    REPO:     'https://github.com/michaellpalacios2000/cellcomtecnology'
  }
};

// ════════════════════════════════════════════════════════════════
// UTILIDADES DE CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════

const CONFIG_UTILS = {

  /**
   * Verifica si un rol tiene acceso a una página
   */
  tieneAcceso(pagina, rol) {
    const config = APP_CONFIG.PAGINAS[pagina];
    if (!config) return false;
    if (config.publica) return true;
    return config.roles.includes(rol);
  },

  /**
   * Verifica si un rol tiene un permiso específico
   */
  tienePermiso(rol, permiso) {
    const rolConfig = APP_CONFIG.ROLES[rol?.toUpperCase()];
    if (!rolConfig) return false;
    return rolConfig.permisos.includes(permiso);
  },

  /**
   * Retorna el icono de un método de pago
   */
  getIconoPago(metodo) {
    const m = APP_CONFIG.METODOS_PAGO.find(p => p.id === metodo);
    return m ? m.icon : '💳';
  },

  /**
   * Formatea un monto como moneda peruana
   */
  formatMoneda(monto) {
    const n = Number(monto) || 0;
    return `${APP_CONFIG.MONEDA} ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  },

  /**
   * Formatea monto abreviado (S/1.5k)
   */
  formatMonedaK(monto) {
    const n = Number(monto) || 0;
    if (Math.abs(n) >= 10000) return `${APP_CONFIG.MONEDA}${(n/1000).toFixed(1)}k`;
    if (Math.abs(n) >= 1000)  return `${APP_CONFIG.MONEDA}${(n/1000).toFixed(2)}k`;
    return `${APP_CONFIG.MONEDA}${n.toFixed(2)}`;
  },

  /**
   * Retorna la fecha y hora actual formateada
   */
  getFechaHora() {
    return new Date().toLocaleString('es-PE', {
      timeZone:  APP_CONFIG.ZONA_HORARIA,
      day:       '2-digit',
      month:     '2-digit',
      year:      'numeric',
      hour:      '2-digit',
      minute:    '2-digit'
    });
  },

  /**
   * Retorna solo la fecha actual
   */
  getFecha() {
    return new Date().toLocaleDateString('es-PE', {
      timeZone: APP_CONFIG.ZONA_HORARIA,
      day:      '2-digit',
      month:    '2-digit',
      year:     'numeric'
    });
  },

  /**
   * Retorna el mes y año actual en español
   * Ejemplo: "Enero-2025"
   */
  getMesAnio() {
    const MESES = [
      'Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
    ];
    const hoy = new Date();
    return `${MESES[hoy.getMonth()]}-${hoy.getFullYear()}`;
  },

  /**
   * Normaliza texto para búsquedas
   * Elimina acentos y convierte a minúsculas
   */
  normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  },

  /**
   * Verifica si un texto contiene el término buscado
   */
  contiene(texto, termino) {
    return this.normalizar(texto).includes(this.normalizar(termino));
  },

  /**
   * Capitaliza cada palabra
   */
  capitalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  },

  /**
   * Trunca texto a una longitud máxima
   */
  truncar(texto, max = 50) {
    const s = String(texto || '');
    return s.length > max ? s.substring(0, max) + '...' : s;
  },

  /**
   * Formatea número de teléfono peruano
   */
  formatTelefono(tel) {
    const limpio = String(tel || '').replace(/\D/g, '');
    if (limpio.length === 9) {
      return `${limpio.slice(0,3)} ${limpio.slice(3,6)} ${limpio.slice(6)}`;
    }
    return tel || '';
  },

  /**
   * Calcula días transcurridos desde una fecha
   * Formato entrada: "dd/mm/yyyy"
   */
  diasTranscurridos(fechaStr) {
    try {
      const s      = String(fechaStr || '').split(' ')[0];
      const partes = s.split('/');
      if (partes.length !== 3) return 0;
      const inicio = new Date(parseInt(partes[2]), parseInt(partes[1])-1, parseInt(partes[0]));
      const hoy    = new Date();
      inicio.setHours(0,0,0,0);
      hoy.setHours(0,0,0,0);
      return Math.max(0, Math.floor((hoy - inicio) / 86400000));
    } catch(e) { return 0; }
  },

  /**
   * Determina alerta de garantía
   */
  alertaGarantia(dias) {
    if (dias <= APP_CONFIG.SISTEMA.DIAS_GARANTIA)  return '🟢 Dentro de garantía';
    if (dias <= APP_CONFIG.SISTEMA.DIAS_GARANTIA * 2) return '🟡 Fuera pero reciente';
    return '🔴 Fuera de garantía';
  },

  /**
   * Genera un correlativo del lado del cliente (backup)
   * Formato: VNT-0001
   */
  generarCorrelativo(prefijo, numero) {
    return `${prefijo}-${String(numero).padStart(4, '0')}`;
  },

  /**
   * Valida formato de email
   */
  validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
  },

  /**
   * Retorna emoji de categoría según nombre
   */
  emojiCategoria(nombre) {
    const n = this.normalizar(nombre);
    if (n.includes('celular') || n.includes('smartphone') || n.includes('iphone')) return '📱';
    if (n.includes('funda')   || n.includes('case'))       return '🛡️';
    if (n.includes('cable')   || n.includes('cargador'))   return '🔌';
    if (n.includes('audio')   || n.includes('auricular'))  return '🎧';
    if (n.includes('tablet')  || n.includes('ipad'))       return '📲';
    if (n.includes('bateria') || n.includes('power'))      return '🔋';
    if (n.includes('accesorio'))                           return '🎁';
    if (n.includes('repuesto'))                            return '🔧';
    return '📦';
  },

  /**
   * Debounce — Retrasa ejecución de funciones
   */
  debounce(fn, ms = APP_CONFIG.SISTEMA.DEBOUNCE_MS) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  },

  /**
   * Espera N milisegundos
   */
  esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Parsea fecha "dd/MM/yyyy" a objeto Date
   */
  parsearFecha(str) {
    try {
      const s = String(str || '').split(' ')[0];
      const p = s.split('/');
      if (p.length !== 3) return new Date(0);
      return new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
    } catch(e) { return new Date(0); }
  },

  /**
   * Verifica si fecha corresponde al mes indicado
   * Ej: "Enero-2025"
   */
  esDelMes(fechaStr, mesAnio) {
    try {
      const MESES = [
        'Enero','Febrero','Marzo','Abril','Mayo','Junio',
        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
      ];
      const partes = mesAnio.split('-');
      const mesNum = MESES.indexOf(partes[0]);
      const anio   = parseInt(partes[1]);
      if (mesNum === -1) return false;
      const fecha  = this.parsearFecha(fechaStr);
      return fecha.getMonth() === mesNum && fecha.getFullYear() === anio;
    } catch(e) { return false; }
  }
};

// ════════════════════════════════════════════════════════════════
// HACER DISPONIBLE GLOBALMENTE
// ════════════════════════════════════════════════════════════════

window.APP_CONFIG   = APP_CONFIG;
window.CONFIG_UTILS = CONFIG_UTILS;

// Log de inicio en consola
console.log(
  `%c📱 ${APP_CONFIG.APP_NAME} v${APP_CONFIG.VERSION}`,
  'color:#4A90D9;font-size:16px;font-weight:900;'
);
console.log(
  `%c${APP_CONFIG.DESCRIPCION} — ${APP_CONFIG.CIUDAD}, ${APP_CONFIG.PAIS}`,
  'color:#718096;font-size:12px;'
);


