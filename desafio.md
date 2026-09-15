# Desafio Técnico — React Local-First

## 1. Contexto

Desenvolva uma aplicação web para gestão de pedidos.

A aplicação será utilizada por equipes que trabalham em locais onde a conexão com a internet pode ser instável ou inexistente.

O sistema deverá continuar funcionando mesmo sem conexão e sincronizar os dados automaticamente quando a conexão estiver disponível novamente.

O foco do exercício está em:
- **Gerenciamento de estado**
- **Persistência local** (IndexedDB)
- **Operações offline**
- **Sincronização**
- **Tratamento de conflitos e concorrência**
- **Performance**
- **Organização e qualidade do código**

---

## 2. Tecnologias

### Requisitos Obrigatórios
- **React**
- **TypeScript**
- **Vite**
- **IndexedDB**

### Gerenciamento de Estado
A biblioteca de gerenciamento de estado fica a critério do candidato. Exemplos de opções:
- Redux Toolkit
- Zustand
- Context API
- Outra solução devidamente justificada

*Nota: Para comunicação com a API, poderá ser utilizado `fetch` ou outra biblioteca HTTP de sua escolha.*

---

## 3. Funcionalidades

A aplicação deverá permitir ao usuário:
- Visualizar pedidos
- Criar pedidos
- Editar pedidos
- Alterar o status de um pedido
- Excluir pedidos
- Pesquisar pedidos
- Filtrar pedidos por status
- Ordenar pedidos
- Visualizar os detalhes de um pedido

### Estrutura de Dados do Pedido
Os pedidos deverão possuir, no mínimo, o seguinte formato de tipo:

```typescript
type Order = {
  id: string
  customerId: string
  customerName: string
  status: "pending" | "approved" | "cancelled"
  total: number
  updatedAt: number
  version: number
}
```

---

## 4. Funcionamento Offline

A aplicação **não deverá depender da API** para realizar as operações do usuário.

Quando estiver offline, o usuário deverá continuar podendo:
- Criar pedidos
- Editar pedidos
- Alterar status
- Excluir pedidos
- Consultar pedidos
- Pesquisar e filtrar pedidos

> **Importante:** As alterações realizadas offline deverão ser armazenadas localmente. Ao retornar a conexão, as alterações deverão ser sincronizadas automaticamente.

---

## 5. Persistência

- Os dados deverão ser persistidos utilizando **IndexedDB**.
- Após fechar e abrir novamente o navegador, a aplicação deverá recuperar os dados armazenados localmente.
- A aplicação deverá manter também as operações que ainda não foram sincronizadas.

### Fluxo de Dados

```text
  [ Usuário ]
      ↓
[ Realiza alteração ]
      ↓
 [ Estado local ]
      ↓
  [ IndexedDB ]
      ↓
[ Fila de sincronização ]
      ↓
    [ API ]
```

---

## 6. Sincronização

Implemente um mecanismo responsável por sincronizar as alterações locais com a API.

O sistema deverá considerar e tratar adequadamente:
- Operações pendentes
- Ordem das operações (FIFO / sequencial)
- Falhas de comunicação
- Tentativas novamente (retries)
- Timeout
- Perda de conexão durante a sincronização
- Operações duplicadas
- Recuperação após reload da página
- Operações que falharam

> **Regra de Ouro:** Uma operação não deverá ser perdida caso a aplicação seja fechada antes da sincronização.

---

## 7. Fila de Operações

As operações pendentes deverão ser armazenadas de forma persistente no IndexedDB.

### Estrutura da Operação
Uma operação poderá conter informações semelhantes a:

```typescript
type SyncOperation = {
  id: string
  entity: "order"
  entityId: string
  operation: "create" | "update" | "delete"
  payload: unknown
  createdAt: number
  retryCount: number
  status: "pending" | "processing" | "failed"
}
```

