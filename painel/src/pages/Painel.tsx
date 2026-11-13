import { useEffect, useState } from "react";

import Header from "../components/header";
import StatusBanner from "../components/statusBanner";
import Card from "../components/card";
import Grafico from "../components/grafico";
import Comandos from "../components/comandos";
import Eventos from "../components/eventos";
import Footer from "../components/footer";

import Termometro from "../assets/termometro.svg";
import Umidade from "../assets/umidade.svg";
import Tampa from "../assets/tampa.svg";
import Sinal from "../assets/sinal.svg";

import { useMqtt } from "../hooks/useMqtt";
import { TEMPO_SEM_RESPOSTA_MS } from "../config";

import "../styles/utility.css";
import "../styles/painel.css";

function formatar(valor: number | null | undefined, unidade: string) {
  return valor === null || valor === undefined ? "—" : `${valor.toFixed(1)} ${unidade}`;
}

export default function Painel() {
  const { conexao, telemetria: t, historico, eventos, ultimaMensagem, enviarComando } = useMqtt();

  // Relogio de 1 s para calcular ha quanto tempo chegou a ultima mensagem
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const segundos = ultimaMensagem === null ? null : Math.max(0, Math.round((agora - ultimaMensagem) / 1000));
  const semResposta = ultimaMensagem !== null && agora - ultimaMensagem > TEMPO_SEM_RESPOSTA_MS;

  const tempAlta = t?.temperatura != null && t.temperatura > t.limite_temp;
  const umidAlta = t?.umidade != null && t.umidade > t.limite_umid;

  return (
    <>
      <Header conexao={conexao} />

      <main className="container py-lg painel">
        <StatusBanner status={t?.status ?? null} semResposta={semResposta} segundosDesdeUltima={segundos} />

        <div className="painel-cards">
          <Card
            icon={Termometro}
            alt="ícone de termômetro"
            title="Temperatura"
            value={formatar(t?.temperatura, "°C")}
            description={t ? `Limite: ${t.limite_temp} °C` : "Aguardando leitura"}
            situacao={!t ? "neutro" : tempAlta ? "alerta" : "normal"}
          />
          <Card
            icon={Umidade}
            alt="ícone de gota"
            title="Umidade"
            value={formatar(t?.umidade, "%")}
            description={t ? `Limite: ${t.limite_umid} %` : "Aguardando leitura"}
            situacao={!t ? "neutro" : umidAlta ? "alerta" : "normal"}
          />
          <Card
            icon={Tampa}
            alt="ícone de caixa"
            title="Tampa"
            value={t ? (t.tampa === "aberta" ? "Aberta" : "Fechada") : "—"}
            description="Contato magnético (pushbutton na simulação)"
            situacao={!t ? "neutro" : t.tampa === "aberta" ? "alerta" : "normal"}
          />
          <Card
            icon={Sinal}
            alt="ícone de sinal"
            title="Sensor DHT22"
            value={!t ? "—" : t.sensor_ok ? "OK" : "Falha"}
            description={t ? `Monitoramento ${t.monitoramento}` : "Aguardando leitura"}
            situacao={!t ? "neutro" : t.sensor_ok ? "normal" : "alerta"}
          />
        </div>

        <div className="painel-graficos">
          <Grafico title="Temperatura" unidade="°C" campo="temperatura" pontos={historico} limite={t?.limite_temp ?? null} />
          <Grafico title="Umidade" unidade="%" campo="umidade" pontos={historico} limite={t?.limite_umid ?? null} />
        </div>

        <div className="painel-inferior">
          <Comandos
            conectado={conexao === "conectado"}
            monitoramentoAtivo={t ? t.monitoramento === "ativo" : null}
            limiteTemp={t?.limite_temp ?? null}
            limiteUmid={t?.limite_umid ?? null}
            onEnviar={enviarComando}
          />
          <Eventos eventos={eventos} />
        </div>
      </main>

      <Footer />
    </>
  );
}
