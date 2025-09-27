import App from "./App";
import CursorGlow from "./components/CursorGlow";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden stylish-bg">
      {/* Base gradient background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #8B8EBC 0%, #7A7DAF 25%, #9B9ECF 50%, #8B8EBC 75%, #6E71A3 100%)' }}></div>
      
      {/* Secondary gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(45deg, rgba(139, 142, 188, 0.3) 0%, transparent 50%, rgba(122, 125, 175, 0.2) 100%)' }}></div>
      
      {/* Dynamic #963B6B gradient streams */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, transparent 0%, rgba(150, 59, 107, 0.1) 25%, transparent 50%, rgba(150, 59, 107, 0.08) 75%, transparent 100%)' }}></div>
      <div className="absolute inset-0 animate-gradient-shift" style={{ background: 'conic-gradient(from 0deg, transparent 0%, rgba(150, 59, 107, 0.05) 30%, transparent 60%, rgba(150, 59, 107, 0.03) 90%, transparent 100%)' }}></div>
      
      {/* Animated gradient orbs */}
      <div 
        className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl animate-pulse-slow"
        style={{ background: 'radial-gradient(circle, rgba(139, 142, 188, 0.3) 0%, transparent 70%)' }}
      ></div>
      <div 
        className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl animate-pulse-slow-delay"
        style={{ background: 'radial-gradient(circle, rgba(122, 125, 175, 0.25) 0%, transparent 70%)' }}
      ></div>
      <div 
        className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full blur-2xl animate-float"
        style={{ background: 'radial-gradient(circle, rgba(155, 158, 207, 0.2) 0%, transparent 70%)' }}
      ></div>
      
      {/* Dynamic #963B6B accent orbs */}
      <div 
        className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full blur-2xl animate-drift-right"
        style={{ background: 'radial-gradient(circle, rgba(150, 59, 107, 0.15) 0%, transparent 60%)' }}
      ></div>
      <div 
        className="absolute bottom-1/3 left-1/4 w-56 h-56 rounded-full blur-xl animate-drift-left"
        style={{ background: 'radial-gradient(circle, rgba(150, 59, 107, 0.2) 0%, transparent 70%)' }}
      ></div>
      <div 
        className="absolute top-3/4 right-1/3 w-40 h-40 rounded-full blur-lg animate-bounce-slow"
        style={{ background: 'radial-gradient(circle, rgba(150, 59, 107, 0.25) 0%, transparent 65%)' }}
      ></div>
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10 bg-pattern"></div>
      
      {/* Cursor-reactive overlay */}
      <CursorGlow />
      
      {/* Content */}
      <div className="relative z-10">
        <App />
      </div>
    </div>
  );
}