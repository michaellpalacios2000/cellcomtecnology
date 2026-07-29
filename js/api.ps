// ╔══════════════════════════════════════════════════════════════╗
// ║           CellCom Tecnology — Sistema POS v1.0              ║
// ║                      js/api.js                               ║
// ║    Cliente HTTP centralizado → Google Apps Script API        ║
// ║    Maneja TODAS las comunicaciones con el backend            ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ════════════════════════════════════════════════════════════════
// CLIENTE API — CLASE PRINCIPAL
// ════════════════════════════════════════════════════════════════

class CellComAPI {

  constructor() {
    this.baseURL    = APP_CONFIG.API_URL;
    this.timeout    = 30000; // 30 segundos
    this._cache     = new Map();
    this._cacheTime = new Map();
    this.CACHE_TTL  = 60000; // 1 minuto de caché
  }

  // ════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS DE TRANSPORTE
  // ════════════════════════════════════════════════════════════

  /**
   * Obtiene el token de sesión activo
   */
  _getToken() {
    return localStorage.getItem(APP_CONFIG.STORAGE.TOKEN) || '';
  }

  /**
   * Obtiene el usuario actual
   */
  _getUsuario() {
    try {
      const u = localStorage.getItem(APP_CONFIG.STORAGE.USUARIO);
      return u ? JSON.parse(u) : null;
    } catch(e) { return null; }
  }

  /**
   * Obtiene el rol del usuario actual
   */
  _getRol() {
    return this._getUsuario()?.rol || 'Vendedor';
  }

  /**
   * Verifica si hay caché válido para una acción
   */
  _getCached(key) {
    if (!this._cache.has(key)) return null;
    const tiempo = this._cacheTime.get(key) || 0;
    if (Date.now() - tiempo > this.CACHE_TTL) {
      this._cache.delete(key);
      this._cacheTime.delete(key);
      return null;
    }
    return this._cache.get(key);
  }

  /**
   * Guarda resultado en caché
   */
  _setCache(key, data) {
    this._cache.set(key, data);
    this._cacheTime.set(key, Date.now());
  }

  /**
   * Limpia todo el caché
   */
  limpiarCache() {
    this._cache.clear();
    this._cacheTime.clear();
  }

  /**
   * Petición GET al backend
   * @param {string} action - Nombre de la acción
   * @param {Object} params - Parámetros adicionales
   * @param {boolean} useCache - Usar caché (default: false)
   */
  async get(action, params = {}, useCache = false) {
    // Verificar caché
    const cacheKey = `GET_${action}_${JSON.stringify(params)}`;
    if (useCache) {
      const cached = this._getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const queryParams = new URLSearchParams({
        action,
        token: this._getToken(),
        ...params
      });

      const url        = `${this.baseURL}?${queryParams}`;
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method:  'GET',
        redirect:'follow',
        signal:  controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Guardar en caché si se solicitó
      if (useCache && data.success) {
        this._setCache(cacheKey, data);
      }

      return data;

    } catch(e) {
      if (e.name === 'AbortError') {
        throw new Error('La petición tardó demasiado. Verifica tu conexión.');
      }
      console.error(`❌ API GET [${action}]:`, e.message);
      throw new Error(e.message || 'Error de conexión con el servidor');
    }
  }

