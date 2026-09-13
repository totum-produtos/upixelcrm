import { useState, useEffect, useCallback } from "react";
import { Settings, RotateCcw, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const STORAGE_KEY = "upixel-preferences";

export type ThemeMode = "light" | "dark" | "system";
export type FontFamily = "inter" | "geist" | "nunito-sans";
export type ThemePreset = "light" | "dark";
export type PageLayout = "centered" | "full";
export type NavbarBehavior = "sticky" | "scroll";
export type SidebarStyle = "inset" | "sidebar" | "floating";
export type SidebarCollapseMode = "icon" | "offcanvas";

export interface Preferences {
  themeMode: ThemeMode;
  fontFamily: FontFamily;
  themePreset: ThemePreset;
  pageLayout: PageLayout;
  navbarBehavior: NavbarBehavior;
  sidebarStyle: SidebarStyle;
  sidebarCollapseMode: SidebarCollapseMode;
}

const DEFAULTS: Preferences = {
  themeMode: "system",
  fontFamily: "inter",
  themePreset: "dark",
  pageLayout: "full",
  navbarBehavior: "sticky",
  sidebarStyle: "sidebar",
  sidebarCollapseMode: "icon",
};

const FONT_MAP: Record<FontFamily, string> = {
  inter: "'Inter', sans-serif",
  geist: "'Geist', sans-serif",
  "nunito-sans": "'Nunito Sans', sans-serif",
};

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePrefs(prefs: Preferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function applyPrefs(prefs: Preferences) {
  const root = document.documentElement;

  // Theme mode
  root.classList.remove("light", "dark");
  if (prefs.themeMode === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "dark" : "light");
  } else {
    root.classList.add(prefs.themeMode);
  }

  // Font family
  root.style.setProperty("--font-sans", FONT_MAP[prefs.fontFamily]);
  root.setAttribute("data-font", prefs.fontFamily);

  // Theme preset
  root.setAttribute("data-theme-preset", prefs.themePreset);

  // Page layout
  root.setAttribute("data-layout", prefs.pageLayout);

  // Navbar behavior
  root.setAttribute("data-navbar", prefs.navbarBehavior);

  // Sidebar style
  root.setAttribute("data-sidebar-style", prefs.sidebarStyle);

  // Sidebar collapse mode
  root.setAttribute("data-sidebar-collapse", prefs.sidebarCollapseMode);
}

// Apply saved prefs on initial load
const initialPrefs = loadPrefs();
applyPrefs(initialPrefs);

export function PreferencesPanel() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(loadPrefs);

  const updatePref = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePrefs(next);
      applyPrefs(next);
      return next;
    });
  }, []);

  const restoreDefaults = useCallback(() => {
    const next = { ...DEFAULTS };
    setPrefs(next);
    savePrefs(next);
    applyPrefs(next);
  }, []);

  // Re-sync if something external changed localStorage
  useEffect(() => {
    if (open) {
      setPrefs(loadPrefs());
    }
  }, [open]);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Preferencias do painel"
        className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
      >
        <Settings className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-80 overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between pr-0">
            <SheetTitle className="text-base">Preferencias</SheetTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Theme Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Modo de Tema
              </Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg border p-1">
                {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updatePref("themeMode", mode)}
                    className={`rounded px-2 py-1.5 text-xs font-medium transition-colors capitalize ${
                      prefs.themeMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode === "light" ? "Claro" : mode === "dark" ? "Escuro" : "Sistema"}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Font Family */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fonte
              </Label>
              <Select value={prefs.fontFamily} onValueChange={(v) => updatePref("fontFamily", v as FontFamily)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inter">Inter</SelectItem>
                  <SelectItem value="geist">Geist</SelectItem>
                  <SelectItem value="nunito-sans">Nunito Sans</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Theme Preset */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preset de Tema
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "light", label: "Claro", bg: "bg-white border-border" },
                  { value: "dark", label: "Escuro", bg: "bg-zinc-950 border-zinc-700" },
                ] as { value: ThemePreset; label: string; bg: string }[]).map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => updatePref("themePreset", preset.value)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${
                      prefs.themePreset === preset.value
                        ? "border-primary"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <div className={`h-8 w-full rounded ${preset.bg} border`} />
                    <span className="text-xs font-medium">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Page Layout */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Layout da Pagina
              </Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
                {([
                  { value: "centered", label: "Centralizado" },
                  { value: "full", label: "Largura Total" },
                ] as { value: PageLayout; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updatePref("pageLayout", opt.value)}
                    className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                      prefs.pageLayout === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Navbar Behavior */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comportamento da Navbar
              </Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
                {([
                  { value: "sticky", label: "Fixo" },
                  { value: "scroll", label: "Rolavel" },
                ] as { value: NavbarBehavior; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updatePref("navbarBehavior", opt.value)}
                    className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                      prefs.navbarBehavior === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Sidebar Style */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Estilo da Sidebar
              </Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg border p-1">
                {(["inset", "sidebar", "floating"] as SidebarStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => updatePref("sidebarStyle", style)}
                    className={`rounded px-2 py-1.5 text-xs font-medium transition-colors capitalize ${
                      prefs.sidebarStyle === style
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {style === "inset" ? "Inset" : style === "sidebar" ? "Sidebar" : "Flutuante"}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Sidebar Collapse Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Modo de Colapso
              </Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border p-1">
                {([
                  { value: "icon", label: "Icone" },
                  { value: "offcanvas", label: "OffCanvas" },
                ] as { value: SidebarCollapseMode; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updatePref("sidebarCollapseMode", opt.value)}
                    className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                      prefs.sidebarCollapseMode === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Restore Defaults */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={restoreDefaults}
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar Padrao
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
