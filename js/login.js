// ╔══════════════════════════════════════════════════════════════╗
// ║           CellCom Tecnology — Sistema POS v1.0              ║
// ║                    js/login.js                               ║
// ║    Lógica completa y definitiva de la pantalla Login         ║
// ║    Email + PIN + Sesión + Bloqueo + Animaciones Premium      ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ════════════════════════════════════════════════════════════════
// ESTADO GLOBAL DEL LOGIN
// ════════════════════════════════════════════════════════════════

const LOGIN_STATE = {
  tabActiva:        'email',
  pinActual:        '',
  intentosFallidos: 0,
  procesando:       false,
  bloqueadoTimer:   null,
  statusActual:     'conectando'
};

// ════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  await inicializarLogin();
});

async function inicializarLogin() {
  console.log('🚀 Inicializando CellCom Login...');

  // Verificar sesión existente
  try {
    const sesion = AUTH.verificarSesionLocal();
    if (sesion) {
      console.log('✅ Sesión activa encontrada:', sesion.nombre);
      mostrarBienvenida(sesion, true);
      setTimeout(() => redirigirSegunRol(sesion.rol), 1800);
      return;
    }
  } catch(e) {
    console.warn('⚠️ Error verificando sesión:', e.message);
  }

  // Verificar bloqueo activo
  try {
    const bloqueo = AUTH.estaBloquado();
    if (bloqueo.bloqueado) {
      deshabilitarFormularios(true);
      iniciarCountdownBloqueo();
    }
  } catch(e) {
    console.warn('⚠️ Error verificando bloqueo:', e.message);
  }

  // Cargar tema guardado
  cargarTema();

  // Configurar eventos de teclado
  configurarEventosTeclado();

  // Verificar conexión con el servidor
  await verificarConexion();

  // Focus en email
  setTimeout(() => {
    document.getElementById('inputEmail')?.focus();
  }, 400);
}

// ════════════════════════════════════════════════════════════════
// TEMA OSCURO / CLARO
// ════════════════════════════════════════════════════════════════

function cargarTema() {
  const tema = localStorage.getItem('cellcom_tema') || 'light';
  document.documentElement.setAttribute('data-theme', tema);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = tema === 'dark' ? '☀️' : '🌙';
}

function toggleTema() {
  const actual = document.documentElement.getAttribute('data-theme') || 'light';
  const nuevo  = actual === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nuevo);
  localStorage.setItem('cellcom_tema', nuevo);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent  = nuevo === 'dark' ? '☀️' : '🌙';
    btn.style.transform = 'rotate(360deg) scale(1.2)';
    setTimeout(() => btn.style.transform = '', 300);
  }
}

// ════════════════════════════════════════════════════════════════
// VERIFICACIÓN DE CONEXIÓN
// ════════════════════════════════════════════════════════════════

async function verificarConexion() {
  actualizarStatus('conectando');

  try {
    const online = await API.ping();

    if (online) {
      actualizarStatus('online');
      console.log('✅ Servidor online');
    } else {
      actualizarStatus('error');
      mostrarAlerta(
        'Sin conexión con el servidor. Verifica tu internet.',
        'warning'
      );
    }
  } catch(e) {
    actualizarStatus('error');
    console.warn('⚠️ Sin conexión:', e.message);
    mostrarAlerta(
      'No se pudo conectar con el servidor. Intenta nuevamente.',
      'warning'
    );
  }
}

function actualizarStatus(estado) {
  LOGIN_STATE.statusActual = estado;
  const dot  = document.getElementById('statusDot');
  const ring = document.getElementById('statusRing');
  const text = document.getElementById('statusText');
  if (!dot || !text) return;

  const cfg = {
    conectando: {
      color: '#F6AD55',
      texto: 'Conectando con el servidor...',
      anim:  'pulseDot 1s ease-in-out infinite'
    },
    online: {
      color: '#48BB78',
      texto: `✅ Sistema online — ${APP_CONFIG.APP_NAME}`,
      anim:  'pulseDot 2.5s ease-in-out infinite'
    },
    error: {
      color: '#FC8181',
      texto: '❌ Sin conexión al servidor',
      anim:  'none'
    }
  };

  const c = cfg[estado] || cfg.conectando;
  dot.style.background    = c.color;
  dot.style.animation     = c.anim;
  if (ring) ring.style.background = c.color;
  text.textContent         = c.texto;
  text.style.color         = estado === 'online'
    ? '#48BB78'
    : estado === 'error'
    ? '#FC8181'
    : '#A0AEC0';
}

