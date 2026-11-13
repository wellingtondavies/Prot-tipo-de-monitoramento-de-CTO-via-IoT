import type { Ponto } from "../types";
import "../styles/grafico.css";

// Grafico de linha em SVG puro (sem biblioteca), com a linha tracejada do limite.
interface IGraficoProps {
  title: string;
  unidade: string;
  pontos: Ponto[];
  campo: "temperatura" | "umidade";
  limite: number | null;
}

const LARGURA = 600;
const ALTURA = 200;
const MARGEM = { topo: 16, direita: 16, baixo: 28, esquerda: 44 };

function formatarHora(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Grafico({ title, unidade, pontos, campo, limite }: IGraficoProps) {
  const validos = pontos.filter((p) => p[campo] !== null);
  const ultimo = validos.length ? validos[validos.length - 1][campo] : null;

  // Escala vertical: inclui os valores e o limite, com uma folga
  const valores = validos.map((p) => p[campo] as number);
  if (limite !== null) valores.push(limite);
  let minimo = valores.length ? Math.min(...valores) : 0;
  let maximo = valores.length ? Math.max(...valores) : 100;
  if (maximo - minimo < 10) {
    const meio = (maximo + minimo) / 2;
    minimo = meio - 5;
    maximo = meio + 5;
  }
  const folga = (maximo - minimo) * 0.1;
  minimo = Math.floor(minimo - folga);
  maximo = Math.ceil(maximo + folga);

  const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = ALTURA - MARGEM.topo - MARGEM.baixo;
  const x = (i: number) => MARGEM.esquerda + (pontos.length > 1 ? (i / (pontos.length - 1)) * larguraUtil : larguraUtil);
  const y = (v: number) => MARGEM.topo + (1 - (v - minimo) / (maximo - minimo)) * alturaUtil;

  // Monta o caminho da linha, interrompendo nos pontos sem leitura (null)
  let caminho = "";
  let novoTrecho = true;
  pontos.forEach((p, i) => {
    const v = p[campo];
    if (v === null) {
      novoTrecho = true;
      return;
    }
    caminho += `${novoTrecho ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    novoTrecho = false;
  });

  const marcas = [minimo, (minimo + maximo) / 2, maximo];

  return (
    <div className="grafico">
      <div className="grafico-topo">
        <h3>{title}</h3>
        <strong>{ultimo !== null ? `${ultimo.toFixed(1)} ${unidade}` : "—"}</strong>
      </div>

      {pontos.length === 0 ? (
        <p className="grafico-vazio">Sem leituras ainda.</p>
      ) : (
        <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={`${title} ao longo do tempo`}>
          {marcas.map((m) => (
            <g key={m}>
              <line className="grade" x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={y(m)} y2={y(m)} />
              <text className="eixo" x={MARGEM.esquerda - 8} y={y(m) + 4} textAnchor="end">
                {Math.round(m)}
              </text>
            </g>
          ))}

          {limite !== null && (
            <g>
              <line className="limite" x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={y(limite)} y2={y(limite)} />
              <text className="limite-texto" x={LARGURA - MARGEM.direita} y={y(limite) - 6} textAnchor="end">
                limite {limite} {unidade}
              </text>
            </g>
          )}

          <path className="linha" d={caminho} />
          {ultimo !== null && (
            <circle className="ultimo" cx={x(pontos.length - 1)} cy={y(ultimo)} r={4} />
          )}

          <text className="eixo" x={MARGEM.esquerda} y={ALTURA - 6}>
            {formatarHora(pontos[0].hora)}
          </text>
          <text className="eixo" x={LARGURA - MARGEM.direita} y={ALTURA - 6} textAnchor="end">
            {formatarHora(pontos[pontos.length - 1].hora)}
          </text>
        </svg>
      )}
    </div>
  );
}
