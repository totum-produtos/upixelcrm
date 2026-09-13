import { Clock } from "lucide-react";

interface Props {
  title?: string;
  description?: string;
}

export default function ComingSoonPage({
  title = "Em breve",
  description = "Esta funcionalidade está em desenvolvimento.",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 text-center p-8">
      <Clock className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
