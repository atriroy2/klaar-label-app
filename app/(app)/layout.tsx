import NavBar from "@/components/NavBar"
import TopNav from "@/components/TopNav"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background relative" style={{ overflow: 'hidden' }}>
      <NavBar />
      <TopNav />
      <main className="pt-16 relative" style={{ zIndex: 1, marginLeft: '16rem', position: 'relative', overflow: 'visible' }}>
        <div className="container mx-auto p-8 max-w-full" style={{ position: 'relative', overflow: 'visible' }}>
          {children}
        </div>
      </main>
    </div>
  )
} 