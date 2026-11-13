import { CTO_ID } from "../config";
import type { EstadoConexao } from "../types";
import "../styles/header.css";

interface IHeaderProps {
  conexao: EstadoConexao;
}

const TEXTOS: Record<EstadoConexao, string> = {
  conectando: "Conectando ao broker...",
  conectado: "Conectado ao broker",
  reconectando: "Reconectando...",
  desconectado: "Sem conexão",
};

export default function Header({ conexao }: IHeaderProps) {
  return (
    <header className="painel-header">
      <div className="container flex items-center justify-between py-base">
        <div className="marca">
          <img src="/favicon.svg" alt="" width={36} height={36} />
          <div>
            <strong>Painel CTO</strong>
            <span>Monitoramento FTTH · {CTO_ID}</span>
          </div>
        </div>

        <div className={`conexao conexao-${conexao}`} role="status">
          <span className="ponto" />
          {TEXTOS[conexao]}
        </div>
      </div>
    </header>
  );
}
