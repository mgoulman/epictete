"use client";

import { useState } from "react";
import { Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "general",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({ name: "", email: "", phone: "", subject: "general", message: "" });
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 md:p-8">
      <h2 className="text-xl sm:text-2xl font-heading font-semibold text-foreground mb-4 sm:mb-6">
        Envoyez-nous un message
      </h2>

      {submitStatus === "success" && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-700 text-sm">
          Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.
        </div>
      )}

      {submitStatus === "error" && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 text-sm">
          Une erreur est survenue. Veuillez réessayer ou nous contacter par téléphone.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-foreground mb-2">
              Nom complet *
            </label>
            <input
              type="text"
              id="contact-name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-base"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-sm font-medium text-foreground mb-2">
              Email *
            </label>
            <input
              type="email"
              id="contact-email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-base"
              placeholder="votre@email.com"
            />
          </div>
        </div>
        <div>
          <label htmlFor="contact-phone" className="block text-sm font-medium text-foreground mb-2">
            Téléphone
          </label>
          <input
            type="tel"
            id="contact-phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-base"
            placeholder="+212 6XX XX XX XX"
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className="block text-sm font-medium text-foreground mb-2">
            Sujet
          </label>
          <select
            id="contact-subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors text-base"
          >
            <option value="general">Question générale</option>
            <option value="event">Événement privé</option>
            <option value="feedback">Commentaire</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-foreground mb-2">
            Message *
          </label>
          <textarea
            id="contact-message"
            rows={4}
            required
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-none text-base"
            placeholder="Votre message..."
          />
        </div>
        <Button type="submit" className="w-full py-4 text-base" disabled={isSubmitting}>
          <Send size={18} className="mr-2" />
          {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
        </Button>
      </form>

      {/* Quick Call Alternative */}
      <div className="mt-6 pt-6 border-t border-border text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Vous préférez nous appeler directement ?
        </p>
        <a
          href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors font-medium"
        >
          <Phone size={16} />
          {siteConfig.contact.phone}
        </a>
      </div>
    </div>
  );
}
