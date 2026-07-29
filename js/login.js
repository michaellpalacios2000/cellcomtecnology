// ╔══════════════════════════════════════════════════════════════╗
// ║           CellCom Tecnology — Sistema POS v1.0              ║
// ║                    js/login.js                               ║
// ║    Lógica completa de la pantalla de Login                   ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ════════════════════════════════════════════════════════════════
// ESTADO LOCAL DEL LOGIN
// ════════════════════════════════════════════════════════════════

const LOGIN_STATE = {
  tabActiva:        'email',
  pinActual:        '',
  intentosFallidos: 0,
  procesando:       false,
  bloqueadoTimer:   null
};

// ════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  await inicializarLogin();
});

async function inicializarLogin() {
  // Verificar si ya hay sesión activa
  const sesion = AUTH.verificarSesionLocal();
  if (sesion) {
    mostrarBienvenida(sesion, true);
    setTimeout(() => AUTH.redirigirSegunRol(), 1500);
    return;
  }

  // Verificar si el sistema está bloqueado
  const bloqueo = AUTH.estaBloquado();
  if (bloqueo.bloqueado) {
    iniciarCountdownBloqueo(bloqueo.hasta);
    deshabilitarFormularios(true);
  }

  // Verificar conexión con el servidor
  await verificarConexion();

  // Configurar eventos de teclado
  configurarEventos();

  // Focus en el primer campo
  setTimeout(() => {
    document.getElementById('inputEmail')?.focus();
  }, 300);
}

// ════════════════════════════════════════════════════════════════
// VERIFICACIÓN DE CONEXIÓN
// ════════════════════════════════════════════════════════════════

async function verificarConexion() {
  actualizarStatus('conectando');
  try {
    const online = await API.ping();
    actualizarStatus(online ? 'online' : 'error');
    if (!online) {
      mostrarAlerta('⚠️ Sin conexión con el servidor. Verifica tu internet.', 'warning');
    }
  } catch(e) {
    actualizarStatus('error');
    mostrarAlerta('⚠️ No se pudo conectar con el servidor.', 'warning');
  }
}

function actualizarStatus(estado) {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (!dot || !text) return;

  const cfg = {
    conectando: { color: '#F6AD55', texto: 'Conectando con el servidor...', anim: 'pulseDot 1s ease-in-out infinite' },
    online:     { color: '#48BB78', texto: `✅ Sistema online — ${APP_CONFIG.APP_NAME}`, anim: 'pulseDot 2s ease-in-out infinite' },
    error:      { color: '#FC8181', texto: '❌ Sin conexión al servidor', anim: 'none' }
  };

  const c            = cfg[estado] || cfg.conectando;
  dot.style.background  = c.color;
  dot.style.animation   = c.anim;
  text.textContent       = c.texto;
}

// ════════════════════════════════════════════════════════════════
// TABS — CAMBIO DE MODO
// ════════════════════════════════════════════════════════════════

function cambiarTab(tab) {
  LOGIN_STATE.tabActiva = tab;
  ocultarAlerta();

  document.getElementById('tabEmail').classList.toggle('active', tab === 'email');
  document.getElementById('tabPIN').classList.toggle('active',   tab === 'pin');
  document.getElementById('panelEmail').classList.toggle('active', tab === 'email');
  document.getElementById('panelPIN').classList.toggle('active',   tab === 'pin');

  if (tab === 'pin') {
    resetearPIN();
  } else {
    setTimeout(() => document.getElementById('inputEmail')?.focus(), 100);
  }
}

// ════════════════════════════════════════════════════════════════
// LOGIN POR EMAIL
// ════════════════════════════════════════════════════════════════

