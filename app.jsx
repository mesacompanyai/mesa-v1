// Mesa — main app
const { useState: useStateApp } = React;

function normalizeTable(table, index) {
  const legacyNumber = String(table.id || "").match(/\d+/)?.[0];
  const number = Number(table.number ?? legacyNumber ?? index + 1);
  const legacyLocation = String(table.area || "").toLowerCase().includes("externa") ? "outside" : "inside";

  return {
    uid: table.uid || `table-${index + 1}`,
    number: Number.isInteger(number) && number > 0 ? number : index + 1,
    location: table.location || legacyLocation,
    seats: Number(table.seats) || 2,
  };
}

function App() {
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "theme": "light",
    "showWhatsappAlert": false
  }/*EDITMODE-END*/);

  const [page, setPage] = useStateApp("reservas");
  const [wppConnected, setWppConnected] = useStateApp(true);
  const [tables, setTables] = useStateApp(() => window.MOCK_TABLES.map(normalizeTable));

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.theme || "light");
  }, [t.theme]);

  const showAlert = t.showWhatsappAlert && !wppConnected ? true : t.showWhatsappAlert;
  const tableManagerProps = {
    tables,
    onCreateTable: (table) => {
      setTables(current => [
        ...current,
        { uid: `table-${Date.now()}-${Math.random().toString(16).slice(2)}`, ...table },
      ]);
    },
    onUpdateTable: (uid, nextTable) => {
      setTables(current => current.map(table => table.uid === uid ? { ...table, ...nextTable } : table));
    },
    onDeleteTable: (uid) => {
      setTables(current => current.filter(table => table.uid !== uid));
    },
  };

  const navItems = [
    { id: "reservas",  label: "Reservas",  icon: "calendar" },
    { id: "conversas", label: "Conversas", icon: "chat" },
    { id: "geral",     label: "Geral",     icon: "gear" },
  ];

  return (
    <div className="mesa-app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-brand">
            <div className="topbar-brand-mark">M</div>
            <span>Mesa</span>
            <span style={{ color: "var(--text-3)", fontWeight: 400, marginLeft: 4 }}>·</span>
            <span style={{ color: "var(--text-3)", fontWeight: 400 }}>Casa Aurora</span>
          </div>
          <nav className="topbar-nav">
            {navItems.map(n => (
              <button
                key={n.id}
                className={page === n.id ? "active" : ""}
                onClick={() => setPage(n.id)}
              >
                <Icon name={n.icon} size={13} />
                {n.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="topbar-right">
          <div className="topbar-search">
            <Icon name="search" size={13} />
            <input placeholder="Buscar reservas, clientes…" />
            <span style={{ fontSize: 10.5, color: "var(--text-4)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px" }}>⌘K</span>
          </div>
          <button className="icon-btn" title="Notificações"><Icon name="bell" size={15} /></button>
          <button className="avatar-btn">MB</button>
        </div>
      </header>

      {showAlert && (
        <div className="global-alert" data-comment-anchor="wpp-alert">
          <span className="global-alert-dot" />
          <div className="global-alert-text">
            <strong>WhatsApp desconectado.</strong>{" "}
            <span style={{ color: "var(--text-2)" }}>Reconecte para retomar o atendimento automático.</span>
          </div>
          <button className="global-alert-action" onClick={() => { setWppConnected(true); setTweak("showWhatsappAlert", false); }}>
            Reconectar
          </button>
        </div>
      )}

      <main className="work-area">
        {page === "reservas"  && <ReservationsPage {...tableManagerProps} />}
        {page === "conversas" && <ConversationsPage />}
        {page === "geral"     && (
          <GeralPage
            wppConnected={wppConnected}
            setWppConnected={setWppConnected}
            {...tableManagerProps}
          />
        )}
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Aparência">
          <TweakRadio
            label="Tema"
            value={t.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "light", label: "Claro" },
              { value: "dark",  label: "Escuro" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Demonstração">
          <TweakToggle
            label="Alerta WhatsApp"
            value={t.showWhatsappAlert}
            onChange={(v) => setTweak("showWhatsappAlert", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
