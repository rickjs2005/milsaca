# Brief de assets — App Milsaca

> Specs exatas dos arquivos binários que precisam existir nesta pasta
> antes de `eas build` rodar com sucesso. Substitua o `.gitkeep`.

## Identidade visual

| Token | Hex | Onde |
|---|---|---|
| `milsaca.verde` | `#2D3A2E` | Background splash, adaptive icon, fundo do ícone |
| `milsaca.dourado` | `#C9A961` | Símbolo (grão de café estilizado, monograma "M") |
| `milsaca.cream` | `#FAF7F0` | Variação clara opcional |

Fonte oficial: **Inter** (já carregada via `@expo-google-fonts/inter`).

## Arquivos necessários

Todos PNG com fundo transparente OU sólido conforme indicado. Salve
diretamente em `apps/mobile/assets/`.

### 1. `icon.png` — Ícone do app (iOS + fallback Android)

- **Tamanho:** 1024 × 1024 px (quadrado, sem cantos arredondados — iOS aplica máscara)
- **Background:** sólido `#2D3A2E` (verde Milsaca) ou imagem de fundo cheia
- **Padding interno:** mínimo 10% nas bordas (logo não pode encostar)
- **Conteúdo:** logo Milsaca centralizado em dourado `#C9A961`
- **Formato:** PNG 24-bit, sem alpha

### 2. `adaptive-icon.png` — Ícone Android adaptativo (foreground)

- **Tamanho:** 1024 × 1024 px
- **Background:** **transparente** (o sistema combina com `backgroundColor: "#2D3A2E"` definido em `app.json`)
- **Safe zone:** logo precisa caber num círculo central de 660 × 660 px (Android pode cortar bordas em formatos diferentes)
- **Conteúdo:** apenas o símbolo da marca em dourado, sem fundo

### 3. `splash.png` — Splash screen (tela de boot)

- **Tamanho recomendado:** 1242 × 2436 px (suporta retina e adapta down)
- **Background:** o sistema preenche com `#2D3A2E` automaticamente (já configurado)
- **Conteúdo:** logo Milsaca centralizado em dourado, ocupando ~30% da largura
- **Formato:** PNG com fundo transparente OU sólido `#2D3A2E`
- **Importante:** sem texto, sem versão, sem tagline (Expo splash some rápido)

### 4. `favicon.png` — Ícone web (PWA fallback)

- **Tamanho:** 48 × 48 px (mínimo) ou 192 × 192 px (recomendado)
- **Background:** sólido `#2D3A2E`
- **Conteúdo:** versão simplificada do logo (legível em 16 × 16)
- **Formato:** PNG 24-bit

## Onde gerar

### Caminho zero-cost (DIY)

- **Figma / Penpot** com template "Mobile App Icon" — exporta direto
- **Canva** (template "App Icon") — não-designer-friendly mas serve pra MVP
- **AI generators** (Figma AI, Bing Image Creator) com prompt: "minimal coffee bean logo, monogram M, gold #C9A961 on dark green #2D3A2E, flat vector style, 1024x1024 centered"

### Caminho automatizado (preview rápido)

```bash
# Gera os 4 tamanhos a partir de um SVG-source
# (precisa de imagemagick ou sharp-cli instalado localmente)
npx sharp-cli -i logo.svg -o icon.png resize 1024 1024
npx sharp-cli -i logo-mono.svg -o adaptive-icon.png resize 1024 1024
npx sharp-cli -i logo-light.svg -o splash.png resize 1242 2436
npx sharp-cli -i logo.svg -o favicon.png resize 192 192
```

### Caminho profissional

Brief este arquivo pra um designer; pague R$ 200-500 num freelancer pra entregar os 4 arquivos com lockup de marca consistente.

## Validação

Depois de adicionar os 4 arquivos:

```bash
pnpm --filter @milsaca/mobile lint
pnpm --filter @milsaca/mobile type-check
npx expo prebuild --clean   # opcional — gera ios/ e android/ pra inspecionar
```

Os assets entram no bundle automaticamente via `assetBundlePatterns: ["**/*"]`.

## Versionamento

Quando atualizar identidade visual (rebranding etc), bump da versão
em `app.json` é obrigatório:

```diff
- "version": "0.1.0"
+ "version": "0.2.0"
```

EAS Build auto-incrementa `ios.buildNumber` e `android.versionCode`
quando rodar `production` profile (config `autoIncrement: true` em `eas.json`).
