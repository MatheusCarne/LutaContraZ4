const API_KEY = '';

const IS_LOCALHOST = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = 'https://api.football-data.org/v4';

const TEMPO_CACHE_VIVO_MS = 45 * 1000;
const TEMPO_CACHE_HISTORICO_MS = 6 * 60 * 60 * 1000;
const TOTAL_RODADAS = 38;
const META_SEGURANCA_PTS = 45;

const listaJogosEl = document.getElementById('lista-jogos');
const corpoTabelaEl = document.getElementById('corpo-tabela');
const statusEl = document.getElementById('status-atualizacao');
const cardsZ4El = document.getElementById('cards-z4');
const termometroZ4El = document.getElementById('termometro-z4');

let apenasJogosZ4 = false;
let modoSimulacao = false;

let tabelaOficialCache = [];
let partidasReaisCache = [];
let partidasSimuladas = [];
let ultimaTabelaCache = [];
let mapaUltimos5Cache = {};

// Dicionário de normalização de nomes, siglas e escudos
const CORRECOES_TIMES = {
    'São Paulo': { sigla: 'SAO', nome: 'São Paulo' },
    'Corinthians': { sigla: 'COR', nome: 'Corinthians' },
    'Coritiba': { sigla: 'CFC', nome: 'Coritiba' },
    'Remo': { sigla: 'REM', nome: 'Remo' },
    'Grêmio': { sigla: 'GRE', nome: 'Grêmio' },
    'Internacional': { sigla: 'INT', nome: 'Internacional' },
    'Paranaense': {
        sigla: 'CAP',
        nome: 'Athletico-PR',
        escudo: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Athletico_Paranaense_%28Logo_2019%29.svg'
    },
    'Athletico': {
        sigla: 'CAP',
        nome: 'Athletico-PR',
        escudo: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Athletico_Paranaense_%28Logo_2019%29.svg'
    },
    'Mineiro': { sigla: 'CAM', nome: 'Atlético-MG' },
    'Atlético Mineiro': { sigla: 'CAM', nome: 'Atlético-MG' },
    'Bragantino': { sigla: 'RBB', nome: 'RB Bragantino' },
    'Botafogo': { sigla: 'BOT', nome: 'Botafogo' },
    'Flamengo': { sigla: 'FLA', nome: 'Flamengo' },
    'Fluminense': { sigla: 'FLU', nome: 'Fluminense' },
    'Palmeiras': { sigla: 'PAL', nome: 'Palmeiras' },
    'Vasco': { sigla: 'VAS', nome: 'Vasco' },
    'Cruzeiro': { sigla: 'CRU', nome: 'Cruzeiro' },
    'Santos': { sigla: 'SAN', nome: 'Santos' },
    'Bahia': { sigla: 'BAH', nome: 'Bahia' },
    'Vitória': { sigla: 'VIT', nome: 'Vitória' },
    'Mirassol': { sigla: 'MIR', nome: 'Mirassol' },
    'Chapecoense': { sigla: 'CHA', nome: 'Chapecoense' },
    'Criciúma': { sigla: 'CRI', nome: 'Criciúma' },
    'Ceará': { sigla: 'CEA', nome: 'Ceará' },
    'Fortaleza': { sigla: 'FOR', nome: 'Fortaleza' },
    'Sport': { sigla: 'SPT', nome: 'Sport' }
};

function obterDadosTimeNormalizados(team) {
    const nomeBase = team.shortName || team.name || '';
    let siglaFinal = team.tla || nomeBase.substring(0, 3).toUpperCase();
    let nomeFinal = nomeBase;
    let escudoFinal = team.crest;

    for (const [chave, dados] of Object.entries(CORRECOES_TIMES)) {
        if (nomeBase.toLowerCase().includes(chave.toLowerCase())) {
            if (dados.sigla) siglaFinal = dados.sigla;
            if (dados.nome) nomeFinal = dados.nome;
            if (dados.escudo) escudoFinal = dados.escudo;
            break;
        }
    }

    return { sigla: siglaFinal, nome: nomeFinal, escudo: escudoFinal };
}

