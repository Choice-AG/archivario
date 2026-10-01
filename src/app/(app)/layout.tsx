import { ArchivarioApp } from "@/features/library/presentation/app";

// La app se monta una sola vez para todas las vistas: navegar entre ellas no
// vuelve a cargar la biblioteca. Cada página solo aporta su URL y su título.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ArchivarioApp />
      {children}
    </>
  );
}
