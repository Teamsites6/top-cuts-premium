
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: "Booking service is not configured" });
  }

  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const headers = {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": "return=minimal"
    };

    let table;
    let record;

    if (body.type === "booking") {
      const name = String(body.customer_name || "").trim();
      const phone = String(body.phone || "").trim();
      const service = String(body.service || "").trim();
      const date = String(body.preferred_date || "");
      const time = String(body.preferred_time || "").trim();

      const allowedServices = [
        "Premium Haircut",
        "Traditional Shave",
        "Hair Wash",
        "Grooming Experience"
      ];

      if (!name || name.length > 100 ||
          !phone || phone.length > 30 ||
          !allowedServices.includes(service) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !time || time.length > 40) {
        return res.status(400).json({ error: "Please check your booking details" });
      }

      const parsedDate = new Date(`${date}T00:00:00Z`);
      if (Number.isNaN(parsedDate.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== date ||
          date < new Date().toISOString().slice(0, 10)) {
        return res.status(400).json({ error: "Please choose a valid future date" });
      }

      table = "bookings";
      record = {
        customer_name: name,
        phone,
        email: body.email ? String(body.email).trim().slice(0, 254) : null,
        service,
        preferred_date: date,
        preferred_time: time,
        notes: body.notes ? String(body.notes).trim().slice(0, 1000) : null
      };
    } else if (body.type === "contact") {
      const name = String(body.customer_name || "").trim();
      const contact = String(body.contact_details || "").trim();
      const message = String(body.message || "").trim();

      if (!name || name.length > 100 ||
          !contact || contact.length > 254 ||
          !message || message.length > 2000) {
        return res.status(400).json({ error: "Please check your message details" });
      }

      table = "contact_messages";
      record = {
        customer_name: name,
        contact_details: contact,
        message
      };
    } else {
      return res.status(400).json({ error: "Invalid submission type" });
    }

    const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/${table}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(record)
      }
    );

    if (!response.ok) {
      console.error("Supabase submission failed:", response.status);
      return res.status(500).json({ error: "Unable to save your request right now" });
    }

    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Submission error:", error);
    return res.status(500).json({ error: "Unable to save your request right now" });
  }
}
