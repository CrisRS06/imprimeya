import Image from "next/image";
import { HomeButtons } from "@/components/home/HomeButtons";

export default function HomePage() {
  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Header con Logo Simple */}
      <header className="px-6 pt-8 pb-6">
        <div className="flex flex-col items-center animate-fade-in">
          <Image
            src="/logo-simple.png"
            alt="Simple! - Vive mejor, al mejor precio"
            width={200}
            height={80}
            priority
            className="h-16 w-auto"
          />
          <div className="mt-4 bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-1.5 rounded-full">
            <span className="text-white font-bold text-sm tracking-wide">
              ImprimeYA
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 pb-8">
        <div className="max-w-md mx-auto">
          <p className="text-center text-gray-500 mb-8 animate-fade-in animation-delay-200">
            ¿Qué quieres imprimir hoy?
          </p>

          <HomeButtons />

          {/* Info note */}
          <div className="mt-8 text-center animate-fade-in animation-delay-500">
            <p className="text-xs text-gray-400">
              Todas las impresiones son en papel carta (8.5&quot; x 11&quot;)
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center">
        <Image
          src="/logo-simple.png"
          alt="Simple!"
          width={100}
          height={40}
          className="h-8 w-auto mx-auto opacity-40"
        />
      </footer>
    </div>
  );
}
