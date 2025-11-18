import Autocomplete from '@/components/Autocomplete'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1a1a1a] py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <header className="text-center mb-12">
          <h1 className="text-3xl font-medium text-gray-100 mb-2 tracking-tight">
            SQL Autocomplete
          </h1>
          <p className="text-sm text-gray-400">
            Natural language to SQL powered by AI
          </p>
        </header>

        <Autocomplete />
      </div>
    </main>
  )
}

