export default function V3Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#F8F5F0" }}>
      <main>{children}</main>
    </div>
  );
}
