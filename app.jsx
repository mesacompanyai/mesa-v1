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
const MESA_AUTH_STORAGE_KEY = "mesa.auth.v1";

function readStoredAuthSession() {
  try {
    const raw = localStorage.getItem(MESA_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session?.accessToken && session?.user?.email) return session;
  } catch (error) {
    console.warn("Could not read Mesa auth session.", error);
  }

  return null;
}

function persistAuthSession(session) {
  try {
    localStorage.setItem(MESA_AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Could not persist Mesa auth session.", error);
  }
}

function clearAuthSession() {
  try {
    localStorage.removeItem(MESA_AUTH_STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear Mesa auth session.", error);
  }
}

function getUserInitials(user) {
  const source = user?.name || user?.email || "Mesa";
  const words = source
    .replace(/@.*/, "")
    .split(/\s+/)
    .filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : (words[0] || source).slice(0, 2);
  return initials.toUpperCase();
}

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
  const { authToken, ...fetchOptions } = options;
  const storedToken = readStoredAuthSession()?.accessToken;
  const token = authToken === undefined ? storedToken : authToken;
  const response = await fetch(`${MESA_API_BASE_URL}/api${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(fetchOptions.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Mesa API ${response.status}`;
    try {
      const payload = await response.clone().json();
      if (Array.isArray(payload.message)) message = payload.message.join(", ");
      else if (payload.message) message = payload.message;
    } catch (error) {
      // Keep the status-based fallback.
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

function AuthLoadingScreen() {
  return (
    <div className="auth-screen auth-screen-loading">
      <div className="auth-brand-lockup">
        <div className="topbar-brand-mark">M</div>
        <span>Mesa</span>
      </div>
    </div>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useStateApp("login");
  const [form, setForm] = useStateApp({
    restaurantName: "",
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useStateApp(false);
  const [error, setError] = useStateApp("");
  const isRegister = mode === "register";

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body = isRegister
        ? {
            restaurantName: form.restaurantName,
            name: form.name || undefined,
            email: form.email,
            password: form.password,
          }
        : {
            email: form.email,
            password: form.password,
          };
      const session = await mesaApi(isRegister ? "/auth/register" : "/auth/login", {
        method: "POST",
        authToken: null,
        body: JSON.stringify(body),
      });

      persistAuthSession(session);
      onAuthenticated(session);
    } catch (error) {
      if (error.status === 409) {
        setError("Este e-mail já está cadastrado.");
      } else if (error.status === 401) {
        setError("E-mail ou senha inválidos.");
      } else if (error.status === 400) {
        setError("Revise os campos e tente novamente.");
      } else {
        setError("Não foi possível entrar agora.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
  };

  return (
    <div className="auth-screen">
      <section className="auth-shell">
        <div className="auth-panel">
          <div className="auth-brand-lockup">
            <div className="topbar-brand-mark">M</div>
            <span>Mesa</span>
          </div>

          <div className="auth-copy">
            <h1>{isRegister ? "Crie sua operação" : "Entre na Mesa"}</h1>
            <p>{isRegister ? "Configure o primeiro acesso do restaurante." : "Acesse reservas, conversas e ajustes do restaurante."}</p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Acesso">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>
              Entrar
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>
              Cadastrar
            </button>
          </div>

          <form className="auth-form" onSubmit={submitAuth}>
            {isRegister && (
              <>
                <label className="auth-field">
                  <span>Restaurante</span>
                  <input
                    value={form.restaurantName}
                    onChange={(event) => updateField("restaurantName", event.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="organization"
                  />
                </label>
                <label className="auth-field">
                  <span>Seu nome</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    maxLength={120}
                    autoComplete="name"
                  />
                </label>
              </>
            )}

            <label className="auth-field">
              <span>E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>

            <label className="auth-field">
              <span>Senha</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
                minLength={isRegister ? 8 : 1}
                maxLength={128}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}
            </button>
          </form>
        </div>

        <aside className="auth-preview" aria-hidden="true">
          <div className="auth-preview-top">
            <div>
              <span>Hoje</span>
              <strong>18 reservas</strong>
            </div>
            <div className="status-pill status-confirmada"><span className="dot" />Online</div>
          </div>
          <div className="auth-preview-list">
            <div className="auth-preview-row">
              <span>19:30</span>
              <strong>Marina B.</strong>
              <small>4 pessoas</small>
            </div>
            <div className="auth-preview-row">
              <span>20:00</span>
              <strong>Rafael S.</strong>
              <small>2 pessoas</small>
            </div>
            <div className="auth-preview-row active">
              <span>20:30</span>
              <strong>Luiza C.</strong>
              <small>Área externa</small>
            </div>
          </div>
          <div className="auth-preview-message">
            <Icon name="ai" size={15} />
            <span>Recepcionista virtual acompanhando novas solicitações.</span>
          </div>
        </aside>
      </section>
    </div>
  );
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

  const [authSession, setAuthSession] = useStateApp(() => readStoredAuthSession());
  const [authReady, setAuthReady] = useStateApp(false);
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

  const handleLogout = () => {
    clearAuthSession();
    setAuthSession(null);
  };

  const handleAuthenticated = (session) => {
    setAuthSession(session);
    setAuthReady(true);
  };

  const handleApiFailure = (error, fallbackMessage) => {
    if (error?.status === 401) {
      handleLogout();
      return;
    }

    console.warn(fallbackMessage, error);
  };

  useEffectApp(() => {
    const storedSession = readStoredAuthSession();
    if (!storedSession?.accessToken) {
      setAuthReady(true);
      return undefined;
    }

    let cancelled = false;
    mesaApi("/auth/me", { authToken: storedSession.accessToken })
      .then((user) => {
        if (cancelled) return;
        const nextSession = { accessToken: storedSession.accessToken, user };
        persistAuthSession(nextSession);
        setAuthSession(nextSession);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("Mesa session expired or could not be validated.", error);
        clearAuthSession();
        setAuthSession(null);
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    deleteConversationsByIds(getExpiredConversationIds(conversations, conversationRetention));
  }, [conversations, conversationRetention]);

  useEffectApp(() => {
    if (!authSession?.accessToken) return undefined;

    let cancelled = false;
    mesaApi("/configuration", { authToken: authSession.accessToken })
      .then((configuration) => {
        if (cancelled) return;
        setRestaurantConfig(normalizeRestaurantConfig(configuration.restaurant));
        setTables((configuration.tables || []).map(normalizeTable));
        setTeam((configuration.team || []).map(normalizeTeamMember));
      })
      .catch((error) => {
        handleApiFailure(error, "Mesa API unavailable; using local mock state.");
      });
    return () => {
      cancelled = true;
    };
  }, [authSession?.accessToken]);

  const saveRestaurantConfig = async (patch) => {
    setRestaurantConfig(current => mergeRestaurantConfig(current, patch));
    try {
      const updated = await mesaApi("/configuration/restaurant", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setRestaurantConfig(current => mergeRestaurantConfig(current, updated));
    } catch (error) {
      handleApiFailure(error, "Could not persist restaurant configuration.");
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
        handleApiFailure(error, "Could not persist table.");
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
        handleApiFailure(error, "Could not persist table update.");
      }
    },
    onDeleteTable: async (uid) => {
      const table = tables.find(item => item.uid === uid);
      setTables(current => current.filter(table => table.uid !== uid));
      if (!table?.id) return;
      try {
        await mesaApi(`/configuration/tables/${encodeURIComponent(table.id)}`, { method: "DELETE" });
      } catch (error) {
        handleApiFailure(error, "Could not delete table.");
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
        handleApiFailure(error, "Could not persist team member.");
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
        handleApiFailure(error, "Could not persist team member update.");
      }
    },
    onDeleteTeamMember: async (uid) => {
      const member = team.find(item => item.uid === uid);
      setTeam(current => current.filter(member => member.uid !== uid));
      if (!member?.id) return;
      try {
        await mesaApi(`/configuration/team/${encodeURIComponent(member.id)}`, { method: "DELETE" });
      } catch (error) {
        handleApiFailure(error, "Could not delete team member.");
      }
    },
  };

  const navItems = [
    { id: "reservas",  label: "Reservas",  icon: "calendar" },
    { id: "conversas", label: "Conversas", icon: "chat" },
    { id: "geral",     label: "Geral",     icon: "gear" },
  ];
  const currentUser = authSession?.user;
  const currentRestaurantName = currentUser?.restaurantName || restaurantConfig.name || "Restaurante";
  const currentUserLabel = currentUser?.name || currentUser?.email || "Conta";

  if (!authReady) {
    return <AuthLoadingScreen />;
  }

  if (!authSession?.accessToken) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="mesa-app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-brand">
            <div className="topbar-brand-mark">M</div>
            <span>Mesa</span>
            <span style={{ color: "var(--text-3)", fontWeight: 400, marginLeft: 4 }}>·</span>
            <span style={{ color: "var(--text-3)", fontWeight: 400 }}>{currentRestaurantName}</span>
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
          <div className="topbar-user" title={currentUserLabel}>
            <button className="avatar-btn" type="button">{getUserInitials(currentUser)}</button>
            <span>{currentUserLabel}</span>
          </div>
          <button className="btn btn-ghost btn-sm topbar-logout" type="button" onClick={handleLogout}>Sair</button>
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
