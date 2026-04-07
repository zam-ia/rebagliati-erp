export default function TabSimple({ tabId }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
      ⚙️ Módulo en construcción: <span className="font-mono">{tabId}</span>
      <div className="text-sm mt-2">Próximamente</div>
    </div>
  );
}