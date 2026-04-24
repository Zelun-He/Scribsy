"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  CheckCircle,
  Clock,
  FileCheck,
  FileText,
  Mic,
  Shield,
  Sparkles,
  Stethoscope,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Transcription",
    description:
      "Advanced speech recognition that understands medical terminology and context with high accuracy.",
  },
  {
    icon: Clock,
    title: "Real-Time Documentation",
    description:
      "Generate clinical notes instantly during or after patient encounters, saving hours of administrative work.",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description:
      "Bank-level encryption and complete HIPAA compliance to keep patient data secure and private.",
  },
  {
    icon: Zap,
    title: "EHR Integration",
    description: "Integrates with your existing EHR workflow and handoff process.",
  },
  {
    icon: FileText,
    title: "Smart Templates",
    description:
      "Customizable templates that adapt to your specialty and documentation style preferences.",
  },
  {
    icon: CheckCircle,
    title: "Quality Assurance",
    description:
      "Built-in review checkpoints help ensure accuracy and completeness before finalizing.",
  },
];

const steps = [
  {
    number: "01",
    icon: Mic,
    title: "Capture the Conversation",
    description:
      "Speak naturally during patient encounters while Scribsy captures the key clinical details.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Structures the Note",
    description:
      "Scribsy transforms conversation context into organized, clinician-ready documentation.",
  },
  {
    number: "03",
    icon: FileCheck,
    title: "Review and Finalize",
    description:
      "Review, edit if needed, and move notes into your workflow with minimal friction.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold">Scribsy AI</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
              How It Works
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 md:inline-flex">
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-b from-white to-emerald-50 py-20 md:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:grid-cols-2 md:px-6">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
                AI-Powered Documentation
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                Transform Patient Encounters Into Better Documentation
              </h1>
              <p className="max-w-xl text-lg text-gray-600">
                Scribsy converts conversations into accurate clinical notes so your team spends less time charting and more time caring.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-700"
                >
                  Sign Up
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-base font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1758691462749-a95ce1bd7f96?auto=format&fit=crop&w=1200&q=80"
                alt="Doctor consulting with patient"
                className="w-full rounded-2xl shadow-2xl"
                width={1200}
                height={800}
                priority
              />
            </div>
          </div>
        </section>

        <section id="features" className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <h2 className="mb-3 text-3xl font-bold md:text-4xl">Everything You Need for Effortless Documentation</h2>
              <p className="text-lg text-gray-600">Powerful features designed to streamline your workflow and improve patient care.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <feature.icon className="mb-3 h-6 w-6 text-emerald-600" />
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-emerald-50 py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <h2 className="mb-3 text-3xl font-bold md:text-4xl">How Scribsy Works</h2>
              <p className="text-lg text-gray-600">Three simple steps to streamline your clinical documentation.</p>
            </div>
            <div className="grid items-start gap-10 lg:grid-cols-2">
              <div className="space-y-6">
                {steps.map((step) => (
                  <div key={step.number} className="rounded-xl border border-emerald-100 bg-white p-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {step.number}
                    </div>
                    <div className="mb-3 flex items-center gap-2">
                      <step.icon className="h-5 w-5 text-emerald-600" />
                      <h3 className="font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                ))}
              </div>
              <div className="relative self-center lg:pt-8">
                <Image
                  src="https://images.unsplash.com/photo-1759813641406-980519f58b1c?auto=format&fit=crop&w=1080&q=80"
                  alt="Medical professionals using technology"
                  className="w-full rounded-2xl shadow-2xl"
                  width={1080}
                  height={720}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-emerald-600 py-20 text-white md:py-28">
          <div className="mx-auto max-w-4xl px-4 text-center md:px-6">
            <h2 className="mb-4 text-3xl font-bold md:text-5xl">Ready to Reclaim Your Time?</h2>
            <p className="mb-8 text-lg text-emerald-100">
              Join providers reducing documentation time and improving patient focus.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Sign Up
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-white px-6 py-3 font-semibold text-white hover:bg-emerald-500"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-gray-50 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-gray-600 md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-emerald-600" />
            <span>Scribsy AI</span>
          </div>
          <div>© 2026 Scribsy. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}