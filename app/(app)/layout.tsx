import NavBar from "@/components/NavBar"
import TopNav from "@/components/TopNav"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background relative" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
      <NavBar />
      <TopNav />
      <main className="pt-16 relative min-w-0" style={{ zIndex: 1, marginLeft: '16rem', position: 'relative', overflow: 'visible' }}>
        <div className="container mx-auto p-8 max-w-full min-w-0" style={{ position: 'relative', overflow: 'visible' }}>
          {children}
        </div>
      </main>
    </div>
  )
} 