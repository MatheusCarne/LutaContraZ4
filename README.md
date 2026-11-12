# ⚽ Quem vai cair? — Luta Contra o Z4 (Brasileirão 2026)

[![GitHub Pages](https://img.shields.io/badge/Acessar%20Ao%20Vivo-GitHub%20Pages-7e22ce?style=for-the-badge&logo=github)](https://matheuscarne.github.io/LutaContraZ4/)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)

Painel interativo em tempo real focado na disputa contra o rebaixamento do **Campeonato Brasileiro Série A 2026**. O projeto recalcula a classificação virtual a cada gol, exibe indicadores matemáticos de permanência e permite simular cenários da rodada diretamente no navegador.

🔗 **Acesse o painel online:** [matheuscarne.github.io/LutaContraZ4](https://matheuscarne.github.io/LutaContraZ4/)


## ✨ Funcionalidades

- **📊 Classificação Virtual em Tempo Real:** Recalcula pontos, vitórias, saldo de gols e posições automaticamente durante os jogos (`IN_PLAY` / `PAUSED`), mantendo indicadores de variação (`▲` / `▼`) até o início da rodada seguinte.
- **🚨 Radar do Z4 (17º ao 20º):** Destaque visual para os 4 clubes na zona de rebaixamento no momento, mostrando distância em pontos para o 16º colocado, aproveitamento (`%`), pontuação máxima possível (`Max`), barra de progresso rumo aos 45 pontos e alerta automático de **Rebaixado Matematicamente**.
- **🌡️ Termômetro de Momento:** Analisa os últimos 5 jogos dos times da parte de baixo da tabela (12º ao 20º) para apontar quem está **mais embalado** e quem vive a **pior sequência**.
- **✏️ Modo Simulação:** Permite editar placares manualmente ou usar atalhos de 1 clique (*Vitória Casa*, *Empate*, *Vitória Fora*) para testar cenários e ver o impacto imediato na tabela.
- **🔥 Filtro e Alertas de Confronto Direto:** Destaca partidas que envolvem clubes ameaçados e sinaliza jogos de 6 pontos (`🔥 DIRETO`) entre concorrentes diretos.

## ⚙️ Arquitetura e Atualização de Dados

Para manter o projeto **100% gratuito**, rápido, resiliente a picos de acesso e sem expor chaves de API no front-end, o sistema utiliza uma arquitetura híbrida:

1. **Produção (`GitHub Pages`):** Um workflow agendado no **GitHub Actions** (`.github/workflows/atualizar-dados.yml`) consulta a API da [Football-Data.org](https://www.football-data.org/) nos horários de jogos utilizando um *Repository Secret* (`FOOTBALL_API_KEY`) e atualiza o arquivo estático `dados.json`. O front-end consome esse JSON diretamente via CDN do GitHub.
2. **Desenvolvimento Local (`localhost`):** Quando executado localmente com uma `API_KEY` configurada no `script.js`, o painel consulta a API diretamente com cache inteligente em `localStorage` (atualização a cada 60 segundos).


## 🚀 Como rodar localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/MatheusCarne/LutaContraZ4.git
   cd LutaContraZ4
   ```

2. *(Opcional)* Para testar consultas ao vivo diretamente da API no seu computador:
   - Crie uma conta gratuita na [Football-Data.org](https://www.football-data.org/) para obter um token.
   - Insira seu token na constante `API_KEY` no topo do arquivo `script.js` *(lembre-se de não commitar sua chave privada)*.

3. Abra o `index.html` com uma extensão como o **Live Server** (VS Code) ou qualquer servidor HTTP local.


## 📁 Estrutura do Projeto

```text
LutaContraZ4/
├── .github/
│   └── workflows/
│       └── atualizar-dados.yml   # Automação de coleta via GitHub Actions
├── index.html                    # Estrutura editorial, meta tags Open Graph e layout
├── style.css                     # Estilização responsiva em tema escuro
├── script.js                     # Lógica de classificação virtual, radar, termômetro e simulação
├── dados.json                    # Snapshot atualizado automaticamente em produção
└── logo-brasileirao.png          # Identidade visual e favicon
```


## 👨‍💻 Autor

Desenvolvido por **Matheus Carneiro**

[![YouTube](https://img.shields.io/badge/YouTube-@Matheus__Carne-FF0000?style=flat-square&logo=youtube&logoColor=white)](https://www.youtube.com/@Matheus_Carne)
[![Instagram](https://img.shields.io/badge/Instagram-@matheus__ccunha-E4405F?style=flat-square&logo=instagram&logoColor=white)](https://www.instagram.com/matheus_ccunha/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Matheus%20Carneiro-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/matheuscarne/)
[![GitHub](https://img.shields.io/badge/GitHub-MatheusCarne-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/MatheusCarne)
