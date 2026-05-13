// Mesa — main app
const { useEffect: useEffectApp, useState: useStateApp } = React;

const DEFAULT_CONVERSATION_RETENTION = {
  preset: "30d",
  customDays: 30,
};

const CONVERSATION_RETENTION_DAYS = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

const MESA_API_BASE_URL = window.MESA_API_BASE_URL || "";

function buildMockRestaurantConfig() {
  const r = window.MOCK_RESTAURANT || {};
  return {
    id: "mock-restaurant",
    name: r.name || "Restaurante",
    style: r.style || "",
    description: window.MOCK_RESTAURANT_DESCRIPTION || "",
    timezone: "America/Sao_Paulo",
    businessHours: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => ({
      day,
      enabled: !!r.characteristics?.weekdays?.[day],
      open: r.characteristics?.open || "12:00",
      close: r.characteristics?.close || "23:30",
    })),
    aiGuide: {
      topics: (window.MOCK_AI_QUESTIONS || []).map(topic => ({ fixed: true, ...topic })),
    },
    settings: {
      autonomy: "media",
      tone: "Acolhedor, objetivo e profissional.",
      characteristics: {
        petFriendly: !!r.characteristics?.petFriendly,
        outdoor: !!r.characteristics?.outdoor,
        highEnd: !!r.characteristics?.highEnd,
        birthdays: !!r.characteristics?.birthdays,
      },
      teamContactTriggers: {
        waitingCustomer: true,
        reservationScheduled: true,
        reservationArriving: true,
        reservationCancelled: true,
        ...(r.teamContactTriggers || {}),
      },
      menuSettings: {
        canSendFiles: r.menuSettings?.canSendFiles ?? true,
        sendMode: r.menuSettings?.sendMode || "on_request",
      },
      humanReviewTriggers: [],
    },
  };
}

function normalizeRestaurantConfig(input = {}) {
  const fallback = buildMockRestaurantConfig();
  return {
    ...fallback,
    ...input,
    description: input.description ?? fallback.description,
    businessHours: Array.isArray(input.businessHours) ? input.businessHours : fallback.businessHours,
    aiGuide: {
      ...fallback.aiGuide,
      ...(input.aiGuide || {}),
      topics: Array.isArray(input.aiGuide?.topics) ? input.aiGuide.topics : fallback.aiGuide.topics,
    },
    settings: {
      ...fallback.settings,
      ...(input.settings || {}),
      characteristics: {
        ...fallback.settings.characteristics,
        ...(input.settings?.characteristics || {}),
      },
      teamContactTriggers: {
        ...fallback.settings.teamContactTriggers,
        ...(input.settings?.teamContactTriggers || {}),
      },
      menuSettings: {
        ...fallback.settings.menuSettings,
        ...(input.settings?.menuSettings || {}),
      },
    },
  };
}

function mergeRestaurantConfig(current, patch) {
  return normalizeRestaurantConfig({
    ...current,
    ...patch,
    aiGuide: {
      ...(current.aiGuide || {}),
      ...(patch.aiGuide || {}),
    },
    settings: {
      ...(current.settings || {}),
      ...(patch.settings || {}),
      characteristics: {
        ...(current.settings?.characteristics || {}),
        ...(patch.settings?.characteristics || {}),
      },
      teamContactTriggers: {
        ...(current.settings?.teamContactTriggers || {}),
        ...(patch.settings?.teamContactTriggers || {}),
      },
      menuSettings: {
        ...(current.settings?.menuSettings || {}),
        ...(patch.settings?.menuSettings || {}),
      },
    },
  });
}

