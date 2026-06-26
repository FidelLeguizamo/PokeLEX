const URL_API = 'https://pokeapi.co/api/v2/pokemon/';
const CANTIDAD_POR_PAGINA = 10;
const MAXIMO_EQUIPO = 6;

const coloresPorTipo = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

const entradaNombre = document.getElementById('inputName');
const botonBuscar = document.getElementById('btnSearch');
const botonLimpiar = document.getElementById('btnClear');
const botonReintentar = document.getElementById('btnRetry');
const mensajeError = document.getElementById('errorMsg');
const barraEstado = document.getElementById('statsBar');
const cargando = document.getElementById('loader');
const estadoVacio = document.getElementById('stateEmpty');
const estadoError = document.getElementById('stateError');
const textoVacio = document.getElementById('emptyMsg');
const detalleError = document.getElementById('errorDetail');
const grilla = document.getElementById('grid');
const paginacion = document.getElementById('pagination');
const pestañaEquipo = document.getElementById('tabTeam');
const pestañaFavoritos = document.getElementById('tabFavorites');
const panelEquipo = document.getElementById('teamPanel');
const panelFavoritos = document.getElementById('favoritesPanel');
const listaEquipo = document.getElementById('teamList');
const listaFavoritos = document.getElementById('favoriteList');
const contadorEquipo = document.getElementById('teamCount');
const contadorFavoritos = document.getElementById('favoriteCount');
const pagina = document.body.dataset.pagina || 'inicio';

let listaCompleta = [];
let listaActual = [];
let textoBuscado = '';
let paginaActual = 1;
let favoritos = cargarGuardados('pokelexFavoritos');
let equipo = cargarGuardados('pokelexEquipo');

function cargarGuardados(clave) {
  try {
    const guardados = JSON.parse(localStorage.getItem(clave));
    const claveVieja = clave === 'pokelexFavoritos' ? 'pokelexFavorites' : 'pokelexTeam';
    const guardadosViejos = JSON.parse(localStorage.getItem(claveVieja));
    return guardados || normalizarGuardados(guardadosViejos) || [];
  } catch {
    return [];
  }
}

function normalizarGuardados(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(pokemon => ({
    id: pokemon.id,
    nombre: pokemon.nombre || pokemon.name,
    imagen: pokemon.imagen || pokemon.image || '',
  }));
}

function guardarListas() {
  localStorage.setItem('pokelexFavoritos', JSON.stringify(favoritos));
  localStorage.setItem('pokelexEquipo', JSON.stringify(equipo));
}

function mostrarCarga(estaCargando) {
  cargando?.classList.toggle('show', estaCargando);
  if (botonBuscar) botonBuscar.disabled = estaCargando;
  if (botonLimpiar) botonLimpiar.disabled = estaCargando;
}

function mostrarEstado(tipo, texto = '') {
  estadoVacio?.classList.remove('show');
  estadoError?.classList.remove('show');

  if (tipo === 'vacio') {
    textoVacio.textContent = texto;
    estadoVacio.classList.add('show');
  }

  if (tipo === 'error') {
    detalleError.textContent = texto;
    estadoError.classList.add('show');
  }
}

function escribirEstado(texto) {
  if (barraEstado) barraEstado.innerHTML = texto;
}

function mostrarPaginacion(mostrar) {
  paginacion?.classList.toggle('show', mostrar);
}

function limpiarError() {
  mensajeError?.classList.remove('show');
  entradaNombre?.classList.remove('error');
}

function marcarError(texto) {
  if (!mensajeError || !entradaNombre) return;
  mensajeError.textContent = texto;
  mensajeError.classList.add('show');
  entradaNombre.classList.add('error');
}

function validarNombre(valor) {
  const nombre = valor.trim();

  if (!nombre) return 'El nombre no puede estar vacio.';
  if (nombre.length < 2) return 'Ingresa al menos 2 caracteres.';
  if (/[^a-zA-Z0-9-]/.test(nombre)) return 'Solo letras, numeros y guiones.';

  return null;
}