window.alternarFiltroZ4 = function(ativarZ4) {
    apenasJogosZ4 = ativarZ4;
    document.getElementById('filtro-todos').classList.toggle('ativo', !ativarZ4);
    document.getElementById('filtro-z4').classList.toggle('ativo', ativarZ4);
    const listaAtual = modoSimulacao ? partidasSimuladas : partidasReaisCache;
    renderizarJogos(listaAtual, ultimaTabelaCache);
};

window.alternarModoSimulacao = function() {
    modoSimulacao = !modoSimulacao;
    const btnSimular = document.getElementById('btn-simular');

    if (modoSimulacao) {
        btnSimular.classList.add('ativo');
        btnSimular.textContent = '✖ Sair da Simulação';
        statusEl.innerHTML = '<strong style="color: #fbbf24;">⚠️ MODO SIMULAÇÃO ATIVO</strong> — Digite placares ou use os botões rápidos (Casa / Empate / Fora)';

        partidasSimuladas = JSON.parse(JSON.stringify(partidasReaisCache));
        recalcularERenderizar();
    } else {
        btnSimular.classList.remove('ativo');
        btnSimular.textContent = '✏️ Modo Simulação';
        partidasSimuladas = [];
        recalcularERenderizar();
        carregarBrasileiraoAtual(false);
    }
};

window.simularResultadoRapido = function(jogoId, tipo) {
    const jogo = partidasSimuladas.find(j => j.id === jogoId);
    if (!jogo) return;

    if (tipo === 'CASA') {
        jogo.score.fullTime.home = 1;
        jogo.score.fullTime.away = 0;
    } else if (tipo === 'EMPATE') {
        jogo.score.fullTime.home = 1;
        jogo.score.fullTime.away = 1;
    } else if (tipo === 'FORA') {
        jogo.score.fullTime.home = 0;
        jogo.score.fullTime.away = 1;
    }
    jogo.status = 'SIMULATED';
    recalcularERenderizar();
};

window.atualizarPlacarSimulado = function(jogoId, lado, valorStr) {
    const jogo = partidasSimuladas.find(j => j.id === jogoId);
    if (!jogo) return;

    if (valorStr === '' || valorStr === null) {
        jogo.score.fullTime[lado] = null;
        if (jogo.score.fullTime.home === null && jogo.score.fullTime.away === null) {
            jogo.status = 'TIMED';
        }
    } else {
        const gols = Math.max(0, parseInt(valorStr, 10) || 0);
        jogo.score.fullTime[lado] = gols;

        const outroLado = lado === 'home' ? 'away' : 'home';
        if (jogo.score.fullTime[outroLado] === null) {
            jogo.score.fullTime[outroLado] = 0;
        }
        jogo.status = 'SIMULATED';
    }

    recalcularERenderizar();
};

function recalcularERenderizar() {
    const partidasBase = modoSimulacao ? partidasSimuladas : partidasReaisCache;
    const tabelaCalculada = calcularClassificacaoVirtual(tabelaOficialCache, partidasBase);
    ultimaTabelaCache = tabelaCalculada;

    renderizarCardsRadarZ4(tabelaCalculada);
    renderizarTabela(tabelaCalculada, mapaUltimos5Cache);
    renderizarJogos(partidasBase, tabelaCalculada);
    renderizarTermometroMomento(tabelaCalculada, mapaUltimos5Cache);
}