async function mesaApi(path, options = {}) {
  const response = await fetch(`${MESA_API_BASE_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Mesa API ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

function normalizeTable(table, index) {
  const legacyNumber = String(table.id || "").match(/\d+/)?.[0];
  const number = Number(table.number ?? legacyNumber ?? index + 1);
  const legacyLocation = String(table.area || "").toLowerCase().includes("externa") ? "outside" : "inside";

  return {
    uid: table.uid || table.id || `table-${index + 1}`,
    id: table.id || table.uid || `table-${index + 1}`,
    number: Number.isInteger(number) && number > 0 ? number : index + 1,
    location: table.location || legacyLocation,
    seats: Number(table.seats) || 2,
    active: table.active ?? true,
  };
}

function normalizeTeamMember(member, index) {
  return {
    uid: member.uid || member.id || `team-${index + 1}`,
    id: member.id || member.uid || `team-${index + 1}`,
    name: member.name || "",
    phone: member.phone || member.phoneE164 || "",
    activeToday: member.activeToday ?? true,
  };
}

function cloneMessagesByConversation(messagesByConversation = {}) {
  return Object.fromEntries(
    Object.entries(messagesByConversation).map(([conversationId, messages]) => [
      conversationId,
      Array.isArray(messages) ? messages.map(message => ({ ...message })) : [],
    ])
  );
}

function getConversationRetentionDays(retention) {
  if (retention?.preset === "custom") {
    return Math.max(1, Math.floor(Number(retention.customDays) || DEFAULT_CONVERSATION_RETENTION.customDays));
  }

  return CONVERSATION_RETENTION_DAYS[retention?.preset] || CONVERSATION_RETENTION_DAYS[DEFAULT_CONVERSATION_RETENTION.preset];
}

function getConversationUpdatedAtMs(conversation) {
  const timestamp = Date.parse(conversation?.updatedAt || conversation?.lastActivityAt || "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getConversationReferenceTime(conversations) {
  const timestamps = conversations
    .map(getConversationUpdatedAtMs)
    .filter(timestamp => timestamp != null);

  if (!timestamps.length) return Date.now();
  return Math.max(Date.now(), ...timestamps);
}

function getExpiredConversationIds(conversations, retention) {
  const days = getConversationRetentionDays(retention);
  const cutoff = getConversationReferenceTime(conversations) - days * 24 * 60 * 60 * 1000;

  return conversations
    .filter(conversation => {
      const updatedAt = getConversationUpdatedAtMs(conversation);
      return updatedAt != null && updatedAt < cutoff;
    })
    .map(conversation => conversation.id);
}

function App() {
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "theme": "light",
    "showWhatsappAlert": false
  }/*EDITMODE-END*/);

  const [page, setPage] = useStateApp("reservas");
  const [wppConnected, setWppConnected] = useStateApp(true);
  const [restaurantConfig, setRestaurantConfig] = useStateApp(() => normalizeRestaurantConfig());
  const [tables, setTables] = useStateApp(() => window.MOCK_TABLES.map(normalizeTable));
  const [team, setTeam] = useStateApp(() => window.MOCK_TEAM.map(normalizeTeamMember));
  const [conversations, setConversations] = useStateApp(() => window.MOCK_CONVERSATIONS.map(conversation => ({
    ...conversation,
    summary: conversation.summary ? { ...conversation.summary } : conversation.summary,
  })));
  const [messagesByConversation, setMessagesByConversation] = useStateApp(() => cloneMessagesByConversation(window.MOCK_MESSAGES));
  const [conversationRetention, setConversationRetention] = useStateApp(DEFAULT_CONVERSATION_RETENTION);

  const deleteConversationsByIds = (ids) => {
    const idsToDelete = new Set(ids);
    if (!idsToDelete.size) return;

    setConversations(current => current.filter(conversation => !idsToDelete.has(conversation.id)));
    setMessagesByConversation(current => {
      const nextMessages = { ...current };
      idsToDelete.forEach(id => {
        delete nextMessages[id];
      });
      return nextMessages;
    });
  };

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.theme || "light");
  }, [t.theme]);

  React.useEffect(() => {
    deleteConversationsByIds(getExpiredConversationIds(conversations, conversationRetention));
  }, [conversations, conversationRetention]);

  useEffectApp(() => {
    let cancelled = false;
    mesaApi("/configuration")
      .then((configuration) => {
        if (cancelled) return;
        setRestaurantConfig(normalizeRestaurantConfig(configuration.restaurant));
        setTables((configuration.tables || []).map(normalizeTable));
        setTeam((configuration.team || []).map(normalizeTeamMember));
      })
      .catch((error) => {
        console.warn("Mesa API unavailable; using local mock state.", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveRestaurantConfig = async (patch) => {
    setRestaurantConfig(current => mergeRestaurantConfig(current, patch));
    try {
      const updated = await mesaApi("/configuration/restaurant", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setRestaurantConfig(current => mergeRestaurantConfig(current, updated));
    } catch (error) {
      console.warn("Could not persist restaurant configuration.", error);
    }
  };

  const showAlert = t.showWhatsappAlert && !wppConnected ? true : t.showWhatsappAlert;
  const tableManagerProps = {
    tables,
    onCreateTable: async (table) => {
      const temp = { uid: `table-${Date.now()}-${Math.random().toString(16).slice(2)}`, id: null, ...table };
      setTables(current => [
        ...current,
        temp,
      ]);
      try {
        const saved = await mesaApi("/configuration/tables", {
          method: "POST",
          body: JSON.stringify(table),
        });
        setTables(current => current.map(item => item.uid === temp.uid ? normalizeTable(saved, current.length) : item));
      } catch (error) {
        console.warn("Could not persist table.", error);
      }
    },
    onUpdateTable: async (uid, nextTable) => {
      setTables(current => current.map(table => table.uid === uid ? { ...table, ...nextTable } : table));
      const table = tables.find(item => item.uid === uid);
      if (!table?.id) return;
      try {
        await mesaApi(`/configuration/tables/${encodeURIComponent(table.id)}`, {
          method: "PATCH",
          body: JSON.stringify(nextTable),
        });
      } catch (error) {
        console.warn("Could not persist table update.", error);
      }
    },
    onDeleteTable: async (uid) => {
      const table = tables.find(item => item.uid === uid);
      setTables(current => current.filter(table => table.uid !== uid));
      if (!table?.id) return;
      try {
        await mesaApi(`/configuration/tables/${encodeURIComponent(table.id)}`, { method: "DELETE" });
      } catch (error) {
        console.warn("Could not delete table.", error);
      }
    },
  };
  const teamManagerProps = {
    team,
    onCreateTeamMember: async (member) => {
      const temp = { uid: `team-${Date.now()}-${Math.random().toString(16).slice(2)}`, id: null, ...member };
      setTeam(current => [
        ...current,
        temp,
      ]);
      try {
        const saved = await mesaApi("/configuration/team", {
          method: "POST",
          body: JSON.stringify({ ...member, phone: member.phone }),
        });
        setTeam(current => current.map(item => item.uid === temp.uid ? normalizeTeamMember(saved, current.length) : item));
      } catch (error) {
        console.warn("Could not persist team member.", error);
      }
    },
    onUpdateTeamMember: async (uid, nextMember) => {
      setTeam(current => current.map(member => member.uid === uid ? { ...member, ...nextMember } : member));
      const member = team.find(item => item.uid === uid);
      if (!member?.id) return;
      try {
        await mesaApi(`/configuration/team/${encodeURIComponent(member.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ ...nextMember, phone: nextMember.phone }),
        });
      } catch (error) {
        console.warn("Could not persist team member update.", error);
      }
    },
    onDeleteTeamMember: async (uid) => {
      const member = team.find(item => item.uid === uid);
      setTeam(current => current.filter(member => member.uid !== uid));
      if (!member?.id) return;
      try {
        await mesaApi(`/configuration/team/${encodeURIComponent(member.id)}`, { method: "DELETE" });
      } catch (error) {
        console.warn("Could not delete team member.", error);
      }
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
        {page === "reservas"  && <ReservationsPage {...tableManagerProps} {...teamManagerProps} />}
        {page === "conversas" && (
          <ConversationsPage
            conversations={conversations}
            messagesByConversation={messagesByConversation}
          />
        )}
        {page === "geral"     && (
          <GeralPage
            wppConnected={wppConnected}
            setWppConnected={setWppConnected}
            restaurantConfig={restaurantConfig}
            onRestaurantChange={saveRestaurantConfig}
            conversationCount={conversations.length}
            conversationRetention={conversationRetention}
            onRetentionChange={setConversationRetention}
            onDeleteAllConversations={() => deleteConversationsByIds(conversations.map(conversation => conversation.id))}
            {...tableManagerProps}
            {...teamManagerProps}
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