  /**
   * Petición POST al backend
   * @param {string} action - Nombre de la acción
   * @param {Object} data   - Datos a enviar
   */
  async post(action, data = {}) {
    try {
      const body       = JSON.stringify({
        action,
        data,
        token: this._getToken()
      });

      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.baseURL, {
        method:  'POST',
        redirect:'follow',
        headers: { 'Content-Type': 'text/plain' },
        body,
        signal:  controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Limpiar caché después de escritura
      this.limpiarCache();

      return result;

    } catch(e) {
      if (e.name === 'AbortError') {
        throw new Error('La petición tardó demasiado. Verifica tu conexión.');
      }
      console.error(`❌ API POST [${action}]:`, e.message);
      throw new Error(e.message || 'Error de conexión con el servidor');
    }
  }

  // ════════════════════════════════════════════════════════════
  // SISTEMA
  // ════════════════════════════════════════════════════════════

  /**
   * Verifica que el servidor está online
   */
  async ping() {
    try {
      const url      = `${this.baseURL}?action=ping`;
      const response = await fetch(url, {
        method:  'GET',
        redirect:'follow'
      });
      const data = await response.json();
      return data.success && data.data?.status === 'online';
    } catch(e) {
      return false;
    }
  }

  /**
   * Obtiene configuración de la empresa y políticas
   */
  async getConfigEmpresa() {
    return await this.get('getConfigEmpresa', {}, true);
  }

  /**
   * Actualiza configuración de la empresa
   */
  async actualizarConfigEmpresa(datos) {
    return await this.post('actualizarConfigEmpresa', datos);
  }

  /**
   * Actualiza configuración de políticas
   */
  async actualizarConfigPoliticas(datos) {
    return await this.post('actualizarConfigPoliticas', datos);
  }

  // ════════════════════════════════════════════════════════════
  // AUTENTICACIÓN
  // ════════════════════════════════════════════════════════════

  /**
   * Login con email y contraseña
   */
  async login(email, contrasena) {
    return await this.post('login', { email, contrasena });
  }

  /**
   * Login con PIN de 4 dígitos
   */
  async loginPIN(pin) {
    return await this.post('loginPIN', { pin });
  }

  /**
   * Cambia la contraseña de un usuario
   */
  async cambiarContrasena(datos) {
    return await this.post('cambiarContrasena', datos);
  }

  // ════════════════════════════════════════════════════════════
  // PRODUCTOS E INVENTARIO
  // ════════════════════════════════════════════════════════════

  /**
   * Carga todos los datos necesarios para el POS
   * Una sola llamada que trae todo
   */
  async getDatosPOS() {
    return await this.get('getDatosPOS', {
      rol: this._getRol()
    });
  }

  /**
   * Obtiene lista de productos con filtros
   */
  async getProductos(filtros = {}) {
    return await this.get('getProductos', {
      rol: this._getRol(),
      ...filtros
    });
  }

  /**
   * Obtiene un producto por su ID
   */
  async getProductoPorID(id) {
    return await this.get('getProductoPorID', { id });
  }

  /**
   * Obtiene todas las categorías
   */
  async getCategorias() {
    return await this.get('getCategorias', {}, true);
  }

  /**
   * Obtiene alertas de stock bajo
   */
  async getAlertasStock() {
    return await this.get('getAlertasStock');
  }

  /**
   * Obtiene historial de costos de un producto
   */
  async getHistorialCostos(idProducto = null) {
    const params = idProducto ? { idProducto } : {};
    return await this.get('getHistorialCostos', params);
  }

  /**
   * Crea un nuevo producto
   */
  async crearProducto(datos) {
    return await this.post('crearProducto', datos);
  }

  /**
   * Edita un producto existente
   */
  async editarProducto(idProducto, datos) {
    return await this.post('editarProducto', { idProducto, ...datos });
  }

  /**
   * Crea una nueva categoría
   */
  async crearCategoria(nombre) {
    return await this.post('crearCategoria', { nombre });
  }

  // ════════════════════════════════════════════════════════════
  // MERMAS Y DEVOLUCIONES
  // ════════════════════════════════════════════════════════════

  /**
   * Obtiene lista de mermas con filtros opcionales
   */
  async getMermas(filtros = {}) {
    return await this.get('getMermas', filtros);
  }

  /**
   * Registra una nueva merma o devolución
   */
  async registrarMerma(datos) {
    return await this.post('registrarMerma', datos);
  }

  /**
   * Actualiza el estado de una merma
   */
  async actualizarEstadoMerma(idMerma, nuevoEstado, resolucion = '') {
    return await this.post('actualizarEstadoMerma', {
      idMerma, nuevoEstado, resolucion
    });
  }

  // ════════════════════════════════════════════════════════════
  // VENTAS
  // ════════════════════════════════════════════════════════════

  /**
   * Obtiene historial de ventas con filtros
   */
  async getVentas(filtros = {}) {
    const usuario = this._getUsuario();
    const params  = {
      rol: this._getRol(),
      ...filtros
    };
    // Vendedor solo ve sus ventas
    if (usuario?.rol === 'Vendedor') {
      params.vendedor = usuario.nombre;
    }
    return await this.get('getVentas', params);
  }

  /**
   * Obtiene una venta específica por ID
   */
  async getVentaPorID(id) {
    return await this.get('getVentaPorID', { id });
  }

  /**
   * Obtiene resumen de ventas del día
   */
  async getResumenHoy() {
    return await this.get('getResumenHoy');
  }

  /**
   * Obtiene ventas perdidas registradas
   */
  async getVentasPerdidas() {
    return await this.get('getVentasPerdidas');
  }

  /**
   * Crea una venta completa
   * Incluye: cabecera + detalle + stock + tesorería
   */
  async crearVenta(datos) {
    const usuario = this._getUsuario();
    if (!datos.vendedor && usuario) {
      datos.vendedor = usuario.nombre;
    }
    return await this.post('crearVenta', datos);
  }

  /**
   * Completa el pago de un separado
   */
  async completarSeparado(idVenta, datosPago) {
    return await this.post('completarSeparado', {
      idVenta, ...datosPago
    });
  }

  /**
   * Registra una venta perdida
   */
  async registrarVentaPerdida(datos) {
    return await this.post('registrarVentaPerdida', datos);
  }

  /**
   * Marca una nota como enviada por WhatsApp
   */
  async marcarNotaEnviadaWA(idVenta) {
    return await this.post('marcarNotaEnviadaWA', { idVenta });
  }

  // ════════════════════════════════════════════════════════════
  // CLIENTES — CRM
  // ════════════════════════════════════════════════════════════

  /**
   * Obtiene lista de clientes con filtros
   */
  async getClientes(filtros = {}) {
    return await this.get('getClientes', filtros);
  }

  /**
   * Obtiene un cliente específico con historial completo
   */
  async getClientePorID(id) {
    return await this.get('getClientePorID', { id });
  }

  /**
   * Búsqueda rápida de clientes (para el POS)
   */
  async buscarClienteRapido(termino) {
    if (!termino || termino.trim().length < 2) {
      return { success: true, data: { clientes: [], total: 0 } };
    }
    return await this.get('buscarClienteRapido', { termino });
  }

  /**
   * Obtiene historial completo de un cliente
   */
  async getHistorialCliente(id) {
    return await this.get('getHistorialCliente', { id });
  }

  /**
   * Obtiene ranking de mejores clientes
   */
  async getRankingClientes(limite = 10) {
    return await this.get('getRankingClientes', { limite });
  }

  /**
   * Obtiene estadísticas globales del CRM
   */
  async getEstadisticasClientes() {
    return await this.get('getEstadisticasClientes');
  }

  /**
   * Detecta si un teléfono ya tiene cliente asociado
   */
  async detectarClientePorTelefono(telefono) {
    return await this.get('detectarClientePorTelefono', { telefono });
  }

  /**
   * Crea un nuevo cliente
   */
  async crearCliente(datos) {
    return await this.post('crearCliente', datos);
  }

  /**
   * Edita datos de un cliente
   */
  async editarCliente(idCliente, datos) {
    return await this.post('editarCliente', { idCliente, ...datos });
  }

  // ════════════════════════════════════════════════════════════
  // GASTOS — COMPRAS — CAMPAÑAS
  // ════════════════════════════════════════════════════════════

  /**
   * Obtiene historial de gastos
   */
  async getGastos(filtros = {}) {
    return await this.get('getGastos', filtros);
  }

  /**
   * Obtiene gastos del día actual
   */
  async getGastosHoy() {
    return await this.get('getGastosHoy');
  }

  /**
   * Obtiene historial de compras de mercadería
   */
  async getCompras(filtros = {}) {
    return await this.get('getCompras', filtros);
  }

  /**
   * Obtiene campañas publicitarias
   */
  async getCampanas(filtros = {}) {
    return await this.get('getCampanas', filtros);
  }

  /**
   * Obtiene resumen financiero del mes
   */
  async getResumenFinanciero(mes = null) {
    const params = mes ? { mes } : {};
    return await this.get('getResumenFinanciero', params);
  }

  /**
   * Registra un gasto operativo
   */
  async crearGasto(datos) {
    return await this.post('crearGasto', datos);
  }

  /**
   * Registra una compra de mercadería
   */
  async crearCompra(datos) {
    return await this.post('crearCompra', datos);
  }

  /**
   * Registra una campaña publicitaria
   */
  async crearCampana(datos) {
    return await this.post('crearCampana', datos);
  }

  // ════════════════════════════════════════════════════════════
  // TESORERÍA — CAJA
  // ════════════════════════════════════════════════════════════

  /**
   * Obtiene el turno activo actual
   */
  async getTurnoActivo() {
    return await this.get('getTurnoActivo');
  }

  /**
   * Obtiene historial de arqueos
   */
  async getArqueos(filtros = {}) {
    return await this.get('getArqueos', filtros);
  }

  /**
   * Obtiene flujo de cuentas digitales
   */
  async getFlujoCuentas(filtros = {}) {
    return await this.get('getFlujoCuentas', filtros);
  }

  /**
   * Obtiene dashboard completo de tesorería
   */
  async getDashboardTesoreria() {
    return await this.get('getDashboardTesoreria');
  }

  /**
   * Abre un nuevo turno de caja
   */
  async abrirTurno(datos) {
    return await this.post('abrirTurno', datos);
  }

  /**
   * Cierra el turno activo con arqueo
   */
  async cerrarTurno(datos) {
    return await this.post('cerrarTurno', datos);
  }

  /**
   * Registra un movimiento digital manual
   */
  async registrarMovimientoDigital(datos) {
    return await this.post('registrarMovimientoDigital', datos);
  }

  // ════════════════════════════════════════════════════════════
  // USUARIOS Y ROLES
  // ════════════════════════════════════════════════════════════

  /**
   * Obtiene lista de usuarios del equipo
   */
  async getUsuarios(filtros = {}) {
    return await this.get('getUsuarios', filtros);
  }

  /**
   * Obtiene mapa de permisos de un rol
   */
  async getMapaPermisos(rol) {
    return await this.get('getMapaPermisos', { rol });
  }

  /**
   * Crea un nuevo usuario
   */
  async crearUsuario(datos) {
    return await this.post('crearUsuario', datos);
  }

  /**
   * Edita datos de un usuario
   */
  async editarUsuario(emailUsuario, datos) {
    return await this.post('editarUsuario', { emailUsuario, ...datos });
  }

  /**
   * Cambia el estado de una cuenta
   */
  async cambiarEstadoCuenta(emailUsuario, nuevoEstado) {
    return await this.post('cambiarEstadoCuenta', {
      emailUsuario, nuevoEstado
    });
  }

  // ════════════════════════════════════════════════════════════
  // REPORTES Y DASHBOARD
  // ════════════════════════════════════════════════════════════

  /**
   * Obtiene dashboard completo del Admin
   */
  async getDashboardAdmin() {
    return await this.get('getDashboardAdmin');
  }

  /**
   * Obtiene reporte de un período
   */
  async getReportePeriodo(params = {}) {
    return await this.get('getReportePeriodo', params);
  }

  /**
   * Obtiene reporte anual completo
   */
  async getReporteAnual(anio = null) {
    const params = anio ? { anio } : {};
    return await this.get('getReporteAnual', params);
  }

  /**
   * Obtiene reporte de rentabilidad por producto
   */
  async getReporteRentabilidad(mes = null) {
    const params = mes ? { mes } : {};
    return await this.get('getReporteRentabilidad', params);
  }

  /**
   * Obtiene reporte de ventas perdidas
   */
  async getReporteVentasPerdidas() {
    return await this.get('getReporteVentasPerdidas');
  }

  /**
   * Obtiene reporte de mermas
   */
  async getReporteMermas(mes = null) {
    const params = mes ? { mes } : {};
    return await this.get('getReporteMermas', params);
  }

  /**
   * Obtiene histórico mensual completo
   */
  async getHistoricoMensual() {
    return await this.get('getHistoricoMensual');
  }

  // ════════════════════════════════════════════════════════════
  // NOTAS DE VENTA
  // ════════════════════════════════════════════════════════════

  /**
   * Genera nota de venta en HTML
   */
  async generarNotaVenta(id) {
    return await this.get('generarNotaVenta', { id });
  }

  /**
   * Genera nota de separado
   */
  async generarNotaSeparado(id) {
    return await this.get('generarNotaSeparado', { id });
  }

  /**
   * Genera nota de cambio o devolución
   */
  async generarNotaCambio(datos) {
    return await this.post('generarNotaCambio', datos);
  }

  // ════════════════════════════════════════════════════════════
  // MÉTODOS DE UTILIDAD
  // ════════════════════════════════════════════════════════════

  /**
   * Imprime una nota de venta en ventana nueva
   */
  async imprimirNota(idVenta) {
    try {
      const resultado = await this.generarNotaVenta(idVenta);
      if (resultado.success && resultado.data?.htmlNota) {
        const ventana = window.open('', '_blank', 'width=460,height=720,scrollbars=yes');
        ventana.document.write(resultado.data.htmlNota);
        ventana.document.close();
        ventana.focus();
        setTimeout(() => ventana.print(), 600);
        await this.marcarNotaEnviadaWA(idVenta);
        return { success: true };
      }
      throw new Error('No se pudo generar la nota');
    } catch(e) {
      throw new Error(`Error al imprimir: ${e.message}`);
    }
  }

  /**
   * Abre WhatsApp con la nota de venta
   */
  async enviarNotaWA(idVenta) {
    try {
      const resultado = await this.generarNotaVenta(idVenta);
      if (resultado.success && resultado.data?.urlWhatsApp) {
        window.open(resultado.data.urlWhatsApp, '_blank');
        await this.marcarNotaEnviadaWA(idVenta);
        return { success: true, enviado: true };
      }
      return { success: true, enviado: false, mensaje: 'Cliente sin número de WhatsApp' };
    } catch(e) {
      throw new Error(`Error al enviar WA: ${e.message}`);
    }
  }
}

// ════════════════════════════════════════════════════════════════
// INSTANCIA GLOBAL ÚNICA
// ════════════════════════════════════════════════════════════════

const API = new CellComAPI();
window.API = API;

console.log('%c✅ API Client inicializado', 'color:#48BB78;font-weight:700;');
