import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const mailOptions = {
    from: `HalkaBite <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

export const sendOrderConfirmation = async (
  email: string,
  orderNumber: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  total: number
): Promise<void> => {
  const itemsList = items
    .map(item => `<li>${item.name} x ${item.quantity} - ৳${item.price}</li>`)
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🍔 HalkaBite</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #333;">Order Confirmed! 🎉</h2>
        <p>Thank you for your order. Here are your order details:</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          <h3>Items:</h3>
          <ul>${itemsList}</ul>
          <hr style="border: 1px solid #eee;">
          <p style="font-size: 18px;"><strong>Total: ৳${total}</strong></p>
        </div>
        <p>We'll notify you when your order is on its way!</p>
      </div>
      <div style="background: #333; color: white; padding: 15px; text-align: center;">
        <p style="margin: 0;">© 2024 HalkaBite. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Order Confirmed - ${orderNumber}`,
    html
  });
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🍔 HalkaBite</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #333;">Welcome to HalkaBite, ${name}! 🎉</h2>
        <p>Thank you for joining our food delivery family. Get ready to explore delicious meals from the best restaurants near you!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}" style="background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Start Ordering</a>
        </div>
        <p>Enjoy your favorites with features like:</p>
        <ul>
          <li>🎙️ AI Voice Ordering</li>
          <li>💳 Multiple Payment Options</li>
          <li>🚀 Fast Delivery</li>
          <li>💬 24/7 AI Support</li>
        </ul>
      </div>
      <div style="background: #333; color: white; padding: 15px; text-align: center;">
        <p style="margin: 0;">© 2024 HalkaBite. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to HalkaBite! 🍔',
    html
  });
};
