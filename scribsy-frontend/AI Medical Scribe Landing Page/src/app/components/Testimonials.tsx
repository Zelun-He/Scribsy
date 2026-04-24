import { Card } from "./ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Dr. Sarah Chen",
    role: "Family Medicine Physician",
    content: "MediScribe AI has completely transformed my practice. I'm saving 2-3 hours daily on documentation and spending more quality time with patients.",
    rating: 5
  },
  {
    name: "Dr. Michael Rodriguez",
    role: "Emergency Medicine",
    content: "The accuracy is incredible. It understands medical terminology perfectly and captures every detail from my patient encounters.",
    rating: 5
  },
  {
    name: "Dr. Emily Thompson",
    role: "Internal Medicine",
    content: "Implementation was seamless and the support team was fantastic. Best investment I've made for my practice this year.",
    rating: 5
  }
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-32 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Trusted by Healthcare Professionals
          </h2>
          <p className="text-lg text-muted-foreground">
            See what doctors are saying about MediScribe AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 border-border">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
              <div>
                <div className="font-semibold text-foreground">{testimonial.name}</div>
                <div className="text-sm text-muted-foreground">{testimonial.role}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
