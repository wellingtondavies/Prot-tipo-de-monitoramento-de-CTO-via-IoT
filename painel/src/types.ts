// Formatos das mensagens publicadas pelo ESP32.

export type StatusCto = "normal" | "alerta" | "desativado";

// Topico .../telemetria
export interface Telemetria {
  cto: string;
  temperatura: number | null;
  umidade: number | null;
  tampa: "aberta" | "fechada";
  status: StatusCto;
  monitoramento: "ativo" | "desativado";
  sensor_ok: boolean;
  limite_temp: number;
  limite_umid: number;
}

// Topico .../alertas
export interface Alerta {
  cto: string;
  evento: string;
  mensagem: string;
  temperatura: number | null;
  umidade: number | null;
  tampa: "aberta" | "fechada";
}

// Topico .../respostas
export interface Resposta {
  cto: string;
  comando: string;
  resultado: "ok" | "erro";
  detalhe: string;
}

// Ponto dos graficos
export interface Ponto {
  hora: number; // timestamp (ms) de chegada
  temperatura: number | null;
  umidade: number | null;
}

// Item da lista de eventos
export interface Evento {
  id: number;
  hora: number;
  tipo: "alerta" | "normalizado" | "resposta-ok" | "resposta-erro" | "enviado";
  titulo: string;
  detalhe: string;
}

export type EstadoConexao = "conectando" | "conectado" | "reconectando" | "desconectado";
