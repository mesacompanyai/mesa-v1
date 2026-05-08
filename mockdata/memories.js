// Mockdata + contract: memórias capturadas pelo agente
window.MESA_MEMORY_CATEGORIES = {
  preferencia: { label: "Preferência", icon: "pin" },
  intolerancia: { label: "Intolerância", icon: "milk" },
  restricao: { label: "Restrição", icon: "warning" },
  familia: { label: "Família", icon: "users" },
  nome: { label: "Nome", icon: "person" },
  aniversario: { label: "Aniversário", icon: "cake" },
  data_comemorativa: { label: "Data comemorativa", icon: "calendar" },
  pet: { label: "Pet", icon: "pet" },
  area: { label: "Área", icon: "location" },
  observacao: { label: "Observação", icon: "note" },
};

window.MESA_MEMORY_SCOPE_GUIDANCE = {
  lifetime:
    "Salvar somente relações, preferências, intolerâncias, restrições e hábitos que devem sobreviver a reservas futuras.",
  reservation:
    "Usar para quantidade de pessoas, mesa, área, criança/pet no grupo, comemoração atual e pedidos operacionais desta reserva.",
  examples: [
    { input: "Mesa para 6", scope: "reservation", output: "party: 6" },
    { input: "Grupo com criança", scope: "reservation", output: "children: true" },
    { input: "Mesa para 2, para eu e meu filho", scope: "lifetime", output: "Vem com o filho" },
  ],
};