async function carregarBrasileiraoAtual(forcarAtualizacao = false) {
    if (modoSimulacao && !forcarAtualizacao) return;

    if (modoSimulacao && forcarAtualizacao) {
        modoSimulacao = false;
        const btnSimular = document.getElementById('btn-simular');
        btnSimular.classList.remove('ativo');
        btnSimular.textContent = '✏️ Modo Simulação';
    }

    try {
        // MODO ONLINE (GitHub Pages): lê o dados.json gerado pelo GitHub Actions
        if (!IS_LOCALHOST || !API_KEY) {
            statusEl.textContent = 'Carregando dados atualizados...';
            const res = await fetch(`./dados.json?t=${Date.now()}`);
            if (!res.ok) throw new Error('Arquivo dados.json ainda não foi gerado.');

            const dados = await res.json();
            tabelaOficialCache = dados.tabela;
            partidasReaisCache = dados.partidas;
            mapaUltimos5Cache = processarHistoricoJogos(dados.finalizados || []);

            recalcularERenderizar();

            const horaAtual = new Date(dados.atualizadoEm).toLocaleTimeString('pt-BR');
            statusEl.textContent = `Rodada ${dados.rodada} de 38 • Atualizado às ${horaAtual}`;
            return;
        }

        // MODO LOCAL (localhost com API_KEY configurada)
        const agora = Date.now();
        const cacheSalvo = JSON.parse(localStorage.getItem('cache_fd_bsa_2026'));

        let rodadaAtual, tabelaOficial, partidas, timestampDados;

        if (!forcarAtualizacao && cacheSalvo && (agora - cacheSalvo.timestamp < TEMPO_CACHE_VIVO_MS)) {
            rodadaAtual = cacheSalvo.rodada;
            tabelaOficial = cacheSalvo.tabela;
            partidas = cacheSalvo.partidas;
            timestampDados = cacheSalvo.timestamp;
        } else {
            statusEl.textContent = 'Sincronizando placares e recalculando Z4...';

            const resTabela = await fetch(`${API_BASE}/competitions/BSA/standings`, {
                headers: { 'X-Auth-Token': API_KEY }
            });
            if (!resTabela.ok) throw new Error(`Erro na tabela (${resTabela.status})`);

            const jsonTabela = await resTabela.json();
            rodadaAtual = jsonTabela.season.currentMatchday;
            tabelaOficial = jsonTabela.standings[0].table;

            const resJogos = await fetch(`${API_BASE}/competitions/BSA/matches?matchday=${rodadaAtual}`, {
                headers: { 'X-Auth-Token': API_KEY }
            });
            if (!resJogos.ok) throw new Error(`Erro nos jogos (${resJogos.status})`);

            const jsonJogos = await resJogos.json();
            partidas = jsonJogos.matches;
            timestampDados = agora;

            localStorage.setItem('cache_fd_bsa_2026', JSON.stringify({
                timestamp: timestampDados,
                rodada: rodadaAtual,
                tabela: tabelaOficial,
                partidas
            }));
        }

        mapaUltimos5Cache = await obterHistoricoUltimos5(forcarAtualizacao);
        tabelaOficialCache = tabelaOficial;
        partidasReaisCache = partidas;

        recalcularERenderizar();

        const horaAtual = new Date(timestampDados).toLocaleTimeString('pt-BR');
        statusEl.textContent = `Rodada ${rodadaAtual} de 38 • Atualizado às ${horaAtual}`;

    } catch (erro) {
        console.error('Erro detalhado:', erro);
        statusEl.textContent = `Erro: ${erro.message}`;
    }
}

async function obterHistoricoUltimos5(forcarAtualizacao = false) {
    const agora = Date.now();
    const cacheHist = JSON.parse(localStorage.getItem('cache_historico_bsa_2026'));

    if (!forcarAtualizacao && cacheHist && (agora - cacheHist.timestamp < TEMPO_CACHE_HISTORICO_MS)) {
        return cacheHist.mapa;
    }

    const resFin = await fetch(`${API_BASE}/competitions/BSA/matches?status=FINISHED`, {
        headers: { 'X-Auth-Token': API_KEY }
    });

    if (!resFin.ok) return {};

    const jsonFin = await resFin.json();
    const mapaFinal = processarHistoricoJogos(jsonFin.matches || []);

    localStorage.setItem('cache_historico_bsa_2026', JSON.stringify({
        timestamp: agora,
        mapa: mapaFinal
    }));

    return mapaFinal;
}

function processarHistoricoJogos(jogosFinalizados) {
    const ordenados = [...jogosFinalizados].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    const historicoPorTime = {};

    ordenados.forEach(jogo => {
        const idCasa = jogo.homeTeam.id;
        const idFora = jogo.awayTeam.id;
        const golsCasa = jogo.score.fullTime.home;
        const golsFora = jogo.score.fullTime.away;

        if (golsCasa === null || golsFora === null) return;

        if (!historicoPorTime[idCasa]) historicoPorTime[idCasa] = [];
        if (!historicoPorTime[idFora]) historicoPorTime[idFora] = [];

        if (golsCasa > golsFora) {
            historicoPorTime[idCasa].push('W');
            historicoPorTime[idFora].push('L');
        } else if (golsFora > golsCasa) {
            historicoPorTime[idCasa].push('L');
            historicoPorTime[idFora].push('W');
        } else {
            historicoPorTime[idCasa].push('D');
            historicoPorTime[idFora].push('D');
        }
    });

    const mapaFinal = {};
    Object.keys(historicoPorTime).forEach(timeId => {
        mapaFinal[timeId] = historicoPorTime[timeId].slice(-5);
    });
    return mapaFinal;
}

