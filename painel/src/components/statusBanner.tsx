import type { StatusCto } from "../types";
import "../styles/statusBanner.css";

// Faixa de situacao geral da CTO. A cor segue o LED RGB do prototipo:
// verde = normal, vermelho = alerta, azul = monitoramento desativado.
interface IStatusBannerProps {
  status: StatusCto | null;
  semResposta: boolean;
  segundosDesdeUltima: number | null;
}

const TEXTOS: Record<StatusCto, { titulo: string; descricao: string }> = {
  normal: { titulo: "Operação normal", descricao: "Tampa fechada e condições ambientais dentro dos limites." },
  alerta: { titulo: "Alerta na CTO", descricao: "Tampa aberta ou temperatura/umidade acima do limite. Veja os eventos." },
  desativado: { titulo: "Monitoramento desativado", descricao: "Os alertas estão suspensos. Envie \"ativar\" para retomar." },
};

export default function StatusBanner({ status, semResposta, segundosDesdeUltima }: IStatusBannerProps) {
  let classe = "neutro";
  let titulo = "Aguardando dados";
  let descricao = "Inicie a simulação no Wokwi. A primeira telemetria chega em até 10 s.";

  if (status && semResposta) {
    titulo = "Dispositivo sem resposta";
    descricao = `Nenhuma mensagem há ${segundosDesdeUltima ?? "?"} s. Verifique se a simulação está rodando.`;
  } else if (status) {
    classe = status;
    titulo = TEXTOS[status].titulo;
    descricao = TEXTOS[status].descricao;
  }

  return (
    <section className={`status-banner status-${classe}`} aria-live="polite">
      <span className="led" />
      <div>
        <h1>{titulo}</h1>
        <p>{descricao}</p>
      </div>
      {segundosDesdeUltima !== null && !semResposta && (
        <small>Atualizado há {segundosDesdeUltima} s</small>
      )}
    </section>
  );
}
