
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            P
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">PantryChef<span className="text-orange-500">AI</span></h1>
        </div>
        <div className="hidden md:block text-sm text-gray-500 font-medium">
          Powered by Gemini 3 Flash
        </div>
      </header>
      <main className="w-full max-w-4xl bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-6 md:p-10 border border-orange-50/50">
        {children}
      </main>
      <footer className="mt-12 text-gray-400 text-xs text-center pb-8">
        © {new Date().getFullYear()} PantryChef AI. All rights reserved.
      </footer>
    </div>
  );
};
