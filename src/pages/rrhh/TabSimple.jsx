export default function TabSimple({ tabId }) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl p-16 min-h-[400px]">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-3xl">
        ⚙️
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Módulo en construcción</h2>
      <p className="text-gray-500 text-center max-w-sm">
        La sección <span className="font-mono bg-gray-100 text-[#185FA5] px-2 py-0.5 rounded text-sm mx-1">{tabId}</span> estará disponible próximamente en futuras actualizaciones del sistema.
      </p>
    </div>
  );
}