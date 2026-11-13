import type { Evento } from "../types";
import "../styles/eventos.css";

// Lista de alertas e respostas, do mais recente para o mais antigo.
interface IEventosProps {
  eventos: Evento[];
}

function formatarHora(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-BR");
}

export default function Eventos({ eventos }: IEventosProps) {
  return (
    <section className="eventos">
      <h2>Eventos</h2>
      {eventos.length === 0 ? (
        <p className="eventos-vazio">Nenhum evento ainda. Abra a tampa ou mude a temperatura no Wokwi.</p>
      ) : (
        <ul>
          {eventos.map((evento) => (
            <li key={evento.id} className={`evento evento-${evento.tipo}`}>
              <time>{formatarHora(evento.hora)}</time>
              <div>
                <strong>{evento.titulo}</strong>
                <p>{evento.detalhe}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