*Nota: A estrutura acima é apenas uma referência. A implementação e o modelo de dados exato ficam a critério do candidato.*

---

## 8. Estados de Sincronização

A interface deverá informar ao usuário o estado atual da sincronização de forma clara.

### Estados Considerados
- `Online`
- `Offline`
- `Syncing`
- `Synced`
- `Failed`
- `Conflict`

### Exemplos de Exibição na Interface (UI)
- **Offline:** `"Offline — 3 alterações aguardando sincronização"`
- **Durante a sincronização:** `"Sincronizando..."`
- **Após concluir:** `"Tudo sincronizado"`
- **Em caso de erro:** `"2 alterações não foram sincronizadas"`

---

## 9. Tratamento de Falhas

A API poderá retornar diferentes tipos de resposta e erros:

| Código / Status | Tipo de Resposta | Comportamento Esperado |
|---|---|---|
| **200** | Sucesso | Operação confirmada e removida da fila. |
| **401** | Não autorizado | Notificar usuário / pausar fila até reautenticação. |
| **409** | Conflito | Acionar estratégia de resolução de conflito. |
| **500** | Erro interno | Reagendar via política de retry. |
| **Timeout** | Tempo limite | Reagendar via política de retry. |
| **Network Error** | Sem conexão | Pausar sincronização até conexão restabelecida. |

### Estratégia de Retry
- Operações que possam ser repetidas deverão possuir uma estratégia de retry.
- A estratégia de retry deverá evitar tentativas excessivas (ex: Backoff Exponencial).

---

## 10. Conflitos

### Cenário Exemplo
1. O pedido possui inicialmente:
   - `status: "pending"`
   - `version: 10`
2. O usuário altera o pedido enquanto está **offline**:
   - `status: "approved"`
   - `version: 10`
3. Enquanto isso, outro usuário altera o mesmo pedido no **servidor**:
   - `status: "cancelled"`
   - `version: 11`
4. Quando a aplicação voltar a sincronizar, o servidor informa que existe um conflito (ex: 409 Conflict).

### Requisito
- Implemente uma estratégia para lidar com esse cenário.
- A estratégia escolhida deverá ser **documentada** no README.

### Possíveis Estratégias (Escolha a seu critério)
- **Server Wins** (Servidor prevalece)
- **Client Wins** (Cliente prevalece)
- **Last Write Wins** (Última escrita prevalece)
- **Versionamento** (Controle por número de versão)
- **Merge** (Fusão de atributos)
- **Resolução Manual** (Interface para o usuário escolher)

---

## 11. Optimistic UI

As alterações realizadas pelo usuário deverão aparecer **imediatamente** na interface antes mesmo da confirmação do servidor.

```text
[ Usuário clica em "Aprovar" ]
              ↓
[ Interface atualiza imediatamente ]
              ↓
[ Alteração é persistida localmente ]
              ↓
[ Operação entra na fila de sync ]
              ↓
  [ Sincronização com servidor ]
```

*Caso a operação não possa ser sincronizada, a aplicação deverá refletir esse estado na UI (rollback ou indicador de erro).*

---

## 12. Performance

A aplicação deverá ser capaz de trabalhar de forma fluida com aproximadamente:
**100.000 pedidos**

### Pontos de Atenção
- Renderização de listas (ex: virtualização de lista)
- Pesquisa e Filtros
- Ordenação
- Acesso e consultas ao IndexedDB
- Gerenciamento de Memória
- Atualizações de estado no React
- Processamento em lote das operações de sincronização

*Nota: Não é necessário carregar todos os 100.000 registros simultaneamente no DOM da interface, devendo a solução adotar uma estratégia adequada para grandes volumes de dados.*

---

## 13. Gerenciamento de Estado

A aplicação deverá possuir uma arquitetura clara de gerenciamento de estado. Separe adequadamente, quando necessário:

