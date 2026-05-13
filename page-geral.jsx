// Geral page — 4 sub-areas
const { useEffect: useEffectGeral, useRef: useRefGeral, useState: useStateGeral } = React;

function GeralAI({ tables, onCreateTable, onUpdateTable, onDeleteTable, restaurantConfig, onRestaurantChange = () => {} }) {
  const r = restaurantConfig || {};
  const settings = r.settings || {};
  const characteristics = settings.characteristics || {};
  const businessDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const findBusinessHour = (hours, day) => (hours || []).find(item => item.day === day || (day === "Sáb" && item.day === "Sab"));
  const [description, setDescription] = useStateGeral(() => r.description || window.MOCK_RESTAURANT_DESCRIPTION || "");
  const [questions, setQuestions] = useStateGeral(() => (r.aiGuide?.topics || window.MOCK_AI_QUESTIONS || []).map(q => ({ fixed: true, ...q })));
  const [autonomy, setAutonomy] = useStateGeral(settings.autonomy || "media");
  const [teamContactTriggers, setTeamContactTriggers] = useStateGeral(() => ({
    waitingCustomer: true,
    reservationScheduled: true,
    reservationArriving: true,
    reservationCancelled: true,
    ...(settings.teamContactTriggers || {}),
  }));
  const [businessHours, setBusinessHours] = useStateGeral(() => businessDays.map(day => ({
    day,
    enabled: !!findBusinessHour(r.businessHours, day)?.enabled,
    open: findBusinessHour(r.businessHours, day)?.open || "12:00",
    close: findBusinessHour(r.businessHours, day)?.close || "23:30",
  })));
  const [menuFiles, setMenuFiles] = useStateGeral([]);
  const [canSendMenuFiles, setCanSendMenuFiles] = useStateGeral(settings.menuSettings?.canSendFiles ?? true);
  const [menuSendMode, setMenuSendMode] = useStateGeral(settings.menuSettings?.sendMode || "on_request");
  const [editingId, setEditingId] = useStateGeral(null);
  const [draftLabel, setDraftLabel] = useStateGeral("");
  const [draggingId, setDraggingId] = useStateGeral(null);
  const dragSourceRef = useRefGeral(null);
  const dragTargetRef = useRefGeral(null);
  const guideListRef = useRefGeral(null);
  const menuFileInputRef = useRefGeral(null);

  useEffectGeral(() => {
    setDescription(r.description || "");
    setQuestions((r.aiGuide?.topics || window.MOCK_AI_QUESTIONS || []).map(q => ({ fixed: true, ...q })));
    setAutonomy(settings.autonomy || "media");
    setTeamContactTriggers({
      waitingCustomer: true,
      reservationScheduled: true,
      reservationArriving: true,
      reservationCancelled: true,
      ...(settings.teamContactTriggers || {}),
    });
    setBusinessHours(businessDays.map(day => {
      const row = findBusinessHour(r.businessHours, day);
      return { day, enabled: !!row?.enabled, open: row?.open || "12:00", close: row?.close || "23:30" };
    }));
    setCanSendMenuFiles(settings.menuSettings?.canSendFiles ?? true);
    setMenuSendMode(settings.menuSettings?.sendMode || "on_request");
  }, [r.id]);

  const updateQuestions = (updater) => {
    setQuestions(qs => {
      const next = typeof updater === "function" ? updater(qs) : updater;
      onRestaurantChange({ aiGuide: { topics: next } });
      return next;
    });
  };
  const toggleQ = (id) => updateQuestions(qs => qs.map(q => q.id === id ? { ...q, enabled: !q.enabled } : q));
  const toggleTeamContact = (id) => {
    setTeamContactTriggers(triggers => {
      const next = { ...triggers, [id]: !triggers[id] };
      onRestaurantChange({ settings: { teamContactTriggers: next } });
      return next;
    });
  };
  const updateBusinessHours = (day, patch) => {
    setBusinessHours(hours => {
      const next = hours.map(item => item.day === day ? { ...item, ...patch } : item);
      onRestaurantChange({ businessHours: next });
      return next;
    });
  };
  const updateCharacteristics = (field, value) => {
    onRestaurantChange({
      settings: {
        characteristics: {
          ...characteristics,
          [field]: value,
        },
      },
    });
  };
  const updateAutonomy = (nextAutonomy) => {
    setAutonomy(nextAutonomy);
    onRestaurantChange({ settings: { autonomy: nextAutonomy } });
  };
  const updateMenuSettings = (patch) => {
    const next = {
      canSendFiles: canSendMenuFiles,
      sendMode: menuSendMode,
      ...patch,
    };
    if (Object.prototype.hasOwnProperty.call(patch, "canSendFiles")) setCanSendMenuFiles(next.canSendFiles);
    if (Object.prototype.hasOwnProperty.call(patch, "sendMode")) setMenuSendMode(next.sendMode);
    onRestaurantChange({ settings: { menuSettings: next } });
  };
  const addMenuFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const createdAt = Date.now();

    setMenuFiles(current => [
      ...current,
      ...files.map((file, i) => ({
        id: `${createdAt}-${file.name}-${file.size}-${file.lastModified || 0}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    ]);
    e.target.value = "";
  };
  const removeMenuFile = (id) => {
    setMenuFiles(files => files.filter(file => file.id !== id));
  };
  const formatFileSize = (size) => {
    if (!size) return "0 KB";
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };
  const getFileKind = (file) => {
    const name = file.name.toLowerCase();
    if (file.type.startsWith("image/")) return "Imagem";
    if (name.endsWith(".pdf")) return "PDF";
    if (name.endsWith(".doc") || name.endsWith(".docx")) return "Word";
    if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "Excel";
    if (name.endsWith(".txt")) return "TXT";
    return "Arquivo";
  };
  const startEdit = (q) => {
    if (q.fixed) return;
    setEditingId(q.id);
    setDraftLabel(q.label);
  };
  const addTopic = () => {
    if (editingId) return;
    const id = `extra-${Date.now()}`;
    updateQuestions(qs => [...qs, { id, label: "", enabled: true, required: false, fixed: false }]);
    setEditingId(id);
    setDraftLabel("");
  };
  const commitTopic = (id) => {
    const label = draftLabel.trim();
    if (!label) return;
    updateQuestions(qs => qs.map(q => q.id === id ? { ...q, label } : q));
    setEditingId(null);
    setDraftLabel("");
  };
  const cancelEdit = (id) => {
    updateQuestions(qs => qs.filter(q => q.fixed || q.id !== id || q.label.trim()));
    setEditingId(null);
    setDraftLabel("");
  };
  const removeTopic = (id) => updateQuestions(qs => qs.filter(q => q.fixed || q.id !== id));
  const moveTopic = (targetId, sourceId = draggingId) => {
    if (!sourceId || sourceId === targetId) return;
    updateQuestions(qs => {
      const from = qs.findIndex(q => q.id === sourceId);
      const to = qs.findIndex(q => q.id === targetId);
      if (from < 0 || to < 0) return qs;
      const next = [...qs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const startDrag = (id) => {
    if (editingId) return;
    dragSourceRef.current = id;
    dragTargetRef.current = id;
    setDraggingId(id);
  };
  const finishDrag = () => {
    dragSourceRef.current = null;
    dragTargetRef.current = null;
    setDraggingId(null);
  };
  const teamContactOptions = [
    {
      id: "waitingCustomer",
      title: "Cliente aguardando resposta",
      desc: "IA avisa a equipe com a dúvida que não conseguiu resolver. A equipe pode responder no WhatsApp dela para a IA interpretar e responder o cliente, ou responder direto no WhatsApp da empresa.",
    },
    {
      id: "reservationScheduled",
      title: "Reserva agendada",
      desc: "Avisa nome(s), quantidade de pessoas e observações como pets, restrições alimentares e preferência de mesa.",
    },
    {
      id: "reservationArriving",
      title: "Reserva chegando",
      desc: "Lembra a equipe quando o horário da reserva estiver se aproximando, com reserva, horário, nome(s) e quantidade de pessoas.",
    },
    {
      id: "reservationCancelled",
      title: "Reserva cancelada",
      desc: "Informa qual reserva foi cancelada e suas especificações.",
    },
  ];

  useEffectGeral(() => {
    if (!draggingId) return undefined;

    const handlePointerMove = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = el && el.closest ? el.closest("[data-topic-id]") : null;
      if (!row || !guideListRef.current || !guideListRef.current.contains(row)) return;

      const targetId = row.getAttribute("data-topic-id");
      if (!targetId || targetId === dragTargetRef.current) return;

      dragTargetRef.current = targetId;
      moveTopic(targetId, dragSourceRef.current);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", finishDrag);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", finishDrag);
    };
  }, [draggingId]);

  return (
    <div className="geral-content-inner">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inteligência Artificial</h1>
          <div className="page-subtitle">Comportamento da recepcionista virtual</div>
        </div>
      </div>

      <div className="section-card">
        <h2>Conte um pouco sobre seu restaurante</h2>
        <div className="section-card-subtitle">Descreva a casa, o estilo de atendimento, ambiente e detalhes que ajudam a IA a entender o estabelecimento</div>
        <textarea
          className="field-textarea"
          value={description}
          rows={7}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => onRestaurantChange({ description })}
        />
      </div>

      <div className="section-card">
        <h2>Guia de Atendimento</h2>
        <div className="section-card-subtitle">Organize os tópicos que a IA deve seguir durante o atendimento. A ordem importa.</div>
        <div className="ai-question-list" ref={guideListRef}>
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`ai-question ${draggingId === q.id ? "dragging" : ""} ${editingId === q.id ? "editing" : ""}`}
              data-topic-id={q.id}
            >
              <span
                className="ai-question-handle"
                onPointerDown={(e) => {
                  e.preventDefault();
                  startDrag(q.id);
                }}
              >
                <Icon name="drag" size={14} />
              </span>
              <span className="ai-question-num">{String(i + 1).padStart(2, "0")}</span>
              {editingId === q.id ? (
                <input
                  className="ai-question-input"
                  autoFocus
                  value={draftLabel}
                  placeholder="Nome do tópico"
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTopic(q.id);
                    if (e.key === "Escape") cancelEdit(q.id);
                  }}
                />
              ) : (
                <span className="ai-question-label">{q.label}</span>
              )}
              {q.required && <span className="ai-question-required">obrigatória</span>}
              {!q.required && q.fixed && <span className="ai-question-required">fixo</span>}
              {!q.fixed && (
                <div className="ai-question-actions">
                  {editingId === q.id ? (
                    <>
                      <button className="ai-question-action" onClick={() => commitTopic(q.id)} disabled={!draftLabel.trim()} title="Salvar tópico">
                        <Icon name="check" size={13} />
                      </button>
                      <button className="ai-question-action" onClick={() => cancelEdit(q.id)} title="Cancelar edição">
                        <Icon name="x" size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="ai-question-action" onClick={() => startEdit(q)} title="Editar tópico">
                        <Icon name="edit" size={13} />
                      </button>
                      <button className="ai-question-action" onClick={() => removeTopic(q.id)} title="Remover tópico">
                        <Icon name="x" size={13} />
                      </button>
                    </>
                  )}
                </div>
              )}
              <label className="toggle">
                <input type="checkbox" checked={q.enabled} onChange={() => toggleQ(q.id)} />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
        <button className="ai-question-add" onClick={addTopic} disabled={!!editingId}>
          <Icon name="plus" size={14} />
          Adicionar tópico
        </button>
      </div>

      <div className="section-card">
        <h2>Nível de autonomia</h2>
        <div className="section-card-subtitle">IA precisa seguir este guia à risca</div>
        <div className="autonomy-options">
          {[
            { id: "baixa", label: "Baixa", desc: "Toda resposta criada por IA deve passar por confirmação do usuário." },
            { id: "media", label: "Média", desc: "Responde apenas introduções básicas e segue à risca o Guia de Atendimento. Perguntas fora do guia ficam aguardando resposta." },
            { id: "alta",  label: "Alta",  desc: "Responde tudo sozinha, seguindo o guia de atendimento e o que sabe sobre o restaurante." },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => updateAutonomy(opt.id)}
              className={`autonomy-option ${autonomy === opt.id ? "active" : ""}`}
            >
              <div className="autonomy-option-title">{opt.label}</div>
              <div className="autonomy-option-desc">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h2>Contatar Equipe</h2>
        <div className="section-card-subtitle">Quando a IA deve avisar a equipe pelo WhatsApp</div>
        {teamContactOptions.map(opt => (
          <div className="row-flex" key={opt.id}>
            <div className="row-flex-main">
              <div className="row-flex-title">{opt.title}</div>
              <div className="row-flex-sub">{opt.desc}</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={teamContactTriggers[opt.id]}
                onChange={() => toggleTeamContact(opt.id)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      <div className="section-card">
        <h2>Características do restaurante</h2>
        <div className="section-card-subtitle">Informações usadas pela IA durante o atendimento</div>
        <div className="row-flex">
          <div className="row-flex-main">
            <div className="row-flex-title">Pet friendly</div>
            <div className="row-flex-sub">Aceita animais de estimação</div>
          </div>
          <label className="toggle"><input type="checkbox" checked={!!characteristics.petFriendly} onChange={(e) => updateCharacteristics("petFriendly", e.target.checked)} /><span className="toggle-slider"/></label>
        </div>
        <div className="row-flex">
          <div className="row-flex-main">
            <div className="row-flex-title">Área externa</div>
            <div className="row-flex-sub">Possui mesas ao ar livre</div>
          </div>
          <label className="toggle"><input type="checkbox" checked={!!characteristics.outdoor} onChange={(e) => updateCharacteristics("outdoor", e.target.checked)} /><span className="toggle-slider"/></label>
        </div>
        <div className="row-flex">
          <div className="row-flex-main">
            <div className="row-flex-title">Alto padrão</div>
            <div className="row-flex-sub">Estilo de atendimento mais formal</div>
          </div>
          <label className="toggle"><input type="checkbox" checked={!!characteristics.highEnd} onChange={(e) => updateCharacteristics("highEnd", e.target.checked)} /><span className="toggle-slider"/></label>
        </div>
        <div className="row-flex">
          <div className="row-flex-main">
            <div className="row-flex-title">Aceita aniversários</div>
            <div className="row-flex-sub">Permite bolo, decoração simples e velas</div>
          </div>
          <label className="toggle"><input type="checkbox" checked={!!characteristics.birthdays} onChange={(e) => updateCharacteristics("birthdays", e.target.checked)} /><span className="toggle-slider"/></label>
        </div>
      </div>

      <div className="section-card">
        <h2>Horário de funcionamento</h2>
        <div className="section-card-subtitle">Defina quando a IA deve considerar o restaurante aberto para atendimento e reservas</div>
        <div className="business-hours-list">
          {businessHours.map(item => (
            <div className={`business-hours-row ${!item.enabled ? "closed" : ""}`} key={item.day}>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={() => updateBusinessHours(item.day, { enabled: !item.enabled })}
                />
                <span className="toggle-slider" />
              </label>
              <div className="business-hours-day">
                <div className="row-flex-title">{item.day}</div>
                <div className="row-flex-sub">{item.enabled ? "Aberto" : "Fechado"}</div>
              </div>
              <div className="business-hours-fields">
                <label>
                  <span>Abre</span>
                  <input
                    className="field-input"
                    type="time"
                    value={item.open}
                    disabled={!item.enabled}
                    onChange={(e) => updateBusinessHours(item.day, { open: e.target.value })}
                  />
                </label>
                <label>
                  <span>Fecha</span>
                  <input
                    className="field-input"
                    type="time"
                    value={item.close}
                    disabled={!item.enabled}
                    onChange={(e) => updateBusinessHours(item.day, { close: e.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h2>Cardápio e arquivos da IA</h2>
            <div className="section-card-subtitle">Anexe materiais para a IA entender melhor o estabelecimento</div>
          </div>
          <button className="btn btn-primary" onClick={() => menuFileInputRef.current?.click()}>
            <Icon name="paperclip" size={13} />
            Anexar cardápio
          </button>
          <input
            ref={menuFileInputRef}
            className="file-input-hidden"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
            onChange={addMenuFiles}
          />
        </div>

        {menuFiles.length ? (
          <div className="menu-file-list">
            {menuFiles.map(file => (
              <div className="menu-file-row" key={file.id}>
                <div className="menu-file-icon"><Icon name="paperclip" size={14} /></div>
                <div className="menu-file-main">
                  <div className="menu-file-name">{file.name}</div>
                  <div className="menu-file-meta">{getFileKind(file)} · {formatFileSize(file.size)}</div>
                </div>
                <button className="menu-file-remove" onClick={() => removeMenuFile(file.id)} title="Remover arquivo">
                  <Icon name="x" size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <button className="menu-file-empty" onClick={() => menuFileInputRef.current?.click()}>
            <Icon name="paperclip" size={18} />
            <div>
              <div className="menu-file-empty-title">Nenhum cardápio anexado</div>
              <div className="menu-file-empty-sub">PDF, Word, Excel, TXT ou fotos do cardápio.</div>
            </div>
          </button>
        )}

        <div className="row-flex menu-permission-row">
          <div className="row-flex-main">
            <div className="row-flex-title">IA pode enviar estes arquivos aos clientes</div>
            <div className="row-flex-sub">Permite que a IA compartilhe o cardápio pelo WhatsApp durante a conversa</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={canSendMenuFiles} onChange={() => updateMenuSettings({ canSendFiles: !canSendMenuFiles })} />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className={`menu-send-options ${!canSendMenuFiles ? "disabled" : ""}`}>
          {[
            { id: "on_request", label: "Quando o cliente pedir", desc: "A IA envia o cardápio apenas quando perguntarem por ele." },
            { id: "default", label: "Por padrão no atendimento", desc: "A IA envia o cardápio espontaneamente durante o fluxo inicial." },
          ].map(opt => (
            <button
              key={opt.id}
              className={`menu-send-option ${menuSendMode === opt.id ? "active" : ""}`}
              disabled={!canSendMenuFiles}
              onClick={() => updateMenuSettings({ sendMode: opt.id })}
            >
              <div className="menu-send-option-title">{opt.label}</div>
              <div className="menu-send-option-desc">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <TablesManager
        tables={tables}
        onCreateTable={onCreateTable}
        onUpdateTable={onUpdateTable}
        onDeleteTable={onDeleteTable}
        variant="section"
      />
    </div>
  );
}

function GeralConexoes({ wppConnected, setWppConnected }) {
  return (
    <div className="geral-content-inner">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conexões</h1>
          <div className="page-subtitle">Canais de comunicação ativos</div>
        </div>
      </div>

      <div className="connection-card">
        <div className="connection-icon"><Icon name="whatsapp" size={32} /></div>
        <div className="connection-main">
          <div className="connection-name">WhatsApp Business</div>
          <div className="connection-sub">
            {wppConnected ? `${window.MOCK_WHATSAPP.number} · Conectado há 14 dias` : "Desconectado · Última conexão há 2 horas"}
          </div>
        </div>
        <StatusPill status={wppConnected ? "confirmada" : "cancelada"} />
        <div className="connection-actions">
          {wppConnected ? (
            <>
              <button className="btn" onClick={() => setWppConnected(false)}>Desconectar</button>
              <button className="btn">Remover</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setWppConnected(true)}>Reconectar</button>
          )}
        </div>
      </div>

      {!wppConnected && (
        <div className="section-card" style={{ marginTop: 12 }}>
          <h2>O que acontece quando o WhatsApp desconecta</h2>
          <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 8px" }}>1. Novas mensagens não chegam até a reconexão.</p>
            <p style={{ margin: "0 0 8px" }}>2. Reservas em andamento ficam pausadas.</p>
            <p style={{ margin: "0 0 8px" }}>3. A equipe recebe um alerta global em todas as páginas.</p>
            <p style={{ margin: 0 }}>4. Histórico de conversas anteriores permanece intacto.</p>
          </div>
        </div>
      )}

      <button className="add-connection">
        <Icon name="plus" size={18} />
        <div>
          <div style={{ fontWeight: 500, color: "var(--text-2)" }}>Adicionar nova conexão</div>
          <div style={{ fontSize: 11.5, marginTop: 2 }}>Instagram, e-mail ou outros canais — em breve</div>
        </div>
      </button>
    </div>
  );
}

function GeralEquipe({ team, onCreateTeamMember, onUpdateTeamMember, onDeleteTeamMember }) {
  return (
    <div className="geral-content-inner">
      <TeamManager
        team={team}
        onCreateTeamMember={onCreateTeamMember}
        onUpdateTeamMember={onUpdateTeamMember}
        onDeleteTeamMember={onDeleteTeamMember}
        variant="section"
      />
    </div>
  );
}

const GERAL_RETENTION_OPTIONS = [
  { preset: "24h", label: "24h" },
  { preset: "7d", label: "7 dias" },
  { preset: "30d", label: "1 mês" },
  { preset: "custom", label: "Personalizado" },
];

function GeralConfig({
  restaurantConfig,
  onRestaurantChange = () => {},
  conversationCount = 0,
  conversationRetention = { preset: "30d", customDays: 30 },
  onRetentionChange = () => {},
  onDeleteAllConversations = () => {},
}) {
  const r = restaurantConfig || window.MOCK_RESTAURANT;
  const [deleteModalOpen, setDeleteModalOpen] = useStateGeral(false);
  const retentionPreset = conversationRetention.preset || "30d";
  const customDays = Math.max(1, Math.floor(Number(conversationRetention.customDays) || 30));
  const conversationCountLabel = conversationCount === 1 ? "conversa armazenada" : "conversas armazenadas";

  const updateRetentionPreset = (preset) => {
    onRetentionChange({ preset, customDays });
  };

  const updateCustomDays = (value) => {
    onRetentionChange({
      preset: "custom",
      customDays: Math.max(1, Math.floor(Number(value) || 1)),
    });
  };

  const confirmDeleteAllConversations = () => {
    onDeleteAllConversations();
    setDeleteModalOpen(false);
  };

  return (
    <>
      <div className="geral-content-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Configurações</h1>
            <div className="page-subtitle">Preferências gerais do sistema</div>
          </div>
        </div>

        <div className="section-card">
          <h2>Informações do restaurante</h2>
          <div className="field">
            <label className="field-label">Nome</label>
            <input
              className="field-input"
              defaultValue={r.name}
              onBlur={(e) => onRestaurantChange({ name: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="field-label">Estilo</label>
            <input
              className="field-input"
              defaultValue={r.style}
              onBlur={(e) => onRestaurantChange({ style: e.target.value })}
            />
          </div>
        </div>

        <div className="section-card">
          <h2>Operação</h2>
          <div className="row-flex">
            <div className="row-flex-main">
              <div className="row-flex-title">Modo piloto</div>
              <div className="row-flex-sub">A IA não confirma reservas automaticamente sem revisão humana</div>
            </div>
            <label className="toggle"><input type="checkbox" defaultChecked={r.pilotMode} /><span className="toggle-slider"/></label>
          </div>
          <div className="row-flex">
            <div className="row-flex-main">
              <div className="row-flex-title">Relatório diário</div>
              <div className="row-flex-sub">Resumo das reservas enviado ao gerente todo dia às 23h59</div>
            </div>
            <label className="toggle"><input type="checkbox" defaultChecked={r.dailyReport} /><span className="toggle-slider"/></label>
          </div>
        </div>

        <div className="section-card danger-zone">
          <h2>Ações sensíveis</h2>
          <div className="section-card-subtitle">Operações irreversíveis. Use com cautela.</div>

          <div className="conversation-retention-panel">
            <div className="row-flex-main">
              <div className="row-flex-title">Apagar conversas automaticamente</div>
              <div className="row-flex-sub">
                Remove apenas chats e mensagens após o período escolhido. Clientes, perfis, características e histórico de reservas NUNCA são apagados por esta regra.
              </div>
            </div>
            <div className="conversation-retention-options" role="group" aria-label="Retenção de conversas">
              {GERAL_RETENTION_OPTIONS.map(option => (
                <button
                  key={option.preset}
                  type="button"
                  className={`retention-option ${retentionPreset === option.preset ? "active" : ""}`}
                  aria-pressed={retentionPreset === option.preset}
                  onClick={() => updateRetentionPreset(option.preset)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {retentionPreset === "custom" && (
              <label className="retention-custom-field">
                <span>Dias</span>
                <input
                  className="field-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customDays}
                  onChange={(e) => updateCustomDays(e.target.value)}
                />
              </label>
            )}
            <div className="retention-current-count">
              {conversationCount} {conversationCountLabel}
            </div>
          </div>

          <div className="row-flex">
            <div className="row-flex-main">
              <div className="row-flex-title">Apagar todas as conversas</div>
              <div className="row-flex-sub">Remove definitivamente todos os chats e mensagens. Clientes, perfis e reservas NUNCA são apagados.</div>
            </div>
            <button
              type="button"
              className="btn btn-danger"
              disabled={!conversationCount}
              onClick={() => setDeleteModalOpen(true)}
            >
              Apagar
            </button>
          </div>
          <div className="row-flex">
            <div className="row-flex-main">
              <div className="row-flex-title">Excluir conta do restaurante</div>
              <div className="row-flex-sub">Encerra a assinatura e remove todos os dados</div>
            </div>
            <button type="button" className="btn">Excluir</button>
          </div>
        </div>
      </div>

      {deleteModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setDeleteModalOpen(false)}>
          <div
            className="modal-card modal-card-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-conversations-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 id="delete-conversations-title">Apagar todas as conversas?</h3>
                <div className="modal-subtitle">Esta ação não pode ser desfeita.</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setDeleteModalOpen(false)} title="Fechar">
                <Icon name="x" size={14} />
              </button>
            </div>
            <div className="delete-copy">
              Serão apagados apenas os chats e mensagens. Clientes, perfis com características e histórico de reservas NUNCA serão removidos por esta ação.
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setDeleteModalOpen(false)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={confirmDeleteAllConversations}>Apagar conversas</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GeralPage({
  wppConnected,
  setWppConnected,
  restaurantConfig,
  onRestaurantChange,
  tables,
  onCreateTable,
  onUpdateTable,
  onDeleteTable,
  team,
  onCreateTeamMember,
  onUpdateTeamMember,
  onDeleteTeamMember,
  conversationCount,
  conversationRetention,
  onRetentionChange,
  onDeleteAllConversations,
}) {
  const [section, setSection] = useStateGeral("ai");
  const sections = [
    { id: "ai",       label: "Inteligência Artificial", icon: "ai" },
    { id: "conn",     label: "Conexões",                icon: "link" },
    { id: "team",     label: "Equipe",                  icon: "team" },
    { id: "settings", label: "Configurações",           icon: "gear" },
  ];

  return (
    <div className="geral-layout" data-screen-label="03 Geral">
      <aside className="geral-sidebar">
        <h3 className="geral-sidebar-title">Geral</h3>
        <div className="geral-nav">
          {sections.map(s => (
            <button
              key={s.id}
              className={`geral-nav-item ${section === s.id ? "active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              <Icon name={s.icon} size={14} />
              {s.label}
            </button>
          ))}
        </div>
      </aside>
      <div className="geral-content">
        {section === "ai" && (
          <GeralAI
            tables={tables}
            onCreateTable={onCreateTable}
            onUpdateTable={onUpdateTable}
            onDeleteTable={onDeleteTable}
            restaurantConfig={restaurantConfig}
            onRestaurantChange={onRestaurantChange}
          />
        )}
        {section === "conn" && <GeralConexoes wppConnected={wppConnected} setWppConnected={setWppConnected} />}
        {section === "team" && (
          <GeralEquipe
            team={team}
            onCreateTeamMember={onCreateTeamMember}
            onUpdateTeamMember={onUpdateTeamMember}
            onDeleteTeamMember={onDeleteTeamMember}
          />
        )}
        {section === "settings" && (
          <GeralConfig
            conversationCount={conversationCount}
            conversationRetention={conversationRetention}
            onRetentionChange={onRetentionChange}
            onDeleteAllConversations={onDeleteAllConversations}
            restaurantConfig={restaurantConfig}
            onRestaurantChange={onRestaurantChange}
          />
        )}
      </div>
    </div>
  );
}

window.GeralPage = GeralPage;
