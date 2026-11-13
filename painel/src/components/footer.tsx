import { BROKER_URL, TOPICOS } from "../config";
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-conteudo">
        <div>
          <strong>Sistema IoT de Monitoramento Inteligente de CTOs em Redes FTTH</strong>
          <p>Wellington Davies dos Santos · Bruno Henrique da Silva · Flavio Antônio Schneider</p>
        </div>
        <div className="footer-tecnico">
          <p>Broker: <code>{BROKER_URL}</code></p>
          <p>Telemetria: <code>{TOPICOS.telemetria}</code></p>
        </div>
      </div>
    </footer>
  );
}
