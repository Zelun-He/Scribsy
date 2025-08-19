"use client";
import React from "react";
import Link from "next/link";

export default function BenefitsPage() {
  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17L10.5 10.84L11.92 12.25L17.58 6.59L20.17 9.17L21 9ZM1 9L2.5 7.5L5.17 10.17L10.84 4.5L12.25 5.92L6.59 11.58L9.17 14.17L9 15L7 21V22H17V21L15 15L14.17 14.17L11.5 16.84L5.84 11.17L1 9Z"/>
              </svg>
            </div>
            <span className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">SCRIBSY</span>
          </Link>
          <nav className="flex gap-8 list-none items-center text-gray-700 text-base font-medium">
            <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
            <Link href="/login" className="text-gray-700 font-medium px-5 py-2 rounded-lg hover:text-emerald-600 hover:bg-emerald-50 transition-all">
              Sign In
            </Link>
            <Link href="/register" className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg hover:from-emerald-700 hover:to-emerald-800 transition-all transform hover:-translate-y-0.5" style={{ textDecoration: 'none' }}>
              Get Started Free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            The <span className="text-transparent bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text">Benefits</span> of Scribsy
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Discover how Scribsy transforms clinical documentation and revolutionizes your healthcare practice workflow.
          </p>
        </div>
      </section>

      {/* Main Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Save Hours Every Day
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Traditional documentation can take 15-30 minutes per patient encounter. With Scribsy, 
                you'll have professional SOAP notes ready in under 2 minutes, saving you hours every day.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Reduce documentation time by 75%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">See more patients without extending hours</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Focus on patient care, not paperwork</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl p-8 border border-emerald-200">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">15+ Hours</div>
                  <p className="text-gray-600">Saved per week for busy practitioners</p>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-200 rounded-full opacity-60"></div>
              <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-green-200 rounded-full opacity-40"></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            <div className="order-2 lg:order-1">
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-8 border border-blue-200">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">99.9%</div>
                    <p className="text-gray-600">Accuracy rate in transcription</p>
                  </div>
                </div>
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-200 rounded-full opacity-60"></div>
                <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-indigo-200 rounded-full opacity-40"></div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Unmatched Accuracy
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Scribsy's AI engine is trained on millions of medical conversations and understands 
                complex medical terminology, ensuring your documentation is precise and professional.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Medical terminology recognition</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Context-aware understanding</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Professional medical language</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Enhanced Patient Care
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Spend more time with your patients and less time on documentation. Scribsy ensures 
                you never miss important details while maintaining comprehensive medical records.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Better patient engagement</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Comprehensive documentation</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-gray-700">Improved clinical outcomes</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-8 border border-amber-200">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">100%</div>
                  <p className="text-gray-600">Patient satisfaction improvement</p>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-200 rounded-full opacity-60"></div>
              <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-orange-200 rounded-full opacity-40"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Financial Benefits
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Scribsy doesn't just save time—it saves money and increases your practice's revenue potential.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Increased Revenue</h3>
              <p className="text-gray-600 text-center mb-6">
                See more patients in the same time, increasing your practice's revenue potential by 20-30%.
              </p>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">$15K+</div>
                <div className="text-gray-500 text-sm">Additional annual revenue</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Reduced Overhead</h3>
              <p className="text-gray-600 text-center mb-6">
                Lower transcription costs and reduced need for additional administrative staff.
              </p>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">$8K+</div>
                <div className="text-gray-500 text-sm">Annual cost savings</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">ROI</h3>
              <p className="text-gray-600 text-center mb-6">
                Achieve positive return on investment within the first 3 months of using Scribsy.
              </p>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600 mb-2">300%+</div>
                <div className="text-gray-500 text-sm">Return on investment</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-green-700">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Experience These Benefits?
          </h2>
          <p className="text-xl text-emerald-100 mb-8 leading-relaxed">
            Join thousands of healthcare professionals who have already transformed their practice with Scribsy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-white text-emerald-700 px-10 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2" style={{ textDecoration: 'none' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Free Trial
            </Link>
            <Link href="/login" className="border-2 border-white text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-emerald-700 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
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
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6">Product</h4>
              <ul className="space-y-4">
                <li><Link href="/" className="text-gray-300 hover:text-emerald-400 transition-colors">Home</Link></li>
                <li><Link href="/register" className="text-gray-300 hover:text-emerald-400 transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-6">Support</h4>
              <ul className="space-y-4">
                <li><Link href="/contact" className="text-gray-300 hover:text-emerald-400 transition-colors">Contact Us</Link></li>
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
    </>
  );
}