// ════════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════════

function cambiarTab(tab) {
  if (LOGIN_STATE.tabActiva === tab) return;
  LOGIN_STATE.tabActiva = tab;
  ocultarAlerta();

  // Actualizar botones de tab
  document.getElementById('tabEmail')
    ?.classList.toggle('active', tab === 'email');
  document.getElementById('tabPIN')
    ?.classList.toggle('active', tab === 'pin');

  // Mostrar panel correcto
  document.getElementById('panelEmail')
    ?.classList.toggle('active', tab === 'email');
  document.getElementById('panelPIN')
    ?.classList.toggle('active', tab === 'pin');

  if (tab === 'pin') {
    resetearPIN();
  } else {
    setTimeout(() => document.getElementById('inputEmail')?.focus(), 150);
  }
}

// ════════════════════════════════════════════════════════════════
// LOGIN POR EMAIL Y CONTRASEÑA
// ════════════════════════════════════════════════════════════════

async function hacerLogin() {
  // Verificar bloqueo
  if (AUTH.estaBloquado().bloqueado) return;
  if (LOGIN_STATE.procesando) return;

  const emailEl = document.getElementById('inputEmail');
  const passEl  = document.getElementById('inputPass');
  const email   = emailEl?.value.trim()  || '';
  const pass    = passEl?.value.trim()   || '';

  // Limpiar errores previos
  emailEl?.classList.remove('error', 'success');
  passEl?.classList.remove('error', 'success');
  ocultarAlerta();

  // ── Validaciones ──────────────────────────────────────────
  if (!email) {
    mostrarAlerta('📧 Ingresa tu correo electrónico', 'error');
    emailEl?.classList.add('error');
    emailEl?.focus();
    animarCardError();
    return;
  }

  if (!CONFIG_UTILS.validarEmail(email)) {
    mostrarAlerta('📧 El formato del correo no es válido', 'error');
    emailEl?.classList.add('error');
    emailEl?.focus();
    animarCardError();
    return;
  }

  if (!pass) {
    mostrarAlerta('🔒 Ingresa tu contraseña', 'error');
    passEl?.classList.add('error');
    passEl?.focus();
    animarCardError();
    return;
  }

  if (pass.length < 6) {
    mostrarAlerta('🔒 La contraseña debe tener al menos 6 caracteres', 'error');
    passEl?.classList.add('error');
    animarCardError();
    return;
  }

  // ── Iniciar proceso ───────────────────────────────────────
  setLoadingEmail(true);

  try {
    console.log('🔐 Intentando login:', email);
    const resultado = await AUTH.login(email, pass);

    if (resultado.success) {
      // ✅ LOGIN EXITOSO
      console.log('✅ Login exitoso:', resultado.usuario?.nombre);
      emailEl?.classList.add('success');
      passEl?.classList.add('success');
      LOGIN_STATE.intentosFallidos = 0;
      mostrarBienvenida(resultado.usuario, false);
      setTimeout(() => redirigirSegunRol(resultado.usuario?.rol), 2400);

    } else {
      // ❌ LOGIN FALLIDO
      console.warn('❌ Login fallido:', resultado.mensaje);
      LOGIN_STATE.intentosFallidos++;
      const bloqueoInfo = AUTH.registrarIntentoFallido(LOGIN_STATE.intentosFallidos);

      emailEl?.classList.add('error');
      passEl?.classList.add('error');
      if (passEl) passEl.value = '';

      if (bloqueoInfo.bloqueado) {
        deshabilitarFormularios(true);
        iniciarCountdownBloqueo();
        mostrarAlerta(
          `🚫 Demasiados intentos fallidos. Sistema bloqueado por ${bloqueoInfo.minutos} minutos.`,
          'error'
        );
      } else {
        const aviso = bloqueoInfo.restantes <= 2
          ? ` ⚠️ Te quedan ${bloqueoInfo.restantes} intento${bloqueoInfo.restantes !== 1 ? 's' : ''}.`
          : '';
        mostrarAlerta(
          `${resultado.mensaje || 'Credenciales incorrectas.'}${aviso}`,
          'error'
        );
      }

      animarCardError();
      passEl?.focus();
    }

  } catch(e) {
    console.error('❌ Error en login:', e.message);
    mostrarAlerta(
      `Error de conexión: ${e.message}. Verifica tu internet.`,
      'error'
    );
    animarCardError();
  } finally {
    setLoadingEmail(false);
  }
}

