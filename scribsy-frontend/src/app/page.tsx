"use client";
import React, { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  useEffect(() => {
    // Header scroll effect
    const header = document.querySelector("header");
    const onScroll = () => {
      if (header) {
        if (window.scrollY > 50) {
          header.classList.add("shadow-md", "bg-white/95", "border-b", "border-black/10");
        } else {
          header.classList.remove("shadow-md", "bg-white/95", "border-b", "border-black/10");
        }
      }
    };
    window.addEventListener("scroll", onScroll);
    // Chat widget interaction
    const chatWidget = document.querySelector(".chat-widget");
    if (chatWidget) {
      chatWidget.addEventListener("click", () => {
        alert("Chat feature coming soon!");
      });
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur border-b border-black/5 z-50 py-4">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <div className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <span className="w-10 h-10 bg-gradient-to-br from-purple-700 to-purple-400 rounded-lg flex items-center justify-center text-white text-lg">🩺</span>
            SCRIBSY
          </div>
          <ul className="hidden md:flex gap-8 list-none items-center text-gray-600 text-base font-normal">
            <li><a href="#features" className="hover:text-purple-700 transition">Features</a></li>
            <li><a href="#demo" className="hover:text-purple-700 transition">Demo</a></li>
            <li><a href="#pricing" className="hover:text-purple-700 transition">Pricing</a></li>
            <li><a href="#contact" className="hover:text-purple-700 transition">Support</a></li>
          </ul>
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-gray-600 font-medium px-6 py-2 rounded-md hover:text-purple-700 hover:bg-purple-100 transition">Sign in</Link>
            <Link href="/register" className="bg-gradient-to-br from-purple-700 to-purple-400 text-white px-6 py-2 rounded-md font-medium shadow hover:from-purple-800 hover:to-purple-500 transition">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-white pt-32 pb-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-16 items-center w-full">
          <div className="z-10">
            <h1 className="text-5xl md:text-6xl font-light text-gray-900 mb-8 leading-tight drop-shadow">Transform patient encounters into <span className="text-purple-700 font-semibold">clinical documentation</span> instantly.</h1>
            <div className="flex gap-4 mt-8">
              <Link href="/register" className="bg-gradient-to-br from-purple-700 to-purple-400 text-white px-8 py-3 rounded-md font-medium shadow hover:from-purple-800 hover:to-purple-500 transition">Get Started</Link>
            </div>
          </div>
          <div className="relative flex flex-col items-center justify-center">
            <div className="w-full h-[500px] rounded-xl bg-gradient-to-br from-purple-700/80 via-purple-400/70 to-purple-700/90 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden p-8">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 800\'><defs><pattern id=\'grain\' width=\'100\' height=\'100\' patternUnits=\'userSpaceOnUse\'><circle cx=\'20\' cy=\'20\' r=\'1\' fill=\'%23fff\' opacity=\'0.08\'/><circle cx=\'80\' cy=\'40\' r=\'1\' fill=\'%23fff\' opacity=\'0.08\'/><circle cx=\'50\' cy=\'70\' r=\'1\' fill=\'%23fff\' opacity=\'0.08\'/></pattern></defs><rect width=\'600\' height=\'800\' fill=\'%23f0f0f0\'/><ellipse cx=\'200\' cy=\'300\' rx=\'80\' ry=\'120\' fill=\'%23e8e8e8\'/><rect x=\'150\' y=\'220\' width=\'100\' height=\'60\' rx=\'30\' fill=\'%23f5f5f5\'/><rect width=\'600\' height=\'800\' fill=\'url(%23grain)\'/></svg>')] bg-cover bg-center opacity-30" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                <div className="text-black text-3xl md:text-4xl font-semibold text-center drop-shadow-lg mb-8">AI-powered SOAP Note Generation</div>
                <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto">
                  <div className="bg-purple-200/60 rounded-lg px-6 py-4 text-black text-lg font-medium shadow w-full text-center">"45-year-old male presents with acute chest pain..."</div>
                  <div className="bg-purple-200/60 rounded-lg px-6 py-4 text-black text-lg font-medium shadow w-full text-center">"Vital Signs: BP 140/85, HR 88, RR 16..."</div>
                  <div className="bg-purple-200/60 rounded-lg px-6 py-4 text-black text-lg font-medium shadow w-full text-center">"Likely angina pectoris. Differential includes..."</div>
                  <div className="bg-purple-200/60 rounded-lg px-6 py-4 text-black text-lg font-medium shadow w-full text-center">"1. Obtain 12-lead EKG, 2. Order cardiac enzymes..."</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="analytics-section bg-[#1a0f2e] text-white py-16">
        <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-16 items-center">
          <div className="bg-purple-900/80 rounded-2xl p-8 border border-purple-300/20">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-700 rounded flex items-center justify-center text-white text-sm">🩺</div>
              <div className="text-sm font-medium text-gray-200">Clinical Documentation Analytics</div>
            </div>
            <div className="grid grid-cols-10 gap-2 mb-8">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-700 opacity-70 hover:opacity-100 hover:scale-110 transition" />
              ))}
            </div>
            <div className="bg-black/40 rounded-xl p-6 mb-6">
              <div className="text-sm text-gray-400 mb-4">AI Processing vs. Manual Documentation</div>
              <div className="h-28 w-full bg-[url('data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 300 120\'><defs><linearGradient id=\'lineGrad\' x1=\'0%\' y1=\'0%\' x2=\'100%\' y2=\'0%\'><stop offset=\'0%\' style=\'stop-color:%23a78bfa;stop-opacity:1\' /><stop offset=\'100%\' style=\'stop-color:%237c3aed;stop-opacity:1\' /></linearGradient></defs><path d=\'M0,100 Q75,80 150,75 T300,60\' stroke=\'url(%23lineGrad)\' stroke-width=\'3\' fill=\'none\'/><circle cx=\'75\' cy=\'80\' r=\'4\' fill=\'%23a78bfa\'/><circle cx=\'150\' cy=\'75\' r=\'4\' fill=\'%237c3aed\'/><circle cx=\'225\' cy=\'65\' r=\'4\' fill=\'%23a78bfa\'/><circle cx=\'300\' cy=\'60\' r=\'4\' fill=\'%237c3aed\'/></svg>')] bg-no-repeat bg-center bg-contain" />
            </div>
          </div>
          <div className="flex flex-col gap-8">
            <div className="bg-purple-900/60 border-l-4 border-purple-400 p-6 rounded-lg">
              <div className="text-2xl font-light leading-snug text-white">Every clinical outcome at every future time point.</div>
              <div className="text-sm text-gray-400 mt-2">Comprehensive documentation tracking and analysis</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="main-content py-16 grid md:grid-cols-2 max-w-7xl mx-auto gap-16 items-start px-8">
        <div className="pr-0 md:pr-8">
          <h1 className="text-4xl md:text-5xl font-light leading-tight mb-8 text-gray-900">
            What can Scribsy <span className="text-purple-700 font-semibold">do for you?</span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 leading-relaxed">
            Explore a few of our AI-driven solutions below and get in touch to discuss how we can support your clinical documentation needs.
          </p>
          <div className="mb-8">
            <a href="#" className="inline-flex items-center gap-2 bg-purple-700 text-white px-6 py-3 rounded-md font-medium shadow hover:bg-purple-800 transition">
              <span className="bg-white/20 rounded px-1">↗</span>
              See our impact
            </a>
          </div>
          <ul className="space-y-8">
            <li className="flex items-start gap-6 pb-8 border-b border-gray-200 last:border-b-0 last:pb-0">
              <span className="text-lg font-semibold text-purple-700 min-w-[3rem]">01.</span>
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Accelerate Documentation Workflows</h3>
                <p className="text-gray-600">Transform voice recordings into structured SOAP notes in under 2 minutes. Our AI maintains clinical accuracy while reducing documentation time by 75% without additional training required.</p>
              </div>
            </li>
            <li className="flex items-start gap-6 pb-8 border-b border-gray-200 last:border-b-0 last:pb-0">
              <span className="text-lg font-semibold text-purple-700 min-w-[3rem]">02.</span>
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Faster Clinical Decision-Making</h3>
                <p className="text-gray-600">Real-time clinical insights and documentation suggestions help healthcare providers make informed decisions quickly while maintaining comprehensive patient records.</p>
              </div>
            </li>
            <li className="flex items-start gap-6 pb-8 border-b border-gray-200 last:border-b-0 last:pb-0">
              <span className="text-lg font-semibold text-purple-700 min-w-[3rem]">03.</span>
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">SOAP Note Optimization</h3>
                <p className="text-gray-600">Advanced AI algorithms ensure proper medical terminology, clinical structure, and compliance standards are met in every generated document, reducing review time and improving quality.</p>
              </div>
            </li>
          </ul>
        </div>
        <div className="bg-[#2d1b3d] rounded-2xl p-8 m-2 min-h-[600px] relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-8 text-purple-300 text-sm font-medium">
            <span>AI-POWERED</span>
            <span>REDUCE DOCUMENTATION TIME</span>
          </div>
          <div className="mb-8">
            <div className="flex items-center gap-3 text-gray-200 text-base mb-2">
              <div className="w-4 h-4 bg-purple-400 rounded flex items-center justify-center text-white text-xs">✓</div>
              <span>Reduce documentation time by 75%</span>
            </div>
          </div>
          <div className="bg-purple-900/60 rounded-xl p-6 border border-purple-300/20 mt-auto">
            <div className="text-gray-200 text-base font-medium mb-4">Live SOAP Note Generation</div>
            <div className="bg-black/30 rounded-lg p-4 text-gray-300 font-mono text-sm leading-relaxed">
              <div className="mb-2"><span className="text-purple-300 font-semibold">SUBJECTIVE:</span><br />45-year-old male presents with acute chest pain...</div>
              <div className="mb-2"><span className="text-purple-300 font-semibold">OBJECTIVE:</span><br />Vital Signs: BP 140/85, HR 88, RR 16...</div>
              <div className="mb-2"><span className="text-purple-300 font-semibold">ASSESSMENT:</span><br />Likely angina pectoris. Differential includes...</div>
              <div><span className="text-purple-300 font-semibold">PLAN:</span><br />1. Obtain 12-lead EKG<br />2. Order cardiac enzymes...</div>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Widget */}
      <div className="chat-widget fixed bottom-8 right-8 bg-gradient-to-br from-purple-400 to-purple-300 text-white px-6 py-3 rounded-full flex items-center gap-2 cursor-pointer shadow-lg z-50 hover:-translate-y-1 hover:shadow-2xl transition">
        <span className="bg-white/20 rounded-full px-2 py-1">💬</span>
        <span>Chat with us</span>
      </div>
    </>
  );
}