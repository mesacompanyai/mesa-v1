// Conversas page — 3-pane layout
const { useEffect: useEffectConv, useState: useStateConv } = React;

function ClientsModal({ clients, selectedConversationId, onClose }) {
  const currentClient = clients.find(client => client.conversationId === selectedConversationId);
  const [query, setQuery] = useStateConv("");
  const [selectedClientId, setSelectedClientId] = useStateConv(() => currentClient?.id || clients[0]?.id || null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredClients = clients.filter(client => {
    const searchable = `${client.name} ${client.phone} ${client.lastContact}`.toLowerCase();
    return searchable.includes(normalizedQuery);
  });
  const selectedClient = clients.find(client => client.id === selectedClientId) || filteredClients[0] || clients[0];
  const clientCountLabel = clients.length === 1 ? "cliente cadastrado" : "clientes cadastrados";

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-card clients-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clients-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="clients-modal-header">
          <div>
            <h3 id="clients-modal-title">Clientes</h3>
            <div className="modal-subtitle">
              {clients.length} {clientCountLabel} com histórico de mensagens e reservas.
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="clients-modal-body">
          <aside className="clients-list-panel">
            <div className="clients-search">
              <Icon name="search" size={13} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente ou telefone"
              />
            </div>

            <div className="clients-list">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  className={`client-list-item ${selectedClient?.id === client.id ? "active" : ""}`}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <div className="conv-item-avatar">{client.initials}</div>
                  <div className="client-list-main">
                    <div className="client-list-row">
                      <span className="client-list-name">{client.name}</span>
                      <span className="client-list-last">{client.lastContact}</span>
                    </div>
                    <div className="client-list-phone">{client.phone}</div>
                  </div>
                </button>
              ))}

              {!filteredClients.length && (
                <div className="clients-empty">
                  Nenhum cliente encontrado para esta busca.
                </div>
              )}
            </div>
          </aside>

          <section className="client-profile">
            {selectedClient ? (
              <>
                <div className="client-profile-hero">
                  <div className="conv-item-avatar client-profile-avatar">{selectedClient.initials}</div>
                  <div className="client-profile-main">
                    <h2>{selectedClient.name}</h2>
                    <div className="client-profile-sub">
                      <Icon name="phone" size={13} />
                      {selectedClient.phone}
                    </div>
                    <div className="client-profile-sub">
                      <Icon name="chat" size={13} />
                      Último contato {selectedClient.lastContact}
                    </div>
                  </div>
                </div>

                <div className="client-profile-stats">
                  <div className="client-profile-stat">
                    <span>Reservas</span>
                    <strong>{selectedClient.reservationHistory.length}</strong>
                  </div>
                  <div className="client-profile-stat">
                    <span>Último grupo</span>
                    <strong>{selectedClient.reservationHistory[0]?.party || 0} pessoas</strong>
                  </div>
                  <div className="client-profile-stat">
                    <span>Preferências</span>
                    <strong>{selectedClient.preferences.length}</strong>
                  </div>
                </div>

                <div className="client-profile-section">
                  <h4>Preferências do cliente</h4>
                  <div className="detail-tags">
                    {selectedClient.preferences.map(preference => (
                      <span className="tag" key={preference}>{preference}</span>
                    ))}
                  </div>
                </div>

                <div className="client-profile-section">
                  <h4>Observações</h4>
                  <div className="observation">{selectedClient.notes}</div>
                </div>

                <div className="client-profile-section">
                  <h4>Histórico de reservas</h4>
                  <div className="client-history-list">
                    {selectedClient.reservationHistory.map(reservation => (
                      <div className="client-history-item" key={reservation.id}>
                        <div className="client-history-time">
                          <strong>{reservation.date}</strong>
                          <span>{reservation.time}</span>
                        </div>
                        <div className="client-history-main">
                          <div className="client-history-top">
                            <div className="client-history-party">
                              <Icon name="users" size={13} />
                              {reservation.party} pessoas
                            </div>
                            <StatusPill status={reservation.status} />
                          </div>
                          <div className="client-history-place">
                            {reservation.table} · {reservation.area}
                          </div>
                          <div className="client-history-notes">{reservation.notes}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="clients-empty">
                Nenhum cliente cadastrado.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const MEMORY_CATEGORY_FALLBACKS = {
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

function getMemoryMeta(category) {
  return window.MESA_MEMORY_CATEGORIES?.[category] || MEMORY_CATEGORY_FALLBACKS[category] || MEMORY_CATEGORY_FALLBACKS.observacao;
}

function getStoredMemories(conversation, client) {
  if (!conversation) return [];
  const storedMemories = conversation.memories || client?.memories || [];
  return storedMemories.filter(memory => memory.scope === "lifetime");
}

function persistCapturedMemories(conversation, client, memories) {
  if (!Array.isArray(memories)) return;
  const lifetimeMemories = memories.filter(memory => memory.scope === "lifetime");
  if (conversation) conversation.memories = lifetimeMemories;
  if (client) client.memories = lifetimeMemories;
}

function persistCapturedReservationFacts(conversation, client, reservationFacts) {
  if (!Array.isArray(reservationFacts)) return;
  if (conversation) conversation.reservationFacts = reservationFacts;
  if (client) client.reservationFacts = reservationFacts;
}

function ConversationMemoryTags({ memories, loading, apiError }) {
  const visibleMemories = Array.isArray(memories)
    ? memories.filter(memory => memory.scope === "lifetime")
    : [];
  const hasMemories = visibleMemories.length > 0;

  return (
    <div className={`conv-memory-strip ${!hasMemories ? "empty" : ""}`} aria-label="Memórias capturadas">
      <div className="conv-memory-title">
        <Icon name="ai" size={12} />
        <span>Memória</span>
      </div>

      <div className="conv-memory-tags">
        {hasMemories ? (
          visibleMemories.map(memory => {
            const meta = getMemoryMeta(memory.category);
            const confidenceLabel = typeof memory.confidence === "number"
              ? ` · confiança ${Math.round(memory.confidence * 100)}%`
              : "";
            return (
              <span
                className={`memory-tag memory-tag-${memory.category || "observacao"}`}
                key={memory.id || `${memory.category}-${memory.label}`}
                title={`${meta.label}${confidenceLabel}`}
              >
                <Icon name={meta.icon} size={11} />
                {memory.label || memory.value || "Memória capturada"}
              </span>
            );
          })
        ) : (
          <span className="conv-memory-empty">
            {loading ? "Analisando conversa…" : "Nenhuma memória capturada"}
          </span>
        )}

        {loading && hasMemories && (
          <span className="memory-tag memory-tag-loading">
            <Icon name="clock" size={11} />
            Analisando
          </span>
        )}

        {apiError && (
          <span className="memory-tag memory-tag-fallback" title="Falha na API de memória; usando dados locais">
            <Icon name="warning" size={11} />
            Fallback local
          </span>
        )}
      </div>
    </div>
  );
}

function ConversationsPage({
  conversations = [],
  messagesByConversation = {},
} = {}) {
  const [filter, setFilter] = useStateConv("aguardando");
  const [selectedId, setSelectedId] = useStateConv(null);
  const [clientsModalOpen, setClientsModalOpen] = useStateConv(false);
  const [memoryState, setMemoryState] = useStateConv({
    conversationId: null,
    memories: [],
    reservationFacts: [],
    loading: false,
    apiError: false,
  });

  const filters = [
    { id: "aguardando", label: "Em aguardo", icon: "clock" },
    { id: "confirmada", label: "Confirmados", icon: "check" },
    { id: "ativa", label: "Ativos", icon: "chat" },
    { id: "cancelada", label: "Cancelados", icon: "x" },
    { id: "geral", label: "Geral", icon: "users" },
  ];

  const counts = conversations.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    acc.geral = (acc.geral || 0) + 1;
    return acc;
  }, {});

  const filtered = filter === "geral"
    ? conversations
    : conversations.filter(c => c.status === filter);

  const selected = conversations.find(c => c.id === selectedId) || filtered[0] || null;
  const messages = selected ? (messagesByConversation[selected.id] || []) : [];
  const selectedClient = null;
  const fallbackMemories = getStoredMemories(selected, selectedClient);
  const displayedMemories = memoryState.conversationId === selected?.id ? memoryState.memories : fallbackMemories;

  useEffectConv(() => {
    if (!selected && selectedId !== null) {
      setSelectedId(null);
      return;
    }

    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected?.id, selectedId]);

  useEffectConv(() => {
    if (!selected) return undefined;

    let cancelled = false;
    const initialMemories = getStoredMemories(selected, selectedClient);

    setMemoryState({
      conversationId: selected.id,
      memories: initialMemories,
      reservationFacts: [],
      loading: true,
      apiError: false,
    });

    const memoryService = window.MesaMemoryService;
    if (!memoryService?.analyzeConversation) {
      setMemoryState({
        conversationId: selected.id,
        memories: initialMemories,
        reservationFacts: [],
        loading: false,
        apiError: false,
      });
      return undefined;
    }

    Promise.resolve(memoryService.analyzeConversation({ conversation: selected, messages, client: selectedClient }))
      .then(result => {
        if (cancelled) return;
        const capturedMemories = Array.isArray(result?.memories)
          ? result.memories.filter(memory => memory.scope === "lifetime")
          : initialMemories;
        const reservationFacts = Array.isArray(result?.reservationFacts) ? result.reservationFacts : [];
        persistCapturedMemories(selected, selectedClient, capturedMemories);
        persistCapturedReservationFacts(selected, selectedClient, reservationFacts);
        setMemoryState({
          conversationId: selected.id,
          memories: capturedMemories,
          reservationFacts,
          loading: false,
          apiError: !!result?.error,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setMemoryState({
          conversationId: selected.id,
          memories: initialMemories,
          reservationFacts: [],
          loading: false,
          apiError: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  return (
    <div className="conv-layout" data-screen-label="02 Conversas">
      <aside className="conv-filters">
        <h3 className="conv-filters-title">Status</h3>
        {filters.map(f => (
          <button
            key={f.id}
            className={`conv-filter ${filter === f.id ? "active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            <Icon name={f.icon} size={14} />
            {f.label}
            {counts[f.id] != null && counts[f.id] > 0 && (
              <span className="conv-filter-count">{counts[f.id]}</span>
            )}
          </button>
        ))}
      </aside>

      <div className="conv-list">
        <div className="conv-list-header">
          <div className="conv-list-title-row">
            <h3>Conversas</h3>
            <button
              type="button"
              className="conv-clients-trigger"
              onClick={() => setClientsModalOpen(true)}
              title="Clientes"
            >
              <Icon name="users" size={14} />
              <span>Clientes</span>
            </button>
          </div>
          <div className="conv-list-search">
            <Icon name="search" size={13} />
            <input placeholder="Buscar conversa" />
          </div>
        </div>
        {filtered.map(c => (
          <button
            key={c.id}
            className={`conv-item ${selected?.id === c.id ? "active" : ""}`}
            onClick={() => setSelectedId(c.id)}
          >
            <div className="conv-item-avatar">{c.initials}</div>
            <div className="conv-item-main">
              <div className="conv-item-row1">
                <span className="conv-item-name">{c.name}</span>
                <span className="conv-item-time">{c.time}</span>
              </div>
              <div className="conv-item-row2">
                <span className="conv-item-preview">{c.preview}</span>
                {c.unread > 0 && <span className="conv-item-badge">{c.unread}</span>}
              </div>
            </div>
            <div className="conv-item-side">
              <span
                className="conv-item-status-dot"
                style={{ background: `var(--status-${c.status === "confirmada" ? "confirmed" : c.status === "aguardando" ? "pending" : c.status === "ativa" ? "active" : "cancelled"})` }}
              />
            </div>
          </button>
        ))}
        {!filtered.length && (
          <div className="conv-empty-list">
            <Icon name="chat" size={18} />
            <div>
              <div className="conv-empty-title">Nenhuma conversa</div>
              <div className="conv-empty-sub">Clientes, perfis e reservas permanecem salvos.</div>
            </div>
          </div>
        )}
      </div>

      <div className="conv-chat">
        {selected ? (
          <>
            <div className="conv-chat-header">
              <div className="conv-chat-header-main">
                <div className="conv-item-avatar" style={{ width: 38, height: 38 }}>{selected.initials}</div>
                <div>
                  <div className="conv-chat-header-name">{selected.name}</div>
                  <div className="conv-chat-header-sub">WhatsApp · última atividade {selected.time}</div>
                </div>
              </div>
              <StatusPill status={selected.status} />
            </div>

            {selected.summary && (
              <div className="conv-summary">
                <div className="conv-summary-item">
                  <Icon name="calendar" size={13} />
                  <span className="conv-summary-label">Data</span>
                  <strong>{selected.summary.date} · {selected.summary.time}</strong>
                </div>
                <div className="conv-summary-item">
                  <Icon name="users" size={13} />
                  <span className="conv-summary-label">Pessoas</span>
                  <strong>{selected.summary.party}</strong>
                </div>
                <div className="conv-summary-item">
                  <Icon name="table" size={13} />
                  <span className="conv-summary-label">Mesa</span>
                  <strong>{selected.summary.table}</strong>
                </div>
                <div className="conv-summary-item">
                  <Icon name="location" size={13} />
                  <span className="conv-summary-label">Área</span>
                  <strong>{selected.summary.area}</strong>
                </div>
              </div>
            )}

            <ConversationMemoryTags
              memories={displayedMemories}
              loading={memoryState.conversationId === selected.id && memoryState.loading}
              apiError={memoryState.conversationId === selected.id && memoryState.apiError}
            />

            {selected.offScript && (
              <div className="conv-offscript-banner">
                <span className="conv-offscript-banner-icon"><Icon name="warning" size={15} /></span>
                <div>
                  <strong>Conversa fora do roteiro.</strong>{" "}
                  <span style={{ color: "var(--text-2)" }}>Aguardando resposta da equipe.</span>
                </div>
              </div>
            )}

            <div className="conv-messages">
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 12.5, padding: 40 }}>
                  Selecione esta conversa para ver as mensagens completas.
                </div>
              )}
              {messages.map(m => {
                if (m.from === "system") {
                  return (
                    <div key={m.id} className="msg-row system">
                      <div className="msg system">{m.text}</div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`msg-row ${m.from}`}>
                    <div className="msg-meta-row">
                      <div className={`msg ${m.from}`}>
                        {m.from === "team" && <div className="msg-team-tag">Equipe · Mariana</div>}
                        {m.text}
                      </div>
                      <div className="msg-time">{m.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="conv-composer">
              <button className="icon-btn" title="Anexar"><Icon name="paperclip" size={15} /></button>
              <textarea className="conv-composer-input" placeholder="Responder como equipe…" rows={1} />
              <button className="icon-btn icon-btn-primary" title="Enviar"><Icon name="send" size={14} /></button>
            </div>
          </>
        ) : (
          <div className="conv-chat-empty">
            <Icon name="chat" size={22} />
            <div className="conv-empty-title">Nenhuma conversa selecionada</div>
            <div className="conv-empty-sub">Os clientes cadastrados continuam disponíveis.</div>
          </div>
        )}
      </div>

      {clientsModalOpen && (
        <ClientsModal
          clients={[]}
          selectedConversationId={selected?.id}
          onClose={() => setClientsModalOpen(false)}
        />
      )}
    </div>
  );
}

window.ConversationsPage = ConversationsPage;
