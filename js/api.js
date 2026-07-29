// ╔══════════════════════════════════════════════════════════════╗
// ║           CellCom Tecnology — Sistema POS v1.0              ║
// ║                      js/api.js                               ║
// ║    Cliente HTTP Avanzado → Google Apps Script API            ║
// ║    CORS Compatible + Cache + Retry + Error Handling          ║
// ║    Cieneguilla, Lima, Perú                                   ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ════════════════════════════════════════════════════════════════
// CLASE PRINCIPAL — CLIENTE API
// ════════════════════════════════════════════════════════════════

class CellComAPI {

  constructor() {
    this.baseURL      = APP_CONFIG.API_URL;
    this.timeout      = 30000;
    this.maxRetries   = 2;
    this.retryDelay   = 1000;
    this._cache       = new Map();
    this._cacheTime   = new Map();
    this.CACHE_TTL    = 60000;
    this._pendientes  = new Map();
    this._online      = null;
  }

  // ════════════════════════════════════════════════════════════
  // UTILIDADES INTERNAS
  // ════════════════════════════════════════════════════════════

  _getToken() {
    return localStorage.getItem(APP_CONFIG.STORAGE.TOKEN) || '';
  }

  _getUsuario() {
    try {
      const u = localStorage.getItem(APP_CONFIG.STORAGE.USUARIO);
      return u ? JSON.parse(u) : null;
    } catch(e) { return null; }
  }

  _getRol() {
    return this._getUsuario()?.rol || 'Vendedor';
  }

  _getCached(key) {
    if (!this._cache.has(key)) return null;
    const t = this._cacheTime.get(key) || 0;
    if (Date.now() - t > this.CACHE_TTL) {
      this._cache.delete(key);
      this._cacheTime.delete(key);
      return null;
    }
    return this._cache.get(key);
  }

  _setCache(key, data) {
    this._cache.set(key, data);
    this._cacheTime.set(key, Date.now());
  }

  limpiarCache() {
    this._cache.clear();
    this._cacheTime.clear();
  }

  _esperar(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ════════════════════════════════════════════════════════════
  // TRANSPORTE HTTP — GET
  // ════════════════════════════════════════════════════════════

  async get(action, params = {}, useCache = false) {
    const cacheKey = `GET:${action}:${JSON.stringify(params)}`;

    // Verificar caché
    if (useCache) {
      const cached = this._getCached(cacheKey);
      if (cached) {
        console.log(`📦 Cache hit: ${action}`);
        return cached;
      }
    }

    // Evitar peticiones duplicadas simultáneas
    if (this._pendientes.has(cacheKey)) {
      console.log(`⏳ Petición pendiente: ${action}`);
      return await this._pendientes.get(cacheKey);
    }

    const promesa = this._ejecutarGet(action, params, cacheKey, useCache);
    this._pendientes.set(cacheKey, promesa);

    try {
      const resultado = await promesa;
      return resultado;
    } finally {
      this._pendientes.delete(cacheKey);
    }
  }

  async _ejecutarGet(action, params, cacheKey, useCache, intento = 1) {
    try {
      // Construir URL con parámetros
      const queryParams = new URLSearchParams();
      queryParams.set('action', action);

      const token = this._getToken();
      if (token) queryParams.set('token', token);

      // Agregar todos los parámetros
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          queryParams.set(key, String(val));
        }
      });

      const url = `${this.baseURL}?${queryParams.toString()}`;

