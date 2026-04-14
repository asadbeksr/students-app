


interface VariableLabelProps {
  variable: string;
  className?: string;
}

export function VariableLabel({ variable, className = '' }: VariableLabelProps) {
  return (
    <span className={`font-serif italic font-bold ${className}`}>
      {variable}
    </span>
  );
}
