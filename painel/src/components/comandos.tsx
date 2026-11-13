import { useState } from "react";

import Button from "./button";
import { FAIXA_TEMP, FAIXA_UMID } from "../config";
import "../styles/comandos.css";

// Envia comandos ao ESP32 pelo topico .../comandos.
interface IComandosProps {
  conectado: boolean;
  monitoramentoAtivo: boolean | null;
  limiteTemp: number | null;
  limiteUmid: number | null;
  onEnviar: (comando: string) => boolean;
}

export default function Comandos({ conectado, monitoramentoAtivo, limiteTemp, limiteUmid, onEnviar }: IComandosProps) {
  const [temp, setTemp] = useState("");
  const [umid, setUmid] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function enviar(comando: string) {
    setErro(onEnviar(comando) ? null : "Sem conexão com o broker. Aguarde a reconexão.");
  }

  // Valida o valor antes de enviar, usando as mesmas faixas do firmware
  function enviarLimite(event: React.FormEvent<HTMLFormElement>, chave: "temp_max" | "umid_max") {
    event.preventDefault();
    const texto = chave === "temp_max" ? temp : umid;
    const faixa = chave === "temp_max" ? FAIXA_TEMP : FAIXA_UMID;
    const valor = Number(texto.replace(",", "."));

    if (texto.trim() === "" || Number.isNaN(valor) || valor < faixa.min || valor > faixa.max) {
      setErro(`Informe um número entre ${faixa.min} e ${faixa.max}.`);
      return;
    }
    enviar(`${chave}=${valor}`);
    if (chave === "temp_max") setTemp("");
    else setUmid("");
  }

  return (
    <section className="comandos">
      <h2>Comandos</h2>

      <div className="comandos-botoes">
        <Button text="Solicitar leitura" disabled={!conectado} onClick={() => enviar("status")} />
        {monitoramentoAtivo === false ? (
          <Button text="Ativar monitoramento" secondary disabled={!conectado} onClick={() => enviar("ativar")} />
        ) : (
          <Button text="Desativar monitoramento" secondary disabled={!conectado} onClick={() => enviar("desativar")} />
        )}
      </div>

      <form className="comandos-limite" noValidate onSubmit={(e) => enviarLimite(e, "temp_max")}>
        <label htmlFor="temp-max">
          Limite de temperatura <span>atual: {limiteTemp ?? "—"} °C</span>
        </label>
        <div>
          <input
            id="temp-max"
            type="number"
            step="0.5"
            min={FAIXA_TEMP.min}
            max={FAIXA_TEMP.max}
            placeholder="ex.: 45"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
          />
          <Button text="Aplicar" type="submit" disabled={!conectado} />
        </div>
      </form>

      <form className="comandos-limite" noValidate onSubmit={(e) => enviarLimite(e, "umid_max")}>
        <label htmlFor="umid-max">
          Limite de umidade <span>atual: {limiteUmid ?? "—"} %</span>
        </label>
        <div>
          <input
            id="umid-max"
            type="number"
            step="1"
            min={FAIXA_UMID.min}
            max={FAIXA_UMID.max}
            placeholder="ex.: 85"
            value={umid}
            onChange={(e) => setUmid(e.target.value)}
          />
          <Button text="Aplicar" type="submit" disabled={!conectado} />
        </div>
      </form>

      {erro && <p className="comandos-erro" role="alert">{erro}</p>}
    </section>
  );
}
