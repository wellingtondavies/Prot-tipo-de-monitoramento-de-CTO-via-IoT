// Configuracoes do painel. Precisam bater com o firmware do ESP32 (sketch.ino).

// O navegador nao abre conexao TCP direta, por isso o painel usa MQTT sobre
// WebSocket seguro (wss, porta 8884). O ESP32 usa MQTT puro na porta 1883.
// E o mesmo broker: as mensagens de um chegam no outro.
// Pode ser trocado sem mexer no codigo criando um arquivo .env com
// VITE_BROKER_URL=wss://outro-broker:porta/mqtt
export const BROKER_URL: string = import.meta.env.VITE_BROKER_URL ?? "wss://broker.hivemq.com:8884/mqtt";

export const CTO_ID = "CTO-001";

const TOPICO_BASE = "ftth/cto/fag-grupo01";

export const TOPICOS = {
  telemetria: `${TOPICO_BASE}/telemetria`,
  alertas: `${TOPICO_BASE}/alertas`,
  comandos: `${TOPICO_BASE}/comandos`,
  respostas: `${TOPICO_BASE}/respostas`,
} as const;

// O ESP32 publica telemetria a cada 10 s. Sem mensagens por mais que isso,
// o painel avisa que o dispositivo parou de responder.
export const TEMPO_SEM_RESPOSTA_MS = 25_000;

// Quantidade de pontos mantidos nos graficos e de eventos na lista.
export const MAX_PONTOS = 40;
export const MAX_EVENTOS = 50;

// Faixas aceitas pelo firmware para os limites.
export const FAIXA_TEMP = { min: -40, max: 80 };
export const FAIXA_UMID = { min: 0, max: 100 };
