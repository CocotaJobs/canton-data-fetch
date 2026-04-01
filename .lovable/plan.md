

# Melhorar tratamento do erro "Failed to fetch"

## Problema

Quando `fetch()` falha completamente (sem resposta HTTP), o erro genérico "Failed to fetch" aparece sem indicar a causa. Isso acontece quando:
- `VITE_API_BASE_URL` está vazia ou incorreta
- O servidor não está acessível (ex: testar no preview do Lovable)
- Problema de rede/CORS

## Alteração

### Atualizar `src/lib/ai-match.ts` — catch de network errors

Na função `scrapeWebsite()`, `findMatches()` e `streamChat()`, envolver o `fetch()` em try/catch para capturar erros de rede (que não geram response HTTP) e retornar mensagem descritiva:

```typescript
// Antes do fetch, verificar se API_BASE está configurada
if (!API_BASE) {
  throw new Error("VITE_API_BASE_URL não configurada. Defina nas env vars da Vercel com a URL do seu deploy (ex: https://seu-projeto.vercel.app).");
}

// No catch do fetch
catch (err) {
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    throw new Error(
      `Não foi possível conectar a ${API_BASE}. Verifique: 1) VITE_API_BASE_URL está correta, 2) O deploy da Vercel está ativo, 3) Você não está testando no preview do Lovable (as serverless functions só funcionam na Vercel).`
    );
  }
  throw err;
}
```

### Arquivos alterados
- `src/lib/ai-match.ts` — adicionar validação de `API_BASE` e catch de network errors com mensagens descritivas em `scrapeWebsite()`, `findMatches()` e `streamChat()`

