

# Redesign Elegante - Glassmorphism e Gradientes

## Resumo

Adicionar efeito glassmorphism nos cards e header, background com gradiente animado usando a paleta existente (beige, yellow, dark), e visual mais sofisticado em toda a aplicação.

## Alterações

### 1. Background com gradiente elaborado (`src/index.css`)
- Adicionar gradient mesh no body usando as cores da paleta (beige `#E8E3D8`, yellow `#F4D03F`, warm tones)
- Criar blobs/orbs decorativos com gradientes suaves posicionados com CSS (fixed, z-0)
- Adicionar animação lenta de movimento nos orbs para dar vida ao background

### 2. Glassmorphism nos Cards (`src/components/ui/card.tsx` + `src/index.css`)
- Cards com `backdrop-filter: blur(16px)`, background semi-transparente `rgba(255,255,255,0.7)`, borda sutil `rgba(255,255,255,0.3)`
- Atualizar CSS variables do card para suportar transparência
- Adicionar classe utilitária `.glass` no CSS

### 3. Header com glass effect (`src/components/DashboardHeader.tsx`)
- Header com backdrop-blur, background semi-transparente, border-bottom sutil
- Posição sticky para manter o efeito glass visível durante scroll

### 4. Gradientes nos elementos de destaque
- Logo icon com gradiente (dark → yellow)
- Botões primary com gradiente sutil
- Badges e chips com gradiente
- Stats cards com borda gradiente ou accent gradient sutil

### 5. Pages layout (`src/pages/Index.tsx`, `src/pages/Match.tsx`)
- Adicionar container de orbs decorativos como background layer
- Garantir que o conteúdo fica acima (z-10)

### 6. Componentes menores
- `StatsCards`: glass effect com hover glow
- `MatchChat`: bolhas com glass sutil
- `CompanyProfileForm`: área de import com glass
- `Button`: variant primary com gradiente

## Detalhes Tecnnicos

Background orbs implementados via CSS `::before`/`::after` no body ou via divs fixas nas pages. Gradientes usam as cores existentes da paleta:
- `#E8E3D8` (beige) → `#F4D03F` (yellow) → `#2D2D2D` (dark)
- Opacidades baixas (10-30%) para manter legibilidade

Glass effect: `backdrop-filter: blur(16px); background: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.3);`

