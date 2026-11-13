import "../styles/card.css";

// Card de leitura, adaptado do Card do Full-Net: icone, titulo, valor em
// destaque e a faixa colorida embaixo indicando a situacao daquela medida.
interface ICardProps {
  icon: string;
  alt: string;
  title: string;
  value: string;
  description: string;
  situacao?: "normal" | "alerta" | "neutro";
}

export default function Card({ icon, alt, title, value, description, situacao = "neutro" }: ICardProps) {
  return (
    <div className={`card card-${situacao}`}>
      <span>
        <img src={icon} alt={alt} width={40} height={40} />
        <h3>{title}</h3>
      </span>
      <div>
        <strong className="valor">{value}</strong>
        <p>{description}</p>
      </div>
      <hr />
    </div>
  );
}
