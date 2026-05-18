import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { name, email, phone, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }

    // 1. Fetch the admin contact email
    const { data: adminSettings, error: adminError } = await supabase
      .from('admin_settings')
      .select('contact_email')
      .eq('id', 1)
      .maybeSingle();

    if (adminError) {
      console.error('Error fetching admin settings:', adminError);
    }

    const recipientEmail = adminSettings?.contact_email || process.env.SMTP_EMAIL;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email not configured' }, { status: 500 });
    }

    // 2. Save to Supabase
    const { error: insertError } = await supabase
      .from('enquiries')
      .insert([
        { name, email, phone, message }
      ]);

    if (insertError) {
      console.error('Error saving enquiry to database:', insertError);
      // We log the error but still try to send the email
    }

    // 3. Setup Nodemailer
    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      // 4. Send Email
      const mailOptions = {
        from: `"${name}" <${process.env.SMTP_EMAIL}>`,
        to: recipientEmail,
        subject: `New Enquiry from ${name}`,
        text: `You have received a new enquiry:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nMessage: ${message}`,
        html: `
          <h2>New Enquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
          <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // We continue because the enquiry was already saved to the database
      }
    } else {
      console.warn('SMTP credentials missing. Enquiry saved to database but email notification was not sent.');
    }

    return NextResponse.json({ success: true, message: 'Enquiry sent successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error in enquiry API:', error);
    return NextResponse.json({ error: 'Internal server error while processing your enquiry.' }, { status: 500 });
  }
}

