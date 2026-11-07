import { useNavigate } from "react-router-dom";
import {
  Search, Phone, MoreVertical, CheckSquare, Tag, ArrowRight, Plus, User, Building, Mail,
  MessageCircle, ExternalLink, Tags, Activity, Merge, Trash2, PanelRightClose,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LabelSelector } from "@/components/inbox/LabelSelector";
import { PriorityBadge } from "@/components/inbox/PriorityBadge";
import { ConversationStatusBadge } from "@/components/inbox/ConversationStatusBadge";
import { ShadowSdrPanel } from "@/components/inbox/ShadowSdrPanel";
import { LeadContactIcons } from "@/components/inbox/LeadContactIcons";
import { initials } from "@/lib/inbox-ui";
import type { useAppState } from "@/contexts/AppContext";
import type { useInbox, LeadConversation, Message } from "@/hooks/useInbox";
import type { Lead, PipelineColumn, Task } from "@/types";
import type { ShadowSdrConversationInput } from "@/types/shadow-sdr";

type AppState = ReturnType<typeof useAppState>;
type InboxState = ReturnType<typeof useInbox>;

interface InboxLeadPanelProps {
  isMobile: boolean;
  mobileView: "list" | "chat";
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  selectedLeadGroup: LeadConversation | undefined;
  selectedLead: Lead | null;
  leadColumn: PipelineColumn | undefined;
  leadTasks: Task[];
  columns: PipelineColumn[];
  messages: Message[];
  shadowSdrInput: ShadowSdrConversationInput | null;
  updateLead: AppState["updateLead"];
  moveLead: AppState["moveLead"];
  toggleTaskStatus: AppState["toggleTaskStatus"];
  onRefresh: InboxState["refresh"];
  updateLabels: InboxState["updateLabels"];
  onOpenTaskModal: () => void;
  onOpenTagModal: () => void;
  onOpenMergeModal: () => void;
  onOpenDeleteConfirm: () => void;
}

