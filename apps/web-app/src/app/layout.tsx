import "./globals.css";
import type React from "react";

export const metadata = {
  title: "StoryOS — Enterprise AI Story Platform",
  description: "End-to-End Bounded Context Domain Viewer & Demo Shell",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <a
              href="/"
              className="text-xl font-bold tracking-tight text-indigo-400 hover:text-indigo-300"
            >
              StoryOS
            </a>
            <span className="text-xs bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
              Enterprise v1.5
            </span>
          </div>
          <nav className="flex items-center space-x-4 text-sm font-medium text-slate-300">
            <a href="/" className="hover:text-white transition">
              Universes
            </a>
          </nav>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-6">{children}</main>

        <footer className="border-t border-slate-800 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
          StoryOS Enterprise AI Platform • Powered by Hexagonal Architecture, CQRS, Postgres, Neo4j
          & Kafka
        </footer>
      </body>
    </html>
  );
}
