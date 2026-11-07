import { describe, it, expect, vi, afterEach } from "vitest";
import type { Node, Edge } from "reactflow";
import {
  nodesToKommoBot,
  kommoBotToNodes,
  isKommoBot,
  downloadJson,
  readJsonFile,
  type KommoBot,
} from "@/lib/kommo-bot-converter";

const pos = { x: 1, y: 2 };
const n = (id: string, type: string, data: Record<string, unknown> = {}): Node => ({
  id, type, position: pos, data,
});
const e = (source: string, target: string, sourceHandle?: string): Edge => ({
  id: `${source}-${target}`, source, target, sourceHandle,
});

const stepOf = (node: Node, edges: Edge[] = []) =>
  nodesToKommoBot("bot", [node], edges).scenario[0];

describe("nodesToKommoBot", () => {
  it("monta metadata do bot e preserva edges em _upixel", () => {
    const edges = [e("a", "b")];
    const bot = nodesToKommoBot("Meu bot", [n("a", "trigger"), n("b", "message")], edges);
    expect(bot.name).toBe("Meu bot");
    expect(bot.source).toBe("upixel");
    expect(bot.schema_version).toBe("kommo-1.0+upixel");
    expect(bot._upixel?.edges).toBe(edges);
    expect(Number.isNaN(Date.parse(bot.exported_at as string))).toBe(false);
    expect(bot.scenario).toHaveLength(2);
  });

  it("define next_step quando há uma única aresta sem handle", () => {
    expect(stepOf(n("a", "message"), [e("a", "b")]).next_step).toBe("b");
  });

  it("não define next_step com múltiplas arestas ou com handle", () => {
    expect(stepOf(n("a", "message"), [e("a", "b"), e("a", "c")]).next_step).toBeUndefined();
    expect(stepOf(n("a", "message"), [e("a", "b", "x")]).next_step).toBeUndefined();
  });

  it("converte trigger com defaults", () => {
    expect(stepOf(n("t", "trigger")).params).toEqual({ trigger: "new_lead", keywords: "" });
    expect(stepOf(n("t", "trigger", { type: "keyword", keywords: "oi" })).params)
      .toEqual({ trigger: "keyword", keywords: "oi" });
  });

  it("converte message", () => {
    const s = stepOf(n("m", "message", { text: "Olá" }));
    expect(s.type).toBe("send_message");
    expect(s.params).toEqual({ channel: "whatsapp", text: "Olá" });
    expect(s.position).toEqual(pos);
  });

  it("converte condition em branches true/false e remove next_step", () => {
    const conds = [{ field: "tag", operator: "eq", value: "vip" }];
    const s = stepOf(
      n("c", "condition", { conditions: conds, conditionOperator: "or" }),
      [e("c", "yes", "true"), e("c", "no", "false")],
    );
    expect(s.type).toBe("conditions");
    expect(s.params).toEqual({ operator: "or" });
    expect(s.next_step).toBeUndefined();
    expect(s.branches).toEqual([
      { label: "Sim", conditions: conds, next_step: "yes" },
      { label: "Não", conditions: [], next_step: "no" },
    ]);
  });

  it("condition sem arestas gera branches com next_step null", () => {
    const s = stepOf(n("c", "condition"));
    expect(s.params).toEqual({ operator: "and" });
    expect(s.branches?.map((b) => b.next_step)).toEqual([null, null]);
  });

  it("converte delay com coerção numérica e default de 1", () => {
    expect(stepOf(n("d", "delay", { amount: "5", unit: "hours" })).params)
      .toMatchObject({ delay_type: "fixed", amount: 5, unit: "hours" });
    expect(stepOf(n("d", "delay", { amount: "abc" })).params)
      .toMatchObject({ amount: 1, unit: "days" });
  });

  it.each([
    [{ configType: "add_tag", tag: "vip" }, "tags", { tag: "vip" }],
    [{ configType: "change_status", status: "s1" }, "set_status", { status_id: "s1" }],
    [{ configType: "leave_note", note: "n" }, "note", { text: "n" }],
    [{ configType: "assign_user", userId: "u1" }, "assign", { user_id: "u1" }],
  ])("converte action %j", (data, type, params) => {
    const s = stepOf(n("x", "action", data));
    expect(s.type).toBe(type);
    expect(s.params).toEqual(params);
  });

  it("action desconhecida vira custom preservando data", () => {
    const s = stepOf(n("x", "action", { configType: "zzz", foo: 1 }));
    expect(s.type).toBe("custom");
    expect(s.params).toEqual({ configType: "zzz", foo: 1 });
  });

  it("converte webhook com defaults", () => {
    expect(stepOf(n("w", "webhook", { url: "https://x" })).params)
      .toEqual({ url: "https://x", method: "POST", body: undefined, headers: {} });
  });

  it("converte wait_for_reply com branches reply/timeout", () => {
    const s = stepOf(
      n("w", "wait_for_reply", { timeoutHours: "2" }),
      [e("w", "r", "reply"), e("w", "t", "timeout")],
    );
    expect(s.type).toBe("handoff");
    expect(s.params).toEqual({ timeout_hours: 2, save_as: "last_reply" });
    expect(s.branches).toEqual([
      { label: "reply", next_step: "r" },
      { label: "timeout", next_step: "t" },
    ]);
    expect(s.next_step).toBeUndefined();
  });

  it("converte send_media", () => {
    const s = stepOf(n("s", "send_media", { mediaUrl: "u", fileName: "f", caption: "c" }));
    expect(s.type).toBe("send_media");
    expect(s.params).toEqual({
      channel: "whatsapp", media_type: "image", media_url: "u", file_name: "f", caption: "c",
    });
  });

  it("converte randomizer em split com A/B", () => {
    const s = stepOf(n("r", "randomizer", { percentageA: 30 }), [e("r", "a", "a"), e("r", "b", "b")]);
    expect(s.type).toBe("split");
    expect(s.params).toEqual({ percentage_a: 30 });
    expect(s.branches).toEqual([
      { label: "A", next_step: "a" },
      { label: "B", next_step: "b" },
    ]);
    expect(stepOf(n("r", "randomizer")).params).toEqual({ percentage_a: 50 });
  });

  it("converte ai_assistant", () => {
    const s = stepOf(n("i", "ai_assistant", { prompt: "p", outputField: "o" }));
    expect(s.type).toBe("ai_text");
    expect(s.params).toEqual({ prompt: "p", output_field: "o" });
  });

  it("tipo desconhecido ou ausente vira custom com data", () => {
    const s = stepOf(n("z", "mystery", { foo: "bar" }));
    expect(s.type).toBe("custom");
    expect(s.params).toEqual({ foo: "bar" });
    const noData = { id: "q", type: "mystery", position: pos } as Node;
    expect(stepOf(noData).params).toEqual({});
  });
});

