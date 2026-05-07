// Geral page — 4 sub-areas
const { useEffect: useEffectGeral, useRef: useRefGeral, useState: useStateGeral } = React;

function GeralAI() {
  const r = window.MOCK_RESTAURANT;
  const businessDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const [questions, setQuestions] = useStateGeral(() => window.MOCK_AI_QUESTIONS.map(q => ({ fixed: true, ...q })));
  const [autonomy, setAutonomy] = useStateGeral("media");
  const [teamContactTriggers, setTeamContactTriggers] = useStateGeral(() => ({
    waitingCustomer: true,
    reservationScheduled: true,
    reservationArriving: true,
    reservationCancelled: true,
    ...(r.teamContactTriggers || {}),
  }));
  const [businessHours, setBusinessHours] = useStateGeral(() => businessDays.map(day => ({
    day,
    enabled: !!r.characteristics.weekdays[day],
    open: r.characteristics.open,
    close: r.characteristics.close,
  })));
  const [menuFiles, setMenuFiles] = useStateGeral([]);
  const [canSendMenuFiles, setCanSendMenuFiles] = useStateGeral(r.menuSettings?.canSendFiles ?? true);
  const [menuSendMode, setMenuSendMode] = useStateGeral(r.menuSettings?.sendMode || "on_request");
  const [tables, setTables] = useStateGeral(() => window.MOCK_TABLES.map((table, i) => ({ ...table, uid: `table-${i + 1}` })));
  const [tableModalMode, setTableModalMode] = useStateGeral(null);
  const [tableDraft, setTableDraft] = useStateGeral({ uid: null, id: "", area: "", seats: "" });
  const [tableDeleteTarget, setTableDeleteTarget] = useStateGeral(null);
  const [openTableMenuId, setOpenTableMenuId] = useStateGeral(null);
  const [editingId, setEditingId] = useStateGeral(null);
  const [draftLabel, setDraftLabel] = useStateGeral("");
  const [draggingId, setDraggingId] = useStateGeral(null);
  const dragSourceRef = useRefGeral(null);
  const dragTargetRef = useRefGeral(null);
  const guideListRef = useRefGeral(null);
  const menuFileInputRef = useRefGeral(null);

  const toggleQ = (id) => setQuestions(qs => qs.map(q => q.id === id ? { ...q, enabled: !q.enabled } : q));
  const toggleTeamContact = (id) => {
    setTeamContactTriggers(triggers => ({ ...triggers, [id]: !triggers[id] }));
  };
  const updateBusinessHours = (day, patch) => {
    setBusinessHours(hours => hours.map(item => item.day === day ? { ...item, ...patch } : item));
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
  const resetTableDraft = () => setTableDraft({ uid: null, id: "", area: "", seats: "" });
  const openNewTableModal = () => {
    setOpenTableMenuId(null);
    resetTableDraft();
    setTableModalMode("create");
  };
  const openEditTableModal = (table) => {
    setOpenTableMenuId(null);
    setTableDraft({ uid: table.uid, id: table.id, area: table.area, seats: String(table.seats) });
    setTableModalMode("edit");
  };
  const closeTableModal = () => {
    setTableModalMode(null);
    resetTableDraft();
  };
  const updateTableDraft = (field, value) => {
    setTableDraft(draft => ({ ...draft, [field]: value }));
  };
  const tableSeats = Number(tableDraft.seats);
  const tableDraftValid = tableDraft.id.trim() && tableDraft.area.trim() && Number.isInteger(tableSeats) && tableSeats > 0;
  const saveTable = (e) => {
    e.preventDefault();
    if (!tableDraftValid) return;

    const nextTable = {
      uid: tableDraft.uid || `table-${Date.now()}`,
      id: tableDraft.id.trim(),
      area: tableDraft.area.trim(),
      seats: tableSeats,
    };

    if (tableModalMode === "edit") {
      setTables(current => current.map(table => table.uid === nextTable.uid ? nextTable : table));
    } else {
      setTables(current => [...current, nextTable]);
    }
    closeTableModal();
  };
  const confirmDeleteTable = () => {
    if (!tableDeleteTarget) return;
    setTables(current => current.filter(table => table.uid !== tableDeleteTarget.uid));
    setTableDeleteTarget(null);
  };
  const openDeleteTableModal = (table) => {
    setOpenTableMenuId(null);
    setTableDeleteTarget(table);
  };
  const startEdit = (q) => {
    if (q.fixed) return;
    setEditingId(q.id);
    setDraftLabel(q.label);
  };
  const addTopic = () => {
    if (editingId) return;
    const id = `extra-${Date.now()}`;
    setQuestions(qs => [...qs, { id, label: "", enabled: true, required: false, fixed: false }]);
    setEditingId(id);
    setDraftLabel("");
  };
  const commitTopic = (id) => {
    const label = draftLabel.trim();
    if (!label) return;
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, label } : q));
    setEditingId(null);
    setDraftLabel("");
  };
  const cancelEdit = (id) => {
    setQuestions(qs => qs.filter(q => q.fixed || q.id !== id || q.label.trim()));
    setEditingId(null);
    setDraftLabel("");
  };
  const removeTopic = (id) => setQuestions(qs => qs.filter(q => q.fixed || q.id !== id));
  const moveTopic = (targetId, sourceId = draggingId) => {
    if (!sourceId || sourceId === targetId) return;
    setQuestions(qs => {
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
        <textarea className="field-textarea" defaultValue={window.MOCK_RESTAURANT_DESCRIPTION} rows={7} />
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
              onClick={() => setAutonomy(opt.id)}
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
          <label className="toggle"><input type="checkbox" defaultChecked={r.characteristics.petFriendly} /><span className="toggle-slider"/></label>
        </div>
        <div className="row-flex">
          <div className="row-flex-main">
            <div className="row-flex-title">Área externa</div>
            <div className="row-flex-sub">Possui mesas ao ar livre</div>
          </div>
          <label className="toggle"><input type="checkbox" defaultChecked={r.characteristics.outdoor} /><span className="toggle-slider"/></label>
        </div>
        <div className="row-flex">
          <div className="row-flex-main">
            <div className="row-flex-title">Alto padrão</div>
            <div className="row-flex-sub">Estilo de atendimento mais formal</div>
          </div>
          <label className="toggle"><input type="checkbox" defaultChecked={r.characteristics.highEnd} /><span className="toggle-slider"/></label>
        </div>
        <div className="row-flex">
          <div className="row-flex-main">
            <div className="row-flex-title">Aceita aniversários</div>
            <div className="row-flex-sub">Permite bolo, decoração simples e velas</div>
          </div>
          <label className="toggle"><input type="checkbox" defaultChecked={r.characteristics.birthdays} /><span className="toggle-slider"/></label>
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
            <input type="checkbox" checked={canSendMenuFiles} onChange={() => setCanSendMenuFiles(v => !v)} />
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
              onClick={() => setMenuSendMode(opt.id)}
            >
              <div className="menu-send-option-title">{opt.label}</div>
              <div className="menu-send-option-desc">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h2>Mesas cadastradas</h2>
            <div className="section-card-subtitle">{tables.length} mesas cadastradas</div>
          </div>
          <button className="btn btn-primary" onClick={openNewTableModal}>
            <Icon name="plus" size={13} />
            Adicionar mesa
          </button>
        </div>
        {tables.length ? (
          <div className="tables-grid">
            {tables.map(t => (
              <div key={t.uid} className="table-card">
                <div className="table-card-actions">
                  <button
                    className="table-card-action"
                    onClick={() => setOpenTableMenuId(current => current === t.uid ? null : t.uid)}
                    title="Opções da mesa"
                    aria-label={`Opções de ${t.id}`}
                  >
                    <Icon name="more" size={15} />
                  </button>
                  {openTableMenuId === t.uid && (
                    <div className="table-card-menu">
                      <button type="button" onClick={() => openEditTableModal(t)}>
                        <Icon name="edit" size={12} />
                        Editar
                      </button>
                      <button type="button" className="danger" onClick={() => openDeleteTableModal(t)}>
                        <Icon name="x" size={12} />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
                <div className="table-card-name">{t.id}</div>
                <div className="table-card-area">{t.area}</div>
                <div className="table-card-seats"><Icon name="person" size={11} />{t.seats}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="tables-empty">
            <div>
              <div className="tables-empty-title">Nenhuma mesa cadastrada</div>
              <div className="tables-empty-sub">Adicione uma mesa para a IA considerar a capacidade do salão.</div>
            </div>
            <button className="btn btn-primary" onClick={openNewTableModal}>
              <Icon name="plus" size={13} />
              Adicionar mesa
            </button>
          </div>
        )}
      </div>

      {tableModalMode && (
        <div className="modal-backdrop" onMouseDown={closeTableModal}>
          <form className="modal-card" onSubmit={saveTable} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{tableModalMode === "edit" ? "Editar mesa" : "Nova mesa"}</h3>
                <div className="modal-subtitle">Dados usados para organizar reservas e capacidade.</div>
              </div>
              <button type="button" className="modal-close" onClick={closeTableModal} title="Fechar">
                <Icon name="x" size={14} />
              </button>
            </div>
            <div className="field">
              <label className="field-label">Nome da mesa</label>
              <input
                className="field-input"
                value={tableDraft.id}
                onChange={(e) => updateTableDraft("id", e.target.value)}
                placeholder="Mesa 15"
                autoFocus
              />
            </div>
            <div className="field">
              <label className="field-label">Área</label>
              <input
                className="field-input"
                value={tableDraft.area}
                onChange={(e) => updateTableDraft("area", e.target.value)}
                placeholder="Salão Principal"
              />
            </div>
            <div className="field">
              <label className="field-label">Lugares</label>
              <input
                className="field-input"
                type="number"
                min="1"
                step="1"
                value={tableDraft.seats}
                onChange={(e) => updateTableDraft("seats", e.target.value)}
                placeholder="4"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeTableModal}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={!tableDraftValid}>
                {tableModalMode === "edit" ? "Salvar" : "Criar mesa"}
              </button>
            </div>
          </form>
        </div>
      )}

      {tableDeleteTarget && (
        <div className="modal-backdrop" onMouseDown={() => setTableDeleteTarget(null)}>
          <div className="modal-card modal-card-sm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Excluir mesa</h3>
                <div className="modal-subtitle">
                  Remover {tableDeleteTarget.id} de {tableDeleteTarget.area}?
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setTableDeleteTarget(null)} title="Fechar">
                <Icon name="x" size={14} />
              </button>
            </div>
            <div className="delete-copy">
              Esta ação remove a mesa da grade desta sessão. Reservas mockadas existentes não serão alteradas.
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setTableDeleteTarget(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={confirmDeleteTable}>Excluir</button>
            </div>
          </div>
        </div>
      )}
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

function GeralEquipe() {
  return (
    <div className="geral-content-inner">
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipe</h1>
          <div className="page-subtitle">{window.MOCK_TEAM.length} funcionários ativos</div>
        </div>
        <button className="btn btn-primary"><Icon name="plus" size={13} />Adicionar</button>
      </div>

      <div className="section-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="team-table">
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Cargo</th>
              <th>WhatsApp</th>
              <th>Mesas</th>
              <th>Notificações</th>
              <th>Antecedência</th>
            </tr>
          </thead>
          <tbody>
            {window.MOCK_TEAM.map(t => (
              <tr key={t.id}>
                <td>
                  <div className="team-name">
                    <div className="team-avatar">{t.initials}</div>
                    {t.name}
                  </div>
                </td>
                <td style={{ color: "var(--text-2)" }}>{t.role}</td>
                <td style={{ color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{t.phone}</td>
                <td style={{ color: "var(--text-2)" }}>{t.tables}</td>
                <td>
                  <div className="team-tags">
                    {t.notifications.map(n => (
                      <span className="tag" key={n} style={{ fontSize: 10.5, padding: "2px 7px" }}>{n}</span>
                    ))}
                  </div>
                </td>
                <td style={{ color: "var(--text-2)" }}>{t.advance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GeralConfig() {
  const r = window.MOCK_RESTAURANT;
  return (
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
          <input className="field-input" defaultValue={r.name} />
        </div>
        <div className="field">
          <label className="field-label">Estilo</label>
          <input className="field-input" defaultValue={r.style} />
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
        <div className="row-flex">
          <div className="row-flex-main">
            <div className="row-flex-title">Apagar todas as conversas arquivadas</div>
            <div className="row-flex-sub">Remove definitivamente conversas com mais de 90 dias</div>
          </div>
          <button className="btn">Apagar</button>
        </div>
        <div className="row-flex">
          <div className="row-flex-main">
            <div className="row-flex-title">Excluir conta do restaurante</div>
            <div className="row-flex-sub">Encerra a assinatura e remove todos os dados</div>
          </div>
          <button className="btn">Excluir</button>
        </div>
      </div>
    </div>
  );
}

function GeralPage({ wppConnected, setWppConnected }) {
  const [section, setSection] = useStateGeral("ai");
  const sections = [
    { id: "ai",       label: "Inteligência Artificial", icon: "ai" },
    { id: "conn",     label: "Conexões",                icon: "link" },
    { id: "team",     label: "Equipe",                  icon: "users" },
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
        {section === "ai" && <GeralAI />}
        {section === "conn" && <GeralConexoes wppConnected={wppConnected} setWppConnected={setWppConnected} />}
        {section === "team" && <GeralEquipe />}
        {section === "settings" && <GeralConfig />}
      </div>
    </div>
  );
}

window.GeralPage = GeralPage;