// Painel de contexto do lead (coluna retrátil no desktop, overlay no mobile).
export function InboxLeadPanel({
  isMobile, mobileView, panelOpen, onPanelOpenChange, selectedLeadGroup, selectedLead, leadColumn,
  leadTasks, columns, messages, shadowSdrInput, updateLead, moveLead, toggleTaskStatus, onRefresh,
  updateLabels, onOpenTaskModal, onOpenTagModal, onOpenMergeModal, onOpenDeleteConfirm,
}: InboxLeadPanelProps) {
  const navigate = useNavigate();

  return (
    <>
      {isMobile && panelOpen && selectedLeadGroup && mobileView === "chat" && (
        <div
          className="fixed inset-0 z-40 bg-black/40 animate-in fade-in"
          onClick={() => onPanelOpenChange(false)}
        />
      )}
      <div
        className={
          isMobile
            ? `fixed inset-y-0 right-0 z-50 w-[90vw] max-w-sm bg-card ghost-border border-l flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
                panelOpen && selectedLeadGroup && mobileView === "chat" ? "translate-x-0" : "translate-x-full"
              }`
            : `ghost-border border-l bg-card overflow-hidden transition-all duration-300 ease-in-out flex flex-col shrink-0 ${
                panelOpen && selectedLeadGroup ? "w-80 opacity-100" : "w-0 opacity-0 border-none"
              }`
        }
      >
        {selectedLeadGroup && (
          <div className="w-full flex flex-col h-full">
            <div className="relative p-5 ghost-border border-b bg-gradient-to-b from-primary/5 to-transparent">
              {/* Erros 3/4: botão de recolher o painel vive dentro do próprio painel */}
              <button
                onClick={() => onPanelOpenChange(false)}
                aria-label="Recolher painel do lead"
                title="Recolher painel"
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors z-10"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
              <div className="flex flex-col items-center text-center mb-4">
                <div className="h-16 w-16 rounded-card bg-gradient-to-br from-primary to-[#e04400] flex items-center justify-center text-xl font-bold text-primary-foreground shadow-lg mb-3 transform rotate-3 hover:rotate-0 transition-transform">
                  {initials(selectedLead?.name || selectedLeadGroup.lead_name)}
                </div>
                <h3 className="text-sm font-bold text-foreground line-clamp-1">{selectedLead?.name || selectedLeadGroup.lead_name}</h3>
                {selectedLead?.id && (
                  <div className="mt-1">
                    <LeadContactIcons leadId={selectedLead.id} />
                  </div>
                )}
                <Select
                  value={selectedLeadGroup.category || "lead"}
                  onValueChange={(val: NonNullable<Lead["category"]>) => {
                    if (selectedLead) {
                      updateLead(selectedLead.id, { category: val });
                      // Optimistic update on conversation group
                      onRefresh();
                    } else {
                      toast.error("Vincule um Lead primeiro.");
                    }
                  }}
                >
                  <SelectTrigger className={`mt-1 text-[9px] h-5 px-2 py-0 border-none uppercase font-black w-auto shadow-none ${
                      selectedLeadGroup.category === "partner" ? "bg-blue-500/20 text-blue-600" : 
                      selectedLeadGroup.category === "collaborator" ? "bg-purple-500/20 text-purple-600" :
                      "bg-primary/10 text-primary"
                    }`}>
                    <SelectValue placeholder="LEAD" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-[hsl(var(--border-strong))] bg-card">
                    <SelectItem value="lead" className="text-[10px] font-bold">LEAD</SelectItem>
                    <SelectItem value="partner" className="text-[10px] font-bold">PARCEIRO</SelectItem>
                    <SelectItem value="collaborator" className="text-[10px] font-bold">COLABORADOR</SelectItem>
                  </SelectContent>
                </Select>
                {selectedLead?.company && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building className="h-2.5 w-2.5" /> {selectedLead.company}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                  <ConversationStatusBadge status={selectedLeadGroup.status} />
                  <PriorityBadge priority={selectedLeadGroup.priority} />
                  {selectedLeadGroup.category === "lead" && selectedLead?.value && (
                    <span className="text-[9px] font-bold bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded-full shadow-sm">
                      R$ {selectedLead.value.toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
              {selectedLead ? (
                <Button variant="outline" size="sm" className="w-full text-[11px] gap-2 h-8 rounded-xl border-[hsl(var(--border-strong))] hover:bg-primary/5 hover:text-primary transition-all" onClick={() => navigate(`/leads/${selectedLead.id}`)}>
                  <User className="h-3.5 w-3.5" /> Ver perfil completo
                </Button>
              ) : (
                <div className="text-[10px] text-muted-foreground text-center py-2 px-4 bg-muted/30 rounded-xl">
                  Contato ainda não vinculado a um Lead no CRM.
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto no-scrollbar">
              <div className="p-5 space-y-6">
                {/* Pipeline Stage - Only for Leads */}
                {selectedLead && selectedLeadGroup.category === "lead" && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" /> Estágio no Funil
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[hsl(var(--border-strong))] bg-background hover:border-[hsl(var(--border-strong))] transition-all group">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-2 w-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: leadColumn?.color || "#9b87f5" }} />
                            <span className="text-xs font-semibold text-foreground truncate">{leadColumn?.name || "Sem estágio"}</span>
                          </div>
                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64 p-1.5 rounded-xl border-[hsl(var(--border-strong))] shadow-xl">
                        {columns.map(col => (
                          <DropdownMenuItem
                            key={col.id}
                            className={`text-xs gap-2.5 p-2.5 rounded-lg transition-colors ${col.id === selectedLead.column_id ? "bg-primary/10 text-primary font-bold" : "hover:bg-secondary"}`}
                            disabled={col.id === selectedLead.column_id}
                            onClick={() => moveLead(selectedLead.id, col.id)}
                          >
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                            {col.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Contact Details */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Contato</p>
                  <div className="space-y-2">
                    {selectedLeadGroup.lead_phone && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-transparent hover:border-[hsl(var(--border-strong))] transition-all group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-foreground font-medium truncate">{selectedLeadGroup.lead_phone}</span>
                        </div>
                        <MessageCircle className="h-3 w-3 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                    {selectedLeadGroup.lead_email && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-transparent hover:border-[hsl(var(--border-strong))] transition-all group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] text-foreground font-medium truncate">{selectedLeadGroup.lead_email}</span>
                        </div>
                        <ExternalLink className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Lead Analytics (Inspired by Chatwoot) */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                     <Activity className="h-3.5 w-3.5" /> Estatísticas do Lead
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-3 bg-secondary/20 rounded-xl border border-[hsl(var(--border-strong))]">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Mensagens</p>
                      <p className="text-lg font-heading font-bold text-primary">{messages.length}</p>
                    </div>
                    <div className="p-3 bg-secondary/20 rounded-xl border border-[hsl(var(--border-strong))]">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Canais</p>
                      <p className="text-lg font-heading font-bold text-primary">{selectedLeadGroup.channels.length}</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 px-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Primeiro Contato</span>
                      <span className="font-bold text-foreground/80">{messages.length > 0 ? new Date(messages[0].created_at).toLocaleDateString("pt-BR") : "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Última Interação</span>
                      <span className="font-bold text-foreground/80">{selectedLeadGroup.last_message_at ? new Date(selectedLeadGroup.last_message_at).toLocaleDateString("pt-BR") : "N/A"}</span>
                    </div>
                  </div>
                </div>

                <ShadowSdrPanel input={shadowSdrInput} />

                {/* Tasks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                      <CheckSquare className="h-3 w-3" /> Tarefas Próximas
                    </p>
                    <button onClick={() => onOpenTaskModal()} className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {leadTasks.length > 0 ? (
                      leadTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="group flex items-start gap-3 p-2.5 rounded-xl border border-[hsl(var(--border-strong))] bg-background hover:bg-secondary/20 transition-all">
                          <button
                            onClick={() => toggleTaskStatus(task.id)}
                            className={`mt-0.5 h-4 w-4 rounded-lg border-2 flex items-center justify-center transition-all ${
                              task.status === "completed" 
                                ? "bg-success border-success text-white shadow-sm" 
                                : "border-border group-hover:border-[hsl(var(--border-strong))]"
                            }`}
                          >
                            {task.status === "completed" && <Plus className="h-3 w-3 rotate-45" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] leading-tight font-semibold ${task.status === "completed" ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground"}`}>
                              {task.title}
                            </p>
                            {task.due_date && (
                              <p className="text-[9px] text-muted-foreground mt-1 font-medium">Prazo: {new Date(task.due_date).toLocaleDateString("pt-BR")}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 rounded-xl border border-dashed border-[hsl(var(--border-strong))]">
                        <CheckSquare className="h-5 w-5 text-muted-foreground/20 mx-auto mb-1" />
                        <p className="text-[10px] text-muted-foreground italic">Foco total! Nenhuma tarefa pendente.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Labels (Chatwoot style) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                       <Tags className="h-3 w-3" /> Etiquetas de Conversa
                    </p>
                    <LabelSelector 
                      leadId={selectedLeadGroup.lead_id}
                      selectedLabels={selectedLeadGroup.labels || []}
                      onLabelsChange={() => onRefresh()}
                      onUpdateLabels={updateLabels}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLeadGroup.labels && selectedLeadGroup.labels.length > 0 ? (
                      selectedLeadGroup.labels.map(label => (
                        <span 
                          key={label.id} 
                          style={{ backgroundColor: label.color + '20', color: label.color, borderColor: label.color + '40' }}
                          className="text-[9px] font-bold border rounded-lg px-2 py-0.5 shadow-sm"
                        >
                          {label.name}
                        </span>
                      ))
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic pl-1">Sem etiquetas vinculadas...</p>
                    )}
                  </div>
                </div>

                {/* Tags (Lead focus) */}
                {selectedLead && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                         <Tag className="h-3 w-3" /> Tags do Lead
                      </p>
                      <button onClick={() => onOpenTagModal()} className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLead.tags.length > 0 ? (
                        selectedLead.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-bold bg-primary/5 text-primary border border-[hsl(var(--border-strong))] rounded-lg px-2 py-0.5 shadow-sm">{tag}</span>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic pl-1">Organize seu lead com tags...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-5 ghost-border border-t bg-secondary/10 space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs font-bold gap-2 h-10 rounded-xl border-[hsl(var(--border-strong))] hover:bg-primary/5 hover:text-primary hover:border-[hsl(var(--border-strong))] transition-all shadow-sm"
                onClick={() => {
                  if (selectedLead) {
                    navigate(`/leads/${selectedLead.id}`);
                  } else {
                    navigate(`/crm?search=${selectedLeadGroup.lead_name}`);
                  }
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" /> VER NO CRM
              </Button>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[10px] font-bold gap-1.5 h-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                  onClick={() => onOpenMergeModal()}
                >
                  <Merge className="h-3 w-3" /> Mesclar
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-[10px] font-bold gap-1.5 h-9 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                  onClick={() => onOpenDeleteConfirm()}
                >
                  <Trash2 className="h-3 w-3" /> Deletar
                </Button>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-[10px] font-medium gap-2 h-8 rounded-xl opacity-50 hover:opacity-100 transition-all"
                onClick={() => toast.success("Conversa arquivada")}
              >
                <Search className="h-3 w-3 rotate-45" /> Arquivar Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
