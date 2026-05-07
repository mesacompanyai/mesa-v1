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
  { number: 1, location: "inside", seats: 2 },
  { number: 2, location: "inside", seats: 2 },
  { number: 3, location: "inside", seats: 4 },
  { number: 4, location: "inside", seats: 2 },
  { number: 5, location: "inside", seats: 4 },
  { number: 6, location: "inside", seats: 2 },
  { number: 7, location: "inside", seats: 4 },
  { number: 8, location: "inside", seats: 6 },
  { number: 9, location: "inside", seats: 4 },
  { number: 10, location: "inside", seats: 4 },
  { number: 11, location: "outside", seats: 4 },
  { number: 12, location: "outside", seats: 6 },
  { number: 13, location: "outside", seats: 4 },
  { number: 14, location: "inside", seats: 8 },
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