function setLoadingEmail(loading) {
  LOGIN_STATE.procesando = loading;
  const btn  = document.getElementById('btnLogin');
  const text = document.getElementById('btnLoginText');
  const icon = btn?.querySelector('.btn-login-icon');

  if (!btn || !text) return;

  btn.disabled = loading;

  if (loading) {
    text.innerHTML = `<div style="width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></div> Verificando...`;
    if (icon) icon.style.display = 'none';
  } else {
    text.innerHTML = 'Ingresar al sistema';
    if (icon) icon.style.display = '';
  }
}

// ════════════════════════════════════════════════════════════════
// LOGIN POR PIN
// ════════════════════════════════════════════════════════════════

function presionarPIN(digito) {
  if (AUTH.estaBloquado().bloqueado) return;
  if (LOGIN_STATE.pinActual.length >= 4) return;
  if (LOGIN_STATE.procesando) return;

  // Vibración táctil
  if (navigator.vibrate) navigator.vibrate(25);

  LOGIN_STATE.pinActual += digito;
  actualizarDisplayPIN();

  // Auto-login al completar
  if (LOGIN_STATE.pinActual.length === 4) {
    setTimeout(() => hacerLoginPIN(), 220);
  }
}

function borrarPIN() {
  if (LOGIN_STATE.pinActual.length === 0) return;
  if (navigator.vibrate) navigator.vibrate(15);
  LOGIN_STATE.pinActual = LOGIN_STATE.pinActual.slice(0, -1);
  actualizarDisplayPIN();
}

function actualizarDisplayPIN(estado = 'normal') {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`pinDot${i}`);
    if (!dot) continue;

    dot.classList.remove('filled', 'error', 'success');

    switch(estado) {
      case 'error':
        dot.classList.add('error');
        break;
      case 'success':
        dot.classList.add('success', 'filled');
        break;
      default:
        if (i < LOGIN_STATE.pinActual.length) {
          dot.classList.add('filled');
        }
    }
  }
}

function resetearPIN(estado = 'normal') {
  if (estado === 'error') {
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    actualizarDisplayPIN('error');
    setTimeout(() => {
      LOGIN_STATE.pinActual = '';
      actualizarDisplayPIN('normal');
    }, 700);
  } else {
    LOGIN_STATE.pinActual = '';
    actualizarDisplayPIN('normal');
  }
}

