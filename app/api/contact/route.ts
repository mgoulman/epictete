import { NextResponse } from "next/server";
import { Resend } from "resend";

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const CONTACT_EMAIL = "contact@epictetelerestaurant.ma";

export async function POST(request: Request) {
  try {
    const body: ContactFormData = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: "Nom, email et message sont requis" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    // Map subject to French
    const subjectMap: Record<string, string> = {
      general: "Question générale",
      event: "Événement privé",
      feedback: "Commentaire",
      other: "Autre",
    };

    const subjectText = subjectMap[body.subject] || body.subject;

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.log("=== Contact Form (Email not configured) ===");
      console.log("To:", CONTACT_EMAIL);
      console.log("From:", body.email);
      console.log("Name:", body.name);
      console.log("Phone:", body.phone || "N/A");
      console.log("Subject:", subjectText);
      console.log("Message:", body.message);
      console.log("==========================================");

      return NextResponse.json({
        success: true,
        note: "Email service not configured - message logged"
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email to restaurant
    await resend.emails.send({
      from: "Site Web Epictete <noreply@epictetelerestaurant.ma>",
      to: CONTACT_EMAIL,
      replyTo: body.email,
      subject: `[Contact] ${subjectText} - ${body.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #606338; border-bottom: 2px solid #606338; padding-bottom: 10px;">
            Nouveau message de contact
          </h2>

          <table style="width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Nom:</td>
              <td style="padding: 8px 0;">${body.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;">
                <a href="mailto:${body.email}" style="color: #606338;">${body.email}</a>
              </td>
            </tr>
            ${body.phone ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Téléphone:</td>
              <td style="padding: 8px 0;">
                <a href="tel:${body.phone}" style="color: #606338;">${body.phone}</a>
              </td>
            </tr>
            ` : ""}
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Sujet:</td>
              <td style="padding: 8px 0;">${subjectText}</td>
            </tr>
          </table>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Message:</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${body.message}</p>
          </div>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
          <p style="color: #888; font-size: 12px;">
            Ce message a été envoyé depuis le formulaire de contact du site web epictetelerestaurant.ma
          </p>
        </div>
      `,
    });

    console.log("Contact email sent successfully to", CONTACT_EMAIL);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }
}
