// ╔══════════════════════════════════════════════════════════════╗
// ║           CellCom Tecnology — Sistema POS v1.0              ║
// ║                     js/auth.js                               ║
// ║    Autenticación, Sesión, Roles y Control de Acceso          ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ════════════════════════════════════════════════════════════════
// CLASE PRINCIPAL DE AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════

class CellComAuth {

  constructor() {
    this._sesionActiva    = false;
    this._usuario         = null;
    this._token           = '';
    this._permisos        = {};
    this._checkInterval   = null;
  }

  // ════════════════════════════════════════════════════════════
  // GETTERS — Datos de sesión
  // ════════════════════════════════════════════════════════════

  get token()   { return this._token   || localStorage.getItem(APP_CONFIG.STORAGE.TOKEN) || ''; }
  get usuario() { return this._usuario || this._cargarUsuarioLocal(); }
  get esAdmin() { return this.usuario?.rol === 'Admin'; }
  get esVendedor() { return this.usuario?.rol === 'Vendedor'; }
  get nombre()  { return this.usuario?.nombre || 'Usuario'; }
  get rol()     { return this.usuario?.rol    || ''; }
  get activo()  { return this._sesionActiva && !!this.token; }

  // ════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ════════════════════════════════════════════════════════════

  /**
   * Inicializa el sistema de autenticación
   * Verifica si hay sesión activa al cargar la página
   */
  async inicializar() {
    const sesion = this.verificarSesionLocal();

    if (sesion) {
      this._sesionActiva = true;
      this._token        = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN) || '';
      this._usuario      = sesion;
      this._cargarPermisos();
      this._iniciarVerificacionPeriodica();
      return { activo: true, usuario: sesion };
    }