window.MOCK_MEMORIES_BY_CONVERSATION = {
  "c-001": [
    { id: "mem-001-name", scope: "lifetime", category: "nome", label: "Helena Borges", value: "Helena Borges", source: "profile", confidence: 0.99, capturedAt: "2026-05-08T11:42:00-03:00" },
    { id: "mem-001-pref", scope: "lifetime", category: "preferencia", label: "Prefere mesa próxima à janela", value: "Janela", source: "history", confidence: 0.91, capturedAt: "2026-05-08T11:42:00-03:00" },
    { id: "mem-001-restrict", scope: "lifetime", category: "restricao", label: "Vegetariana", value: "Vegetariana", source: "history", confidence: 0.9, capturedAt: "2026-05-08T11:42:00-03:00" },
  ],
  "c-002": [
    { id: "mem-002-name", scope: "lifetime", category: "nome", label: "Rafael Tavares", value: "Rafael Tavares", source: "conversation", confidence: 0.99, capturedAt: "2026-05-08T11:27:00-03:00" },
  ],
  "c-003": [
    { id: "mem-003-name", scope: "lifetime", category: "nome", label: "Camila Sodré", value: "Camila Sodré", source: "profile", confidence: 0.99, capturedAt: "2026-05-08T10:22:00-03:00" },
    { id: "mem-003-intolerance", scope: "lifetime", category: "intolerancia", label: "Intolerância: Glúten", value: "Glúten", source: "history", confidence: 0.95, capturedAt: "2026-05-08T10:22:00-03:00" },
    { id: "mem-003-note", scope: "lifetime", category: "observacao", label: "Costuma trazer bolo", value: "Bolo em comemorações", source: "history", confidence: 0.86, capturedAt: "2026-05-08T10:22:00-03:00" },
  ],
  "c-004": [
    { id: "mem-004-name", scope: "lifetime", category: "nome", label: "Theo Mascarenhas", value: "Theo Mascarenhas", source: "conversation", confidence: 0.99, capturedAt: "2026-05-08T09:42:00-03:00" },
    { id: "mem-004-son", scope: "lifetime", category: "familia", label: "Vem com o filho", value: "Filho", source: "conversation", confidence: 0.93, capturedAt: "2026-05-08T09:42:00-03:00" },
  ],
  "c-005": [
    { id: "mem-005-name", scope: "lifetime", category: "nome", label: "Marina Queiroga", value: "Marina Queiroga", source: "profile", confidence: 0.99, capturedAt: "2026-05-08T09:11:00-03:00" },
    { id: "mem-005-family", scope: "lifetime", category: "familia", label: "Vem com a filha", value: "Filha", source: "history", confidence: 0.91, capturedAt: "2026-05-08T09:11:00-03:00" },
    { id: "mem-005-pref", scope: "lifetime", category: "preferencia", label: "Pede cadeirão com a filha", value: "Cadeirão", source: "history", confidence: 0.95, capturedAt: "2026-05-08T09:11:00-03:00" },
  ],
  "c-006": [
    { id: "mem-006-name", scope: "lifetime", category: "nome", label: "Otávio Pellegrini", value: "Otávio Pellegrini", source: "profile", confidence: 0.99, capturedAt: "2026-05-07T14:00:00-03:00" },
    { id: "mem-006-restrict", scope: "lifetime", category: "restricao", label: "Sem porco", value: "Sem porco", source: "history", confidence: 0.93, capturedAt: "2026-05-07T14:00:00-03:00" },
    { id: "mem-006-pref", scope: "lifetime", category: "preferencia", label: "Prefere mesa silenciosa", value: "Canto silencioso", source: "history", confidence: 0.88, capturedAt: "2026-05-07T14:00:00-03:00" },
  ],
  "c-007": [
    { id: "mem-007-name", scope: "lifetime", category: "nome", label: "Beatriz Hollanda", value: "Beatriz Hollanda", source: "profile", confidence: 0.99, capturedAt: "2026-05-08T08:55:00-03:00" },
    { id: "mem-007-restrict", scope: "lifetime", category: "restricao", label: "Vegana", value: "Vegana", source: "history", confidence: 0.93, capturedAt: "2026-05-08T08:55:00-03:00" },
    { id: "mem-007-intolerance", scope: "lifetime", category: "intolerancia", label: "Intolerância: Castanhas", value: "Castanhas", source: "history", confidence: 0.95, capturedAt: "2026-05-08T08:55:00-03:00" },
    { id: "mem-007-note", scope: "lifetime", category: "observacao", label: "Checar contaminação cruzada", value: "Contaminação cruzada", source: "history", confidence: 0.84, capturedAt: "2026-05-08T08:55:00-03:00" },
  ],
  "c-008": [
    { id: "mem-008-name", scope: "lifetime", category: "nome", label: "Diego Albuquerque", value: "Diego Albuquerque", source: "profile", confidence: 0.99, capturedAt: "2026-05-07T20:00:00-03:00" },
    { id: "mem-008-area", scope: "lifetime", category: "area", label: "Gosta da área externa", value: "Área externa", source: "history", confidence: 0.82, capturedAt: "2026-05-07T20:00:00-03:00" },
    { id: "mem-008-note", scope: "lifetime", category: "observacao", label: "Sensível ao clima", value: "Oferecer salão se chover", source: "history", confidence: 0.8, capturedAt: "2026-05-07T20:00:00-03:00" },
  ],
  "c-009": [
    { id: "mem-009-name", scope: "lifetime", category: "nome", label: "Vinícius Saldanha", value: "Vinícius Saldanha", source: "profile", confidence: 0.99, capturedAt: "2026-05-07T21:00:00-03:00" },
    { id: "mem-009-area", scope: "lifetime", category: "area", label: "Prefere bar", value: "Bar", source: "history", confidence: 0.91, capturedAt: "2026-05-07T21:00:00-03:00" },
    { id: "mem-009-pref", scope: "lifetime", category: "preferencia", label: "Vinho específico", value: "Vinho específico", source: "history", confidence: 0.88, capturedAt: "2026-05-07T21:00:00-03:00" },
  ],
  "c-010": [
    { id: "mem-010-name", scope: "lifetime", category: "nome", label: "Luísa Cavalcanti", value: "Luísa Cavalcanti", source: "profile", confidence: 0.99, capturedAt: "2026-05-07T19:30:00-03:00" },
    { id: "mem-010-date", scope: "lifetime", category: "data_comemorativa", label: "Aniversário de namoro", value: "Aniversário de namoro", source: "history", confidence: 0.92, capturedAt: "2026-05-07T19:30:00-03:00" },
    { id: "mem-010-pref", scope: "lifetime", category: "preferencia", label: "Gosta de sobremesa com vela", value: "Sobremesa surpresa", source: "history", confidence: 0.9, capturedAt: "2026-05-07T19:30:00-03:00" },
  ],
};

