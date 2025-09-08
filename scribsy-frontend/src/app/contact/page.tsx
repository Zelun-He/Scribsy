'use client';

import React, { useState } from 'react';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create mailto link
    const subject = encodeURIComponent(`Scribsy Contact: ${formData.subject}`);
    const body = encodeURIComponent(`
Name: ${formData.name}
Email: ${formData.email}
Subject: ${formData.subject}

Message:
${formData.message}

---
Sent from Scribsy Contact Form
    `.trim());

    const mailtoLink = `mailto:zelunhe@gmail.com?subject=${subject}&body=${body}`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Client Opened</h2>
            <p className="text-gray-600 mb-8">
              Your default email client should have opened with your message pre-filled. 
              If it didn't open automatically, please email us directly at{' '}
              <a href="mailto:zelunhe@gmail.com" className="text-emerald-600 hover:text-emerald-700 font-medium">
                zelunhe@gmail.com
              </a>
            </p>
            <div className="space-y-4">
              <button
                onClick={() => setSubmitted(false)}
                className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Send Another Message
              </button>
              <Link 
                href="/"
                className="block w-full border border-emerald-600 text-emerald-600 px-6 py-3 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-3 text-2xl font-bold text-gray-900 mb-8">
            <Logo size="lg" />
            <span className="text-gray-900">Scribsy</span>
          </Link>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have questions about Scribsy AI? Need help getting started? 
            We'd love to hear from you and help with your clinical documentation needs.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="jane@hospital.com"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Help with SOAP note generation"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                  placeholder="Tell us how we can help you..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:transform-none"
              >
                {isSubmitting ? 'Opening Email Client...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl p-8 border border-emerald-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Direct Contact</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <a href="mailto:zelunhe@gmail.com" className="text-emerald-600 hover:text-emerald-700">
                      zelunhe@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">How does Scribsy work?</h4>
                  <p className="text-gray-600 text-sm">Upload audio recordings of patient encounters, and our AI generates structured SOAP notes in minutes.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Is it HIPAA compliant?</h4>
                  <p className="text-gray-600 text-sm">Yes, Scribsy is built with enterprise-grade security and follows all HIPAA compliance requirements.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Can I try it for free?</h4>
                  <p className="text-gray-600 text-sm">Absolutely! Sign up for a free account and start generating SOAP notes immediately.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}