import { Bot, Clock, Shield, Zap, FileText, CheckCircle } from "lucide-react";
import { Card } from "./ui/card";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Transcription",
    description: "Advanced speech recognition that understands medical terminology and context with 99% accuracy."
  },
  {
    icon: Clock,
    title: "Real-Time Documentation",
    description: "Generate clinical notes instantly during or after patient encounters, saving hours of administrative work."
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Bank-level encryption and complete HIPAA compliance to keep patient data secure and private."
  },
  {
    icon: Zap,
    title: "EHR Integration",
    description: "Seamlessly integrates with your existing EHR system for smooth workflow integration."
  },
  {
    icon: FileText,
    title: "Smart Templates",
    description: "Customizable templates that adapt to your specialty and documentation style preferences."
  },
  {
    icon: CheckCircle,
    title: "Quality Assurance",
    description: "Built-in review system ensures accuracy and completeness before finalizing documentation."
  }
];

export function Features() {
  return (
    <section id="features" className="py-20 md:py-32 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need for Effortless Documentation
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed to streamline your workflow and improve patient care.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-border">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted shrink-0">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