function calcularClassificacaoVirtual(tabelaOficial, partidas) {
    const timesMap = new Map();

    tabelaOficial.forEach((item) => {
        timesMap.set(item.team.id, {
            ...item,
            jogandoAgora: false
        });
    });

    // Reconstrói a tabela anterior à rodada para manter as setas ▲/▼ até a próxima rodada
    const baseAntesDaRodada = new Map();
    timesMap.forEach((time, id) => {
        baseAntesDaRodada.set(id, {
            id,
            points: time.points,
            won: time.won,
            goalDifference: time.goalDifference,
            goalsFor: time.goalsFor
        });
    });

    partidas.forEach(jogo => {
        if (jogo.status === 'FINISHED' && jogo.score.fullTime.home !== null && jogo.score.fullTime.away !== null) {
            const casa = baseAntesDaRodada.get(jogo.homeTeam.id);
            const fora = baseAntesDaRodada.get(jogo.awayTeam.id);
            const gCasa = jogo.score.fullTime.home;
            const gFora = jogo.score.fullTime.away;

            if (casa && fora) {
                casa.goalsFor -= gCasa;
                casa.goalDifference -= (gCasa - gFora);
                fora.goalsFor -= gFora;
                fora.goalDifference -= (gFora - gCasa);

                if (gCasa > gFora) {
                    casa.points -= 3;
                    casa.won -= 1;
                } else if (gFora > gCasa) {
                    fora.points -= 3;
                    fora.won -= 1;
                } else {
                    casa.points -= 1;
                    fora.points -= 1;
                }
            }
        }
    });

    const rankingAnterior = Array.from(baseAntesDaRodada.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.won !== a.won) return b.won - a.won;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });

    const mapaPosicaoAnterior = new Map();
    rankingAnterior.forEach((time, index) => {
        mapaPosicaoAnterior.set(time.id, index + 1);
    });

    // Aplica os jogos em andamento ou simulados
    partidas.forEach(jogo => {
        const contabilizar = jogo.status === 'IN_PLAY' || jogo.status === 'PAUSED' || jogo.status === 'SIMULATED';
        const golsCasa = jogo.score.fullTime.home;
        const golsFora = jogo.score.fullTime.away;

        if (contabilizar && golsCasa !== null && golsFora !== null) {
            const mandante = timesMap.get(jogo.homeTeam.id);
            const visitante = timesMap.get(jogo.awayTeam.id);

            if (mandante && visitante) {
                mandante.jogandoAgora = true;
                visitante.jogandoAgora = true;

                mandante.playedGames += 1;
                visitante.playedGames += 1;

                mandante.goalsFor += golsCasa;
                mandante.goalsAgainst += golsFora;
                mandante.goalDifference += (golsCasa - golsFora);

                visitante.goalsFor += golsFora;
                visitante.goalsAgainst += golsCasa;
                visitante.goalDifference += (golsFora - golsCasa);

                if (golsCasa > golsFora) {
                    mandante.points += 3;
                    mandante.won += 1;
                } else if (golsFora > golsCasa) {
                    visitante.points += 3;
                    visitante.won += 1;
                } else {
                    mandante.points += 1;
                    visitante.points += 1;
                }
            }
        }
    });

    const tabelaOrdenada = Array.from(timesMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.won !== a.won) return b.won - a.won;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });

    tabelaOrdenada.forEach((time, index) => {
        time.posicaoAtual = index + 1;
        const posAnterior = mapaPosicaoAnterior.get(time.team.id) || time.posicaoAtual;
        time.variacao = posAnterior - time.posicaoAtual;

        const jogosRestantes = Math.max(0, TOTAL_RODADAS - time.playedGames);
        time.maxPontos = time.points + (jogosRestantes * 3);
        time.aproveitamento = time.playedGames > 0
            ? Math.round((time.points / (time.playedGames * 3)) * 100)
            : 0;
    });

    return tabelaOrdenada;
}

