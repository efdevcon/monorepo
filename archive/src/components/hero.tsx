interface Props {
  className?: string;
}

export function Hero(props: Props) {
  let className = "flex";
  if (props.className) className += ` ${props.className}`;

  return <div className={className}>Hero</div>;
}
