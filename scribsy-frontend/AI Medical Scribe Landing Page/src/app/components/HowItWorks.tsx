import { Mic, Sparkles, FileCheck } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const steps = [
  {
    number: "01",
    icon: Mic,
    title: "Capture the Conversation",
    description: "Simply speak naturally during your patient encounter. MediScribe AI listens and captures every detail."
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Processes & Structures",
    description: "Our advanced AI analyzes the conversation, identifies key information, and structures it into proper clinical documentation."
  },
  {
    number: "03",
    icon: FileCheck,
    title: "Review & Submit",
    description: "Review the generated note, make any adjustments, and submit directly to your EHR with one click."
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-muted">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How MediScribe AI Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Three simple steps to transform your clinical documentation workflow.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white font-bold text-xl shrink-0">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 h-full bg-border mt-4"></div>
                  )}
                </div>
                <div className="pb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <step.icon className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-2xl blur-3xl"></div>
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1759813641406-980519f58b1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwcHJvZmVzc2lvbmFscyUyMGhvc3BpdGFsJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzI1ODU1MTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Medical professionals using technology"
              className="relative rounded-2xl shadow-2xl w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
