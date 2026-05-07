// Icons inspired by SF Symbols (originais)
const Icon = ({ name, size = 16, stroke = 1.6, ...rest }) => {
  const s = size;
  const sw = stroke;
  const common = {
    width: s, height: s, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: sw,
    strokeLinecap: "round", strokeLinejoin: "round",
    ...rest,
  };
  switch (name) {
    case "calendar": return <svg {...common}><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>;
    case "chat":     return <svg {...common}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H10l-4 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5z"/></svg>;
    case "gear":     return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "search":   return <svg {...common}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></svg>;
    case "plus":     return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "chevron":  return <svg {...common}><path d="m9 6 6 6-6 6"/></svg>;
    case "users":    return <svg {...common}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="17" cy="9" r="2.7"/><path d="M16 14c2.5 0 5.5 1.5 5.5 5"/></svg>;
    case "person":   return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>;
    case "table":    return <svg {...common}><rect x="3.5" y="6" width="17" height="13" rx="2"/><path d="M3.5 11h17M9.5 6v13M14.5 6v13"/></svg>;
    case "location": return <svg {...common}><path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case "leaf":     return <svg {...common}><path d="M21 3c0 9-6 15-13 15-2 0-3.5-.5-3.5-.5S5 12 9 8s12-5 12-5z"/><path d="M4 20c4-7 9-11 14-13"/></svg>;
    case "milk":     return <svg {...common}><path d="M9 3h6v3l2 4v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l2-4z"/><path d="M7 13h10"/></svg>;
    case "child":    return <svg {...common}><circle cx="12" cy="6" r="2.5"/><path d="M12 8.5V14m-3 7v-4l-1.5-2.5L9 11h6l1.5 3.5L15 17v4M9 14h6"/></svg>;
    case "pet":      return <svg {...common}><circle cx="6" cy="9" r="1.7"/><circle cx="10" cy="6" r="1.7"/><circle cx="14" cy="6" r="1.7"/><circle cx="18" cy="9" r="1.7"/><path d="M12 11c-3 0-6 3-6 6 0 1.7 1 2.5 2.5 2.5s2-1 3.5-1 2.5 1 3.5 1S18 18.7 18 17c0-3-3-6-6-6z"/></svg>;
    case "cake":     return <svg {...common}><path d="M4 20V13h16v7zM4 16h16M9 13V9a3 3 0 0 1 6 0v4M12 4v3"/></svg>;
    case "warning":  return <svg {...common}><path d="M12 3 2.5 20h19zM12 10v5M12 18v.5"/></svg>;
    case "bell":     return <svg {...common}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2.5h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>;
    case "edit":     return <svg {...common}><path d="M14 4l6 6L9 21H3v-6z"/><path d="M14 4l3-3 6 6-3 3"/></svg>;
    case "x":        return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
    case "more":     return <svg {...common}><circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg>;
    case "send":     return <svg {...common}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>;
    case "paperclip":return <svg {...common}><path d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.5 3.5 0 0 1 5 5L11 18a2 2 0 0 1-3-3l7-7"/></svg>;
    case "ai":       return <svg {...common}><path d="M12 3 13.5 8 19 9l-4 4 1 6-4-3-4 3 1-6-4-4 5.5-1z"/></svg>;
    case "link":     return <svg {...common}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>;
    case "whatsapp": return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9s-.4-.1-.6.1-.7.9-.8 1c-.2.2-.3.2-.6.1a7.6 7.6 0 0 1-2.2-1.4 8.5 8.5 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.5l.4-.4.3-.4a.5.5 0 0 0 0-.5l-.8-2c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.6 4 11 11 0 0 0 1.5.6c.6.2 1.2.2 1.7.1.5-.1 1.6-.7 1.8-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20"/></svg>;
    case "check":    return <svg {...common}><path d="m5 12 5 5L20 7"/></svg>;
    case "drag":     return <svg {...common}><circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/></svg>;
    case "moon":     return <svg {...common}><path d="M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10z"/></svg>;
    case "sun":      return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case "filter":   return <svg {...common}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>;
    case "clock":    return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "pin":      return <svg {...common}><path d="M12 2v6l4 4-4 1-4-1 4-4z"/><path d="M12 13v9"/></svg>;
    case "phone":    return <svg {...common}><path d="M5 4h4l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>;
    default: return null;
  }
};

window.Icon = Icon;
