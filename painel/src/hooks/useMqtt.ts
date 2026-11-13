import { useCallback, useEffect, useRef, useState } from "react";
import mqtt, { type MqttClient } from "mqtt";

import { BROKER_URL, MAX_EVENTOS, MAX_PONTOS, TOPICOS } from "../config";
import type { Alerta, EstadoConexao, Evento, Ponto, Resposta, Telemetria } from "../types";

// Nomes amigaveis para os eventos enviados pelo ESP32
const NOMES_EVENTOS: Record<string, string> = {
  tampa_aberta: "Tampa aberta",
  tampa_fechada: "Tampa fechada",
  temperatura_alta: "Temperatura alta",
  temperatura_normalizada: "Temperatura normalizada",
  umidade_alta: "Umidade alta",
  umidade_normalizada: "Umidade normalizada",
  falha_sensor: "Falha no sensor",
};

// Eventos que indicam volta ao normal (aparecem em verde na lista)
const EVENTOS_NORMAIS = ["tampa_fechada", "temperatura_normalizada", "umidade_normalizada"];

let proximoId = 1;

function criarEvento(tipo: Evento["tipo"], titulo: string, detalhe: string): Evento {
  return { id: proximoId++, hora: Date.now(), tipo, titulo, detalhe };
}

// Concentra toda a comunicacao MQTT. Os componentes so leem o estado
// retornado e chamam enviarComando().
export function useMqtt() {
  const clienteRef = useRef<MqttClient | null>(null);

  const [conexao, setConexao] = useState<EstadoConexao>("conectando");
  const [telemetria, setTelemetria] = useState<Telemetria | null>(null);
  const [historico, setHistorico] = useState<Ponto[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [ultimaMensagem, setUltimaMensagem] = useState<number | null>(null);

  const adicionarEvento = useCallback((evento: Evento) => {
    setEventos((atual) => [evento, ...atual].slice(0, MAX_EVENTOS));
  }, []);

  useEffect(() => {
    // Client ID aleatorio para nao colidir com outras abas ou pessoas no broker publico
    const cliente = mqtt.connect(BROKER_URL, {
      clientId: `painel-cto-${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      keepalive: 60,
      reconnectPeriod: 3000,
      connectTimeout: 10_000,
    });
    clienteRef.current = cliente;

    cliente.on("connect", () => {
      setConexao("conectado");
      cliente.subscribe([TOPICOS.telemetria, TOPICOS.alertas, TOPICOS.respostas]);
    });
    cliente.on("reconnect", () => setConexao("reconectando"));
    cliente.on("offline", () => setConexao("desconectado"));
    cliente.on("close", () => setConexao((atual) => (atual === "conectado" ? "reconectando" : atual)));

    cliente.on("message", (topico, payload) => {
      let dados: unknown;
      try {
        dados = JSON.parse(payload.toString());
      } catch {
        return; // ignora mensagens que nao sao JSON
      }
      setUltimaMensagem(Date.now());

      if (topico === TOPICOS.telemetria) {
        const t = dados as Telemetria;
        setTelemetria(t);
        setHistorico((atual) =>
          [...atual, { hora: Date.now(), temperatura: t.temperatura, umidade: t.umidade }].slice(-MAX_PONTOS),
        );
      } else if (topico === TOPICOS.alertas) {
        const a = dados as Alerta;
        const tipo = EVENTOS_NORMAIS.includes(a.evento) ? "normalizado" : "alerta";
        adicionarEvento(criarEvento(tipo, NOMES_EVENTOS[a.evento] ?? a.evento, a.mensagem));
      } else if (topico === TOPICOS.respostas) {
        const r = dados as Resposta;
        adicionarEvento(
          criarEvento(r.resultado === "ok" ? "resposta-ok" : "resposta-erro", `Resposta: ${r.comando}`, r.detalhe),
        );
      }
    });

    // Encerra a conexao ao sair da pagina (ou no duplo montagem do StrictMode)
    return () => {
      cliente.end(true);
      clienteRef.current = null;
    };
  }, [adicionarEvento]);

  // Publica um comando no topico .../comandos. Retorna false se estiver sem conexao.
  const enviarComando = useCallback(
    (comando: string) => {
      const cliente = clienteRef.current;
      if (!cliente || !cliente.connected) return false;
      cliente.publish(TOPICOS.comandos, comando, { qos: 0, retain: false });
      adicionarEvento(criarEvento("enviado", `Comando enviado: ${comando}`, "Aguardando resposta do ESP32"));
      return true;
    },
    [adicionarEvento],
  );

  return { conexao, telemetria, historico, eventos, ultimaMensagem, enviarComando };
}
