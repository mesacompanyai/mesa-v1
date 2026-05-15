// Reservas page
const { useState } = React;

const RESERVATION_STATUS_MAP = {
  confirmed: "confirmada",
  ready_to_confirm: "aguardando",
  completed: "confirmada",
  cancelled: "cancelada",
};

function normalizeApiReservation(r) {
  const startsAt = r.startsAt ? new Date(r.startsAt) : null;
  const time = startsAt
    ? startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";
  return {
    id: r.id,
    name: r.customer?.name || "Cliente",
    phone: r.customer?.phoneE164 || "",
    time,
    startsAt: r.startsAt || null,
    table: r.table?.label || r.tableLabel || "",
    area: r.area || "",
    party: r.partySize || 0,
    status: RESERVATION_STATUS_MAP[r.status] || r.status || "aguardando",
    notes: r.notes || "",
    diet: [],
    intolerances: [],
    children: false,
    pet: false,
    celebration: "",
    areaPref: "",
  };
}

function computeDays(rawReservations) {
  const today = new Date();
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = rawReservations.filter(r => (r.startsAt || "").startsWith(dateStr)).length;
    return { day: d.getDate(), weekday: weekdays[d.getDay()], count, date: d };
  });
}

function StatusPill({ status }) {
  const labels = {
    confirmada: "Confirmada",
    aguardando: "Aguardando",
    chegando: "Chegando",
    cancelada: "Cancelada",
    ativa: "Ativa",
    atencao: "Atenção",
  };
  return (
    <span className={`status-pill status-${status}`}>
      <span className="dot" />
      {labels[status] || status}
    </span>
  );
}
window.StatusPill = StatusPill;

const RESERVATION_FILTERS = [
  {
    id: "confirmadas",
    label: "Reservas Confirmadas",
    matches: (reservation) => reservation.status === "confirmada",
  },
  {
    id: "andamento",
    label: "Reservas em Andamento",
    matches: (reservation) => reservation.status === "aguardando",
  },
  {
    id: "canceladas",
    label: "Reservas Canceladas",
    matches: (reservation) => reservation.status === "cancelada",
  },
  {
    id: "geral",
    label: "Geral",
    matches: () => true,
  },
];

