import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Target } from "lucide-react";
import { Link } from "react-router-dom";

const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

interface MetaEvento {
  dia: number;
  titulo: string;
  status: "ativo" | "concluido" | "atrasado" | "pendente";
}

const mockEventos: MetaEvento[] = [
  { dia: 3, titulo: "Meta Receita Q3", status: "ativo" },
  { dia: 5, titulo: "Leads Qualificados", status: "concluido" },
  { dia: 10, titulo: "NPS Setembro", status: "pendente" },
  { dia: 14, titulo: "Conversao Funil", status: "ativo" },
  { dia: 15, titulo: "Campanha Black Friday", status: "pendente" },
  { dia: 20, titulo: "Review Mensal", status: "atrasado" },
  { dia: 25, titulo: "Meta Anual Receita", status: "ativo" },
  { dia: 28, titulo: "Fechamento Trimestre", status: "pendente" },
];

const statusColor: Record<MetaEvento["status"], string> = {
  ativo: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  concluido: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  atrasado: "bg-red-500/15 text-red-600 border-red-500/20",
  pendente: "bg-amber-500/15 text-amber-600 border-amber-500/20",
};

const statusDot: Record<MetaEvento["status"], string> = {
  ativo: "bg-blue-500",
  concluido: "bg-emerald-500",
  atrasado: "bg-red-500",
  pendente: "bg-amber-500",
};

const statusLabel: Record<MetaEvento["status"], string> = {
  ativo: "Ativo",
  concluido: "Concluido",
  atrasado: "Atrasado",
  pendente: "Pendente",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function MetasCalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const eventosDoMes = mockEventos;
  const eventosDoDia = selectedDay !== null
    ? eventosDoMes.filter((e) => e.dia === selectedDay)
    : [];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <AppLayout title="Calendario de Metas">
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Nav back */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
            <Link to="/metas">
              <ChevronLeft className="h-3.5 w-3.5" />
              Voltar para Metas
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {MONTHS[currentMonth]} {currentYear}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS_SHORT.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="h-12 rounded-lg" />;
                  }
                  const eventos = eventosDoMes.filter((e) => e.dia === day);
                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();
                  const isSelected = day === selectedDay;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                      className={`h-12 rounded-lg flex flex-col items-center justify-start pt-1.5 gap-0.5 relative transition-colors ${
                        isSelected
                          ? "bg-primary/15 ring-1 ring-primary"
                          : isToday
                          ? "bg-primary/8 ring-1 ring-primary/30"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <span className={`text-xs font-medium ${isToday ? "text-primary font-bold" : ""}`}>
                        {day}
                      </span>
                      {eventos.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap justify-center px-1">
                          {eventos.slice(0, 3).map((ev, i) => (
                            <span
                              key={i}
                              className={`h-1.5 w-1.5 rounded-full ${statusDot[ev.status]}`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t flex-wrap">
                {(Object.entries(statusDot) as [MetaEvento["status"], string][]).map(([status, dot]) => (
                  <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    {statusLabel[status]}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Events panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {selectedDay !== null
                  ? `${selectedDay} de ${MONTHS[currentMonth]}`
                  : "Todas as Metas"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(selectedDay !== null ? eventosDoDia : eventosDoMes).length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Target className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">Nenhuma meta neste dia.</p>
                </div>
              ) : (
                (selectedDay !== null ? eventosDoDia : eventosDoMes).map((ev, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 rounded-lg border p-3 ${statusColor[ev.status]}`}
                  >
                    <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${statusDot[ev.status]}`} />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs font-medium truncate">{ev.titulo}</p>
                      {selectedDay === null && (
                        <p className="text-xs opacity-70">Dia {ev.dia}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
