import { useState, useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import * as leadsRepo from "@/services/leads";
import { mapTask } from "@/contexts/app/mappers";
import type { Task } from "@/types";
import type { AddTimelineEvent, AppScope } from "@/contexts/app/types";

interface TasksSliceDeps {
  scope: AppScope;
  /** Tarefas ligadas a um lead geram evento na timeline. */
  addTimelineEvent: AddTimelineEvent;
}

/** Fatia de tarefas: estado e CRUD, incluindo conclusao com resultado. */
export function useTasksSlice({ scope, addTimelineEvent }: TasksSliceDeps) {
  const { tenantId, userClientId, userId, tenantIdForInsert } = scope;
  const [tasks, setTasks] = useState<Task[]>([]);

  const addTask = useCallback(async (data: Partial<Task>): Promise<Task | null> => {
    const clientId = tenantId ?? userClientId;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return null; }

    let row: Awaited<ReturnType<typeof leadsRepo.insertTaskReturning>>;
    try {
      row = await leadsRepo.insertTaskReturning({
        title: data.title ?? "",
        lead_id: data.lead_id || null,
        due_date: data.due_date || null,
        assigned_to: data.assigned_to || "Você",
        // Sem seletor de responsável na UI hoje: "Você" (acima) é sempre o
        // criador, então o dono real da tarefa é quem está logado.
        assigned_to_id: data.assigned_to_id || userId || null,
        priority: data.priority || undefined,
        description: data.description || null,
        client_id: clientId,
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error); toast.error("Erro ao criar tarefa"); return null;
    }
    const newTask = mapTask(row!);
    setTasks((prev) => [newTask, ...prev]);

    if (newTask.lead_id) {
      await addTimelineEvent({
        lead_id: newTask.lead_id,
        type: "task",
        content: `Tarefa criada: ${newTask.title}`,
        user_name: "Usuário",
      });
    }

    toast.success("Tarefa criada");
    return newTask;
  }, [addTimelineEvent, userId, userClientId, tenantId, tenantIdForInsert]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    try {
      await leadsRepo.updateTaskRow(id, data);
    } catch (error) {
      logger.error(error); return;
    }
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await leadsRepo.deleteTaskById(id);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir tarefa"); return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tarefa excluída");
  }, []);

  // 2.6: conclusão com resultado. Só age em tarefa pendente: reconcluir uma
  // tarefa já fechada sobrescreveria o resultado anterior em silêncio.
  const completeTask = useCallback(async (id: string, result?: string): Promise<boolean> => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === "completed") return false;

    const completedAt = new Date().toISOString();
    const trimmedResult = result?.trim() || null;
    const patch = { status: "completed" as const, result: trimmedResult, completed_at: completedAt };

    setTasks((prev) => prev.map((t) => t.id === id
      ? { ...t, status: "completed", result: patch.result ?? undefined, completed_at: completedAt }
      : t));

    try {
      const ok = await leadsRepo.completeTaskRpc(id, patch.result);
      if (!ok) throw new Error("Nenhuma tarefa concluída (fora do tenant ou já concluída)");
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao concluir tarefa");
      setTasks((prev) => prev.map((t) => t.id === id ? task : t));
      return false;
    }

    if (task.lead_id) {
      await addTimelineEvent({
        lead_id: task.lead_id,
        type: "note",
        // O travessao abaixo (escrito como escape unicode) e o texto original gravado na timeline: nao alterar.
        content: trimmedResult
          ? `✅ Tarefa concluída: "${task.title}" \u2014 ${trimmedResult}`
          : `✅ Tarefa concluída: "${task.title}"`,
        user_name: "Usuário",
      });
    }
    return true;
  }, [tasks, addTimelineEvent]);

  // 2.6: edita o resultado de uma tarefa já concluída, sem tocar status/completed_at.
  const updateTaskResult = useCallback(async (id: string, result?: string): Promise<boolean> => {
    const trimmedResult = result?.trim() || null;
    const previous = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, result: trimmedResult ?? undefined } : t));
    try {
      const ok = await leadsRepo.updateTaskResultRpc(id, trimmedResult);
      if (!ok) throw new Error("Resultado não salvo (tarefa não está concluída ou fora do tenant)");
    } catch (error) {
      logger.error(error); toast.error("Erro ao salvar resultado");
      if (previous) setTasks((prev) => prev.map((t) => t.id === id ? previous : t));
      return false;
    }
    return true;
  }, [tasks]);

  const toggleTaskStatus = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "completed" ? "pending" : "completed";

    // Reabrir limpa completed_at (no banco e aqui): tarefa pendente com data de
    // conclusão contaria como concluída na métrica de metas.
    setTasks((prev) => prev.map((t) => t.id === id
      ? { ...t, status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : undefined }
      : t));

    try {
      const ok = newStatus === "completed"
        ? await leadsRepo.completeTaskRpc(id)
        : await leadsRepo.reopenTaskRpc(id);
      if (!ok) throw new Error("Status da tarefa não mudou");
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao alterar status da tarefa");
      setTasks((prev) => prev.map((t) => t.id === id ? task : t));
    }
  }, [tasks]);

  return { tasks, setTasks, addTask, updateTask, deleteTask, completeTask, updateTaskResult, toggleTaskStatus };
}
