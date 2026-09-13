import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload, Search, Image, FileText, Film, Archive, File,
  MoreHorizontal, Download, Trash2, Share2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FileType = "imagem" | "documento" | "video" | "arquivo" | "outro";

interface FileItem {
  id: number;
  nome: string;
  tipo: FileType;
  tamanho: string;
  data: string;
}

const fileIcons: Record<FileType, typeof File> = {
  imagem: Image,
  documento: FileText,
  video: Film,
  arquivo: Archive,
  outro: File,
};

const fileColors: Record<FileType, string> = {
  imagem: "text-blue-500 bg-blue-500/10",
  documento: "text-amber-500 bg-amber-500/10",
  video: "text-violet-500 bg-violet-500/10",
  arquivo: "text-emerald-500 bg-emerald-500/10",
  outro: "text-muted-foreground bg-muted",
};

const mockFiles: FileItem[] = [
  { id: 1, nome: "logo-principal.png", tipo: "imagem", tamanho: "284 KB", data: "2026-09-10" },
  { id: 2, nome: "proposta-comercial.pdf", tipo: "documento", tamanho: "1,2 MB", data: "2026-09-09" },
  { id: 3, nome: "apresentacao-produto.mp4", tipo: "video", tamanho: "45 MB", data: "2026-09-08" },
  { id: 4, nome: "relatorio-agosto.xlsx", tipo: "documento", tamanho: "890 KB", data: "2026-09-07" },
  { id: 5, nome: "banner-campanha.jpg", tipo: "imagem", tamanho: "512 KB", data: "2026-09-06" },
  { id: 6, nome: "backup-leads.zip", tipo: "arquivo", tamanho: "8,4 MB", data: "2026-09-05" },
  { id: 7, nome: "contrato-template.docx", tipo: "documento", tamanho: "234 KB", data: "2026-09-04" },
  { id: 8, nome: "video-tutorial.mp4", tipo: "video", tamanho: "112 MB", data: "2026-09-03" },
  { id: 9, nome: "icones-ui.zip", tipo: "arquivo", tamanho: "3,1 MB", data: "2026-09-02" },
  { id: 10, nome: "foto-equipe.jpg", tipo: "imagem", tamanho: "1,8 MB", data: "2026-09-01" },
  { id: 11, nome: "termos-uso.pdf", tipo: "documento", tamanho: "456 KB", data: "2026-08-30" },
  { id: 12, nome: "foto-produto.png", tipo: "imagem", tamanho: "920 KB", data: "2026-08-29" },
];

const categorias = [
  { id: "todos", label: "Todos", icon: File, count: mockFiles.length },
  { id: "imagem", label: "Imagens", icon: Image, count: mockFiles.filter((f) => f.tipo === "imagem").length },
  { id: "documento", label: "Documentos", icon: FileText, count: mockFiles.filter((f) => f.tipo === "documento").length },
  { id: "video", label: "Videos", icon: Film, count: mockFiles.filter((f) => f.tipo === "video").length },
  { id: "arquivo", label: "Arquivos ZIP", icon: Archive, count: mockFiles.filter((f) => f.tipo === "arquivo").length },
];

export default function FileManagerPage() {
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [search, setSearch] = useState("");

  const filtered = mockFiles.filter((f) => {
    const matchCat = categoriaAtiva === "todos" || f.tipo === categoriaAtiva;
    const matchSearch = f.nome.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <AppLayout title="Arquivos">
      <div className="p-6 h-full">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Sidebar categorias */}
          <aside className="w-48 shrink-0">
            <nav className="space-y-1">
              {categorias.map((cat) => {
                const Icon = cat.icon;
                const active = categoriaAtiva === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaAtiva(cat.id)}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{cat.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-5 justify-center">
                      {cat.count}
                    </Badge>
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 rounded-lg border border-dashed p-4 text-center space-y-2">
              <div className="text-xs text-muted-foreground">Espaco utilizado</div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div className="h-1.5 w-3/5 rounded-full bg-primary" />
              </div>
              <div className="text-xs text-muted-foreground">174 MB de 500 MB</div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar arquivos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 w-56 text-sm"
                />
              </div>
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" />
                Upload
              </Button>
            </div>

            {/* File grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map((file) => {
                const Icon = fileIcons[file.tipo];
                const colorClass = fileColors[file.tipo];
                return (
                  <Card key={file.id} className="group relative hover:border-primary/40 transition-colors cursor-pointer">
                    <CardContent className="p-3 flex flex-col items-center gap-2">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colorClass} mt-1`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="w-full text-center space-y-0.5">
                        <p className="text-xs font-medium truncate" title={file.nome}>{file.nome}</p>
                        <p className="text-xs text-muted-foreground">{file.tamanho}</p>
                      </div>
                      {/* Actions overlay */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2 text-xs">
                              <Download className="h-3.5 w-3.5" /> Baixar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-xs">
                              <Share2 className="h-3.5 w-3.5" /> Compartilhar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-xs text-destructive focus:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
                  Nenhum arquivo encontrado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
