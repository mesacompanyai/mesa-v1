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
  const rawMemories = conversation?.memories || client?.memories || [];
  return rawMemories
    .map((memory, index) => normalizeMemoryRecord(memory, index, conversation?.id, client?.id, "reservation"))
    .filter(memory => memory.scope === "lifetime");
}

function getFallbackReservationFacts(conversation, client) {
  const rawFacts = conversation?.reservationFacts || client?.reservationFacts || [];
  return rawFacts.map((fact, index) => normalizeMemoryRecord(fact, index, conversation?.id, client?.id, "reservation"));
}

window.MesaMemoryService = {
  async analyzeConversation({ conversation, messages = [], client = null }) {
    const fallbackMemories = getFallbackMemories(conversation, client);
    const fallbackReservationFacts = getFallbackReservationFacts(conversation, client);
    const endpoint = window.MESA_MEMORY_API_URL;

    if (!endpoint) {
      return { memories: fallbackMemories, reservationFacts: fallbackReservationFacts, source: "none" };
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
