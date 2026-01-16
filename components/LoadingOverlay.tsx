import React from 'react';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sky-100/90 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-full shadow-xl animate-bounce mb-6">
        <span className="text-6xl">🎨</span>
      </div>
      <h2 className="text-3xl font-bold text-sky-600 animate-pulse text-center px-4">
        {message}
      </h2>
      <div className="mt-4 w-64 h-4 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-sky-500 animate-[loading_2s_ease-in-out_infinite] w-1/2 rounded-full"></div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;