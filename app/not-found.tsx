export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">404</h1>
                <h2 className="text-xl text-muted-foreground">This page could not be found.</h2>
                <div className="mt-6">
                    <a
                        href="/"
                        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                        Return Home
                    </a>
                </div>
            </div>
        </div>
    )
} 