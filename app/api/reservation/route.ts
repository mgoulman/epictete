import { NextResponse } from "next/server";
import twilio from "twilio";

interface ReservationData {
  name: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  babyChairs?: number;
  specialRequests?: string;
}

export async function POST(request: Request) {
  try {
    const body: ReservationData = await request.json();

    // Validate required fields
    if (!body.name || !body.phone || !body.date || !body.time || !body.adults) {
      return NextResponse.json(
        { error: "Nom, téléphone, date, heure et nombre d'adultes sont requis" },
        { status: 400 }
      );
    }

    const totalGuests = body.adults + (body.children || 0);
    const guestsText = body.children > 0
      ? `${body.adults} adulte${body.adults > 1 ? "s" : ""} + ${body.children} enfant${body.children > 1 ? "s" : ""}`
      : `${body.adults} adulte${body.adults > 1 ? "s" : ""}`;

    // Format date nicely
    const dateObj = new Date(body.date);
    const formattedDate = dateObj.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    // Baby chairs text
    const babyChairsText = body.babyChairs && body.babyChairs > 0
      ? `\n🍼 *Chaises bébé:* ${body.babyChairs}`
      : "";

    // Format the WhatsApp message
    const message = `🍽️ *NOUVELLE RÉSERVATION*

👤 *Nom:* ${body.name}
📞 *Tél:* ${body.phone}${body.email ? `\n📧 *Email:* ${body.email}` : ""}

📅 *Date:* ${formattedDate}
🕐 *Heure:* ${body.time}
👥 *Personnes:* ${totalGuests} (${guestsText})${babyChairsText}
${body.specialRequests ? `\n📝 *Notes:*\n${body.specialRequests}` : ""}

---
_Via epictetelerestaurant.ma_`;

    // Check if Twilio is configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = process.env.WHATSAPP_RESTAURANT_NUMBER;

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
      console.log("=== Reservation (WhatsApp not configured) ===");
      console.log(message);
      console.log("=============================================");

      return NextResponse.json({
        success: true,
        note: "WhatsApp not configured - reservation logged"
      });
    }

    try {
      const client = twilio(accountSid, authToken);

      await client.messages.create({
        body: message,
        from: fromNumber,
        to: toNumber,
      });

      console.log("WhatsApp reservation sent successfully");
      return NextResponse.json({ success: true, method: "whatsapp" });

    } catch (twilioError) {
      console.error("Twilio error:", twilioError);

      // Log the reservation even if WhatsApp fails
      console.log("=== Reservation (WhatsApp failed) ===");
      console.log(message);
      console.log("=====================================");

      return NextResponse.json(
        { error: "Erreur WhatsApp - veuillez nous appeler directement" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Reservation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de la réservation" },
      { status: 500 }
    );
  }
}
