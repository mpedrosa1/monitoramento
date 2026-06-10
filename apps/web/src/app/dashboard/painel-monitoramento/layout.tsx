export default function PainelMonitoramentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-background">{children}</div>
  );
}
