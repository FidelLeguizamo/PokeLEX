const API_BASE      = 'https://pokeapi.co/api/v2/pokemon/';
  const PAGE_SIZE = 10;

  const TYPE_COLORS = {
    normal:'#A8A878', fire:'#F08030',   water:'#6890F0',  electric:'#F8D030',
    grass:'#78C850',  ice:'#98D8D8',    fighting:'#C03028', poison:'#A040A0',
    ground:'#E0C068', flying:'#A890F0', psychic:'#F85888',  bug:'#A8B820',
    rock:'#B8A038',   ghost:'#705898',  dragon:'#7038F8',   dark:'#705848',
    steel:'#B8B8D0',  fairy:'#EE99AC',
  };

  const inputName   = document.getElementById('inputName');
  const btnSearch   = document.getElementById('btnSearch');
  const btnClear    = document.getElementById('btnClear');
  const btnRetry    = document.getElementById('btnRetry');
  const errorMsg    = document.getElementById('errorMsg');
  const statsBar    = document.getElementById('statsBar');
  const loader      = document.getElementById('loader');
  const stateEmpty  = document.getElementById('stateEmpty');
  const stateError  = document.getElementById('stateError');
  const emptyMsg    = document.getElementById('emptyMsg');
  const errorDetail = document.getElementById('errorDetail');
  const grid        = document.getElementById('grid');
  const pagination  = document.getElementById('pagination');
  const tabTeam     = document.getElementById('tabTeam');
  const tabFavorites = document.getElementById('tabFavorites');
  const teamPanel   = document.getElementById('teamPanel');
  const favoritesPanel = document.getElementById('favoritesPanel');
  const teamList    = document.getElementById('teamList');
  const favoriteList = document.getElementById('favoriteList');
  const teamCount   = document.getElementById('teamCount');
  const favoriteCount = document.getElementById('favoriteCount');
  let allPokemon    = [];
  let activeList    = [];
  let activeSearch  = '';
  let currentPage   = 1;
  let favorites     = loadSavedList('pokelexFavorites');
  let team          = loadSavedList('pokelexTeam');

  function setLoading(on) {
    loader.classList.toggle('show', on);
    btnSearch.disabled = on;
    btnClear.disabled  = on;
  }

  function showState(which, msg) {
    stateEmpty.classList.remove('show');
    stateError.classList.remove('show');
    if (which === 'empty') { emptyMsg.textContent    = msg; stateEmpty.classList.add('show'); }
    if (which === 'error') { errorDetail.textContent = msg; stateError.classList.add('show'); }
  }

  function setStats(html) { statsBar.innerHTML = html; }

  function setPagination(show) {
    pagination.classList.toggle('show', show);
  }

  function loadSavedList(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (_) {
      return [];
    }
  }

  function saveCollection() {
    localStorage.setItem('pokelexFavorites', JSON.stringify(favorites));
    localStorage.setItem('pokelexTeam', JSON.stringify(team));
  }

  function clearError() {
    errorMsg.classList.remove('show');
    inputName.classList.remove('error');
  }

  function showError(msg) {
    errorMsg.textContent = '⚠ ' + msg;
    errorMsg.classList.add('show');
    inputName.classList.add('error');
  }

  function validate(name) {
    const t = name.trim();
    if (!t)                        return 'El nombre no puede estar vacío.';
    if (t.length < 2)              return 'Ingresa al menos 2 caracteres.';
    if (/[^a-zA-Z0-9\-]/.test(t)) return 'Solo letras, números y guiones.';
    return null;
  }

  function pokemonSummary(pokemon) {
    const types = pokemon.types.map(t => t.type.name);
    return {
      id: pokemon.id,
      name: pokemon.name,
      image: pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default || '',
      types,
    };
  }

  function isFavorite(id) {
    return favorites.some(p => p.id === id);
  }

  function isInTeam(id) {
    return team.some(p => p.id === id);
  }

  function toggleFavorite(pokemon) {
    const summary = pokemonSummary(pokemon);

    if (isFavorite(summary.id)) {
      favorites = favorites.filter(p => p.id !== summary.id);
    } else {
      favorites.push(summary);
    }

    saveCollection();
    renderSidePanel();
    updateCardState(summary.id);
  }

  function toggleTeam(pokemon) {
    const summary = pokemonSummary(pokemon);

    if (isInTeam(summary.id)) {
      team = team.filter(p => p.id !== summary.id);
    } else if (team.length < 6) {
      team.push(summary);
    } else {
      showError('Tu equipo ya tiene 6 Pokémon.');
      return;
    }

    saveCollection();
    renderSidePanel();
    updateCardState(summary.id);
  }

  function updateCardState(id) {
    const card = grid.querySelector(`[data-id="${id}"]`);
    if (!card) return;

    const favoriteButton = card.querySelector('.favorite-toggle');
    const teamButton = card.querySelector('.team-toggle');
    const favoriteSelected = isFavorite(id);
    const teamSelected = isInTeam(id);

    favoriteButton.classList.toggle('selected', favoriteSelected);
    favoriteButton.setAttribute('aria-pressed', String(favoriteSelected));
    teamButton.classList.toggle('selected', teamSelected);
    teamButton.textContent = teamSelected ? 'Quitar del equipo' : 'Agregar al equipo';
  }

  async function fetchPokemon(nameOrId) {
    const response = await fetch(`${API_BASE}${nameOrId.toString().toLowerCase().trim()}`);
    if (!response.ok) {
      if (response.status === 404) throw new Error(`"${nameOrId}" no existe en la Pokédex.`);
      throw new Error(`Error ${response.status}: no se pudo obtener el Pokémon.`);
    }
    return await response.json();
  }

  async function fetchList() {
    const response = await fetch(`${API_BASE}?limit=100000&offset=0`);
    if (!response.ok) throw new Error(`Error ${response.status} al obtener la lista.`);
    const data = await response.json();
    return data.results;
  }

  function buildCard(pokemon) {
    const types  = pokemon.types.map(t => t.type.name);
    const color  = TYPE_COLORS[types[0]] || '#A8A878';
    const imgUrl = pokemon.sprites?.other?.['official-artwork']?.front_default
                || pokemon.sprites?.front_default || '';
    const hp     = pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat     ?? '—';
    const atk    = pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat ?? '—';
    const height = (pokemon.height / 10).toFixed(1) + ' m';
    const weight = (pokemon.weight / 10).toFixed(1) + ' kg';
    const num    = String(pokemon.id).padStart(4, '0');
    const favoriteSelected = isFavorite(pokemon.id);
    const teamSelected = isInTeam(pokemon.id);
 
    const badges = types.map(t =>
      `<span class="type-badge" style="background:${TYPE_COLORS[t] || '#aaa'}">${t}</span>`
    ).join('');
 
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = pokemon.id;

    card.addEventListener('mouseenter', () => {
      card.style.borderColor = color;
      card.style.boxShadow   = `0 12px 32px rgba(0,0,0,.5), 0 0 0 1px ${color}55`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = '';
      card.style.boxShadow   = '';
    });
 
    card.innerHTML = `
      <div class="card-img">
        <span class="card-num">#${num}</span>
        <button class="favorite-toggle ${favoriteSelected ? 'selected' : ''}" type="button" aria-label="Agregar a favoritos" aria-pressed="${favoriteSelected}"></button>
        ${imgUrl
          ? `<img src="${imgUrl}" alt="${pokemon.name}" loading="lazy"/>`
          : `<span style="font-size:3rem">❓</span>`}
      </div>
      <div class="card-body">
        <div class="card-name">${pokemon.name}</div>
        <div class="types">${badges}</div>
        <div class="card-actions">
          <button class="team-toggle ${teamSelected ? 'selected' : ''}" type="button">${teamSelected ? 'Quitar del equipo' : 'Agregar al equipo'}</button>
          <button class="details-toggle" type="button">Ver detalles</button>
        </div>
        <div class="stats-mini">
          <div class="stat-item"><span class="stat-label">HP</span><span class="stat-val">${hp}</span></div>
          <div class="stat-item"><span class="stat-label">Ataque</span><span class="stat-val">${atk}</span></div>
          <div class="stat-item"><span class="stat-label">Altura</span><span class="stat-val">${height}</span></div>
          <div class="stat-item"><span class="stat-label">Peso</span><span class="stat-val">${weight}</span></div>
        </div>
      </div>
    `;

    card.querySelector('.favorite-toggle').addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(pokemon);
    });

    card.querySelector('.team-toggle').addEventListener('click', e => {
      e.stopPropagation();
      toggleTeam(pokemon);
    });

    card.querySelector('.details-toggle').addEventListener('click', e => {
      e.stopPropagation();
      const expanded = card.classList.toggle('expanded');
      e.currentTarget.textContent = expanded ? 'Ocultar detalles' : 'Ver detalles';
    });

    return card;
  }

  function renderCards(list) {
    grid.innerHTML = '';
    list.forEach(p => grid.appendChild(buildCard(p)));
  }

  function renderSidePanel() {
    teamCount.textContent = `${team.length}/6`;
    favoriteCount.textContent = favorites.length;
    renderMiniList(teamList, team, 'Todavía no agregaste Pokémon a tu equipo.', 'team');
    renderMiniList(favoriteList, favorites, 'Todavía no marcaste favoritos.', 'favorite');
  }

  function renderMiniList(container, list, emptyText, type) {
    container.innerHTML = '';

    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'mini-empty';
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }

    list.forEach(pokemon => {
      const item = document.createElement('article');
      item.className = 'mini-card';
      item.innerHTML = `
        ${pokemon.image ? `<img src="${pokemon.image}" alt="${pokemon.name}" loading="lazy"/>` : ''}
        <div>
          <strong>${pokemon.name}</strong>
          <span>#${String(pokemon.id).padStart(4, '0')}</span>
        </div>
        <button type="button" aria-label="Quitar ${pokemon.name}">×</button>
      `;

      item.querySelector('button').addEventListener('click', () => {
        if (type === 'team') {
          team = team.filter(p => p.id !== pokemon.id);
        } else {
          favorites = favorites.filter(p => p.id !== pokemon.id);
        }

        saveCollection();
        renderSidePanel();
        updateCardState(pokemon.id);
      });

      container.appendChild(item);
    });
  }

  function showPanel(panelName) {
    const showingTeam = panelName === 'team';
    tabTeam.classList.toggle('active', showingTeam);
    tabFavorites.classList.toggle('active', !showingTeam);
    teamPanel.classList.toggle('active', showingTeam);
    favoritesPanel.classList.toggle('active', !showingTeam);
  }

  function renderPagination() {
    const totalPages = Math.ceil(activeList.length / PAGE_SIZE);
    pagination.innerHTML = '';

    if (totalPages <= 1) {
      setPagination(false);
      return;
    }

    const prevButton = document.createElement('button');
    prevButton.className = 'page-btn';
    prevButton.textContent = '<';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => loadPage(currentPage - 1));
    pagination.appendChild(prevButton);

    const pageStart = Math.max(1, currentPage - 1);
    const pageEnd = Math.min(totalPages, currentPage + 1);

    if (pageStart > 1) {
      pagination.appendChild(createPageButton(1));
      pagination.appendChild(createPageSeparator());
    }

    for (let page = pageStart; page <= pageEnd; page++) {
      pagination.appendChild(createPageButton(page));
    }

    if (pageEnd < totalPages) {
      pagination.appendChild(createPageSeparator());
      pagination.appendChild(createPageButton(totalPages));
    }

    const nextButton = document.createElement('button');
    nextButton.className = 'page-btn';
    nextButton.textContent = '>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => loadPage(currentPage + 1));
    pagination.appendChild(nextButton);

    setPagination(true);
  }

  function createPageButton(page) {
    const button = document.createElement('button');
    button.className = page === currentPage ? 'page-btn active' : 'page-btn';
    button.textContent = page;
    button.disabled = page === currentPage;
    button.addEventListener('click', () => loadPage(page));
    return button;
  }

  function createPageSeparator() {
    const separator = document.createElement('span');
    separator.className = 'page-separator';
    separator.textContent = '->';
    return separator;
  }

  async function loadPage(page) {
    currentPage = page;
    setLoading(true);
    showState(null);
    grid.innerHTML = '';
    setStats('');

    try {
      if (allPokemon.length === 0) {
        allPokemon = await fetchList();
      }
      if (activeList.length === 0) {
        activeList = allPokemon;
      }

      const start = (currentPage - 1) * PAGE_SIZE;
      const pageItems = activeList.slice(start, start + PAGE_SIZE);
      const results = [];

      for (const item of pageItems) {
        const p = await fetchPokemon(item.name);
        results.push(p);
      }

      renderCards(results);
      renderPagination();
      if (activeSearch) {
        setStats(`Página <b>${currentPage}</b> de <b>${Math.ceil(activeList.length / PAGE_SIZE)}</b> · <b>${activeList.length}</b> resultados para "<b>${activeSearch}</b>"`);
      } else {
        setStats(`Página <b>${currentPage}</b> de <b>${Math.ceil(activeList.length / PAGE_SIZE)}</b> · Mostrando <b>${results.length}</b> Pokémon de <b>${activeList.length}</b>`);
      }
    } catch (err) {
      setPagination(false);
      showState('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDefault() {
    setLoading(true);
    showState(null);
    grid.innerHTML = '';
    setStats('');
    setPagination(false);

    try {
      allPokemon = await fetchList();

      if (allPokemon.length === 0) {
        showState('empty', 'No se cargaron Pokémon.');
      } else {
        activeList = allPokemon;
        activeSearch = '';
        await loadPage(1);
      }
    } catch (err) {
      showState('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchByName(name) {
    setLoading(true);
    showState(null);
    grid.innerHTML = '';
    setStats('');
    setPagination(false);

    try {
      if (allPokemon.length === 0) {
        allPokemon = await fetchList();
      }

      activeSearch = name.toLowerCase().trim();
      activeList = allPokemon.filter(pokemon => pokemon.name.includes(activeSearch));

      if (activeList.length === 0) {
        showState('empty', `No hay Pokémon que incluyan "${name}" en su nombre.`);
        return;
      }

      await loadPage(1);
    } catch (err) {
      showState('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  btnSearch.addEventListener('click', () => {
    const err = validate(inputName.value);
    if (err) { showError(err); return; }
    clearError();
    searchByName(inputName.value.trim().toLowerCase());
  });

  inputName.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnSearch.click();
  });

  inputName.addEventListener('input', () => {
    if (errorMsg.classList.contains('show')) clearError();
  });

  btnClear.addEventListener('click', () => {
    inputName.value = '';
    clearError();
    loadDefault();
  });

  btnRetry.addEventListener('click', loadDefault);

  tabTeam.addEventListener('click', () => showPanel('team'));
  tabFavorites.addEventListener('click', () => showPanel('favorites'));

  renderSidePanel();
  loadDefault();
