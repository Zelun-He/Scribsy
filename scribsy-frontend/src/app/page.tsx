"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { Brand } from '@/components/brand';

export default function Home() {
  useEffect(() => {
    // Header scroll effect
    const header = document.querySelector("header");
    const onScroll = () => {
      if (header) {
        if (window.scrollY > 50) {
          header.classList.add("shadow-lg", "bg-white/98", "border-b", "border-emerald-100");
        } else {
          header.classList.remove("shadow-lg", "bg-white/98", "border-b", "border-emerald-100");
        }
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-50 py-4 transition-all">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Brand size="lg" />
          <nav className="hidden md:flex gap-8 list-none items-center text-gray-700 text-base font-medium">
            <li><a href="#features" className="hover:text-emerald-600 transition-colors">Features</a></li>
            <li><a href="#how-it-works" className="hover:text-emerald-600 transition-colors">How It Works</a></li>
            <li><Link href="/benefits" className="hover:text-emerald-600 transition-colors">Benefits</Link></li>
            <li><a href="#contact" className="hover:text-emerald-600 transition-colors">Contact</a></li>
          </nav>
          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-gray-700 font-medium px-5 py-2 rounded-lg hover:text-emerald-600 hover:bg-emerald-50 transition-all">
              Sign In
            </Link>
            <Link href="/register" className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg hover:from-emerald-700 hover:to-emerald-800 transition-all transform hover:-translate-y-0.5" style={{ textDecoration: 'none' }}>
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center w-full relative z-10">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              AI-Powered Clinical Documentation
            </div>
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Transform Patient 
              <span className="block text-transparent bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text">
                Encounters
              </span>
              into Professional SOAP Notes
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl">
              Revolutionize your clinical workflow with AI-powered transcription and documentation. 
              Convert patient conversations into structured, professional clinical notes in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/register" className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-10 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2" style={{ textDecoration: 'none' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get Started Free
              </Link>
              <Link href="/login" className="border-2 border-emerald-600 text-emerald-700 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In
              </Link>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                HIPAA Compliant
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                99.9% Accuracy
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                2-Min Processing
              </div>
            </div>
          </div>
          <div className="relative lg:mt-0 mt-16">
            <div className="relative bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-emerald-300 rounded-full"></div>
                    <div className="w-3 h-3 bg-emerald-300 rounded-full"></div>
                    <div className="w-3 h-3 bg-emerald-300 rounded-full"></div>
                  </div>
                  <span className="text-emerald-100 font-medium text-sm">Scribsy AI - Live SOAP Generation</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-emerald-500">
                  <h4 className="font-semibold text-emerald-700 text-sm mb-2">SUBJECTIVE</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    62-year-old female presents with progressive shortness of breath over the past 3 days, 
                    associated with bilateral lower extremity swelling and orthopnea.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                  <h4 className="font-semibold text-blue-700 text-sm mb-2">OBJECTIVE</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Vital Signs: BP 148/92, HR 104, RR 24, O2 Sat 89% on RA. 
                    Physical exam reveals bilateral crackles, 2+ pitting edema.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-amber-500">
                  <h4 className="font-semibold text-amber-700 text-sm mb-2">ASSESSMENT</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Acute decompensated heart failure, likely systolic dysfunction. 
                    Differential includes pulmonary embolism.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-red-500">
                  <h4 className="font-semibold text-red-700 text-sm mb-2">PLAN</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    1. Chest X-ray and BNP levels
                    2. Start furosemide 40mg IV
                    3. Cardiology consultation
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-200 rounded-full opacity-20"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-green-200 rounded-full opacity-20"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Why Healthcare Professionals Choose 
              <span className="text-transparent bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text"> Scribsy</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Streamline your clinical documentation workflow with cutting-edge AI technology 
              designed specifically for healthcare professionals.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <Link href="/register" className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 border border-emerald-100 hover:shadow-lg transition-all group cursor-pointer block" style={{ textDecoration: 'none' }}>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Voice-to-Text Transcription</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Advanced speech recognition technology converts patient conversations into accurate, 
                structured text with medical terminology precision.
              </p>
              <div className="flex items-center text-emerald-600 font-medium">
                <span>99.9% Accuracy Rate</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link href="/register" className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 hover:shadow-lg transition-all group cursor-pointer block" style={{ textDecoration: 'none' }}>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI-Generated SOAP Notes</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Automatically structure transcriptions into professional SOAP format with 
                Subjective, Objective, Assessment, and Plan sections.
              </p>
              <div className="flex items-center text-blue-600 font-medium">
                <span>2-Minute Generation</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <Link href="/register" className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-100 hover:shadow-lg transition-all group cursor-pointer block" style={{ textDecoration: 'none' }}>
              <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">HIPAA Compliant Security</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Enterprise-grade security with end-to-end encryption ensures patient data 
                remains protected and compliant with healthcare regulations.
              </p>
              <div className="flex items-center text-amber-600 font-medium">
                <span>Bank-Level Security</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>

          <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-2xl p-12 text-center text-white">
            <h3 className="text-3xl lg:text-4xl font-bold mb-4">
              Save 75% of Your Documentation Time
            </h3>
            <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
              Join thousands of healthcare professionals who have revolutionized their workflow with Scribsy AI.
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-200 mb-2">15min</div>
                <div className="text-emerald-100">Average time saved per note</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-200 mb-2">50K+</div>
                <div className="text-emerald-100">Notes generated daily</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-200 mb-2">98%</div>
                <div className="text-emerald-100">User satisfaction rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-gray-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              How <span className="text-transparent bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text">Scribsy</span> Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform your clinical documentation process in three simple steps. 
              From patient encounter to professional SOAP note in under 2 minutes.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12 mb-16">
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg">1</div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Record or Upload</h3>
              <p className="text-gray-600 leading-relaxed">
                Start recording your patient encounter directly in Scribsy or upload existing audio files. 
                Our system supports all major audio formats with crystal-clear recognition.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg">2</div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Processing</h3>
              <p className="text-gray-600 leading-relaxed">
                Our advanced AI engine analyzes the audio, extracts key medical information, 
                and structures it according to clinical standards and medical best practices.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-lg">3</div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Professional SOAP Note</h3>
              <p className="text-gray-600 leading-relaxed">
                Receive a professionally formatted SOAP note ready for review and integration 
                into your EHR system. Edit, customize, and finalize with ease.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-6">
                  Ready to Transform Your Practice?
                </h3>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Join over 10,000 healthcare professionals who have already revolutionized their 
                  clinical documentation workflow with Scribsy AI. Start your free trial today.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-700">No setup required - start documenting immediately</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-700">14-day free trial with full feature access</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-700">Cancel anytime, no long-term contracts</span>
                  </div>
                </div>
                <Link href="/register" className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition-all transform hover:-translate-y-1" style={{ textDecoration: 'none' }}>
                  Get Started Free
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl p-8 border border-emerald-200">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">2 Minutes</h4>
                    <p className="text-gray-600">Average processing time from audio to SOAP note</p>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-200 rounded-full opacity-60"></div>
                <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-green-200 rounded-full opacity-40"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-4 gap-8 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 text-2xl font-bold mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17L10.5 10.84L11.92 12.25L17.58 6.59L20.17 9.17L21 9ZM1 9L2.5 7.5L5.17 10.17L10.84 4.5L12.25 5.92L6.59 11.58L9.17 14.17L9 15L7 21V22H17V21L15 15L14.17 14.17L11.5 16.84L5.84 11.17L1 9Z"/>
                  </svg>
                </div>
                <span className="text-transparent bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text">SCRIBSY</span>
              </div>
              <p className="text-gray-300 text-lg leading-relaxed mb-6 max-w-md">
                Revolutionizing clinical documentation with AI-powered transcription and SOAP note generation 
                for healthcare professionals worldwide.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-300">HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-300">SOC 2 Certified</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6">Product</h4>
              <ul className="space-y-4">
                <li><a href="#features" className="text-gray-300 hover:text-emerald-400 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="text-gray-300 hover:text-emerald-400 transition-colors">How It Works</a></li>
                <li><a href="/register" className="text-gray-300 hover:text-emerald-400 transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6">Support</h4>
              <ul className="space-y-4">
                <li><a href="/contact" className="text-gray-300 hover:text-emerald-400 transition-colors">Help Center</a></li>
                <li><a href="/contact" className="text-gray-300 hover:text-emerald-400 transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-400 text-sm">
                © 2024 Scribsy AI. All rights reserved. Built for healthcare professionals.
              </div>
              <div className="flex items-center gap-6">
                <Link href="/register" className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all" style={{ textDecoration: 'none' }}>
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Widget */}
      <div className="fixed bottom-8 right-8 z-50">
        <Link href="/register" className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition-all transform hover:-translate-y-1 group block" style={{ textDecoration: 'none' }} title="Get Started Free">
          <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </Link>
      </div>
    </>
  );
}