function ReservationCard({ reservation, isOpen, onToggle }) {
  const r = reservation;
  return (
    <div className={`reservation-card ${isOpen ? "open" : ""}`}>
      <div className="reservation-summary" onClick={onToggle}>
        <div className="reservation-time">{r.time}</div>
        <div>
          <div className="reservation-name">{r.name}</div>
          <div className="reservation-meta">
            <span>{r.table}</span>
            <span className="reservation-meta-dot" />
            <span>{r.area}</span>
          </div>
        </div>
        <div className="reservation-party">
          <Icon name="person" size={14} />
          {r.party}
        </div>
        <StatusPill status={r.status} />
        <div className="reservation-chevron">
          <Icon name="chevron" size={16} />
        </div>
      </div>
      {isOpen && (
        <div className="reservation-detail">
          <div>
            <div className="detail-section">
              <h4>Detalhes</h4>
              <div className="detail-grid">
                <div className="detail-field">
                  <div className="detail-field-label">Mesa</div>
                  <div className="detail-field-value">{r.table}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Área</div>
                  <div className="detail-field-value">{r.area}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Pessoas</div>
                  <div className="detail-field-value">{r.party}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Telefone</div>
                  <div className="detail-field-value">{r.phone}</div>
                </div>
                {r.areaPref && (
                  <div className="detail-field">
                    <div className="detail-field-label">Preferência</div>
                    <div className="detail-field-value">{r.areaPref}</div>
                  </div>
                )}
                {r.celebration && (
                  <div className="detail-field">
                    <div className="detail-field-label">Comemoração</div>
                    <div className="detail-field-value">{r.celebration}</div>
                  </div>
                )}
              </div>
            </div>
            {r.notes && (
              <div className="detail-section" style={{ marginTop: 18 }}>
                <h4>Observações</h4>
                <div className="observation">{r.notes}</div>
              </div>
            )}
            <div className="detail-actions">
              <button className="btn btn-primary"><Icon name="bell" size={13} />Avisar equipe</button>
              <button className="btn"><Icon name="edit" size={13} />Editar</button>
              <button className="btn"><Icon name="x" size={13} />Cancelar</button>
            </div>
          </div>
          <div>
            <div className="detail-section">
              <h4>Características</h4>
              <div className="detail-tags">
                {r.diet.map(d => <span className="tag" key={d}><Icon name="leaf" size={11} />{d}</span>)}
                {r.intolerances.map(d => <span className="tag" key={d}><Icon name="milk" size={11} />Intolerância: {d}</span>)}
                {r.children && <span className="tag"><Icon name="child" size={11} />Com criança</span>}
                {r.pet && <span className="tag"><Icon name="pet" size={11} />Com pet</span>}
                {r.celebration && <span className="tag"><Icon name="cake" size={11} />Comemoração</span>}
                {!r.diet.length && !r.intolerances.length && !r.children && !r.pet && !r.celebration && (
                  <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>Nenhuma característica especial</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReservationsPage({
  tables,
  onCreateTable,
  onUpdateTable,
  onDeleteTable,
  team,
  onCreateTeamMember,
  onUpdateTeamMember,
  onDeleteTeamMember,
  reservations = [],
}) {
  const today = new Date();
  const [openId, setOpenId] = useState(null);
  const [activeDay, setActiveDay] = useState(today.getDate());
  const [reservationFilter, setReservationFilter] = useState("confirmadas");
  const [tablesModalOpen, setTablesModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  const days = computeDays(reservations);
  const activeDayEntry = days.find(d => d.day === activeDay) || days[0];
  const activeDateLabel = activeDayEntry
    ? activeDayEntry.date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  const activeDateStr = activeDayEntry ? activeDayEntry.date.toISOString().slice(0, 10) : "";
  const reservationsForDay = reservations
    .filter(r => (r.startsAt || "").startsWith(activeDateStr))
    .map(normalizeApiReservation);

  const selectedFilter = RESERVATION_FILTERS.find(filter => filter.id === reservationFilter) || RESERVATION_FILTERS[0];
  const filteredReservations = reservationsForDay.filter(selectedFilter.matches);
  const reservationCountLabel = filteredReservations.length === 1 ? "reserva" : "reservas";

  const isOpen = (id) => openId === id;

  return (
    <div className="page" data-screen-label="01 Reservas">
      <div className="page-narrow">
        <div className="page-header">
          <div>
            <h1 className="page-title">Reservas</h1>
            <div className="page-subtitle">
              {activeDateLabel} · {filteredReservations.length} {reservationCountLabel}
            </div>
          </div>
          <div className="reservation-actions">
            <div className="reservation-filter-control" role="group" aria-label="Filtrar reservas">
              {RESERVATION_FILTERS.map(filter => (
                <button
                  key={filter.id}
                  type="button"
                  className={`reservation-filter-option ${reservationFilter === filter.id ? "active" : ""}`}
                  aria-pressed={reservationFilter === filter.id}
                  onClick={() => setReservationFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <button className="btn" onClick={() => setTablesModalOpen(true)}>
              <Icon name="table" size={13} />
              Mesas
            </button>
            <button className="btn" onClick={() => setTeamModalOpen(true)}>
              <Icon name="team" size={13} />
              Equipe
            </button>
            <button className="btn btn-primary"><Icon name="plus" size={13} />Nova reserva</button>
          </div>
        </div>

        <div className="day-strip">
          {days.map(d => (
            <button
              key={d.day}
              className={`day-chip ${d.day === activeDay ? "active" : ""} ${d.count === 0 ? "empty" : ""}`}
              onClick={() => setActiveDay(d.day)}
            >
              <span className="day-chip-weekday">{d.weekday}</span>
              <span className="day-chip-num">{d.day}</span>
              {d.count > 0 && <span className="day-chip-count">{d.count}</span>}
              <span className="day-chip-dot" />
            </button>
          ))}
        </div>

        <div className="reservation-list">
          {filteredReservations.map(r => (
            <ReservationCard
              key={r.id}
              reservation={r}
              isOpen={isOpen(r.id)}
              onToggle={() => setOpenId(isOpen(r.id) ? null : r.id)}
            />
          ))}
          {!filteredReservations.length && (
            <div className="reservation-empty">
              Nenhuma reserva encontrada para este filtro.
            </div>
          )}
        </div>
      </div>

      {tablesModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setTablesModalOpen(false)}>
          <div className="modal-card tables-manager-modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <TablesManager
              tables={tables}
              onCreateTable={onCreateTable}
              onUpdateTable={onUpdateTable}
              onDeleteTable={onDeleteTable}
              variant="modal"
              onClose={() => setTablesModalOpen(false)}
            />
          </div>
        </div>
      )}

      {teamModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setTeamModalOpen(false)}>
          <div className="modal-card team-manager-modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <TeamManager
              team={team}
              onCreateTeamMember={onCreateTeamMember}
              onUpdateTeamMember={onUpdateTeamMember}
              onDeleteTeamMember={onDeleteTeamMember}
              variant="modal"
              onClose={() => setTeamModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

window.ReservationsPage = ReservationsPage;
