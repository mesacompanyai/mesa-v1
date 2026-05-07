// Mockdata: restaurante, mesas, IA
window.MOCK_RESTAURANT = {
  name: "Casa Aurora",
  style: "Cozinha contemporânea brasileira",
  pilotMode: true,
  dailyReport: true,
  teamContactTriggers: {
    waitingCustomer: true,
    reservationScheduled: true,
    reservationArriving: true,
    reservationCancelled: true,
  },
  menuSettings: {
    canSendFiles: true,
    sendMode: "on_request",
  },
  characteristics: {
    petFriendly: true,
    outdoor: true,
    highEnd: true,
    birthdays: true,
    weekdays: { "Seg": false, "Ter": true, "Qua": true, "Qui": true, "Sex": true, "Sáb": true, "Dom": true },
    open: "12:00",
    close: "23:30",
  },
};

window.MOCK_TABLES = [
  { id: "Mesa 1", area: "Bar", seats: 2 },
  { id: "Mesa 2", area: "Mezanino", seats: 2 },
  { id: "Mesa 3", area: "Salão Principal", seats: 4 },
  { id: "Mesa 4", area: "Salão Principal", seats: 2 },
  { id: "Mesa 5", area: "Salão Principal", seats: 4 },
  { id: "Mesa 6", area: "Mezanino", seats: 2 },
  { id: "Mesa 7", area: "Salão Principal", seats: 4 },
  { id: "Mesa 8", area: "Salão Principal", seats: 6 },
  { id: "Mesa 9", area: "Salão Principal", seats: 4 },
  { id: "Mesa 10", area: "Salão Principal", seats: 4 },
  { id: "Mesa 11", area: "Área Externa", seats: 4 },
  { id: "Mesa 12", area: "Área Externa", seats: 6 },
  { id: "Mesa 13", area: "Área Externa", seats: 4 },
  { id: "Mesa 14", area: "Salão Principal", seats: 8 },
];

window.MOCK_AI_QUESTIONS = [
  { id: "q1", label: "Nome do cliente", enabled: true, required: true, fixed: true },
  { id: "q2", label: "Data da reserva", enabled: true, required: true, fixed: true },
  { id: "q3", label: "Horário", enabled: true, required: true, fixed: true },
  { id: "q4", label: "Quantidade de pessoas", enabled: true, required: true, fixed: true },
  { id: "q5", label: "Preferência de área", enabled: true, required: false, fixed: true },
  { id: "q6", label: "Restrição alimentar", enabled: true, required: false, fixed: true },
  { id: "q7", label: "Intolerância", enabled: true, required: false, fixed: true },
  { id: "q8", label: "Haverá crianças?", enabled: true, required: false, fixed: true },
  { id: "q9", label: "Haverá pet?", enabled: false, required: false, fixed: true },
  { id: "q10", label: "É comemoração?", enabled: true, required: false, fixed: true },
];

window.MOCK_RESTAURANT_DESCRIPTION = `A Casa Aurora é um restaurante de cozinha contemporânea brasileira, com ambiente acolhedor e atendimento discreto.
A casa recebe casais, famílias e pequenos grupos, valoriza ingredientes sazonais e costuma ter maior movimento entre 20h e 22h.
Há salão principal, mezanino, bar e área externa.`;

window.MOCK_WHATSAPP = {
  connected: true,
  number: "+55 11 9 9810-4422",
  lastConnected: "Conectado há 14 dias",
  hasBeenConnectedBefore: true,
};
