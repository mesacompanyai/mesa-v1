// Shared team manager
const { useState: useStateTeamManager } = React;

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0] || "")
    .join("")
    .toUpperCase() || "EQ";
}

function TeamManager({
  team,
  onCreateTeamMember,
  onUpdateTeamMember,
  onDeleteTeamMember,
  variant = "section",
  onClose,
}) {
  const [teamModalMode, setTeamModalMode] = useStateTeamManager(null);
  const [teamDraft, setTeamDraft] = useStateTeamManager({
    uid: null,
    name: "",
    phone: "",
    activeToday: true,
  });
  const [teamDeleteTarget, setTeamDeleteTarget] = useStateTeamManager(null);
  const [openTeamMenuId, setOpenTeamMenuId] = useStateTeamManager(null);

  const activeCount = team.filter(member => member.activeToday).length;
  const activeLabel = activeCount === 1 ? "ativo hoje" : "ativos hoje";

  const resetTeamDraft = () => {
    setTeamDraft({ uid: null, name: "", phone: "", activeToday: true });
  };
  const openNewTeamForm = () => {
    setOpenTeamMenuId(null);
    resetTeamDraft();
    setTeamModalMode("create");
  };
  const openEditTeamForm = (member) => {
    setOpenTeamMenuId(null);
    setTeamDraft({
      uid: member.uid,
      name: member.name || "",
      phone: member.phone || "",
      activeToday: !!member.activeToday,
    });
    setTeamModalMode("edit");
  };
  const closeTeamForm = () => {
    setTeamModalMode(null);
    resetTeamDraft();
  };
  const updateTeamDraft = (field, value) => {
    setTeamDraft(draft => ({ ...draft, [field]: value }));
  };

  const teamDraftValid = teamDraft.name.trim() && teamDraft.phone.trim();

  const saveTeamMember = (e) => {
    e.preventDefault();
    if (!teamDraftValid) return;

    const nextMember = {
      name: teamDraft.name.trim(),
      phone: teamDraft.phone.trim(),
      activeToday: !!teamDraft.activeToday,
    };

    if (teamModalMode === "edit") {
      onUpdateTeamMember(teamDraft.uid, nextMember);
    } else {
      onCreateTeamMember(nextMember);
    }
    closeTeamForm();
  };
  const openDeleteTeamPanel = (member) => {
    setOpenTeamMenuId(null);
    setTeamDeleteTarget(member);
  };
  const confirmDeleteTeamMember = () => {
    if (!teamDeleteTarget) return;
    onDeleteTeamMember(teamDeleteTarget.uid);
    setTeamDeleteTarget(null);
  };

  return (
    <div className={`team-manager team-manager-${variant}`}>
      <div className="team-manager-header">
        <div>
          <h2>{variant === "modal" ? "Gerenciar equipe" : "Equipe"}</h2>
          <div className="section-card-subtitle">
            {activeCount} {activeLabel} · {team.length} funcionários cadastrados
          </div>
        </div>
        <div className="team-manager-header-actions">
          <button className="btn btn-primary" onClick={openNewTeamForm}>
            <Icon name="plus" size={13} />
            Adicionar funcionário
          </button>
          {variant === "modal" && (
            <button type="button" className="modal-close" onClick={onClose} title="Fechar">
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>

      {teamModalMode && (
        <form className="team-editor-panel" onSubmit={saveTeamMember}>
          <div className="team-editor-panel-header">
            <div>
              <h3>{teamModalMode === "edit" ? "Editar funcionário" : "Novo funcionário"}</h3>
              <div>Funcionários ativos hoje recebem atualizações de reservas, mensagens e mesas.</div>
            </div>
            <button type="button" className="team-editor-close" onClick={closeTeamForm} title="Fechar formulário">
              <Icon name="x" size={13} />
            </button>
          </div>
          <div className="team-editor-fields">
            <div className="field">
              <label className="field-label">Nome</label>
              <input
                className="field-input"
                value={teamDraft.name}
                onChange={(e) => updateTeamDraft("name", e.target.value)}
                placeholder="Mariana Bastos"
                autoFocus
              />
            </div>
            <div className="field">
              <label className="field-label">Número do WhatsApp</label>
              <input
                className="field-input"
                value={teamDraft.phone}
                onChange={(e) => updateTeamDraft("phone", e.target.value)}
                placeholder="+55 11 9 9999-9999"
              />
            </div>
            <label className="team-active-check">
              <input
                type="checkbox"
                checked={teamDraft.activeToday}
                onChange={(e) => updateTeamDraft("activeToday", e.target.checked)}
              />
              <span className="team-checkmark"><Icon name="check" size={12} /></span>
              <span>
                <strong>Ativo hoje</strong>
                <small>Recebe contatos da IA</small>
              </span>
            </label>
          </div>
          <div className="team-editor-actions">
            <button type="button" className="btn" onClick={closeTeamForm}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!teamDraftValid}>
              {teamModalMode === "edit" ? "Salvar" : "Criar funcionário"}
            </button>
          </div>
        </form>
      )}

      {teamDeleteTarget && (
        <div className="team-delete-panel">
          <div>
            <h3>Excluir funcionário</h3>
            <div>Remover {teamDeleteTarget.name} da equipe?</div>
          </div>
          <div className="team-delete-actions">
            <button type="button" className="btn" onClick={() => setTeamDeleteTarget(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={confirmDeleteTeamMember}>Excluir</button>
          </div>
        </div>
      )}

      {team.length ? (
        <div className="team-list">
          {team.map(member => (
            <div key={member.uid} className={`team-member-card ${member.activeToday ? "active" : "inactive"}`}>
              <div className="team-member-avatar">{getInitials(member.name)}</div>
              <div className="team-member-main">
                <div className="team-member-name">{member.name}</div>
                <div className="team-member-phone">{member.phone}</div>
                <div className="team-member-contact-copy">
                  {member.activeToday
                    ? "Contatado sobre reservas, mensagens e mesas."
                    : "Não recebe contatos enquanto estiver inativo."}
                </div>
              </div>
              <div className={`team-member-status ${member.activeToday ? "active" : "inactive"}`}>
                <span className="team-member-status-dot" />
                {member.activeToday ? "Ativo hoje" : "Inativo"}
              </div>
              <div className="team-member-actions">
                <button
                  className="team-member-action"
                  onClick={() => setOpenTeamMenuId(current => current === member.uid ? null : member.uid)}
                  title="Opções do funcionário"
                  aria-label={`Opções de ${member.name}`}
                >
                  <Icon name="more" size={15} />
                </button>
                {openTeamMenuId === member.uid && (
                  <div className="team-member-menu">
                    <button type="button" onClick={() => openEditTeamForm(member)}>
                      <Icon name="edit" size={12} />
                      Editar
                    </button>
                    <button type="button" className="danger" onClick={() => openDeleteTeamPanel(member)}>
                      <Icon name="x" size={12} />
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="team-empty">
          <div>
            <div className="team-empty-title">Nenhum funcionário cadastrado</div>
            <div className="team-empty-sub">Adicione a equipe que pode receber atualizações da IA.</div>
          </div>
          <button className="btn btn-primary" onClick={openNewTeamForm}>
            <Icon name="plus" size={13} />
            Adicionar funcionário
          </button>
        </div>
      )}
    </div>
  );
}

window.TeamManager = TeamManager;
window.getInitials = getInitials;