function renderizarCardsRadarZ4(tabela) {
    if (!cardsZ4El || tabela.length < 20) return;

    const decimoSexto = tabela[15];
    const timesZ4 = tabela.slice(16, 20);

    cardsZ4El.innerHTML = '';

    timesZ4.forEach(time => {
        const info = obterDadosTimeNormalizados(time.team);
        const diffParaSair = decimoSexto.points - time.points;
        const faltamPara45 = Math.max(0, META_SEGURANCA_PTS - time.points);
        const percentualMeta = Math.min(100, Math.round((time.points / META_SEGURANCA_PTS) * 100));
        const rebaixadoMatematico = time.maxPontos < decimoSexto.points;

        let textoDistancia = '';
        if (rebaixadoMatematico) {
            textoDistancia = `<span class="selo-rebaixado">Rebaixado Matematicamente</span>`;
        } else if (diffParaSair === 0) {
            textoDistancia = `Mesmos pts do 16º (${info.sigla} perde no desempate)`;
        } else {
            textoDistancia = `A <strong>${diffParaSair} pt${diffParaSair > 1 ? 's' : ''}</strong> do 16º (${decimoSexto.points} pts)`;
        }

        const card = document.createElement('div');
        card.className = 'card-z4-destaque';
        card.innerHTML = `
            <div class="card-z4-topo">
                <div class="card-z4-time">
                    <img src="${info.escudo}" alt="" style="width: 22px;">
                    <span>${info.nome}</span>
                </div>
                <span class="card-z4-pos">${time.posicaoAtual}º</span>
            </div>
            <div class="card-z4-numero-grande">
                ${time.points} <span>pts (${time.aproveitamento}%)</span>
            </div>
            <div class="card-z4-detalhe">${textoDistancia}</div>
            <div class="card-z4-detalhe" style="color: #94a3b8; font-size: 0.74rem;">
                Faltam ${faltamPara45} pts para 45 • Máx: ${time.maxPontos} pts
            </div>
            <div class="barra-meta-bg" title="${percentualMeta}% da meta de 45 pontos">
                <div class="barra-meta-fill" style="width: ${percentualMeta}%;"></div>
            </div>
        `;
        cardsZ4El.appendChild(card);
    });
}

function renderizarTermometroMomento(tabela, mapaUltimos5) {
    if (!termometroZ4El || tabela.length < 20) return;

    const pelotaoInferior = tabela.slice(11, 20).map(time => {
        const hist = mapaUltimos5[time.team.id] || [];
        const pontosUltimos5 = hist.reduce((acc, res) => {
            if (res === 'W') return acc + 3;
            if (res === 'D') return acc + 1;
            return acc;
        }, 0);

        return {
            ...time,
            hist,
            pontosUltimos5
        };
    });

    const maisEmbalado = [...pelotaoInferior].sort((a, b) => {
        if (b.pontosUltimos5 !== a.pontosUltimos5) return b.pontosUltimos5 - a.pontosUltimos5;
        return a.posicaoAtual - b.posicaoAtual;
    })[0];

    const piorSequencia = [...pelotaoInferior].sort((a, b) => {
        if (a.pontosUltimos5 !== b.pontosUltimos5) return a.pontosUltimos5 - b.pontosUltimos5;
        return b.posicaoAtual - a.posicaoAtual;
    })[0];

    const decimoSexto = tabela[15];
    const infoEmbalado = obterDadosTimeNormalizados(maisEmbalado.team);
    const infoQueda = obterDadosTimeNormalizados(piorSequencia.team);
    const infoCorte = obterDadosTimeNormalizados(decimoSexto.team);
    const jogosRestantesCorte = Math.max(0, TOTAL_RODADAS - decimoSexto.playedGames);

    termometroZ4El.innerHTML = `
        <h3>Termômetro do Z4 <span>Últimos 5 jogos (12º ao 20º)</span></h3>

        <div class="item-termometro alta">
            <span class="termometro-rotulo">🔥 Mais Embalado</span>
            <div class="termometro-linha">
                <div class="termometro-time">
                    <img src="${infoEmbalado.escudo}" alt="" style="width: 18px;">
                    <span>${infoEmbalado.nome} (${maisEmbalado.posicaoAtual}º)</span>
                </div>
                <div>${formatarUltimosJogos(maisEmbalado.hist)}</div>
            </div>
            <span class="termometro-info">${maisEmbalado.pontosUltimos5} de 15 pts disputados (${Math.round((maisEmbalado.pontosUltimos5 / 15) * 100)}%)</span>
        </div>

        <div class="item-termometro queda">
            <span class="termometro-rotulo">❄️ Pior Sequência</span>
            <div class="termometro-linha">
                <div class="termometro-time">
                    <img src="${infoQueda.escudo}" alt="" style="width: 18px;">
                    <span>${infoQueda.nome} (${piorSequencia.posicaoAtual}º)</span>
                </div>
                <div>${formatarUltimosJogos(piorSequencia.hist)}</div>
            </div>
            <span class="termometro-info">${piorSequencia.pontosUltimos5} de 15 pts disputados (${Math.round((piorSequencia.pontosUltimos5 / 15) * 100)}%)</span>
        </div>
    `;
}