describe("kommoBotToNodes", () => {
  it("avisa quando scenario é inválido", () => {
    for (const bad of [{ name: "x" }, { name: "x", scenario: "no" }]) {
      const r = kommoBotToNodes(bad as unknown as KommoBot);
      expect(r.nodes).toEqual([]);
      expect(r.edges).toEqual([]);
      expect(r.warnings[0]).toMatch(/scenario/);
    }
  });

  it("Kommo puro: gera edges a partir de next_step e branches de condition", () => {
    const bot: KommoBot = {
      name: "k",
      scenario: [
        { id: "t", type: "trigger", params: { trigger: "new_lead" }, next_step: "c" },
        {
          id: "c", type: "conditions",
          branches: [
            { conditions: [{ field: "f" }], next_step: "y" },
            { next_step: "n" },
            { next_step: null },
          ],
        },
        { id: "y", type: "send_message", params: { text: "sim" } },
        { id: "n", type: "send_message", params: { text: "não" } },
      ],
    };
    const { nodes, edges, warnings } = kommoBotToNodes(bot);
    expect(warnings).toEqual([]);
    expect(nodes.map((x) => x.type)).toEqual(["trigger", "condition", "message", "message"]);
    expect(nodes[1].data.conditions).toEqual([{ field: "f" }]);
    expect(edges.map((x) => [x.source, x.target, x.sourceHandle])).toEqual([
      ["t", "c", undefined],
      ["c", "y", "true"],
      ["c", "n", "false"],
    ]);
    expect(edges[1].id).toBe("c-true-y");
  });

  it("mapeia handles de split e handoff/operator", () => {
    const bot: KommoBot = {
      name: "k",
      scenario: [
        { id: "s", type: "split", branches: [{ next_step: "a" }, { next_step: "b" }] },
        { id: "h", type: "handoff", branches: [{ next_step: "r" }, { next_step: "t" }] },
        { id: "o", type: "operator", branches: [{ next_step: "r" }, { next_step: "t" }] },
      ],
    };
    const { edges } = kommoBotToNodes(bot);
    expect(edges.map((x) => x.sourceHandle)).toEqual(["a", "b", "reply", "timeout", "reply", "timeout"]);
  });

  it("branch de tipo sem handle conhecido usa id com índice", () => {
    const { edges } = kommoBotToNodes({
      name: "k",
      scenario: [{ id: "x", type: "send_message", branches: [{ next_step: "y" }] }],
    });
    expect(edges[0].id).toBe("x-br0-y");
    expect(edges[0].sourceHandle).toBeUndefined();
  });

  it("posiciona em grid quando não há position e respeita quando há", () => {
    const scenario = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, type: "send_message" }));
    scenario.push({ id: "p", type: "send_message", position: { x: 9, y: 9 } } as never);
    const { nodes } = kommoBotToNodes({ name: "k", scenario });
    expect(nodes[0].position).toEqual({ x: 150, y: 150 });
    expect(nodes[1].position).toEqual({ x: 470, y: 150 });
    expect(nodes[4].position).toEqual({ x: 150, y: 370 });
    expect(nodes[5].position).toEqual({ x: 9, y: 9 });
  });

  it("converte steps de ação conhecidos e avisa nos desconhecidos", () => {
    const { nodes, warnings } = kommoBotToNodes({
      name: "k",
      scenario: [
        { id: "1", type: "tags", params: { tag: "vip" } },
        { id: "2", type: "set_status", params: { status_id: "s" } },
        { id: "3", type: "note", params: { text: "n" } },
        { id: "4", type: "assign", params: { user_id: "u" } },
        { id: "5", type: "alien", params: { x: 1 } },
      ],
    });
    expect(nodes.every((x) => x.type === "action")).toBe(true);
    expect(nodes[0].data).toMatchObject({ configType: "add_tag", tag: "vip" });
    expect(nodes[1].data).toMatchObject({ configType: "change_status", status: "s" });
    expect(nodes[2].data).toMatchObject({ configType: "leave_note", note: "n" });
    expect(nodes[3].data).toMatchObject({ configType: "assign_user", userId: "u" });
    expect(nodes[4].data).toMatchObject({ configType: "custom", x: 1 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('"5"');
  });

  it("aplica defaults nos demais tipos", () => {
    const { nodes } = kommoBotToNodes({
      name: "k",
      scenario: [
        { id: "t", type: "trigger" },
        { id: "m", type: "send_message" },
        { id: "d", type: "pause" },
        { id: "w", type: "webhook" },
        { id: "h", type: "handoff" },
        { id: "s", type: "send_media" },
        { id: "r", type: "split" },
        { id: "a", type: "ai_text", params: { prompt: "p", output_field: "o" } },
      ],
    });
    const d = Object.fromEntries(nodes.map((x) => [x.id, x.data]));
    expect(d.t).toMatchObject({ type: "new_lead", configType: "new_lead", keywords: "" });
    expect(d.m).toMatchObject({ configType: "whatsapp", text: "" });
    expect(d.d).toMatchObject({ delayType: "fixed", amount: 1, unit: "days" });
    expect(d.w).toMatchObject({ method: "POST" });
    expect(d.h).toMatchObject({ timeoutHours: 0, saveAs: "last_reply" });
    expect(d.s).toMatchObject({ configType: "whatsapp", mediaType: "image" });
    expect(d.r).toMatchObject({ percentageA: 50 });
    expect(d.a).toMatchObject({ prompt: "p", outputField: "o" });
  });

  it("round-trip: usa edges de _upixel e preserva posição e dados", () => {
    const nodes: Node[] = [
      n("t", "trigger", { type: "keyword", keywords: "oi" }),
      n("c", "condition", { conditions: [{ field: "f" }] }),
      n("m", "message", { text: "olá" }),
    ];
    const edges: Edge[] = [e("t", "c"), e("c", "m", "true")];
    const bot = nodesToKommoBot("rt", nodes, edges);
    const back = kommoBotToNodes(JSON.parse(JSON.stringify(bot)));
    expect(back.edges).toEqual(edges);
    expect(back.nodes.map((x) => [x.id, x.type, x.position])).toEqual(
      nodes.map((x) => [x.id, x.type, x.position]),
    );
    expect(back.nodes[0].data).toMatchObject({ type: "keyword", keywords: "oi" });
    expect(back.nodes[1].data.conditions).toEqual([{ field: "f" }]);
    expect(back.nodes[2].data.text).toBe("olá");
  });

  it("round-trip com _upixel usa grid de fallback sem position", () => {
    const { nodes } = kommoBotToNodes({
      name: "k", scenario: [{ id: "a", type: "send_message" }], _upixel: { edges: [] },
    });
    expect(nodes[0].position).toEqual({ x: 100, y: 100 });
  });
});

describe("isKommoBot", () => {
  it("valida o formato mínimo", () => {
    expect(isKommoBot({ scenario: [] })).toBe(true);
    expect(isKommoBot({ scenario: "x" })).toBe(false);
    expect(isKommoBot(null)).toBeFalsy();
    expect(isKommoBot("str")).toBeFalsy();
  });
});

describe("downloadJson / readJsonFile", () => {
  afterEach(() => vi.restoreAllMocks());

  it("baixa JSON indentado com o nome informado", async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => { blob = b; return "blob:y"; });
    URL.revokeObjectURL = vi.fn();
    let name = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      name = this.download;
    });
    downloadJson({ a: 1 }, "bot.json");
    expect(name).toBe("bot.json");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:y");
    const text = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsText(blob as Blob);
    });
    expect(text).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it("readJsonFile parseia e propaga erro de JSON inválido", async () => {
    const ok = { text: async () => '{"x":1}' } as unknown as File;
    expect(await readJsonFile(ok)).toEqual({ x: 1 });
    const bad = { text: async () => "{nope" } as unknown as File;
    await expect(readJsonFile(bad)).rejects.toThrow();
  });
});