async function pedirPokemon(nombre) {
  const respuesta = await fetch(`${URL_API}${nombre.toLowerCase().trim()}`);

  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${nombre}.`);
  }

  return await respuesta.json();
}

async function pedirListaCompleta() {
  const respuesta = await fetch(`${URL_API}?limit=100000&offset=0`);

  if (!respuesta.ok) {
    throw new Error('No se pudo cargar la lista de Pokemon.');
  }

  const datos = await respuesta.json();
  return datos.results;
}

function resumirPokemon(pokemon) {
  return {
    id: pokemon.id,
    nombre: pokemon.name,
    imagen: pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default || '',
  };
}

function estaEnFavoritos(id) {
  return favoritos.some(pokemon => pokemon.id === id);
}

function estaEnEquipo(id) {
  return equipo.some(pokemon => pokemon.id === id);
}

function cambiarFavorito(pokemon) {
  const resumen = resumirPokemon(pokemon);

  if (estaEnFavoritos(resumen.id)) {
    favoritos = favoritos.filter(item => item.id !== resumen.id);
  } else {
    favoritos.push(resumen);
  }

  guardarListas();
  dibujarPanel();
  actualizarTarjeta(resumen.id);
  if (pagina === 'favoritos') cargarColeccion('favoritos');
}

function cambiarEquipo(pokemon) {
  const resumen = resumirPokemon(pokemon);

  if (estaEnEquipo(resumen.id)) {
    equipo = equipo.filter(item => item.id !== resumen.id);
  } else if (equipo.length < MAXIMO_EQUIPO) {
    equipo.push(resumen);
  } else {
    marcarError('Tu equipo ya tiene 6 Pokemon.');
    return;
  }

  guardarListas();
  dibujarPanel();
  actualizarTarjeta(resumen.id);
  if (pagina === 'equipo') cargarColeccion('equipo');
}

function actualizarTarjeta(id) {
  const tarjeta = grilla.querySelector(`[data-id="${id}"]`);
  if (!tarjeta) return;

  const botonFavorito = tarjeta.querySelector('.favorite-toggle');
  const botonEquipo = tarjeta.querySelector('.team-toggle');
  const esFavorito = estaEnFavoritos(id);
  const esEquipo = estaEnEquipo(id);

  botonFavorito.classList.toggle('selected', esFavorito);
  botonFavorito.setAttribute('aria-pressed', String(esFavorito));
  botonEquipo.classList.toggle('selected', esEquipo);
  botonEquipo.textContent = esEquipo ? 'Quitar del equipo' : 'Agregar al equipo';
}

function crearTarjeta(pokemon) {
  const tipos = pokemon.types.map(item => item.type.name);
  const colorPrincipal = coloresPorTipo[tipos[0]] || '#A8A878';
  const imagen = pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default || '';
  const vida = pokemon.stats.find(item => item.stat.name === 'hp')?.base_stat ?? '-';
  const ataque = pokemon.stats.find(item => item.stat.name === 'attack')?.base_stat ?? '-';
  const altura = `${(pokemon.height / 10).toFixed(1)} m`;
  const peso = `${(pokemon.weight / 10).toFixed(1)} kg`;
  const numero = String(pokemon.id).padStart(4, '0');
  const esFavorito = estaEnFavoritos(pokemon.id);
  const esEquipo = estaEnEquipo(pokemon.id);
  const etiquetas = tipos.map(tipo => `<span class="type-badge" style="background:${coloresPorTipo[tipo] || '#aaa'}">${tipo}</span>`).join('');
  const tarjeta = document.createElement('article');

  tarjeta.className = 'card';
  tarjeta.dataset.id = pokemon.id;
  tarjeta.innerHTML = `
    <div class="card-img">
      <span class="card-num">#${numero}</span>
      <button class="favorite-toggle ${esFavorito ? 'selected' : ''}" type="button" aria-label="Agregar a favoritos" aria-pressed="${esFavorito}"></button>
      ${imagen ? `<img src="${imagen}" alt="${pokemon.name}" loading="lazy">` : ''}
    </div>
    <div class="card-body">
      <div class="card-name">${pokemon.name}</div>
      <div class="types">${etiquetas}</div>
      <div class="card-actions">
        <button class="team-toggle ${esEquipo ? 'selected' : ''}" type="button">${esEquipo ? 'Quitar del equipo' : 'Agregar al equipo'}</button>
        <button class="details-toggle" type="button">Ver detalles</button>
      </div>
      <div class="stats-mini">
        <div class="stat-item"><span class="stat-label">Vida</span><span class="stat-val">${vida}</span></div>
        <div class="stat-item"><span class="stat-label">Ataque</span><span class="stat-val">${ataque}</span></div>
        <div class="stat-item"><span class="stat-label">Altura</span><span class="stat-val">${altura}</span></div>
        <div class="stat-item"><span class="stat-label">Peso</span><span class="stat-val">${peso}</span></div>
      </div>
    </div>
  `;

  tarjeta.addEventListener('mouseenter', () => {
    tarjeta.style.borderColor = colorPrincipal;
    tarjeta.style.boxShadow = `0 12px 32px rgba(0,0,0,.5), 0 0 0 1px ${colorPrincipal}55`;
  });

  tarjeta.addEventListener('mouseleave', () => {
    tarjeta.style.borderColor = '';
    tarjeta.style.boxShadow = '';
  });

  tarjeta.querySelector('.favorite-toggle').addEventListener('click', evento => {
    evento.stopPropagation();
    cambiarFavorito(pokemon);
  });

  tarjeta.querySelector('.team-toggle').addEventListener('click', evento => {
    evento.stopPropagation();
    cambiarEquipo(pokemon);
  });

  tarjeta.querySelector('.details-toggle').addEventListener('click', evento => {
    evento.stopPropagation();
    const abierta = tarjeta.classList.toggle('expanded');
    evento.currentTarget.textContent = abierta ? 'Ocultar detalles' : 'Ver detalles';
  });

  return tarjeta;
}

function dibujarTarjetas(lista) {
  grilla.innerHTML = '';
  lista.forEach(pokemon => grilla.appendChild(crearTarjeta(pokemon)));
}

function dibujarPanel() {
  if (contadorEquipo) contadorEquipo.textContent = `${equipo.length}/6`;
  if (contadorFavoritos) contadorFavoritos.textContent = favoritos.length;
  if (listaEquipo) dibujarListaChica(listaEquipo, equipo, 'Todavia no agregaste Pokemon a tu equipo.', 'equipo');
  if (listaFavoritos) dibujarListaChica(listaFavoritos, favoritos, 'Todavia no marcaste favoritos.', 'favoritos');
}

function dibujarListaChica(contenedor, lista, textoVacioLista, tipo) {
  contenedor.innerHTML = '';

  if (lista.length === 0) {
    const texto = document.createElement('p');
    texto.className = 'mini-empty';
    texto.textContent = textoVacioLista;
    contenedor.appendChild(texto);
    return;
  }

  lista.forEach(pokemon => {
    const item = document.createElement('article');
    item.className = 'mini-card';
    item.innerHTML = `
      ${pokemon.imagen ? `<img src="${pokemon.imagen}" alt="${pokemon.nombre}" loading="lazy">` : ''}
      <div>
        <strong>${pokemon.nombre}</strong>
        <span>#${String(pokemon.id).padStart(4, '0')}</span>
      </div>
      <button type="button" aria-label="Quitar ${pokemon.nombre}">x</button>
    `;

    item.querySelector('button').addEventListener('click', () => {
      if (tipo === 'equipo') {
        equipo = equipo.filter(itemEquipo => itemEquipo.id !== pokemon.id);
      } else {
        favoritos = favoritos.filter(itemFavorito => itemFavorito.id !== pokemon.id);
      }

      guardarListas();
      dibujarPanel();
      actualizarTarjeta(pokemon.id);
      if (pagina === 'equipo' || pagina === 'favoritos') cargarColeccion(pagina);
    });

    contenedor.appendChild(item);
  });
}

function mostrarPanel(nombrePanel) {
  if (!pestañaEquipo || !pestañaFavoritos || !panelEquipo || !panelFavoritos) return;
  const mostrarEquipo = nombrePanel === 'equipo';

  pestañaEquipo.classList.toggle('active', mostrarEquipo);
  pestañaFavoritos.classList.toggle('active', !mostrarEquipo);
  panelEquipo.classList.toggle('active', mostrarEquipo);
  panelFavoritos.classList.toggle('active', !mostrarEquipo);
}

async function cargarColeccion(tipo) {
  const lista = tipo === 'equipo' ? equipo : favoritos;
  const texto = tipo === 'equipo' ? 'Tu equipo esta vacio. Agrega Pokemon desde la Pokedex.' : 'Todavia no marcaste Pokemon favoritos.';

  mostrarCarga(true);
  mostrarEstado('');
  grilla.innerHTML = '';
  escribirEstado('');

  try {
    if (lista.length === 0) {
      mostrarEstado('vacio', texto);
      return;
    }

    const pokemones = [];
    for (const item of lista) {
      const pokemon = await pedirPokemon(item.nombre);
      pokemones.push(pokemon);
    }

    dibujarTarjetas(pokemones);
    escribirEstado(`<b>${pokemones.length}</b> Pokemon en ${tipo === 'equipo' ? 'tu equipo' : 'favoritos'}.`);
  } catch (error) {
    mostrarEstado('error', error.message || 'No se pudo cargar la pagina.');
  } finally {
    mostrarCarga(false);
  }
}

function crearBotonPagina(numero) {
  const boton = document.createElement('button');

  boton.className = numero === paginaActual ? 'page-btn active' : 'page-btn';
  boton.textContent = numero;
  boton.disabled = numero === paginaActual;
  boton.addEventListener('click', () => cargarPagina(numero));

  return boton;
}

function crearSeparador() {
  const separador = document.createElement('span');
  separador.className = 'page-separator';
  separador.textContent = '->';
  return separador;
}

function dibujarPaginacion() {
  const totalPaginas = Math.ceil(listaActual.length / CANTIDAD_POR_PAGINA);
  paginacion.innerHTML = '';

  if (totalPaginas <= 1) {
    mostrarPaginacion(false);
    return;
  }

  const botonAnterior = document.createElement('button');
  botonAnterior.className = 'page-btn';
  botonAnterior.textContent = '<';
  botonAnterior.disabled = paginaActual === 1;
  botonAnterior.addEventListener('click', () => cargarPagina(paginaActual - 1));
  paginacion.appendChild(botonAnterior);

  const inicio = Math.max(1, paginaActual - 1);
  const fin = Math.min(totalPaginas, paginaActual + 1);

  if (inicio > 1) {
    paginacion.appendChild(crearBotonPagina(1));
    paginacion.appendChild(crearSeparador());
  }

  for (let numero = inicio; numero <= fin; numero++) {
    paginacion.appendChild(crearBotonPagina(numero));
  }

  if (fin < totalPaginas) {
    paginacion.appendChild(crearSeparador());
    paginacion.appendChild(crearBotonPagina(totalPaginas));
  }

  const botonSiguiente = document.createElement('button');
  botonSiguiente.className = 'page-btn';
  botonSiguiente.textContent = '>';
  botonSiguiente.disabled = paginaActual === totalPaginas;
  botonSiguiente.addEventListener('click', () => cargarPagina(paginaActual + 1));
  paginacion.appendChild(botonSiguiente);

  mostrarPaginacion(true);
}

async function cargarPagina(numero) {
  paginaActual = numero;
  mostrarCarga(true);
  mostrarEstado('');
  grilla.innerHTML = '';
  escribirEstado('');

  try {
    if (listaCompleta.length === 0) {
      listaCompleta = await pedirListaCompleta();
    }

    if (listaActual.length === 0) {
      listaActual = listaCompleta;
    }

    const inicio = (paginaActual - 1) * CANTIDAD_POR_PAGINA;
    const parte = listaActual.slice(inicio, inicio + CANTIDAD_POR_PAGINA);
    const pokemones = [];

    for (const item of parte) {
      const pokemon = await pedirPokemon(item.name);
      pokemones.push(pokemon);
    }

    dibujarTarjetas(pokemones);
    dibujarPaginacion();

    const totalPaginas = Math.ceil(listaActual.length / CANTIDAD_POR_PAGINA);
    if (textoBuscado) {
      escribirEstado(`Pagina <b>${paginaActual}</b> de <b>${totalPaginas}</b> - <b>${listaActual.length}</b> resultados para "<b>${textoBuscado}</b>"`);
    } else {
      escribirEstado(`Pagina <b>${paginaActual}</b> de <b>${totalPaginas}</b> - Mostrando <b>${pokemones.length}</b> Pokemon de <b>${listaActual.length}</b>`);
    }
  } catch (error) {
    mostrarPaginacion(false);
    mostrarEstado('error', error.message || 'No se pudo cargar la informacion.');
  } finally {
    mostrarCarga(false);
  }
}

async function cargarInicio() {
  mostrarCarga(true);
  mostrarEstado('');
  grilla.innerHTML = '';
  escribirEstado('');
  mostrarPaginacion(false);

  try {
    listaCompleta = await pedirListaCompleta();
    listaActual = listaCompleta;
    textoBuscado = '';

    if (listaActual.length === 0) {
      mostrarEstado('vacio', 'No se cargaron Pokemon.');
      return;
    }

    await cargarPagina(1);
  } catch (error) {
    mostrarEstado('error', error.message || 'No se pudo conectar con PokeAPI.');
  } finally {
    mostrarCarga(false);
  }
}

async function buscarPorNombre(texto) {
  mostrarCarga(true);
  mostrarEstado('');
  grilla.innerHTML = '';
  escribirEstado('');
  mostrarPaginacion(false);

  try {
    if (listaCompleta.length === 0) {
      listaCompleta = await pedirListaCompleta();
    }

    textoBuscado = texto.toLowerCase().trim();
    listaActual = listaCompleta.filter(pokemon => pokemon.name.includes(textoBuscado));

    if (listaActual.length === 0) {
      mostrarEstado('vacio', `No hay Pokemon que incluyan "${texto}" en su nombre.`);
      return;
    }

    await cargarPagina(1);
  } catch (error) {
    mostrarEstado('error', error.message || 'No se pudo buscar.');
  } finally {
    mostrarCarga(false);
  }
}

dibujarPanel();

if (pagina === 'inicio') {
  botonBuscar.addEventListener('click', () => {
    const error = validarNombre(entradaNombre.value);

    if (error) {
      marcarError(error);
      return;
    }

    limpiarError();
    buscarPorNombre(entradaNombre.value);
  });

  entradaNombre.addEventListener('keydown', evento => {
    if (evento.key === 'Enter') {
      botonBuscar.click();
    }
  });

  entradaNombre.addEventListener('input', () => {
    if (mensajeError.classList.contains('show')) {
      limpiarError();
    }
  });

  botonLimpiar.addEventListener('click', () => {
    entradaNombre.value = '';
    limpiarError();
    cargarInicio();
  });

  botonReintentar?.addEventListener('click', cargarInicio);
  cargarInicio();
} else {
  botonReintentar?.addEventListener('click', () => cargarColeccion(pagina));
  cargarColeccion(pagina);
}