function formatarUltimosJogos(listaResultados) {
    if (!listaResultados || listaResultados.length === 0) return '-';

    return listaResultados.map(letra => {
        if (letra === 'W') return '<span class="bolinha-form vitoria" title="Vitória"></span>';
        if (letra === 'D') return '<span class="bolinha-form empate" title="Empate"></span>';
        if (letra === 'L') return '<span class="bolinha-form derrota" title="Derrota"></span>';
        return '';
    }).join('');
}

function renderizarTabela(tabela, mapaUltimos5) {
    corpoTabelaEl.innerHTML = '';

    tabela.forEach(item => {
        const tr = document.createElement('tr');
        const infoTime = obterDadosTimeNormalizados(item.team);

        if (item.posicaoAtual <= 4) {
            tr.classList.add('zona-libertadores');
        } else if (item.posicaoAtual === 5) {
            tr.classList.add('zona-pre-libertadores');
        } else if (item.posicaoAtual <= 11) {
            tr.classList.add('zona-sulamericana');
        } else if (item.posicaoAtual >= 17) {
            tr.classList.add('zona-rebaixamento');
        }

        let indicadorMovimento = '';
        if (item.variacao > 0) {
            indicadorMovimento = `<span style="color: #4ade80; font-size: 0.78em; font-weight: 700; margin-left: 4px;" title="Subiu ${item.variacao} posição(ões) na rodada">▲${item.variacao}</span>`;
        } else if (item.variacao < 0) {
            indicadorMovimento = `<span style="color: #f87171; font-size: 0.78em; font-weight: 700; margin-left: 4px;" title="Caiu ${Math.abs(item.variacao)} posição(ões) na rodada">▼${Math.abs(item.variacao)}</span>`;
        } else {
            indicadorMovimento = `<span style="color: #64748b; font-size: 0.72em; margin-left: 4px;" title="Manteve a posição">•</span>`;
        }

        const badgeAoVivo = item.jogandoAgora ? (modoSimulacao ? ' <span title="Simulado">✏️</span>' : ' <span title="Em campo agora">🟢</span>') : '';
        const bolinhasUltimos5 = formatarUltimosJogos(mapaUltimos5[item.team.id]);

        tr.innerHTML = `
            <td style="white-space: nowrap;">${item.posicaoAtual}º${indicadorMovimento}</td>
            <td>
                <img src="${infoTime.escudo}" alt="" style="width: 18px; vertical-align: middle; margin-right: 6px;">
                ${infoTime.nome}${badgeAoVivo}
            </td>
            <td><strong>${item.points}</strong></td>
            <td>${item.playedGames}</td>
            <td>${item.won}</td>
            <td>${item.goalDifference}</td>
            <td class="col-secundaria">${item.aproveitamento}%</td>
            <td class="col-secundaria">${item.maxPontos}</td>
            <td class="coluna-form">${bolinhasUltimos5}</td>
        `;
        corpoTabelaEl.appendChild(tr);
    });
}

