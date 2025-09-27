import App from "./App";

export default function Home() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Crowdfunding Platform
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            A decentralized crowdfunding platform built on Sui blockchain. Create campaigns, donate to causes, and track funding goals.
          </p>
        </div>
        
        <div className="flex justify-center">
          <App />
        </div>
      </div>
    </div>
  );
}