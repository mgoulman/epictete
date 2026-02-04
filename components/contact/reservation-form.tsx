"use client";

import { useState } from "react";
import { Phone, Clock, MessageSquare, Users, Minus, Plus, CheckCircle, AlertCircle, Baby, CalendarDays } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

// Generate time slots from 10:00 to 22:00 in 30-min intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 10; hour <= 21; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    slots.push(`${hour.toString().padStart(2, "0")}:30`);
  }
  slots.push("22:00");
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

interface CounterProps {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  icon?: React.ReactNode;
}

function Counter({ label, sublabel, value, onChange, min = 0, max = 20, icon }: CounterProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-secondary/50 hover:bg-secondary/80 rounded-xl transition-colors">
      <div className="flex items-center gap-3">
        {icon && <div className="text-accent">{icon}</div>}
        <div>
          <span className="text-sm font-medium text-foreground">{label}</span>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-accent hover:text-white hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:text-foreground disabled:hover:border-border transition-all"
        >
          <Minus size={16} />
        </button>
        <span className="w-10 text-center text-foreground font-semibold text-lg">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-accent hover:text-white hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:text-foreground disabled:hover:border-border transition-all"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

export function ReservationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    time: "",
    adults: 2,
    children: 0,
    babyChairs: 0,
    specialRequests: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
        }),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({
          name: "",
          phone: "",
          email: "",
          time: "",
          adults: 2,
          children: 0,
          babyChairs: 0,
          specialRequests: "",
        });
        setSelectedDate(undefined);
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const totalGuests = formData.adults + formData.children;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent/10 to-accent/5 px-6 py-5 border-b border-border">
        <h2 className="text-xl sm:text-2xl font-heading font-semibold text-foreground">
          Réserver une table
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Remplissez le formulaire et nous confirmons votre réservation rapidement.
        </p>
      </div>

      <div className="p-5 sm:p-6 md:p-8">
        {/* Success Message */}
        {submitStatus === "success" && (
          <div className="mb-6 p-5 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-700">Réservation envoyée !</p>
              <p className="text-sm text-green-600 mt-1">
                Nous avons bien reçu votre demande. Vous recevrez une confirmation par téléphone ou WhatsApp très prochainement.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitStatus === "error" && (
          <div className="mb-6 p-5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-700">Une erreur est survenue</p>
              <p className="text-sm text-red-600 mt-1">
                Veuillez réessayer ou nous appeler directement au {siteConfig.contact.phone}.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Vos coordonnées
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reservation-name" className="block text-sm font-medium text-foreground mb-2">
                  Nom complet <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  id="reservation-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-base"
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <label htmlFor="reservation-phone" className="block text-sm font-medium text-foreground mb-2">
                  Téléphone <span className="text-accent">*</span>
                </label>
                <input
                  type="tel"
                  id="reservation-phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-base"
                  placeholder="+212 6XX XX XX XX"
                />
              </div>
            </div>
            <div>
              <label htmlFor="reservation-email" className="block text-sm font-medium text-foreground mb-2">
                Email <span className="text-muted-foreground font-normal text-xs">(optionnel)</span>
              </label>
              <input
                type="email"
                id="reservation-email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-base"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Date et heure
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Picker */}
              <div className="relative">
                <label className="block text-sm font-medium text-foreground mb-2">
                  <CalendarDays size={14} className="inline mr-1.5 text-accent" />
                  Date <span className="text-accent">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`w-full px-4 py-3.5 bg-secondary/50 border rounded-xl text-left transition-all ${
                    showCalendar ? "border-accent ring-2 ring-accent/20" : "border-border"
                  } ${selectedDate ? "text-foreground" : "text-muted"}`}
                >
                  {selectedDate
                    ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
                    : "Sélectionner une date"}
                </button>

                {/* Calendar Dropdown */}
                {showCalendar && (
                  <div className="absolute z-50 mt-2 bg-card border border-border rounded-xl shadow-xl p-4 left-0 right-0 sm:right-auto sm:min-w-[320px]">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setShowCalendar(false);
                      }}
                      disabled={{ before: today }}
                      locale={fr}
                      showOutsideDays={false}
                      classNames={{
                        months: "flex flex-col",
                        month: "space-y-4",
                        caption: "flex justify-between items-center px-2",
                        caption_label: "text-sm font-semibold text-foreground capitalize",
                        nav: "flex items-center gap-1",
                        nav_button: "h-8 w-8 bg-secondary/50 hover:bg-secondary rounded-lg flex items-center justify-center text-foreground transition-colors",
                        nav_button_previous: "",
                        nav_button_next: "",
                        table: "w-full border-collapse",
                        head_row: "flex",
                        head_cell: "text-muted-foreground rounded-md w-10 font-medium text-xs uppercase",
                        row: "flex w-full mt-1",
                        cell: "h-10 w-10 text-center text-sm relative",
                        day: "h-10 w-10 rounded-lg font-medium hover:bg-accent/20 transition-colors flex items-center justify-center",
                        day_selected: "bg-accent text-white hover:bg-accent",
                        day_today: "border-2 border-accent",
                        day_disabled: "text-muted opacity-50 cursor-not-allowed hover:bg-transparent",
                        day_outside: "opacity-0",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Time Select */}
              <div>
                <label htmlFor="reservation-time" className="block text-sm font-medium text-foreground mb-2">
                  <Clock size={14} className="inline mr-1.5 text-accent" />
                  Heure <span className="text-accent">*</span>
                </label>
                <select
                  id="reservation-time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className={`w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-base appearance-none cursor-pointer ${
                    formData.time ? "text-foreground" : "text-muted"
                  }`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 1rem center",
                    backgroundSize: "1.25rem",
                  }}
                >
                  <option value="">Sélectionner une heure</option>
                  {TIME_SLOTS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Guests Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Nombre de personnes
              </h3>
              <span className="text-sm font-medium text-accent">
                Total: {totalGuests} personne{totalGuests > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              <Counter
                label="Adultes"
                value={formData.adults}
                onChange={(value) => setFormData({ ...formData, adults: value })}
                min={1}
                max={20}
                icon={<Users size={20} />}
              />
              <Counter
                label="Enfants"
                sublabel="Moins de 12 ans"
                value={formData.children}
                onChange={(value) => setFormData({ ...formData, children: value })}
                min={0}
                max={10}
                icon={<Users size={18} />}
              />
              <Counter
                label="Chaises bébé"
                sublabel="Pour les tout-petits"
                value={formData.babyChairs}
                onChange={(value) => setFormData({ ...formData, babyChairs: value })}
                min={0}
                max={5}
                icon={<Baby size={20} />}
              />
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Informations supplémentaires
            </h3>
            <div>
              <label htmlFor="reservation-requests" className="block text-sm font-medium text-foreground mb-2">
                <MessageSquare size={14} className="inline mr-1.5 text-accent" />
                Demandes spéciales <span className="text-muted-foreground font-normal text-xs">(optionnel)</span>
              </label>
              <textarea
                id="reservation-requests"
                rows={3}
                value={formData.specialRequests}
                onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none text-base"
                placeholder="Allergies, occasion spéciale, préférences de table, anniversaire..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              size="lg"
              className="w-full py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              disabled={isSubmitting || submitStatus === "success" || !selectedDate}
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Envoi en cours...
                </>
              ) : submitStatus === "success" ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Réservation envoyée
                </>
              ) : (
                "Confirmer ma réservation"
              )}
            </Button>
          </div>
        </form>

        {/* Call Alternative */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Besoin d&apos;une réservation immédiate ?
          </p>
          <a
            href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary/50 hover:bg-secondary text-foreground transition-colors font-medium"
          >
            <Phone size={16} className="text-accent" />
            {siteConfig.contact.phone}
          </a>
        </div>
      </div>
    </div>
  );
}