function renderizarJogos(partidas, tabelaAtual) {
    listaJogosEl.innerHTML = '';

    const mapaPosicoes = new Map();
    if (tabelaAtual) {
        tabelaAtual.forEach(t => mapaPosicoes.set(t.team.id, t.posicaoAtual));
    }

    partidas.forEach(jogo => {
        const posCasa = mapaPosicoes.get(jogo.homeTeam.id) || 10;
        const posFora = mapaPosicoes.get(jogo.awayTeam.id) || 10;

        const casaAmeacado = posCasa >= 13;
        const foraAmeacado = posFora >= 13;
        const envolveBrigaZ4 = casaAmeacado || foraAmeacado;
        const confrontoDireto = casaAmeacado && foraAmeacado;

        if (apenasJogosZ4 && !envolveBrigaZ4) return;

        const card = document.createElement('div');
        card.className = 'jogo-card';

        const aoVivo = jogo.status === 'IN_PLAY' || jogo.status === 'PAUSED';
        if (aoVivo) {
            card.classList.add('jogo-aovivo');
        } else if (confrontoDireto) {
            card.classList.add('jogo-direto');
        } else if (envolveBrigaZ4) {
            card.classList.add('jogo-z4');
        }

        const infoCasa = obterDadosTimeNormalizados(jogo.homeTeam);
        const infoFora = obterDadosTimeNormalizados(jogo.awayTeam);

        const golsCasaVal = jogo.score.fullTime.home !== null ? jogo.score.fullTime.home : '';
        const golsForaVal = jogo.score.fullTime.away !== null ? jogo.score.fullTime.away : '';

        const mapaStatus = {
            'SCHEDULED': 'AGENDADO',
            'TIMED': new Date(jogo.utcDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            'IN_PLAY': '🟢 AO VIVO',
            'PAUSED': '⏸️ INTERVALO',
            'FINISHED': 'ENCERRADO',
            'SIMULATED': '✏️ SIMULADO'
        };
        const statusTexto = mapaStatus[jogo.status] || jogo.status;

        let badgePrioridade = '';
        if (confrontoDireto) {
            badgePrioridade = '<span class="tag-direto" title="Dois times ameaçados se enfrentando">🔥 DIRETO</span>';
        } else if (envolveBrigaZ4) {
            badgePrioridade = '<span class="tag-z4" title="Envolve time na briga contra o Z4">Z4</span>';
        }

        const blocoPlacarHtml = modoSimulacao
            ? `
                <input type="number" min="0" max="20" class="input-placar" value="${golsCasaVal}" placeholder="-" onchange="atualizarPlacarSimulado(${jogo.id}, 'home', this.value)" onkeyup="atualizarPlacarSimulado(${jogo.id}, 'home', this.value)">
                <span style="color: #64748b;">x</span>
                <input type="number" min="0" max="20" class="input-placar" value="${golsForaVal}" placeholder="-" onchange="atualizarPlacarSimulado(${jogo.id}, 'away', this.value)" onkeyup="atualizarPlacarSimulado(${jogo.id}, 'away', this.value)">
              `
            : `
                <span class="placar-numero">${golsCasaVal !== '' ? golsCasaVal : '-'}</span>
                <span style="color: #64748b;">x</span>
                <span class="placar-numero">${golsForaVal !== '' ? golsForaVal : '-'}</span>
              `;

        const atalhosSimHtml = modoSimulacao
            ? `
                <div class="atalhos-simulacao">
                    <button class="btn-atalho-sim" onclick="simularResultadoRapido(${jogo.id}, 'CASA')">Vitória ${infoCasa.sigla}</button>
                    <button class="btn-atalho-sim" onclick="simularResultadoRapido(${jogo.id}, 'EMPATE')">Empate</button>
                    <button class="btn-atalho-sim" onclick="simularResultadoRapido(${jogo.id}, 'FORA')">Vitória ${infoFora.sigla}</button>
                </div>
              `
            : '';

        card.innerHTML = `
            <div class="jogo-linha-principal">
                <div class="placar-box">
                    <img src="${infoCasa.escudo}" alt="" style="width: 18px;">
                    <strong>${infoCasa.sigla}</strong>
                    ${blocoPlacarHtml}
                    <strong>${infoFora.sigla}</strong>
                    <img src="${infoFora.escudo}" alt="" style="width: 18px;">
                    ${badgePrioridade}
                </div>
                <small>${statusTexto}</small>
            </div>
            ${atalhosSimHtml}
        `;
        listaJogosEl.appendChild(card);
    });
}

carregarBrasileiraoAtual();
setInterval(() => carregarBrasileiraoAtual(), 60000);