window.MOCK_RESERVATION_FACTS_BY_CONVERSATION = {
  "c-001": [
    { id: "fact-001-party", scope: "reservation", category: "grupo", label: "2 pessoas", value: 2, source: "reservation", confidence: 1 },
    { id: "fact-001-table", scope: "reservation", category: "mesa", label: "Mesa 4", value: "Mesa 4", source: "reservation", confidence: 1 },
  ],
  "c-002": [
    { id: "fact-002-party", scope: "reservation", category: "grupo", label: "4 pessoas", value: 4, source: "conversation", confidence: 0.99 },
    { id: "fact-002-child", scope: "reservation", category: "familia", label: "Grupo com criança", value: "1 criança", source: "conversation", confidence: 0.94 },
    { id: "fact-002-intolerance", scope: "reservation", category: "intolerancia", label: "Lactose na criança", value: "Lactose", source: "conversation", confidence: 0.96 },
    { id: "fact-002-area", scope: "reservation", category: "area", label: "Área externa hoje", value: "Área externa", source: "conversation", confidence: 0.92 },
    { id: "fact-002-pet", scope: "reservation", category: "pet", label: "Cachorro pequeno nesta reserva", value: "Cachorro pequeno", source: "conversation", confidence: 0.88 },
  ],
  "c-003": [
    { id: "fact-003-party", scope: "reservation", category: "grupo", label: "6 pessoas", value: 6, source: "reservation", confidence: 1 },
    { id: "fact-003-birthday", scope: "reservation", category: "aniversario", label: "Aniversário de 32 anos hoje", value: "32 anos", source: "reservation", confidence: 0.9 },
  ],
  "c-004": [
    { id: "fact-004-party", scope: "reservation", category: "grupo", label: "Mesa para 2", value: 2, source: "conversation", confidence: 0.99 },
    { id: "fact-004-table", scope: "reservation", category: "mesa", label: "Mesa 2", value: "Mesa 2", source: "reservation", confidence: 1 },
  ],
  "c-005": [
    { id: "fact-005-party", scope: "reservation", category: "grupo", label: "3 pessoas", value: 3, source: "reservation", confidence: 1 },
    { id: "fact-005-child", scope: "reservation", category: "familia", label: "Criança nesta reserva", value: "Criança de 2 anos", source: "conversation", confidence: 0.91 },
    { id: "fact-005-chair", scope: "reservation", category: "preferencia", label: "Cadeirão nesta reserva", value: "Cadeirão", source: "conversation", confidence: 0.95 },
  ],
};

function normalizeMemoryRecord(memory, index, conversationId, clientId, fallbackScope = "reservation") {
  const scope = memory.scope === "lifetime" ? "lifetime" : fallbackScope;

  return {
    id: memory.id || `mem-${conversationId || clientId || "item"}-${index + 1}`,
    scope,
    category: memory.category || "observacao",
    label: memory.label || memory.value || "Memória capturada",
    value: memory.value || memory.label || "",
    source: memory.source || "conversation",
    confidence: typeof memory.confidence === "number" ? memory.confidence : null,
    capturedAt: memory.capturedAt || new Date().toISOString(),
    saved: scope === "lifetime",
  };
}

function getFallbackMemories(conversation, client) {
  const rawMemories =
    conversation?.memories ||
    client?.memories ||
    window.MOCK_MEMORIES_BY_CONVERSATION[conversation?.id] ||
    [];

  return rawMemories
    .map((memory, index) => normalizeMemoryRecord(memory, index, conversation?.id, client?.id, "reservation"))
    .filter(memory => memory.scope === "lifetime");
}

function getFallbackReservationFacts(conversation, client) {
  const rawFacts =
    conversation?.reservationFacts ||
    client?.reservationFacts ||
    window.MOCK_RESERVATION_FACTS_BY_CONVERSATION[conversation?.id] ||
    [];

  return rawFacts.map((fact, index) => normalizeMemoryRecord(fact, index, conversation?.id, client?.id, "reservation"));
}

window.MesaMemoryService = {
  async analyzeConversation({ conversation, messages = [], client = null }) {
    const fallbackMemories = getFallbackMemories(conversation, client);
    const fallbackReservationFacts = getFallbackReservationFacts(conversation, client);
    const endpoint = window.MESA_MEMORY_API_URL;

    if (!endpoint) {
      return { memories: fallbackMemories, reservationFacts: fallbackReservationFacts, source: "mock" };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation,
          messages,
          client,
          memoryScopeGuidance: window.MESA_MEMORY_SCOPE_GUIDANCE,
        }),
      });

      if (!response.ok) {
        throw new Error(`Memory API returned ${response.status}`);
      }

      const payload = await response.json();
      const rawMemories = Array.isArray(payload?.memories) ? payload.memories : [];
      const rawReservationFacts = Array.isArray(payload?.reservationFacts) ? payload.reservationFacts : [];
      const normalizedRecords = rawMemories.map((memory, index) => normalizeMemoryRecord(memory, index, conversation?.id, client?.id, "reservation"));
      const lifetimeMemories = normalizedRecords.filter(memory => memory.scope === "lifetime");
      const reservationFactsFromMemories = normalizedRecords.filter(memory => memory.scope === "reservation");

      return {
        ...payload,
        memories: lifetimeMemories,
        reservationFacts: [
          ...rawReservationFacts.map((fact, index) => normalizeMemoryRecord(fact, index, conversation?.id, client?.id, "reservation")),
          ...reservationFactsFromMemories,
        ],
        source: "api",
      };
    } catch (error) {
      console.warn("MesaMemoryService fallback:", error);
      return { memories: fallbackMemories, reservationFacts: fallbackReservationFacts, source: "fallback", error };
    }
  },
};