async function hacerLoginPIN() {
  if (LOGIN_STATE.procesando) return;
  if (AUTH.estaBloquado().bloqueado) return;

  LOGIN_STATE.procesando = true;
  ocultarAlerta();

  // Efecto visual de procesando
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`pinDot${i}`);
    if (dot) dot.style.opacity = '0.5';
  }

  try {
    console.log('🔢 Verificando PIN...');
    const resultado = await AUTH.loginPIN(LOGIN_STATE.pinActual);

    if (resultado.success) {
      // ✅ PIN CORRECTO
      console.log('✅ PIN correcto:', resultado.usuario?.nombre);
      if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
      actualizarDisplayPIN('success');

      // Restaurar opacidad
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById(`pinDot${i}`);
        if (dot) dot.style.opacity = '1';
      }

      await new Promise(r => setTimeout(r, 500));
      mostrarBienvenida(resultado.usuario, false);
      setTimeout(() => redirigirSegunRol(resultado.usuario?.rol), 2400);

    } else {
      // ❌ PIN INCORRECTO
      console.warn('❌ PIN incorrecto');
      LOGIN_STATE.intentosFallidos++;
      const bloqueoInfo = AUTH.registrarIntentoFallido(LOGIN_STATE.intentosFallidos);

      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById(`pinDot${i}`);
        if (dot) dot.style.opacity = '1';
      }

      resetearPIN('error');

      if (bloqueoInfo.bloqueado) {
        deshabilitarFormularios(true);
        iniciarCountdownBloqueo();
        mostrarAlerta(
          `🚫 Bloqueado por ${bloqueoInfo.minutos} minutos.`,
          'error'
        );
      } else {
        const aviso = bloqueoInfo.restantes <= 2
          ? ` ⚠️ Te quedan ${bloqueoInfo.restantes} intento${bloqueoInfo.restantes !== 1 ? 's' : ''}.`
          : '';
        mostrarAlerta(
          `${resultado.mensaje || 'PIN incorrecto.'}${aviso}`,
          'error'
        );
      }
    }

  } catch(e) {
    console.error('❌ Error con PIN:', e.message);
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`pinDot${i}`);
      if (dot) dot.style.opacity = '1';
    }
    resetearPIN('error');
    mostrarAlerta(`Error: ${e.message}`, 'error');
  } finally {
    LOGIN_STATE.procesando = false;
  }
}

// ════════════════════════════════════════════════════════════════
// REDIRECCIÓN
// ════════════════════════════════════════════════════════════════

function redirigirSegunRol(rol) {
  const base = APP_CONFIG.URLS.BASE;
  const pagina = rol === 'Admin'
    ? `${base}reportes.html`
    : `${base}pos.html`;

  console.log(`🚀 Redirigiendo a: ${pagina}`);
  window.location.href = pagina;
}

// ════════════════════════════════════════════════════════════════
// PANTALLA DE BIENVENIDA
// ════════════════════════════════════════════════════════════════

function mostrarBienvenida(usuario, esSesionExistente) {
  const wrapper = document.getElementById('loginWrapper');
  const welcome = document.getElementById('welcomeScreen');
  if (!wrapper || !welcome) return;

  // Ocultar login
  wrapper.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
  wrapper.style.opacity    = '0';
  wrapper.style.transform  = 'scale(0.94) translateY(-10px)';

  setTimeout(() => {
    wrapper.style.display   = 'none';
    welcome.style.display   = 'block';

    const nombre  = usuario?.nombre || 'Usuario';
    const rol     = usuario?.rol    || 'Vendedor';
    const esAdmin = rol === 'Admin';

    const iconEl  = document.getElementById('welcomeIcon');
    const titleEl = document.getElementById('welcomeTitle');
    const subEl   = document.getElementById('welcomeSub');
    const rolEl   = document.getElementById('welcomeRol');

    if (iconEl)  iconEl.textContent  = esAdmin ? '👑' : '🛒';
    if (titleEl) titleEl.textContent = esSesionExistente
      ? `¡Hola de nuevo, ${nombre.split(' ')[0]}!`
      : `¡Bienvenido/a, ${nombre.split(' ')[0]}!`;
    if (subEl)   subEl.textContent   = esAdmin
      ? 'Preparando tu panel de administración...'
      : 'Cargando el punto de venta...';
    if (rolEl)   rolEl.textContent   = esAdmin
      ? '👑 Administrador'
      : '🧑‍💼 Vendedor';

  }, 450);
}

// ════════════════════════════════════════════════════════════════
// BLOQUEO POR INTENTOS FALLIDOS
// ════════════════════════════════════════════════════════════════