      // Configurar timeout
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), this.timeout);

      console.log(`📡 GET → ${action}`, params);

      const response = await fetch(url, {
        method:   'GET',
        redirect: 'follow',
        mode:     'cors',
        signal:   controller.signal
      });

      clearTimeout(timeoutId);

      // Verificar respuesta HTTP
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parsear JSON
      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Apps Script a veces retorna text/html con JSON
        const texto = await response.text();
        try {
          data = JSON.parse(texto);
        } catch(e) {
          throw new Error('La respuesta del servidor no es JSON válido');
        }
      }

      // Guardar en caché si se solicitó
      if (useCache && data && data.success) {
        this._setCache(cacheKey, data);
      }

      console.log(`✅ GET ← ${action}`, data.success ? 'OK' : 'ERROR');
      return data;

    } catch(e) {
      // Manejar timeout
      if (e.name === 'AbortError') {
        if (intento < this.maxRetries) {
          console.warn(`⏰ Timeout GET [${action}] — Reintentando (${intento}/${this.maxRetries})...`);
          await this._esperar(this.retryDelay * intento);
          return await this._ejecutarGet(action, params, cacheKey, useCache, intento + 1);
        }
        throw new Error('El servidor tardó demasiado en responder. Verifica tu conexión a internet.');
      }

      // Reintentar en errores de red
      if (intento < this.maxRetries && this._esErrorDeRed(e)) {
        console.warn(`🔄 Error de red [${action}] — Reintentando (${intento}/${this.maxRetries})...`);
        await this._esperar(this.retryDelay * intento);
        return await this._ejecutarGet(action, params, cacheKey, useCache, intento + 1);
      }

      console.error(`❌ GET Error [${action}]:`, e.message);
      throw new Error(this._formatearError(e));
    }
  }

  // ════════════════════════════════════════════════════════════
  // TRANSPORTE HTTP — POST
  // ════════════════════════════════════════════════════════════

  async post(action, data = {}, intento = 1) {
    try {
      const token = this._getToken();

      const body = JSON.stringify({
        action,
        data,
        token
      });

      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), this.timeout);

      console.log(`📡 POST → ${action}`, Object.keys(data));

      const response = await fetch(this.baseURL, {
        method:   'POST',
        redirect: 'follow',
        mode:     'cors',
        headers:  { 'Content-Type': 'text/plain' },
        body,
        signal:   controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let result;

      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const texto = await response.text();
        try {
          result = JSON.parse(texto);
        } catch(e) {
          throw new Error('La respuesta del servidor no es JSON válido');
        }
      }

      // Limpiar caché después de escritura
      this.limpiarCache();

      console.log(`✅ POST ← ${action}`, result.success ? 'OK' : 'ERROR');
      return result;

    } catch(e) {
      if (e.name === 'AbortError') {
        if (intento < this.maxRetries) {
          console.warn(`⏰ Timeout POST [${action}] — Reintentando...`);
          await this._esperar(this.retryDelay * intento);
          return await this.post(action, data, intento + 1);
        }
        throw new Error('El servidor tardó demasiado. Verifica tu conexión.');
      }

      if (intento < this.maxRetries && this._esErrorDeRed(e)) {
        console.warn(`🔄 Error de red [${action}] — Reintentando...`);
        await this._esperar(this.retryDelay * intento);
        return await this.post(action, data, intento + 1);
      }

      console.error(`❌ POST Error [${action}]:`, e.message);
      throw new Error(this._formatearError(e));
    }
  }

  // ════════════════════════════════════════════════════════════
  // DETECCIÓN DE ERRORES
  // ════════════════════════════════════════════════════════════

  _esErrorDeRed(error) {
    const msg = (error.message || '').toLowerCase();
    return msg.includes('failed to fetch') ||
           msg.includes('network') ||
           msg.includes('net::') ||
           msg.includes('cors') ||
           msg.includes('load failed') ||
           msg.includes('type error');
  }

  _formatearError(error) {
    const msg = (error.message || '').toLowerCase();

    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')) {
      return 'Error de conexión. Verifica tu internet e intenta nuevamente.';
    }
    if (msg.includes('cors')) {
      return 'Error de permisos del servidor. Contacta al administrador.';
    }
    if (msg.includes('abort')) {
      return 'La petición tardó demasiado. Intenta nuevamente.';
    }
    if (msg.includes('json')) {
      return 'Error en la respuesta del servidor. Intenta nuevamente.';
    }

    return error.message || 'Error desconocido. Intenta nuevamente.';
  }

  // ════════════════════════════════════════════════════════════
  // PING — VERIFICACIÓN DE SERVIDOR
  // ════════════════════════════════════════════════════════════

  async ping() {
    try {
      const url = `${this.baseURL}?action=ping`;

      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method:   'GET',
        redirect: 'follow',
        mode:     'cors',
        signal:   controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const texto = await response.text();
        data = JSON.parse(texto);
      }

      this._online = !!(data && data.success && data.data && data.data.status === 'online');
      return this._online;

    } catch(e) {
      console.warn('⚠️ Ping falló:', e.message);
      this._online = false;
      return false;
    }
  }

  get isOnline() {
    return this._online;
  }

  // ════════════════════════════════════════════════════════════
  // SISTEMA
  // ════════════════════════════════════════════════════════════

  async getConfigEmpresa() {
    return await this.get('getConfigEmpresa', {}, true);
  }

  async actualizarConfigEmpresa(datos) {
    return await this.post('actualizarConfigEmpresa', datos);
  }

  async actualizarConfigPoliticas(datos) {
    return await this.post('actualizarConfigPoliticas', datos);
  }

  // ════════════════════════════════════════════════════════════
  // AUTENTICACIÓN
  // ════════════════════════════════════════════════════════════

  async login(email, contrasena) {
    return await this.post('login', { email, contrasena });
  }

  async loginPIN(pin) {
    return await this.post('loginPIN', { pin });
  }

  async cambiarContrasena(datos) {
    return await this.post('cambiarContrasena', datos);
  }

  // ════════════════════════════════════════════════════════════
  // PRODUCTOS E INVENTARIO
  // ════════════════════════════════════════════════════════════

  async getDatosPOS() {
    return await this.get('getDatosPOS', { rol: this._getRol() });
  }

  async getProductos(filtros = {}) {
    return await this.get('getProductos', { rol: this._getRol(), ...filtros });
  }

  async getProductoPorID(id) {
    return await this.get('getProductoPorID', { id });
  }

  async getCategorias() {
    return await this.get('getCategorias', {}, true);
  }

  async getAlertasStock() {
    return await this.get('getAlertasStock');
  }

  async getHistorialCostos(idProducto = null) {
    return await this.get('getHistorialCostos', idProducto ? { idProducto } : {});
  }

  async crearProducto(datos) {
    return await this.post('crearProducto', datos);
  }

  async editarProducto(idProducto, datos) {
    return await this.post('editarProducto', { idProducto, ...datos });
  }

  async crearCategoria(nombre) {
    return await this.post('crearCategoria', { nombre });
  }

  // ════════════════════════════════════════════════════════════
  // MERMAS Y DEVOLUCIONES
  // ════════════════════════════════════════════════════════════

  async getMermas(filtros = {}) {
    return await this.get('getMermas', filtros);
  }

  async registrarMerma(datos) {
    return await this.post('registrarMerma', datos);
  }

  async actualizarEstadoMerma(idMerma, nuevoEstado, resolucion = '') {
    return await this.post('actualizarEstadoMerma', { idMerma, nuevoEstado, resolucion });
  }

  // ════════════════════════════════════════════════════════════
  // VENTAS
  // ════════════════════════════════════════════════════════════

  async getVentas(filtros = {}) {
    const u = this._getUsuario();
    const p = { rol: this._getRol(), ...filtros };
    if (u?.rol === 'Vendedor') p.vendedor = u.nombre;
    return await this.get('getVentas', p);
  }

  async getVentaPorID(id) {
    return await this.get('getVentaPorID', { id });
  }

  async getResumenHoy() {
    return await this.get('getResumenHoy');
  }

  async getVentasPerdidas() {
    return await this.get('getVentasPerdidas');
  }

  async crearVenta(datos) {
    const u = this._getUsuario();
    if (!datos.vendedor && u) datos.vendedor = u.nombre;
    return await this.post('crearVenta', datos);
  }

  async completarSeparado(idVenta, datosPago) {
    return await this.post('completarSeparado', { idVenta, ...datosPago });
  }

  async registrarVentaPerdida(datos) {
    return await this.post('registrarVentaPerdida', datos);
  }

  async marcarNotaEnviadaWA(idVenta) {
    return await this.post('marcarNotaEnviadaWA', { idVenta });
  }

  // ════════════════════════════════════════════════════════════
  // CLIENTES — CRM
  // ════════════════════════════════════════════════════════════

  async getClientes(filtros = {}) {
    return await this.get('getClientes', filtros);
  }

  async getClientePorID(id) {
    return await this.get('getClientePorID', { id });
  }

  async buscarClienteRapido(termino) {
    if (!termino || termino.trim().length < 2) {
      return { success: true, data: { clientes: [], total: 0 } };
    }
    return await this.get('buscarClienteRapido', { termino });
  }

  async getHistorialCliente(id) {
    return await this.get('getHistorialCliente', { id });
  }

  async getRankingClientes(limite = 10) {
    return await this.get('getRankingClientes', { limite });
  }

  async getEstadisticasClientes() {
    return await this.get('getEstadisticasClientes');
  }

  async detectarClientePorTelefono(telefono) {
    return await this.get('detectarClientePorTelefono', { telefono });
  }

  async crearCliente(datos) {
    return await this.post('crearCliente', datos);
  }

  async editarCliente(idCliente, datos) {
    return await this.post('editarCliente', { idCliente, ...datos });
  }

  // ════════════════════════════════════════════════════════════
  // GASTOS — COMPRAS — CAMPAÑAS
  // ════════════════════════════════════════════════════════════

  async getGastos(filtros = {}) {
    return await this.get('getGastos', filtros);
  }

  async getGastosHoy() {
    return await this.get('getGastosHoy');
  }

  async getCompras(filtros = {}) {
    return await this.get('getCompras', filtros);
  }

  async getCampanas(filtros = {}) {
    return await this.get('getCampanas', filtros);
  }

  async getResumenFinanciero(mes = null) {
    return await this.get('getResumenFinanciero', mes ? { mes } : {});
  }

  async crearGasto(datos) {
    return await this.post('crearGasto', datos);
  }

  async crearCompra(datos) {
    return await this.post('crearCompra', datos);
  }

  async crearCampana(datos) {
    return await this.post('crearCampana', datos);
  }

  // ════════════════════════════════════════════════════════════
  // TESORERÍA — CAJA
  // ════════════════════════════════════════════════════════════

  async getTurnoActivo() {
    return await this.get('getTurnoActivo');
  }

  async getArqueos(filtros = {}) {
    return await this.get('getArqueos', filtros);
  }

  async getFlujoCuentas(filtros = {}) {
    return await this.get('getFlujoCuentas', filtros);
  }

  async getDashboardTesoreria() {
    return await this.get('getDashboardTesoreria');
  }

  async abrirTurno(datos) {
    return await this.post('abrirTurno', datos);
  }

  async cerrarTurno(datos) {
    return await this.post('cerrarTurno', datos);
  }

  async registrarMovimientoDigital(datos) {
    return await this.post('registrarMovimientoDigital', datos);
  }

  // ════════════════════════════════════════════════════════════
  // USUARIOS Y ROLES
  // ════════════════════════════════════════════════════════════

  async getUsuarios(filtros = {}) {
    return await this.get('getUsuarios', filtros);
  }

  async getMapaPermisos(rol) {
    return await this.get('getMapaPermisos', { rol });
  }

  async crearUsuario(datos) {
    return await this.post('crearUsuario', datos);
  }

  async editarUsuario(emailUsuario, datos) {
    return await this.post('editarUsuario', { emailUsuario, ...datos });
  }

  async cambiarEstadoCuenta(emailUsuario, nuevoEstado) {
    return await this.post('cambiarEstadoCuenta', { emailUsuario, nuevoEstado });
  }

  // ════════════════════════════════════════════════════════════
  // REPORTES Y DASHBOARD
  // ════════════════════════════════════════════════════════════

  async getDashboardAdmin() {
    return await this.get('getDashboardAdmin');
  }

  async getReportePeriodo(params = {}) {
    return await this.get('getReportePeriodo', params);
  }

  async getReporteAnual(anio = null) {
    return await this.get('getReporteAnual', anio ? { anio } : {});
  }

  async getReporteRentabilidad(mes = null) {
    return await this.get('getReporteRentabilidad', mes ? { mes } : {});
  }

  async getReporteVentasPerdidas() {
    return await this.get('getReporteVentasPerdidas');
  }

  async getReporteMermas(mes = null) {
    return await this.get('getReporteMermas', mes ? { mes } : {});
  }

  async getHistoricoMensual() {
    return await this.get('getHistoricoMensual');
  }

  // ════════════════════════════════════════════════════════════
  // NOTAS DE VENTA
  // ════════════════════════════════════════════════════════════

  async generarNotaVenta(id) {
    return await this.get('generarNotaVenta', { id });
  }

  async generarNotaSeparado(id) {
    return await this.get('generarNotaSeparado', { id });
  }

  async generarNotaCambio(datos) {
    return await this.post('generarNotaCambio', datos);
  }

  // ════════════════════════════════════════════════════════════
  // UTILIDADES DE NOTAS
  // ════════════════════════════════════════════════════════════

  async imprimirNota(idVenta) {
    try {
      const resultado = await this.generarNotaVenta(idVenta);
      if (resultado.success && resultado.data?.htmlNota) {
        const ventana = window.open('', '_blank', 'width=460,height=720,scrollbars=yes');
        if (ventana) {
          ventana.document.write(resultado.data.htmlNota);
          ventana.document.close();
          ventana.focus();
          setTimeout(() => ventana.print(), 600);
        }
        await this.marcarNotaEnviadaWA(idVenta).catch(() => {});
        return { success: true };
      }
      throw new Error('No se pudo generar la nota');
    } catch(e) {
      throw new Error(`Error al imprimir: ${e.message}`);
    }
  }

  async enviarNotaWA(idVenta) {
    try {
      const resultado = await this.generarNotaVenta(idVenta);
      if (resultado.success && resultado.data?.urlWhatsApp) {
        window.open(resultado.data.urlWhatsApp, '_blank');
        await this.marcarNotaEnviadaWA(idVenta).catch(() => {});
        return { success: true, enviado: true };
      }
      return { success: true, enviado: false, mensaje: 'Cliente sin número de WhatsApp' };
    } catch(e) {
      throw new Error(`Error al enviar WA: ${e.message}`);
    }
  }
}

// ════════════════════════════════════════════════════════════════
// INSTANCIA GLOBAL
// ════════════════════════════════════════════════════════════════

const API = new CellComAPI();
window.API = API;

console.log('%c✅ API Client v1.0 inicializado', 'color:#48BB78;font-weight:700;font-size:12px;');
console.log(`%c📡 Endpoint: ${APP_CONFIG.API_URL.substring(0, 60)}...`, 'color:#718096;font-size:10px;');

