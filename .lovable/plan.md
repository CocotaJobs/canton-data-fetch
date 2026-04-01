

# Redesign da Interface - Novo Design System

## Resumo

Aplicar o novo design system com paleta quente (beige/cream), cards arredondados (24px), tipografia Inter, e estilo de dashboard moderno e amigável em toda a aplicação.

## Alterações

### 1. Atualizar CSS Variables e Tema (`src/index.css`)
- Trocar toda a paleta de cores para o novo esquema:
  - Background: `#E8E3D8` (warm beige)
  - Surface/Card: `#FFFFFF`
  - Primary: `#2D2D2D` (dark)
  - Secondary/Accent: `#F4D03F` (yellow)
  - Text: `#2D2D2D`, `#666666`, `#999999`
  - Border: `#D4CFC4`
  - Success/Warning/Error atualizados
- Atualizar shadows para os novos valores (softer)
- Remover font Space Grotesk, usar apenas Inter
- Atualizar radius base para 24px

### 2. Atualizar Tailwind Config (`tailwind.config.ts`)
- Remover font-display (Space Grotesk)
- Ajustar font-family para Inter only
- Atualizar border-radius tokens (lg: 24px, md: 20px, sm: 16px)

### 3. Atualizar Componentes UI Base
- **Button** (`src/components/ui/button.tsx`): radius 20px, primary com bg `#2D2D2D`, secondary com bg `#F4D03F`
- **Card** (`src/components/ui/card.tsx`): radius 24px, sem border, shadow suave, padding 20px
- **Input** (`src/components/ui/input.tsx`): radius 16px, border `#D4CFC4`
- **Badge** (`src/components/ui/badge.tsx`): radius 20px

### 4. Atualizar DashboardHeader
- Background warm, remover gradient-primary do logo
- Usar estilo dark chip para nav items ativos
- Tipografia mais leve (h1 weight 400)

### 5. Atualizar Componentes de Página
- **ScrapeControls**: Cards com radius 24px, botões com novo estilo
- **StatsCards**: Cards brancos sem border, shadow suave, radius 24px
- **JobsTable**: Card com radius 24px, estilo de tabela mais clean
- **ExhibitorTable**: Mesmo tratamento
- **CompanyProfileForm**: Card com novo estilo, área de import com fundo amarelo sutil
- **MatchResults**: Cards com novo radius e cores
- **MatchChat**: Bolhas de chat com novo estilo, suggestions como chips dark

### 6. Remover `src/App.css`
- Arquivo legado não utilizado

## Detalhes Técnicos

Cores CSS convertidas para HSL:
- `#E8E3D8` → `40 24% 88%`
- `#2D2D2D` → `0 0% 18%`
- `#F4D03F` → `47 89% 60%`
- `#D4CFC4` → `41 17% 80%`
- `#666666` → `0 0% 40%`
- `#999999` → `0 0% 60%`

Shadows usarão rgba diretamente via custom properties em vez de HSL.

