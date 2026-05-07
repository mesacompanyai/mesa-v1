// Shared tables manager
const { useState: useStateTablesManager } = React;

const TABLE_LOCATION_LABELS = {
  inside: "Dentro",
  outside: "Fora",
};

function TableLocationLabel({ location }) {
  return TABLE_LOCATION_LABELS[location] || TABLE_LOCATION_LABELS.inside;
}

function TablesManager({
  tables,
  onCreateTable,
  onUpdateTable,
  onDeleteTable,
  variant = "section",
  onClose,
}) {
  const [tableModalMode, setTableModalMode] = useStateTablesManager(null);
  const [tableDraft, setTableDraft] = useStateTablesManager({
    uid: null,
    number: "",
    location: "inside",
    seats: "",
  });
  const [tableDeleteTarget, setTableDeleteTarget] = useStateTablesManager(null);
  const [openTableMenuId, setOpenTableMenuId] = useStateTablesManager(null);

  const resetTableDraft = () => {
    setTableDraft({ uid: null, number: "", location: "inside", seats: "" });
  };
  const openNewTableForm = () => {
    setOpenTableMenuId(null);
    resetTableDraft();
    setTableModalMode("create");
  };
  const openEditTableForm = (table) => {
    setOpenTableMenuId(null);
    setTableDraft({
      uid: table.uid,
      number: String(table.number || ""),
      location: table.location || "inside",
      seats: String(table.seats || ""),
    });
    setTableModalMode("edit");
  };
  const closeTableForm = () => {
    setTableModalMode(null);
    resetTableDraft();
  };
  const updateTableDraft = (field, value) => {
    setTableDraft(draft => ({ ...draft, [field]: value }));
  };

  const tableNumber = Number(tableDraft.number);
  const tableSeats = Number(tableDraft.seats);
  const tableDraftValid =
    Number.isInteger(tableNumber) &&
    tableNumber > 0 &&
    Number.isInteger(tableSeats) &&
    tableSeats > 0;

  const saveTable = (e) => {
    e.preventDefault();
    if (!tableDraftValid) return;

    const nextTable = {
      number: tableNumber,
      location: tableDraft.location || "inside",
      seats: tableSeats,
    };

    if (tableModalMode === "edit") {
      onUpdateTable(tableDraft.uid, nextTable);
    } else {
      onCreateTable(nextTable);
    }
    closeTableForm();
  };
  const openDeleteTablePanel = (table) => {
    setOpenTableMenuId(null);
    setTableDeleteTarget(table);
  };
  const confirmDeleteTable = () => {
    if (!tableDeleteTarget) return;
    onDeleteTable(tableDeleteTarget.uid);
    setTableDeleteTarget(null);
  };

  return (
    <div className={`tables-manager tables-manager-${variant}`}>
      <div className="tables-manager-header">
        <div>
          <h2>{variant === "modal" ? "Gerenciar mesas" : "Mesas cadastradas"}</h2>
          <div className="section-card-subtitle">{tables.length} mesas cadastradas</div>
        </div>
        <div className="tables-manager-header-actions">
          <button className="btn btn-primary" onClick={openNewTableForm}>
            <Icon name="plus" size={13} />
            Adicionar mesa
          </button>
          {variant === "modal" && (
            <button type="button" className="modal-close" onClick={onClose} title="Fechar">
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>

      {tableModalMode && (
        <form className="table-editor-panel" onSubmit={saveTable}>
          <div className="table-editor-panel-header">
            <div>
              <h3>{tableModalMode === "edit" ? "Editar mesa" : "Nova mesa"}</h3>
              <div>Dados usados para organizar reservas e capacidade.</div>
            </div>
            <button type="button" className="table-editor-close" onClick={closeTableForm} title="Fechar formulário">
              <Icon name="x" size={13} />
            </button>
          </div>
          <div className="table-editor-fields">
            <div className="field">
              <label className="field-label">Número da mesa</label>
              <input
                className="field-input"
                type="number"
                min="1"
                step="1"
                value={tableDraft.number}
                onChange={(e) => updateTableDraft("number", e.target.value)}
                placeholder="15"
                autoFocus
              />
            </div>
            <div className="field">
              <label className="field-label">Dentro ou fora</label>
              <div className="table-location-control" role="group" aria-label="Local da mesa">
                {[
                  { id: "inside", label: "Dentro" },
                  { id: "outside", label: "Fora" },
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className={tableDraft.location === option.id ? "active" : ""}
                    aria-pressed={tableDraft.location === option.id}
                    onClick={() => updateTableDraft("location", option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="field-label">Quantidade de assentos</label>
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
          </div>
          <div className="table-editor-actions">
            <button type="button" className="btn" onClick={closeTableForm}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!tableDraftValid}>
              {tableModalMode === "edit" ? "Salvar" : "Criar mesa"}
            </button>
          </div>
        </form>
      )}

      {tableDeleteTarget && (
        <div className="table-delete-panel">
          <div>
            <h3>Excluir mesa</h3>
            <div>Remover Mesa {tableDeleteTarget.number} de <TableLocationLabel location={tableDeleteTarget.location} />?</div>
          </div>
          <div className="table-delete-actions">
            <button type="button" className="btn" onClick={() => setTableDeleteTarget(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={confirmDeleteTable}>Excluir</button>
          </div>
        </div>
      )}

      {tables.length ? (
        <div className="tables-grid">
          {tables.map(table => (
            <div key={table.uid} className="table-card">
              <div className="table-card-actions">
                <button
                  className="table-card-action"
                  onClick={() => setOpenTableMenuId(current => current === table.uid ? null : table.uid)}
                  title="Opções da mesa"
                  aria-label={`Opções da Mesa ${table.number}`}
                >
                  <Icon name="more" size={15} />
                </button>
                {openTableMenuId === table.uid && (
                  <div className="table-card-menu">
                    <button type="button" onClick={() => openEditTableForm(table)}>
                      <Icon name="edit" size={12} />
                      Editar
                    </button>
                    <button type="button" className="danger" onClick={() => openDeleteTablePanel(table)}>
                      <Icon name="x" size={12} />
                      Excluir
                    </button>
                  </div>
                )}
              </div>
              <div className="table-card-icon"><Icon name="table" size={22} /></div>
              <div className="table-card-name">Mesa {table.number}</div>
              <div className="table-card-area"><TableLocationLabel location={table.location} /></div>
              <div className="table-card-seats"><Icon name="person" size={11} />{table.seats}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tables-empty">
          <div>
            <div className="tables-empty-title">Nenhuma mesa cadastrada</div>
            <div className="tables-empty-sub">Adicione uma mesa para a IA considerar a capacidade do salão.</div>
          </div>
          <button className="btn btn-primary" onClick={openNewTableForm}>
            <Icon name="plus" size={13} />
            Adicionar mesa
          </button>
        </div>
      )}
    </div>
  );
}

window.TablesManager = TablesManager;
window.TableLocationLabel = TableLocationLabel;