- **UI State** (ex: Modal aberto, filtro selecionado, campo de pesquisa, página atual)
- **Domain State** (ex: Lista de pedidos, detalhes do pedido selecionado)
- **Persistent State** (ex: Dados no IndexedDB)
- **Sync State** (ex: Pending, Syncing, Synced, Failed, Conflict)
- **Derived State** (ex: Contagem de pedidos por status, lista filtrada)

*A solução escolhida para separar e gerenciar esses estados deverá ser documentada.*

---

## 14. Testes

Implemente testes automatizados para as principais regras de negócio da aplicação, com atenção especial ao mecanismo de sincronização.

### Cenários Mínimos a Testar
- Criar operação offline
- Persistir operação no IndexedDB
- Recuperar operações após reload da página
- Sincronizar operação com sucesso
- Retry automático após falha temporária
- Tratar timeout e perda de conexão
- Prevenir operações duplicadas
- Identificar e tratar conflitos (409)
- Recuperação graciosa após erro

---

## 15. Estrutura do Projeto

A organização do projeto fica a critério do candidato, mas deverá demonstrar:
- **Manutenção** simples
- **Testabilidade** elevada
- **Separação de responsabilidades** (ex: Clean Architecture / Feature Modules / Layered Architecture)
- Facilidade para **evolução da aplicação**
- **Reutilização de código**

---

## 16. Entrega

O repositório do projeto deverá conter:
- [x] Código fonte completo
- [x] `README.md` com:
  - Instruções claras para execução do projeto
  - Instruções para execução dos testes
  - Descrição detalhada da arquitetura
  - Estratégia de persistência local (IndexedDB)
  - Estratégia de sincronização e fila
  - Estratégia utilizada para resolução de conflitos
  - Decisões técnicas relevantes e justificativas
- [x] Aplicação totalmente funcional executando localmente

---

## 17. Cenário para Validação

A aplicação será avaliada executando o seguinte fluxo de teste:

1. Usuário acessa a aplicação.
2. Usuário carrega os pedidos da API.
3. Usuário simula perda de conexão (Offline).
4. Usuário cria um novo pedido.
5. Usuário altera um pedido existente.
6. Usuário altera o status de um pedido.
7. Usuário fecha o navegador (ou atualiza a aba).
8. Usuário abre novamente a aplicação.
9. **Validação:** Os dados continuam disponíveis localmente.
10. **Validação:** As operações continuam na fila, pendentes de sincronização.
11. A conexão com a internet retorna (Online).
12. A aplicação inicia a sincronização automática.
13. Uma das operações retorna erro `409 Conflict`.
14. A aplicação identifica o conflito adequadamente.
15. As demais operações continuam sendo processadas na fila.
16. O usuário consegue identificar visualmente o conflito na interface.
17. Após a resolução do conflito, a aplicação retorna ao estado totalmente sincronizado.

---

## 18. Bônus (Opcionais)

Implementações adicionais que valorizam a solução:
- Suporte a múltiplas abas com sincronização em tempo real (`BroadcastChannel`)
- Sincronização em segundo plano via `Background Sync` (Service Workers)
- Paginação e/ou Virtualização de lista (`react-window` / `tanstack-virtual`)
- Estratégia avançada de retry (Exponential Backoff + Jitter)
- Controle fino de versões (Vector Clocks / Optimistic Locking)
- Métricas de desempenho e status da sincronização
- Logs estruturados
- Testes de integração e E2E (Cypress / Playwright)
- Acessibilidade (WCAG / ARIA)

---

## 19. Prazo & Prioridades

- **Tempo sugerido:** 4 horas.
- **Nota:** O candidato não é obrigado a implementar todos os itens do desafio no tempo sugerido.

### Prioridades Principais
1. Persistência local (IndexedDB)
2. Gerenciamento de estado limpo
3. Operações offline funcionais
4. Fila de sincronização resiliente
5. Recuperação após falhas e reload
6. Tratamento de conflitos
7. Qualidade, clareza e estrutura do código