async function hacerLogin() {
  if (LOGIN_STATE.procesando || AUTH.estaBloquado().bloqueado) return;

  const email = document.getElementById('inputEmail').value.trim();
  const pass  = document.getElementById('inputPass').value.trim();
  const emailEl = document.getElementById('inputEmail');
  const passEl  = document.getElementById('inputPass');

  // Limpiar errores
  emailEl.classList.remove('error');
  passEl.classList.remove('error');
  ocultarAlerta();

  // Validaciones
  if (!email) {
    mostrarAlerta('📧 Ingresa tu correo electrónico', 'error');
    emailEl.classList.add('error');
    emailEl.focus();
    animarError();
    return;
  }

  if (!CONFIG_UTILS.validarEmail(email)) {
    mostrarAlerta('📧 El formato del correo no es válido', 'error');
    emailEl.classList.add('error');
    emailEl.focus();
    animarError();
    return;
  }

  if (!pass) {
    mostrarAlerta('🔒 Ingresa tu contraseña', 'error');
    passEl.classList.add('error');
    passEl.focus();
    animarError();
    return;
  }

  if (pass.length < 6) {
    mostrarAlerta('🔒 La contraseña debe tener al menos 6 caracteres', 'error');
    passEl.classList.add('error');
    animarError();
    return;
  }

  // Iniciar proceso
  setLoadingEmail(true);

  try {
    const resultado = await AUTH.login(email, pass);

    if (resultado.success) {
      // ✅ Login exitoso
      emailEl.classList.add('success');
      passEl.classList.add('success');
      LOGIN_STATE.intentosFallidos = 0;
      mostrarBienvenida(resultado.usuario, false);
      setTimeout(() => AUTH.redirigirSegunRol(), 2200);
    } else {
      // ❌ Login fallido
      LOGIN_STATE.intentosFallidos++;
      const bloqueo = AUTH.registrarIntentoFallido(LOGIN_STATE.intentosFallidos);

      emailEl.classList.add('error');
      passEl.classList.add('error');
      passEl.value = '';

      if (bloqueo.bloqueado) {
        deshabilitarFormularios(true);
        iniciarCountdownBloqueo(Date.now() + (bloqueo.minutos * 60 * 1000));
        mostrarAlerta(`🚫 Demasiados intentos. Bloqueado por ${bloqueo.minutos} minutos.`, 'error');
      } else {
        mostrarAlerta(
          `❌ ${resultado.mensaje}${bloqueo.restantes <= 2 ? ` Te quedan ${bloqueo.restantes} intentos.` : ''}`,
          'error'
        );
      }

      animarError();
      passEl.focus();
    }

  } catch(e) {
    mostrarAlerta(`❌ ${e.message}`, 'error');
    animarError();
  } finally {
    setLoadingEmail(false);
  }
}

