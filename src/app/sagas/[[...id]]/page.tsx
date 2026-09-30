import { ArchivarioApp } from "@/features/library/presentation/app";
export default async function SagasPage({
  params,
}: {
  params: Promise<{ id?: string[] }>;
}) {
  const { id } = await params;
  return <ArchivarioApp initialView="Sagas" initialSagaId={id?.[0]} />;
}
