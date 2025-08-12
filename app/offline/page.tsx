export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25v6m0 7.5v6M2.25 12h6m7.5 0h6" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">You're Offline</h1>
          
          <p className="text-gray-600 mb-6">
            Ryo Forge AI works best with an internet connection. Some features may be limited while offline.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            
            <div className="text-sm text-gray-500">
              <p>While offline, you can:</p>
              <ul className="mt-2 space-y-1">
                <li>• View your previous conversations</li>
                <li>• Browse health tips</li>
                <li>• Access emergency contacts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