function setLoadingEmail(loading) {
  LOGIN_STATE.procesando = loading;
  const btn  = document.getElementById('btnLogin');
  const text = document.getElementById('btnLoginText');
  if (!btn || !text) return;

  btn.disabled = loading;
  if (loading) {
    text.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Verificando...`;
  } else {
    text.innerHTML = 'Ingresar al sistema';
  }
}

// ════════════════════════════════════════════════════════════════
// LOGIN POR PIN
// ════════════════════════════════════════════════════════════════

function presionarPIN(digito) {
  if (AUTH.estaBloquado().bloqueado) return;
  if (LOGIN_STATE.pinActual.length >= 4) return;
  if (navigator.vibrate) navigator.vibrate(25);

  LOGIN_STATE.pinActual += digito;
  actualizarDisplayPIN();

  if (LOGIN_STATE.pinActual.length === 4) {
    setTimeout(() => hacerLoginPIN(), 200);
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

    if (estado === 'error') {
      dot.classList.add('error');
    } else if (estado === 'success') {
      dot.classList.add('success', 'filled');
    } else {
      dot.classList.toggle('filled', i < LOGIN_STATE.pinActual.length);
    }
  }
}

function resetearPIN(estado = 'normal') {
  if (estado === 'error') {
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

  // Efecto visual de carga
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`pinDot${i}`);
    if (dot) dot.style.opacity = '0.5';
  }

  try {
    const resultado = await AUTH.loginPIN(LOGIN_STATE.pinActual);

    if (resultado.success) {
      // ✅ PIN correcto
      actualizarDisplayPIN('success');
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      await CONFIG_UTILS.esperar(400);
      mostrarBienvenida(resultado.usuario, false);
      setTimeout(() => AUTH.redirigirSegunRol(), 2200);
    } else {
      // ❌ PIN incorrecto
      LOGIN_STATE.intentosFallidos++;
      const bloqueo = AUTH.registrarIntentoFallido(LOGIN_STATE.intentosFallidos);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      resetearPIN('error');

      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById(`pinDot${i}`);
        if (dot) dot.style.opacity = '1';
      }

      if (bloqueo.bloqueado) {
        deshabilitarFormularios(true);
        iniciarCountdownBloqueo(Date.now() + (bloqueo.minutos * 60 * 1000));
        mostrarAlerta(`🚫 Bloqueado por ${bloqueo.minutos} minutos.`, 'error');
      } else {
        mostrarAlerta(
          `❌ ${resultado.mensaje}${bloqueo.restantes <= 2 ? ` Te quedan ${bloqueo.restantes} intentos.` : ''}`,
          'error'
        );
      }
    }

  } catch(e) {
    resetearPIN('error');
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`pinDot${i}`);
      if (dot) dot.style.opacity = '1';
    }
    mostrarAlerta(`❌ ${e.message}`, 'error');
  } finally {
    LOGIN_STATE.procesando = false;
  }
}

// ════════════════════════════════════════════════════════════════
// PANTALLA DE BIENVENIDA
// ════════════════════════════════════════════════════════════════

function mostrarBienvenida(usuario, esSesionExistente) {
  const wrapper = document.getElementById('loginWrapper');
  const welcome = document.getElementById('welcomeScreen');

  // Ocultar login con animación
  wrapper.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  wrapper.style.opacity    = '0';
  wrapper.style.transform  = 'scale(0.95)';

  setTimeout(() => {
    wrapper.style.display = 'none';
    welcome.style.display = 'block';

    const nombre  = usuario.nombre || 'Usuario';
    const rol     = usuario.rol    || 'Vendedor';
    const esAdmin = rol === 'Admin';

    document.getElementById('welcomeIcon').textContent  =
      esAdmin ? '👑' : '🛒';
    document.getElementById('welcomeTitle').textContent =
      esSesionExistente
        ? `¡Hola de nuevo, ${nombre.split(' ')[0]}!`
        : `¡Bienvenido/a, ${nombre.split(' ')[0]}!`;
    document.getElementById('welcomeSub').textContent   =
      esAdmin
        ? 'Cargando tu panel de administración...'
        : 'Cargando el punto de venta...';
    document.getElementById('welcomeRol').textContent   =
      esAdmin ? '👑 Administrador' : '🧑‍💼 Vendedor';

  }, 400);
}

// ════════════════════════════════════════════════════════════════
// BLOQUEO POR INTENTOS
// ════════════════════════════════════════════════════════════════

function iniciarCountdownBloqueo(hasta) {
  if (LOGIN_STATE.bloqueadoTimer) clearInterval(LOGIN_STATE.bloqueadoTimer);

  const tick = () => {
    const bloqueo = AUTH.estaBloquado();
    if (!bloqueo.bloqueado) {
      clearInterval(LOGIN_STATE.bloqueadoTimer);
      deshabilitarFormularios(false);
      ocultarAlerta();
      actualizarStatus('online');
      LOGIN_STATE.intentosFallidos = 0;
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
    btn.style.opacity = deshabilitar ? '0.4' : '1';
  });
}

// ════════════════════════════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════════════════════════════

function mostrarAlerta(mensaje, tipo = 'error') {
  const box = document.getElementById('alertBox');
  if (!box) return;

  const iconos = {
    error:   '❌',
    success: '✅',
    warning: '⚠️',
    info:    'ℹ️'
  };

  box.className    = `login-alert alert-${tipo}`;
  box.innerHTML    = `<span>${iconos[tipo] || '•'}</span> ${mensaje}`;
  box.style.display = 'flex';

  if (tipo === 'success' || tipo === 'info') {
    setTimeout(() => ocultarAlerta(), 5000);
  }
}

function ocultarAlerta() {
  const box = document.getElementById('alertBox');
  if (box) box.style.display = 'none';
}

function animarError() {
  const card = document.getElementById('loginCard');
  if (!card) return;
  card.style.animation = 'none';
  card.offsetHeight; // reflow
  card.style.animation = 'shake 0.4s ease';
  setTimeout(() => card.style.animation = '', 400);
}

function togglePass() {
  const input = document.getElementById('inputPass');
  const btn   = document.getElementById('btnTogglePass');
  if (!input || !btn) return;
  input.type      = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁️' : '🙈';
}

// ════════════════════════════════════════════════════════════════
// EVENTOS DE TECLADO
// ════════════════════════════════════════════════════════════════

function configurarEventos() {
  // Email → Enter pasa a contraseña
  document.getElementById('inputEmail')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('inputPass')?.focus();
    document.getElementById('inputEmail')?.classList.remove('error');
  });

  // Pass → Enter hace login
  document.getElementById('inputPass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') hacerLogin();
    document.getElementById('inputPass')?.classList.remove('error');
  });

  // Teclado físico para PIN
  document.addEventListener('keydown', e => {
    if (LOGIN_STATE.tabActiva !== 'pin') return;
    if (e.key >= '0' && e.key <= '9') presionarPIN(e.key);
    if (e.key === 'Backspace') borrarPIN();
  });

  // Cerrar alerta al hacer clic
  document.getElementById('alertBox')?.addEventListener('click', ocultarAlerta);
}


