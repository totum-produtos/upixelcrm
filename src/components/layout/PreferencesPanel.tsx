import { useState, useEffect, useCallback } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "upixel-preferences";

export type ThemeMode = "light" | "dark" | "system";
export type FontFamily = "inter" | "geist" | "nunito-sans";
export type ThemePreset = "bw-light" | "bw-dark";
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
  fontFamily: "geist",
  themePreset: "bw-dark",
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

const themePresetOptions: { value: ThemePreset; label: string; dot: string }[] = [
  { value: "bw-light", label: "Black / White Light", dot: "bg-white border border-zinc-300" },
  { value: "bw-dark", label: "Black / White Dark", dot: "bg-zinc-950" },
];

const fontOptions: { value: FontFamily; label: string }[] = [
  { value: "geist", label: "Geist" },
  { value: "inter", label: "Inter" },
  { value: "nunito-sans", label: "Nunito Sans" },
];

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Preferences> & { themePreset?: string };
    const themePreset =
      parsed.themePreset === "light"
        ? "bw-light"
        : parsed.themePreset === "dark"
          ? "bw-dark"
          : parsed.themePreset;
    return { ...DEFAULTS, ...parsed, themePreset: themePreset as ThemePreset };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePrefs(prefs: Preferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function applyPrefs(prefs: Preferences) {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  if (prefs.themeMode === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "dark" : "light");
  } else {
    root.classList.add(prefs.themeMode);
  }

  root.style.setProperty("--font-sans", FONT_MAP[prefs.fontFamily]);
  root.setAttribute("data-font", prefs.fontFamily);
  root.setAttribute("data-theme-preset", prefs.themePreset);
  root.setAttribute("data-layout", prefs.pageLayout);
  root.setAttribute("data-navbar", prefs.navbarBehavior);
  root.setAttribute("data-sidebar-style", prefs.sidebarStyle);
  root.setAttribute("data-sidebar-collapse", prefs.sidebarCollapseMode);
}

const initialPrefs = loadPrefs();
applyPrefs(initialPrefs);

function SectionLabel({ children }: { children: string }) {
  return <Label className="text-[12px] font-medium leading-none text-foreground">{children}</Label>;
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="grid h-8 overflow-hidden rounded-lg border border-border bg-background"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-full border-border px-2 text-[12px] font-medium text-foreground transition-colors hover:bg-muted/70",
            index > 0 && "border-l",
            value === option.value && "bg-muted shadow-inner",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PreferencesPanel() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>(loadPrefs);

  const updatePref = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "themePreset") {
        next.themeMode = value === "bw-light" ? "light" : "dark";
      }
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

  useEffect(() => {
    if (open) {
      setPrefs(loadPrefs());
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Preferences"
          className="fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-lg transition-colors hover:bg-zinc-800"
        >
          <Settings className="h-4 w-4" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="z-[60] w-[278px] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold leading-none">Preferences</h2>
            <p className="text-[12px] leading-5 text-muted-foreground">
              Customize your dashboard layout preferences.
            </p>
          </div>

          <div className="space-y-2">
            <SectionLabel>Theme Preset</SectionLabel>
            <Select value={prefs.themePreset} onValueChange={(value) => updatePref("themePreset", value as ThemePreset)}>
              <SelectTrigger className="h-8 rounded-lg text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {themePresetOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-[12px]">
                    <span className="inline-flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", option.dot)} />
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <SectionLabel>Fonts</SectionLabel>
            <Select value={prefs.fontFamily} onValueChange={(value) => updatePref("fontFamily", value as FontFamily)}>
              <SelectTrigger className="h-8 rounded-lg text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-[12px]">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <SectionLabel>Theme Mode</SectionLabel>
            <SegmentedControl
              value={prefs.themeMode}
              onChange={(value) => updatePref("themeMode", value)}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <SectionLabel>Page Layout</SectionLabel>
            <SegmentedControl
              value={prefs.pageLayout}
              onChange={(value) => updatePref("pageLayout", value)}
              options={[
                { value: "centered", label: "Centered" },
                { value: "full", label: "Full Width" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <SectionLabel>Navbar Behavior</SectionLabel>
            <SegmentedControl
              value={prefs.navbarBehavior}
              onChange={(value) => updatePref("navbarBehavior", value)}
              options={[
                { value: "sticky", label: "Sticky" },
                { value: "scroll", label: "Scroll" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <SectionLabel>Sidebar Style</SectionLabel>
            <SegmentedControl
              value={prefs.sidebarStyle}
              onChange={(value) => updatePref("sidebarStyle", value)}
              options={[
                { value: "inset", label: "Inset" },
                { value: "sidebar", label: "Sidebar" },
                { value: "floating", label: "Floating" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <SectionLabel>Sidebar Collapse Mode</SectionLabel>
            <SegmentedControl
              value={prefs.sidebarCollapseMode}
              onChange={(value) => updatePref("sidebarCollapseMode", value)}
              options={[
                { value: "icon", label: "Icon" },
                { value: "offcanvas", label: "OffCanvas" },
              ]}
            />
          </div>

          <Button variant="outline" className="h-8 w-full rounded-lg text-[12px] font-medium" onClick={restoreDefaults}>
            Restore Defaults
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