function iniciarCountdownBloqueo() {
  if (LOGIN_STATE.bloqueadoTimer) {
    clearInterval(LOGIN_STATE.bloqueadoTimer);
  }

  const tick = () => {
    const bloqueo = AUTH.estaBloquado();

    if (!bloqueo.bloqueado) {
      clearInterval(LOGIN_STATE.bloqueadoTimer);
      LOGIN_STATE.bloqueadoTimer   = null;
      LOGIN_STATE.intentosFallidos = 0;
      deshabilitarFormularios(false);
      ocultarAlerta();
      actualizarStatus(LOGIN_STATE.statusActual === 'online' ? 'online' : 'error');
      return;
    }

    mostrarAlerta(
      `🚫 Sistema bloqueado. Espera ${bloqueo.texto} para reintentar.`,
      'error'
    );
  };

  tick();
  LOGIN_STATE.bloqueadoTimer = setInterval(tick, 1000);
}

function deshabilitarFormularios(deshabilitar) {
  const ids = ['inputEmail', 'inputPass', 'btnLogin'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = deshabilitar;
  });

  document.querySelectorAll('.pin-key').forEach(btn => {
    btn.disabled      = deshabilitar;
    btn.style.opacity = deshabilitar ? '0.35' : '1';
  });
}

// ════════════════════════════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════════════════════════════

function mostrarAlerta(mensaje, tipo = 'error') {
  const box     = document.getElementById('alertBox');
  const iconEl  = document.getElementById('alertIcon');
  const msgEl   = document.getElementById('alertMsg');
  if (!box) return;

  const iconos = {
    error:   '❌',
    success: '✅',
    warning: '⚠️',
    info:    'ℹ️'
  };

  box.className        = `login-alert alert-${tipo}`;
  if (iconEl) iconEl.textContent = iconos[tipo] || '•';
  if (msgEl)  msgEl.textContent  = mensaje;
  box.style.display    = 'flex';

  // Auto-ocultar solo mensajes info/success
  if (tipo === 'success' || tipo === 'info') {
    setTimeout(() => ocultarAlerta(), 4000);
  }
}

function ocultarAlerta() {
  const box = document.getElementById('alertBox');
  if (box) {
    box.style.opacity  = '0';
    box.style.transform= 'translateY(-4px)';
    setTimeout(() => {
      box.style.display    = 'none';
      box.style.opacity    = '';
      box.style.transform  = '';
    }, 200);
  }
}

function animarCardError() {
  const card = document.getElementById('loginCard');
  if (!card) return;
  card.style.animation = 'none';
  void card.offsetWidth; // Forzar reflow
  card.style.animation = 'shake 0.45s ease';
  setTimeout(() => card.style.animation = '', 500);
}

function togglePass() {
  const input = document.getElementById('inputPass');
  const btn   = document.getElementById('btnTogglePass');
  if (!input || !btn) return;

  const esPassword    = input.type === 'password';
  input.type          = esPassword ? 'text' : 'password';
  btn.textContent     = esPassword ? '🙈' : '👁️';
  btn.style.transform = 'scale(1.2)';
  setTimeout(() => btn.style.transform = '', 200);
}

// ════════════════════════════════════════════════════════════════
// EVENTOS DE TECLADO
// ════════════════════════════════════════════════════════════════

function configurarEventosTeclado() {
  // Email → Tab/Enter pasa a contraseña
  document.getElementById('inputEmail')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      document.getElementById('inputPass')?.focus();
    }
    document.getElementById('inputEmail')?.classList.remove('error');
  });

  // Pass → Enter hace login
  document.getElementById('inputPass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      hacerLogin();
    }
    document.getElementById('inputPass')?.classList.remove('error');
  });

  // Teclado físico para PIN
  document.addEventListener('keydown', e => {
    if (LOGIN_STATE.tabActiva !== 'pin') return;
    if (e.key >= '0' && e.key <= '9') presionarPIN(e.key);
    if (e.key === 'Backspace') borrarPIN();
    if (e.key === 'Escape') resetearPIN();
  });

  // Cerrar alerta con clic
  document.getElementById('alertBox')?.addEventListener('click', ocultarAlerta);
}

