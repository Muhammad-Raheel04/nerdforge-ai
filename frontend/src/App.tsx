import './index.css';

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-all">
        {/* Header with NerdForge branding */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            🛡️ NerdForge AI
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Autonomous AI Security Operations Center
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">✅</span>
              <span className="font-semibold text-green-700 dark:text-green-300">Backend Connected</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">Port 8000</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">✅</span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">Frontend Running</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Port 5173</p>
          </div>
        </div>

        {/* Tailwind Test Button */}
        <div className="text-center">
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-all transform hover:scale-105 shadow-md hover:shadow-lg">
            🚀 Generate Attack Scenario
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Tailwind CSS is working! ✅
          </p>
        </div>

        {/* Tech Stack Badges */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
            React
          </span>
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
            TypeScript
          </span>
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
            Tailwind CSS
          </span>
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
            Vite
          </span>
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
            FastAPI
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;