// Conversas page — 3-pane layout
const { useState: useStateConv } = React;

function ConversationsPage() {
  const [filter, setFilter] = useStateConv("aguardando");
  const [selectedId, setSelectedId] = useStateConv("c-002");

  const filters = [
    { id: "aguardando", label: "Em aguardo", icon: "clock" },
    { id: "confirmada", label: "Confirmados", icon: "check" },
    { id: "ativa", label: "Ativos", icon: "chat" },
    { id: "cancelada", label: "Cancelados", icon: "x" },
    { id: "geral", label: "Geral", icon: "users" },
  ];

  const counts = window.MOCK_CONVERSATIONS.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    acc.geral = (acc.geral || 0) + 1;
    return acc;
  }, {});

  const filtered = filter === "geral"
    ? window.MOCK_CONVERSATIONS
    : window.MOCK_CONVERSATIONS.filter(c => c.status === filter);

  const selected = window.MOCK_CONVERSATIONS.find(c => c.id === selectedId) || filtered[0];
  const messages = (window.MOCK_MESSAGES[selected?.id] || []);

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
          <h3>Conversas</h3>
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
      </div>

      <div className="conv-chat">
        {selected && (
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
        )}
      </div>
    </div>
  );
}

window.ConversationsPage = ConversationsPage;