    return { activo: false, usuario: null };
  }

  // ════════════════════════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════════════════════════

  /**
   * Realiza el login con email y contraseña
   * @param {string} email
   * @param {string} contrasena
   * @returns {Object} Resultado del login
   */
  async login(email, contrasena) {
    try {
      const resultado = await API.login(email, contrasena);

      if (resultado.success && resultado.data) {
        const data = resultado.data;

        // Extraer token y usuario (pueden venir en diferentes niveles)
        const token   = data.token   || data.data?.token;
        const usuario = data.usuario || data.data?.usuario;
        const autenticado = data.autenticado || data.data?.autenticado;

        if (autenticado && token && usuario) {
          await this._procesarLoginExitoso(token, usuario);
          return {
            success:  true,
            usuario,
            mensaje:  `✅ Bienvenido/a, ${usuario.nombre}`
          };
        }
      }

      return {
        success: false,
        mensaje: resultado.message || resultado.data?.mensaje || 'Credenciales incorrectas'
      };

    } catch(e) {
      console.error('Error en login:', e);
      return {
        success: false,
        mensaje: e.message || 'Error de conexión'
      };
    }
  }

  /**
   * Realiza el login con PIN de 4 dígitos
   * @param {string} pin
   * @returns {Object} Resultado del login
   */
  async loginPIN(pin) {
    try {
      const resultado = await API.loginPIN(pin);

      if (resultado.success && resultado.data) {
        const data = resultado.data;
        const token   = data.token   || data.data?.token;
        const usuario = data.usuario || data.data?.usuario;
        const autenticado = data.autenticado || data.data?.autenticado;

        if (autenticado && token && usuario) {
          await this._procesarLoginExitoso(token, usuario);
          return {
            success: true,
            usuario,
            mensaje: `✅ Bienvenido/a, ${usuario.nombre}`
          };
        }
      }

      return {
        success: false,
        mensaje: resultado.message || resultado.data?.mensaje || 'PIN incorrecto'
      };

    } catch(e) {
      return {
        success: false,
        mensaje: e.message || 'Error de conexión'
      };
    }
  }

  /**
   * Procesa un login exitoso
   * Guarda sesión y carga permisos
   */
  async _procesarLoginExitoso(token, usuario) {
    // Guardar en estado local
    this._token        = token;
    this._usuario      = usuario;
    this._sesionActiva = true;

    // Guardar en localStorage
    localStorage.setItem(APP_CONFIG.STORAGE.TOKEN,      token);
    localStorage.setItem(APP_CONFIG.STORAGE.USUARIO,    JSON.stringify(usuario));
    localStorage.setItem(APP_CONFIG.STORAGE.LOGIN_TIME, Date.now().toString());

    // Cargar mapa de permisos
    await this._cargarPermisos();

    // Iniciar verificación periódica de sesión
    this._iniciarVerificacionPeriodica();

    console.log(`✅ Sesión iniciada: ${usuario.nombre} (${usuario.rol})`);
  }

  // ════════════════════════════════════════════════════════════
  // LOGOUT
  // ════════════════════════════════════════════════════════════

  /**
   * Cierra la sesión actual
   * Limpia localStorage y redirige al login
   */
  cerrarSesion(redirigir = true) {
    // Limpiar estado
    this._sesionActiva = false;
    this._usuario      = null;
    this._token        = '';
    this._permisos     = {};

    // Detener verificación periódica
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }

    // Limpiar localStorage
    Object.values(APP_CONFIG.STORAGE).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem('cellcom_bloqueado');

    // Limpiar caché de API
    if (window.API) API.limpiarCache();

    console.log('👋 Sesión cerrada');

    // Redirigir al login
    if (redirigir) {
      window.location.href = this._getURLLogin();
    }
  }

  // ════════════════════════════════════════════════════════════
  // VERIFICACIÓN DE SESIÓN
  // ════════════════════════════════════════════════════════════

  /**
   * Verifica si hay sesión activa en localStorage
   * @returns {Object|null} Usuario si hay sesión, null si no
   */
  verificarSesionLocal() {
    try {
      const token   = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN);
      const userStr = localStorage.getItem(APP_CONFIG.STORAGE.USUARIO);
      const tiempo  = localStorage.getItem(APP_CONFIG.STORAGE.LOGIN_TIME);

      if (!token || !userStr || !tiempo) return null;

      // Verificar expiración
      const horasTransc = (Date.now() - parseInt(tiempo)) / 3600000;
      if (horasTransc > APP_CONFIG.SESION.HORAS) {
        this._limpiarSesionLocal();
        return null;
      }

      return JSON.parse(userStr);

    } catch(e) {
      this._limpiarSesionLocal();
      return null;
    }
  }

  /**
   * Verifica sesión y redirige si no es válida
   * Usar al inicio de cada página protegida
   * @param {string} paginaActual - Nombre de la página actual
   */
  async requerirSesion(paginaActual = '') {
    const usuario = this.verificarSesionLocal();

    if (!usuario) {
      console.warn('⚠️ Sin sesión activa — Redirigiendo al login');
      window.location.href = this._getURLLogin();
      return false;
    }

    // Verificar acceso a la página
    if (paginaActual && !this.tieneAccesoAPagina(paginaActual)) {
      console.warn(`⚠️ Sin acceso a "${paginaActual}" con rol "${usuario.rol}"`);
      window.location.href = this._getPaginaDefault();
      return false;
    }

    this._sesionActiva = true;
    this._token        = localStorage.getItem(APP_CONFIG.STORAGE.TOKEN) || '';
    this._usuario      = usuario;
    this._cargarPermisos();

    return true;
  }

  /**
   * Inicia verificación periódica de sesión (cada 5 minutos)
   */
  _iniciarVerificacionPeriodica() {
    if (this._checkInterval) clearInterval(this._checkInterval);

    this._checkInterval = setInterval(() => {
      const sesion = this.verificarSesionLocal();
      if (!sesion) {
        console.warn('⏰ Sesión expirada');
        this.cerrarSesion(true);
      }
    }, 5 * 60 * 1000); // Cada 5 minutos
  }

  // ════════════════════════════════════════════════════════════
  // PERMISOS Y ROLES
  // ════════════════════════════════════════════════════════════

  /**
   * Carga el mapa de permisos del usuario actual
   */
  async _cargarPermisos() {
    try {
      const rol = this.rol;
      if (!rol) return;

      // Primero desde CONFIG local (más rápido)
      const rolConfig = APP_CONFIG.ROLES[rol.toUpperCase()];
      if (rolConfig) {
        this._permisos = { permisos: {} };
        rolConfig.permisos.forEach(p => {
          this._permisos.permisos[p] = true;
        });
        localStorage.setItem(
          APP_CONFIG.STORAGE.PERMISOS,
          JSON.stringify(this._permisos)
        );
      }

      // Luego intentar desde el servidor (más actualizado)
      try {
        const resultado = await API.getMapaPermisos(rol);
        if (resultado.success && resultado.data) {
          this._permisos = resultado.data;
          localStorage.setItem(
            APP_CONFIG.STORAGE.PERMISOS,
            JSON.stringify(this._permisos)
          );
        }
      } catch(e) {
        // No crítico — ya tenemos los permisos locales
      }

    } catch(e) {
      console.error('Error cargando permisos:', e);
    }
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param {string} permiso
   * @returns {boolean}
   */
  tienePerm(permiso) {
    // Verificar en memoria
    if (this._permisos?.permisos?.[permiso] !== undefined) {
      return !!this._permisos.permisos[permiso];
    }

    // Verificar en localStorage
    try {
      const permsStr = localStorage.getItem(APP_CONFIG.STORAGE.PERMISOS);
      if (permsStr) {
        const perms = JSON.parse(permsStr);
        return !!perms?.permisos?.[permiso];
      }
    } catch(e) {}

    // Fallback: verificar en CONFIG local
    return CONFIG_UTILS.tienePermiso(this.rol, permiso);
  }

  /**
   * Verifica si el usuario tiene acceso a una página
   * @param {string} pagina - Nombre de la página
   * @returns {boolean}
   */
  tieneAccesoAPagina(pagina) {
    return CONFIG_UTILS.tieneAcceso(pagina, this.rol);
  }

  /**
   * Verifica si el usuario puede ver costos
   */
  get puedVerCostos()    { return this.tienePerm('ver_costos'); }

  /**
   * Verifica si puede ver ganancias
   */
  get puedeVerGanancias() { return this.tienePerm('ver_ganancias'); }

  /**
   * Verifica si puede ver el dashboard completo
   */
  get puedeVerDashboard() { return this.tienePerm('ver_dashboard'); }

  /**
   * Verifica si puede gestionar productos
   */
  get puedeGestionarProductos() { return this.tienePerm('gestionar_productos'); }

  /**
   * Verifica si puede editar precios
   */
  get puedeEditarPrecios() { return this.tienePerm('editar_precios'); }

  // ════════════════════════════════════════════════════════════
  // PROTECCIÓN DE ELEMENTOS UI
  // ════════════════════════════════════════════════════════════

  /**
   * Oculta elementos de la UI según el rol
   * Busca atributos data-rol="Admin" o data-perm="ver_costos"
   */
  aplicarRestricciones() {
    // Ocultar elementos solo para Admin
    document.querySelectorAll('[data-rol="Admin"]').forEach(el => {
      el.style.display = this.esAdmin ? '' : 'none';
    });

    // Ocultar elementos solo para Vendedor
    document.querySelectorAll('[data-rol="Vendedor"]').forEach(el => {
      el.style.display = this.esVendedor ? '' : 'none';
    });

    // Ocultar por permiso específico
    document.querySelectorAll('[data-perm]').forEach(el => {
      const permiso = el.getAttribute('data-perm');
      el.style.display = this.tienePerm(permiso) ? '' : 'none';
    });

    // Deshabilitar inputs según rol
    document.querySelectorAll('[data-readonly-vendedor]').forEach(el => {
      if (this.esVendedor) {
        el.setAttribute('readonly', true);
        el.setAttribute('disabled', true);
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // BLOQUEO POR INTENTOS FALLIDOS
  // ════════════════════════════════════════════════════════════

  /**
   * Verifica si el sistema está bloqueado por intentos fallidos
   */
  estaBloquado() {
    const bloqueado = localStorage.getItem('cellcom_bloqueado');
    if (!bloqueado) return { bloqueado: false };

    const hasta = parseInt(bloqueado);
    const ahora = Date.now();

    if (ahora >= hasta) {
      localStorage.removeItem('cellcom_bloqueado');
      return { bloqueado: false };
    }

    const restante  = hasta - ahora;
    const minutos   = Math.floor(restante / 60000);
    const segundos  = Math.floor((restante % 60000) / 1000);

    return {
      bloqueado:  true,
      hasta,
      restanteMs: restante,
      texto:      `${minutos}:${String(segundos).padStart(2, '0')}`
    };
  }

  /**
   * Registra un intento fallido de login
   * @param {number} intentos - Intentos actuales
   */
  registrarIntentoFallido(intentos) {
    if (intentos >= APP_CONFIG.SESION.MAX_INTENTOS) {
      const hasta = Date.now() + (APP_CONFIG.SESION.BLOQUEO_MIN * 60 * 1000);
      localStorage.setItem('cellcom_bloqueado', hasta.toString());
      return { bloqueado: true, minutos: APP_CONFIG.SESION.BLOQUEO_MIN };
    }
    const restantes = APP_CONFIG.SESION.MAX_INTENTOS - intentos;
    return { bloqueado: false, restantes };
  }

  // ════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS
  // ════════════════════════════════════════════════════════════

  _cargarUsuarioLocal() {
    try {
      const u = localStorage.getItem(APP_CONFIG.STORAGE.USUARIO);
      return u ? JSON.parse(u) : null;
    } catch(e) { return null; }
  }

  _limpiarSesionLocal() {
    Object.values(APP_CONFIG.STORAGE).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  _getURLLogin() {
    return `${APP_CONFIG.URLS.BASE}login.html`;
  }

  _getPaginaDefault() {
    return this.esAdmin
      ? `${APP_CONFIG.URLS.BASE}reportes.html`
      : `${APP_CONFIG.URLS.BASE}pos.html`;
  }

  /**
   * Redirige a la página correcta según el rol
   */
  redirigirSegunRol() {
    window.location.href = this._getPaginaDefault();
  }

  /**
   * Retorna información de sesión para debugging
   */
  getInfoSesion() {
    const tiempo = localStorage.getItem(APP_CONFIG.STORAGE.LOGIN_TIME);
    const horasTransc = tiempo
      ? ((Date.now() - parseInt(tiempo)) / 3600000).toFixed(1)
      : 0;

    return {
      activo:       this.activo,
      usuario:      this.usuario?.nombre || '—',
      rol:          this.rol,
      esAdmin:      this.esAdmin,
      horasActivo:  horasTransc,
      expiraEn:     `${(APP_CONFIG.SESION.HORAS - horasTransc).toFixed(1)} horas`
    };
  }
}

// ════════════════════════════════════════════════════════════════
// INSTANCIA GLOBAL ÚNICA
// ════════════════════════════════════════════════════════════════

const AUTH = new CellComAuth();
window.AUTH = AUTH;

console.log('%c✅ Auth inicializado', 'color:#48BB78;font-weight:700;');
